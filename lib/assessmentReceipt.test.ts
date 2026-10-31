import { afterEach, beforeEach, expect, it, vi } from 'vitest';
let receipt: typeof import('./assessmentReceipt');
const values = new Map<string, string>();
const old = { id: 'old-A', capability: 'old-cap', storedAt: 1 };
const next = { id: 'new-B', capability: 'new-cap', storedAt: 2 };
const key = 'easyai-assessment-receipt-v1';
const working = () => ({ getItem: (k: string) => values.get(k) ?? null,
  setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } });
beforeEach(async () => {
  vi.resetModules(); values.clear(); values.set(key, JSON.stringify(old));
  vi.stubGlobal('window', { sessionStorage: working() });
  receipt = await import('./assessmentReceipt');
});
afterEach(() => vi.unstubAllGlobals());
it('replaces A with B even when removal is denied but writing succeeds', () => {
  vi.stubGlobal('window', { sessionStorage: { ...working(), removeItem() { throw Error('denied'); } } });
  receipt.storeAssessmentReceipt(next);
  expect(receipt.readAssessmentReceipt()).toEqual(next);
  expect(JSON.parse(values.get(key)!)).toEqual(next);
});
it('failed replacement clears A instead of making accepted B read the old plan', () => {
  vi.stubGlobal('window', { sessionStorage: { ...working(), setItem() { throw Error('quota'); } } });
  expect(() => receipt.storeAssessmentReceipt(next)).not.toThrow();
  expect(receipt.readAssessmentReceipt()).toBeNull();
  expect(values.has(key)).toBe(false);
});
it('missing receipt overwrites A with null when removal fails and survives reload', async () => {
  vi.stubGlobal('window', { sessionStorage: { ...working(), removeItem() { throw Error('denied'); } } });
  receipt.storeAssessmentReceipt(null);
  expect(receipt.readAssessmentReceipt()).toBeNull();
  vi.resetModules(); receipt = await import('./assessmentReceipt');
  expect(receipt.readAssessmentReceipt()).toBeNull();
});
it('masks A in the current runtime when both write and removal fail', () => {
  vi.stubGlobal('window', { sessionStorage: { ...working(), setItem() { throw Error('denied'); }, removeItem() { throw Error('denied'); } } });
  receipt.storeAssessmentReceipt(next);
  expect(receipt.readAssessmentReceipt()).toBeNull();
  expect(JSON.parse(values.get(key)!)).toEqual(old); // Physical erasure across reload is not promised in this mode.
});
it('successful replacement refresh reads only B', async () => {
  receipt.storeAssessmentReceipt(next);
  vi.resetModules(); receipt = await import('./assessmentReceipt');
  expect(receipt.readAssessmentReceipt()).toEqual(next);
});
it('allows a successful new receipt after storage recovers', () => {
  vi.stubGlobal('window', { sessionStorage: { ...working(), setItem() { throw Error('denied'); }, removeItem() { throw Error('denied'); } } });
  receipt.storeAssessmentReceipt(next);
  vi.stubGlobal('window', { sessionStorage: working() });
  receipt.storeAssessmentReceipt(next);
  expect(receipt.readAssessmentReceipt()).toEqual(next);
});
it('a smaller null overwrite can discard A when replacement and deletion both fail', async () => {
  vi.stubGlobal('window', { sessionStorage: { ...working(), setItem(k: string, v: string) { if (v !== 'null') throw Error('quota'); values.set(k, v); }, removeItem() { throw Error('denied'); } } });
  receipt.storeAssessmentReceipt(next);
  vi.resetModules(); receipt = await import('./assessmentReceipt');
  expect(receipt.readAssessmentReceipt()).toBeNull();
});
