import type { MemoryStore } from '../../memory/memoryStore.js';
import type { AIPrompt } from '../../ai/promptBuilder.js';
import type { QueryDomain, AgentResponse, ConversationTurn } from '../agentEngine.js';
import type { LLMClient } from '../llmClient.js';
import type { ToolContext } from '../tools/types.js';
import type { ProviderState, StreamEvent, ResponseProvider } from './types.js';
export declare class LLMProvider implements ResponseProvider {
    private llm;
    readonly name = "llm";
    private fallback;
    private toolContext;
    constructor(llm: LLMClient, toolContext?: ToolContext);
    /** Set or update the tool context (called when memory/history changes). */
    setToolContext(ctx: ToolContext): void;
    respond(): AgentResponse;
    respondAsync(topic: QueryDomain, state: ProviderState, chart: import('../../core/astro/types.js').DestinyChart, prompt: AIPrompt, history: ConversationTurn[], memory: MemoryStore | null): Promise<AgentResponse>;
    respondStream(topic: QueryDomain, state: ProviderState, _chart: import('../../core/astro/types.js').DestinyChart, prompt: AIPrompt, history: ConversationTurn[], memory: MemoryStore | null): AsyncGenerator<StreamEvent>;
    /**
     * Run the agentic loop: send messages with tools → if LLM returns tool_calls,
     * execute them and loop. Returns the final AgentResponse.
     */
    private runAgenticLoop;
    /**
     * Resolve tool calls using non-streaming chat, then return the final
     * message list ready for streaming.
     */
    private resolveToolCallsNonStreaming;
    /**
     * Execute tool calls and return structured results.
     */
    private executeToolCalls;
    /** Build the LLM message array with system prompt, memory context, and conversation history. */
    private buildMessages;
}
//# sourceMappingURL=llmProvider.d.ts.map