import { describe, expect, it, vi } from 'vitest';

vi.mock('openai', () => {
  class FakeOpenAI {
    chat = {
      completions: {
        create: vi.fn().mockResolvedValue({
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
    messages = {
      create: vi.fn().mockResolvedValue({
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
