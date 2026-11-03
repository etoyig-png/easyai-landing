import { createSessionCapability, verifySessionCapability } from '@/lib/sessionCapability';
import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { assessmentSubmissionSchema } from '@/lib/validation';
import { getClientIp, looksLikeSpam } from '@/lib/rateLimit';
import { sendInternalNotification, sendResultEmail } from '@/lib/resend';
import { generateAssessmentResult, buildFallbackResultHtml } from '@/lib/anthropic';
import { notifyCommandCenter } from '@/lib/commandCenter';
import { completeAssessmentSync } from '@/lib/assessmentSync';
import { PROVIDER_TIMEOUT_MS, readLimitedJson, withTimeout } from '@/lib/requestSafety';
import { admitAssessment } from '@/lib/assessmentAdmission';

export const runtime = 'nodejs';
export const maxDuration = 300;

function acceptedSubmission(id: string) {
  let statusCapability: string | undefined;
  try { statusCapability = createSessionCapability(`assessment-status:${id}`); }
  catch { /* Existing assessments can still process when tracking is not provisioned. */ }
  return NextResponse.json({ success: true, id, statusCapability }, { headers: { 'Cache-Control': 'private, no-store' } });
}

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
  if (admission.kind === 'duplicate') {
    // Email cooldown prevents duplicate work; it is not proof of report ownership.
    const capability = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
    let owned = false;
    try {
      owned = capability.length > 0 && capability.length <= 2048 &&
        verifySessionCapability(capability, `assessment-status:${admission.submission.id}`);
    } catch { /* Missing signing configuration must not disclose an existing receipt. */ }
    return NextResponse.json({ success: true, duplicate: true,
      ...(owned ? { id: admission.submission.id, statusCapability: capability } : {}),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  const submission = admission.submission;

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

    try {
      await withTimeout(sendInternalNotification({ ...data, id: submission.id }, resultHtml), PROVIDER_TIMEOUT_MS, 'email provider');
    } catch (err) {
      console.error('Failed to send owner assessment report email', err);
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

    // Final status and the Command Center sync body commit together; see completeAssessmentSync.
    await completeAssessmentSync({
      submissionId: submission.id,
      submission: data,
      resultHtml,
      status: emailSent ? 'completed' : 'failed',
      emailDeliveryStatus: emailSent ? 'sent' : 'failed',
    });
    await notifyCommandCenter({ status: emailSent ? 'assessment_completed' : 'assessment_failed', submissionId: submission.id });
  })());

  return acceptedSubmission(submission.id);
}
