import { describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ openai: vi.fn(), anthropic: vi.fn(), openaiOptions: vi.fn(), anthropicOptions: vi.fn() }));
vi.mock('openai', () => {
  class FakeOpenAI {
    constructor(options: unknown) { sdk.openaiOptions(options); }
    chat = {
      completions: {
        create: sdk.openai.mockResolvedValue({
          model: 'gpt-5.4-mini',
          choices: [{ message: { content: 'Hi, how can I help?' }, finish_reason: 'stop' }],
        }),
      },
    };
  }
  return { default: FakeOpenAI };
});

vi.mock('@anthropic-ai/sdk', () => {
  class FakeAnthropic {
    constructor(options: unknown) { sdk.anthropicOptions(options); }
    messages = {
      create: sdk.anthropic.mockResolvedValue({
        model: 'claude-opus-5',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hi, how can I help?' }],
      }),
    };
  }
  return { default: FakeAnthropic };
});

describe('createGaryOpenAiAdapter', () => {
  it('maps a mocked Chat Completions response into GenerateChatCompletionResult', async () => {
    const { createGaryOpenAiAdapter } = await import('./openaiAdapter');
    const adapter = createGaryOpenAiAdapter({ apiKey: 'test-key', model: 'gpt-5.4-mini' });
    const result = await adapter.generateChatCompletion({
      systemPrompt: 'You are Gary.',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result).toEqual({
      text: 'Hi, how can I help?',
      model: 'gpt-5.4-mini',
      provider: 'openai',
      stopReason: 'stop',
    });
  });

  it('throws GaryLlmNotConfiguredError when no API key is set', async () => {
    const { createGaryOpenAiAdapter } = await import('./openaiAdapter');
    const { GaryLlmNotConfiguredError } = await import('./types');
    const adapter = createGaryOpenAiAdapter({ apiKey: undefined, model: 'gpt-5.4-mini' });
    await expect(
      adapter.generateChatCompletion({ systemPrompt: 'x', messages: [] })
    ).rejects.toBeInstanceOf(GaryLlmNotConfiguredError);
  });
});

describe('createGaryAnthropicAdapter', () => {
  it('maps a mocked Messages API response into GenerateChatCompletionResult', async () => {
    const { createGaryAnthropicAdapter } = await import('./anthropicAdapter');
    const adapter = createGaryAnthropicAdapter({ apiKey: 'test-key', model: 'claude-opus-5' });
    const result = await adapter.generateChatCompletion({
      systemPrompt: 'You are Gary.',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result).toEqual({
      text: 'Hi, how can I help?',
      model: 'claude-opus-5',
      provider: 'anthropic',
      stopReason: 'end_turn',
    });
  });
});

describe('Gary SDK safety boundaries', () => {
  it.each(['openai', 'anthropic'] as const)('passes caller deadline, output cap and no retries to %s SDK', async (provider) => {
    const { createGaryOpenAiAdapter } = await import('./openaiAdapter');
    const { createGaryAnthropicAdapter } = await import('./anthropicAdapter');
    const factory = provider === 'openai' ? createGaryOpenAiAdapter : createGaryAnthropicAdapter;
    const adapter = factory({ apiKey: 'synthetic-only', model: 'fixture-model' });
    await adapter.generateChatCompletion({ systemPrompt: 'fixture', messages: [], timeoutMs: 1234, maxTokens: 800 });
    expect(sdk[provider]).toHaveBeenLastCalledWith(expect.objectContaining({ max_tokens: 800 }), { timeout: 1234, maxRetries: 0 });
    expect(sdk[provider === 'openai' ? 'openaiOptions' : 'anthropicOptions']).toHaveBeenLastCalledWith(expect.objectContaining({ timeout: 45000, maxRetries: 0 }));
  });
  it.each(['openai', 'anthropic'] as const)('rejects exhausted deadlines and excessive output before calling %s', async (provider) => {
    const { createGaryOpenAiAdapter } = await import('./openaiAdapter');
    const { createGaryAnthropicAdapter } = await import('./anthropicAdapter');
    const adapter = (provider === 'openai' ? createGaryOpenAiAdapter : createGaryAnthropicAdapter)({ apiKey: 'synthetic-only', model: 'fixture' });
    const before = sdk[provider].mock.calls.length;
    for (const input of [{ timeoutMs: 0 }, { timeoutMs: NaN }, { maxTokens: 1025 }]) {
      await expect(adapter.generateChatCompletion({ systemPrompt: 'fixture', messages: [], ...input })).rejects.toThrow(/budget|deadline/);
    }
    expect(sdk[provider]).toHaveBeenCalledTimes(before);
  });
  it.each([
    { choices: [{ finish_reason: 'length', message: { content: 'partial' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: 'answer', refusal: 'refused' } }] },
    { choices: [{ finish_reason: 'content_filter', message: { content: 'partial' } }] },
    { choices: [] },
  ])('never exposes an incomplete/refused OpenAI answer', async (response) => {
    const { createGaryOpenAiAdapter } = await import('./openaiAdapter');
    sdk.openai.mockResolvedValueOnce(response);
    await expect(createGaryOpenAiAdapter({ apiKey: 'synthetic', model: 'fixture' }).generateChatCompletion({ systemPrompt: '', messages: [] })).rejects.toThrow('complete answer');
  });
  it.each(['max_tokens', 'refusal', 'pause_turn', null])('rejects Anthropic stop %s instead of showing partial content', async (stop_reason) => {
    const { createGaryAnthropicAdapter } = await import('./anthropicAdapter');
    sdk.anthropic.mockResolvedValueOnce({ stop_reason, content: [{ type: 'text', text: 'partial' }] });
    await expect(createGaryAnthropicAdapter({ apiKey: 'synthetic', model: 'fixture' }).generateChatCompletion({ systemPrompt: '', messages: [] })).rejects.toThrow('complete answer');
  });
});
