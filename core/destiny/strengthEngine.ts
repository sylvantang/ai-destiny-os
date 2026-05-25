// ============================================================
// AI Destiny OS — Destiny Engine: Strength Analysis (旺衰引擎)
// Determines the Day Master's strength relative to the chart.
// ============================================================

import type { BaZi, Wuxing } from '../astro/types.js';
import { ALL_STEMS, HIDDEN_STEMS } from '../astro/constants.js';

export interface StrengthResult {
  score: number;          // 0-100
  level: StrengthLevel;
  breakdown: {
    monthOrder: number;     // 月令得分
    roots: number;          // 通根得分
    stemSupport: number;    // 天干助力得分
    branchSupport: number;  // 地支助力得分
    weakening: number;      // 克制扣分
  };
  analysis: string[];
}

export type StrengthLevel = '从弱' | '身弱' | '中和' | '身旺' | '从旺';

/**
 * Analyze the Day Master's strength.
 *
 * Evaluates:
 *  1. 月令 (Month Command) — the single most important factor
 *  2. 通根 (Roots in branches via hidden stems)
 *  3. 天干助力 (Stem support from other heavenly stems)
 *  4. 地支助力 (Branch support via dominant qi)
 *  5. 克制因素 (Controlling/clashing factors)
 */
export function analyzeStrength(bazi: BaZi): StrengthResult {
  const dm = bazi.day.stemIndex;
  const dmWx = bazi.day.stem.wuxing;

  const analysis: string[] = [];

  // ---- 1. Month Order (月令) ----
  const monthWx = bazi.month.branch.wuxing;
  const monthWxRel = wuxingRelation(dmWx, monthWx);
  let monthOrderScore = 0;

  switch (monthWxRel) {
    case 'same':
      monthOrderScore = 30;
      analysis.push(`月令${bazi.month.branch.name}月，与日主同五行，得令最强`);
      break;
    case 'born':
      monthOrderScore = 20;
      analysis.push(`月令${bazi.month.branch.name}月，生扶日主，得生`);
      break;
    case 'control':
      monthOrderScore = 5;
      analysis.push(`月令${bazi.month.branch.name}月，日主所克，略得地利`);
      break;
    case 'bornBy':
      monthOrderScore = -10;
      analysis.push(`月令${bazi.month.branch.name}月，日主所生，泄气`);
      break;
    case 'controlled':
      monthOrderScore = -25;
      analysis.push(`月令${bazi.month.branch.name}月，克制日主，不得令`);
      break;
  }

  // ---- 2. Roots (通根) ----
  let rootsScore = 0;
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];

  for (const p of pillars) {
    const hiddenStems = HIDDEN_STEMS[p.branchIndex];
    if (!hiddenStems) continue;
    for (let i = 0; i < hiddenStems.length; i++) {
      const hs = hiddenStems[i]!;
      if (hs.stem === dm) {
        // Weight by position: 本气 > 中气 > 余气
        const weight = i === 0 ? 12 : i === 1 ? 7 : 4;
        rootsScore += weight;
        analysis.push(`${p.branch.name}支藏${ALL_STEMS[dm]!.name}(${i === 0 ? '本气' : i === 1 ? '中气' : '余气'})，通根+${weight}`);
      }
    }
  }

  // ---- 3. Stem Support (天干助力) ----
  let stemSupportScore = 0;
  const stemPillars = [bazi.year, bazi.month, bazi.hour]; // exclude day pillar itself

  for (const p of stemPillars) {
    const stemWx = p.stem.wuxing;
    if (stemWx === dmWx) {
      stemSupportScore += 8;
      analysis.push(`${p.stem.name}与日主同五行，比劫助力+8`);
    } else if (generates(stemWx, dmWx)) {
      stemSupportScore += 6;
      analysis.push(`${p.stem.name}生扶日主，印星助力+6`);
    }
  }

  // ---- 4. Branch Support (得地) ----
  let branchSupportScore = 0;
  const branchPillars = [bazi.year, bazi.month, bazi.day, bazi.hour];

  for (const p of branchPillars) {
    const brWx = p.branch.wuxing;
    if (brWx === dmWx) {
      branchSupportScore += 6;
    } else if (generates(brWx, dmWx)) {
      branchSupportScore += 4;
    }
  }

  // ---- 5. Weakening Factors (克制因素) ----
  let weakeningScore = 0;

  for (const p of stemPillars) {
    const stemWx = p.stem.wuxing;
    if (controls(stemWx, dmWx)) {
      weakeningScore += 8;
      analysis.push(`${p.stem.name}克制日主，官杀克身-8`);
    } else if (generates(dmWx, stemWx)) {
      weakeningScore += 5;
      analysis.push(`${p.stem.name}被日主所生，食伤泄气-5`);
    }
  }

  // ---- Calculate Total ----
  const baseScore = 35; // typical base
  const totalScore = baseScore + monthOrderScore + rootsScore + stemSupportScore + branchSupportScore - weakeningScore;
  const clampedScore = Math.max(0, Math.min(100, totalScore));

  const level = scoreToLevel(clampedScore);

  return {
    score: clampedScore,
    level,
    breakdown: {
      monthOrder: monthOrderScore,
      roots: rootsScore,
      stemSupport: stemSupportScore,
      branchSupport: branchSupportScore,
      weakening: weakeningScore,
    },
    analysis,
  };
}

// ---- Wuxing Relationship Helpers ----

type WuxingRel = 'same' | 'born' | 'bornBy' | 'control' | 'controlled';

function wuxingRelation(from: Wuxing, to: Wuxing): WuxingRel {
  if (from === to) return 'same';
  if (generates(to, from)) return 'born';       // to generates from
  if (generates(from, to)) return 'bornBy';     // from generates to
  if (controls(from, to)) return 'control';     // from controls to
  return 'controlled';                           // to controls from
}

function generates(from: Wuxing, to: Wuxing): boolean {
  const map: Record<Wuxing, Wuxing> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  return map[from] === to;
}

function controls(from: Wuxing, to: Wuxing): boolean {
  const map: Record<Wuxing, Wuxing> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
  return map[from] === to;
}

function scoreToLevel(score: number): StrengthLevel {
  if (score <= 15) return '从弱';
  if (score <= 40) return '身弱';
  if (score <= 60) return '中和';
  if (score <= 85) return '身旺';
  return '从旺';
}
