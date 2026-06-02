// ============================================================
// AI Destiny OS — Agent Layer: Provider Types
// ============================================================

import type { DestinyChart } from '../../core/astro/types.js';
import type { PromptContext, AIPrompt } from '../../ai/promptBuilder.js';
import type { PersonalityResult } from '../../ai/personality.js';
import type { CareerResult } from '../../ai/career.js';
import type { RelationshipResult } from '../../ai/relationship.js';
import type { StrategyResult } from '../../ai/strategy.js';
import type { QueryDomain, AgentResponse } from '../agentEngine.js';

/** Context passed to providers for response generation */
export interface ProviderState {
  chart: DestinyChart;
  ctx: PromptContext;
  personality: PersonalityResult;
  career: CareerResult;
  relationship: RelationshipResult;
  strategy: StrategyResult;
}

/** Event yielded during streaming */
export interface StreamEvent {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
  topic?: QueryDomain;
  prompt?: AIPrompt;
}

export interface ResponseProvider {
  readonly name: string;
  /** Build a synchronous AgentResponse for the given topic */
  respond(topic: QueryDomain, state: ProviderState, chart: DestinyChart, prompt?: AIPrompt | null): AgentResponse;
}
