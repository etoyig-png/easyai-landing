import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGaryFallbackLlmAdapter, createGaryLlmAdapter } from './providerFactory';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('GARY_LLM')) delete process.env[key];
  }
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('createGaryLlmAdapter', () => {
  it('throws when GARY_LLM_MODEL is unset — no baked-in default model', () => {
    expect(() => createGaryLlmAdapter()).toThrow(/GARY_LLM_MODEL/);
  });

  it('defaults to the openai provider when GARY_LLM_PROVIDER is unset', () => {
    process.env.GARY_LLM_MODEL = 'gpt-5.4-mini';
    const adapter = createGaryLlmAdapter();
    expect(adapter.provider).toBe('openai');
  });

  it('honors GARY_LLM_PROVIDER=anthropic', () => {
    process.env.GARY_LLM_PROVIDER = 'anthropic';
    process.env.GARY_LLM_MODEL = 'claude-opus-5';
    const adapter = createGaryLlmAdapter();
    expect(adapter.provider).toBe('anthropic');
  });
});

describe('createGaryFallbackLlmAdapter', () => {
  it('returns null when fallback env vars are unset', () => {
    expect(createGaryFallbackLlmAdapter()).toBeNull();
  });

  it('returns null when only one of provider/model is set', () => {
    process.env.GARY_LLM_FALLBACK_PROVIDER = 'anthropic';
    expect(createGaryFallbackLlmAdapter()).toBeNull();
  });

  it('constructs an adapter when both fallback env vars are set', () => {
    process.env.GARY_LLM_FALLBACK_PROVIDER = 'anthropic';
    process.env.GARY_LLM_FALLBACK_MODEL = 'claude-opus-5';
    const adapter = createGaryFallbackLlmAdapter();
    expect(adapter).not.toBeNull();
    expect(adapter?.provider).toBe('anthropic');
  });
});
