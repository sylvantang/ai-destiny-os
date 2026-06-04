import type { DestinyAgent, AgentResponse, QueryDomain } from './agentEngine.js';
export interface ConversationState {
    /** The agent instance */
    agent: DestinyAgent;
    /** Quick-access computed values */
    summary: ConversationSummary;
    /** Suggested follow-up questions */
    suggestions: string[];
    /** Context window for the LLM */
    contextWindow: Message[];
}
export interface ConversationSummary {
    /** Day master summary */
    dayMaster: string;
    /** Pattern */
    pattern: string;
    /** Strength */
    strength: string;
    /** Current fortune level */
    fortuneLevel: string;
    /** Topics covered so far */
    topicsCovered: string[];
}
export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
/**
 * Create a conversation around an agent.
 */
export declare function createConversation(agent: DestinyAgent): ConversationState;
export interface TurnResult {
    response: AgentResponse;
    state: ConversationState;
}
/**
 * Process a single turn in the conversation.
 */
export declare function processTurn(state: ConversationState, input: string): TurnResult;
/**
 * Process with memory integration.
 */
export declare function processTurnWithMemory(state: ConversationState, input: string): TurnResult;
/**
 * Get suggested questions for a specific domain.
 */
export declare function getSuggestionsForDomain(domain: QueryDomain): string[];
/**
 * Export conversation as LLM-ready messages.
 */
export declare function exportForLLM(state: ConversationState): Message[];
/**
 * Format the full conversation as a readable transcript.
 */
export declare function formatTranscript(state: ConversationState): string;
//# sourceMappingURL=conversationManager.d.ts.map