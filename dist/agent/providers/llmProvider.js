// ============================================================
// AI Destiny OS — Agent Layer: LLM Provider
// Handles LLM-powered responses: chat, streaming, history+memory injection.
// Implements the agentic loop: if the LLM requests tool calls, the provider
// automatically executes them and re-calls the LLM with the results.
// ============================================================
import { buildEnrichedContext, formatMemoryForPrompt } from '../../memory/contextBuilder.js';
import { toolsToOpenAIFormat } from '../tools/index.js';
import { executeTool } from '../tools/index.js';
import { DeterministicProvider } from './deterministic.js';
/** Maximum number of agentic loop iterations to prevent infinite loops. */
const MAX_TOOL_ITERATIONS = 3;
export class LLMProvider {
    llm;
    name = 'llm';
    fallback;
    toolContext;
    constructor(llm, toolContext) {
        this.llm = llm;
        this.fallback = new DeterministicProvider();
        this.toolContext = toolContext ?? null;
    }
    /** Set or update the tool context (called when memory/history changes). */
    setToolContext(ctx) {
        this.toolContext = ctx;
    }
    respond() {
        throw new Error('LLMProvider does not support sync respond; use respondAsync');
    }
    async respondAsync(topic, state, chart, prompt, history, memory) {
        const messages = this.buildMessages(prompt, state.ctx, history, memory);
        try {
            const result = await this.runAgenticLoop(messages, chart, state, topic, prompt);
            return result;
        }
        catch (err) {
            const fallback = this.fallback.respond(topic, state, chart);
            return {
                ...fallback,
                text: `[LLM调用失败: ${err instanceof Error ? err.message : '未知错误'}]\n\n${fallback.text}`,
                llmGenerated: false,
                prompt,
            };
        }
    }
    async *respondStream(topic, state, _chart, prompt, history, memory) {
        const messages = this.buildMessages(prompt, state.ctx, history, memory);
        try {
            // Run the agentic loop first (non-streaming) to resolve any tool calls.
            // We use chat() for the loop, then stream() only for the final text output.
            const resolvedMessages = await this.resolveToolCallsNonStreaming(messages);
            // Now stream the final response using the resolved message history
            let fullText = '';
            for await (const event of this.llm.stream(resolvedMessages)) {
                if (event.type === 'token' && event.content) {
                    fullText += event.content;
                    yield { type: 'token', content: event.content };
                }
                else if (event.type === 'error') {
                    yield { type: 'error', error: event.error };
                    yield { type: 'done', topic, prompt };
                    return;
                }
                else if (event.type === 'done') {
                    yield { type: 'done', topic, prompt };
                    return;
                }
            }
            yield { type: 'done', topic, prompt };
        }
        catch (err) {
            yield {
                type: 'error',
                error: err instanceof Error ? err.message : 'Unknown error',
            };
            yield { type: 'done', topic, prompt };
        }
    }
    // ---- Agentic Loop ----
    /**
     * Run the agentic loop: send messages with tools → if LLM returns tool_calls,
     * execute them and loop. Returns the final AgentResponse.
     */
    async runAgenticLoop(messages, _chart, state, topic, prompt) {
        const workingMessages = [...messages];
        const tools = this.toolContext ? toolsToOpenAIFormat() : undefined;
        let totalUsage = { inputTokens: 0, outputTokens: 0 };
        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            const result = await this.llm.chat(workingMessages, tools);
            if (result.usage) {
                totalUsage.inputTokens += result.usage.inputTokens;
                totalUsage.outputTokens += result.usage.outputTokens;
            }
            // If no tool calls, this is the final response
            if (!result.toolCalls || result.toolCalls.length === 0) {
                return {
                    text: result.content ?? '',
                    llmGenerated: true,
                    prompt,
                    topic,
                    usage: totalUsage,
                };
            }
            // Process each tool call
            const toolCallResults = await this.executeToolCalls(result.toolCalls);
            // Append assistant message with tool_calls
            workingMessages.push({
                role: 'assistant',
                content: result.content,
                tool_calls: result.toolCalls,
            });
            // Append tool result messages
            for (const tr of toolCallResults) {
                workingMessages.push({
                    role: 'tool',
                    content: tr.content,
                    tool_call_id: tr.toolCallId,
                });
            }
        }
        // Max iterations reached — return the last LLM response or a fallback
        const fallback = this.fallback.respond(topic, state, _chart);
        return {
            ...fallback,
            llmGenerated: false,
            prompt,
            usage: totalUsage,
        };
    }
    /**
     * Resolve tool calls using non-streaming chat, then return the final
     * message list ready for streaming.
     */
    async resolveToolCallsNonStreaming(messages) {
        const workingMessages = [...messages];
        const tools = this.toolContext ? toolsToOpenAIFormat() : undefined;
        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            const result = await this.llm.chat(workingMessages, tools);
            if (!result.toolCalls || result.toolCalls.length === 0) {
                // No more tool calls — the messages are ready for final streaming
                // Remove the last assistant message that contains no tool calls,
                // since we'll stream the final response instead
                return workingMessages;
            }
            // Append assistant message with tool_calls + tool results
            workingMessages.push({
                role: 'assistant',
                content: result.content,
                tool_calls: result.toolCalls,
            });
            const toolCallResults = await this.executeToolCalls(result.toolCalls);
            for (const tr of toolCallResults) {
                workingMessages.push({
                    role: 'tool',
                    content: tr.content,
                    tool_call_id: tr.toolCallId,
                });
            }
        }
        return workingMessages;
    }
    /**
     * Execute tool calls and return structured results.
     */
    async executeToolCalls(toolCalls) {
        const results = [];
        for (const tc of toolCalls) {
            if (tc.type !== 'function')
                continue;
            const fnName = tc.function.name;
            const fnArgs = safeParseJSON(tc.function.arguments) ?? {};
            if (this.toolContext) {
                try {
                    const toolResult = await executeTool(fnName, fnArgs, this.toolContext);
                    results.push({
                        toolCallId: tc.id,
                        content: toolResult
                            ? toolResult.content
                            : `工具 "${fnName}" 未找到或执行失败`,
                    });
                }
                catch (err) {
                    results.push({
                        toolCallId: tc.id,
                        content: `工具执行错误: ${err instanceof Error ? err.message : String(err)}`,
                    });
                }
            }
            else {
                results.push({
                    toolCallId: tc.id,
                    content: `无法执行工具 "${fnName}": 缺少工具上下文`,
                });
            }
        }
        return results;
    }
    // ---- Prompt Construction ----
    /** Build the LLM message array with system prompt, memory context, and conversation history. */
    buildMessages(prompt, ctx, history, memory) {
        const messages = [
            { role: 'system', content: prompt.system },
        ];
        // Inject memory context
        if (memory) {
            const enriched = buildEnrichedContext(memory, ctx);
            const memoryBlock = formatMemoryForPrompt(enriched);
            messages.push({
                role: 'user',
                content: `[用户历史背景]\n${memoryBlock}`,
            });
        }
        // Include recent conversation history for follow-up context
        const recentHistory = history.slice(-12); // last 6 turns
        for (const turn of recentHistory) {
            messages.push({
                role: turn.role === 'user' ? 'user' : 'assistant',
                content: turn.content,
            });
        }
        messages.push({ role: 'user', content: prompt.user });
        return messages;
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
//# sourceMappingURL=llmProvider.js.map