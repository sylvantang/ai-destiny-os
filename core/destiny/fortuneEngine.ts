// ============================================================
// AI Destiny OS — Destiny Engine: Fortune Analysis (运势引擎)
// Integrates natal chart, DaYun, and LiuNian for fortune scoring.
// ============================================================

import type { BaZi, DaYunPillar, LiuNian } from '../astro/types.js';
import { getShiShen } from '../astro/constants.js';
import type { StrengthResult } from './strengthEngine.js';
import type { StructureResult } from './structureEngine.js';
import type { ClimateResult } from './climateEngine.js';
import type { RelationResult } from './relationEngine.js';

export interface FortuneResult {
  /** Overall fortune assessment for the current period */
  overall: FortuneAssessment;
  /** Detailed yearly breakdown */
  yearlyAnalysis: YearlyFortune[];
  /** Life period predictions */
  lifePeriods: LifePeriod[];
  /** Summary for AI interpretation */
  summary: string;
}

export interface FortuneAssessment {
  score: number;      // 0-100
  level: '低谷' | '平缓' | '上升' | '高峰';
  bestDimension: string;
  riskDimension: string;
}

export interface YearlyFortune {
  year: number;
  daiyunPillar: DaYunPillar | null;
  liunianPillar: LiuNian | null;
  career: number;
  wealth: number;
  relationship: number;
  health: number;
}

export interface LifePeriod {
  name: string;
  ageRange: string;
  description: string;
  keyAdvice: string;
}

/**
 * Analyze overall fortune by combining:
 *  1. Natal chart strength & structure
 *  2. Current DaYun influence
 *  3. LiuNian annual influences
 *  4. Climate adjustment needs
 */
export function analyzeFortune(
  bazi: BaZi,
  strength: StrengthResult,
  structure: StructureResult,
  climate: ClimateResult,
  relations: RelationResult,
  dayun: DaYunPillar[],
  liunian: LiuNian[],
): FortuneResult {
  const yearlyAnalysis = buildYearlyAnalysis(dayun, liunian, bazi, strength, relations);

  const overall = buildOverallAssessment(yearlyAnalysis, strength, structure, climate);

  const lifePeriods = buildLifePeriods(dayun, bazi);

  return {
    overall,
    yearlyAnalysis,
    lifePeriods,
    summary: buildSummary(overall, structure, climate, relations),
  };
}

// ---- Builders ----

function buildYearlyAnalysis(
  dayun: DaYunPillar[],
  liunian: LiuNian[],
  _bazi: BaZi,
  _strength: StrengthResult,
  _relations: RelationResult,
): YearlyFortune[] {
  return liunian.map(ln => {
    // Find corresponding DaYun for this year
    const dy = dayun.find(d => ln.year >= d.startYear && ln.year < d.endYear) ?? null;

    return {
      year: ln.year,
      daiyunPillar: dy,
      liunianPillar: ln,
      career: ln.scores.career,
      wealth: ln.scores.wealth,
      relationship: ln.scores.relationship,
      health: ln.scores.health,
    };
  });
}

function buildOverallAssessment(
  yearly: YearlyFortune[],
  _strength: StrengthResult,
  structure: StructureResult,
  climate: ClimateResult,
): FortuneAssessment {
  if (yearly.length === 0) {
    return { score: 50, level: '平缓', bestDimension: '未知', riskDimension: '未知' };
  }

  // Average scores across all years
  const avg = (key: keyof YearlyFortune & ('career' | 'wealth' | 'relationship' | 'health')) =>
    Math.round(yearly.reduce((s, y) => s + (typeof y[key] === 'number' ? y[key] : 0), 0) / yearly.length);

  const avgCareer = avg('career');
  const avgWealth = avg('wealth');
  const avgRelationship = avg('relationship');
  const avgHealth = avg('health');

  const overallScore = Math.round((avgCareer + avgWealth + avgRelationship + avgHealth) / 4);

  // Adjust based on strength and structure
  let adjustedScore = overallScore;
  if (structure.isFavorable) adjustedScore += 5;
  if (climate.needsAdjustment && climate.priority === 'high') adjustedScore -= 5;

  const clampedScore = Math.max(0, Math.min(100, adjustedScore));

  const dims: [string, number][] = [
    ['事业', avgCareer], ['财富', avgWealth], ['感情', avgRelationship], ['健康', avgHealth],
  ];
  dims.sort((a, b) => b[1] - a[1]);

  const bestDimension = dims[0]![0]!;
  const riskDimension = dims[3]![0]!;

  let level: FortuneAssessment['level'];
  if (clampedScore >= 75) level = '高峰';
  else if (clampedScore >= 60) level = '上升';
  else if (clampedScore >= 40) level = '平缓';
  else level = '低谷';

  return { score: clampedScore, level, bestDimension, riskDimension };
}

function buildLifePeriods(
  dayun: DaYunPillar[],
  bazi: BaZi,
): LifePeriod[] {
  return dayun.slice(0, 5).map(dy => {
    const stem = dy.pillar.stem;
    const branch = dy.pillar.branch;

    let description: string;
    let keyAdvice: string;

    // Theme based on the DaYun stem's nature
    const stemWx = stem.wuxing;
    const stemYY = stem.yinYang;

    if (['正财', '偏财'].some(s => getShiShen(bazi.day.stemIndex, stem.index) === s)) {
      description = `${stem.name}${branch.name}大运，财运主导的十年。${stemWx}${stemYY}之气当运。`;
      keyAdvice = '聚焦财富积累，把握投资机会，同时注意守财。';
    } else if (['正官', '七杀'].some(s => getShiShen(bazi.day.stemIndex, stem.index) === s)) {
      description = `${stem.name}${branch.name}大运，事业官运发展的关键期。`;
      keyAdvice = '专注职业发展，建立权威和影响力。七杀运需防小人与压力。';
    } else if (['正印', '偏印'].some(s => getShiShen(bazi.day.stemIndex, stem.index) === s)) {
      description = `${stem.name}${branch.name}大运，学习与贵人运旺盛的阶段。`;
      keyAdvice = '适合深造学习，积累知识和人脉资源。';
    } else if (['食神', '伤官'].some(s => getShiShen(bazi.day.stemIndex, stem.index) === s)) {
      description = `${stem.name}${branch.name}大运，才华展现与创新的十年。`;
      keyAdvice = '发挥创造力，适合创业或技术突破，注意言行分寸。';
    } else {
      description = `${stem.name}${branch.name}大运，${stemWx}气当令，是人生重要的一个阶段。`;
      keyAdvice = `顺应${stemWx}行之气，发挥自身优势。`;
    }

    return {
      name: `${stem.name}${branch.name}运`,
      ageRange: `${dy.startAge}-${dy.startAge + 10}岁`,
      description,
      keyAdvice,
    };
  });
}

function buildSummary(
  overall: FortuneAssessment,
  structure: StructureResult,
  climate: ClimateResult,
  relations: RelationResult,
): string {
  const parts: string[] = [];

  parts.push(`命局格局为${structure.primaryPattern}，运势整体处于${overall.level}期。`);
  parts.push(`最佳领域为${overall.bestDimension}，需关注${overall.riskDimension}方面的风险。`);
  parts.push(relations.summary);

  if (climate.needsAdjustment && climate.priority !== 'none') {
    parts.push(`命局需要${climate.neededWuxing}来调候（${climate.condition}）。`);
  }

  return parts.join('');
}
