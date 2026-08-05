import { createGaryOpenAiAdapter } from './openaiAdapter';
import { createGaryAnthropicAdapter } from './anthropicAdapter';
import type { GaryLlmProviderId, LlmProviderAdapter } from './types';

function buildAdapter(provider: GaryLlmProviderId, model: string): LlmProviderAdapter {
  if (provider === 'anthropic') {
    return createGaryAnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY, model });
  }
  return createGaryOpenAiAdapter({
    apiKey: process.env.OPENAI_API_KEY,
    model,
    baseURL: process.env.GARY_LLM_BASE_URL,
  });
}

/**
 * Reads the primary provider/model from server-side env only — never hardcoded, never sent to
 * the client. GARY_LLM_MODEL has no fallback baked into code on purpose: an unset model name
 * should fail loudly at first use rather than silently running an unintended default.
 */
export function createGaryLlmAdapter(): LlmProviderAdapter {
  const provider = (process.env.GARY_LLM_PROVIDER as GaryLlmProviderId | undefined) ?? 'openai';
  const model = process.env.GARY_LLM_MODEL;
  if (!model) throw new Error('GARY_LLM_MODEL is not set — cannot construct the Gary LLM adapter.');
  return buildAdapter(provider, model);
}

/**
 * GARY_LLM_FALLBACK_PROVIDER/MODEL are read and validated at construction time so a misconfigured
 * fallback fails fast at boot, not silently at 2am — but the adapter this returns is intentionally
 * never invoked automatically by the reply pipeline (see lib/gary/replyPipeline.ts). Auto-failover
 * to a second model changes response quality/voice/cost in ways that haven't been evaluated yet;
 * wiring it in is a deliberate follow-up once the primary model (gpt-5.4-mini) has been tested in
 * production. Do not add automatic fallback without an explicit decision to do so.
 */
export function createGaryFallbackLlmAdapter(): LlmProviderAdapter | null {
  const provider = process.env.GARY_LLM_FALLBACK_PROVIDER as GaryLlmProviderId | undefined;
  const model = process.env.GARY_LLM_FALLBACK_MODEL;
  if (!provider || !model) return null;
  return buildAdapter(provider, model);
}
