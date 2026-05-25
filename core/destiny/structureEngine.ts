// ============================================================
// AI Destiny OS — Destiny Engine: Structure Analysis (格局引擎)
// Identifies the chart's governing pattern (格局).
// ============================================================

import type { BaZi, HeavenlyStemIndex, ShiShen } from '../astro/types.js';
import { HIDDEN_STEMS, getShiShen, ALL_STEMS } from '../astro/constants.js';
import type { StrengthResult } from './strengthEngine.js';

export type PatternType =
  // Normal patterns (正格 / 八格)
  | '正官格' | '七杀格'
  | '正财格' | '偏财格'
  | '正印格' | '偏印格'
  | '食神格' | '伤官格'
  // Special patterns (变格)
  | '建禄格' | '月刃格'
  | '从财格' | '从杀格' | '从儿格' | '从势格'
  | '化气格'
  // Indeterminate
  | '杂气格';

export interface StructureResult {
  primaryPattern: PatternType;
  subPattern: PatternType | null;
  patternShiShen: ShiShen | null;    // The 十神 representing the pattern
  patternStem: HeavenlyStemIndex | null; // The stem that defines the pattern
  isSpecial: boolean;
  isFavorable: boolean;              // Whether the pattern is favorable given strength
  analysis: string[];
}

/**
 * Identify the chart's pattern (格局).
 *
 * Primary determination:
 * 1. Check for special patterns (从格, 化气格) based on strength
 * 2. Look at the month branch's dominant hidden stem (月令本气)
 * 3. If it appears on a heavenly stem (透干), that's the pattern
 * 4. If not, the month branch's dominant qi determines the pattern
 */
export function analyzeStructure(
  bazi: BaZi,
  strength: StrengthResult,
): StructureResult {
  const dm = bazi.day.stemIndex;
  const analysis: string[] = [];

  // ---- Step 1: Check for special patterns based on strength ----

  if (strength.level === '从旺') {
    return buildFromStrong(bazi, dm, analysis);
  }

  if (strength.level === '从弱') {
    return buildFromWeak(bazi, dm, analysis);
  }

  // ---- Step 2: Normal pattern from month branch ----

  const monthBranch = bazi.month.branchIndex;
  const monthHidden = HIDDEN_STEMS[monthBranch];
  if (!monthHidden || monthHidden.length === 0) {
    return { primaryPattern: '杂气格', subPattern: null, patternShiShen: null, patternStem: null, isSpecial: false, isFavorable: true, analysis };
  }

  // The dominant (本气) hidden stem of the month branch defines the potential pattern
  const dominantStem = monthHidden[0]!.stem as HeavenlyStemIndex;
  const dominantShiShen = getShiShen(dm, dominantStem);

  // Check if the dominant stem appears on any heavenly stem (透干)
  const stems = [bazi.year.stemIndex, bazi.month.stemIndex, bazi.hour.stemIndex];
  const isTouGan = stems.includes(dominantStem);

  // Check for 建禄格 / 月刃格
  // 建禄: day stem's 临官 (禄) position is in the month branch
  // 临官 position: 甲禄寅, 乙禄卯, 丙禄巳, 丁禄午, 戊禄巳, 己禄午, 庚禄申, 辛禄酉, 壬禄亥, 癸禄子
  const dayStemLuPositions: Record<number, number> = {
    0: 2, 1: 3, 2: 5, 3: 6, 4: 5, 5: 6, 6: 8, 7: 9, 8: 11, 9: 0,
  };

  if (dayStemLuPositions[dm] === monthBranch) {
    const isYangStem = ALL_STEMS[dm]!.yinYang === '阳';
    const primaryPattern: PatternType = isYangStem ? '建禄格' : '月刃格';
    analysis.push(`日主${ALL_STEMS[dm]!.name}禄在月令，为${primaryPattern}`);
    return {
      primaryPattern,
      subPattern: shiShenToPattern(dominantShiShen),
      patternShiShen: dominantShiShen,
      patternStem: dominantStem,
      isSpecial: true,
      isFavorable: strength.level === '偏弱',
      analysis,
    };
  }

  // Normal pattern: month dominant 十神 → pattern
  const primaryPattern = shiShenToPattern(dominantShiShen)!;

  if (isTouGan) {
    analysis.push(`月令${ALL_STEMS[dominantStem]!.name}(${dominantShiShen})透干，取${primaryPattern}`);
  } else {
    analysis.push(`月令本气${ALL_STEMS[dominantStem]!.name}为${dominantShiShen}，取${primaryPattern}`);
  }

  // Check secondary pattern from middle qi (中气)
  const subPattern = monthHidden.length > 1
    ? shiShenToPattern(getShiShen(dm, monthHidden[1]!.stem as HeavenlyStemIndex))
    : null;

  // Favorability: based on strength
  // Generally: weak day master favors 印/比, strong favors 官/财/食伤
  let isFavorable = false;
  if (dominantShiShen) {
    if (strength.level === '偏弱') {
      isFavorable = dominantShiShen === '正印' || dominantShiShen === '偏印' || dominantShiShen === '比肩' || dominantShiShen === '劫财';
    } else {
      isFavorable = true; // all patterns work for strong day masters
    }
  }

  return {
    primaryPattern,
    subPattern,
    patternShiShen: dominantShiShen,
    patternStem: dominantStem,
    isSpecial: false,
    isFavorable,
    analysis,
  };
}

// ---- Special Pattern Builders ----

function buildFromWeak(bazi: BaZi, dm: HeavenlyStemIndex, analysis: string[]): StructureResult {
  // From-weak (从弱): determine which element dominates
  const pillars = [bazi.year, bazi.month, bazi.hour];

  // Count 十神 types on heavenly stems
  const shiShenCount: Record<string, number> = {};
  for (const p of pillars) {
    const ss = getShiShen(dm, p.stemIndex);
    shiShenCount[ss] = (shiShenCount[ss] || 0) + 1;
  }

  // Determine the dominant controlling element
  const caiCount = (shiShenCount['正财'] || 0) + (shiShenCount['偏财'] || 0);
  const shaCount = (shiShenCount['正官'] || 0) + (shiShenCount['七杀'] || 0);
  const erCount = (shiShenCount['食神'] || 0) + (shiShenCount['伤官'] || 0);

  if (caiCount >= shaCount && caiCount >= erCount && caiCount > 0) {
    analysis.push('日主极弱，财星旺盛，取从财格');
    return { primaryPattern: '从财格', subPattern: null, patternShiShen: '正财', patternStem: null, isSpecial: true, isFavorable: true, analysis };
  }
  if (shaCount >= caiCount && shaCount >= erCount && shaCount > 0) {
    analysis.push('日主极弱，官杀旺盛，取从杀格');
    return { primaryPattern: '从杀格', subPattern: null, patternShiShen: '七杀', patternStem: null, isSpecial: true, isFavorable: true, analysis };
  }
  if (erCount > 0) {
    analysis.push('日主极弱，食伤旺盛，取从儿格');
    return { primaryPattern: '从儿格', subPattern: null, patternShiShen: '食神', patternStem: null, isSpecial: true, isFavorable: true, analysis };
  }

  analysis.push('日主极弱，多行混杂，取从势格');
  return { primaryPattern: '从势格', subPattern: null, patternShiShen: null, patternStem: null, isSpecial: true, isFavorable: true, analysis };
}

function buildFromStrong(_bazi: BaZi, dm: HeavenlyStemIndex, analysis: string[]): StructureResult {
  // From-strong (从旺/从强): day master dominates
  analysis.push('日主极旺，全局生扶，取从旺格');
  return { primaryPattern: '建禄格', subPattern: null, patternShiShen: '比肩', patternStem: dm, isSpecial: true, isFavorable: true, analysis };
}

// ---- Helpers ----

function shiShenToPattern(ss: ShiShen): PatternType {
  switch (ss) {
    case '正官': return '正官格';
    case '七杀': return '七杀格';
    case '正财': return '正财格';
    case '偏财': return '偏财格';
    case '正印': return '正印格';
    case '偏印': return '偏印格';
    case '食神': return '食神格';
    case '伤官': return '伤官格';
    case '比肩':
    case '劫财':
      return '建禄格';
  }
}
