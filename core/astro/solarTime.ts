// ============================================================
// AI Destiny OS — Astro Core: True Solar Time
// Converts clock time to true solar (apparent) time for
// accurate hour-pillar determination.
//
// All Date objects are treated as pure instants (epoch ms);
// wall-clock reads are done against UTC+8 (China Standard Time)
// so results never depend on the host machine timezone or its
// historical DST tables.
// ============================================================

import { equationOfTimeMinutes, toJulianDate } from './jieqi.js';

const HOUR_MS = 3600 * 1000;
const CST_OFFSET_MS = 8 * HOUR_MS;

/**
 * Compute the Equation of Time (in minutes) for a given instant.
 * Equation of Time = apparent solar time − mean solar time.
 * Positive means the sundial is ahead of the clock.
 *
 * Time-aware (JD-based) implementation, accuracy ~1–2 seconds
 * (Meeus Ch.28).
 */
export function equationOfTime(date: Date): number {
  return equationOfTimeMinutes(toJulianDate(date));
}

/**
 * Convert standard clock time to true solar time.
 *
 * @param date - The clock instant (interpreted as UTC+8 wall clock)
 * @param longitude - Observer's longitude in degrees (east positive)
 * @param standardMeridian - Timezone's standard meridian (default 120°E for China)
 * @returns True solar time as a Date (instant)
 */
export function toTrueSolarTime(
  date: Date,
  longitude: number,
  standardMeridian: number = 120,
): Date {
  // 1. Local mean time offset: 4 minutes per degree of longitude difference
  const lmtOffsetMinutes = (longitude - standardMeridian) * 4;

  // 2. Equation of time correction
  const eotMinutes = equationOfTime(date);

  // 3. Total offset
  const totalOffsetMinutes = lmtOffsetMinutes + eotMinutes;

  // 4. Apply offset
  return new Date(date.getTime() + totalOffsetMinutes * 60 * 1000);
}

/**
 * Read the UTC+8 (China Standard Time) wall clock of an instant as
 * minutes since midnight. Independent of the host timezone.
 */
function cstWallMinutes(instant: Date): number {
  const cst = new Date(instant.getTime() + CST_OFFSET_MS);
  return cst.getUTCHours() * 60 + cst.getUTCMinutes();
}

/**
 * Get the true solar time as decimal hours.
 *
 * @param date - The clock instant (UTC+8 wall clock)
 * @param longitude - Observer's longitude (east positive)
 * @param isDST - True if the given wall clock already includes DST
 * @param standardMeridian - Clock-time standard meridian (default 120°E)
 */
export function getSolarHours(
  date: Date,
  longitude: number,
  isDST: boolean,
  standardMeridian: number = 120,
): number {
  // Wall-clock minutes; DST observed clock → subtract 1h to standard time
  let wallMinutes = cstWallMinutes(date);
  if (isDST) wallMinutes -= 60;

  // Longitude correction: 4 minutes per degree from the standard meridian
  const lmtOffsetMinutes = (longitude - standardMeridian) * 4;

  // Equation of time (time-aware)
  const eotMinutes = equationOfTime(date);

  // True solar time in local minutes, normalized to 0–1439
  let solarTotalMinutes = wallMinutes + lmtOffsetMinutes + eotMinutes;
  solarTotalMinutes = ((solarTotalMinutes % 1440) + 1440) % 1440;

  return solarTotalMinutes / 60;
}

/**
 * Get the earthly branch index for an hour based on true solar time.
 *
 * Hour → Branch mapping (true solar time):
 *  子时: 23:00–00:59  (branch 0)
 *  丑时: 01:00–02:59  (branch 1)
 *  寅时: 03:00–04:59  (branch 2)
 *  卯时: 05:00–06:59  (branch 3)
 *  辰时: 07:00–08:59  (branch 4)
 *  巳时: 09:00–10:59  (branch 5)
 *  午时: 11:00–12:59  (branch 6)
 *  未时: 13:00–14:59  (branch 7)
 *  申时: 15:00–16:59  (branch 8)
 *  酉时: 17:00–18:59  (branch 9)
 *  戌时: 19:00–20:59  (branch 10)
 *  亥时: 21:00–22:59  (branch 11)
 */
export function getHourBranch(
  date: Date,
  longitude: number,
  isDST: boolean,
  standardMeridian: number = 120,
): number {
  const solarHours = getSolarHours(date, longitude, isDST, standardMeridian);
  const totalMinutes = solarHours * 60;

  // 子时: 23:00–00:59
  if (totalMinutes >= 23 * 60 || totalMinutes < 60) return 0;

  // 丑=1, 寅=2, ..., 亥=11
  // 1:00–2:59 → 1, 3:00–4:59 → 2, ...
  return Math.floor((totalMinutes + 60) / 120);
}
