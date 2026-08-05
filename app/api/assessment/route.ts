import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { prisma } from '@/lib/prisma';
import { assessmentSubmissionSchema } from '@/lib/validation';
import { getClientIp, isRateLimited, looksLikeSpam } from '@/lib/rateLimit';
import { sendInternalNotification, sendResultEmail } from '@/lib/resend';
import { generateAssessmentResult, buildFallbackResultHtml } from '@/lib/anthropic';
import { notifyCommandCenter } from '@/lib/commandCenter';
import { syncCompleteAssessmentToCommandCenter } from '@/lib/gary/assessmentSync';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = assessmentSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid submission', issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Spam check — don't reveal detection to bots, just pretend it worked.
  if (looksLikeSpam(data.companyUrl, data.formLoadedAt)) {
    return NextResponse.json({ success: true });
  }

  const ipAddress = getClientIp(req.headers);
  if (await isRateLimited(ipAddress)) {
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
  }

  // Save to the database FIRST — a later email failure must never lose the lead.
  const submission = await prisma.submission.create({
    data: {
      workSituation: data.workSituation,
      usingAiTools: data.usingAiTools,
      aiChallenge: data.aiChallenge,
      desiredOutcome: data.desiredOutcome,
      timeDrain: data.timeDrain,
      privacyConcern: data.privacyConcern,
      industry: data.industry,
      industryOther: data.industryOther,
      sportsFan: data.sportsFan,
      firstName: data.firstName,
      lastName: data.lastName,
      businessName: data.businessName,
      email: data.email,
      funnelCorrelationId: data.funnelCorrelationId,
      ipAddress,
    },
  });

  try {
    await sendInternalNotification({ ...data, id: submission.id });
  } catch (err) {
    console.error('Failed to send internal notification email', err);
  }

  // Everything below can take a while (web search + generation) — run it after
  // the response goes out so the visitor isn't stuck waiting on this request.
  // waitUntil keeps the serverless invocation alive until this resolves, even
  // though the response has already been returned.
  waitUntil((async () => {
    let resultHtml: string;
    try {
      resultHtml = await generateAssessmentResult({ submission: data });
    } catch (err) {
      console.error('Claude generation failed, using fallback result', err);
      resultHtml = buildFallbackResultHtml(data);
    }

    try {
      await sendResultEmail({
        to: data.email,
        firstName: data.firstName,
        businessName: data.businessName,
        resultHtml,
      });
      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: 'completed', resultHtml },
      });
      await notifyCommandCenter({ status: 'assessment_completed', submissionId: submission.id });
      // Additive: the complete assessment (every Q&A, generated result, IDs) — the existing
      // status-only notifyCommandCenter() call above is untouched.
      await syncCompleteAssessmentToCommandCenter({
        submissionId: submission.id,
        submission: data,
        resultHtml,
        status: 'completed',
        emailDeliveryStatus: 'sent',
      });
    } catch (err) {
      console.error('Failed to send result email', err);
      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: 'failed', errorMessage: err instanceof Error ? err.message : 'Unknown error' },
      });
      await notifyCommandCenter({ status: 'assessment_failed', submissionId: submission.id });
      await syncCompleteAssessmentToCommandCenter({
        submissionId: submission.id,
        submission: data,
        resultHtml,
        status: 'failed',
        emailDeliveryStatus: 'failed',
      });
    }
  })());

  return NextResponse.json({ success: true, id: submission.id });
}
