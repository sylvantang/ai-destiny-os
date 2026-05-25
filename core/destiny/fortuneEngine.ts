// ============================================================
// AI Destiny OS — Destiny Engine: Fortune Analysis (运势引擎)
// Produces structured JSON describing fortune across time periods.
// ============================================================

import type { BaZi, DaYunPillar, LiuNian } from '../astro/types.js';
import { getShiShen } from '../astro/constants.js';
import type { StrengthResult } from './strengthEngine.js';
import type { StructureResult } from './structureEngine.js';
import type { ClimateResult } from './climateEngine.js';
import type { RelationResult } from './relationEngine.js';

// ---- Types ----

export interface FortuneResult {
  overall: FortuneAssessment;
  yearlyAnalysis: YearlyFortune[];
  keyYears: {
    best: YearlyFortune | null;
    worst: YearlyFortune | null;
  };
  lifePeriods: LifePeriod[];
  summary: string;
}

export interface FortuneAssessment {
  score: number;
  level: string;
  levelLabel: string;
  bestDimension: string;
  riskDimension: string;
  dimensions: {
    career: number;
    wealth: number;
    relationship: number;
    health: number;
  };
  modifiers: string[];
}

export interface YearlyFortune {
  year: number;
  daiyunPillar: string | null;
  liunianPillar: string | null;
  career: number;
  wealth: number;
  relationship: number;
  health: number;
  overall: number;
}

export interface LifePeriod {
  name: string;
  ageRange: string;
  theme: string;
  description: string;
  keyAdvice: string;
}

const LEVEL_LABELS: Record<string, string> = {
  '低谷': '当前运势处于低谷期，宜守不宜攻，积累实力等待时机',
  '平缓': '运势平稳，按部就班推进即可，不必急于求成',
  '上升': '运势上升通道中，积极进取可获回报，把握机会窗口',
  '高峰': '运势正处高峰期，天时地利人和，宜大步向前',
};

// ---- Main ----

export function analyzeFortune(
  bazi: BaZi,
  strength: StrengthResult,
  structure: StructureResult,
  climate: ClimateResult,
  relations: RelationResult,
  dayun: DaYunPillar[],
  liunian: LiuNian[],
): FortuneResult {
  const yearlyAnalysis = buildYearlyAnalysis(dayun, liunian);
  const overall = buildOverallAssessment(yearlyAnalysis, structure, climate);
  const lifePeriods = buildLifePeriods(dayun, bazi);
  const keyYears = buildKeyYears(yearlyAnalysis);

  return {
    overall,
    yearlyAnalysis,
    keyYears,
    lifePeriods,
    summary: buildSummary(overall, structure, climate, relations, strength),
  };
}

// ---- Builders ----

function buildYearlyAnalysis(dayun: DaYunPillar[], liunian: LiuNian[]): YearlyFortune[] {
  return liunian.map(ln => {
    const dy = dayun.find(d => ln.year >= d.startYear && ln.year < d.endYear) ?? null;
    return {
      year: ln.year,
      daiyunPillar: dy ? `${dy.pillar.stem.name}${dy.pillar.branch.name}` : null,
      liunianPillar: `${ln.pillar.stem.name}${ln.pillar.branch.name}`,
      career: ln.scores.career,
      wealth: ln.scores.wealth,
      relationship: ln.scores.relationship,
      health: ln.scores.health,
      overall: ln.scores.overall,
    };
  });
}

function buildOverallAssessment(
  yearly: YearlyFortune[],
  structure: StructureResult,
  climate: ClimateResult,
): FortuneAssessment {
  if (yearly.length === 0) {
    return {
      score: 50, level: '平缓', levelLabel: LEVEL_LABELS['平缓']!,
      bestDimension: '未知', riskDimension: '未知',
      dimensions: { career: 50, wealth: 50, relationship: 50, health: 50 },
      modifiers: [],
    };
  }

  const avgCareer = avg(yearly, 'career');
  const avgWealth = avg(yearly, 'wealth');
  const avgRelationship = avg(yearly, 'relationship');
  const avgHealth = avg(yearly, 'health');
  const overallScore = Math.round((avgCareer + avgWealth + avgRelationship + avgHealth) / 4);

  const modifiers: string[] = [];
  let adjustedScore = overallScore;

  if (structure.isFavorable) {
    adjustedScore += 5;
    modifiers.push('格局得用，运势加成（+5分）');
  }
  if (climate.needsAdjustment && climate.priority === 'high') {
    adjustedScore -= 5;
    modifiers.push(`调候需求高（需${climate.neededWuxing}），运势受限（-5分）`);
  }

  const clampedScore = Math.max(0, Math.min(100, adjustedScore));

  const dims: Array<[string, number]> = [
    ['事业', avgCareer], ['财富', avgWealth], ['感情', avgRelationship], ['健康', avgHealth],
  ];
  dims.sort((a, b) => b[1] - a[1]);

  let level: string;
  if (clampedScore >= 75) level = '高峰';
  else if (clampedScore >= 60) level = '上升';
  else if (clampedScore >= 40) level = '平缓';
  else level = '低谷';

  return {
    score: clampedScore,
    level,
    levelLabel: LEVEL_LABELS[level]!,
    bestDimension: dims[0]![0]!,
    riskDimension: dims[3]![0]!,
    dimensions: { career: avgCareer, wealth: avgWealth, relationship: avgRelationship, health: avgHealth },
    modifiers,
  };
}

function buildKeyYears(yearly: YearlyFortune[]): { best: YearlyFortune | null; worst: YearlyFortune | null } {
  if (yearly.length === 0) return { best: null, worst: null };

  let best = yearly[0]!;
  let worst = yearly[0]!;

  for (const y of yearly) {
    if (y.overall > best.overall) best = y;
    if (y.overall < worst.overall) worst = y;
  }

  return { best, worst };
}

function buildLifePeriods(dayun: DaYunPillar[], bazi: BaZi): LifePeriod[] {
  return dayun.slice(0, 6).map(dy => {
    const stem = dy.pillar.stem;
    const branch = dy.pillar.branch;
    const shiShen = getShiShen(bazi.day.stemIndex, stem.index);

    let theme: string;
    let description: string;
    let keyAdvice: string;

    if (shiShen === '正财' || shiShen === '偏财') {
      theme = '财运';
      description = `${stem.name}${branch.name}大运为财运主导的十年。${stem.wuxing}${stem.yinYang}之气当运，财星显现，利于财富积累和事业发展。`;
      keyAdvice = '聚焦财富积累，把握投资机会，注意守财和风险控制。';
    } else if (shiShen === '正官' || shiShen === '七杀') {
      theme = '事业';
      description = `${stem.name}${branch.name}大运为事业发展的关键期。官杀当运，利于职场晋升和权威建立。${shiShen === '七杀' ? '七杀运压力较大，需注意小人和健康。' : ''}`;
      keyAdvice = '专注职业发展，建立权威和影响力，七杀运需防小人。';
    } else if (shiShen === '正印' || shiShen === '偏印') {
      theme = '学习';
      description = `${stem.name}${branch.name}大运利于学习和贵人运。印星当运，适合深造、研究、积累知识，贵人助力明显。`;
      keyAdvice = '适合深造学习，积累知识和人脉资源，偏印运注意不走偏锋。';
    } else if (shiShen === '食神' || shiShen === '伤官') {
      theme = '才华';
      description = `${stem.name}${branch.name}大运利于才华展现与创新。食伤当运，创造力旺盛，适合创业或技术突破。${shiShen === '伤官' ? '伤官运需注意言行分寸和人际关系。' : ''}`;
      keyAdvice = '发挥创造力，适合创业或技术突破，注意言行分寸。';
    } else {
      theme = '综合';
      description = `${stem.name}${branch.name}大运，${stem.wuxing}气当令，比劫运主竞争与合作，是人生重要的一个阶段。`;
      keyAdvice = `顺应${stem.wuxing}行之气，善用同辈力量，整合资源。`;
    }

    return {
      name: `${stem.name}${branch.name}运`,
      ageRange: `${dy.startAge}-${dy.startAge + 10}岁`,
      theme,
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
  strength: StrengthResult,
): string {
  const parts: string[] = [];

  parts.push(`命局${structure.primaryPattern}，日主${strength.level}，运势整体处于${overall.level}期（${overall.score}分）。`);
  const dimLabelMap: Record<string, string> = { '事业': 'career', '财富': 'wealth', '感情': 'relationship', '健康': 'health' };
  const bestScore = overall.dimensions[dimLabelMap[overall.bestDimension] as keyof typeof overall.dimensions] ?? 0;
  const riskScore = overall.dimensions[dimLabelMap[overall.riskDimension] as keyof typeof overall.dimensions] ?? 0;
  parts.push(`最佳领域为${overall.bestDimension}（${bestScore}分），需关注${overall.riskDimension}方面的风险（${riskScore}分）。`);

  if (relations.relations.length > 0) {
    const favRel = relations.relations.filter(r => r.category === 'favorable');
    const unfavRel = relations.relations.filter(r => r.category === 'unfavorable');
    if (favRel.length > 0) parts.push(`有利关系：${favRel.map(r => r.name).join('、')}。`);
    if (unfavRel.length > 0) parts.push(`需注意：${unfavRel.map(r => r.name).join('、')}。`);
  }

  if (climate.needsAdjustment && climate.priority !== 'none') {
    parts.push(`命局需${climate.neededWuxing}调候（${climate.condition}），优先度${climate.priority}。`);
  }

  if (overall.modifiers.length > 0) {
    parts.push(`调整因素：${overall.modifiers.join('；')}。`);
  }

  return parts.join('');
}

// ---- Helpers ----

function avg(yearly: YearlyFortune[], key: keyof YearlyFortune & ('career' | 'wealth' | 'relationship' | 'health')): number {
  return Math.round(yearly.reduce((s, y) => s + (y[key] as number), 0) / yearly.length);
}
