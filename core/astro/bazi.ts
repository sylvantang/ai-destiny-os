// ============================================================
// AI Destiny OS — Astro Core: BaZi (Four Pillars)
// Year / Month / Day / Hour pillars. 100% deterministic.
// ============================================================

import type {
  BaZi, BirthInfo, DestinyChart, Pillar,
  HeavenlyStemIndex, EarthlyBranchIndex,
  SexagenaryIndex, Wuxing,
} from './types.js';
import {
  getStem, getBranch, getHiddenStems, getNayin,
  getMonthStemStart, getHourStemStart, getShiShen,
  sexagenaryIndex, stemFromSexagenary, branchFromSexagenary,
  SEXAGENARY_NAMES, ALL_STEMS,
  JIE_TO_MONTH_BRANCH,
} from './constants.js';
import { getJieQi } from './jieqi.js';
import { getHourBranch } from './solarTime.js';
import { calcDaYun, getCurrentDayun } from './dayun.js';

// ---- Year Pillar ----

/**
 * Calculate the year pillar (年柱).
 * The year changes at 立春 (Start of Spring), NOT at the lunar new year
 * or Gregorian Jan 1.
 */
function calcYearPillar(date: Date, isDST: boolean): Pillar {
  const adjustedDate = isDST
    ? new Date(date.getTime() - 1 * 60 * 60 * 1000)
    : new Date(date.getTime());

  const year = adjustedDate.getUTCFullYear();

  // Get 立春 for this year
  const jieQi = getJieQi(year);
  const lichun = jieQi.find(jq => jq.name === '立春');

  // If date is before 立春, use previous year's pillar
  let effectiveYear = year;
  if (lichun) {
    const lichunTime = lichun.date.getTime();
    const birthTime = adjustedDate.getTime();
    if (birthTime < lichunTime) {
      effectiveYear = year - 1;
    }
  }

  // Year pillar: (year - 4) % 60
  // 公元4年为甲子年 (sexagenary index 0)
  const yearIndex = ((effectiveYear - 4) % 60 + 60) % 60;
  const stemIdx = stemFromSexagenary(yearIndex);
  const branchIdx = branchFromSexagenary(yearIndex);

  return buildPillar(stemIdx, branchIdx, yearIndex);
}

// ---- Month Pillar ----

/**
 * Calculate the month pillar (月柱) based on solar terms.
 * The month branch is determined by which 节 (jie) the date falls after,
 * and the month stem is determined by the year stem.
 */
function calcMonthPillar(
  date: Date,
  isDST: boolean,
  yearStem: HeavenlyStemIndex,
): Pillar {
  const adjustedDate = isDST
    ? new Date(date.getTime() - 1 * 60 * 60 * 1000)
    : new Date(date.getTime());

  const year = adjustedDate.getUTCFullYear();
  const birthTime = adjustedDate.getTime();

  // Get all solar terms for this year + previous year
  const thisYearJQ = getJieQi(year);
  const prevYearJQ = getJieQi(year - 1);

  // Collect all 节 (month-changing terms), sorted
  const allJie = [...prevYearJQ, ...thisYearJQ]
    .filter(jq => jq.isJie)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Find the last 节 before the birth date
  let lastJie = allJie[0];
  for (let i = 1; i < allJie.length; i++) {
    const jie = allJie[i]!;
    if (jie.date.getTime() <= birthTime) {
      lastJie = jie;
    } else {
      break;
    }
  }

  const monthBranch = JIE_TO_MONTH_BRANCH[lastJie!.index] ?? 2;

  // Month stem: starts from yearStem group, then increments by month branch order
  // monthBranch 0=子...11=亥. But the lunar month order starts from 寅(2).
  // 寅月 is month #0 in the stem cycle, 卯月 is month #1, etc.
  const monthOrder = (monthBranch - 2 + 12) % 12; // 寅=0, 卯=1, ..., 丑=11
  const monthStemStart = getMonthStemStart(yearStem);
  const monthStem = ((monthStemStart + monthOrder) % 10) as HeavenlyStemIndex;

  const sexIdx = sexagenaryIndex(monthStem, monthBranch);
  return buildPillar(monthStem, monthBranch, sexIdx);
}

// ---- Day Pillar ----

// 1900-01-01 was 甲戌日 (sexagenary index 10)
const DAY_PILLAR_REFERENCE = {
  date: new Date(Date.UTC(1900, 0, 1)),
  sexagenaryIndex: 10,
};

/**
 * Calculate the day pillar (日柱).
 * The sexagenary day cycle has been continuous for thousands of years.
 * We count days from a known reference date.
 */
function calcDayPillar(date: Date, isDST: boolean): Pillar {
  const adjustedDate = isDST
    ? new Date(date.getTime() - 1 * 60 * 60 * 1000)
    : new Date(date.getTime());

  const refDate = DAY_PILLAR_REFERENCE.date;
  const refIdx = DAY_PILLAR_REFERENCE.sexagenaryIndex;

  // Count days between reference and birth date (UTC-based, no DST issues)
  const birthUTC = Date.UTC(
    adjustedDate.getUTCFullYear(),
    adjustedDate.getUTCMonth(),
    adjustedDate.getUTCDate(),
  );

  const refUTC = Date.UTC(
    refDate.getUTCFullYear(),
    refDate.getUTCMonth(),
    refDate.getUTCDate(),
  );

  const dayDiff = Math.round((birthUTC - refUTC) / (24 * 60 * 60 * 1000));
  const dayIndex = ((refIdx + dayDiff) % 60 + 60) % 60;

  const stemIdx = stemFromSexagenary(dayIndex);
  const branchIdx = branchFromSexagenary(dayIndex);

  return buildPillar(stemIdx, branchIdx, dayIndex);
}

// ---- Hour Pillar ----

/**
 * Calculate the hour pillar (时柱) based on true solar time.
 *
 * Hour branch: determined by the true solar time (2-hour blocks).
 * Hour stem: determined by the day stem (日上起时法 / 五鼠遁).
 */
function calcHourPillar(
  date: Date,
  longitude: number,
  isDST: boolean,
  dayStem: HeavenlyStemIndex,
): Pillar {
  // Get the hour branch from true solar time
  const hourBranch = getHourBranch(date, longitude, isDST) as EarthlyBranchIndex;

  // Hour stem from 日上起时法 (五鼠遁)
  const hourStemStart = getHourStemStart(dayStem);
  const hourStem = ((hourStemStart + hourBranch) % 10) as HeavenlyStemIndex;

  const sexIdx = sexagenaryIndex(hourStem, hourBranch);
  return buildPillar(hourStem, hourBranch, sexIdx);
}

// ---- Helpers ----

function buildPillar(
  stemIdx: HeavenlyStemIndex,
  branchIdx: EarthlyBranchIndex,
  sexIdx: SexagenaryIndex,
): Pillar {
  return {
    stem: getStem(stemIdx),
    branch: getBranch(branchIdx),
    stemIndex: stemIdx,
    branchIndex: branchIdx,
    sexagenaryIndex: sexIdx,
    hiddenStems: getHiddenStems(branchIdx),
    nayin: getNayin(sexIdx),
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
  const birthDate = new Date(
    birth.year,
    birth.month - 1,
    birth.day,
    birth.hour,
    birth.minute,
  );

  // Calculate pillars in dependency order:
  // Year first (needed for month stem)
  // Day second (needed for hour stem)
  // Then month and hour

  const yearPillar = calcYearPillar(birthDate, birth.isDST);
  const dayPillar = calcDayPillar(birthDate, birth.isDST);
  const monthPillar = calcMonthPillar(birthDate, birth.isDST, yearPillar.stemIndex);
  const hourPillar = calcHourPillar(
    birthDate,
    birth.longitude,
    birth.isDST,
    dayPillar.stemIndex,
  );

  // Compute shiShen (十神) for each pillar relative to the day master
  const dmIdx = dayPillar.stemIndex;
  yearPillar.shiShen = getShiShen(dmIdx, yearPillar.stemIndex);
  monthPillar.shiShen = getShiShen(dmIdx, monthPillar.stemIndex);
  dayPillar.shiShen = getShiShen(dmIdx, dayPillar.stemIndex);
  hourPillar.shiShen = getShiShen(dmIdx, hourPillar.stemIndex);

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
  };
}

/**
 * Generate a complete destiny chart from birth information.
 */
export function generateChart(birth: BirthInfo): DestinyChart {
  const bazi = calcBaZi(birth);
  const wuxingCount = countWuxing(bazi);

  // Calculate DaYun
  const dayun = calcDaYun(birth, bazi.month, bazi.year.stemIndex);

  // Current age
  const birthDate = new Date(birth.year, birth.month - 1, birth.day);
  const currentAge =
    (new Date().getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const currentDayun = getCurrentDayun(dayun, currentAge);

  return {
    bazi,
    birthInfo: birth,
    dayun,
    currentDayun,
    wuxingCount,
    dayMaster: bazi.day.stem,
    dayMasterWuxing: bazi.day.stem.wuxing,
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
    const hidden = p.hiddenStems.map(h => ALL_STEMS[h]!.name).join('');
    const label = labels[i]!;
    const name = SEXAGENARY_NAMES[p.sexagenaryIndex]!;
    lines.push(
      `${label} ${name.padEnd(4)}  ${p.stem.name}    ${p.branch.name}    ${hidden.padEnd(12)} ${p.nayin}`,
    );
  }

  return lines.join('\n');
}
