// ============================================================
// AI Destiny OS — Astro Core: LiuNian (流年 / Annual Fortune)
// ============================================================

import type {
  LiuNian, Pillar, SexagenaryIndex,
  HeavenlyStemIndex, EarthlyBranchIndex, BaZi,
} from './types.js';
import {
  getStem, getBranch, getHiddenStems, getNayin,
  sexagenaryIndex,
  getShiShen,
} from './constants.js';

/**
 * Calculate LiuNian (流年 / annual fortune) for a range of years.
 *
 * Each year has its own year pillar (determined by the sexagenary cycle,
 * with 立春 as the cutoff). This year pillar interacts with the natal
 * BaZi chart to produce influence scores.
 */
export function calcLiuNian(
  bazi: BaZi,
  startYear: number,
  endYear: number,
): LiuNian[] {
  const dmIdx = bazi.day.stemIndex;
  const results: LiuNian[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearPillar = getYearPillar(year, dmIdx);
    const scores = calcYearScores(bazi, yearPillar);

    results.push({
      year,
      pillar: yearPillar,
      scores,
    });
  }

  return results;
}

/**
 * Calculate LiuYue (流月 / monthly fortune) for a specific year.
 *
 * Each month's pillar is determined by the year stem and the solar term.
 */
export function calcLiuYue(
  bazi: BaZi,
  year: number,
): { month: number; pillar: Pillar }[] {
  const dmIdx = bazi.day.stemIndex;
  const yearPillar = getYearPillar(year, dmIdx);
  const yearStem = yearPillar.stemIndex;
  const results: { month: number; pillar: Pillar }[] = [];

  // Month stem start based on year stem
  const MONTH_STEM_START: Record<number, number> = {
    0: 2, 5: 2,   // 甲己 → 丙
    1: 4, 6: 4,   // 乙庚 → 戊
    2: 6, 7: 6,   // 丙辛 → 庚
    3: 8, 8: 8,   // 丁壬 → 壬
    4: 0, 9: 0,   // 戊癸 → 甲
  };

  const stemStart = MONTH_STEM_START[yearStem] ?? 2;

  // 寅月(2) to 丑月(1) — the 12 lunar months
  // Month 1 = 寅月, Month 2 = 卯月, ..., Month 12 = 丑月
  for (let m = 0; m < 12; m++) {
    const branchIdx = ((m + 2) % 12) as EarthlyBranchIndex; // 2=寅, 3=卯, ..., 1=丑
    const stemIdx = ((stemStart + m) % 10) as HeavenlyStemIndex;
    const sexIdx = sexagenaryIndex(stemIdx, branchIdx);

    results.push({
      month: m + 1,
      pillar: {
        stem: getStem(stemIdx),
        branch: getBranch(branchIdx),
        stemIndex: stemIdx,
        branchIndex: branchIdx,
        sexagenaryIndex: sexIdx,
        hiddenStems: getHiddenStems(branchIdx),
        nayin: getNayin(sexIdx),
        shiShen: getShiShen(dmIdx, stemIdx),
      },
    });
  }

  return results;
}

/**
 * Calculate LiuRi (流日 / daily fortune) for a specific date.
 */
export function calcLiuRi(
  date: Date,
  dayMasterIndex: HeavenlyStemIndex,
): Pillar {
  // Reference: 1900-01-01 was 甲戌日 (index 10)
  const refDate = new Date(Date.UTC(1900, 0, 1));
  const refIdx = 10;

  const targetUTC = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );

  const refUTC = Date.UTC(
    refDate.getUTCFullYear(),
    refDate.getUTCMonth(),
    refDate.getUTCDate(),
  );

  const dayDiff = Math.round((targetUTC - refUTC) / (24 * 60 * 60 * 1000));
  const dayIndex = ((refIdx + dayDiff) % 60 + 60) % 60;

  const stemIdx = (dayIndex % 10) as HeavenlyStemIndex;
  const branchIdx = (dayIndex % 12) as EarthlyBranchIndex;

  return {
    stem: getStem(stemIdx),
    branch: getBranch(branchIdx),
    stemIndex: stemIdx,
    branchIndex: branchIdx,
    sexagenaryIndex: dayIndex as SexagenaryIndex,
    hiddenStems: getHiddenStems(branchIdx),
    nayin: getNayin(dayIndex as SexagenaryIndex),
    shiShen: getShiShen(dayMasterIndex, stemIdx),
  };
}

// ---- Internal helpers ----

function getYearPillar(year: number, dmIdx: HeavenlyStemIndex): Pillar {
  // 公元4年为甲子年
  const yearIndex = ((year - 4) % 60 + 60) % 60;
  const stemIdx = (yearIndex % 10) as HeavenlyStemIndex;
  const branchIdx = (yearIndex % 12) as EarthlyBranchIndex;

  return {
    stem: getStem(stemIdx),
    branch: getBranch(branchIdx),
    stemIndex: stemIdx,
    branchIndex: branchIdx,
    sexagenaryIndex: yearIndex as SexagenaryIndex,
    hiddenStems: getHiddenStems(branchIdx),
    nayin: getNayin(yearIndex as SexagenaryIndex),
    shiShen: getShiShen(dmIdx, stemIdx),
  };
}

/**
 * Score a year based on how its pillar interacts with the natal BaZi.
 *
 * Scoring logic:
 * - 日主 (day master) interaction is weighted most heavily
 * - Favorable/unfavorable: based on stem-branch interactions
 * - 十神 (shi shen) analysis for each pillar
 */
function calcYearScores(
  bazi: BaZi,
  yearPillar: Pillar,
): { career: number; wealth: number; relationship: number; health: number; overall: number } {
  const dayMaster = bazi.day.stemIndex;

  // Base scores from 50 (neutral)
  let career = 50;
  let wealth = 50;
  let relationship = 50;
  let health = 50;

  // Year stem influence (天干影响) — primary weight
  const yearStemShiShen = getShiShen(dayMaster, yearPillar.stemIndex);
  applyShiShenEffect(yearStemShiShen, 1.0);

  // Hidden stems in year branch — secondary weight
  // Dominant (本气) gets higher weight
  for (let i = 0; i < yearPillar.hiddenStems.length; i++) {
    const hs = yearPillar.hiddenStems[i]!;
    const hsShiShen = getShiShen(dayMaster, hs);
    const weight = i === 0 ? 0.6 : 0.25; // 本气 weighted higher
    applyShiShenEffect(hsShiShen, weight);
  }

  // Clamp to 0-100
  career = clamp(career);
  wealth = clamp(wealth);
  relationship = clamp(relationship);
  health = clamp(health);

  const overall = Math.round((career + wealth + relationship + health) / 4);

  return { career, wealth, relationship, health, overall };

  function applyShiShenEffect(shiShen: string, weight: number): void {
    const effect = getShiShenEffect(shiShen);
    career += effect.career * weight;
    wealth += effect.wealth * weight;
    relationship += effect.relationship * weight;
    health += effect.health * weight;
  }
}

/**
 * Map 十神 to rough influence scores on different life dimensions.
 *
 * These are baseline directional effects — the actual AI interpretation
 * layer will provide more nuanced analysis.
 */
function getShiShenEffect(shiShen: string): {
  career: number;
  wealth: number;
  relationship: number;
  health: number;
} {
  switch (shiShen) {
    // Self / peers
    case '比肩':
      return { career: 5, wealth: 0, relationship: 2, health: 5 };
    case '劫财':
      return { career: 3, wealth: -5, relationship: -3, health: 3 };

    // Output / expression
    case '食神':
      return { career: 8, wealth: 10, relationship: 8, health: 5 };
    case '伤官':
      return { career: 5, wealth: 5, relationship: -5, health: -3 };

    // Wealth
    case '正财':
      return { career: 10, wealth: 15, relationship: 5, health: 0 };
    case '偏财':
      return { career: 5, wealth: 12, relationship: 3, health: -2 };

    // Authority
    case '正官':
      return { career: 15, wealth: 5, relationship: 10, health: 3 };
    case '七杀':
      return { career: 10, wealth: -3, relationship: -5, health: -10 };

    // Resource / support
    case '正印':
      return { career: 8, wealth: -2, relationship: 5, health: 10 };
    case '偏印':
      return { career: 5, wealth: -3, relationship: 0, health: 5 };

    default:
      return { career: 0, wealth: 0, relationship: 0, health: 0 };
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
