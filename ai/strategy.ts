// ============================================================
// AI Destiny OS — AI Layer: Strategy Analysis (人生战略引擎)
// Life decisions: city/country choices, major moves, timing.
// The most advanced analysis module.
// ============================================================

import type { DestinyChart, Wuxing } from '../core/astro/types.js';
import { SEXAGENARY_NAMES } from '../core/astro/constants.js';
import type { StrengthResult } from '../core/destiny/strengthEngine.js';
import type { ClimateResult } from '../core/destiny/climateEngine.js';
import type { FortuneResult } from '../core/destiny/fortuneEngine.js';
import type { PromptContext, AIPrompt } from './promptBuilder.js';
import { buildStrategyPrompt } from './promptBuilder.js';
import type { PersonalityResult } from './personality.js';
import type { CareerResult } from './career.js';
import type { RelationshipResult } from './relationship.js';

export interface StrategyResult {
  /** City/country recommendations */
  locationAdvice: LocationAdvice[];
  /** Current life phase analysis */
  currentPhase: LifePhase;
  /** Recommended actions for next 3 years */
  actionPlan: ActionPlan;
  /** Decision-making framework based on chart */
  decisionFramework: string;
  /** AI prompt for the user's specific question */
  prompt: AIPrompt;
}

export interface LocationAdvice {
  location: string;
  direction: string; // 八卦方位
  element: Wuxing;
  fit: number; // 1-10
  reason: string;
}

export interface LifePhase {
  name: string;
  description: string;
  focus: string[];
  avoid: string[];
}

export interface ActionPlan {
  year1: ActionItem[];
  year2: ActionItem[];
  year3: ActionItem[];
}

export interface ActionItem {
  domain: string;
  action: string;
  priority: '高' | '中' | '低';
}

/**
 * Analyze life strategy combining all other analyses.
 *
 * This is the "CEO-level" analysis that integrates every dimension
 * into actionable strategic advice.
 */
export function analyzeStrategy(
  ctx: PromptContext,
  personality: PersonalityResult,
  career: CareerResult,
  relationship: RelationshipResult,
  question?: string,
): StrategyResult {
  const { chart, strength, climate, fortune } = ctx;

  const locationAdvice = analyzeLocations(chart, climate, strength);
  const currentPhase = analyzeCurrentPhase(chart, fortune, strength);
  const actionPlan = buildActionPlan(chart, fortune, career, relationship);
  const decisionFramework = buildDecisionFramework(chart, personality);

  const prompt = question
    ? buildStrategyPrompt(ctx, question)
    : buildStrategyPrompt(ctx, '请给出当前阶段的人生战略建议');

  return {
    locationAdvice,
    currentPhase,
    actionPlan,
    decisionFramework,
    prompt,
  };
}

// ---- Location Analysis ----

function analyzeLocations(
  chart: DestinyChart,
  climate: ClimateResult,
  strength: StrengthResult,
): LocationAdvice[] {
  const dmWx = chart.dayMasterWuxing;
  const advice: LocationAdvice[] = [];

  // Direction-element mapping (八卦方位 → 五行)
  const directions: [string, string, Wuxing, string][] = [
    ['东方', '东', '木', '木主生发，东方木气旺盛'],
    ['南方', '南', '火', '火主文明，南方火气旺盛'],
    ['中部', '中', '土', '土主中和，中部土气厚重'],
    ['西方', '西', '金', '金主义利，西方金气刚健'],
    ['北方', '北', '水', '水主智慧，北方水气灵动'],
  ];

  // Elements that benefit the day master
  const generator: Record<Wuxing, Wuxing> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
  const generated: Record<Wuxing, Wuxing> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  const same = dmWx;
  const gen = generator[dmWx]!;

  // Prioritize climate needs
  if (climate.needsAdjustment && climate.neededWuxing) {
    const neededWx = climate.neededWuxing as Wuxing;
    for (const [name, dir, wx, reason] of directions) {
      if (wx === neededWx) {
        advice.push({ location: `${name}地区（${dir}）`, direction: dir, element: wx, fit: 10, reason: `${reason}，调候急需${neededWx}` });
      }
    }
  }

  // Strength-based
  let favorableWx: Wuxing[];
  if (strength.level === '偏弱' || strength.level === '从弱') {
    favorableWx = [gen, same]; // Need support
  } else {
    favorableWx = [generated[dmWx]!, gen]; // Need expression or support
  }

  for (const [name, dir, wx, reason] of directions) {
    if (advice.some(a => a.direction === dir)) continue; // already added from climate
    const fit = favorableWx.includes(wx) ? 8 : wx === same ? 7 : 5;
    advice.push({ location: `${name}地区（${dir}）`, direction: dir, element: wx, fit, reason });
  }

  return advice.sort((a, b) => b.fit - a.fit);
}

// ---- Life Phase Analysis ----

function analyzeCurrentPhase(
  chart: DestinyChart,
  fortune: FortuneResult,
  _strength: StrengthResult,
): LifePhase {
  const currentDayun = chart.currentDayun;
  const level = fortune.overall.level;

  const dayunName = currentDayun
    ? (SEXAGENARY_NAMES[currentDayun.pillar.sexagenaryIndex] ?? '大运')
    : '当前大运';

  let description: string;
  let focus: string[];
  let avoid: string[];

  switch (level) {
    case '高峰':
      description = `正处于${dayunName}的黄金期，运势高峰，适合大胆行动。`;
      focus = ['全力推进核心目标', '扩展事业版图', '投资布局', '建立关键人脉'];
      avoid = ['过度保守错失机会', '高调行事引来是非'];
      break;
    case '上升':
      description = `${dayunName}运势上升期，机遇逐渐展开。`;
      focus = ['夯实基础能力', '积极寻求机会', '规划中长期目标', '学习新技能'];
      avoid = ['急于求成', '分散精力'];
      break;
    case '平缓':
      description = `${dayunName}运势平稳，宜守不宜攻。`;
      focus = ['提升内在修养', '维护现有成果', '精细化管理', '健康投资'];
      avoid = ['冒险投资', '剧烈变动'];
      break;
    case '低谷':
      description = `${dayunName}运势低谷期，需要智慧和耐心。`;
      focus = ['韬光养晦', '学习和积累', '维护核心关系', '健康管理'];
      avoid = ['重大投资决策', '冲动跳槽创业'];
      break;
    default:
      description = `${dayunName}运势变化期，需灵活应对。`;
      focus = ['顺势而为', '保持耐心'];
      avoid = ['极端决策'];
      break;
  }

  return { name: dayunName, description, focus, avoid };
}

// ---- Action Plan ----

function buildActionPlan(
  _chart: DestinyChart,
  fortune: FortuneResult,
  career: CareerResult,
  relationship: RelationshipResult,
): ActionPlan {
  const now = new Date();
  const currentYear = now.getFullYear();

  const bestDim = fortune.overall.bestDimension;
  const riskDim = fortune.overall.riskDimension;

  return {
    year1: buildYearActions(currentYear, bestDim, riskDim, career, relationship, 1),
    year2: buildYearActions(currentYear + 1, bestDim, riskDim, career, relationship, 2),
    year3: buildYearActions(currentYear + 2, bestDim, riskDim, career, relationship, 3),
  };
}

function buildYearActions(
  year: number,
  bestDim: string,
  riskDim: string,
  career: CareerResult,
  relationship: RelationshipResult,
  _offset: number,
): ActionItem[] {
  const actions: ActionItem[] = [];

  // Career actions
  if (bestDim === '事业') {
    actions.push({ domain: '事业', action: `${year}年重点推进职业目标，${career.industries[0]?.industry ?? '核心行业'}方向优先`, priority: '高' });
  } else {
    actions.push({ domain: '事业', action: `巩固职场地位，提升${career.competitiveAdvantage[0] ?? '核心竞争力'}`, priority: '中' });
  }

  // Wealth actions
  if (bestDim === '财富') {
    actions.push({ domain: '财富', action: `把握投资机会，重点配置${career.riskProfile.includes('高风险') ? '权益类' : '稳健型'}资产`, priority: '高' });
  } else {
    actions.push({ domain: '财富', action: '保持稳健理财，建立应急储备', priority: '中' });
  }

  // Relationship actions
  if (riskDim === '感情') {
    actions.push({ domain: '感情', action: relationship.relationshipRisks[0] ?? '加强情感沟通', priority: '高' });
  } else {
    actions.push({ domain: '感情', action: '维护亲密关系，定期创造有质量的相处时间', priority: '中' });
  }

  // Health
  actions.push({ domain: '健康', action: '保持规律作息和运动习惯，每年体检', priority: '中' });

  return actions;
}

// ---- Decision Framework ----

function buildDecisionFramework(
  chart: DestinyChart,
  personality: PersonalityResult,
): string {
  const wx = chart.dayMasterWuxing;
  const mbti = personality.mbtiTendency[0] ?? '未知';

  const wxFramework: Record<Wuxing, string> = {
    '木': '做决定时关注长期成长价值，问自己"3年后这会让我变得更好吗？"',
    '火': '做决定时给自己24小时冷静期，避免因一时热情冲动选择',
    '土': '做决定时留出10%的弹性空间，不要因为追求稳定而错过机会',
    '金': '做决定时考虑各方利益平衡，不要因为原则而失去灵活性',
    '水': '做决定时设定明确的时间节点，避免因过度思考而拖延',
  };

  const framework = wxFramework[wx] ?? '综合分析利弊后决策，兼顾理性与直觉';

  return `决策框架（基于${chart.dayMaster.name}日主 + ${mbti}倾向）：

1. 信息收集阶段：全面了解选项的利弊
2. 价值对齐阶段：确认选择是否符合长期人生目标
3. 行动验证阶段：小步试错，快速迭代

核心原则：${framework}`;
}

// ---- Prose Renderer ----

function locationNote(advice: LocationAdvice[]): string {
  if (advice.length === 0) return '';

  let text = '从五行方位来看，';
  const top = advice.slice(0, 3);
  text += top.map(a => `${a.location}（契合度${a.fit}分）`).join('、') + '是最有利于你的方位。';

  const best = advice[0];
  if (best && best.fit >= 9) {
    text += `尤其是${best.location}，${best.reason}，如果在考虑搬迁或发展方向，可以重点考虑这个方位。`;
  }

  return text;
}

function phaseNote(phase: LifePhase): string {
  return `你当前处于"${phase.name}"，${phase.description}` +
    `这个阶段的核心任务是：${phase.focus.join('、')}。` +
    `需要避免的是：${phase.avoid.join('、')}。`;
}

function actionPlanNote(plan: ActionPlan, currentYear: number): string {
  let text = '接下来三年的行动框架如下：\n\n';

  text += `${currentYear}年：`;
  text += plan.year1.map(a => `${a.domain}方面——${a.action}（优先级${a.priority}）`).join('；') + '。\n\n';

  text += `${currentYear + 1}年：`;
  text += plan.year2.map(a => `${a.domain}方面——${a.action}（优先级${a.priority}）`).join('；') + '。\n\n';

  text += `${currentYear + 2}年：`;
  text += plan.year3.map(a => `${a.domain}方面——${a.action}（优先级${a.priority}）`).join('；') + '。';

  return text;
}

export function renderStrategyProse(
  result: StrategyResult,
  _ctx: PromptContext,
): string {
  const paragraphs: string[] = [];

  // 1. Current phase
  paragraphs.push(
    '人生战略的核心是"在对的时间做对的事"。' +
    phaseNote(result.currentPhase),
  );

  // 2. Location advice
  const locNote = locationNote(result.locationAdvice);
  if (locNote) {
    paragraphs.push(locNote);
  }

  // 3. Action plan
  const currentYear = new Date().getFullYear();
  paragraphs.push(actionPlanNote(result.actionPlan, currentYear));

  // 4. Decision framework
  paragraphs.push(result.decisionFramework);

  // 5. Closing
  paragraphs.push(
    '战略不是一成不变的蓝图，而是一套动态的决策原则。' +
    '命盘给了你方向和节奏的参考，但具体的每一步，需要你根据实际情况灵活调整。' +
    '记住：运气好的时候多做事，运气平的时候多学习，运气差的时候守住底线。' +
    '人生的主动权，始终在你手里。',
  );

  return paragraphs.join('\n\n');
}
