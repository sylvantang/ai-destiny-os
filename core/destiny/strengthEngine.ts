// ============================================================
// AI Destiny OS — Destiny Engine: Strength Analysis (旺衰引擎)
// Evaluates day master strength considering month order, roots,
// stem/branch support, weakening, and earthly branch interactions.
// ============================================================

import type { BaZi, EarthlyBranchIndex, HeavenlyStemIndex, Wuxing } from '../astro/types.js';
import { ALL_STEMS, HIDDEN_STEMS, getShiShen } from '../astro/constants.js';
import { isClash, isCombination, COMBINATION_WUXING, getPunishment, isHarm } from '../astro/earthlyBranchRelations.js';
import type { ClimateResult } from './climateEngine.js';

// ---- Types ----

export type StrengthLevel = '从弱' | '偏弱' | '中和' | '偏旺' | '从旺';

export interface StrengthFactor {
  name: string;
  category: 'support' | 'weaken' | 'interaction';
  score: number;
  description: string;
}

export interface StrengthResult {
  dayMaster: { stem: string; wuxing: string; yinYang: string };
  strengthScore: number;
  level: StrengthLevel;
  levelLabel: string;
  factors: StrengthFactor[];
  monthOrder: {
    branch: string;
    wuxing: string;
    relation: string;
    score: number;
    description: string;
  };
  roots: Array<{ pillar: string; branch: string; stem: string; depth: string; score: number }>;
  stemSupport: Array<{ pillar: string; stem: string; relation: string; score: number }>;
  branchSupport: { score: number; description: string };
  weakening: Array<{ pillar: string; stem: string; reason: string; score: number }>;
  scoring: {
    base: number;
    monthOrder: number;
    seasonalState: number;
    twelveStage: number;
    touGan: number;
    roots: number;
    stemSupport: number;
    branchSupport: number;
    weakening: number;
    climateAdjustment: number;
    total: number;
  };
  summary: string;
}

// ---- Seasonal State (旺相休囚死) ----

type SeasonalState = '旺' | '相' | '休' | '囚' | '死';

interface SeasonalEvaluation {
  state: SeasonalState;
  modifier: number;
  description: string;
}

/** Season ruler element: 春木 夏火 秋金 冬水 */
function getSeasonRuler(monthBranch: EarthlyBranchIndex): Wuxing {
  // 寅卯辰=春→木, 巳午未=夏→火, 申酉戌=秋→金, 亥子丑=冬→水
  if (monthBranch >= 2 && monthBranch <= 4) return '木';
  if (monthBranch >= 5 && monthBranch <= 7) return '火';
  if (monthBranch >= 8 && monthBranch <= 10) return '金';
  return '水';
}

/**
 * 旺相休囚死 lookup: [seasonRuler][dayMasterWuxing] → SeasonalEvaluation
 *
 *  当令者旺 — the seasonal ruler element is 旺
 *  令生者相 — what the ruler generates is 相 (secondary strength)
 *  生令者休 — what generates the ruler is 休 (drained)
 *  克令者囚 — what controls the ruler is 囚 (restrained)
 *  令克者死 — what the ruler controls is 死 (weakest)
 */
function getSeasonalState(
  dmWx: Wuxing,
  monthBranch: EarthlyBranchIndex,
): SeasonalEvaluation {
  const ruler = getSeasonRuler(monthBranch);
  const dm = dmWx;

  // Same element as ruler → 旺
  if (dm === ruler) {
    return { state: '旺', modifier: 5, description: `日主${dm}当令而旺，得${ruler}气加持` };
  }

  // Ruler generates dm → 相
  if (generates(ruler, dm)) {
    return { state: '相', modifier: 3, description: `日主${dm}次旺，受当令${ruler}气所生` };
  }

  // Dm generates ruler → 休
  if (generates(dm, ruler)) {
    return { state: '休', modifier: -3, description: `日主${dm}泄气于当令${ruler}，季节不助` };
  }

  // Dm controls ruler → 囚
  if (controls(dm, ruler)) {
    return { state: '囚', modifier: -5, description: `日主${dm}受当令${ruler}所制，季节不利` };
  }

  // Ruler controls dm → 死
  return { state: '死', modifier: -8, description: `日主${dm}被当令${ruler}所克，季节最弱` };
}

// ---- 十二长生 (12 Growth Stages) ----

/**
 * 十二长生分支索引表.
 * For each heavenly stem (0-9), an array of 12 earthly branch indices
 * representing stages 0-11: 长生→沐浴→冠带→临官→帝旺→衰→病→死→墓→绝→胎→养.
 *
 * Yang stems (甲丙戊庚壬) go forward (clockwise).
 * Yin stems (乙丁己辛癸) go backward (counter-clockwise).
 *
 * 戊随丙, 己随丁.
 */
const TWELVE_STAGE_BRANCHES: Record<HeavenlyStemIndex, EarthlyBranchIndex[]> = {
  // 甲: 亥子丑寅卯辰巳午未申酉戌 → 长生沐浴冠带临官帝旺衰病死墓绝胎养
  0: [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  // 乙: 午巳辰卯寅丑子亥戌酉申未 → (reverse order)
  1: [6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8, 7],
  // 丙: 寅卯辰巳午未申酉戌亥子丑
  2: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1],
  // 丁: 酉申未午巳辰卯寅丑子亥戌
  3: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 11, 10],
  // 戊: 同丙 (寅卯辰巳午未申酉戌亥子丑)
  4: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1],
  // 己: 同丁 (酉申未午巳辰卯寅丑子亥戌)
  5: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 11, 10],
  // 庚: 巳午未申酉戌亥子丑寅卯辰
  6: [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4],
  // 辛: 子亥戌酉申未午巳辰卯寅丑
  7: [0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  // 壬: 申酉戌亥子丑寅卯辰巳午未
  8: [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7],
  // 癸: 卯寅丑子亥戌酉申未午巳辰
  9: [3, 2, 1, 0, 11, 10, 9, 8, 7, 6, 5, 4],
};

const STAGE_NAMES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'] as const;

/** Score for each of the 12 stages. 临官/帝旺 strongest, 绝 weakest. */
const STAGE_SCORES: Record<number, number> = {
  0: 4,   // 长生 — new growth
  1: 1,   // 沐浴 — unstable
  2: 4,   // 冠带 — maturing
  3: 8,   // 临官 — prosperity (禄)
  4: 10,  // 帝旺 — peak (旺)
  5: 0,   // 衰 — decline
  6: -4,  // 病 — sickness
  7: -6,  // 死 — death
  8: -6,  // 墓 — tomb
  9: -8,  // 绝 — extinction
  10: -2, // 胎 — conception
  11: -2, // 养 — nurturing
};

function getTwelveStageIndex(stem: HeavenlyStemIndex, branch: EarthlyBranchIndex): number {
  return TWELVE_STAGE_BRANCHES[stem].indexOf(branch);
}

/** Analyze day stem's 十二长生 state on the day branch (日干坐日支). */
function analyzeTwelveStages(bazi: BaZi): StrengthFactor {
  const dm = bazi.day.stemIndex;
  const dayBranch = bazi.day.branchIndex;
  const stageIdx = getTwelveStageIndex(dm, dayBranch);
  const stageName = STAGE_NAMES[stageIdx]!;
  const score = STAGE_SCORES[stageIdx]!;

  return {
    name: `十二长生·${stageName}`,
    category: score >= 0 ? 'support' : 'weaken',
    score,
    description: `日主${ALL_STEMS[dm]!.name}坐${bazi.day.branch.name}为${stageName}之地`,
  };
}

// ---- Constants ----

const LEVEL_LABELS: Record<StrengthLevel, string> = {
  '从弱': '日主极弱，顺从克泄耗之势，不宜生扶',
  '偏弱': '日主偏弱，喜生扶助力，忌克泄耗',
  '中和': '日主不弱不旺，平衡为贵，大运走向决定强弱',
  '偏旺': '日主偏旺，喜克泄耗平衡，忌再生扶',
  '从旺': '日主极旺，顺其旺势，不宜克制',
};

// ---- Main ----

export function analyzeStrength(bazi: BaZi, climate?: ClimateResult): StrengthResult {
  const dm = bazi.day.stemIndex;
  const dmStem = ALL_STEMS[dm]!;
  const dmWx = dmStem.wuxing;

  const monthOrder = analyzeMonthOrder(dmWx, bazi.month.branch.wuxing, bazi.month.branch.name);
  const roots = analyzeRoots(bazi, dm);
  const stemSupport = analyzeStemSupport(bazi, dmWx);
  const branchSupport = analyzeBranchSupport(bazi, dmWx);
  const weakening = analyzeWeakening(bazi, dmWx);

  // 旺相休囚死 seasonal state
  const seasonal = getSeasonalState(dmWx, bazi.month.branchIndex);

  // 刑冲合害 interaction factors
  const interactions = analyzeInteractions(bazi, dmWx);

  // 十二长生: day stem sitting on day branch
  const twelveStage = analyzeTwelveStages(bazi);

  // Climate adjustment (调候联动)
  const climateFactor = climate ? buildClimateFactor(climate, bazi) : null;

  // 透干联动: month dominant stem appearing on heavenly stem
  const touGanFactor = buildTouGanFactor(bazi);

  // Assemble all factors into a flat array
  const factors: StrengthFactor[] = [
    { name: '月令', category: 'support', score: monthOrder.score, description: monthOrder.description },
    { name: '基础分', category: 'support', score: 35, description: '基础旺衰分' },
    {
      name: `季节状态·${seasonal.state}`,
      category: seasonal.modifier >= 0 ? 'support' : 'weaken',
      score: seasonal.modifier,
      description: seasonal.description,
    },
    twelveStage,
    ...roots.map(r => ({
      name: `通根·${r.pillar}`,
      category: 'support' as const,
      score: r.score,
      description: `${r.pillar}${r.branch}藏${r.stem}(${r.depth})`,
    })),
    ...stemSupport.map(s => ({
      name: `天干·${s.pillar}`,
      category: 'support' as const,
      score: s.score,
      description: `${s.pillar}${s.stem}${s.relation}`,
    })),
    { name: '地支助力', category: 'support', score: branchSupport.score, description: branchSupport.description },
    ...weakening.map(w => ({
      name: `克制·${w.pillar}`,
      category: 'weaken' as const,
      score: -w.score,
      description: `${w.pillar}${w.stem}${w.reason}`,
    })),
    ...(climateFactor ? [climateFactor] : []),
    ...(touGanFactor ? [touGanFactor] : []),
    ...interactions,
  ];

  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  const clampedScore = Math.max(0, Math.min(100, totalScore));
  const level = scoreToLevel(clampedScore);

  const scoring = {
    base: 35,
    monthOrder: monthOrder.score,
    seasonalState: seasonal.modifier,
    roots: roots.reduce((s, r) => s + r.score, 0),
    stemSupport: stemSupport.reduce((s, r) => s + r.score, 0),
    branchSupport: branchSupport.score,
    weakening: weakening.reduce((s, w) => s + w.score, 0),
    twelveStage: twelveStage.score,
    touGan: touGanFactor?.score ?? 0,
    climateAdjustment: climateFactor?.score ?? 0,
    total: clampedScore,
  };

  return {
    dayMaster: { stem: dmStem.name, wuxing: dmWx, yinYang: dmStem.yinYang },
    strengthScore: clampedScore,
    level,
    levelLabel: LEVEL_LABELS[level],
    factors,
    monthOrder,
    roots,
    stemSupport,
    branchSupport,
    weakening,
    scoring,
    summary: buildSummary(dmStem.name, dmWx, clampedScore, level, monthOrder, roots, stemSupport, weakening),
  };
}

function buildClimateFactor(climate: ClimateResult, bazi: BaZi): StrengthFactor | null {
  if (!climate.needsAdjustment || climate.priority === 'none') return null;

  // Check if the needed wuxing is present in the chart
  const hasNeeded = checkWuxingPresence(bazi, climate.neededWuxing);

  let score: number;
  let description: string;

  switch (climate.priority) {
    case 'high':
      score = hasNeeded ? -6 : -10;
      description = hasNeeded
        ? `调候急需${climate.neededWuxing}（${climate.condition}），命局已有${climate.neededWuxing}，部分缓解`
        : `调候急需${climate.neededWuxing}（${climate.condition}），命局缺乏，严重不利日主`;
      break;
    case 'medium':
      score = hasNeeded ? -3 : -5;
      description = hasNeeded
        ? `调候需${climate.neededWuxing}（${climate.condition}），命局已有，影响较小`
        : `调候需${climate.neededWuxing}（${climate.condition}），命局暂无`;
      break;
    case 'low':
      score = -2;
      description = `调候${climate.condition}，影响轻微`;
      break;
    default:
      return null;
  }

  return {
    name: '调候修正',
    category: 'weaken',
    score,
    description,
  };
}

/** Check if a wuxing element is present in the chart's stems or branches */
function checkWuxingPresence(bazi: BaZi, wx: string | null): boolean {
  if (!wx) return false;
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  return pillars.some(p => p.stem.wuxing === wx || p.branch.wuxing === wx);
}

// ---- 透干联动 (Stem Revelation Feedback) ----

/**
 * If the month branch's dominant hidden stem appears on a heavenly stem (透干),
 * the 十神 it represents amplifies its influence on the day master's strength.
 *
 * 印/比 → supports day master (+3 to +5)
 * 食伤/财/官杀 → drains or controls day master (-3 to -6)
 */
function buildTouGanFactor(bazi: BaZi): StrengthFactor | null {
  const monthHidden = HIDDEN_STEMS[bazi.month.branchIndex];
  if (!monthHidden || monthHidden.length === 0) return null;

  const dominantStem = monthHidden[0]!.stem as HeavenlyStemIndex;
  const stems: HeavenlyStemIndex[] = [
    bazi.year.stemIndex,
    bazi.month.stemIndex,
    bazi.hour.stemIndex,
  ];
  const isTouGan = stems.includes(dominantStem);

  if (!isTouGan) return null;

  const dm = bazi.day.stemIndex;
  const shiShen = getShiShen(dm, dominantStem);
  const stemName = ALL_STEMS[dominantStem]!.name;

  let score: number;
  let description: string;

  switch (shiShen) {
    case '正印':
    case '偏印':
      score = 5;
      description = `月令${stemName}(${shiShen})透干，印星生扶日主`;
      break;
    case '比肩':
    case '劫财':
      score = 3;
      description = `月令${stemName}(${shiShen})透干，比劫助身`;
      break;
    case '食神':
    case '伤官':
      score = -4;
      description = `月令${stemName}(${shiShen})透干，食伤泄气`;
      break;
    case '正财':
    case '偏财':
      score = -3;
      description = `月令${stemName}(${shiShen})透干，财星耗身`;
      break;
    case '正官':
    case '七杀':
      score = -6;
      description = `月令${stemName}(${shiShen})透干，官杀克身`;
      break;
    default:
      return null;
  }

  return {
    name: '透干联动',
    category: score >= 0 ? 'support' : 'weaken',
    score,
    description,
  };
}

// ---- 刑冲合害 Analysis ----

function analyzeInteractions(bazi: BaZi, dmWx: string): StrengthFactor[] {
  const branches: Array<{ label: string; idx: EarthlyBranchIndex }> = [
    { label: '年支', idx: bazi.year.branchIndex },
    { label: '月支', idx: bazi.month.branchIndex },
    { label: '日支', idx: bazi.day.branchIndex },
    { label: '时支', idx: bazi.hour.branchIndex },
  ];

  const factors: StrengthFactor[] = [];

  // Check all 6 branch pairs (年-月, 年-日, 年-时, 月-日, 月-时, 日-时)
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const a = branches[i]!;
      const b = branches[j]!;

      // 六冲: weakens both, reduces stability. Score: -8
      if (isClash(a.idx, b.idx)) {
        factors.push({
          name: `${a.label}${b.label}相冲`,
          category: 'interaction',
          score: -8,
          description: `${a.label}与${b.label}六冲，根基不稳`,
        });
        continue;
      }

      // 六合: can be favorable or unfavorable depending on whether the
      // combined element supports the day master. Score: +/-5
      if (isCombination(a.idx, b.idx)) {
        const key = `${a.idx},${b.idx}`;
        const combinedWx = COMBINATION_WUXING[key] ?? '';
        const supports = combinedWx === dmWx || generates(combinedWx, dmWx);
        factors.push({
          name: `${a.label}${b.label}相合`,
          category: 'interaction',
          score: supports ? 5 : -5,
          description: supports
            ? `${a.label}${b.label}六合，化${combinedWx}生扶日主`
            : `${a.label}${b.label}六合，化${combinedWx}削弱日主`,
        });
        continue;
      }

      // 三刑: always unfavorable. Score: -6
      const punishment = getPunishment(a.idx, b.idx);
      if (punishment) {
        factors.push({
          name: `${a.label}${b.label}相刑`,
          category: 'interaction',
          score: -6,
          description: `${a.label}与${b.label}${punishment}`,
        });
        continue;
      }

      // 六害: mildly unfavorable. Score: -4
      if (isHarm(a.idx, b.idx)) {
        factors.push({
          name: `${a.label}${b.label}相害`,
          category: 'interaction',
          score: -4,
          description: `${a.label}与${b.label}六害`,
        });
      }
    }
  }

  // 自刑: -4 if any branch is a self-punishment type
  for (const br of branches) {
    if (br.idx === 4 || br.idx === 6 || br.idx === 9 || br.idx === 11) {
      factors.push({
        name: `${br.label}自刑`,
        category: 'interaction',
        score: -4,
        description: `${br.label}自刑，内在矛盾`,
      });
    }
  }

  return factors;
}

// ---- Analyzers ----

function analyzeMonthOrder(dmWx: string, monthWx: string, monthName: string) {
  const rel = wuxingRelation(dmWx, monthWx);
  let score: number;
  let description: string;

  switch (rel) {
    case 'same':
      score = 30;
      description = `月令${monthName}月与日主同属${dmWx}，当令得时，根基深厚`;
      break;
    case 'born':
      score = 20;
      description = `月令${monthName}月属${monthWx}，生扶日主${dmWx}，得月令之生`;
      break;
    case 'control':
      score = 5;
      description = `月令${monthName}月属${monthWx}，为日主所克，虽不当令但可掌控`;
      break;
    case 'bornBy':
      score = -10;
      description = `月令${monthName}月属${monthWx}，日主${dmWx}之气被泄，不得令`;
      break;
    case 'controlled':
      score = -25;
      description = `月令${monthName}月属${monthWx}，克制日主${dmWx}，严重失令`;
      break;
    default:
      score = 0;
      description = '';
  }

  return { branch: monthName, wuxing: monthWx, relation: relLabel(rel), score, description };
}

function analyzeRoots(bazi: BaZi, dm: number) {
  const pillars: Array<{ label: string; branch: string; idx: number }> = [
    { label: '年柱', branch: bazi.year.branch.name, idx: bazi.year.branchIndex },
    { label: '月柱', branch: bazi.month.branch.name, idx: bazi.month.branchIndex },
    { label: '日柱', branch: bazi.day.branch.name, idx: bazi.day.branchIndex },
    { label: '时柱', branch: bazi.hour.branch.name, idx: bazi.hour.branchIndex },
  ];

  const roots: StrengthResult['roots'] = [];

  for (const p of pillars) {
    const hidden = HIDDEN_STEMS[p.idx as EarthlyBranchIndex];
    if (!hidden) continue;
    for (let i = 0; i < hidden.length; i++) {
      const hs = hidden[i]!;
      if (hs.stem === dm) {
        const depth = i === 0 ? '本气' : i === 1 ? '中气' : '余气';
        const weight = i === 0 ? 12 : i === 1 ? 7 : 4;
        roots.push({
          pillar: p.label,
          branch: p.branch,
          stem: ALL_STEMS[dm]!.name,
          depth,
          score: weight,
        });
      }
    }
  }

  return roots;
}

function analyzeStemSupport(bazi: BaZi, dmWx: string) {
  const pillars: Array<{ label: string; stem: string; stemIdx: number }> = [
    { label: '年干', stem: bazi.year.stem.name, stemIdx: bazi.year.stemIndex },
    { label: '月干', stem: bazi.month.stem.name, stemIdx: bazi.month.stemIndex },
    { label: '时干', stem: bazi.hour.stem.name, stemIdx: bazi.hour.stemIndex },
  ];

  const support: StrengthResult['stemSupport'] = [];

  for (const p of pillars) {
    const swx = ALL_STEMS[p.stemIdx]!.wuxing;
    if (swx === dmWx) {
      support.push({ pillar: p.label, stem: p.stem, relation: '比劫相助', score: 8 });
    } else if (generates(swx, dmWx)) {
      support.push({ pillar: p.label, stem: p.stem, relation: '印星生扶', score: 6 });
    }
  }

  return support;
}

function analyzeBranchSupport(bazi: BaZi, dmWx: string) {
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  let score = 0;
  const supporters: string[] = [];

  for (const p of pillars) {
    const bw = p.branch.wuxing;
    if (bw === dmWx) {
      score += 6;
      supporters.push(`${p.branch.name}(同气)`);
    } else if (generates(bw, dmWx)) {
      score += 4;
      supporters.push(`${p.branch.name}(生扶)`);
    }
  }

  return {
    score,
    description: supporters.length > 0
      ? `地支助力来源：${supporters.join('、')}`
      : '地支中无助力的五行',
  };
}

function analyzeWeakening(bazi: BaZi, dmWx: string) {
  const pillars: Array<{ label: string; stem: string; stemIdx: number }> = [
    { label: '年干', stem: bazi.year.stem.name, stemIdx: bazi.year.stemIndex },
    { label: '月干', stem: bazi.month.stem.name, stemIdx: bazi.month.stemIndex },
    { label: '时干', stem: bazi.hour.stem.name, stemIdx: bazi.hour.stemIndex },
  ];

  const weakening: StrengthResult['weakening'] = [];

  for (const p of pillars) {
    const swx = ALL_STEMS[p.stemIdx]!.wuxing;
    if (controls(swx, dmWx)) {
      weakening.push({ pillar: p.label, stem: p.stem, reason: `官杀克身（${swx}克${dmWx}）`, score: 8 });
    } else if (generates(dmWx, swx)) {
      weakening.push({ pillar: p.label, stem: p.stem, reason: `食伤泄气（${dmWx}生${swx}）`, score: 5 });
    }
  }

  return weakening;
}

// ---- Summary Builder ----

function buildSummary(
  dmName: string,
  dmWx: string,
  score: number,
  level: StrengthLevel,
  monthOrder: StrengthResult['monthOrder'],
  roots: StrengthResult['roots'],
  stemSupport: StrengthResult['stemSupport'],
  weakening: StrengthResult['weakening'],
): string {
  const parts: string[] = [];

  parts.push(`日主${dmName}${dmWx}，综合评分${score}分，属于${level}。`);

  if (monthOrder.score > 0) {
    parts.push(`月令方面${monthOrder.description}（${monthOrder.score > 0 ? '+' : ''}${monthOrder.score}分）。`);
  } else {
    parts.push(`月令方面${monthOrder.description}（${monthOrder.score}分）。`);
  }

  if (roots.length > 0) {
    const rootDesc = roots.map(r => `${r.pillar}${r.branch}藏${r.stem}(${r.depth})`).join('、');
    parts.push(`通根情况：${rootDesc}。`);
  } else {
    parts.push('命局无通根，日主根基不牢。');
  }

  if (stemSupport.length > 0) {
    const supDesc = stemSupport.map(s => `${s.pillar}${s.stem}${s.relation}`).join('、');
    parts.push(`天干助力：${supDesc}。`);
  }

  if (weakening.length > 0) {
    const weakDesc = weakening.map(w => `${w.pillar}${w.stem}${w.reason}`).join('、');
    parts.push(`克制因素：${weakDesc}。`);
  }

  return parts.join('');
}

// ---- Helpers ----

type WuxingRel = 'same' | 'born' | 'bornBy' | 'control' | 'controlled';

function wuxingRelation(from: string, to: string): WuxingRel {
  if (from === to) return 'same';
  if (generates(to, from)) return 'born';
  if (generates(from, to)) return 'bornBy';
  if (controls(from, to)) return 'control';
  return 'controlled';
}

function relLabel(rel: WuxingRel): string {
  switch (rel) {
    case 'same': return '同气当令';
    case 'born': return '生扶得令';
    case 'bornBy': return '泄气失令';
    case 'control': return '我克为用';
    case 'controlled': return '受克失令';
  }
}

function generates(from: string, to: string): boolean {
  const map: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  return map[from] === to;
}

function controls(from: string, to: string): boolean {
  const map: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
  return map[from] === to;
}

function scoreToLevel(score: number): StrengthLevel {
  if (score <= 15) return '从弱';
  if (score <= 40) return '偏弱';
  if (score <= 60) return '中和';
  if (score <= 85) return '偏旺';
  return '从旺';
}
