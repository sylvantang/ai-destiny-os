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
        arguments: string;
    };
}
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
export declare class LLMClient {
    private config;
    constructor(config: LLMConfig);
    /**
     * Send a chat completion request (non-streaming).
     * Pass `tools` to enable function calling — the response may include tool_calls.
     */
    chat(messages: ChatMessage[], tools?: ToolDef[]): Promise<LLMResponse>;
    /**
     * Stream a chat completion, yielding tokens as they arrive.
     * Note: tools are not supported during streaming. Use chat() for the agentic loop.
     */
    stream(messages: ChatMessage[]): AsyncGenerator<LLMStreamEvent>;
    private get openAIURL();
    private callOpenAI;
    /** Convert internal ChatMessage to OpenAI API format. */
    private toOpenAIMessage;
    private streamOpenAI;
    private openAIHeaders;
    private get anthropicURL();
    private callAnthropic;
    /** Convert OpenAI-format tool def to Anthropic format. */
    private toAnthropicTool;
    /** Split messages into Anthropic format: system prompt + chat messages. */
    private splitAnthropicMessages;
    private streamAnthropic;
    private anthropicHeaders;
}
/**
 * Create an OpenAI-compatible client from environment variables.
 * Reads OPENAI_API_KEY, OPENAI_MODEL from process.env.
 */
export declare function createOpenAIClient(apiKey?: string, model?: string): LLMClient;
/**
 * Create an Anthropic client from environment variables.
 * Reads ANTHROPIC_API_KEY, ANTHROPIC_MODEL from process.env.
 */
export declare function createAnthropicClient(apiKey?: string, model?: string): LLMClient;
/**
 * Auto-detect which provider to use based on available API keys.
 */
export declare function createAutoClient(): LLMClient | null;
//# sourceMappingURL=llmClient.d.ts.map