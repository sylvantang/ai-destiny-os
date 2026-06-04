import type { LifeEvent, LifeDomain, EventImpact, LifePattern, MemoryContext } from './types.js';
import type { MemoryStore } from './memoryStore.js';
/**
 * Track a major life event and categorize it.
 */
export declare function trackEvent(store: MemoryStore, params: {
    date: string;
    domain: LifeDomain;
    title: string;
    description: string;
    impact: EventImpact;
    yearPillar?: string;
    dayunAtTime?: string;
    notes?: string;
    tags?: string[];
}): LifeEvent;
/**
 * Get the user's life timeline as a chronological narrative.
 */
export declare function getLifeTimeline(store: MemoryStore): {
    year: number;
    events: LifeEvent[];
    summary: string;
}[];
/**
 * Detect patterns in life events over time.
 */
export declare function detectPatterns(store: MemoryStore): LifePattern[];
/**
 * Assess the user's current life phase based on event history.
 */
export declare function assessCurrentPhase(store: MemoryStore): string;
/**
 * Build the memory context for AI prompt enrichment.
 */
export declare function buildMemoryContext(store: MemoryStore): MemoryContext;
//# sourceMappingURL=eventTracker.d.ts.map