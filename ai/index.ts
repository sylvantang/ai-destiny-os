// ============================================================
// AI Destiny OS — AI Layer: Public API
// ============================================================

// Prompt Builder (core)
export type { PromptContext, AIPrompt } from './promptBuilder.js';
export {
  buildReportCard,
  buildComprehensivePrompt,
  buildPersonalityPrompt,
  buildCareerPrompt,
  buildRelationshipPrompt,
  buildStrategyPrompt,
  buildYearlyFortunePrompt,
} from './promptBuilder.js';

// Personality
export type { PersonalityResult } from './personality.js';
export { analyzePersonality } from './personality.js';

// Career
export type { CareerResult, IndustryRecommendation } from './career.js';
export { analyzeCareer } from './career.js';

// Relationship
export type { RelationshipResult } from './relationship.js';
export { analyzeRelationship } from './relationship.js';

// Strategy
export type {
  StrategyResult,
  LocationAdvice,
  LifePhase,
  ActionPlan,
  ActionItem,
} from './strategy.js';
export { analyzeStrategy } from './strategy.js';
