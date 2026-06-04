import type { Prediction, LifeDomain } from './types.js';
import type { MemoryStore } from './memoryStore.js';
import type { YearlyFortune } from '../core/destiny/fortuneEngine.js';
/**
 * Log a prediction for future verification.
 */
export declare function logPrediction(store: MemoryStore, params: {
    targetYear: number;
    domain: LifeDomain;
    predicted: string;
    predictedScore: number;
}): Prediction;
/**
 * Log multiple predictions for a year from fortune analysis.
 */
export declare function logYearlyPredictions(store: MemoryStore, year: number, yearlyFortune: YearlyFortune | null): Prediction[];
/**
 * Verify a past prediction with actual outcome.
 */
export declare function verifyPrediction(store: MemoryStore, predictionId: string, actualOutcome: string, accuracyRating: -2 | -1 | 0 | 1 | 2): Prediction | null;
/**
 * Batch verify all predictions for a given year.
 */
export declare function verifyYearPredictions(store: MemoryStore, year: number, outcomes: {
    domain: LifeDomain;
    actual: string;
    rating: -2 | -1 | 0 | 1 | 2;
}[]): Prediction[];
/**
 * Get prediction accuracy report.
 */
export declare function getAccuracyReport(store: MemoryStore): {
    overall: number;
    byDomain: Record<string, number>;
    byYear: Record<number, number>;
    totalVerified: number;
    totalUnverified: number;
    mostAccurateDomain: string;
    leastAccurateDomain: string;
};
/**
 * Check which predictions are due for verification (past years).
 */
export declare function getDueVerifications(store: MemoryStore): Prediction[];
/**
 * Get predictions for the current and upcoming year.
 */
export declare function getActivePredictions(store: MemoryStore): Prediction[];
//# sourceMappingURL=predictionTracker.d.ts.map