// ============================================================
// AI Destiny OS — Astro Core: DaYun (大运 / Major Fortune Cycles)
// ============================================================

import type {
  BirthInfo, DaYunPillar, Pillar,
  HeavenlyStemIndex, EarthlyBranchIndex,
} from './types.js';
import {
  getStem, getBranch, getHiddenStems, getNayin,
} from './constants.js';
import { getJieQi } from './jieqi.js';

/**
 * Calculate DaYun (大运) for a birth chart.
 *
 * Rules:
 * - 阳年 (year stem 甲丙戊庚壬): male → forward (顺排), female → backward (逆排)
 * - 阴年 (year stem 乙丁己辛癸): male → backward (逆排), female → forward (顺排)
 *
 * Forward: next month pillar, then +1 each cycle
 * Backward: previous month pillar, then -1 each cycle
 *
 * Starting age: count days from birth to the next/previous 节 (month-changing jie),
 * then divide by 3 (3 days = 1 age year).
 *
 * Each DaYun cycle lasts 10 years.
 */
export function calcDaYun(
  birth: BirthInfo,
  monthPillar: Pillar,
  yearStem: HeavenlyStemIndex,
): DaYunPillar[] {
  const direction = getDayunDirection(yearStem, birth.gender);
  const birthDate = buildBirthDate(birth);

  // Find the reference 节 for starting age calculation
  const refJieDate = findReferenceJie(birthDate, direction);
  const dayDiff = Math.abs(
    (refJieDate.getTime() - birthDate.getTime()) / (24 * 60 * 60 * 1000),
  );

  // Starting age: 3 days = 1 year
  const startAge = dayDiff / 3;

  // Birth year
  const birthYear = birth.year;

  // Generate DaYun sequence (±60 years from birth)
  const dayun: DaYunPillar[] = [];
  const baseIndex = monthPillar.sexagenaryIndex;

  // Generate enough cycles: from birth to ~90 years old
  const numCycles = 10;

  for (let i = 0; i < numCycles; i++) {
    // Forward: monthPillar + (i+1), Backward: monthPillar - (i+1)
    const offset = direction === '顺排' ? i + 1 : -(i + 1);
    const sexIdx = ((baseIndex + offset) % 60 + 60) % 60;

    const stemIdx = (sexIdx % 10) as HeavenlyStemIndex;
    const branchIdx = (sexIdx % 12) as EarthlyBranchIndex;

    const pillar: Pillar = {
      stem: getStem(stemIdx),
      branch: getBranch(branchIdx),
      stemIndex: stemIdx,
      branchIndex: branchIdx,
      sexagenaryIndex: sexIdx,
      hiddenStems: getHiddenStems(branchIdx),
      nayin: getNayin(sexIdx),
    };

    const cycleStartAge = startAge + i * 10;
    dayun.push({
      pillar,
      startAge: Math.round(cycleStartAge * 10) / 10,
      startYear: birthYear + Math.round(cycleStartAge),
      endYear: birthYear + Math.round(cycleStartAge) + 10,
      direction,
    });
  }

  return dayun;
}

/**
 * Determine the current DaYun for a person at their current age.
 */
export function getCurrentDayun(
  dayun: DaYunPillar[],
  currentAge: number,
): DaYunPillar | null {
  for (const dy of dayun) {
    if (currentAge >= dy.startAge && currentAge < dy.startAge + 10) {
      return dy;
    }
  }
  return null;
}

// ---- Internal helpers ----

function getDayunDirection(
  yearStem: HeavenlyStemIndex,
  gender: '男' | '女',
): '顺排' | '逆排' {
  // 阳年: stem index is even (甲0,丙2,戊4,庚6,壬8)
  const isYangYear = yearStem % 2 === 0;

  if (isYangYear) {
    // 阳男阴女 → 顺排, 阳女阴男 → 逆排
    return gender === '男' ? '顺排' : '逆排';
  }
  return gender === '男' ? '逆排' : '顺排';
}

function buildBirthDate(birth: BirthInfo): Date {
  const d = new Date(birth.year, birth.month - 1, birth.day, birth.hour, birth.minute);
  if (birth.isDST) {
    d.setHours(d.getHours() - 1);
  }
  return d;
}

/**
 * Find the reference 节 (month-changing jie) for DaYun starting age calculation.
 *
 * 顺排: find the NEXT 节 AFTER birth
 * 逆排: find the PREVIOUS 节 BEFORE birth
 */
function findReferenceJie(
  birthDate: Date,
  direction: '顺排' | '逆排',
): Date {
  const year = birthDate.getUTCFullYear();

  // Get jie from surrounding years
  const prevYearJQ = getJieQi(year - 1);
  const thisYearJQ = getJieQi(year);
  const nextYearJQ = getJieQi(year + 1);

  const allJie = [...prevYearJQ, ...thisYearJQ, ...nextYearJQ]
    .filter(jq => jq.isJie)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const birthTime = birthDate.getTime();

  if (direction === '顺排') {
    // Find the NEXT 节 after birth
    for (const jie of allJie) {
      if (jie.date.getTime() > birthTime) {
        return jie.date;
      }
    }
    // Fallback: next year's 小寒
    return allJie[allJie.length - 1]?.date ?? birthDate;
  }

  // 逆排: find the PREVIOUS 节 before birth
  let prevJie = allJie[0];
  for (const jie of allJie) {
    if (jie.date.getTime() >= birthTime) break;
    prevJie = jie;
  }
  return prevJie?.date ?? birthDate;
}
