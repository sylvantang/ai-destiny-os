// ============================================================
// AI Destiny OS — Agent Layer: LLM Client
// Native fetch-based clients for OpenAI, Anthropic, and DeepSeek APIs.
// DeepSeek uses OpenAI-compatible format.
// Supports tool calling (function calling) for the agentic loop.
// ============================================================

// ---- Types ----

export type LLMProvider = 'openai' | 'anthropic' | 'deepseek';

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

// ---- Tool Calling Types ----

/** OpenAI function-calling tool definition format. */
export interface ToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** A tool call requested by the LLM. */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// ---- Message Types ----

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  /** Present on assistant messages when the LLM requests tool calls. */
  tool_calls?: ToolCall[];
  /** Present on tool messages — the ID of the tool call this responds to. */
  tool_call_id?: string;
}

export interface LLMResponse {
  content: string | null;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  finishReason?: string;
  /** Tool calls requested by the LLM (if any). Provider resolves these. */
  toolCalls?: ToolCall[];
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
   * Pass `tools` to enable function calling — the response may include tool_calls.
   */
  async chat(messages: ChatMessage[], tools?: ToolDef[]): Promise<LLMResponse> {
    if (this.config.provider === 'anthropic') {
      return this.callAnthropic(messages, tools);
    }
    // OpenAI and DeepSeek both use OpenAI-compatible format
    return this.callOpenAI(messages, tools);
  }

  /**
   * Stream a chat completion, yielding tokens as they arrive.
   * Note: tools are not supported during streaming. Use chat() for the agentic loop.
   */
  async *stream(messages: ChatMessage[]): AsyncGenerator<LLMStreamEvent> {
    if (this.config.provider === 'anthropic') {
      yield* this.streamAnthropic(messages);
    } else {
      // OpenAI and DeepSeek both use OpenAI-compatible streaming format
      yield* this.streamOpenAI(messages);
    }
  }

  // ---- OpenAI ----

  private get openAIURL(): string {
    return `${this.config.baseURL ?? 'https://api.openai.com'}/v1/chat/completions`;
  }

  private async callOpenAI(messages: ChatMessage[], tools?: ToolDef[]): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: messages.map(m => this.toOpenAIMessage(m)),
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

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
    const choice = (data as { choices: Array<{ message: { content: string | null; tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> }; finish_reason: string }> }).choices[0];
    const usage = (data as { usage?: { prompt_tokens: number; completion_tokens: number } }).usage;

    const msg = choice?.message;
    const toolCalls = msg?.tool_calls?.map((tc): ToolCall => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.function.name, arguments: tc.function.arguments },
    }));

    return {
      content: msg?.content ?? null,
      model: (data as { model: string }).model,
      usage: usage ? {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
      } : undefined,
      finishReason: choice?.finish_reason,
      toolCalls,
    };
  }

  /** Convert internal ChatMessage to OpenAI API format. */
  private toOpenAIMessage(m: ChatMessage): Record<string, unknown> {
    const msg: Record<string, unknown> = { role: m.role };
    if (m.tool_calls) {
      msg.tool_calls = m.tool_calls;
    }
    if (m.tool_call_id) {
      msg.tool_call_id = m.tool_call_id;
    }
    msg.content = m.content ?? '';
    return msg;
  }

  private async *streamOpenAI(messages: ChatMessage[]): AsyncGenerator<LLMStreamEvent> {
    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: messages.map(m => this.toOpenAIMessage(m)),
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

  private async callAnthropic(messages: ChatMessage[], tools?: ToolDef[]): Promise<LLMResponse> {
    const { systemMsg, chatMsgs } = this.splitAnthropicMessages(messages);

    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      messages: chatMsgs,
    };
    if (systemMsg) {
      body.system = systemMsg.content;
    }
    if (this.config.temperature !== undefined) {
      body.temperature = this.config.temperature;
    }
    if (tools && tools.length > 0) {
      body.tools = tools.map(t => this.toAnthropicTool(t));
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
    const content = (data as { content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> }).content;

    const textBlocks = content.filter(c => c.type === 'text');
    const toolUseBlocks = content.filter(c => c.type === 'tool_use');

    const text = textBlocks.map(c => c.text ?? '').join('') || null;
    const toolCalls: ToolCall[] | undefined = toolUseBlocks.length > 0
      ? toolUseBlocks.map(tu => ({
          id: tu.id!,
          type: 'function' as const,
          function: {
            name: tu.name!,
            arguments: JSON.stringify(tu.input ?? {}),
          },
        }))
      : undefined;

    const usage = (data as { usage?: { input_tokens: number; output_tokens: number } }).usage;

    return {
      content: text,
      model: (data as { model: string }).model,
      usage: usage ? {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
      } : undefined,
      finishReason: (data as { stop_reason?: string }).stop_reason,
      toolCalls,
    };
  }

  /** Convert OpenAI-format tool def to Anthropic format. */
  private toAnthropicTool(tool: ToolDef): Record<string, unknown> {
    const f = tool.function;
    return {
      name: f.name,
      description: f.description,
      input_schema: f.parameters,
    };
  }

  /** Split messages into Anthropic format: system prompt + chat messages. */
  private splitAnthropicMessages(messages: ChatMessage[]): {
    systemMsg: ChatMessage | undefined;
    chatMsgs: Record<string, unknown>[];
  } {
    const systemMsg = messages.find(m => m.role === 'system');

    const chatMsgs: Record<string, unknown>[] = [];
    const nonSystem = messages.filter(m => m.role !== 'system');

    let i = 0;
    while (i < nonSystem.length) {
      const m = nonSystem[i]!;

      if (m.role === 'tool') {
        // Merge consecutive tool messages into a single user message
        // — Anthropic requires all tool_results for a given assistant's
        // tool_use blocks to be in the same next user message.
        const toolResults: Record<string, unknown>[] = [];
        while (i < nonSystem.length && nonSystem[i]!.role === 'tool') {
          const tm = nonSystem[i]!;
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tm.tool_call_id ?? '',
            content: tm.content ?? '',
          });
          i++;
        }
        chatMsgs.push({ role: 'user', content: toolResults });
        continue;
      }

      if (m.role === 'assistant' && m.tool_calls) {
        const blocks: Record<string, unknown>[] = [];
        if (m.content) {
          blocks.push({ type: 'text', text: m.content });
        }
        for (const tc of m.tool_calls) {
          blocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: safeParseJSON(tc.function.arguments) ?? {},
          });
        }
        chatMsgs.push({ role: m.role, content: blocks });
      } else {
        chatMsgs.push({ role: m.role, content: m.content ?? '' });
      }
      i++;
    }

    return { systemMsg, chatMsgs };
  }

  private async *streamAnthropic(messages: ChatMessage[]): AsyncGenerator<LLMStreamEvent> {
    const { systemMsg, chatMsgs: chatMessages } = this.splitAnthropicMessages(messages);

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

function safeParseJSON(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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
 * Create a DeepSeek client from environment variables.
 * DeepSeek uses OpenAI-compatible API format.
 * Reads DEEPSEEK_API_KEY, DEEPSEEK_MODEL from process.env.
 */
export function createDeepSeekClient(apiKey?: string, model?: string): LLMClient {
  const key = apiKey ?? process.env['DEEPSEEK_API_KEY'] ?? '';
  return new LLMClient({
    provider: 'deepseek',
    apiKey: key,
    model: model ?? process.env['DEEPSEEK_MODEL'] ?? 'deepseek-chat',
    baseURL: process.env['DEEPSEEK_BASE_URL'] ?? 'https://api.deepseek.com',
  });
}

/**
 * Auto-detect which provider to use based on available API keys.
 */
export function createAutoClient(): LLMClient | null {
  const anthropicKey = process.env['ANTHROPIC_API_KEY'] ?? process.env['ANTHROPIC_AUTH_TOKEN'];
  if (anthropicKey) return createAnthropicClient(anthropicKey);

  const deepseekKey = process.env['DEEPSEEK_API_KEY'];
  if (deepseekKey) return createDeepSeekClient(deepseekKey);

  const openaiKey = process.env['OPENAI_API_KEY'];
  if (openaiKey) return createOpenAIClient(openaiKey);

  return null;
}
