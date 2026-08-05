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
