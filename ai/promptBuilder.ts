// ============================================================
// AI Destiny OS — AI Layer: Prompt Builder
// Converts structured BaZi results into LLM-ready prompts.
// This is the bridge between deterministic engines and AI.
// ============================================================

import type { DestinyChart } from '../core/astro/types.js';
import { formatBaZi } from '../core/astro/bazi.js';
import { SEXAGENARY_NAMES } from '../core/astro/constants.js';
import type { StrengthResult } from '../core/destiny/strengthEngine.js';
import type { StructureResult } from '../core/destiny/structureEngine.js';
import type { ClimateResult } from '../core/destiny/climateEngine.js';
import type { RelationResult } from '../core/destiny/relationEngine.js';
import type { FortuneResult } from '../core/destiny/fortuneEngine.js';

// ---- Types ----

export interface PromptContext {
  chart: DestinyChart;
  strength: StrengthResult;
  structure: StructureResult;
  climate: ClimateResult;
  relations: RelationResult;
  fortune: FortuneResult;
}

export interface AIPrompt {
  system: string;
  user: string;
  /** All structured data for the LLM to reference */
  data: Record<string, unknown>;
}

// ---- System Prompt ----

const SYSTEM_PROMPT = `你是一位资深的中国传统命理学（八字/子平）分析专家，同时也精通现代心理学和职业咨询。

## 你的角色
- 你基于八字命盘提供专业的人生分析，包括性格、事业、感情、财富、健康等方面
- 你的分析结合了传统命理学智慧和现代科学视角
- 你使用清晰、专业的语言，但保持平易近人

## 分析原则
1. 先看格局，再论旺衰，结合调候
2. 十神关系是分析的核心框架
3. 大运决定人生阶段，流年决定当年吉凶
4. 不夸大吉凶，保持客观中肯
5. 给出具体、可操作的建议，而非空洞的断语

## 输出要求
- 结构清晰，分段论述
- 每个观点要有命理依据
- 使用现代人能理解的语言
- 避免过于玄学的表达
- 给出实用的行动建议`;

// ---- Context Builder ----

/**
 * Build the structured data block for the LLM prompt.
 * This converts all engine results into a format the AI can reason about.
 */
export function buildDataContext(ctx: PromptContext): Record<string, unknown> {
  const { chart, strength, structure, climate, relations, fortune } = ctx;

  return {
    chart: {
      bazi: formatBaZi(chart.bazi),
      yearPillar: SEXAGENARY_NAMES[chart.bazi.year.sexagenaryIndex],
      monthPillar: SEXAGENARY_NAMES[chart.bazi.month.sexagenaryIndex],
      dayPillar: SEXAGENARY_NAMES[chart.bazi.day.sexagenaryIndex],
      hourPillar: SEXAGENARY_NAMES[chart.bazi.hour.sexagenaryIndex],
      dayMaster: `${chart.dayMaster.name}(${chart.dayMasterWuxing})`,
      wuxingDistribution: chart.wuxingCount,
    },
    strength: {
      score: strength.score,
      level: strength.level,
      monthOrder: strength.breakdown.monthOrder,
      roots: strength.breakdown.roots,
      stemSupport: strength.breakdown.stemSupport,
      branchSupport: strength.breakdown.branchSupport,
    },
    structure: {
      primaryPattern: structure.primaryPattern,
      subPattern: structure.subPattern,
      patternShiShen: structure.patternShiShen,
      isFavorable: structure.isFavorable,
    },
    climate: {
      needsAdjustment: climate.needsAdjustment,
      priority: climate.priority,
      neededElement: climate.neededWuxing,
      condition: climate.condition,
    },
    relations: {
      dominantTheme: relations.dominantTheme,
      summary: relations.summary,
      combinations: relations.relations.map(r => ({
        name: r.name,
        category: r.category,
        description: r.description,
      })),
    },
    fortune: {
      overallScore: fortune.overall.score,
      level: fortune.overall.level,
      bestDimension: fortune.overall.bestDimension,
      riskDimension: fortune.overall.riskDimension,
      currentDayun: chart.currentDayun
        ? SEXAGENARY_NAMES[chart.currentDayun.pillar.sexagenaryIndex]
        : null,
    },
    birth: {
      year: chart.birthInfo.year,
      month: chart.birthInfo.month,
      day: chart.birthInfo.day,
      gender: chart.birthInfo.gender,
      city: chart.birthInfo.city ?? '未知',
    },
  };
}

// ---- Analysis Prompt Builders ----

/**
 * Build a comprehensive BaZi analysis prompt.
 */
export function buildComprehensivePrompt(ctx: PromptContext): AIPrompt {
  const data = buildDataContext(ctx);

  const userPrompt = `请基于以下命盘数据进行全面分析：

## 命盘数据
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

请从以下维度进行详细分析：

### 1. 性格分析
- 日主${ctx.chart.dayMaster.name}的特性
- 五行分布对性格的影响
- 格局对行为模式的塑造
- 可能的MBTI倾向

### 2. 事业分析
- 适合的行业和职业方向
- 事业发展的最佳时期
- 职场优势和风险点
- 创业适配度

### 3. 财富分析
- 财富积累模式
- 财运高峰期
- 投资偏好和风险
- 财富管理建议

### 4. 感情分析
- 感情模式和依恋风格
- 婚恋时机
- 伴侣特质
- 感情中的注意点

### 5. 健康分析
- 先天体质倾向
- 需要注意的身体系统
- 健康维护建议

### 6. 大运走势
- 当前大运的影响
- 未来十年的重点
- 人生关键转折点

请给出具体、可操作的建议，而非空洞的断语。`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data };
}

/**
 * Build a personality-focused analysis prompt.
 */
export function buildPersonalityPrompt(ctx: PromptContext): AIPrompt {
  const data = buildDataContext(ctx);
  const { chart, strength, structure, climate } = ctx;

  const userPrompt = `请分析以下命盘的性格特质：

日主：${chart.dayMaster.name}（${chart.dayMasterWuxing}）
格局：${structure.primaryPattern}
旺衰：${strength.level}（${strength.score}分）
调候：${climate.condition}（需${climate.neededWuxing ?? '无特别需求'}）

## 命盘数据
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

请输出：
1. 核心性格特质（200字）
2. 思维模式和行为风格（200字）
3. 优劣势分析（各3点）
4. 压力反应模式（150字）
5. 可能的MBTI倾向及原因（1-2个类型）
6. 自我成长建议（3条）

格式要求：使用清晰的标题，每个部分单独成段。`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data };
}

/**
 * Build a career-focused analysis prompt.
 */
export function buildCareerPrompt(ctx: PromptContext): AIPrompt {
  const data = buildDataContext(ctx);
  const { chart, strength, structure, fortune } = ctx;

  const userPrompt = `请分析以下命盘的事业发展路径：

日主：${chart.dayMaster.name}（${chart.dayMasterWuxing}）
格局：${structure.primaryPattern}${structure.subPattern ? '（副格：' + structure.subPattern + '）' : ''}
旺衰：${strength.level}（${strength.score}分）
当前运势：${fortune.overall.score}分 [${fortune.overall.level}]

## 命盘数据
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

请输出：
1. 职业方向建议（3-5个具体行业/岗位）
2. 创业适配度评分（1-10分）及分析
3. 职场核心竞争力（3项）
4. 事业发展黄金期（具体年份或年龄段）
5. 职场风险提示（3点）
6. 未来3年事业策略`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data };
}

/**
 * Build a relationship-focused analysis prompt.
 */
export function buildRelationshipPrompt(ctx: PromptContext): AIPrompt {
  const data = buildDataContext(ctx);
  const { chart, strength, structure } = ctx;

  const userPrompt = `请分析以下命盘的感情模式和婚恋运势：

日主：${chart.dayMaster.name}（${chart.dayMasterWuxing}）
格局：${structure.primaryPattern}
旺衰：${strength.level}（${strength.score}分）

## 命盘数据
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

请输出：
1. 感情模式分析（依恋风格、情感需求）
2. 婚恋时机（最有婚姻缘的年份）
3. 理想伴侣特质（3-5个关键词）
4. 感情中的优势与盲点
5. 感情风险提示（3点）
6. 感情经营建议`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data };
}

/**
 * Build a strategy prompt for life decisions.
 */
export function buildStrategyPrompt(
  ctx: PromptContext,
  question: string,
): AIPrompt {
  const data = buildDataContext(ctx);

  const userPrompt = `## 用户当前问题
${question}

## 命盘完整数据
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

请基于命盘数据，结合大运走势，对以上问题进行深度分析，给出人生战略建议。

分析要求：
1. 结合日主五行、格局、旺衰给予判断依据
2. 结合当前大运和流年趋势
3. 给出具体的行动建议和时间节点
4. 分析风险点和应对策略
5. 不要模棱两可，给出明确的方向建议`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data };
}

/**
 * Build a yearly fortune prompt.
 */
export function buildYearlyFortunePrompt(
  ctx: PromptContext,
  year: number,
): AIPrompt {
  const data = buildDataContext(ctx);

  const userPrompt = `请分析${year}年的流年运势：

## 命盘数据
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

请从以下维度分析${year}年的运势：
1. 事业运（贵人、机会、挑战）
2. 财运（收入、投资、支出）
3. 感情运（桃花、婚姻、关系）
4. 健康运（注意事项）
5. 每月重点提示
6. 年度行动建议`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data };
}
