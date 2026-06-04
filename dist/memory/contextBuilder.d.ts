import type { MemoryContext } from './types.js';
import type { MemoryStore } from './memoryStore.js';
import { getAccuracyReport, getDueVerifications, getActivePredictions } from './predictionTracker.js';
import type { PromptContext } from '../ai/promptBuilder.js';
/**
 * Extended prompt context that includes memory data.
 */
export interface MemoryEnrichedContext {
    /** Original deterministic analysis context */
    base: PromptContext;
    /** Memory layer data */
    memory: MemoryContext;
    /** Accuracy report */
    accuracy: ReturnType<typeof getAccuracyReport>;
    /** Predictions needing verification */
    dueVerifications: ReturnType<typeof getDueVerifications>;
    /** Active (current/future) predictions */
    activePredictions: ReturnType<typeof getActivePredictions>;
}
/**
 * Build a memory-enriched context by combining deterministic analysis
 * with the user's personal history.
 */
export declare function buildEnrichedContext(store: MemoryStore, base: PromptContext): MemoryEnrichedContext;
/**
 * Format memory context as a structured text block for LLM prompts.
 */
export declare function formatMemoryForPrompt(ctx: MemoryEnrichedContext): string;
/**
 * Build a personalized system prompt overlay based on user history.
 */
export declare function buildPersonalizedOverlay(store: MemoryStore): string;
/**
 * Suggest memory-guided adjustments to AI interpretation tone.
 */
export declare function suggestToneAdjustment(store: MemoryStore): 'encouraging' | 'balanced' | 'cautionary';
//# sourceMappingURL=contextBuilder.d.ts.map