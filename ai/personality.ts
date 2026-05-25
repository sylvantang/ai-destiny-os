// ============================================================
// AI Destiny OS — AI Layer: Personality Analysis
// Maps BaZi structure to modern personality frameworks.
// ============================================================

import type { DestinyChart, Wuxing } from '../core/astro/types.js';
import type { StrengthResult } from '../core/destiny/strengthEngine.js';
import type { StructureResult } from '../core/destiny/structureEngine.js';
import type { RelationResult } from '../core/destiny/relationEngine.js';
import type { PromptContext, AIPrompt } from './promptBuilder.js';
import { buildPersonalityPrompt } from './promptBuilder.js';

export interface PersonalityResult {
  /** Core traits derived from the day master */
  coreTraits: string[];
  /** MBTI tendency */
  mbtiTendency: string[];
  /** Dominant work style */
  workStyle: string;
  /** Stress response pattern */
  stressResponse: string;
  /** Key strengths (3-5) */
  strengths: string[];
  /** Growth areas (3-5) */
  growthAreas: string[];
  /** Decision-making style */
  decisionStyle: string;
  /** Social interaction pattern */
  socialPattern: string;
  /** Ready-to-use AI prompt */
  prompt: AIPrompt;
}

/**
 * Analyze personality from BaZi structure.
 *
 * Framework:
 *   Day master wuxing → core temperament
 *   Day master yin/yang → introversion/extraversion tendency
 *   Structure/pattern → behavioral style
 *   Strength level → confidence and energy
 *   十神 distribution → cognitive patterns
 */
export function analyzePersonality(ctx: PromptContext): PersonalityResult {
  const { chart, strength, structure, relations } = ctx;

  const coreTraits = deriveCoreTraits(chart);
  const mbtiTendency = deriveMBTITendency(chart, strength, structure);
  const workStyle = deriveWorkStyle(chart, structure, relations);
  const stressResponse = deriveStressResponse(chart, strength);
  const strengths = deriveStrengths(chart, structure, relations);
  const growthAreas = deriveGrowthAreas(chart, strength, structure, relations);
  const decisionStyle = deriveDecisionStyle(chart, structure);
  const socialPattern = deriveSocialPattern(chart, relations);
  const prompt = buildPersonalityPrompt(ctx);

  return {
    coreTraits,
    mbtiTendency,
    workStyle,
    stressResponse,
    strengths,
    growthAreas,
    decisionStyle,
    socialPattern,
    prompt,
  };
}

// ---- Trait Derivation ----

function deriveCoreTraits(chart: DestinyChart): string[] {
  const wx = chart.dayMasterWuxing;
  const yy = chart.dayMaster.yinYang;

  const wxTraits: Record<Wuxing, string[]> = {
    '木': ['成长导向', '理想主义', '富有同理心', '善于规划'],
    '火': ['热情开朗', '行动力强', '富有感染力', '急躁直率'],
    '土': ['稳重可靠', '务实诚信', '包容性强', '思维缜密'],
    '金': ['果断坚毅', '正义感强', '追求完美', '原则性高'],
    '水': ['智慧深沉', '适应力强', '善于沟通', '灵活变通'],
  };

  const traits = [...(wxTraits[wx] ?? [])];

  if (yy === '阳') {
    traits.push('外显主动', '独立性强');
  } else {
    traits.push('内敛细腻', '合作性好');
  }

  return traits;
}

function deriveMBTITendency(
  chart: DestinyChart,
  strength: StrengthResult,
  structure: StructureResult,
): string[] {
  const wx = chart.dayMasterWuxing;
  const yy = chart.dayMaster.yinYang;
  const pattern = structure.primaryPattern;

  // E/I: 阳 → E, 阴 → I
  const ei = yy === '阳' ? 'E' : 'I';

  // S/N: 土金 → S (务实), 木火水 → N (直觉)
  const sn = (wx === '土' || wx === '金') ? 'S' : 'N';

  // T/F: 金火 → T (理性), 木水土 → F (感性)
  const tf = (wx === '金' || wx === '火') ? 'T' : 'F';

  // J/P: 正官/正印/正财格 → J (规划), 食伤/七杀/偏财格 → P (灵活)
  const isJ = ['正官格', '正印格', '正财格', '七杀格'].includes(pattern);
  const jp = isJ ? 'J' : 'P';

  const primary = ei + sn + tf + jp;

  // Alternate: flip I/E for strength extremes
  const altEi = strength.level === '从旺' ? 'E' : strength.level === '从弱' ? 'I' : (ei === 'E' ? 'I' : 'E');
  const alternate = altEi + sn + tf + jp;

  return [primary, alternate];
}

function deriveWorkStyle(
  _chart: DestinyChart,
  _structure: StructureResult,
  relations: RelationResult,
): string {
  const hasFood = relations.relations.some(r => r.name.includes('食伤'));
  const hasOfficer = relations.relations.some(r => r.name.includes('官'));
  const hasWealth = relations.relations.some(r => r.name.includes('财'));

  if (hasFood && hasWealth) return '创意变现型 — 擅长将想法转化为实际价值，适合自主创业';
  if (hasOfficer && hasWealth) return '管理执行型 — 善于在规范体系中积累资源和地位';
  if (hasFood) return '独立思考型 — 需要创作空间，不喜欢被过度管控';
  if (hasOfficer) return '规则导向型 — 在组织结构中发挥最佳，执行力强';

  return '灵活适应型 — 能根据环境调整工作方式，多面手特质';
}

function deriveStressResponse(
  chart: DestinyChart,
  strength: StrengthResult,
): string {
  const wx = chart.dayMasterWuxing;

  if (strength.level === '身弱' || strength.level === '从弱') {
    return `${wx}性日主偏弱，压力下倾向于内省和寻求支持。建议建立稳定的支持系统和规律的生活节奏。`;
  }

  if (strength.level === '身旺' || strength.level === '从旺') {
    return `${wx}性日主强旺，抗压能力强，但需注意过度自信导致的决策冒进。建议在重大决定前征询他人意见。`;
  }

  return `${wx}性日主中和，压力应对能力适中。建议保持现有的生活工作平衡，避免长期过载。`;
}

function deriveStrengths(
  _chart: DestinyChart,
  structure: StructureResult,
  relations: RelationResult,
): string[] {
  const fav = relations.relations.filter(r => r.category === 'favorable');
  const strengths: string[] = [];

  if (structure.patternShiShen === '正官' || structure.patternShiShen === '七杀') {
    strengths.push('领导力和执行力突出');
  }
  if (structure.patternShiShen === '食神' || structure.patternShiShen === '伤官') {
    strengths.push('创造力和表达能力卓越');
  }
  if (structure.patternShiShen === '正财' || structure.patternShiShen === '偏财') {
    strengths.push('商业嗅觉和理财能力强');
  }
  if (structure.patternShiShen === '正印' || structure.patternShiShen === '偏印') {
    strengths.push('学习能力和思考深度出色');
  }

  if (fav.some(r => r.name.includes('官印'))) strengths.push('善于整合资源和贵人力量');
  if (fav.some(r => r.name.includes('食伤生财'))) strengths.push('擅长将才华转化为收入');

  if (strengths.length === 0) {
    strengths.push('综合能力均衡', '适应性强', '可塑性强');
  }

  return strengths.slice(0, 5);
}

function deriveGrowthAreas(
  _chart: DestinyChart,
  strength: StrengthResult,
  _structure: StructureResult,
  relations: RelationResult,
): string[] {
  const unfav = relations.relations.filter(r => r.category === 'unfavorable');
  const areas: string[] = [];

  if (unfav.some(r => r.name.includes('财坏印'))) {
    areas.push('平衡学习与赚钱的关系');
  }
  if (unfav.some(r => r.name.includes('伤官见官'))) {
    areas.push('管理好与权威的互动方式');
  }
  if (unfav.some(r => r.name.includes('比劫夺财'))) {
    areas.push('注意合作中的利益分配');
  }

  if (strength.level === '身弱') areas.push('建立自信，学会拒绝');
  if (strength.level === '身旺') areas.push('培养耐心，避免冲动决策');

  if (areas.length === 0) {
    areas.push('持续自我提升', '拓展社交圈', '培养多元化技能');
  }

  return areas.slice(0, 5);
}

function deriveDecisionStyle(
  chart: DestinyChart,
  structure: StructureResult,
): string {
  const wx = chart.dayMasterWuxing;
  const pattern = structure.primaryPattern;

  const wxStyle: Record<Wuxing, string> = {
    '木': '凭直觉和价值观决策，重视长期影响',
    '火': '凭热情和冲动决策，行动快于思考',
    '土': '凭经验和稳定性决策，偏好稳妥方案',
    '金': '凭原则和逻辑决策，重视公平正义',
    '水': '凭直觉和灵活性决策，善于随机应变',
  };

  let style = wxStyle[wx] ?? '综合分析后决策';

  if (pattern.includes('官')) style += '，倾向于遵守规则和流程';
  if (pattern.includes('伤')) style += '，倾向于打破常规寻找新方案';

  return style;
}

function deriveSocialPattern(
  _chart: DestinyChart,
  relations: RelationResult,
): string {
  if (relations.dominantTheme.includes('官印相生')) {
    return '社交中有权威感，容易获得信任和尊重，交往圈子偏精英化';
  }
  if (relations.dominantTheme.includes('食伤生财')) {
    return '社交活跃，善于展示才华吸引他人，圈子多元化';
  }
  if (relations.dominantTheme.includes('比劫')) {
    return '重视朋友关系，讲义气，但需注意边界感';
  }
  return '社交模式随环境调整，适应性强，能融入不同类型圈子';
}
