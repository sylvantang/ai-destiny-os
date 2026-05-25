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
