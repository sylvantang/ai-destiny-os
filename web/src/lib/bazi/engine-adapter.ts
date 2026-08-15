// ============================================================
// AI Destiny OS — Bazi Engine Adapter
// Unified output contract over the shunshi-bazi-core engine.
// Real engine API: getBaziChart() → { 输入, 真太阳时?, 八字: BaziChart }
// (Chinese-keyed output; no computeChart/ChartInput/ChartOutput exist).
// ============================================================

import { getBaziChart, type GetBaziChartOutput } from 'shunshi-bazi-core';

export { getBaziChart };
export type { GetBaziChartOutput };

export interface UnifiedInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  /** '男' | '女' | 'male' | 'female' */
  gender: string;
  longitude?: number;
  latitude?: number;
  city?: string;
  isLunar?: boolean;
}

export interface PillarShape {
  stem: { name: string; wuxing: string; yinYang: string };
  branch: { name: string; wuxing: string };
  shiShen?: string;
  nayin?: string;
  hiddenStems: { name: string; wuxing: string }[];
}

export interface UnifiedOutput {
  chart: {
    pillars: Record<'year' | 'month' | 'day' | 'hour', PillarShape>;
    pillarLabels: Record<string, string>;
    dayMaster: { stem: string; wuxing: string };
    wuxingCounts: Record<string, number>;
  };
  strength: {
    score: number;
    level: string;
    label: string;
    summary: string;
    breakdown: Record<string, number>;
  };
  structure: { pattern: string; subPattern?: string; shiShen?: string; isFavorable: boolean };
  climate: { needsAdjustment: boolean; priority: string; neededWuxing?: string; condition?: string };
  yongShen: {
    yongShen: { wuxing: string; reason?: string };
    xiShen: { wuxing: string }[];
    jiShen: { wuxing: string }[];
    summary: string;
  };
  fortune: {
    overall: { score: number; level: string; bestDimension: string; description: string };
    keyYears: { year: number; pillar: string; description: string }[];
    lifePeriods: { startAge: number; pillar: string; years: number[]; summary: string }[];
  };
  relations: { theme: string; summary: string };
  visualization: string;
  rawShunshi: GetBaziChartOutput;
  rawTaibu?: unknown;
}

const PILLAR_LABELS = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' } as const;

const STEM_WUXING: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const STEM_YINYANG: Record<string, string> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
  己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴',
};

const BRANCH_WUXING: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 相生 / 我克
const GEN: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CTRL: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

type ShunshiPillarKey = '年柱' | '月柱' | '日柱' | '时柱';
type UnifiedPillarKey = 'year' | 'month' | 'day' | 'hour';

const KEY_MAP: Record<UnifiedPillarKey, ShunshiPillarKey> = {
  year: '年柱',
  month: '月柱',
  day: '日柱',
  hour: '时柱',
};

function mapPillar(q: GetBaziChartOutput['八字']['柱位详细']['年柱']): PillarShape {
  return {
    stem: {
      name: q.天干,
      wuxing: STEM_WUXING[q.天干] ?? '土',
      yinYang: STEM_YINYANG[q.天干] ?? '阳',
    },
    branch: { name: q.地支, wuxing: BRANCH_WUXING[q.地支] ?? '土' },
    shiShen: q.主星,
    nayin: q.纳音,
    hiddenStems: q.藏干详情.map((h) => ({ name: h.干, wuxing: h.五行 })),
  };
}

function mapChart(shunshi: GetBaziChartOutput): UnifiedOutput['chart'] {
  const detail = shunshi.八字.柱位详细;
  const pillars = {
    year: mapPillar(detail.年柱),
    month: mapPillar(detail.月柱),
    day: mapPillar(detail.日柱),
    hour: mapPillar(detail.时柱),
  };

  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  (['year', 'month', 'day', 'hour'] as const).forEach((k) => {
    const p = pillars[k];
    counts[p.stem.wuxing] += 1;
    counts[p.branch.wuxing] += 1;
    p.hiddenStems.forEach((h) => {
      counts[h.wuxing] += 1;
    });
  });

  return {
    pillars,
    pillarLabels: PILLAR_LABELS,
    dayMaster: { stem: shunshi.八字.日主, wuxing: STEM_WUXING[shunshi.八字.日主] ?? '土' },
    wuxingCounts: counts,
  };
}

function computeStrengthBreakdown(shunshi: GetBaziChartOutput): UnifiedOutput['strength'] {
  const bazi = shunshi.八字;
  const dmStem = bazi.日主;
  const dm = STEM_WUXING[dmStem] ?? '土';
  const monthWx = BRANCH_WUXING[bazi.柱位详细.月柱.地支] ?? '土';

  // 旺相休囚死 by month command
  let monthOrder = 0;
  if (dm === monthWx) monthOrder = 30; // 旺
  else if (GEN[monthWx] === dm) monthOrder = 20; // 相
  else if (GEN[dm] === monthWx) monthOrder = -10; // 休
  else if (CTRL[dm] === monthWx) monthOrder = -20; // 囚
  else monthOrder = -25; // 死

  const roots = (Object.keys(KEY_MAP) as UnifiedPillarKey[]).reduce((sum, key) => {
    const q = bazi.柱位详细[KEY_MAP[key]];
    return sum + q.藏干详情.filter((h) => h.干 === dmStem).length * 4;
  }, 0);

  const base = 35;
  const total = Math.max(0, Math.min(100, base + monthOrder + roots));

  let level = '从弱';
  if (total > 85) level = '从旺';
  else if (total > 60) level = '偏旺';
  else if (total > 40) level = '中和';
  else if (total > 15) level = '偏弱';

  const labels: Record<string, string> = {
    '从弱': '日主极弱，顺从克泄耗之势，不宜生扶',
    '偏弱': '日主偏弱，喜生扶助力，忌克泄耗',
    '中和': '日主不弱不旺，平衡为贵，大运走向决定强弱',
    '偏旺': '日主偏旺，喜克泄耗平衡，忌再生扶',
    '从旺': '日主极旺，顺其旺势，不宜克制',
  };

  return {
    score: total,
    level,
    label: labels[level] ?? '',
    summary: `日主${dmStem}${dm}，综合评分${total}分，属于${level}。月令${monthOrder >= 20 ? '得令' : '失令'}。`,
    breakdown: { base, monthOrder, roots, total },
  };
}

function computeStructure(
  shunshi: GetBaziChartOutput,
  strength: UnifiedOutput['strength'],
): UnifiedOutput['structure'] {
  const PATTERN_BY_SHISHEN: Record<string, string> = {
    正官: '正官格',
    七杀: '七杀格',
    正财: '正财格',
    偏财: '偏财格',
    正印: '正印格',
    偏印: '偏印格',
    食神: '食神格',
    伤官: '伤官格',
    比肩: '建禄格',
    劫财: '月刃格',
  };
  const monthStar = shunshi.八字.柱位详细.月柱.主星;
  const pattern = PATTERN_BY_SHISHEN[monthStar] ?? '正官格';

  // 印比格局利弱身；财官食伤利旺身（确定性判定，替代随机数）
  const SUPPORTS_WEAK = ['正印格', '偏印格', '建禄格', '月刃格'];
  const isFavorable = SUPPORTS_WEAK.includes(pattern)
    ? strength.level === '偏弱' || strength.level === '从弱'
    : strength.level === '偏旺' || strength.level === '从旺' || strength.level === '中和';

  return {
    pattern,
    subPattern: undefined,
    shiShen: monthStar,
    isFavorable,
  };
}

function computeClimate(shunshi: GetBaziChartOutput): UnifiedOutput['climate'] {
  const dm = STEM_WUXING[shunshi.八字.日主] ?? '土';
  const monthBranch = shunshi.八字.柱位详细.月柱.地支;
  const monthWx = BRANCH_WUXING[monthBranch] ?? '土';
  const needs = monthWx !== dm && monthWx !== '土';
  return {
    needsAdjustment: needs,
    priority: needs ? 'medium' : 'none',
    neededWuxing: needs ? monthWx : undefined,
    condition: needs ? `${monthBranch}月${monthWx}旺，日主${dm}需调候` : undefined,
  };
}

function computeYongShen(shunshi: GetBaziChartOutput): UnifiedOutput['yongShen'] {
  const dm = STEM_WUXING[shunshi.八字.日主] ?? '土';
  const summary = `日主${dm}，用神${GEN[dm]}${CTRL[dm]}，喜神${dm}${GEN[GEN[dm]]}，忌神${CTRL[dm]}${CTRL[CTRL[dm]]}`;
  return {
    yongShen: { wuxing: GEN[dm], reason: summary },
    xiShen: [{ wuxing: dm }, { wuxing: GEN[GEN[dm]] }],
    jiShen: [{ wuxing: CTRL[dm] }, { wuxing: CTRL[CTRL[dm]] }],
    summary,
  };
}

function yearGanzhi(year: number): string {
  const idx = ((year - 4) % 60 + 60) % 60;
  return STEMS[idx % 10] + BRANCHES[idx % 12];
}

function computeFortune(shunshi: GetBaziChartOutput): UnifiedOutput['fortune'] {
  const currentYear = new Date().getFullYear();
  const dmStem = shunshi.八字.日主;
  const score = 60 + ((dmStem.charCodeAt(0) + currentYear) % 31);

  return {
    overall: {
      score,
      level: '平稳',
      bestDimension: '事业财运',
      description: '整体运势平稳，宜守成',
    },
    keyYears: Array.from({ length: 5 }, (_, i) => ({
      year: currentYear + i,
      pillar: yearGanzhi(currentYear + i),
      description: '',
    })),
    lifePeriods: shunshi.八字.大运.slice(0, 6).map((d, i) => ({
      startAge: d.起始年龄,
      pillar: d.干支,
      years: Array.from({ length: 10 }, (_, j) => d.起始年份 + j),
      summary: `大运${i + 1}`,
    })),
  };
}

function computeRelations(): UnifiedOutput['relations'] {
  return { theme: '事业财运', summary: '日主坐财库，适合经商投资' };
}

export async function computeUnifiedBazi(input: UnifiedInput): Promise<UnifiedOutput> {
  const hour = input.hour >= 0 ? input.hour : 12;
  const minute = input.minute ?? 0;
  const gender01: 0 | 1 = input.gender === '男' || input.gender === 'male' ? 1 : 0;

  const shunshi = getBaziChart({
    year: input.year,
    month: input.month,
    day: input.day,
    hour,
    minute,
    gender: gender01,
    longitude: input.longitude,
    latitude: input.latitude,
    useTrueSolarTime: true,
    sect: 1,
  });

  // Taibu parity (best-effort, non-blocking)
  let rawTaibu: unknown = null;
  try {
    const { calculateBazi } = await import('taibu-core');
    rawTaibu = calculateBazi({
      birthYear: input.year,
      birthMonth: input.month,
      birthDay: input.day,
      birthHour: hour,
      birthMinute: minute,
      gender: gender01 === 1 ? 'male' : 'female',
      longitude: input.longitude,
    });
  } catch {
    rawTaibu = null;
  }

  const chart = mapChart(shunshi);
  const strength = computeStrengthBreakdown(shunshi);

  return {
    chart,
    strength,
    structure: computeStructure(shunshi, strength),
    climate: computeClimate(shunshi),
    yongShen: computeYongShen(shunshi),
    fortune: computeFortune(shunshi),
    relations: computeRelations(),
    visualization: '',
    rawShunshi: shunshi,
    rawTaibu,
  };
}
