// ============================================================
// AI Destiny OS — Memory Layer: Test Suite
// ============================================================

import { describe, it, expect } from 'vitest';
import { MemoryStore } from '../memoryStore.js';
import { trackEvent, getLifeTimeline, detectPatterns, assessCurrentPhase, buildMemoryContext } from '../eventTracker.js';
import { logPrediction, logYearlyPredictions, verifyPrediction, verifyYearPredictions, getAccuracyReport, getDueVerifications, getActivePredictions } from '../predictionTracker.js';
import { buildEnrichedContext, formatMemoryForPrompt, buildPersonalizedOverlay, suggestToneAdjustment } from '../contextBuilder.js';
import type { PromptContext } from '../../ai/promptBuilder.js';
import type { BirthInfo, DestinyChart } from '../../core/astro/types.js';

function createTestStore(): MemoryStore {
  const birth: BirthInfo = {
    year: 1993, month: 7, day: 23, hour: 9, minute: 30,
    longitude: 116.4, isDST: false, gender: '男',
  };
  return new MemoryStore('test-user-1', birth);
}

function createMockPromptContext(): PromptContext {
  return {
    chart: { dayMasterWuxing: '木', dayMaster: { name: '乙', wuxing: '木', yinYang: '阴' } } as unknown as DestinyChart,
    strength: { strengthScore: 45, level: '偏弱', breakdown: { monthOrder: 5, roots: 15, stemSupport: 10, branchSupport: 8, weakening: -2 }, analysis: '' },
    structure: { primaryPattern: '偏财格', isSpecial: false, isFavorable: true, analysis: '' },
    climate: { needsAdjustment: false, neededWuxing: null, adjustment: '无需调候', analysis: '' },
    relations: { favorableCombos: [], unfavorableCombos: [], analysis: '' },
    fortune: { overall: { score: 70, level: '上升', bestDimension: '事业', riskDimension: '健康' }, yearlyAnalysis: [] },
  };
}

// ---- MemoryStore Tests ----

describe('MemoryStore', () => {
  it('should create a store with default empty snapshot', () => {
    const store = createTestStore();
    const snap = store.getSnapshot();

    expect(snap.version).toBe(1);
    expect(snap.user.id).toBe('test-user-1');
    expect(snap.events).toHaveLength(0);
    expect(snap.predictions).toHaveLength(0);
    expect(Object.keys(snap.yearlyRecords)).toHaveLength(0);
  });

  it('should serialize and deserialize from JSON', () => {
    const store = createTestStore();
    trackEvent(store, {
      date: '2025-01-15',
      domain: '事业',
      title: '换工作',
      description: '从A公司换到B公司',
      impact: 4,
    });

    const json = store.toJSON();
    const restored = MemoryStore.fromJSON(json);

    expect(restored.getSnapshot().events).toHaveLength(1);
    expect(restored.getSnapshot().events[0]!.title).toBe('换工作');
  });

  it('should track dirty state', () => {
    const store = createTestStore();
    expect(store.isDirty()).toBe(false);

    trackEvent(store, { date: '2025-01-15', domain: '事业', title: 'Test', description: '', impact: 0 });
    expect(store.isDirty()).toBe(true);

    store.markClean();
    expect(store.isDirty()).toBe(false);
  });

  it('should recompute stats after adding events', () => {
    const store = createTestStore();
    trackEvent(store, { date: '2025-01-15', domain: '事业', title: 'E1', description: '', impact: 3 });
    trackEvent(store, { date: '2025-03-20', domain: '财富', title: 'E2', description: '', impact: -2 });

    const stats = store.getStats();
    expect(stats.totalEvents).toBe(2);
    expect(stats.bestDomain).toBe('事业');
    expect(stats.yearRange).toEqual([2025, 2025]);
  });
});

// ---- Event Tracker Tests ----

describe('Event Tracker', () => {
  it('should track an event and return it with an ID', () => {
    const store = createTestStore();
    const event = trackEvent(store, {
      date: '2025-06-15',
      domain: '事业',
      title: '晋升',
      description: '升职为高级工程师',
      impact: 5,
    });

    expect(event.id).toMatch(/^evt_/);
    expect(event.title).toBe('晋升');
    expect(event.impact).toBe(5);
  });

  it('should build a life timeline grouped by year', () => {
    const store = createTestStore();
    trackEvent(store, { date: '2020-03-01', domain: '事业', title: '毕业入职', description: '', impact: 3 });
    trackEvent(store, { date: '2020-09-15', domain: '感情', title: '恋爱', description: '', impact: 4 });
    trackEvent(store, { date: '2022-06-01', domain: '事业', title: '跳槽', description: '', impact: 3 });

    const timeline = getLifeTimeline(store);
    expect(timeline).toHaveLength(2); // 2020 and 2022
    expect(timeline[0]!.year).toBe(2020);
    expect(timeline[0]!.events).toHaveLength(2);
    expect(timeline[1]!.year).toBe(2022);
  });

  it('should detect periodicity patterns', () => {
    const store = createTestStore();
    // Events every ~3 years
    for (const year of [2015, 2018, 2021, 2024]) {
      trackEvent(store, { date: `${year}-05-01`, domain: '事业', title: `Career change ${year}`, description: '', impact: 4 });
    }

    const patterns = detectPatterns(store);
    const periodic = patterns.find(p => p.description.includes('每'));
    expect(periodic).toBeDefined();
    if (periodic) {
      expect(Math.round(periodic.confidence * 10)).toBeGreaterThanOrEqual(0);
    }
  });

  it('should detect positive impact trends', () => {
    const store = createTestStore();
    for (const year of [2020, 2021, 2022, 2023]) {
      trackEvent(store, { date: `${year}-03-01`, domain: '财富', title: `Good ${year}`, description: '', impact: 3 });
    }

    const patterns = detectPatterns(store);
    const positive = patterns.find(p => p.description.includes('向好'));
    expect(positive).toBeDefined();
  });

  it('should assess current life phase', () => {
    const store = createTestStore();
    trackEvent(store, { date: '2025-01-01', domain: '事业', title: 'Job', description: '', impact: 4 });
    trackEvent(store, { date: '2025-02-01', domain: '财富', title: 'Money', description: '', impact: 3 });

    const phase = assessCurrentPhase(store);
    expect(phase.length).toBeGreaterThan(0);
  });
});

// ---- Prediction Tracker Tests ----

describe('Prediction Tracker', () => {
  it('should log a prediction', () => {
    const store = createTestStore();
    const pred = logPrediction(store, {
      targetYear: 2025,
      domain: '事业',
      predicted: '事业上升',
      predictedScore: 75,
    });

    expect(pred.id).toMatch(/^pred_/);
    expect(pred.verified).toBe(false);
    expect(pred.actualOutcome).toBeNull();
  });

  it('should verify a prediction', () => {
    const store = createTestStore();
    const pred = logPrediction(store, {
      targetYear: 2024,
      domain: '事业',
      predicted: '晋升',
      predictedScore: 80,
    });

    const verified = verifyPrediction(store, pred.id, '确实晋升了', 1);
    expect(verified).not.toBeNull();
    expect(verified!.verified).toBe(true);
    expect(verified!.accuracyRating).toBe(1);
    expect(verified!.verifiedAt).not.toBeNull();
  });

  it('should batch verify predictions by year', () => {
    const store = createTestStore();
    logPrediction(store, { targetYear: 2023, domain: '事业', predicted: '好', predictedScore: 80 });
    logPrediction(store, { targetYear: 2023, domain: '财富', predicted: '中', predictedScore: 60 });

    const results = verifyYearPredictions(store, 2023, [
      { domain: '事业', actual: '确实好', rating: 2 as const },
      { domain: '财富', actual: '一般', rating: 0 as const },
    ]);

    expect(results).toHaveLength(2);
  });

  it('should generate accuracy report', () => {
    const store = createTestStore();
    const p1 = logPrediction(store, { targetYear: 2023, domain: '事业', predicted: 'A', predictedScore: 80 });
    const p2 = logPrediction(store, { targetYear: 2023, domain: '财富', predicted: 'B', predictedScore: 60 });

    verifyPrediction(store, p1.id, 'Good', 2);
    verifyPrediction(store, p2.id, 'OK', 0);

    const report = getAccuracyReport(store);
    expect(report.totalVerified).toBe(2);
    expect(report.totalUnverified).toBe(0);
    expect(report.mostAccurateDomain).toBeDefined();
  });

  it('should find due verifications for past years', () => {
    const store = createTestStore();
    logPrediction(store, { targetYear: 2020, domain: '事业', predicted: 'Old', predictedScore: 50 });
    logPrediction(store, { targetYear: 2030, domain: '财富', predicted: 'Future', predictedScore: 70 });

    const due = getDueVerifications(store);
    expect(due).toHaveLength(1);
    expect(due[0]!.targetYear).toBe(2020);
  });

  it('should find active predictions for current/future years', () => {
    const store = createTestStore();
    logPrediction(store, { targetYear: 2020, domain: '事业', predicted: 'Old', predictedScore: 50 });

    const active = getActivePredictions(store);
    const currentYear = new Date().getFullYear();
    for (const p of active) {
      expect(p.targetYear).toBeGreaterThanOrEqual(currentYear);
    }
  });
});

// ---- Context Builder Tests ----

describe('Context Builder', () => {
  it('should build enriched context from store and prompt context', () => {
    const store = createTestStore();
    const base = createMockPromptContext();

    trackEvent(store, { date: '2025-01-01', domain: '事业', title: 'Test', description: '', impact: 3 });
    logPrediction(store, { targetYear: 2025, domain: '事业', predicted: 'Good', predictedScore: 80 });

    const enriched = buildEnrichedContext(store, base);
    expect(enriched.base).toBe(base);
    expect(enriched.memory.recentEvents).toHaveLength(1);
    expect(enriched.accuracy).toBeDefined();
  });

  it('should format memory for prompt as a string', () => {
    const store = createTestStore();
    const base = createMockPromptContext();

    trackEvent(store, { date: '2025-01-01', domain: '事业', title: '换工作', description: '', impact: 4 });
    const enriched = buildEnrichedContext(store, base);

    const formatted = formatMemoryForPrompt(enriched);
    expect(formatted).toContain('当前人生阶段');
    expect(formatted).toContain('换工作');
    expect(formatted).toContain('预测准确性');
  });

  it('should build personalized overlay', () => {
    const store = createTestStore();
    trackEvent(store, { date: '2025-01-01', domain: '事业', title: 'E1', description: '', impact: 3 });

    const overlay = buildPersonalizedOverlay(store);
    expect(overlay).toContain('1个生活事件');
    expect(overlay).toContain('事业');
  });

  it('should suggest tone adjustments', () => {
    const store = createTestStore();
    // No data → balanced
    expect(suggestToneAdjustment(store)).toBe('balanced');

    // Add negative events
    trackEvent(store, { date: '2025-01-01', domain: '事业', title: 'Job loss', description: '', impact: -4 });
    trackEvent(store, { date: '2025-02-01', domain: '财富', title: 'Loss', description: '', impact: -3 });
    trackEvent(store, { date: '2025-03-01', domain: '健康', title: 'Illness', description: '', impact: -2 });

    expect(suggestToneAdjustment(store)).toBe('encouraging');
  });
});
