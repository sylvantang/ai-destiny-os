// ============================================================
// AI Destiny OS — AI Layer: Relationship Analysis
// Attachment style, emotional risks, marriage timing.
// ============================================================

import type { DestinyChart, Wuxing } from '../core/astro/types.js';
import { getShiShen, ALL_STEMS } from '../core/astro/constants.js';
import type { StrengthResult } from '../core/destiny/strengthEngine.js';
import type { StructureResult } from '../core/destiny/structureEngine.js';
import type { RelationResult } from '../core/destiny/relationEngine.js';
import type { PromptContext, AIPrompt } from './promptBuilder.js';
import { buildRelationshipPrompt } from './promptBuilder.js';

export interface RelationshipResult {
  /** Attachment style */
  attachmentStyle: string;
  /** Emotional needs */
  emotionalNeeds: string[];
  /** Ideal partner traits */
  idealPartnerTraits: string[];
  /** Marriage timing */
  marriageTiming: string;
  /** Relationship strengths */
  relationshipStrengths: string[];
  /** Relationship risks */
  relationshipRisks: string[];
  /** Relationship advice */
  advice: string[];
  /** Compatible day master types */
  compatibleTypes: string[];
  /** AI prompt */
  prompt: AIPrompt;
}

/**
 * Analyze relationship patterns from BaZi structure.
 */
export function analyzeRelationship(ctx: PromptContext): RelationshipResult {
  const { chart, strength, structure, relations } = ctx;

  const attachmentStyle = deriveAttachmentStyle(chart, strength);
  const emotionalNeeds = deriveEmotionalNeeds(chart, strength, structure);
  const idealPartnerTraits = deriveIdealPartnerTraits(chart, strength, structure);
  const marriageTiming = deriveMarriageTiming(chart, relations);
  const relationshipStrengths = deriveRelationshipStrengths(chart, relations);
  const relationshipRisks = deriveRelationshipRisks(chart, strength, relations);
  const advice = deriveRelationshipAdvice(chart, strength, structure, relations);
  const compatibleTypes = deriveCompatibleTypes(chart);

  return {
    attachmentStyle,
    emotionalNeeds,
    idealPartnerTraits,
    marriageTiming,
    relationshipStrengths,
    relationshipRisks,
    advice,
    compatibleTypes,
    prompt: buildRelationshipPrompt(ctx),
  };
}

// ---- Analysis Functions ----

function deriveAttachmentStyle(
  chart: DestinyChart,
  strength: StrengthResult,
): string {
  const wx = chart.dayMasterWuxing;
  const yy = chart.dayMaster.yinYang;

  const baseStyle: Record<Wuxing, string> = {
    '木': '安全型依恋倾向 — 在关系中寻求成长和相互支持，能建立稳定的情感连接',
    '火': '热情型依恋倾向 — 感情热烈直接，需要对方的回应和关注来维持情感温度',
    '土': '稳定型依恋倾向 — 重视承诺和安全感，在关系中忠诚可靠但可能略显保守',
    '金': '原则型依恋倾向 — 重视义气和责任感，情感表达可能不够柔软但内心坚定',
    '水': '灵活型依恋倾向 — 感情流动自然，善于适应伴侣，但需注意边界感',
  };

  let style = baseStyle[wx] ?? '均衡型依恋倾向';

  if (yy === '阳') {
    style += '。阳干外向，在关系中更主动表达';
  } else {
    style += '。阴干内敛，情感深沉但表达含蓄';
  }

  if (strength.level === '身弱') {
    style += '，有时需要伴侣更多的情感确认';
  }

  return style;
}

function deriveEmotionalNeeds(
  chart: DestinyChart,
  strength: StrengthResult,
  _structure: StructureResult,
): string[] {
  const wx = chart.dayMasterWuxing;
  const needs: string[] = [];

  const wxNeeds: Record<Wuxing, string[]> = {
    '木': ['被理解和认可', '共同成长的空间', '精神共鸣'],
    '火': ['被关注和赞美', '热情回应', '共同的目标感'],
    '土': ['稳定和安全感', '忠诚和承诺', '实际的关怀'],
    '金': ['尊重和信任', '原则一致性', '精神独立空间'],
    '水': ['深度沟通', '情感流动性', '适度的自由空间'],
  };

  needs.push(...(wxNeeds[wx] ?? ['理解与尊重']));

  if (strength.level === '身弱' || strength.level === '从弱') {
    needs.push('需要更多的支持和鼓励');
  }

  return needs;
}

function deriveIdealPartnerTraits(
  chart: DestinyChart,
  _strength: StrengthResult,
  structure: StructureResult,
): string[] {
  const dm = chart.dayMaster.index;

  // Ideal partner elements: the one that generates the day master (印) or is controlled by day master (财)
  const traits: string[] = [];

  // Based on pattern
  switch (structure.patternShiShen) {
    case '正官':
    case '七杀':
      traits.push('事业有成', '有担当', '稳重可靠');
      break;
    case '正财':
    case '偏财':
      traits.push('务实能干', '会理财', '脚踏实地');
      break;
    case '食神':
    case '伤官':
      traits.push('有才华', '懂欣赏', '精神契合');
      break;
    case '正印':
    case '偏印':
      traits.push('有学识', '善解人意', '包容温和');
      break;
    default:
      traits.push('性格互补', '价值观一致', '共同成长');
  }

  // Based on day master
  const dmName = ALL_STEMS[dm]!.name;
  const dmWx = chart.dayMasterWuxing;
  const generator: Record<Wuxing, Wuxing> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };

  traits.push(`五行${generator[dmWx] ?? '相生'}之人更合`);

  return traits;
}

function deriveMarriageTiming(
  _chart: DestinyChart,
  relations: RelationResult,
): string {
  // In practice, marriage timing comes from DaYun + LiuNian analysis
  // Here we provide general guidance based on the chart structure

  if (relations.relations.some(r => r.name === '财官相生' && r.category === 'favorable')) {
    return '命局财官有力，婚缘较早或婚姻质量较高。通常在25-35岁之间是较好的婚恋窗口期。';
  }

  if (relations.relations.some(r => r.name === '伤官见官')) {
    return '伤官见官，婚恋需更多磨合。建议晚婚（30岁以后）更有利于婚姻稳定。';
  }

  return '婚恋时机与大运流年关系密切。印星旺的年份和官星旺的年份是较好的婚恋窗口。';
}

function deriveRelationshipStrengths(
  _chart: DestinyChart,
  relations: RelationResult,
): string[] {
  const strengths: string[] = [];

  if (relations.relations.some(r => r.name === '官印相生' && r.category === 'favorable')) {
    strengths.push('在关系中善于维护稳定和互相尊重');
  }
  if (relations.relations.some(r => r.name === '食伤生财' && r.category === 'favorable')) {
    strengths.push('善于用行动和创意表达爱意');
  }

  if (strengths.length === 0) {
    strengths.push('真诚待人的品格', '在关系中持续成长的能力', '为关系付出的意愿');
  }

  return strengths;
}

function deriveRelationshipRisks(
  _chart: DestinyChart,
  _strength: StrengthResult,
  relations: RelationResult,
): string[] {
  const risks: string[] = [];

  for (const r of relations.relations) {
    if (r.category === 'unfavorable') {
      switch (r.name) {
        case '伤官见官':
          risks.push('沟通方式可能过于直接，容易伤害亲密关系');
          break;
        case '比劫夺财':
          risks.push('需注意第三方介入影响感情稳定');
          break;
      }
    }
  }

  if (risks.length === 0) {
    risks.push('需注意工作与感情的平衡', '避免因外在压力影响感情质量');
  }

  return risks;
}

function deriveRelationshipAdvice(
  _chart: DestinyChart,
  strength: StrengthResult,
  structure: StructureResult,
  relations: RelationResult,
): string[] {
  const advice: string[] = [];

  if (strength.level === '身弱') {
    advice.push('选择能给予支持和鼓励的伴侣，建立安全的情感基础');
  }

  if (structure.patternShiShen === '正官' || structure.patternShiShen === '七杀') {
    advice.push('在关系中学会柔软，不要总是处于"管理者"角色');
  }

  if (relations.relations.some(r => r.name === '财坏印')) {
    advice.push('不要让财务问题影响感情质量，建立清晰的经济边界');
  }

  advice.push('培养共同的兴趣爱好，增进情感连接');
  advice.push('学会表达需求，避免压抑真实感受');

  return advice;
}

function deriveCompatibleTypes(chart: DestinyChart): string[] {
  const dmWx = chart.dayMasterWuxing;

  // Compatibility based on wuxing cycles
  // Generally: the element that generates you (印) or you generate (食伤) creates harmony
  const generator: Record<Wuxing, Wuxing> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
  const generated: Record<Wuxing, Wuxing> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };

  const genWx = generator[dmWx]!; // 生我 → 提供支持
  const genByWx = generated[dmWx]!; // 我生 → 我能滋养

  const wxNames: Record<Wuxing, string> = {
    '木': '木（甲乙）日主',
    '火': '火（丙丁）日主',
    '土': '土（戊己）日主',
    '金': '金（庚辛）日主',
    '水': '水（壬癸）日主',
  };

  return [
    `${wxNames[genWx]} — 能滋养你，提供情感支持`,
    `${wxNames[genByWx]} — 你能给予能量，关系中有成就感`,
    `${wxNames[dmWx]} — 同类相吸，互相理解最深`,
  ];
}
