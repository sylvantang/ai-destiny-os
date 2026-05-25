// ============================================================
// AI Destiny OS — Destiny Engine: Strength Analysis (旺衰引擎)
// Produces structured JSON describing Day Master strength.
// ============================================================

import type { BaZi, EarthlyBranchIndex } from '../astro/types.js';
import { ALL_STEMS, HIDDEN_STEMS } from '../astro/constants.js';

// ---- Types ----

export type StrengthLevel = '从弱' | '身弱' | '中和' | '身旺' | '从旺';

export interface StrengthResult {
  dayMaster: {
    stem: string;
    wuxing: string;
    yinYang: string;
  };
  score: number;
  level: StrengthLevel;
  levelLabel: string;
  monthOrder: {
    branch: string;
    wuxing: string;
    relation: string;
    score: number;
    description: string;
  };
  roots: Array<{
    pillar: string;
    branch: string;
    stem: string;
    depth: string;
    score: number;
  }>;
  stemSupport: Array<{
    pillar: string;
    stem: string;
    relation: string;
    score: number;
  }>;
  branchSupport: {
    score: number;
    description: string;
  };
  weakening: Array<{
    pillar: string;
    stem: string;
    reason: string;
    score: number;
  }>;
  scoring: {
    base: number;
    monthOrder: number;
    roots: number;
    stemSupport: number;
    branchSupport: number;
    weakening: number;
    total: number;
  };
  summary: string;
}

// ---- Constants ----

const LEVEL_LABELS: Record<StrengthLevel, string> = {
  '从弱': '日主极弱，顺从克泄耗之势，不宜生扶',
  '身弱': '日主偏弱，喜生扶助力，忌克泄耗',
  '中和': '日主不弱不旺，平衡为贵，大运走向决定强弱',
  '身旺': '日主偏旺，喜克泄耗平衡，忌再生扶',
  '从旺': '日主极旺，顺其旺势，不宜克制',
};

// ---- Main ----

export function analyzeStrength(bazi: BaZi): StrengthResult {
  const dm = bazi.day.stemIndex;
  const dmStem = ALL_STEMS[dm]!;
  const dmWx = dmStem.wuxing;

  // 1. Month Order
  const monthBranch = bazi.month.branch;
  const monthOrder = analyzeMonthOrder(dmWx, monthBranch.wuxing, monthBranch.name);

  // 2. Roots (通根)
  const roots = analyzeRoots(bazi, dm);

  // 3. Stem Support (天干助力)
  const stemSupport = analyzeStemSupport(bazi, dmWx);

  // 4. Branch Support (地支助力)
  const branchSupport = analyzeBranchSupport(bazi, dmWx);

  // 5. Weakening (克制因素)
  const weakening = analyzeWeakening(bazi, dmWx);

  // Calculate total
  const base = 35;
  const total =
    base +
    monthOrder.score +
    roots.reduce((s, r) => s + r.score, 0) +
    stemSupport.reduce((s, r) => s + r.score, 0) +
    branchSupport.score -
    weakening.reduce((s, w) => s + w.score, 0);

  const clampedScore = Math.max(0, Math.min(100, total));
  const level = scoreToLevel(clampedScore);

  const scoring = {
    base,
    monthOrder: monthOrder.score,
    roots: roots.reduce((s, r) => s + r.score, 0),
    stemSupport: stemSupport.reduce((s, r) => s + r.score, 0),
    branchSupport: branchSupport.score,
    weakening: weakening.reduce((s, w) => s + w.score, 0),
    total: clampedScore,
  };

  return {
    dayMaster: {
      stem: dmStem.name,
      wuxing: dmWx,
      yinYang: dmStem.yinYang,
    },
    score: clampedScore,
    level,
    levelLabel: LEVEL_LABELS[level],
    monthOrder,
    roots,
    stemSupport,
    branchSupport,
    weakening,
    scoring,
    summary: buildSummary(dmStem.name, dmWx, clampedScore, level, monthOrder, roots, stemSupport, weakening),
  };
}

// ---- Analyzers ----

function analyzeMonthOrder(dmWx: string, monthWx: string, monthName: string) {
  const rel = wuxingRelation(dmWx, monthWx);
  let score: number;
  let description: string;

  switch (rel) {
    case 'same':
      score = 30;
      description = `月令${monthName}月与日主同属${dmWx}，当令得时，根基深厚`;
      break;
    case 'born':
      score = 20;
      description = `月令${monthName}月属${monthWx}，生扶日主${dmWx}，得月令之生`;
      break;
    case 'control':
      score = 5;
      description = `月令${monthName}月属${monthWx}，为日主所克，虽不当令但可掌控`;
      break;
    case 'bornBy':
      score = -10;
      description = `月令${monthName}月属${monthWx}，日主${dmWx}之气被泄，不得令`;
      break;
    case 'controlled':
      score = -25;
      description = `月令${monthName}月属${monthWx}，克制日主${dmWx}，严重失令`;
      break;
    default:
      score = 0;
      description = '';
  }

  return { branch: monthName, wuxing: monthWx, relation: relLabel(rel), score, description };
}

function analyzeRoots(bazi: BaZi, dm: number) {
  const pillars: Array<{ label: string; branch: string; idx: number }> = [
    { label: '年柱', branch: bazi.year.branch.name, idx: bazi.year.branchIndex },
    { label: '月柱', branch: bazi.month.branch.name, idx: bazi.month.branchIndex },
    { label: '日柱', branch: bazi.day.branch.name, idx: bazi.day.branchIndex },
    { label: '时柱', branch: bazi.hour.branch.name, idx: bazi.hour.branchIndex },
  ];

  const roots: StrengthResult['roots'] = [];

  for (const p of pillars) {
    const hidden = HIDDEN_STEMS[p.idx as EarthlyBranchIndex];
    if (!hidden) continue;
    for (let i = 0; i < hidden.length; i++) {
      const hs = hidden[i]!;
      if (hs.stem === dm) {
        const depth = i === 0 ? '本气' : i === 1 ? '中气' : '余气';
        const weight = i === 0 ? 12 : i === 1 ? 7 : 4;
        roots.push({
          pillar: p.label,
          branch: p.branch,
          stem: ALL_STEMS[dm]!.name,
          depth,
          score: weight,
        });
      }
    }
  }

  return roots;
}

function analyzeStemSupport(bazi: BaZi, dmWx: string) {
  const pillars: Array<{ label: string; stem: string; stemIdx: number }> = [
    { label: '年干', stem: bazi.year.stem.name, stemIdx: bazi.year.stemIndex },
    { label: '月干', stem: bazi.month.stem.name, stemIdx: bazi.month.stemIndex },
    { label: '时干', stem: bazi.hour.stem.name, stemIdx: bazi.hour.stemIndex },
  ];

  const support: StrengthResult['stemSupport'] = [];

  for (const p of pillars) {
    const swx = ALL_STEMS[p.stemIdx]!.wuxing;
    if (swx === dmWx) {
      support.push({
        pillar: p.label,
        stem: p.stem,
        relation: '比劫相助',
        score: 8,
      });
    } else if (generates(swx, dmWx)) {
      support.push({
        pillar: p.label,
        stem: p.stem,
        relation: '印星生扶',
        score: 6,
      });
    }
  }

  return support;
}

function analyzeBranchSupport(bazi: BaZi, dmWx: string) {
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  let score = 0;
  const supporters: string[] = [];

  for (const p of pillars) {
    const bw = p.branch.wuxing;
    if (bw === dmWx) {
      score += 6;
      supporters.push(`${p.branch.name}(同气)`);
    } else if (generates(bw, dmWx)) {
      score += 4;
      supporters.push(`${p.branch.name}(生扶)`);
    }
  }

  return {
    score,
    description: supporters.length > 0
      ? `地支助力来源：${supporters.join('、')}`
      : '地支中无助力的五行',
  };
}

function analyzeWeakening(bazi: BaZi, dmWx: string) {
  const pillars: Array<{ label: string; stem: string; stemIdx: number }> = [
    { label: '年干', stem: bazi.year.stem.name, stemIdx: bazi.year.stemIndex },
    { label: '月干', stem: bazi.month.stem.name, stemIdx: bazi.month.stemIndex },
    { label: '时干', stem: bazi.hour.stem.name, stemIdx: bazi.hour.stemIndex },
  ];

  const weakening: StrengthResult['weakening'] = [];

  for (const p of pillars) {
    const swx = ALL_STEMS[p.stemIdx]!.wuxing;
    if (controls(swx, dmWx)) {
      weakening.push({
        pillar: p.label,
        stem: p.stem,
        reason: `官杀克身（${swx}克${dmWx}）`,
        score: 8,
      });
    } else if (generates(dmWx, swx)) {
      weakening.push({
        pillar: p.label,
        stem: p.stem,
        reason: `食伤泄气（${dmWx}生${swx}）`,
        score: 5,
      });
    }
  }

  return weakening;
}

// ---- Summary Builder ----

function buildSummary(
  dmName: string,
  dmWx: string,
  score: number,
  level: StrengthLevel,
  monthOrder: StrengthResult['monthOrder'],
  roots: StrengthResult['roots'],
  stemSupport: StrengthResult['stemSupport'],
  weakening: StrengthResult['weakening'],
): string {
  const parts: string[] = [];

  parts.push(`日主${dmName}${dmWx}，综合评分${score}分，属于${level}。`);

  if (monthOrder.score > 0) {
    parts.push(`月令方面${monthOrder.description}（${monthOrder.score > 0 ? '+' : ''}${monthOrder.score}分）。`);
  } else {
    parts.push(`月令方面${monthOrder.description}（${monthOrder.score}分）。`);
  }

  if (roots.length > 0) {
    const rootDesc = roots.map(r => `${r.pillar}${r.branch}藏${r.stem}(${r.depth})`).join('、');
    parts.push(`通根情况：${rootDesc}。`);
  } else {
    parts.push('命局无通根，日主根基不牢。');
  }

  if (stemSupport.length > 0) {
    const supDesc = stemSupport.map(s => `${s.pillar}${s.stem}${s.relation}`).join('、');
    parts.push(`天干助力：${supDesc}。`);
  }

  if (weakening.length > 0) {
    const weakDesc = weakening.map(w => `${w.pillar}${w.stem}${w.reason}`).join('、');
    parts.push(`克制因素：${weakDesc}。`);
  }

  return parts.join('');
}

// ---- Helpers ----

type WuxingRel = 'same' | 'born' | 'bornBy' | 'control' | 'controlled';

function wuxingRelation(from: string, to: string): WuxingRel {
  if (from === to) return 'same';
  if (generates(to, from)) return 'born';
  if (generates(from, to)) return 'bornBy';
  if (controls(from, to)) return 'control';
  return 'controlled';
}

function relLabel(rel: WuxingRel): string {
  switch (rel) {
    case 'same': return '同气当令';
    case 'born': return '生扶得令';
    case 'bornBy': return '泄气失令';
    case 'control': return '我克为用';
    case 'controlled': return '受克失令';
  }
}

function generates(from: string, to: string): boolean {
  const map: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  return map[from] === to;
}

function controls(from: string, to: string): boolean {
  const map: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
  return map[from] === to;
}

function scoreToLevel(score: number): StrengthLevel {
  if (score <= 15) return '从弱';
  if (score <= 40) return '身弱';
  if (score <= 60) return '中和';
  if (score <= 85) return '身旺';
  return '从旺';
}
