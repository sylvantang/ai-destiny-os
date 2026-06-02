// ============================================================
// AI Destiny OS — Destiny Engine: 用神/喜神/忌神 (Useful God System)
// Derives the most beneficial elements and 十神 for the day master
// based on strength, structure, and climate adjustment.
// ============================================================

import type { BaZi, Wuxing } from '../astro/types.js';
import type { StrengthResult } from './strengthEngine.js';
import type { StructureResult } from './structureEngine.js';
import type { ClimateResult } from './climateEngine.js';

// ---- Types ----

export interface YongShenResult {
  /** 用神 — the most beneficial element for the day master */
  yongShen: YongShenDetail;
  /** 喜神 — elements that support the 用神 (generates 用神) */
  xiShen: WuxingDetail[];
  /** 忌神 — elements that harm the 用神 or day master */
  jiShen: WuxingDetail[];
  /** 仇神 — element that controls the 用神 */
  chouShen: WuxingDetail | null;
  /** 闲神 — neutral elements */
  xianShen: Wuxing[];
  /** 调候用神 — climate-driven 用神, if different from primary */
  climateYongShen: WuxingDetail | null;
  /** Step-by-step derivation reasoning */
  analysis: string[];
  /** Human-readable summary */
  summary: string;
}

export interface YongShenDetail {
  wuxing: Wuxing;
  /** Which 十神 this wuxing represents relative to the day master */
  shiShen: string;
  /** Priority: 'primary' = main 用神, 'climate' = 调候用神 */
  priority: 'primary' | 'climate' | 'secondary';
  reason: string;
}

export interface WuxingDetail {
  wuxing: Wuxing;
  reason: string;
}

// ---- Wuxing generation/control maps ----

const GENERATES: Record<Wuxing, Wuxing> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const GENERATED_BY: Record<Wuxing, Wuxing> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
const CONTROLS: Record<Wuxing, Wuxing> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
const CONTROLLED_BY: Record<Wuxing, Wuxing> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

// ---- Wuxing → ShiShen mapping for a given day master ----

function wuxingToShiShen(dmWx: Wuxing, targetWx: Wuxing, isYin: boolean): string {
  if (targetWx === dmWx) return isYin ? '比肩' : '劫财';
  if (GENERATED_BY[targetWx] === dmWx) return isYin ? '正印' : '偏印';
  if (GENERATES[dmWx] === targetWx) return isYin ? '食神' : '伤官';
  if (CONTROLLED_BY[targetWx] === dmWx) return isYin ? '正官' : '七杀';
  if (CONTROLS[dmWx] === targetWx) return isYin ? '正财' : '偏财';
  return '比肩';
}

// ---- Main ----

export function deriveYongShen(
  bazi: BaZi,
  strength: StrengthResult,
  structure: StructureResult,
  climate: ClimateResult,
): YongShenResult {
  const dmWx = bazi.day.stem.wuxing as Wuxing;
  const dmIsYin = bazi.day.stem.yinYang === '阴';
  const analysis: string[] = [];
  const allWuxing: Wuxing[] = ['木', '火', '土', '金', '水'];

  // ---- Step 1: Climate override (调候为急) ----
  let climateYongShen: WuxingDetail | null = null;

  if (climate.needsAdjustment && climate.priority === 'high' && climate.neededWuxing) {
    const cWx = climate.neededWuxing as Wuxing;
    climateYongShen = {
      wuxing: cWx,
      reason: `调候为急：${climate.condition}，急需${cWx}调候`,
    };
    analysis.push(`调候优先：命局${climate.condition}，调候用神为${cWx}`);
  }

  // ---- Step 2: Strength-based 用神 ----

  let yongShenWx: Wuxing;
  let yongShenReason: string;

  if (strength.level === '从弱') {
    // 从弱: follow the strongest controlling element
    yongShenWx = deriveFollowWeakYongShen(bazi, dmWx);
    yongShenReason = `从弱格，顺势而行，以克制日主的${yongShenWx}为用`;
  } else if (strength.level === '从旺') {
    // 从旺: follow the supporting elements
    yongShenWx = GENERATED_BY[dmWx]; // 印为用
    yongShenReason = `从旺格，顺旺势而行，以生扶日主的${yongShenWx}为用`;
  } else if (strength.level === '偏弱') {
    // 偏弱: 扶抑 — support the DM
    // 印 (generates DM) is the primary supporter
    const yinWx = GENERATED_BY[dmWx];
    const biWx = dmWx;

    // Check if 印 is present in the chart; if well-represented, 比 (same as DM) can also be 用神
    const yinPresent = checkWuxingInChart(bazi, yinWx);

    if (yinPresent) {
      yongShenWx = yinWx;
      yongShenReason = `日主偏弱，以${yinWx}（印星）生扶为用，命局有根`;
    } else {
      yongShenWx = biWx;
      yongShenReason = `日主偏弱且印星不足，以${biWx}（比劫）帮身为用`;
    }
  } else if (strength.level === '偏旺') {
    // 偏旺: 克泄耗 — drain or control the DM
    const options: Array<{ wx: Wuxing; type: string; priority: number }> = [
      { wx: GENERATES[dmWx], type: '食伤泄秀', priority: 3 },      // DM generates this → drains
      { wx: CONTROLS[dmWx], type: '财星耗身', priority: 2 },       // DM controls this → consumes
      { wx: CONTROLLED_BY[dmWx], type: '官杀制身', priority: 1 },  // controls DM → curbs
    ];

    // Prefer the most available element in the chart
    let best = options[0]!;
    for (const opt of options) {
      if (checkWuxingInChart(bazi, opt.wx)) {
        best = opt;
        break;
      }
    }
    yongShenWx = best.wx;
    yongShenReason = `日主偏旺，以${yongShenWx}（${best.type}）为用，平衡旺势`;
  } else {
    // 中和: check structure pattern for direction
    if (structure.patternShiShen && structure.isFavorable) {
      const shiShenWx = shiShenToWuxing(structure.patternShiShen, dmWx);
      yongShenWx = shiShenWx ?? GENERATES[dmWx];
      yongShenReason = `日主中和，以格局${structure.primaryPattern}为导向，用${yongShenWx}顺势发展`;
    } else {
      yongShenWx = GENERATES[dmWx];
      yongShenReason = `日主中和，以${yongShenWx}为用，随大运方向调整`;
    }
  }

  // Climate override if high priority
  if (climateYongShen && climate.priority === 'high') {
    yongShenWx = climateYongShen.wuxing;
    yongShenReason = climateYongShen.reason;
  }

  analysis.push(`确定用神：${yongShenWx} — ${yongShenReason}`);

  // ---- Step 3: Derive 喜神 (supports 用神) ----
  const xiShenWx = GENERATED_BY[yongShenWx]; // what generates 用神
  const xiShen: WuxingDetail[] = [{
    wuxing: xiShenWx,
    reason: `${xiShenWx}生${yongShenWx}`,
  }];
  // If 用神 itself generates the DM (印), then 比 (same as DM) is also 喜神
  if (GENERATES[yongShenWx] === dmWx) {
    xiShen.push({
      wuxing: dmWx,
      reason: `日主${dmWx}得${yongShenWx}所生，与用神相辅相成`,
    });
  }
  analysis.push(`喜神：${xiShen.map(x => x.wuxing).join('、')}`);

  // ---- Step 4: Derive 忌神 (harms 用神) ----
  const jiShen: WuxingDetail[] = [];

  // Element that controls 用神 → 忌神
  const controllerWx = CONTROLLED_BY[yongShenWx];
  jiShen.push({
    wuxing: controllerWx,
    reason: `${controllerWx}克${yongShenWx}（用神），破坏平衡`,
  });

  // Element that 用神 controls (consumes 用神's energy) → also 忌神
  const drainedWx = CONTROLS[yongShenWx];
  if (drainedWx !== controllerWx) {
    jiShen.push({
      wuxing: drainedWx,
      reason: `${yongShenWx}克${drainedWx}，耗用神之力`,
    });
  }

  analysis.push(`忌神：${jiShen.map(j => j.wuxing).join('、')}`);

  // ---- Step 5: 仇神 (controls 用神) ----
  const chouShen: WuxingDetail | null = {
    wuxing: controllerWx,
    reason: `${controllerWx}克制用神${yongShenWx}，为仇神`,
  };

  // ---- Step 6: 闲神 (neutral) ----
  const usedWx = new Set<Wuxing>([
    yongShenWx,
    xiShenWx,
    ...jiShen.map(j => j.wuxing),
  ]);
  const xianShen = allWuxing.filter(wx => !usedWx.has(wx));

  // ---- Build 用神 detail ----
  const yongShenDetail: YongShenDetail = {
    wuxing: yongShenWx,
    shiShen: wuxingToShiShen(dmWx, yongShenWx, dmIsYin),
    priority: climateYongShen && climate.priority === 'high' ? 'climate' : 'primary',
    reason: yongShenReason,
  };

  // ---- Summary ----
  const summary = buildSummary(yongShenDetail, xiShen, jiShen, chouShen, strength, climate);

  return {
    yongShen: yongShenDetail,
    xiShen,
    jiShen,
    chouShen,
    xianShen,
    climateYongShen,
    analysis,
    summary,
  };
}

// ---- Helpers ----

function deriveFollowWeakYongShen(bazi: BaZi, dmWx: Wuxing): Wuxing {
  // Count controlling element presence
  const counts: Record<Wuxing, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  const pillars = [bazi.year, bazi.month, bazi.hour];

  for (const p of pillars) {
    counts[p.stem.wuxing as Wuxing]++;
    counts[p.branch.wuxing as Wuxing]++;
  }

  // From-weak follows the most dominant controlling/draining element
  const controllerWx = CONTROLLED_BY[dmWx];      // controls DM (官杀)
  const drainerWx = GENERATES[dmWx];             // DM generates (食伤)
  const consumerWx = CONTROLS[dmWx];              // DM controls (财)

  const cScore = counts[controllerWx] * 3;
  const dScore = counts[drainerWx] * 2;
  const coScore = counts[consumerWx] * 2;

  if (cScore >= dScore && cScore >= coScore && cScore > 0) return controllerWx;
  if (dScore >= coScore && dScore > 0) return drainerWx;
  return consumerWx;
}

function checkWuxingInChart(bazi: BaZi, wx: Wuxing): boolean {
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  return pillars.some(p => p.stem.wuxing === wx || p.branch.wuxing === wx);
}

function shiShenToWuxing(shiShen: string, dmWx: Wuxing): Wuxing | null {
  switch (shiShen) {
    case '比肩':
    case '劫财':
      return dmWx;
    case '正印':
    case '偏印':
      return GENERATED_BY[dmWx];
    case '食神':
    case '伤官':
      return GENERATES[dmWx];
    case '正财':
    case '偏财':
      return CONTROLS[dmWx];
    case '正官':
    case '七杀':
      return CONTROLLED_BY[dmWx];
    default:
      return null;
  }
}

function buildSummary(
  yongShen: YongShenDetail,
  xiShen: WuxingDetail[],
  jiShen: WuxingDetail[],
  chouShen: WuxingDetail | null,
  strength: StrengthResult,
  climate: ClimateResult,
): string {
  const parts: string[] = [];

  parts.push(
    `日主${strength.dayMaster.wuxing}${strength.level}，` +
    `用神为${yongShen.wuxing}（${yongShen.shiShen}），${yongShen.reason}。`,
  );

  parts.push(
    `喜神${xiShen.map(x => x.wuxing).join('、')}，` +
    `${xiShen.map(x => x.reason).join('；')}。`,
  );

  parts.push(
    `忌神${jiShen.map(j => j.wuxing).join('、')}，` +
    `${jiShen.map(j => j.reason).join('；')}。`,
  );

  if (chouShen) {
    parts.push(`仇神为${chouShen.wuxing}，${chouShen.reason}。`);
  }

  if (climate.needsAdjustment && climate.priority !== 'none') {
    parts.push(`命局需${climate.neededWuxing}调候（${climate.condition}），调候优先于常规用神。`);
  }

  // Practical advice
  const wxAdvice: Record<string, string> = {
    '木': '宜东方发展，从事教育、文化、医疗等行业，多亲近自然',
    '火': '宜南方发展，从事互联网、传媒、能源等行业，保持热情',
    '土': '宜中部发展，从事地产、金融、管理等行业，稳扎稳打',
    '金': '宜西方发展，从事法律、金融、制造等行业，发挥原则性',
    '水': '宜北方发展，从事贸易、咨询、物流等行业，灵活应变',
  };
  parts.push(`方向建议：${wxAdvice[yongShen.wuxing] ?? '多元发展'}。`);

  return parts.join('');
}
