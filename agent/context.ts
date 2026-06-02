// ============================================================
// AI Destiny OS — Agent Layer: Destiny Context Builder
// Pure function: runs all 11 destiny/AI engines from birth info.
// ============================================================

import type { BirthInfo, DestinyChart } from '../core/astro/types.js';
import { calcBaZi, generateChart } from '../core/astro/bazi.js';
import { calcDaYun } from '../core/astro/dayun.js';
import { calcLiuNian } from '../core/astro/liunian.js';

import { analyzeStrength } from '../core/destiny/strengthEngine.js';
import { analyzeStructure } from '../core/destiny/structureEngine.js';
import { analyzeClimate } from '../core/destiny/climateEngine.js';
import { analyzeRelations } from '../core/destiny/relationEngine.js';
import { analyzeFortune } from '../core/destiny/fortuneEngine.js';
import { deriveYongShen } from '../core/destiny/yongShenEngine.js';

import type { PromptContext } from '../ai/promptBuilder.js';
import type { PersonalityResult } from '../ai/personality.js';
import { analyzePersonality } from '../ai/personality.js';
import type { CareerResult } from '../ai/career.js';
import { analyzeCareer } from '../ai/career.js';
import type { RelationshipResult } from '../ai/relationship.js';
import { analyzeRelationship } from '../ai/relationship.js';
import type { StrategyResult } from '../ai/strategy.js';
import { analyzeStrategy } from '../ai/strategy.js';

export interface DestinedContext {
  chart: DestinyChart;
  ctx: PromptContext;
  personality: PersonalityResult;
  career: CareerResult;
  relationship: RelationshipResult;
  strategy: StrategyResult;
}

export function buildDestinyContext(birth: BirthInfo): DestinedContext {
  const bazi = calcBaZi(birth);
  const chart = generateChart(birth);
  const dayun = calcDaYun(birth, bazi.month, bazi.year.stemIndex, bazi.day.stemIndex);

  const currentYear = new Date().getFullYear();
  const liunian = calcLiuNian(bazi, currentYear, currentYear + 5);

  const climate = analyzeClimate(bazi);
  const strength = analyzeStrength(bazi, climate);
  const structure = analyzeStructure(bazi, strength);
  const relations = analyzeRelations(bazi);
  const fortune = analyzeFortune(bazi, strength, structure, climate, relations, dayun, liunian);
  const yongShen = deriveYongShen(bazi, strength, structure, climate);

  const ctx: PromptContext = { chart, strength, structure, climate, relations, fortune, yongShen };

  const personality = analyzePersonality(ctx);
  const career = analyzeCareer(ctx);
  const relationship = analyzeRelationship(ctx);
  const strategy = analyzeStrategy(ctx, personality, career, relationship);

  return { chart, ctx, personality, career, relationship, strategy };
}
