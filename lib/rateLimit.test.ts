import { describe, expect, it } from 'vitest';
import { getClientIp } from './rateLimit';

const ANONYMOUS = /^unknown:[a-f0-9]{24}$/;
const headersWith = (init: Record<string, string>) => new Headers({ 'user-agent': 'browser', 'accept-language': 'en', ...init });

describe('client rate-limit identity', () => {
  it('prefers the platform-set Vercel address', () => {
    expect(getClientIp(headersWith({ 'x-vercel-forwarded-for': '203.0.113.4' }))).toBe('203.0.113.4');
  });

  it('lets the Vercel header win over a caller-supplied x-forwarded-for', () => {
    const headers = headersWith({ 'x-vercel-forwarded-for': '203.0.113.4', 'x-forwarded-for': '198.51.100.9' });
    expect(getClientIp(headers)).toBe('203.0.113.4');
  });

  it('reads only the first entry of a multi-value Vercel header', () => {
    expect(getClientIp(headersWith({ 'x-vercel-forwarded-for': '203.0.113.4, 10.0.0.1' }))).toBe('203.0.113.4');
  });

  it('falls back to the anonymous identity — never to a forgeable header — when the Vercel header is malformed', () => {
    const headers = headersWith({ 'x-vercel-forwarded-for': 'not-an-ip', 'x-forwarded-for': '198.51.100.9' });
    expect(getClientIp(headers)).toMatch(ANONYMOUS);
    expect(getClientIp(headers)).not.toBe('198.51.100.9');
  });

  it('accepts a single-entry x-forwarded-for when no Vercel header is present', () => {
    expect(getClientIp(headersWith({ 'x-forwarded-for': '203.0.113.4' }))).toBe('203.0.113.4');
  });

  it('takes the proxy-appended last entry of a comma-separated x-forwarded-for, not the caller-supplied first', () => {
    expect(getClientIp(headersWith({ 'x-forwarded-for': '1.2.3.4, 198.51.100.9' }))).toBe('198.51.100.9');
    expect(getClientIp(headersWith({ 'x-forwarded-for': 'spoofed, 1.2.3.4 , 198.51.100.9' }))).toBe('198.51.100.9');
  });

  it('does not let a spoofed leading entry become the identity', () => {
    const spoofed = getClientIp(headersWith({ 'x-forwarded-for': '203.0.113.4, 198.51.100.9' }));
    expect(spoofed).not.toBe('203.0.113.4');
  });

  it('handles IPv4 and IPv6 literals', () => {
    expect(getClientIp(headersWith({ 'x-vercel-forwarded-for': '192.0.2.1' }))).toBe('192.0.2.1');
    expect(getClientIp(headersWith({ 'x-vercel-forwarded-for': '2001:db8::8a2e:370:7334' }))).toBe('2001:db8::8a2e:370:7334');
    expect(getClientIp(headersWith({ 'x-forwarded-for': '::1' }))).toBe('::1');
  });

  it('uses x-real-ip only when no forwarding header yields an address', () => {
    expect(getClientIp(headersWith({ 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9');
    expect(getClientIp(headersWith({ 'x-forwarded-for': '198.51.100.9', 'x-real-ip': '192.0.2.1' }))).toBe('198.51.100.9');
  });

  it.each(['<script>', 'example.com', '203.0.113.4:8080', '[2001:db8::1]', 'a'.repeat(65), '   ', ''])(
    'rejects malformed or oversized values: %s',
    (value) => expect(getClientIp(headersWith({ 'x-forwarded-for': value }))).toMatch(ANONYMOUS),
  );

  it('assigns a stable, bounded identity when no address headers exist', () => {
    const headers = headersWith({});
    expect(getClientIp(headers)).toMatch(ANONYMOUS);
    expect(getClientIp(headers)).toBe(getClientIp(headers));
    expect(getClientIp(new Headers())).toMatch(ANONYMOUS);
  });

  it('separates anonymous callers that differ, and never returns an empty identity', () => {
    const one = getClientIp(new Headers({ 'user-agent': 'one' }));
    const two = getClientIp(new Headers({ 'user-agent': 'two' }));
    expect(one).not.toBe(two);
    expect(one.length).toBe('unknown:'.length + 24);
  });
});
