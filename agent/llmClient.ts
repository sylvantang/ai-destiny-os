// ============================================================
// AI Destiny OS — Agent Layer: LLM Client
// Native fetch-based clients for OpenAI and Anthropic APIs.
// Zero additional dependencies.
// ============================================================

// ---- Types ----

export type LLMProvider = 'openai' | 'anthropic';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  /** Model name, e.g. 'gpt-4o', 'claude-sonnet-4-6' */
  model: string;
  /** Custom API base URL (for proxies / compatible APIs) */
  baseURL?: string;
  /** Max tokens in response */
  maxTokens?: number;
  /** Temperature (0-1) */
  temperature?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason?: string;
}

export interface LLMStreamEvent {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
  usage?: LLMResponse['usage'];
}

// ---- Client Class ----

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = {
      maxTokens: 2048,
      temperature: 0.7,
      ...config,
    };
  }

  /**
   * Send a chat completion request (non-streaming).
   */
  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    if (this.config.provider === 'openai') {
      return this.callOpenAI(messages);
    }
    return this.callAnthropic(messages);
  }

  /**
   * Stream a chat completion, yielding tokens as they arrive.
   */
  async *stream(messages: ChatMessage[]): AsyncGenerator<LLMStreamEvent> {
    if (this.config.provider === 'openai') {
      yield* this.streamOpenAI(messages);
    } else {
      yield* this.streamAnthropic(messages);
    }
  }

  // ---- OpenAI ----

  private get openAIURL(): string {
    return `${this.config.baseURL ?? 'https://api.openai.com'}/v1/chat/completions`;
  }

  private async callOpenAI(messages: ChatMessage[]): Promise<LLMResponse> {
    const body = {
      model: this.config.model,
      messages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    };

    const res = await fetch(this.openAIURL, {
      method: 'POST',
      headers: this.openAIHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${err}`);
    }

    const data = await res.json() as Record<string, unknown>;
    const choice = (data as { choices: Array<{ message: { content: string }; finish_reason: string }> }).choices[0];
    const usage = (data as { usage?: { prompt_tokens: number; completion_tokens: number } }).usage;

    return {
      content: choice?.message?.content ?? '',
      model: (data as { model: string }).model,
      usage: usage ? {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
      } : undefined,
      finishReason: choice?.finish_reason,
    };
  }

  private async *streamOpenAI(messages: ChatMessage[]): AsyncGenerator<LLMStreamEvent> {
    const body = {
      model: this.config.model,
      messages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      stream: true,
    };

    const res = await fetch(this.openAIURL, {
      method: 'POST',
      headers: this.openAIHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      yield { type: 'error', error: `OpenAI API error ${res.status}` };
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          yield { type: 'done' };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            yield { type: 'token', content: delta };
          }
        } catch {
          // Skip unparseable chunks
        }
      }
    }

    yield { type: 'done' };
  }

  private openAIHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  // ---- Anthropic ----

  private get anthropicURL(): string {
    return `${this.config.baseURL ?? 'https://api.anthropic.com'}/v1/messages`;
  }

  private async callAnthropic(messages: ChatMessage[]): Promise<LLMResponse> {
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      messages: chatMessages,
    };
    if (systemMsg) {
      body.system = systemMsg.content;
    }
    if (this.config.temperature !== undefined) {
      body.temperature = this.config.temperature;
    }

    const res = await fetch(this.anthropicURL, {
      method: 'POST',
      headers: this.anthropicHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${err}`);
    }

    const data = await res.json() as Record<string, unknown>;
    const content = (data as { content: Array<{ type: string; text: string }> }).content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('');
    const usage = (data as { usage?: { input_tokens: number; output_tokens: number } }).usage;

    return {
      content,
      model: (data as { model: string }).model,
      usage: usage ? {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
      } : undefined,
      finishReason: (data as { stop_reason?: string }).stop_reason,
    };
  }

  private async *streamAnthropic(messages: ChatMessage[]): AsyncGenerator<LLMStreamEvent> {
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      messages: chatMessages,
      stream: true,
    };
    if (systemMsg) {
      body.system = systemMsg.content;
    }
    if (this.config.temperature !== undefined) {
      body.temperature = this.config.temperature;
    }

    const res = await fetch(this.anthropicURL, {
      method: 'POST',
      headers: this.anthropicHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      yield { type: 'error', error: `Anthropic API error ${res.status}` };
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta') {
            const text = parsed.delta?.text;
            if (text) {
              yield { type: 'token', content: text };
            }
          } else if (parsed.type === 'message_stop') {
            yield { type: 'done' };
            return;
          }
        } catch {
          // Skip unparseable
        }
      }
    }

    yield { type: 'done' };
  }

  private anthropicHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }
}

// ---- Helpers ----

/**
 * Create an OpenAI-compatible client from environment variables.
 * Reads OPENAI_API_KEY, OPENAI_MODEL from process.env.
 */
export function createOpenAIClient(apiKey?: string, model?: string): LLMClient {
  const key = apiKey ?? process.env['OPENAI_API_KEY'] ?? '';
  return new LLMClient({
    provider: 'openai',
    apiKey: key,
    model: model ?? process.env['OPENAI_MODEL'] ?? 'gpt-4o',
  });
}

/**
 * Create an Anthropic client from environment variables.
 * Reads ANTHROPIC_API_KEY, ANTHROPIC_MODEL from process.env.
 */
export function createAnthropicClient(apiKey?: string, model?: string): LLMClient {
  const key = apiKey
    ?? process.env['ANTHROPIC_API_KEY']
    ?? process.env['ANTHROPIC_AUTH_TOKEN']
    ?? '';
  return new LLMClient({
    provider: 'anthropic',
    apiKey: key,
    model: model ?? process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-4-6',
    baseURL: process.env['ANTHROPIC_BASE_URL'],
  });
}

/**
 * Auto-detect which provider to use based on available API keys.
 */
export function createAutoClient(): LLMClient | null {
  const anthropicKey = process.env['ANTHROPIC_API_KEY'] ?? process.env['ANTHROPIC_AUTH_TOKEN'];
  if (anthropicKey) return createAnthropicClient(anthropicKey);

  const openaiKey = process.env['OPENAI_API_KEY'];
  if (openaiKey) return createOpenAIClient(openaiKey);

  return null;
}
