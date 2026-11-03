import Anthropic from '@anthropic-ai/sdk';
import { GaryLlmNotConfiguredError, GaryLlmIncompleteResponseError, providerRequestBudget } from './types';
import type { GenerateChatCompletionInput, GenerateChatCompletionResult, LlmProviderAdapter } from './types';

/** Reuses the already-installed @anthropic-ai/sdk (used elsewhere by lib/anthropic.ts for the assessment email) so Claude can be tested as Gary's model later without adding a dependency. */
export function createGaryAnthropicAdapter(params: { apiKey: string | undefined; model: string }): LlmProviderAdapter {
  const { apiKey, model } = params;
  let client: Anthropic | undefined;

  function requireClient(): Anthropic {
    if (!apiKey) throw new GaryLlmNotConfiguredError('anthropic');
    if (!client) client = new Anthropic({ apiKey, timeout: 45_000, maxRetries: 0 });
    return client;
  }

  return {
    provider: 'anthropic',
    async generateChatCompletion(input: GenerateChatCompletionInput): Promise<GenerateChatCompletionResult> {
      const budget = providerRequestBudget(input);
      const anthropic = requireClient();
      const response = await anthropic.messages.create({
        model,
        max_tokens: input.maxTokens ?? 1024,
        system: input.systemPrompt,
        messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
      }, budget);
      const text = response.content.filter((block): block is Anthropic.TextBlock => block.type === 'text').map((block) => block.text).join('\n');
      if (response.stop_reason !== 'end_turn' || !text.trim()) throw new GaryLlmIncompleteResponseError();
      return {
        text,
        model: response.model ?? model,
        provider: 'anthropic',
        stopReason: response.stop_reason ?? 'unknown',
      };
    },
  };
}
