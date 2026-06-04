// ============================================================
// AI Destiny OS — Agent Layer: LLM Client
// Native fetch-based clients for OpenAI and Anthropic APIs.
// Supports tool calling (function calling) for the agentic loop.
// ============================================================
// ---- Client Class ----
export class LLMClient {
    config;
    constructor(config) {
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
    async chat(messages, tools) {
        if (this.config.provider === 'openai') {
            return this.callOpenAI(messages, tools);
        }
        return this.callAnthropic(messages, tools);
    }
    /**
     * Stream a chat completion, yielding tokens as they arrive.
     * Note: tools are not supported during streaming. Use chat() for the agentic loop.
     */
    async *stream(messages) {
        if (this.config.provider === 'openai') {
            yield* this.streamOpenAI(messages);
        }
        else {
            yield* this.streamAnthropic(messages);
        }
    }
    // ---- OpenAI ----
    get openAIURL() {
        return `${this.config.baseURL ?? 'https://api.openai.com'}/v1/chat/completions`;
    }
    async callOpenAI(messages, tools) {
        const body = {
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
        const data = await res.json();
        const choice = data.choices[0];
        const usage = data.usage;
        const msg = choice?.message;
        const toolCalls = msg?.tool_calls?.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.function.name, arguments: tc.function.arguments },
        }));
        return {
            content: msg?.content ?? null,
            model: data.model,
            usage: usage ? {
                inputTokens: usage.prompt_tokens,
                outputTokens: usage.completion_tokens,
            } : undefined,
            finishReason: choice?.finish_reason,
            toolCalls,
        };
    }
    /** Convert internal ChatMessage to OpenAI API format. */
    toOpenAIMessage(m) {
        const msg = { role: m.role };
        if (m.tool_calls) {
            msg.tool_calls = m.tool_calls;
        }
        if (m.tool_call_id) {
            msg.tool_call_id = m.tool_call_id;
        }
        msg.content = m.content ?? '';
        return msg;
    }
    async *streamOpenAI(messages) {
        const body = {
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
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: '))
                    continue;
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
                }
                catch {
                    // Skip unparseable chunks
                }
            }
        }
        yield { type: 'done' };
    }
    openAIHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
        };
    }
    // ---- Anthropic ----
    get anthropicURL() {
        return `${this.config.baseURL ?? 'https://api.anthropic.com'}/v1/messages`;
    }
    async callAnthropic(messages, tools) {
        const { systemMsg, chatMsgs } = this.splitAnthropicMessages(messages);
        const body = {
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
        const data = await res.json();
        const content = data.content;
        const textBlocks = content.filter(c => c.type === 'text');
        const toolUseBlocks = content.filter(c => c.type === 'tool_use');
        const text = textBlocks.map(c => c.text ?? '').join('') || null;
        const toolCalls = toolUseBlocks.length > 0
            ? toolUseBlocks.map(tu => ({
                id: tu.id,
                type: 'function',
                function: {
                    name: tu.name,
                    arguments: JSON.stringify(tu.input ?? {}),
                },
            }))
            : undefined;
        const usage = data.usage;
        return {
            content: text,
            model: data.model,
            usage: usage ? {
                inputTokens: usage.input_tokens,
                outputTokens: usage.output_tokens,
            } : undefined,
            finishReason: data.stop_reason,
            toolCalls,
        };
    }
    /** Convert OpenAI-format tool def to Anthropic format. */
    toAnthropicTool(tool) {
        const f = tool.function;
        return {
            name: f.name,
            description: f.description,
            input_schema: f.parameters,
        };
    }
    /** Split messages into Anthropic format: system prompt + chat messages. */
    splitAnthropicMessages(messages) {
        const systemMsg = messages.find(m => m.role === 'system');
        const chatMsgs = [];
        const nonSystem = messages.filter(m => m.role !== 'system');
        let i = 0;
        while (i < nonSystem.length) {
            const m = nonSystem[i];
            if (m.role === 'tool') {
                // Merge consecutive tool messages into a single user message
                // — Anthropic requires all tool_results for a given assistant's
                // tool_use blocks to be in the same next user message.
                const toolResults = [];
                while (i < nonSystem.length && nonSystem[i].role === 'tool') {
                    const tm = nonSystem[i];
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
                const blocks = [];
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
            }
            else {
                chatMsgs.push({ role: m.role, content: m.content ?? '' });
            }
            i++;
        }
        return { systemMsg, chatMsgs };
    }
    async *streamAnthropic(messages) {
        const { systemMsg, chatMsgs: chatMessages } = this.splitAnthropicMessages(messages);
        const body = {
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
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: '))
                    continue;
                const data = trimmed.slice(6);
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.type === 'content_block_delta') {
                        const text = parsed.delta?.text;
                        if (text) {
                            yield { type: 'token', content: text };
                        }
                    }
                    else if (parsed.type === 'message_stop') {
                        yield { type: 'done' };
                        return;
                    }
                }
                catch {
                    // Skip unparseable
                }
            }
        }
        yield { type: 'done' };
    }
    anthropicHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01',
        };
    }
}
// ---- Helpers ----
function safeParseJSON(raw) {
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
/**
 * Create an OpenAI-compatible client from environment variables.
 * Reads OPENAI_API_KEY, OPENAI_MODEL from process.env.
 */
export function createOpenAIClient(apiKey, model) {
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
export function createAnthropicClient(apiKey, model) {
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
export function createAutoClient() {
    const anthropicKey = process.env['ANTHROPIC_API_KEY'] ?? process.env['ANTHROPIC_AUTH_TOKEN'];
    if (anthropicKey)
        return createAnthropicClient(anthropicKey);
    const openaiKey = process.env['OPENAI_API_KEY'];
    if (openaiKey)
        return createOpenAIClient(openaiKey);
    return null;
}
//# sourceMappingURL=llmClient.js.map