// ============================================================
// AI Destiny OS — Memory Layer: Prediction Tracker
// Track predictions vs actual outcomes to improve accuracy.
// ============================================================

import type { Prediction, LifeDomain } from './types.js';
import type { MemoryStore } from './memoryStore.js';
import type { YearlyFortune } from '../core/destiny/fortuneEngine.js';

/**
 * Log a prediction for future verification.
 */
export function logPrediction(
  store: MemoryStore,
  params: {
    targetYear: number;
    domain: LifeDomain;
    predicted: string;
    predictedScore: number;
  },
): Prediction {
  return store.addPrediction({
    createdAt: new Date().toISOString(),
    targetYear: params.targetYear,
    domain: params.domain,
    predicted: params.predicted,
    predictedScore: params.predictedScore,
    verified: false,
    actualOutcome: null,
    accuracyRating: null,
    verifiedAt: null,
  });
}

/**
 * Log multiple predictions for a year from fortune analysis.
 */
export function logYearlyPredictions(
  store: MemoryStore,
  year: number,
  yearlyFortune: YearlyFortune | null,
): Prediction[] {
  if (!yearlyFortune) return [];

  const predictions: Prediction[] = [];

  const dimensions: [LifeDomain, number, string][] = [
    ['事业', yearlyFortune.career, `事业运势得分${yearlyFortune.career}`],
    ['财富', yearlyFortune.wealth, `财富运势得分${yearlyFortune.wealth}`],
    ['感情', yearlyFortune.relationship, `感情运势得分${yearlyFortune.relationship}`],
    ['健康', yearlyFortune.health, `健康运势得分${yearlyFortune.health}`],
  ];

  for (const [domain, score, desc] of dimensions) {
    predictions.push(logPrediction(store, {
      targetYear: year,
      domain,
      predicted: desc,
      predictedScore: score,
    }));
  }

  // Also save to yearly record
  store.setYearlyFortune(year, yearlyFortune);

  return predictions;
}

/**
 * Verify a past prediction with actual outcome.
 */
export function verifyPrediction(
  store: MemoryStore,
  predictionId: string,
  actualOutcome: string,
  accuracyRating: -2 | -1 | 0 | 1 | 2,
): Prediction | null {
  return store.verifyPrediction(predictionId, actualOutcome, accuracyRating);
}

/**
 * Batch verify all predictions for a given year.
 */
export function verifyYearPredictions(
  store: MemoryStore,
  year: number,
  outcomes: { domain: LifeDomain; actual: string; rating: -2 | -1 | 0 | 1 | 2 }[],
): Prediction[] {
  const predictions = store.getPredictionsByYear(year).filter(p => !p.verified);
  const results: Prediction[] = [];

  for (const pred of predictions) {
    const outcome = outcomes.find(o => o.domain === pred.domain);
    if (outcome) {
      const result = store.verifyPrediction(pred.id, outcome.actual, outcome.rating);
      if (result) results.push(result);
    }
  }

  return results;
}

/**
 * Get prediction accuracy report.
 */
export function getAccuracyReport(store: MemoryStore): {
  overall: number;
  byDomain: Record<string, number>;
  byYear: Record<number, number>;
  totalVerified: number;
  totalUnverified: number;
  mostAccurateDomain: string;
  leastAccurateDomain: string;
} {
  const predictions = store.getSnapshot().predictions;
  const verified = predictions.filter(p => p.verified && p.accuracyRating !== null);

  // By domain
  const byDomainMap = new Map<LifeDomain, number[]>();
  for (const p of verified) {
    if (!byDomainMap.has(p.domain)) byDomainMap.set(p.domain, []);
    byDomainMap.get(p.domain)!.push(p.accuracyRating!);
  }

  const byDomain: Record<string, number> = {};
  for (const [domain, ratings] of byDomainMap) {
    byDomain[domain] = Math.round(ratings.reduce((s, r) => s + r, 0) / ratings.length * 100) / 100;
  }

  // By year
  const byYearMap = new Map<number, number[]>();
  for (const p of verified) {
    if (!byYearMap.has(p.targetYear)) byYearMap.set(p.targetYear, []);
    byYearMap.get(p.targetYear)!.push(p.accuracyRating!);
  }

  const byYear: Record<number, number> = {};
  for (const [year, ratings] of byYearMap) {
    byYear[year] = Math.round(ratings.reduce((s, r) => s + r, 0) / ratings.length * 100) / 100;
  }

  // Overall
  const overall = verified.length > 0
    ? Math.round(verified.reduce((s, p) => s + (p.accuracyRating ?? 0), 0) / verified.length * 100) / 100
    : 0;

  // Best/worst domains
  let mostAccurateDomain = 'N/A';
  let leastAccurateDomain = 'N/A';
  let bestScore = -Infinity;
  let worstScore = Infinity;

  for (const [domain, score] of Object.entries(byDomain)) {
    if (score > bestScore) { bestScore = score; mostAccurateDomain = domain; }
    if (score < worstScore) { worstScore = score; leastAccurateDomain = domain; }
  }

  return {
    overall,
    byDomain,
    byYear,
    totalVerified: verified.length,
    totalUnverified: predictions.length - verified.length,
    mostAccurateDomain,
    leastAccurateDomain,
  };
}

/**
 * Check which predictions are due for verification (past years).
 */
export function getDueVerifications(store: MemoryStore): Prediction[] {
  const now = new Date();
  const currentYear = now.getFullYear();

  return store.getSnapshot().predictions.filter(
    p => !p.verified && p.targetYear < currentYear,
  );
}

/**
 * Get predictions for the current and upcoming year.
 */
export function getActivePredictions(store: MemoryStore): Prediction[] {
  const currentYear = new Date().getFullYear();
  return store.getSnapshot().predictions.filter(
    p => !p.verified && p.targetYear >= currentYear,
  );
}
