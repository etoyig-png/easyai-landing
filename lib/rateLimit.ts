import { prisma } from './prisma';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_WINDOW = 3;

/** Returns true if this IP has submitted too many assessments recently. */
export async function isRateLimited(ipAddress: string): Promise<boolean> {
  if (!ipAddress || ipAddress === 'unknown') return false;

  const since = new Date(Date.now() - WINDOW_MS);
  const count = await prisma.submission.count({
    where: { ipAddress, createdAt: { gte: since } },
  });

  return count >= MAX_SUBMISSIONS_PER_WINDOW;
}

/** Best-effort extraction of the client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}

const MIN_FILL_TIME_MS = 3000;

/** Basic bot check: honeypot must be empty and the form must not have been submitted implausibly fast. */
export function looksLikeSpam(honeypot: string | undefined, formLoadedAt: number): boolean {
  if (honeypot && honeypot.length > 0) return true;
  if (Date.now() - formLoadedAt < MIN_FILL_TIME_MS) return true;
  return false;
}
