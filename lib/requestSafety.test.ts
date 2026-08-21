import { describe, expect, it } from 'vitest';
import { readLimitedJson, withTimeout } from './requestSafety';

describe('request safety', () => {
  it('accepts normal and boundary JSON', async () => {
    expect(await readLimitedJson(new Request('http://x', { method: 'POST', body: '{}' }), 2)).toEqual({});
  });
  it('rejects declared and actual oversized JSON', async () => {
    await expect(readLimitedJson(new Request('http://x', { method: 'POST', headers: { 'content-length': '10' }, body: '{}' }), 2)).rejects.toThrow('REQUEST_TOO_LARGE');
    await expect(readLimitedJson(new Request('http://x', { method: 'POST', body: '{"x":1}' }), 2)).rejects.toThrow('REQUEST_TOO_LARGE');
  });
  it('times out providers', async () => expect(withTimeout(new Promise(() => {}), 5, 'provider')).rejects.toThrow('provider timed out'));
});
