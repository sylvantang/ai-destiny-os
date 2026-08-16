// ============================================================
// AI Destiny OS — Memory Layer: Barrel Exports
// ============================================================

// Types
export type {
  UserProfile,
  LifeEvent,
  LifeDomain,
  EventImpact,
  Prediction,
  YearlyRecord,
  MemorySnapshot,
  MemoryStats,
  MemoryContext,
  LifePattern,
  AccuracySummary,
} from './types.js';

// Storage
export { MemoryStore } from './memoryStore.js';

// Event tracking
export {
  trackEvent,
  getLifeTimeline,
  detectPatterns,
  assessCurrentPhase,
  buildMemoryContext,
} from './eventTracker.js';

// Event ↔ 大运/流年 context（P2）
export {
  computeEventContext,
  addEventWithContext,
  chartOf,
} from './eventContext.js';
export type { EventContext } from './eventContext.js';

// Proactive alerts（P2）
export {
  checkLifeAlerts,
  formatAlerts,
} from './alerts.js';
export type { LifeAlert } from './alerts.js';

// Prediction tracking
export {
  logPrediction,
  logYearlyPredictions,
  verifyPrediction,
  verifyYearPredictions,
  getAccuracyReport,
  getDueVerifications,
  getActivePredictions,
} from './predictionTracker.js';

// Context building (bridge to AI layer)
export {
  buildEnrichedContext,
  formatMemoryForPrompt,
  buildPersonalizedOverlay,
  suggestToneAdjustment,
} from './contextBuilder.js';

export type { MemoryEnrichedContext } from './contextBuilder.js';
