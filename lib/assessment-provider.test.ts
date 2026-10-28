import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssessmentSubmission } from './validation';

const { constructor, create, validate } = vi.hoisted(() => ({ constructor: vi.fn(), create: vi.fn(), validate: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create }; constructor(options: unknown) { constructor(options); } } }));
vi.mock('./resultValidator', async () => ({ ...await vi.importActual('./resultValidator'), validateResultHtml: validate }));
const submission = {
  firstName: 'Fixture', lastName: 'Owner', businessName: 'Fixture Business', email: 'fixture@example.test',
  industry: 'Retail & E-commerce', workSituation: 'Owner', searchVisibility: 'Unknown', websiteConversion: 'Contact',
  aiChallenge: 'Calls', desiredOutcome: 'Time', timeDrain: 'Admin', leadResponse: 'Manual', privacyConcern: 'High',
  noWebsite: true, websiteUrl: '', consent: true, formLoadedAt: 1
} as AssessmentSubmission;
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
