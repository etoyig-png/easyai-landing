import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssessmentSubmission } from './validation';

const { constructor, create, validate } = vi.hoisted(() => ({ constructor: vi.fn(), create: vi.fn(), validate: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create }; constructor(options: unknown) { constructor(options); } } }));
vi.mock('./resultValidator', async () => ({ ...await vi.importActual('./resultValidator'), validateResultHtml: validate }));
const submission: AssessmentSubmission = {
  workSituation: 'Small business, 1-10 employees ($100K-$1M/yr)',
  searchVisibility: 'We show up sometimes, but competitors seem more visible',
  aiChallenge: "I'm excited about AI but overwhelmed by where to start",
  desiredOutcome: 'Make more money — increase revenue or cut costs',
  timeDrain: 'Answering calls & following up with leads quickly',
  privacyConcern: "Somewhat worried — I think about it, but it's not stopping me",
  industry: 'Construction & Trades (contractors, subs, home services)',
  leadResponse: 'We respond manually, but follow-up is not always consistent.',
  websiteConversion: 'Visitors can contact us, but the next step could be clearer',
  firstName: 'Taylor',
  lastName: 'Doe',
  businessName: 'Johnson Electric',
  email: 'taylor@example.com',
  websiteUrl: 'https://example.com',
  noWebsite: false,
  consent: true,
  formLoadedAt: 1,
};
const response = (stop_reason = 'end_turn') => ({ stop_reason, content: [{ type: 'text', text: '<p>Fixture result.</p>' }] });
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-28T00:00:00Z'));
  vi.stubEnv('ANTHROPIC_API_KEY', 'synthetic-never-sent'); vi.stubEnv('VERCEL_ENV', 'development');
  validate.mockReturnValue({ valid: true, violations: [] }); create.mockResolvedValue(response());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
describe('assessment provider effect and deadline budget (mocked SDK only)', () => {
  it('disables hidden transport retries at construction and request level', async () => {
    const { generateAssessmentResult } = await import('./anthropic');
    await generateAssessmentResult({ submission });
    expect(constructor).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 0, timeout: 45_000 }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][1]).toMatchObject({ maxRetries: 0, timeout: 45_000 });
  });
  it('shares the first attempt deadline with the one permitted correction', async () => {
    validate.mockReturnValueOnce({ valid: false, violations: ['Fixture violation'] }).mockReturnValueOnce({ valid: true, violations: [] });
    create.mockImplementationOnce(async () => { vi.setSystemTime(Date.now() + 44_000); return response(); }).mockResolvedValueOnce(response());
    const { generateAssessmentResult } = await import('./anthropic');
    await generateAssessmentResult({ submission });
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][1]).toMatchObject({ maxRetries: 0, timeout: 1_000 });
  });
  it('does not start a correction after the shared deadline expires', async () => {
    validate.mockReturnValue({ valid: false, violations: ['Fixture violation'] });
    create.mockImplementation(async () => { vi.setSystemTime(Date.now() + 45_000); return response(); });
    const { generateAssessmentResult } = await import('./anthropic');
    await expect(generateAssessmentResult({ submission })).rejects.toThrow(/deadline/i);
    expect(create).toHaveBeenCalledTimes(1);
  });
  it.each(['max_tokens', 'refusal'])('never accepts an incomplete %s result or spends on its correction', async stop => {
    create.mockResolvedValue(response(stop));
    const { generateAssessmentResult } = await import('./anthropic');
    await expect(generateAssessmentResult({ submission })).rejects.toThrow();
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('does not turn a provider error into another model attempt', async () => {
    create.mockRejectedValue(new Error('Synthetic transport failure'));
    const { generateAssessmentResult } = await import('./anthropic');
    await expect(generateAssessmentResult({ submission })).rejects.toThrow('Synthetic transport failure');
    expect(create).toHaveBeenCalledTimes(1);
  });
});
