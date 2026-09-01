import { prisma } from './prisma';
import { createHash } from 'crypto';
import { isIP } from 'net';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_WINDOW = 3;

/** Returns true if this IP has submitted too many assessments recently. */
export async function isRateLimited(ipAddress: string): Promise<boolean> {
  if (!ipAddress) return true;

  const since = new Date(Date.now() - WINDOW_MS);
  const count = await prisma.submission.count({
    where: { ipAddress, createdAt: { gte: since } },
  });

  return count >= MAX_SUBMISSIONS_PER_WINDOW;
}

const MAX_ADDRESS_LENGTH = 64;

/**
 * Accepts only a bare, bounded IPv4/IPv6 literal. `net.isIP` (Node stdlib, no new dependency)
 * is used instead of a character-class regex because `/^[0-9a-f:.]+$/i` also accepts forms like
 * `203.0.113.4:8080` — a caller could then mint an unbounded set of distinct rate-limit
 * identities from one address just by varying a port suffix. Ports, brackets, hostnames and
 * injected markup are all rejected here.
 */
function normalizeAddress(value: string | undefined | null): string | null {
  const candidate = value?.trim();
  if (!candidate || candidate.length > MAX_ADDRESS_LENGTH || isIP(candidate) === 0) return null;
  return candidate;
}

/**
 * Resolves the client address, preferring headers the caller cannot forge.
 *
 * 1. `x-vercel-forwarded-for` — Vercel overwrites this with the address it observed on the
 *    connection, so it is not caller-controlled. Its first entry is that observed address.
 *    If this header is present but unusable we deliberately do NOT fall through to
 *    `x-forwarded-for`: its presence means we are behind Vercel, where the remaining
 *    forwarding headers add no trust the platform header did not already provide.
 * 2. `x-forwarded-for` — compatibility fallback for non-Vercel hosting. Only the LAST entry
 *    is safe to read: every earlier entry can be supplied verbatim by the caller, while the
 *    last one is appended by the nearest proxy. Reading the last entry is correct whether the
 *    platform overwrites the header (single entry) or appends to it (caller values first).
 * 3. `x-real-ip` — single-valued and proxy-set, so it is taken as-is.
 * 4. A bounded, stable pseudonymous identity when no trustworthy address exists, so a missing
 *    address groups callers instead of exempting them.
 *
 * IP is never the only control: session capability, admission serialization and the
 * duplicate-submission cooldown all remain required.
 */
export function getClientIp(headers: Headers): string {
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return normalizeAddress(vercelForwardedFor.split(',')[0]) ?? anonymousIdentity(headers);
  }

  const forwardedFor = headers.get('x-forwarded-for');
  const forwarded = forwardedFor ? normalizeAddress(forwardedFor.split(',').pop()) : null;
  return forwarded ?? normalizeAddress(headers.get('x-real-ip')) ?? anonymousIdentity(headers);
}

/** Stable, bounded stand-in used only when no trustworthy address is available. */
function anonymousIdentity(headers: Headers): string {
  const fallback = [headers.get('user-agent') ?? '', headers.get('accept-language') ?? ''].join('|').slice(0, 1024);
  return `unknown:${createHash('sha256').update(fallback || 'no-client-headers').digest('hex').slice(0, 24)}`;
}

const MIN_FILL_TIME_MS = 3000;

/** Basic bot check: honeypot must be empty and the form must not have been submitted implausibly fast. */
export function looksLikeSpam(honeypot: string | undefined, formLoadedAt: number): boolean {
  if (honeypot && honeypot.length > 0) return true;
  if (Date.now() - formLoadedAt < MIN_FILL_TIME_MS) return true;
  return false;
}

const GARY_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const GARY_MAX_MESSAGES_PER_WINDOW = 60;

/** Separate rate limit for Gary's chat — a real conversation sends many more requests than the one-shot assessment form, so it needs its own, higher ceiling rather than sharing isRateLimited's budget. */
export async function isGaryRateLimited(ipAddress: string): Promise<boolean> {
  if (!ipAddress) return true;

  const since = new Date(Date.now() - GARY_WINDOW_MS);
  const count = await prisma.publicChatMessage.count({
    where: { createdAt: { gte: since }, role: 'visitor', session: { ipAddress } },
  });

  return count >= GARY_MAX_MESSAGES_PER_WINDOW;
}
