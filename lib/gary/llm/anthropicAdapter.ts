import Anthropic from '@anthropic-ai/sdk';
import { GaryLlmNotConfiguredError } from './types';
import type { GenerateChatCompletionInput, GenerateChatCompletionResult, LlmProviderAdapter } from './types';

/** Reuses the already-installed @anthropic-ai/sdk (used elsewhere by lib/anthropic.ts for the assessment email) so Claude can be tested as Gary's model later without adding a dependency. */
export function createGaryAnthropicAdapter(params: { apiKey: string | undefined; model: string }): LlmProviderAdapter {
  const { apiKey, model } = params;
  let client: Anthropic | undefined;

  function requireClient(): Anthropic {
    if (!apiKey) throw new GaryLlmNotConfiguredError('anthropic');
    if (!client) client = new Anthropic({ apiKey });
    return client;
  }

  return {
    provider: 'anthropic',
    async generateChatCompletion(input: GenerateChatCompletionInput): Promise<GenerateChatCompletionResult> {
      const anthropic = requireClient();
      const response = await anthropic.messages.create({
        model,
        max_tokens: input.maxTokens ?? 1024,
        system: input.systemPrompt,
        messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text');
      return {
        text: textBlock?.text ?? '',
        model: response.model ?? model,
        provider: 'anthropic',
        stopReason: response.stop_reason ?? 'unknown',
      };
    },
  };
}
