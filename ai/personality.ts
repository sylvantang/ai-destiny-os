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

  if (strength.level === '偏弱' || strength.level === '从弱') {
    return `${wx}性日主偏弱，压力下倾向于内省和寻求支持。建议建立稳定的支持系统和规律的生活节奏。`;
  }

  if (strength.level === '偏旺' || strength.level === '从旺') {
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

  if (strength.level === '偏弱') areas.push('建立自信，学会拒绝');
  if (strength.level === '偏旺') areas.push('培养耐心，避免冲动决策');

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

// ---- Prose Renderer ----

const WX_NATURE: Record<string, string> = {
  '木': '木主仁，像一棵树——向上生长，扎根深远。木性之人天生有一种理想主义的气质，做事有规划，心中有远方。他们对人温和，有同理心，像春天的新芽一样总能看到希望',
  '火': '火主礼，像一团火焰——热情、明亮、有感染力。火性之人走到哪里都是能量的中心，行动力极强，想到就去做。他们直率坦诚，不藏心思，但也因为这份热烈，有时显得急躁',
  '土': '土主信，像大地一样——稳重、厚实、值得信赖。土性之人是最靠谱的朋友和伙伴，做事一步一个脚印，不投机不取巧。他们思维缜密，包容心强，是团队里最稳定的那块基石',
  '金': '金主义，像一把刀——锋利、果决、有原则。金性之人天生有一股英气，做事干脆利落，是非分明。他们追求完美，对自己和他人要求都高，重承诺、讲义气',
  '水': '水主智，像一条河——灵动、深沉、善于变通。水性之人是天生的问题解决者，适应力极强，放到什么环境都能活。他们善于沟通，思路灵活，但也因为太聪明，有时想得太多',
};

function yangNote(wx: string, isYang: boolean): string {
  if (isYang) {
    return `而且${wx}性阳干，气质外显，在人群中比较主动，独立性强，不轻易依赖别人。`;
  }
  return `而且${wx}性阴干，气质内敛，心思细腻但不轻易表露，合作性很好，善于在幕后成就事情。`;
}

function strengthNote(level: string, score: number): string {
  switch (level) {
    case '偏弱': return `从五行力量来看，你目前属于偏弱（${score}分），这意味着你对外界支持的需求比较大。你像一块优质的海绵，吸收能力强，但需要合适的环境来滋养。在熟悉和受支持的领域里，你能发挥出远超分数的实力。`;
    case '从弱': return `你的命局属于从弱格局（${score}分），这是一种特殊的配置——不是真的"弱"，而是顺势而为反而更强。你擅长在复杂环境中借力打力，不硬碰硬，这是你的智慧。`;
    case '中和': return `你的五行力量处于中和状态（${score}分），这是非常好的平衡。不过于刚强也不过于柔弱，意味着你的可塑性很强，大运往哪边走你就能往哪边调整。`;
    case '偏旺': return `从五行力量来看，你属于偏旺（${score}分），能量充沛，承压能力强。你像一棵大树，风吹不倒。不过旺盛也需要疏导——找到合适的出口释放能量，比一味硬撑更健康。`;
    case '从旺': return `你的命局属于从旺格局（${score}分），气势如虹。这种格局的人通常在某方面有突出天赋，顺势而上就能取得超越常人的成就。关键是找到那条"势"在哪里。`;
    default: return `你的五行力量评分为${score}分，属于${level}。这意味着你需要根据自己的强弱特点来调整生活和工作策略。`;
  }
}

function patternNote(pattern: string, subPattern: string | null, patternShiShen: string | null): string {
  const base = `你的格局是${pattern}${subPattern ? '，兼带' + subPattern : ''}。`;
  const detail: Record<string, string> = {
    '正官': '正官格的人做事讲规矩、重信用，在体制内或规范化组织里特别能发挥优势。你天生有一种让人信服的气质，适合承担管理责任。',
    '七杀': '七杀格的人有魄力、有冲劲，是天生的领导者。你的决断力和执行力都很强，只是七杀压力较大，需要学会自我调节，把压力转化为动力。',
    '正财': '正财格的人务实稳重，对财富和资源有天然的敏感度。你做事脚踏实地，不喜欢虚的，一分耕耘一分收获是你的信条。',
    '偏财': '偏财格的人商业嗅觉灵敏，善于发现机会，对市场的波动和趋势有直觉般的把握。你不太适合朝九晚五的死工资模式，更喜欢有弹性和想象空间的工作方式。',
    '正印': '正印格的人有书卷气，好学深思，是终身学习者。你的智慧和学识是你的核心竞争力，适合深耕某个领域成为专家。',
    '偏印': '偏印格的人思维独特，不按常理出牌，在创意和特殊技能方面有天赋。你适合走差异化路线，做别人想不到的事情。',
    '食神': '食神格的人温和有才气，懂得享受生活和创造美好。你的创造力和审美是你的优势，适合在艺术、设计、内容创作等领域发光。',
    '伤官': '伤官格的人才华横溢、不拘一格，是天生的创新者。你的思维跳跃，能看到别人看不到的可能性，但也要注意表达方式，避免因为太直而得罪人。',
  };
  return base + (patternShiShen ? (detail[patternShiShen] ?? '这个格局赋予了你独特的行事风格和人生路径。') : '这个格局赋予了你独特的行事风格和人生路径。');
}

function relationNote(relations: RelationResult): string {
  const favRelations = relations.relations.filter(r => r.category === 'favorable');
  const unfavRelations = relations.relations.filter(r => r.category === 'unfavorable');

  let text = '在人际关系层面，命局中的十神组合揭示了你的社交模式。';
  if (favRelations.length > 0) {
    text += `对你有利的关系是${favRelations.map(r => r.name).join('、')}，${favRelations.map(r => r.description).join('；')}。`;
  }
  if (unfavRelations.length > 0) {
    text += `需要留意的关系是${unfavRelations.map(r => r.name).join('、')}，${unfavRelations.map(r => r.description).join('；')}。`;
  }
  if (relations.dominantTheme) {
    text += `整体来看，你的人际主题是"${relations.dominantTheme}"——这代表了你人生中反复出现的关系模式。`;
  }
  return text;
}

function mbtiNote(mbti: string[]): string {
  return `如果对应现代心理学的人格类型，你最接近${mbti[0]}类型${mbti[1] ? '，在某些情境下也可能表现出' + mbti[1] + '的特征' : ''}。当然，八字比MBTI复杂得多，这只是一个便于理解的参考坐标。`;
}

function growthNote(strengths: string[], growthAreas: string[], decisionStyle: string): string {
  let text = '你的核心优势在于：';
  text += strengths.join('、') + '。';
  if (growthAreas.length > 0) {
    text += `成长空间方面，可以关注：${growthAreas.join('、')}。`;
  }
  text += `做决策时，${decisionStyle}。了解自己的决策模式，就能在关键选择时扬长避短。`;
  return text;
}

/**
 * Render a rule-based natural Chinese prose for personality analysis.
 * Used as fallback when no LLM is available, or as a standalone report.
 */
export function renderPersonalityProse(
  result: PersonalityResult,
  ctx: PromptContext,
): string {
  const { strength, structure, relations } = ctx;
  const dm = strength.dayMaster;
  const wx = dm.wuxing;

  const paragraphs: string[] = [];

  // 1. Opening + day master introduction
  paragraphs.push(
    `我们先从你的日主说起。你是${dm.stem}${wx}日主，属${dm.yinYang}性。` +
    (WX_NATURE[wx] ?? '') +
    '。' +
    yangNote(wx, dm.yinYang === '阳'),
  );

  // 2. Strength analysis
  paragraphs.push(strengthNote(strength.level, strength.strengthScore));

  // 3. Pattern analysis
  paragraphs.push(patternNote(structure.primaryPattern, structure.subPattern, structure.patternShiShen));

  // 4. 十神 / relations
  paragraphs.push(relationNote(relations));

  // 5. MBTI comparison
  paragraphs.push(mbtiNote(result.mbtiTendency));

  // 6. Strengths and growth
  paragraphs.push(growthNote(result.strengths, result.growthAreas, result.decisionStyle));

  // 7. Social pattern
  paragraphs.push(
    `在社交中，${result.socialPattern}。` +
    `工作风格上，${result.workStyle}。` +
    `面对压力时，${result.stressResponse}`,
  );

  // 8. Closing
  paragraphs.push(
    '认识自己的命盘，不是给自己贴标签，而是理解自己的"出厂设置"。' +
    '知道了自己的天赋在哪里、盲点在哪里，就能在人生的关键路口做出更适合自己的选择。' +
    '命理不是宿命，它是你人生地图上的等高线——告诉你哪里有山、哪里有河，但路怎么走，始终在你脚下。',
  );

  return paragraphs.join('\n\n');
}
