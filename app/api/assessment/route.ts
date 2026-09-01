import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { prisma } from '@/lib/prisma';
import { assessmentSubmissionSchema } from '@/lib/validation';
import { getClientIp, looksLikeSpam } from '@/lib/rateLimit';
import { sendInternalNotification, sendResultEmail } from '@/lib/resend';
import { generateAssessmentResult, buildFallbackResultHtml } from '@/lib/anthropic';
import { notifyCommandCenter } from '@/lib/commandCenter';
import { syncCompleteAssessmentToCommandCenter } from '@/lib/gary/assessmentSync';
import { PROVIDER_TIMEOUT_MS, readLimitedJson, withTimeout } from '@/lib/requestSafety';
import { admitAssessment } from '@/lib/assessmentAdmission';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await readLimitedJson(req);
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_TOO_LARGE') return NextResponse.json({ error: 'Request too large' }, { status: 413 });
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
  let admission;
  try {
    admission = await admitAssessment(data, ipAddress);
  } catch (error) {
    console.error('Assessment admission failed', error);
    return NextResponse.json({ error: 'Unable to accept the submission right now.' }, { status: 503 });
  }
  if (admission.kind === 'limited') {
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
  }
  if (admission.kind === 'duplicate') return NextResponse.json({ success: true, id: admission.submission.id, duplicate: true });
  const submission = admission.submission;

  try {
    await withTimeout(sendInternalNotification({ ...data, id: submission.id }), PROVIDER_TIMEOUT_MS, 'email provider');
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
      resultHtml = await withTimeout(generateAssessmentResult({ submission: data }), PROVIDER_TIMEOUT_MS, 'assessment provider');
    } catch (err) {
      console.error('Claude generation failed, using fallback result', err);
      resultHtml = buildFallbackResultHtml(data);
    }

    let emailSent = false;
    try {
      await withTimeout(sendResultEmail({
        to: data.email,
        firstName: data.firstName,
        businessName: data.businessName,
        resultHtml,
      }), PROVIDER_TIMEOUT_MS, 'email provider');
      emailSent = true;
    } catch (err) {
      console.error('Failed to send result email', err);
    }

    if (emailSent) {
      try {
      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: 'completed', resultHtml },
      });
      } catch (err) {
        // The customer delivery succeeded. A persistence failure must never rewrite
        // that completed delivery as an email failure.
        console.error('Result email sent but completion state update failed', err);
      }
      await notifyCommandCenter({ status: 'assessment_completed', submissionId: submission.id });
      await syncCompleteAssessmentToCommandCenter({
        submissionId: submission.id,
        submission: data,
        resultHtml,
        status: 'completed',
        emailDeliveryStatus: 'sent',
      });
    } else {
      try { await prisma.submission.update({
        where: { id: submission.id },
        data: { status: 'failed', errorMessage: 'Result email delivery failed' },
      }); } catch (err) { console.error('Failed to persist email failure state', err); }
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
