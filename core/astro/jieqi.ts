// ============================================================
// AI Destiny OS — Astro Core: Solar Terms (节气)
// Calculates the 24 solar terms using sun ecliptic longitude
// (Meeus "Astronomical Algorithms" Ch.25, higher accuracy —
// nutation + aberration included, ~0.0003° ≈ 26 s of time).
// ============================================================

import { JIEQI_NAMES, JIEQI_LONGITUDE } from './constants.js';
import type { JieQi } from './types.js';
import { solarTermToJulianDateUT, sunApparentLongitudeUT } from './shouxing.js';

// ---- Julian Date Conversions ----

/** Convert a UTC Date to Julian Date. */
export function toJulianDate(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return (
    Math.floor(365.25 * (y + 4716))
    + Math.floor(30.6001 * (m + 1))
    + day
    + hour / 24
    + B
    - 1524.5
  );
}

/** Convert a Julian Date to a UTC Date. */
export function fromJulianDate(jd: number): Date {
  const Z = Math.floor(jd + 0.5);
  const F = jd + 0.5 - Z;

  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const dayInt = Math.floor(day);
  const frac = day - dayInt;

  const totalSeconds = frac * 86400;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);

  return new Date(Date.UTC(year, month - 1, dayInt, hours, minutes, seconds, ms));
}

// ---- Sun's Position (Meeus Ch.25, higher accuracy) ----

/** Sine of angle in degrees */
function sind(x: number): number {
  return Math.sin((x * Math.PI) / 180);
}

/** Cosine of angle in degrees */
function cosd(x: number): number {
  return Math.cos((x * Math.PI) / 180);
}

/** atan2 in degrees, normalized to 0-360 */
function atan2d(y: number, x: number): number {
  const r = (Math.atan2(y, x) * 180) / Math.PI;
  return r < 0 ? r + 360 : r;
}

function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

/** Full solar position bundle for a Julian Date. */
export interface SunPosition {
  /** Julian centuries from J2000.0 */
  T: number;
  /** Geometric mean longitude L0 (degrees) */
  meanLongitude: number;
  /** Mean anomaly M (degrees) */
  meanAnomaly: number;
  /** Equation of centre C (degrees) */
  equationOfCenter: number;
  /** True longitude ⊙ = L0 + C (degrees) */
  trueLongitude: number;
  /** Apparent longitude λ (degrees, nutation + aberration corrected) */
  apparentLongitude: number;
  /** Mean obliquity ε (degrees) */
  obliquity: number;
  /** Apparent right ascension α (degrees) */
  rightAscension: number;
}

/**
 * Calculate the Sun's apparent position (Meeus Ch.25, higher accuracy).
 * Accuracy ~0.0003° in longitude, ~26 seconds of time — suitable for
 * solar-term boundary decisions across 1900–2100.
 */
export function sunPosition(jd: number): SunPosition {
  const T = julianCenturies(jd);

  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;

  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sind(M)
    + (0.019993 - 0.000101 * T) * sind(2 * M)
    + 0.000289 * sind(3 * M);

  const trueLongitude = L0 + C;

  // Longitude of the Moon's ascending node
  const omega = 125.04 - 1934.136 * T;

  // Apparent longitude: true longitude + nutation + aberration
  const apparentLongitude = trueLongitude - 0.00569 - 0.00478 * sind(omega);

  // Mean obliquity of the ecliptic (Meeus 22.3, truncated)
  const obliquity =
    23.4392911 - 0.0130042 * T - 0.00000016 * T * T + 0.000000504 * T * T * T;

  // Apparent right ascension
  const rightAscension = atan2d(
    cosd(obliquity) * sind(apparentLongitude),
    cosd(apparentLongitude),
  );

  return {
    T,
    meanLongitude: L0,
    meanAnomaly: M,
    equationOfCenter: C,
    trueLongitude,
    apparentLongitude,
    obliquity,
    rightAscension,
  };
}

/**
 * Calculate the Sun's apparent ecliptic longitude in degrees (0–360)
 * at a UT Julian Date. ShouXing/VSOP87 truncated series + nutation +
 * aberration + ΔT — arcsecond-level accuracy.
 */
export function sunLongitude(jd: number): number {
  return sunApparentLongitudeUT(jd);
}

/**
 * Equation of Time in minutes for a Julian Date (Meeus Ch.28).
 * EoT = apparent solar time − mean solar time; positive = sundial ahead.
 * Accuracy ~1–2 seconds.
 */
export function equationOfTimeMinutes(jd: number): number {
  const pos = sunPosition(jd);
  // Mean longitude must be reduced to 0–360 for the formula
  const L0 = ((pos.meanLongitude % 360) + 360) % 360;
  // Nutation in longitude (degrees)
  const dpsi = -0.00478 * sind(125.04 - 1934.136 * pos.T);
  return 4 * (L0 - 0.0057183 - pos.rightAscension + dpsi * cosd(pos.obliquity));
}

// ---- Solar Term Finding ----

/**
 * Calculate all 24 solar terms for a given year.
 *
 * Returns an array of JieQi objects sorted by date (UTC instants).
 * The first term is 小寒 of the given year (falls in January).
 * The last term (冬至) falls in December of the given year.
 *
 * Arcsecond-level accuracy: ShouXing VSOP87-truncated solar series
 * with nutation, aberration and ΔT correction.
 */
export function getJieQi(year: number): JieQi[] {
  const results: JieQi[] = [];

  for (let i = 0; i < 24; i++) {
    const targetLon = JIEQI_LONGITUDE[i]!;

    // Rough guess: 小寒 (i=0) around Jan 6, each term ~15.218 days apart
    const jan1JD = toJulianDate(new Date(Date.UTC(year, 0, 1)));
    const approxJD = jan1JD + 5 + i * 15.218;

    const jd = solarTermToJulianDateUT(targetLon, approxJD);
    const date = fromJulianDate(jd);

    results.push({
      name: JIEQI_NAMES[i]!,
      index: i,
      isJie: i % 2 === 0, // Even indices are 节, odd are 气
      longitude: targetLon,
      date,
    });
  }

  return results.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Get the specific solar term (by name or index) for a given year.
 */
export function getJieQiByName(year: number, name: string): JieQi | undefined {
  return getJieQi(year).find((jq) => jq.name === name);
}

/**
 * Determine which month branch a given date falls into based on solar terms.
 * The month branch changes at each 节 (not 气).
 *
 * The date is interpreted as a UTC+8 (China Standard Time) wall-clock
 * instant; isDST subtracts one hour explicitly.
 *
 * Returns the earthly branch index of the month (寅=2, 卯=3, ..., 丑=1).
 */
export function getMonthBranchByDate(
  date: Date,
  isDST: boolean,
): number {
  const epoch = date.getTime() - (isDST ? 3600 * 1000 : 0);
  const wall = new Date(epoch + 8 * 3600 * 1000);
  const year = wall.getUTCFullYear();

  const thisYearJieQi = getJieQi(year);
  const prevYearJieQi = getJieQi(year - 1);

  const allJie = [...prevYearJieQi, ...thisYearJieQi]
    .filter((jq) => jq.isJie)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const JIE_INDEX_TO_MONTH: Record<number, number> = {
    0: 1,   // 小寒 → 丑月
    2: 2,   // 立春 → 寅月
    4: 3,   // 惊蛰 → 卯月
    6: 4,   // 清明 → 辰月
    8: 5,   // 立夏 → 巳月
    10: 6,  // 芒种 → 午月
    12: 7,  // 小暑 → 未月
    14: 8,  // 立秋 → 申月
    16: 9,  // 白露 → 酉月
    18: 10, // 寒露 → 戌月
    20: 11, // 立冬 → 亥月
    22: 0,  // 大雪 → 子月
  };

  let lastJie: JieQi | null = null;

  for (const jie of allJie) {
    if (jie.date.getTime() <= epoch) {
      lastJie = jie;
    } else {
      break;
    }
  }

  if (!lastJie) {
    // Before 小寒 of prev year — should be 丑月 of the year before
    return 1; // 丑月
  }

  return JIE_INDEX_TO_MONTH[lastJie.index] ?? 1;
}
