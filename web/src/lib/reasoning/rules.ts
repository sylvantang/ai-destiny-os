// ============================================================
// AI Destiny OS — Structured reasoning rule engine.
// Pure deterministic rules over a normalized chart view.
// Accepts either the unified chart object (/api/chart response)
// or a flat ganzhi object (e.g. { yearGan, yearZhi, ... }).
// ============================================================

import type { UnifiedOutput } from '../bazi/engine-adapter';

// ---- 基础常量 ----

const STEM_WX: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const STEM_YIN: Record<string, string> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
  己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴',
};
const BRANCH_WX: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};
const HIDDEN: Record<string, string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};
const LU: Record<string, string> = {
  甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳',
  己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
};
const REN: Record<string, string> = {
  甲: '卯', 乙: '寅', 丙: '午', 丁: '巳', 戊: '午',
  己: '巳', 庚: '酉', 辛: '申', 壬: '子', 癸: '亥',
};
const GEN: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CTRL: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const HE: Record<string, string> = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
const CHONG: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
};

// ---- 类型 ----

export type ReasoningCategory = 'strength' | 'yongshen' | 'pattern' | 'tengod' | 'dayun';

export interface FlatChart {
  yearGan?: string;
  yearZhi?: string;
  monthGan?: string;
  monthZhi?: string;
  dayGan?: string;
  dayZhi?: string;
  hourGan?: string;
  hourZhi?: string;
  gender?: string;
}

export type ChartLike =
  | UnifiedOutput
  | { chart: UnifiedOutput['chart']; strength?: { level?: string }; structure?: { pattern?: string }; fortune?: { lifePeriods?: { pillar: string }[] } }
  | FlatChart;

export interface NormalizedChart {
  stems: string[];
  branches: string[];
  tenGods: string[];
  dayMasterStem: string;
  dayMasterWx: string;
  dayMasterYin: '阳' | '阴';
  monthBranch: string;
  monthWx: string;
  hiddenStems: string[][];
  wuxingCounts: Record<string, number>;
  gender: string;
  strengthLevel: string;
  structurePattern: string;
  dayunPillars: string[];
}

export interface ReasoningRule {
  id: string;
  name: string;
  category: ReasoningCategory;
  condition: (chart: NormalizedChart) => boolean;
  conclusion: string;
  source: string;
  /** 完全匹配 1.0，部分匹配 0.7；缺省按 1.0 */
  confidence?: number | ((chart: NormalizedChart) => number);
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  category: string;
  conclusion: string;
  source: string;
  confidence: number; // 0-1
}

// ---- 十神推导 ----

function tenGod(dmStem: string, dmYin: '阳' | '阴', other: string): string {
  const dm = STEM_WX[dmStem];
  const o = STEM_WX[other];
  const samePol = STEM_YIN[other] === dmYin;
  if (o === dm) return samePol ? '比肩' : '劫财';
  if (GEN[dm] === o) return samePol ? '食神' : '伤官';
  if (CTRL[dm] === o) return samePol ? '偏财' : '正财';
  if (CTRL[o] === dm) return samePol ? '七杀' : '正官';
  return samePol ? '偏印' : '正印';
}

// ---- 归一化 ----

function computeCounts(
  stems: string[],
  branches: string[],
  hiddenStems: string[][],
): Record<string, number> {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  stems.forEach((s) => {
    counts[STEM_WX[s]] = (counts[STEM_WX[s]] || 0) + 1;
  });
  branches.forEach((b) => {
    counts[BRANCH_WX[b]] = (counts[BRANCH_WX[b]] || 0) + 1;
  });
  hiddenStems.forEach((hs) => {
    hs.forEach((h) => {
      counts[STEM_WX[h]] = (counts[STEM_WX[h]] || 0) + 1;
    });
  });
  return counts;
}

export function normalizeChart(chart: ChartLike): NormalizedChart {
  const flat = chart as FlatChart;

  let stems: string[];
  let branches: string[];
  let hiddenStems: string[][];
  let wuxingCounts: Record<string, number>;
  let strengthLevel = '';
  let structurePattern = '';
  let dayunPillars: string[] = [];
  let gender = '男';

  const obj = chart as {
    chart?: UnifiedOutput['chart'];
    strength?: { level?: string };
    structure?: { pattern?: string };
    fortune?: { lifePeriods?: { pillar: string }[] };
  };

  if (typeof flat.dayGan === 'string') {
    stems = [flat.yearGan ?? '甲', flat.monthGan ?? '甲', flat.dayGan ?? '甲', flat.hourGan ?? '甲'];
    branches = [flat.yearZhi ?? '子', flat.monthZhi ?? '子', flat.dayZhi ?? '子', flat.hourZhi ?? '子'];
    hiddenStems = branches.map((b) => HIDDEN[b] ?? []);
    wuxingCounts = computeCounts(stems, branches, hiddenStems);
    if (typeof flat.gender === 'string') gender = flat.gender;
  } else if (obj.chart && obj.chart.pillars) {
    const keys = ['year', 'month', 'day', 'hour'] as const;
    stems = keys.map((k) => (obj.chart ? obj.chart.pillars[k].stem.name : '甲'));
    branches = keys.map((k) => (obj.chart ? obj.chart.pillars[k].branch.name : '子'));
    hiddenStems = keys.map((k) =>
      obj.chart ? obj.chart.pillars[k].hiddenStems.map((h) => h.name) : [],
    );
    wuxingCounts = obj.chart.wuxingCounts ?? computeCounts(stems, branches, hiddenStems);
    strengthLevel = obj.strength?.level ?? '';
    structurePattern = obj.structure?.pattern ?? '';
    dayunPillars = obj.fortune?.lifePeriods?.map((p) => p.pillar) ?? [];
  } else {
    stems = ['甲', '甲', '甲', '甲'];
    branches = ['子', '子', '子', '子'];
    hiddenStems = branches.map((b) => HIDDEN[b] ?? []);
    wuxingCounts = computeCounts(stems, branches, hiddenStems);
  }

  const dayMasterStem = stems[2] ?? '甲';
  const dayMasterWx = STEM_WX[dayMasterStem] ?? '木';
  const dayMasterYin = (STEM_YIN[dayMasterStem] ?? '阳') as '阳' | '阴';
  const tenGods = stems.map((s, i) => (i === 2 ? '日主' : tenGod(dayMasterStem, dayMasterYin, s)));
  const monthBranch = branches[1] ?? '子';
  const monthWx = BRANCH_WX[monthBranch] ?? '水';

  return {
    stems,
    branches,
    tenGods,
    dayMasterStem,
    dayMasterWx,
    dayMasterYin,
    monthBranch,
    monthWx,
    hiddenStems,
    wuxingCounts,
    gender,
    strengthLevel,
    structurePattern,
    dayunPillars,
  };
}

// ---- 强弱判定 ----

function judgeStrength(c: NormalizedChart): { level: string; deLing: boolean; deZhu: boolean } {
  const deLing = c.dayMasterWx === c.monthWx;
  const rootCount = c.hiddenStems.reduce(
    (n, hs) => n + hs.filter((h) => STEM_WX[h] === c.dayMasterWx).length,
    0,
  );
  const deZhu = c.stems.some((s, i) => i !== 2 && STEM_WX[s] === c.dayMasterWx);

  let level = c.strengthLevel;
  if (!level) {
    const shengList = [...c.stems.filter((_, i) => i !== 2), ...c.hiddenStems.flat()];
    const deSheng = shengList.some((x) => GEN[STEM_WX[x]] === c.dayMasterWx);
    const score =
      (deLing ? 1 : 0) +
      (rootCount >= 2 ? 1 : rootCount === 1 ? 0.5 : 0) +
      (deSheng ? 0.5 : 0) +
      (deZhu ? 0.5 : 0);
    level = score >= 1.5 ? '偏旺' : score <= 0.5 ? '偏弱' : '中和';
  }
  return { level, deLing, deZhu };
}

const shenQiang = (c: NormalizedChart) => {
  const lv = judgeStrength(c).level;
  return lv === '偏旺' || lv === '从旺';
};
const shenRuo = (c: NormalizedChart) => {
  const lv = judgeStrength(c).level;
  return lv === '偏弱' || lv === '从弱';
};
const rootCountOf = (c: NormalizedChart) =>
  c.hiddenStems.reduce((n, hs) => n + hs.filter((h) => STEM_WX[h] === c.dayMasterWx).length, 0);

// ---- 规则集（27 条） ----
// 结论中的 ${日主}/${月}/${大运} 为填充占位符。

const RULES: ReasoningRule[] = [
  // ===== strength =====
  {
    id: 'strength-del-ling',
    name: '日主得令',
    category: 'strength',
    condition: (c) => judgeStrength(c).deLing,
    conclusion: '日主${日主}生于${月}月，与月令同气，为得令，根基深厚。',
    source: '《滴天髓·旺衰》',
  },
  {
    id: 'strength-shi-ling',
    name: '日主失令',
    category: 'strength',
    condition: (c) => !judgeStrength(c).deLing,
    conclusion: '日主${日主}不得月令之气，为失令，需依赖地支根气与天干帮扶。',
    source: '《滴天髓·旺衰》',
  },
  {
    id: 'strength-de-di',
    name: '日主得地',
    category: 'strength',
    condition: (c) => rootCountOf(c) >= 1,
    confidence: (c) => (rootCountOf(c) >= 2 ? 1 : 0.7),
    conclusion: '日主${日主}在地支有根气（通根藏干），为得地，力量有依托。',
    source: '《子平真诠·论通根》',
  },
  {
    id: 'strength-shi-di',
    name: '日主失地',
    category: 'strength',
    condition: (c) => rootCountOf(c) === 0,
    conclusion: '日主${日主}地支无根，为失地，如浮萍无根，最忌再行克泄之地。',
    source: '《子平真诠·论通根》',
  },
  {
    id: 'strength-de-sheng',
    name: '日主得生',
    category: 'strength',
    condition: (c) => {
      const n = [...c.stems.filter((_, i) => i !== 2), ...c.hiddenStems.flat()].filter(
        (x) => GEN[STEM_WX[x]] === c.dayMasterWx,
      ).length;
      return n >= 1;
    },
    confidence: (c) => {
      const n = [...c.stems.filter((_, i) => i !== 2), ...c.hiddenStems.flat()].filter(
        (x) => GEN[STEM_WX[x]] === c.dayMasterWx,
      ).length;
      return n >= 2 ? 1 : 0.7;
    },
    conclusion: '命局有印星生扶日主${日主}，为得生，源头有气。',
    source: '《滴天髓·源流》',
  },
  {
    id: 'strength-shi-sheng',
    name: '日主失生',
    category: 'strength',
    condition: (c) =>
      ![...c.stems.filter((_, i) => i !== 2), ...c.hiddenStems.flat()].some(
        (x) => GEN[STEM_WX[x]] === c.dayMasterWx,
      ),
    conclusion: '命局不见印星生扶日主${日主}，为失生，元气无源。',
    source: '《滴天髓·源流》',
  },
  {
    id: 'strength-de-zhu',
    name: '日主得助',
    category: 'strength',
    condition: (c) => c.stems.some((s, i) => i !== 2 && STEM_WX[s] === c.dayMasterWx),
    confidence: (c) => {
      const n = c.stems.filter((s, i) => i !== 2 && STEM_WX[s] === c.dayMasterWx).length;
      return n >= 2 ? 1 : 0.7;
    },
    conclusion: '天干有比劫帮身，为得助，众志成城。',
    source: '《滴天髓·众寡》',
  },
  {
    id: 'strength-shi-zhu',
    name: '日主失助',
    category: 'strength',
    condition: (c) => !c.stems.some((s, i) => i !== 2 && STEM_WX[s] === c.dayMasterWx),
    conclusion: '天干无比劫帮身，为失助，独木难支，喜岁运引比劫。',
    source: '《滴天髓·众寡》',
  },
  {
    id: 'strength-overall-wang',
    name: '综合身旺',
    category: 'strength',
    condition: (c) => shenQiang(c),
    conclusion: '综合得令、得地、得生、得助四端，日主${日主}身旺。旺者宜克泄耗以求平衡。',
    source: '《子平真诠·论身强弱》',
  },
  {
    id: 'strength-overall-ruo',
    name: '综合身弱',
    category: 'strength',
    condition: (c) => shenRuo(c),
    conclusion: '综合得令、得地、得生、得助四端，日主${日主}身弱。弱者宜生扶帮身。',
    source: '《子平真诠·论身强弱》',
  },
  {
    id: 'strength-overall-zhonghe',
    name: '日主中和',
    category: 'strength',
    condition: (c) => judgeStrength(c).level === '中和',
    conclusion: '日主${日主}不旺不弱，为中和。中和者贵在流通，岁运之向背决定起伏。',
    source: '《滴天髓·中和》',
  },

  // ===== yongshen =====
  {
    id: 'yongshen-wang-ke-xie-hao',
    name: '身旺用克泄耗',
    category: 'yongshen',
    condition: (c) => shenQiang(c),
    conclusion: '日主身旺，用神取克泄耗：官杀制身、食伤泄秀、财星耗身；忌印比再生扶。',
    source: '《子平真诠·论用神》',
  },
  {
    id: 'yongshen-ruo-sheng-fu',
    name: '身弱用生扶',
    category: 'yongshen',
    condition: (c) => shenRuo(c),
    conclusion: '日主身弱，用神取生扶：印绶生身、比劫帮身；忌官杀克制与财星耗身。',
    source: '《子平真诠·论用神》',
  },
  {
    id: 'yongshen-cong-ruo',
    name: '从弱格用神',
    category: 'yongshen',
    condition: (c) => !judgeStrength(c).deLing && rootCountOf(c) === 0 && !judgeStrength(c).deZhu,
    confidence: 0.7,
    conclusion: '日主无根失令无助，为从弱之势，宜顺从克泄耗之神，不宜生扶日主（从格需全局细审）。',
    source: '《滴天髓·从象》',
  },
  {
    id: 'yongshen-cong-wang',
    name: '从旺格用神',
    category: 'yongshen',
    condition: (c) =>
      judgeStrength(c).deLing &&
      rootCountOf(c) >= 3 &&
      c.stems.filter((s, i) => i !== 2 && STEM_WX[s] === c.dayMasterWx).length >= 2,
    confidence: 0.7,
    conclusion: '日主极旺，印比成势，为从旺之势，宜顺其旺势，不宜克制（从格需全局细审）。',
    source: '《滴天髓·从象》',
  },
  {
    id: 'yongshen-tiaohou',
    name: '调候用神',
    category: 'yongshen',
    condition: (c) => {
      const winter = ['亥', '子', '丑'].includes(c.monthBranch);
      const summer = ['巳', '午', '未'].includes(c.monthBranch);
      if (winter) return c.dayMasterWx === '木' || c.dayMasterWx === '火';
      if (summer) return c.dayMasterWx === '金' || c.dayMasterWx === '水';
      return false;
    },
    conclusion: '生于${月}月，调候为急：冬令木火日主取丙火暖局，夏令金水日主取壬癸润局，先论调候，次论扶抑。',
    source: '《穷通宝鉴·论调候》',
  },

  // ===== pattern（以月令十神取格） =====
  {
    id: 'pattern-zhengguan',
    name: '正官格',
    category: 'pattern',
    condition: (c) => c.tenGods[1] === '正官',
    conclusion: '月令正官，为正官格。官星宜财印相辅，忌伤官克破，官多不清。',
    source: '《子平真诠·论正官》',
  },
  {
    id: 'pattern-qisha',
    name: '七杀格',
    category: 'pattern',
    condition: (c) => c.tenGods[1] === '七杀',
    conclusion: '月令七杀，为七杀格。杀需制化：食神制杀、印绶化杀为上格，杀旺无制则凶。',
    source: '《子平真诠·论偏官》',
  },
  {
    id: 'pattern-zhengyin',
    name: '正印格',
    category: 'pattern',
    condition: (c) => c.tenGods[1] === '正印',
    conclusion: '月令正印，为正印格。印格喜官杀生印、身弱得印为美，忌财星破印。',
    source: '《子平真诠·论正印》',
  },
  {
    id: 'pattern-pianyin',
    name: '偏印格',
    category: 'pattern',
    condition: (c) => c.tenGods[1] === '偏印',
    conclusion: '月令偏印，为偏印格。枭神夺食为忌，有财制枭、有食相济则转清。',
    source: '《子平真诠·论偏印》',
  },
  {
    id: 'pattern-shishen',
    name: '食神格',
    category: 'pattern',
    condition: (c) => c.tenGods[1] === '食神',
    conclusion: '月令食神，为食神格。食神主福泽，喜比劫生扶，忌偏印夺食。',
    source: '《子平真诠·论食神》',
  },
  {
    id: 'pattern-shangguan',
    name: '伤官格',
    category: 'pattern',
    condition: (c) => c.tenGods[1] === '伤官',
    conclusion: '月令伤官，为伤官格。伤官主才华，喜财印调停；伤官见官为祸百端。',
    source: '《子平真诠·论伤官》',
  },
  {
    id: 'pattern-zhengcai',
    name: '正财格',
    category: 'pattern',
    condition: (c) => c.tenGods[1] === '正财',
    conclusion: '月令正财，为正财格。财宜身强胜任，喜食伤生财，忌比劫争财。',
    source: '《子平真诠·论正财》',
  },
  {
    id: 'pattern-piancai',
    name: '偏财格',
    category: 'pattern',
    condition: (c) => c.tenGods[1] === '偏财',
    conclusion: '月令偏财，为偏财格。偏财为众人之财，宜身旺任财，忌身弱财多。',
    source: '《子平真诠·论偏财》',
  },
  {
    id: 'pattern-jianlu',
    name: '建禄格',
    category: 'pattern',
    condition: (c) => c.monthBranch === LU[c.dayMasterStem],
    conclusion: '月令为日主之禄，为建禄格。禄格喜官杀财星为用，忌印比过旺。',
    source: '《子平真诠·论建禄月劫》',
  },
  {
    id: 'pattern-yangren',
    name: '羊刃格',
    category: 'pattern',
    condition: (c) => c.monthBranch === REN[c.dayMasterStem],
    conclusion: '月令为日主之刃，为羊刃格。刃宜官杀制伏，羊刃驾杀掌权；无制则刚暴。',
    source: '《子平真诠·论建禄月劫》',
  },

  // ===== tengod（组合） =====
  {
    id: 'tengod-guan-sha-hun-za',
    name: '官杀混杂',
    category: 'tengod',
    condition: (c) => c.tenGods.some((t) => t === '正官') && c.tenGods.some((t) => t === '七杀'),
    conclusion: '命局官杀并见，为官杀混杂。取清为贵：去官留杀或去杀留官，混而难清者多反复。',
    source: '《滴天髓·官杀》',
  },
  {
    id: 'tengod-shi-shang-sheng-cai',
    name: '食伤生财',
    category: 'tengod',
    condition: (c) =>
      c.tenGods.some((t) => t === '食神' || t === '伤官') &&
      c.tenGods.some((t) => t === '正财' || t === '偏财'),
    conclusion: '命局食伤与财星并见，为食伤生财，秀气流通，财有源头，主技而优则商。',
    source: '《滴天髓·源流》',
  },
  {
    id: 'tengod-cai-xing-po-yin',
    name: '财星破印',
    category: 'tengod',
    condition: (c) =>
      c.tenGods.some((t) => t === '正财' || t === '偏财') &&
      c.tenGods.some((t) => t === '正印' || t === '偏印'),
    conclusion: '命局财印并见，为财星破印。财印相碍，喜官杀通关或位置调停，否则名利难两全。',
    source: '《子平真诠·论财印》',
  },
  {
    id: 'tengod-bi-jie-duo-cai',
    name: '比劫夺财',
    category: 'tengod',
    condition: (c) =>
      c.tenGods.some((t) => t === '比肩' || t === '劫财') &&
      c.tenGods.some((t) => t === '正财' || t === '偏财') &&
      shenRuo(c),
    conclusion: '身弱财多而见比劫，为比劫争财。宜与人合作分利，忌单打独斗。',
    source: '《滴天髓·众寡》',
  },

  // ===== dayun =====
  {
    id: 'dayun-xi-yong',
    name: '大运喜用判断',
    category: 'dayun',
    condition: (c) => {
      if (c.dayunPillars.length === 0) return false;
      const p = c.dayunPillars[0];
      if (!p || p.length < 2) return false;
      const wx = BRANCH_WX[p.charAt(p.length - 1)];
      if (!wx) return false;
      const good = shenRuo(c)
        ? wx === c.dayMasterWx || GEN[wx] === c.dayMasterWx
        : GEN[c.dayMasterWx] === wx || CTRL[c.dayMasterWx] === wx || CTRL[wx] === c.dayMasterWx;
      return good;
    },
    conclusion: '当前大运${大运}，地支为喜用之地，十年之间多有顺遂之象。',
    source: '《三命通会·论大运》',
  },
  {
    id: 'dayun-ji-shen',
    name: '大运忌神判断',
    category: 'dayun',
    condition: (c) => {
      if (c.dayunPillars.length === 0) return false;
      const p = c.dayunPillars[0];
      if (!p || p.length < 2) return false;
      const wx = BRANCH_WX[p.charAt(p.length - 1)];
      if (!wx) return false;
      const good = shenRuo(c)
        ? wx === c.dayMasterWx || GEN[wx] === c.dayMasterWx
        : GEN[c.dayMasterWx] === wx || CTRL[c.dayMasterWx] === wx || CTRL[wx] === c.dayMasterWx;
      return !good;
    },
    conclusion: '当前大运${大运}，地支为忌神之地，宜守不宜攻，静待岁运之机。',
    source: '《三命通会·论大运》',
  },
  {
    id: 'dayun-chong-xing',
    name: '大运刑冲命局',
    category: 'dayun',
    condition: (c) => {
      if (c.dayunPillars.length === 0) return false;
      const p = c.dayunPillars[0];
      if (!p || p.length < 2) return false;
      const zhi = p.charAt(p.length - 1);
      const chong = c.branches.some((b) => CHONG[zhi] === b);
      const xing: Record<string, string[]> = {
        寅: ['巳', '申'], 巳: ['申', '寅'], 申: ['寅', '巳'],
        丑: ['戌', '未'], 戌: ['未', '丑'], 未: ['丑', '戌'],
        子: ['卯'], 卯: ['子'],
      };
      const x = c.branches.some((b) => (xing[zhi] ?? []).includes(b));
      return chong || x;
    },
    conclusion: '当前大运${大运}与命局地支相冲（刑），主变动之年，动中求稳，不宜激进。',
    source: '《三命通会·论大运》',
  },
  {
    id: 'dayun-gan-he-rizhu',
    name: '大运天干合日主',
    category: 'dayun',
    condition: (c) => {
      if (c.dayunPillars.length === 0) return false;
      const p = c.dayunPillars[0];
      if (!p || p.length < 2) return false;
      return HE[p.charAt(0)] === c.dayMasterStem;
    },
    confidence: 0.7,
    conclusion: '当前大运${大运}，天干与日主相合，为有情之运，多有遇合之事。',
    source: '《三命通会·论大运》',
  },
];

// ---- 公共 API ----

export function applyReasoningRules(chart: ChartLike): RuleResult[] {
  const c = normalizeChart(chart);
  const results: RuleResult[] = [];

  for (const rule of RULES) {
    let matched = false;
    try {
      matched = rule.condition(c);
    } catch {
      matched = false;
    }
    if (!matched) continue;

    const confidence =
      typeof rule.confidence === 'function' ? rule.confidence(c) : rule.confidence ?? 1;

    const conclusion = rule.conclusion
      .replace(/\$\{日主\}/g, c.dayMasterStem + c.dayMasterWx)
      .replace(/\$\{月\}/g, c.monthBranch)
      .replace(/\$\{大运\}/g, c.dayunPillars[0] ?? '—')
      .replace(/\$\{格局\}/g, c.structurePattern || '月令所取之格');

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      conclusion,
      source: rule.source,
      confidence,
    });
  }

  return results;
}

export function formatRuleResults(results: RuleResult[]): string {
  if (results.length === 0) return '（规则引擎未命中任何规则）';
  return results
    .map(
      (r) =>
        `- [${r.category}] ${r.ruleName}（置信度${r.confidence}，出处${r.source}）：${r.conclusion}`,
    )
    .join('\n');
}
