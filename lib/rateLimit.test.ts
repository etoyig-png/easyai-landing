import { describe, expect, it } from 'vitest';
import { getClientIp } from './rateLimit';
describe('client rate-limit identity', () => {
  it('normalizes a known proxy IP', () => expect(getClientIp(new Headers({ 'x-forwarded-for': '203.0.113.4, 10.0.0.1' }))).toBe('203.0.113.4'));
  it('assigns stable bounded identities when IP is missing', () => {
    const headers = new Headers({ 'user-agent': 'browser', 'accept-language': 'en' });
    expect(getClientIp(headers)).toMatch(/^unknown:[a-f0-9]{24}$/);
    expect(getClientIp(headers)).toBe(getClientIp(headers));
  });
  it('does not trust malformed forwarding headers', () => expect(getClientIp(new Headers({ 'x-forwarded-for': '<script>' }))).toMatch(/^unknown:/));
});
