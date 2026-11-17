import OpenAI from 'openai';
import { GaryLlmNotConfiguredError } from './types';
import type { GenerateChatCompletionInput, GenerateChatCompletionResult, LlmProviderAdapter } from './types';

/**
 * Uses OpenAI's Chat Completions API, not the Responses API — Gary needs neither web search
 * nor image input, so the simpler, better-documented Chat Completions shape is the lower-risk
 * choice here. `baseURL` is optional and env-driven so an OpenAI-compatible endpoint (DeepSeek,
 * Qwen/DashScope) can be swapped in later purely via configuration, no code change.
 */
export function createGaryOpenAiAdapter(params: { apiKey: string | undefined; model: string; baseURL?: string }): LlmProviderAdapter {
  const { apiKey, model, baseURL } = params;
  let client: OpenAI | undefined;

  function requireClient(): OpenAI {
    if (!apiKey) throw new GaryLlmNotConfiguredError('openai');
    if (!client) client = new OpenAI({ apiKey, baseURL });
    return client;
  }

  return {
    provider: 'openai',
    async generateChatCompletion(input: GenerateChatCompletionInput): Promise<GenerateChatCompletionResult> {
      const openai = requireClient();
      const response = await openai.chat.completions.create({
        model,
        max_tokens: input.maxTokens ?? 1024,
        temperature: input.temperature,
        messages: [
          { role: 'system', content: input.systemPrompt },
          ...input.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });
      const choice = response.choices[0];
      return {
        text: choice?.message?.content ?? '',
        model: response.model ?? model,
        provider: 'openai',
        stopReason: choice?.finish_reason ?? 'unknown',
      };
    },
  };
}
