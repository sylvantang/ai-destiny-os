// ============================================================
// AI Destiny OS — Agent Layer: Barrel Exports
// ============================================================

// Agent engine
export { DestinyAgent } from './agentEngine.js';
export type {
  AgentState,
  AgentResponse,
  QueryDomain,
  ConversationTurn,
  SessionMeta,
} from './agentEngine.js';

// LLM Client
export { LLMClient, createOpenAIClient, createAnthropicClient, createDeepSeekClient, createAutoClient } from './llmClient.js';
export type {
  LLMProvider,
  LLMConfig,
  ChatMessage,
  LLMResponse,
  LLMStreamEvent,
} from './llmClient.js';

// Conversation manager
export {
  createConversation,
  processTurn,
  processTurnWithMemory,
  getSuggestionsForDomain,
  exportForLLM,
  formatTranscript,
} from './conversationManager.js';
export type {
  ConversationState,
  ConversationSummary,
  Message,
  TurnResult,
} from './conversationManager.js';
