// ============================================================
// AI Destiny OS — Memory Layer: Event Tracker
// Life event categorization, timeline analysis, pattern detection.
// ============================================================

import type {
  LifeEvent, LifeDomain, EventImpact,
  LifePattern, MemoryContext, AccuracySummary,
} from './types.js';
import type { MemoryStore } from './memoryStore.js';

/**
 * Track a major life event and categorize it.
 */
export function trackEvent(
  store: MemoryStore,
  params: {
    date: string;
    domain: LifeDomain;
    title: string;
    description: string;
    impact: EventImpact;
    yearPillar?: string;
    dayunAtTime?: string;
    notes?: string;
    tags?: string[];
  },
): LifeEvent {
  return store.addEvent({
    date: params.date,
    domain: params.domain,
    title: params.title,
    description: params.description,
    impact: params.impact,
    yearPillar: params.yearPillar,
    dayunAtTime: params.dayunAtTime,
    relatedPredictionIds: [],
    notes: params.notes ?? '',
    tags: params.tags ?? [],
  });
}

/**
 * Get the user's life timeline as a chronological narrative.
 */
export function getLifeTimeline(
  store: MemoryStore,
): { year: number; events: LifeEvent[]; summary: string }[] {
  const events = store.getTimeline();
  const byYear = new Map<number, LifeEvent[]>();

  for (const e of events) {
    const year = new Date(e.date).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(e);
  }

  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, yrEvents]) => ({
      year,
      events: yrEvents,
      summary: summarizeYear(year, yrEvents),
    }));
}

function summarizeYear(year: number, events: LifeEvent[]): string {
  if (events.length === 0) return `${year}年：无记录事件`;

  const highlights = events
    .filter(e => Math.abs(e.impact) >= 3)
    .map(e => `${e.impact > 0 ? '✓' : '✗'} ${e.title}`);

  if (highlights.length > 0) {
    return `${year}年：${highlights.join('；')}`;
  }

  const first = events[0]!;
  return `${year}年：${first.title}等${events.length}件事件`;
}

/**
 * Detect patterns in life events over time.
 */
export function detectPatterns(store: MemoryStore): LifePattern[] {
  const events = store.getTimeline();
  if (events.length < 2) return [];

  const patterns: LifePattern[] = [];
  const byDomain = groupByDomain(events);

  for (const [domain, domainEvents] of byDomain) {
    if (domainEvents.length < 2) continue;

    const years = domainEvents.map(e => new Date(e.date).getFullYear());

    // Detect periodicity (events every N years)
    if (years.length >= 3) {
      const gaps = [];
      for (let i = 1; i < years.length; i++) {
        gaps.push(years[i]! - years[i - 1]!);
      }
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      const consistent = gaps.every(g => Math.abs(g - avgGap) <= 2);

      if (consistent && avgGap >= 2) {
        patterns.push({
          domain,
          description: `${domainDomainLabel(domain)}约每${Math.round(avgGap)}年出现重要变化`,
          observedYears: years,
          confidence: Math.min(0.9, gaps.length / 5),
        });
      }
    }

    // Detect impact trend (improving or worsening)
    const impacts = domainEvents.map(e => e.impact);
    const positiveCount = impacts.filter(i => i > 0).length;
    const ratio = positiveCount / impacts.length;

    if (ratio >= 0.8) {
      patterns.push({
        domain,
        description: `${domainDomainLabel(domain)}连续向好`,
        observedYears: years,
        confidence: ratio,
      });
    } else if (ratio <= 0.2) {
      patterns.push({
        domain,
        description: `${domainDomainLabel(domain)}近期需关注`,
        observedYears: years,
        confidence: 1 - ratio,
      });
    }
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

function groupByDomain(events: LifeEvent[]): Map<LifeDomain, LifeEvent[]> {
  const map = new Map<LifeDomain, LifeEvent[]>();
  for (const e of events) {
    if (!map.has(e.domain)) map.set(e.domain, []);
    map.get(e.domain)!.push(e);
  }
  return map;
}

function domainDomainLabel(d: LifeDomain): string {
  const labels: Record<LifeDomain, string> = {
    '事业': '事业发展', '财富': '财富状况', '感情': '感情生活',
    '健康': '健康状况', '学业': '学业进展', '家庭': '家庭状况',
    '迁徙': '居住变迁', '其他': '生活变化',
  };
  return labels[d] ?? d;
}

/**
 * Assess the user's current life phase based on event history.
 */
export function assessCurrentPhase(store: MemoryStore): string {
  const recent = store.getRecentEvents(8);
  if (recent.length === 0) return '数据积累期 — 尚未有足够的生活事件记录';

  const positiveCount = recent.filter(e => e.impact > 0).length;
  const negativeCount = recent.filter(e => e.impact < 0).length;
  const domains = new Set(recent.map(e => e.domain));

  if (domains.has('事业') && domains.has('财富') && positiveCount > negativeCount) {
    return '事业上升期 — 多领域积极发展';
  }
  if (domains.has('感情') && domains.has('家庭')) {
    return '家庭建设期 — 关注情感和家庭发展';
  }
  if (negativeCount > positiveCount) {
    return '调整过渡期 — 面对挑战，积累经验';
  }
  if (domains.has('迁徙') || domains.has('学业')) {
    return '转型探索期 — 环境或方向在变化中';
  }

  return '平稳发展期 — 生活在稳步推进中';
}

/**
 * Build the memory context for AI prompt enrichment.
 */
export function buildMemoryContext(store: MemoryStore): MemoryContext {
  const recentEvents = store.getRecentEvents(8);
  const patterns = detectPatterns(store);
  const stats = store.getStats();

  // Prediction accuracy
  const accuracySummary: AccuracySummary = {
    overall: stats.averageAccuracy,
    byDomain: computeAccuracyByDomain(store),
    totalVerified: stats.verifiedPredictions,
    trend: computeAccuracyTrend(store),
  };

  const currentLifePhase = assessCurrentPhase(store);

  return {
    recentEvents,
    patterns,
    predictionAccuracy: accuracySummary,
    currentLifePhase,
  };
}

function computeAccuracyByDomain(
  store: MemoryStore,
): Partial<Record<LifeDomain, number>> {
  const byDomain = new Map<LifeDomain, number[]>();

  for (const p of store.getSnapshot().predictions) {
    if (p.verified && p.accuracyRating !== null) {
      if (!byDomain.has(p.domain)) byDomain.set(p.domain, []);
      byDomain.get(p.domain)!.push(p.accuracyRating);
    }
  }

  const result: Partial<Record<LifeDomain, number>> = {};
  for (const [domain, ratings] of byDomain) {
    result[domain] = ratings.reduce((s, r) => s + r, 0) / ratings.length;
  }
  return result;
}

function computeAccuracyTrend(store: MemoryStore): 'improving' | 'stable' | 'declining' {
  const verified = store.getSnapshot().predictions
    .filter(p => p.verified && p.accuracyRating !== null)
    .sort((a, b) => new Date(a.verifiedAt!).getTime() - new Date(b.verifiedAt!).getTime());

  if (verified.length < 4) return 'stable';

  const half = Math.floor(verified.length / 2);
  const firstHalf = verified.slice(0, half);
  const secondHalf = verified.slice(half);

  const firstAvg = firstHalf.reduce((s, p) => s + (p.accuracyRating ?? 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, p) => s + (p.accuracyRating ?? 0), 0) / secondHalf.length;

  if (secondAvg - firstAvg > 0.3) return 'improving';
  if (firstAvg - secondAvg > 0.3) return 'declining';
  return 'stable';
}
