import type { DestinyChart } from '../core/astro/types.js';
import type { StrengthResult } from '../core/destiny/strengthEngine.js';
import type { StructureResult } from '../core/destiny/structureEngine.js';
import type { ClimateResult } from '../core/destiny/climateEngine.js';
import type { RelationResult } from '../core/destiny/relationEngine.js';
import type { YearlyFortune } from '../core/destiny/fortuneEngine.js';
export interface UserProfile {
    id: string;
    createdAt: string;
    updatedAt: string;
    birthInfo: {
        year: number;
        month: number;
        day: number;
        hour: number;
        minute: number;
        longitude: number;
        isDST: boolean;
        gender: '男' | '女';
        city?: string;
    };
    /** Cached chart for quick access */
    chart: DestinyChart | null;
    /** Analysis snapshots */
    analysis: {
        strength: StrengthResult | null;
        structure: StructureResult | null;
        climate: ClimateResult | null;
        relations: RelationResult | null;
    };
    /** User-provided tags/interests */
    tags: string[];
    /** Life themes the user cares about */
    focusAreas: LifeDomain[];
}
export type LifeDomain = '事业' | '财富' | '感情' | '健康' | '学业' | '家庭' | '迁徙' | '其他';
export type EventImpact = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;
export interface LifeEvent {
    id: string;
    date: string;
    domain: LifeDomain;
    title: string;
    description: string;
    impact: EventImpact;
    /** The year pillar at the time of the event */
    yearPillar?: string;
    /** The current DaYun at the time */
    dayunAtTime?: string;
    /** Related prediction IDs */
    relatedPredictionIds: string[];
    /** User notes */
    notes: string;
    tags: string[];
}
export interface Prediction {
    id: string;
    createdAt: string;
    targetYear: number;
    domain: LifeDomain;
    /** What was predicted */
    predicted: string;
    /** Predicted score at the time (0-100) */
    predictedScore: number;
    /** Was this verified by the user? */
    verified: boolean;
    /** What actually happened (user-provided) */
    actualOutcome: string | null;
    /** User's accuracy rating (-2 = completely wrong, 2 = spot on) */
    accuracyRating: -2 | -1 | 0 | 1 | 2 | null;
    /** When the outcome was recorded */
    verifiedAt: string | null;
}
export interface YearlyRecord {
    year: number;
    /** Fortune predictions at the time */
    fortune: YearlyFortune | null;
    /** Events that happened in this year */
    events: LifeEvent[];
    /** Predictions made for this year */
    predictions: Prediction[];
    /** User's overall rating for the year (1-10) */
    overallRating: number | null;
    /** User's notes about the year */
    notes: string;
}
export interface MemorySnapshot {
    /** Schema version for migrations */
    version: number;
    user: UserProfile;
    /** All life events, sorted by date */
    events: LifeEvent[];
    /** Yearly records keyed by year */
    yearlyRecords: Record<number, YearlyRecord>;
    /** All predictions */
    predictions: Prediction[];
    /** Summary statistics */
    stats: MemoryStats;
}
export interface MemoryStats {
    totalEvents: number;
    totalPredictions: number;
    verifiedPredictions: number;
    /** Average accuracy (-2 to 2) */
    averageAccuracy: number;
    /** Most accurate domain */
    bestDomain: LifeDomain | null;
    /** Domain counts */
    domainDistribution: Record<LifeDomain, number>;
    /** Years covered */
    yearRange: [number, number] | null;
}
export interface MemoryContext {
    /** Recent significant events */
    recentEvents: LifeEvent[];
    /** Pattern summary over time */
    patterns: LifePattern[];
    /** Prediction accuracy summary */
    predictionAccuracy: AccuracySummary;
    /** The user's current life phase based on history */
    currentLifePhase: string;
}
export interface LifePattern {
    domain: LifeDomain;
    description: string;
    /** Years when this pattern was observed */
    observedYears: number[];
    confidence: number;
}
export interface AccuracySummary {
    overall: number;
    byDomain: Partial<Record<LifeDomain, number>>;
    totalVerified: number;
    trend: 'improving' | 'stable' | 'declining';
}
//# sourceMappingURL=types.d.ts.map