import { NextRequest, NextResponse } from 'next/server';
import { contactSubmissionSchema } from '@/lib/contactValidation';
import { getClientIp, isRateLimited, looksLikeSpam } from '@/lib/rateLimit';
import { sendContactMessage } from '@/lib/resend';
import { PROVIDER_TIMEOUT_MS, readLimitedJson, withTimeout } from '@/lib/requestSafety';

export const runtime = 'nodejs';

/**
 * Contact and consultation requests. Replaces the unconfigured Formspree placeholder that
 * previously sat in app/contact/page.tsx.
 *
 * Reuses the existing controls rather than adding new ones: readLimitedJson caps the body,
 * looksLikeSpam applies the same honeypot and fill-timing pair as the assessment form,
 * isRateLimited applies the same per-address ceiling, and withTimeout bounds the provider
 * call. No new dependency and no second email provider.
 *
 * The visitor's address is validated, used as Reply-To, and never used as From.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await readLimitedJson(req);
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_TOO_LARGE') {
      return NextResponse.json({ error: 'Message too long. Please shorten it and try again.' }, { status: 413 });
    }
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = contactSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the form and try again.', issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Same treatment as the assessment form: don't tell a bot it was detected.
  if (looksLikeSpam(data.companyUrl, data.formLoadedAt)) {
    return NextResponse.json({ success: true });
  }

  try {
    if (await isRateLimited(getClientIp(req.headers))) {
      return NextResponse.json({ error: 'Too many messages from this connection. Please try again later.' }, { status: 429 });
    }
  } catch (error) {
    // A rate-limit lookup failure must not silently disable the limit or drop a real message.
    console.error('Contact rate-limit check failed', error);
    return NextResponse.json({ error: 'Unable to accept the message right now. Please try again shortly.' }, { status: 503 });
  }

  try {
    await withTimeout(sendContactMessage(data), PROVIDER_TIMEOUT_MS, 'email provider');
  } catch (error) {
    // Never report success for a message that was not delivered.
    console.error('Contact message delivery failed', error);
    return NextResponse.json(
      { error: 'We could not send your message. Please try again, or take the free assessment and we will reach out.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
