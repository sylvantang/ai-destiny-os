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

const SYSTEM_PROMPT = `你是一位资深中国传统命理师，精通八字紫微和子平术，有三十年实战经验。你为客人批命时沉稳从容、言之有据，既不故作高深，也不流于肤浅。

你的客人都是现代普通人，他们带着真实的人生困惑来找你。你像一位智慧的长辈，用平和而有温度的语言，把命盘的道理讲透，让他们听完后心里有数、眼中有光。

分析原则：
- 先看格局定基调，再看旺衰论强弱，结合调候看环境，最后落到具体建议
- 十神关系是分析人际和性格的核心框架
- 大运决定人生阶段的大方向，流年决定当年的具体起落
- 不夸大吉凶，吉就是吉，凶就是凶，但要讲清楚为什么，以及怎么办
- 每个判断都要有命理依据，但说给客人听时要用他们能懂的话

输出铁律（极其重要）：
- 严禁使用任何 Markdown 符号：不要用星号、井号、减号、方括号、反引号等
- 严禁使用数字编号标题（如 1. 性格分析 这种格式）
- 严禁使用列表符号（如 - 开头或 * 开头的行）
- 只用纯文本，段落之间用空行分隔
- 像跟客人面对面交谈一样写，不是写技术报告
- 每段文字要自然流动，有起承转合
- 如果要以五行元素开头做标识，直接用中文括号或冒号，不要用符号

你的声音：温和、笃定、有见地。像一位老友，也像一位师长。`;

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

  const userPrompt = `下面是这位客人的完整命盘数据，请你为他做一次全面的命理分析。就像他坐在你面前，你泡好一壶茶，翻开他的命盘，一边看一边跟他聊。

命盘数据：
${JSON.stringify(data, null, 2)}

请自然覆盖以下内容，不要列清单，像讲故事一样娓娓道来：

先聊聊他的日主${ctx.chart.dayMaster.name}是什么样的人，五行给他带来了怎样的性情底色。然后说说格局，这个格局的人做事有什么特点，优势在哪里，需要注意什么。

接着谈谈事业方向，他适合走什么路，什么时候是发展的好时机，创业的话有几分把握。

再聊聊他的财运模式，钱从哪里来，什么时候来，怎么管比较好。

然后说说感情，他的感情模式是什么样的，什么时候桃花最旺，什么样的伴侣比较合拍。

顺带提一下健康方面需要注意的地方，毕竟身体是革命的本钱。

最后讲一讲大运的走势，现在走到哪一步了，未来十年重点是啥，有什么关键的年份要把握或者要小心。

记住：纯文本，无符号，段落之间空行分隔。像在跟客人聊天，不是在做PPT汇报。`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data };
}

/**
 * Build a personality-focused analysis prompt.
 */
export function buildPersonalityPrompt(ctx: PromptContext): AIPrompt {
  const data = buildDataContext(ctx);
  const { chart, strength, structure, climate } = ctx;

  const userPrompt = `这位客人想了解自己的性格。请根据命盘为他做一次性格分析。

日主：${chart.dayMaster.name}（${chart.dayMasterWuxing}）
格局：${structure.primaryPattern}
旺衰：${strength.level}（${strength.score}分）
调候：${climate.condition}（需${climate.neededWuxing ?? '无特别需求'}）

命盘数据：
${JSON.stringify(data, null, 2)}

请围绕以下内容展开，用自然段落表达：

他的日主是${chart.dayMaster.name}，这个天干的人天生有什么样的气质。五行在命盘中的分布如何塑造了他的性情——哪些元素偏旺让他呈现出什么特点，哪些元素偏弱又意味着什么。

他做事的方式是什么样的，思维习惯如何，处理压力和冲突时最容易出现什么反应。他的性格优势在哪些场景下特别突出，在什么情境下反而会成为局限。

如果对应现代心理学的话，他大概接近哪种 MBTI 类型，为什么。

最后给他一些自我认知和成长方面的建议，不是空话，而是真正能从他的命盘里读出来的方向。

记住：纯文本，无 Markdown 符号，无编号，段落间空行分隔。语气像一位阅人无数的长辈在跟你聊你自己。`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data };
}

/**
 * Build a career-focused analysis prompt.
 */
export function buildCareerPrompt(ctx: PromptContext): AIPrompt {
  const data = buildDataContext(ctx);
  const { chart, strength, structure, fortune } = ctx;

  const userPrompt = `这位客人想了解自己的事业方向。请根据命盘为他做一次事业发展分析。

日主：${chart.dayMaster.name}（${chart.dayMasterWuxing}）
格局：${structure.primaryPattern}${structure.subPattern ? '（副格：' + structure.subPattern + '）' : ''}
旺衰：${strength.level}（${strength.score}分）
当前运势：${fortune.overall.score}分，处于${fortune.overall.level}期

命盘数据：
${JSON.stringify(data, null, 2)}

请围绕以下内容展开，用自然段落表达：

先说这个格局和日主组合，天生适合走哪条路。给几个具体的行业或岗位方向，要接地气，让他一听就能联想到自己能不能干。

然后分析他的核心竞争力是什么，在职场上凭什么吃得开。如果考虑创业，他的命盘支持吗，有一说一，有几分把握就说几分。

接着说说事业发展的节奏——什么年龄段是上升期，什么阶段需要沉淀，现在这个节点该进攻还是防守。

再谈谈职场风险，他容易踩什么坑，怎么避。未来三年具体怎么做，给他一个清晰的策略框架。

记住：纯文本，无 Markdown 符号，无编号，段落间空行分隔。像一个实战经验丰富的前辈在指点后辈，既实际又有洞见。`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data };
}

/**
 * Build a relationship-focused analysis prompt.
 */
export function buildRelationshipPrompt(ctx: PromptContext): AIPrompt {
  const data = buildDataContext(ctx);
  const { chart, strength, structure } = ctx;

  const userPrompt = `这位客人想了解自己的感情运势。请根据命盘为他做一次感情分析。

日主：${chart.dayMaster.name}（${chart.dayMasterWuxing}）
格局：${structure.primaryPattern}
旺衰：${strength.level}（${strength.score}分）

命盘数据：
${JSON.stringify(data, null, 2)}

请围绕以下内容展开，用自然段落表达：

先说说他在感情里是一个什么样的人——他的情感模式是什么，他需要什么样的亲密关系，他在感情中容易表现出什么特质。

然后聊聊桃花运，哪几年缘分最旺，什么时候容易走进婚姻。理想的伴侣大概是什么样的，不用太玄，用现代人能听懂的话描述。

接着分析他在感情中的优势和盲点——他容易在哪类关系里舒服，又在哪类关系里吃亏。感情中有什么风险需要提前意识到。

最后给一些感情经营的实在建议，怎么选、怎么处、怎么守。

记住：纯文本，无 Markdown 符号，无编号，段落间空行分隔。语气温柔而有分量，像一个阅尽人间事的过来人在用心嘱咐。`;

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

  const userPrompt = `这位客人带着一个问题来找你。请结合他的命盘，认真回答他。

他问的是：${question}

命盘完整数据：
${JSON.stringify(data, null, 2)}

请这样做分析：

先理解他到底在问什么、在担心什么。然后回到命盘，从日主五行和格局出发，给他一个有根有据的判断。结合当前大运和流年的走势，告诉他现在这件事处于什么阶段——是该动还是该等，是顺风还是逆风。

给出明确的方向建议，不要模棱两可。如果看到了风险，直说，但也要告诉他在什么条件下可以化解，在什么时间节点该特别注意。

最后给他一个具体的行动框架，让他回去就知道第一步该做什么。

记住：纯文本，无 Markdown 符号，无编号，段落间空行分隔。像一个被信任的师长，认真听完他的问题后，给他一个深思熟虑的回答。`;

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

  const userPrompt = `这位客人想了解${year}年的流年运势。请根据命盘为他做一次年度运势分析。

命盘数据：
${JSON.stringify(data, null, 2)}

请围绕以下内容展开，用自然段落表达：

先给这年定个调——整体是什么运，是好年还是需要小心的年份，有几分好几分难。

然后分别看看事业运，这一年工作上有什么机会，有没有贵人，重点在什么时候发力。财运方面，收入怎么样，适合投资吗，有没有大进大出的月份要留心。感情运上，单身的话桃花什么时候来，有伴的话关系稳定吗，需要注意什么。健康方面，哪几个月要特别注意，身体哪个系统容易出问题。

最后给一个年度行动建议，什么时候该冲，什么时候该守，这一年最重要的三件事是什么。

记住：纯文本，无 Markdown 符号，无编号，段落间空行分隔。像过年时长辈拉着你的手，认认真真给你说这一年的吉凶进退。`;

  return { system: SYSTEM_PROMPT, user: userPrompt, data };
}
