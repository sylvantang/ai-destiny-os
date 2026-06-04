import type { MemoryStore } from '../memory/memoryStore.js';
import type { LifeDomain } from '../memory/types.js';
/**
 * Render the full life timeline with events and predictions.
 */
export declare function renderLifeTimeline(store: MemoryStore): string;
/**
 * Render prediction accuracy dashboard.
 */
export declare function renderAccuracyReport(store: MemoryStore): string;
/**
 * Render detected life patterns.
 */
export declare function renderPatterns(store: MemoryStore): string;
/**
 * Render a list of events filtered by domain.
 */
export declare function renderEventsByDomain(store: MemoryStore, domain: LifeDomain): string;
/**
 * Render pending verifications.
 */
export declare function renderPendingVerifications(store: MemoryStore): string;
/**
 * Render all memory views as a combined report.
 */
export declare function renderMemoryViews(store: MemoryStore): string;
//# sourceMappingURL=memoryViews.d.ts.map