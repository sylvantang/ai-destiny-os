// ============================================================
// AI Destiny OS — AI Layer: Prompt Builder
// Builds LLM prompts that translate engine JSON into natural prose.
// The AI's ONLY job is translation — all analysis is pre-computed.
// ============================================================

import type { DestinyChart } from '../core/astro/types.js';
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
  /** The structured report card (engine outputs only) */
  data: Record<string, unknown>;
}

// ---- System Prompt ----

const SYSTEM_PROMPT = `你是一位资深中国传统命理师。你的任务是向客人"翻译"一份已经算好的命理分析报告。

重要：所有命理分析已经由专业引擎计算完成，包括旺衰、格局、调候、十神关系、大运走势。你不需要再做任何分析或判断，你的工作是把这些计算结果用温暖、自然的语言讲给客人听。

就像你去医院体检，检验科已经出了报告，你是那位坐诊的医生——你看着化验单，用病人能听懂的话告诉ta"你的身体是怎么回事，平时该注意什么"。你不需要重新验血，你需要的是解读和沟通。

你的声音：
- 温和、笃定、有见地，像一位老友也像一位师长
- 不说玄学术语，用现代人日常生活能懂的话来解释命理概念
- 五行元素（木火土金水）是你唯一保留的专业词汇，因为它们是命理的通用语言

输出铁律：
- 严禁使用任何 Markdown 符号（星号、井号、减号、方括号、反引号等）
- 严禁使用数字编号标题
- 严禁使用列表符号开头的行
- 只用纯文本，段落之间用空行分隔
- 像在跟客人面对面聊天，不是在做报告
- 每段文字自然流动，有起承转合`;

// ---- Report Card Builder ----

/**
 * Build a "report card" containing ONLY pre-computed engine outputs.
 * The LLM never sees raw chart data — only structured analysis results.
 */
export function buildReportCard(ctx: PromptContext): Record<string, unknown> {
  const { chart, strength, structure, climate, relations, fortune } = ctx;

  return {
    // 客人基本信息（仅用于称呼和语境）
    guest: {
      birthYear: chart.birthInfo.year,
      gender: chart.birthInfo.gender,
    },

    // 旺衰引擎 → 日主强弱完整分析
    strength,

    // 格局引擎 → 命局格局
    structure: {
      primaryPattern: structure.primaryPattern,
      subPattern: structure.subPattern,
      patternShiShen: structure.patternShiShen,
      isSpecial: structure.isSpecial,
      isFavorable: structure.isFavorable,
      analysis: structure.analysis,
    },

    // 调候引擎 → 气候调整需求
    climate,

    // 十神关系引擎 → 命局中的关键关系组合
    relations: {
      dominantTheme: relations.dominantTheme,
      summary: relations.summary,
      details: relations.relations.map(r => ({
        name: r.name,
        category: r.category,
        description: r.description,
      })),
    },

    // 运势引擎 → 完整运势分析
    fortune: {
      overall: fortune.overall,
      keyYears: fortune.keyYears,
      lifePeriods: fortune.lifePeriods.slice(0, 6),
      summary: fortune.summary,
    },
  };
}

// ---- Prompt Builders ----

/**
 * Comprehensive analysis — all dimensions.
 */
export function buildComprehensivePrompt(ctx: PromptContext): AIPrompt {
  const report = buildReportCard(ctx);
  const s = ctx.strength;
  const st = ctx.structure;

  const userPrompt = `下面是一份已经算好的命理分析报告（JSON格式）。请你把它翻译成一段自然流畅的命理讲解，就像客人坐在你面前，你看着报告跟ta娓娓道来。

命理分析报告：
${JSON.stringify(report, null, 2)}

请自然覆盖以下内容，不要列清单，像讲故事一样：

先聊聊他的日主——${s.dayMaster.stem}${s.dayMaster.wuxing}日主，${s.dayMaster.yinYang}性。这个天干的人天生有什么样的气质。结合五行分布和旺衰（他目前是${s.level}），说说他的性情底色是什么样的。

然后说说格局——他的格局是${st.primaryPattern}${st.subPattern ? '，兼带' + st.subPattern : ''}。这个格局的人做事有什么特点，优势在哪里，需要注意什么。

接着谈谈十神关系里揭示的人际模式和人生主题。命局中最关键的组合是什么，这些组合如何影响他的事业、财富和感情。

然后说说事业方向——结合格局和十神，他适合走什么路。什么时候是发展的好时机。如果有创业想法，命盘支持吗。

再聊聊感情模式——他在感情里是一个什么样的人，什么时候缘分比较旺，什么样的伴侣比较合拍。

最后讲一讲大运走势——现在走到哪一步了，未来十年重点是啥，有什么关键的年份要把握或者要小心。

记住：纯文本，无符号，段落之间空行分隔。你不是在分析命盘（已经分析好了），你是在"翻译"一份专业报告给客人听。`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data: report };
}

/**
 * Personality analysis.
 */
export function buildPersonalityPrompt(ctx: PromptContext): AIPrompt {
  const report = buildReportCard(ctx);
  const s = ctx.strength;
  const st = ctx.structure;
  const c = ctx.climate;

  const userPrompt = `下面是一份已经算好的命理分析报告。这位客人想了解自己的性格，请你把相关部分翻译成一段温暖而深刻的人格解读。

命理分析报告：
${JSON.stringify(report, null, 2)}

关键信息速览：
日主：${s.dayMaster.stem}${s.dayMaster.wuxing}（${s.dayMaster.yinYang}性）
格局：${st.primaryPattern}${st.subPattern ? '（兼' + st.subPattern + '）' : ''}
旺衰：${s.level}（${s.score}分）——${s.levelLabel}
调候：${c.condition}${c.needsAdjustment ? '，需' + c.neededWuxing : ''}

请围绕以下内容展开，用自然段落表达：

从他的日主说起——${s.dayMaster.stem}${s.dayMaster.wuxing}这个天干的人天生是什么样的。结合旺衰分析中揭示的扶抑关系，说说五行如何塑造了他的性情。

他的思维模式和行为风格——做事的方式是什么样的，遇到压力时怎么反应，在什么情境下最自在，什么情境下容易消耗。

性格优势和成长点——他在什么地方特别有天赋，在什么地方容易重复同样的模式。结合十神关系中揭示的人际特点来说。

如果对应现代心理学，他大概接近什么人格类型，为什么。

最后给他一些自我认知方面的建议——不是空话，而是从他的命盘结构里能读出来的真实方向。

记住：纯文本，无 Markdown 符号，无编号，段落间空行分隔。你是在解读一份已经完成的性格分析报告，不是在重新分析。`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data: report };
}

/**
 * Career analysis.
 */
export function buildCareerPrompt(ctx: PromptContext): AIPrompt {
  const report = buildReportCard(ctx);
  const s = ctx.strength;
  const st = ctx.structure;
  const f = ctx.fortune;

  const userPrompt = `下面是一份已经算好的命理分析报告。这位客人想了解自己的事业方向，请你把相关部分翻译成一段实用的职业发展解读。

命理分析报告：
${JSON.stringify(report, null, 2)}

关键信息速览：
日主：${s.dayMaster.stem}${s.dayMaster.wuxing}（${s.dayMaster.yinYang}性）
格局：${st.primaryPattern}${st.subPattern ? '（兼' + st.subPattern + '）' : ''}
旺衰：${s.level}（${s.score}分）
当前运势：${f.overall.score}分，${f.overall.level}期——${f.overall.levelLabel}

请围绕以下内容展开，用自然段落表达：

先说这个格局和日主组合，天生适合走哪条路。给几个具体的方向，要接地气，让他一听就能联想到自己能不能干。

然后分析他的核心竞争力是什么——从十神关系和旺衰分析里能看出他在职场上凭什么吃得开。如果考虑创业，命盘中有没有支持，有几分把握。

接着说说事业发展的节奏——结合大运走势，什么年龄段是上升期，什么阶段需要沉淀，现在这个节点该进攻还是防守。

再谈谈职场风险——结合十神关系里的不利组合，他容易踩什么坑，怎么避。未来怎么规划比较稳。

记住：纯文本，无 Markdown 符号，无编号，段落间空行分隔。你是在呈现一份已经完成的事业分析，不是在重新算。`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data: report };
}

/**
 * Relationship analysis.
 */
export function buildRelationshipPrompt(ctx: PromptContext): AIPrompt {
  const report = buildReportCard(ctx);
  const s = ctx.strength;
  const st = ctx.structure;
  const rel = ctx.relations;

  const userPrompt = `下面是一份已经算好的命理分析报告。这位客人想了解自己的感情运势，请你把相关部分翻译成一段温柔而有见地的感情解读。

命理分析报告：
${JSON.stringify(report, null, 2)}

关键信息速览：
日主：${s.dayMaster.stem}${s.dayMaster.wuxing}（${s.dayMaster.yinYang}性）
格局：${st.primaryPattern}
旺衰：${s.level}（${s.score}分）
十神关系：${rel.summary}

请围绕以下内容展开，用自然段落表达：

先说说他在感情里是一个什么样的人——从他的日主和十神关系来看，他的情感模式是什么，他需要什么样的亲密关系。

然后聊聊感情中的优势和盲点——他容易在哪类关系里舒服，又在哪类关系里吃亏。结合十神关系里的提示来说。

接着说说理想的伴侣大概是什么样的——用现代人能听懂的话描述，不要玄学术语。

最后给一些感情经营的实在建议——怎么选、怎么处、怎么守。

记住：纯文本，无 Markdown 符号，无编号，段落间空行分隔。你是在温柔地转述一份感情分析，不是在掐指重算。`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data: report };
}

/**
 * Strategy / life decision analysis — the only prompt where the LLM
 * does some reasoning, but it must ground all conclusions in the report.
 */
export function buildStrategyPrompt(
  ctx: PromptContext,
  question: string,
): AIPrompt {
  const report = buildReportCard(ctx);

  const userPrompt = `下面是一份已经算好的命理分析报告，以及这位客人当前的问题。请你结合报告中的分析结果，给他一个深思熟虑的回答。

客人问的是：${question}

命理分析报告：
${JSON.stringify(report, null, 2)}

请这样做：

先理解他到底在问什么、在担心什么。然后回到报告——日主旺衰是怎么说的，格局是怎么判的，当前运势处于什么阶段。用报告里的结论来回应他的问题，而不是自己重新分析。

结合当前大运和运势评估中的最佳年份/风险年份，告诉他现在这件事处于什么阶段——是该动还是该等，是顺风还是逆风。

给出明确的方向建议，不要模棱两可。如果报告里揭示了风险，直说，但要讲清楚在什么条件下可以化解，在什么时间节点该特别注意。

最后给他一个具体的行动框架，让他回去就知道第一步该做什么。

记住：纯文本，无 Markdown 符号，无编号，段落间空行分隔。你基于报告给出建议，不是凭空论断。`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data: report };
}

/**
 * Yearly fortune analysis for a specific year.
 */
export function buildYearlyFortunePrompt(
  ctx: PromptContext,
  year: number,
): AIPrompt {
  const report = buildReportCard(ctx);

  const userPrompt = `下面是一份已经算好的命理分析报告。这位客人想了解${year}年的流年运势，请你把运势部分翻译成一段自然的年度运势解读。

命理分析报告：
${JSON.stringify(report, null, 2)}

请围绕以下内容展开，用自然段落表达：

先给这年定个调——从报告中的运势评估来看，整体是什么水平，处于什么阶段。是好年还是需要小心的年份。

然后分别看看各个维度——事业运怎么样，有没有贵人，重点在什么时候发力。财运方面，收入怎么样，适合投资吗。感情运上，缘分如何。健康方面，哪个方向需要留意。

如果把报告中未来几年的运势放在一起看，今年在整个走势中处于什么位置——是起点、拐点还是平台期。

最后给一个年度行动建议，这一年最重要的几件事是什么，什么时候该冲，什么时候该守。

记住：纯文本，无 Markdown 符号，无编号，段落间空行分隔。你是在讲述一份已经完成的运势报告，不是在重算流年。`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data: report };
}
