export type ChatMessageRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

export interface GenerateChatCompletionInput {
  systemPrompt: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Remaining caller budget; SDK cancellation, never an extra retry budget. */
  timeoutMs?: number;
}

export type GaryLlmProviderId = 'openai' | 'anthropic';

export interface GenerateChatCompletionResult {
  text: string;
  model: string;
  provider: GaryLlmProviderId;
  stopReason: string;
}

/** One method, one job: turn a system prompt + message history into a reply. No tools, no images, no web search — Gary doesn't need them. */
export interface LlmProviderAdapter {
  readonly provider: GaryLlmProviderId;
  generateChatCompletion(input: GenerateChatCompletionInput): Promise<GenerateChatCompletionResult>;
}

export class GaryLlmNotConfiguredError extends Error {
  constructor(public readonly provider: GaryLlmProviderId) {
    super(`Gary LLM provider "${provider}" is not configured — missing API key.`);
    this.name = 'GaryLlmNotConfiguredError';
  }
}

/** SDK retries would multiply the pipeline's one explicit correction attempt. */
export const GARY_PROVIDER_MAX_RETRIES = 0;
export const GARY_MAX_OUTPUT_TOKENS = 1024;
export function providerRequestBudget(input: GenerateChatCompletionInput): { timeout: number; maxRetries: number } {
  const remaining = input.timeoutMs ?? 45_000;
  if (!Number.isFinite(remaining) || remaining <= 0) throw new Error('Gary provider deadline exceeded');
  const tokens = input.maxTokens ?? GARY_MAX_OUTPUT_TOKENS;
  if (!Number.isInteger(tokens) || tokens < 1 || tokens > GARY_MAX_OUTPUT_TOKENS) throw new Error('Gary output token budget exceeded');
  return { timeout: Math.min(45_000, remaining), maxRetries: GARY_PROVIDER_MAX_RETRIES };
}
export class GaryLlmIncompleteResponseError extends Error {
  constructor() { super('Gary provider did not return a complete answer'); this.name = 'GaryLlmIncompleteResponseError'; }
}
