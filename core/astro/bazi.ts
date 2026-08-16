// ============================================================
// AI Destiny OS — Astro Core: BaZi (Four Pillars)
// Year / Month / Day / Hour pillars. 100% deterministic.
//
// All time math is epoch-based and interpreted against the
// UTC+8 (China Standard Time) wall clock — independent of the
// host machine timezone and its historical DST tables.
// ============================================================

import type {
  BaZi, BirthInfo, DestinyChart, Pillar,
  HeavenlyStemIndex, EarthlyBranchIndex,
  SexagenaryIndex, Wuxing, ChartRelations,
} from './types.js';
import {
  getStem, getBranch, getHiddenStems, getNayin,
  getMonthStemStart, getHourStemStart, getShiShen,
  sexagenaryIndex, stemFromSexagenary, branchFromSexagenary,
  SEXAGENARY_NAMES, ALL_STEMS, ALL_BRANCHES,
  JIE_TO_MONTH_BRANCH,
} from './constants.js';
import { getJieQi } from './jieqi.js';
import { getHourBranch } from './solarTime.js';
import { calcDaYun, getCurrentDayun } from './dayun.js';
import {
  isClash, isCombination, getPunishment, isHarm,
  isStemClash, getStemClashName, isStemCombine,
} from './earthlyBranchRelations.js';

const HOUR_MS = 3600 * 1000;
const CST_OFFSET_MS = 8 * HOUR_MS;
const DAY_MS = 24 * HOUR_MS;

// 1900-01-01 (UTC+8) was 甲戌日 (sexagenary index 10)
const DAY_PILLAR_REF_JD = Date.UTC(1900, 0, 1);
const DAY_PILLAR_REF_IDX = 10;

// ---- Time helpers ----

/**
 * Birth wall-clock fields (UTC+8) → epoch ms.
 * No host-timezone involvement: we interpret the given fields
 * directly as China Standard Time.
 */
function birthEpoch(birth: BirthInfo): number {
  return (
    Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour, birth.minute)
    - CST_OFFSET_MS
  );
}

/**
 * Standard-time instant: DST-observed clocks subtract one hour,
 * applied explicitly (never via the host TZ database).
 */
function standardEpoch(birth: BirthInfo): number {
  return birthEpoch(birth) - (birth.isDST ? HOUR_MS : 0);
}

/** UTC+8 wall-clock components of an instant. */
function cstWallDate(epoch: number): Date {
  return new Date(epoch + CST_OFFSET_MS);
}

// ---- Year Pillar ----

/**
 * Calculate the year pillar (年柱).
 * The year changes at 立春 (Start of Spring), NOT at the lunar new year
 * or Gregorian Jan 1. Comparison is instant-vs-instant (mean time).
 */
function calcYearPillar(epoch: number, dmIdx: HeavenlyStemIndex): Pillar {
  const year = cstWallDate(epoch).getUTCFullYear();

  // Get 立春 for this year
  const jieQi = getJieQi(year);
  const lichun = jieQi.find((jq) => jq.name === '立春');

  // If the instant is before 立春, use previous year's pillar
  let effectiveYear = year;
  if (lichun && epoch < lichun.date.getTime()) {
    effectiveYear = year - 1;
  }

  // Year pillar: (year - 4) % 60; 公元4年为甲子年 (index 0)
  const yearIndex = ((effectiveYear - 4) % 60 + 60) % 60;
  const stemIdx = stemFromSexagenary(yearIndex);
  const branchIdx = branchFromSexagenary(yearIndex);

  return buildPillar(stemIdx, branchIdx, yearIndex, dmIdx);
}

// ---- Month Pillar ----

/**
 * Calculate the month pillar (月柱) based on solar terms.
 * The month branch is determined by which 节 (jie) the instant falls
 * after, and the month stem is determined by the year stem.
 */
function calcMonthPillar(
  epoch: number,
  yearStem: HeavenlyStemIndex,
  dmIdx: HeavenlyStemIndex,
): Pillar {
  const year = cstWallDate(epoch).getUTCFullYear();

  // Collect all 节 (month-changing terms) from this year + previous year
  const allJie = [...getJieQi(year - 1), ...getJieQi(year)]
    .filter((jq) => jq.isJie)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Find the last 节 at or before the birth instant
  let lastJie = allJie[0];
  for (const jie of allJie) {
    if (jie.date.getTime() <= epoch) {
      lastJie = jie;
    } else {
      break;
    }
  }

  const monthBranch = JIE_TO_MONTH_BRANCH[lastJie?.index ?? 0] ?? 1;

  // Month stem: starts from the yearStem group, then increments by month order.
  // 寅月 is month #0 in the stem cycle, 卯月 is #1, etc.
  const monthOrder = (monthBranch - 2 + 12) % 12; // 寅=0, 卯=1, ..., 丑=11
  const monthStemStart = getMonthStemStart(yearStem);
  const monthStem = ((monthStemStart + monthOrder) % 10) as HeavenlyStemIndex;

  const sexIdx = sexagenaryIndex(monthStem, monthBranch);
  return buildPillar(monthStem, monthBranch, sexIdx, dmIdx);
}

// ---- Day Pillar ----

/** Sexagenary day index for a UTC+8 wall-clock date. */
function dayIndexFromEpoch(epoch: number): SexagenaryIndex {
  const wall = cstWallDate(epoch);
  const birthUTC = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate());
  const dayDiff = Math.round((birthUTC - DAY_PILLAR_REF_JD) / DAY_MS);
  return (((DAY_PILLAR_REF_IDX + dayDiff) % 60) + 60) % 60;
}

/**
 * Calculate the day pillar (日柱).
 * Convention: day = the UTC+8 civil (wall-clock) date. Late 子时
 * (23:00–23:59) does NOT roll the day forward — the day stem for the
 * 晚子时 hour pillar is taken from the same civil date.
 */
function calcDayPillar(epoch: number, dmIdx: HeavenlyStemIndex): Pillar {
  const dayIndex = dayIndexFromEpoch(epoch);
  const stemIdx = stemFromSexagenary(dayIndex);
  const branchIdx = branchFromSexagenary(dayIndex);
  return buildPillar(stemIdx, branchIdx, dayIndex, dmIdx);
}

// ---- Hour Pillar ----

/**
 * Calculate the hour pillar (时柱) based on true solar time.
 *
 * Hour branch: determined by the true solar time (2-hour blocks).
 * Hour stem: determined by the day stem (日上起时法 / 五鼠遁).
 */
function calcHourPillar(
  birth: BirthInfo,
  epoch: number,
  dayStem: HeavenlyStemIndex,
  dmIdx: HeavenlyStemIndex,
): Pillar {
  // Get the hour branch from true solar time
  const hourBranch = getHourBranch(
    new Date(epoch),
    birth.longitude,
    birth.isDST,
    birth.standardMeridian ?? 120,
  ) as EarthlyBranchIndex;

  // Hour stem from 日上起时法 (五鼠遁)
  const hourStemStart = getHourStemStart(dayStem);
  const hourStem = ((hourStemStart + hourBranch) % 10) as HeavenlyStemIndex;

  const sexIdx = sexagenaryIndex(hourStem, hourBranch);
  return buildPillar(hourStem, hourBranch, sexIdx, dmIdx);
}

// ---- Helpers ----

function buildPillar(
  stemIdx: HeavenlyStemIndex,
  branchIdx: EarthlyBranchIndex,
  sexIdx: SexagenaryIndex,
  dmIdx: HeavenlyStemIndex,
): Pillar {
  return {
    stem: getStem(stemIdx),
    branch: getBranch(branchIdx),
    stemIndex: stemIdx,
    branchIndex: branchIdx,
    sexagenaryIndex: sexIdx,
    hiddenStems: getHiddenStems(branchIdx),
    nayin: getNayin(sexIdx),
    shiShen: getShiShen(dmIdx, stemIdx),
  };
}

// ---- Main API ----

/**
 * Calculate the complete BaZi (Four Pillars) for a given birth.
 *
 * @param birth - Birth information including date, time, and location
 * @returns Complete BaZi chart
 */
export function calcBaZi(birth: BirthInfo): BaZi {
  const epoch = birthEpoch(birth);        // wall clock (DST-inclusive)
  const stdEpoch = standardEpoch(birth);  // standard time (DST-adjusted)

  // Determine day master index first (needed for 十神 on all pillars)
  const dmIdx = stemFromSexagenary(dayIndexFromEpoch(stdEpoch));

  const dayPillar = calcDayPillar(stdEpoch, dmIdx);
  const yearPillar = calcYearPillar(stdEpoch, dmIdx);
  const monthPillar = calcMonthPillar(stdEpoch, yearPillar.stemIndex, dmIdx);
  const hourPillar = calcHourPillar(birth, epoch, dayPillar.stemIndex, dmIdx);

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
  };
}

/**
 * Generate a complete destiny chart from birth information,
 * including 大运, 五行统计 and 四柱刑冲合害汇总.
 */
export function generateChart(birth: BirthInfo): DestinyChart {
  const bazi = calcBaZi(birth);
  const wuxingCount = countWuxing(bazi);

  // Calculate DaYun
  const dayun = calcDaYun(birth, bazi.month, bazi.year.stemIndex, bazi.day.stemIndex);

  // Current age
  const epoch = birthEpoch(birth);
  const currentAge = (Date.now() - epoch) / (365.25 * DAY_MS);
  const currentDayun = getCurrentDayun(dayun, currentAge);

  const relations = summarizeRelations(bazi);

  return {
    bazi,
    birthInfo: birth,
    dayun,
    currentDayun,
    wuxingCount,
    dayMaster: bazi.day.stem,
    dayMasterWuxing: bazi.day.stem.wuxing,
    relations,
  };
}

function countWuxing(bazi: BaZi): Record<Wuxing, number> {
  const counts: Record<Wuxing, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };

  for (const pillar of [bazi.year, bazi.month, bazi.day, bazi.hour]) {
    // Count the main stem wuxing
    counts[pillar.stem.wuxing] += 1;
    // Count the branch wuxing
    counts[pillar.branch.wuxing] += 1;
    // Count hidden stems (each contributes)
    for (const hs of pillar.hiddenStems) {
      counts[ALL_STEMS[hs]!.wuxing] += 1;
    }
  }

  return counts;
}

/**
 * Summarize 刑冲合害 among the four pillars' stems and branches.
 */
function summarizeRelations(bazi: BaZi): ChartRelations {
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  const labels = ['年', '月', '日', '时'];

  const branchClashes: string[] = [];
  const branchCombinations: string[] = [];
  const branchPunishments: string[] = [];
  const branchHarms: string[] = [];
  const stemClashes: string[] = [];
  const stemCombines: string[] = [];

  const bn = (i: EarthlyBranchIndex) => ALL_BRANCHES[i]?.name ?? '?';

  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const a = pillars[i]!;
      const b = pillars[j]!;
      const tag = `${labels[i]}-${labels[j]}`;

      if (isClash(a.branchIndex, b.branchIndex)) {
        branchClashes.push(`${tag} ${bn(a.branchIndex)}${bn(b.branchIndex)}冲`);
      }
      if (isCombination(a.branchIndex, b.branchIndex)) {
        branchCombinations.push(`${tag} ${bn(a.branchIndex)}${bn(b.branchIndex)}合`);
      }
      const pun = getPunishment(a.branchIndex, b.branchIndex);
      if (pun) branchPunishments.push(`${tag} ${pun}`);
      if (isHarm(a.branchIndex, b.branchIndex)) {
        branchHarms.push(`${tag} ${bn(a.branchIndex)}${bn(b.branchIndex)}害`);
      }
      if (isStemClash(a.stemIndex, b.stemIndex)) {
        stemClashes.push(`${tag} ${getStemClashName(a.stemIndex, b.stemIndex)}`);
      }
      const comb = isStemCombine(a.stemIndex, b.stemIndex);
      if (comb) stemCombines.push(`${tag} ${comb.name}`);
    }
  }

  return {
    stemClashes,
    stemCombines,
    branchClashes,
    branchCombinations,
    branchPunishments,
    branchHarms,
  };
}

/**
 * Format a BaZi chart as a readable string.
 */
export function formatBaZi(bazi: BaZi): string {
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  const labels = ['年柱', '月柱', '日柱', '时柱'];

  const lines: string[] = [];
  lines.push('四柱      天干  地支  藏干          纳音');
  lines.push('―'.repeat(56));

  for (let i = 0; i < 4; i++) {
    const p = pillars[i]!;
    const hidden = p.hiddenStems.map((h) => ALL_STEMS[h]!.name).join('');
    const label = labels[i]!;
    const name = SEXAGENARY_NAMES[p.sexagenaryIndex]!;
    lines.push(
      `${label} ${name.padEnd(4)}  ${p.stem.name}    ${p.branch.name}    ${hidden.padEnd(12)} ${p.nayin}`,
    );
  }

  return lines.join('\n');
}
