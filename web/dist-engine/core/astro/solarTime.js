// ============================================================
// AI Destiny OS — Astro Core: True Solar Time
// Converts clock time to true solar (apparent) time for
// accurate hour-pillar determination.
// ============================================================
/**
 * Compute the Equation of Time (in minutes) for a given date.
 * Equation of Time = apparent solar time − mean solar time.
 * Positive means the sundial is ahead of the clock.
 *
 * Uses a simplified but accurate (within ~30 seconds) formula.
 */
export function equationOfTime(date) {
    const dayOfYear = dayOfYearUTC(date);
    // Earth's orbital parameters
    const B = (2 * Math.PI * (dayOfYear - 1)) / 365;
    // Equation of time in minutes (simplified formula)
    return 229.18 * (0.000075
        + 0.001868 * Math.cos(B)
        - 0.032077 * Math.sin(B)
        - 0.014615 * Math.cos(2 * B)
        - 0.040849 * Math.sin(2 * B));
}
/**
 * Convert standard clock time to true solar time.
 *
 * @param date - Local clock time
 * @param longitude - Observer's longitude in degrees (east positive)
 * @param standardMeridian - Timezone's standard meridian (default 120°E for China)
 * @returns True solar time as a Date object
 */
export function toTrueSolarTime(date, longitude, standardMeridian = 120) {
    // 1. Compute local mean time offset: 4 minutes per degree of longitude difference
    const lmtOffsetMinutes = (longitude - standardMeridian) * 4;
    // 2. Equation of time correction
    const eotMinutes = equationOfTime(date);
    // 3. Total offset
    const totalOffsetMinutes = lmtOffsetMinutes + eotMinutes;
    // 4. Apply offset
    const result = new Date(date.getTime() + totalOffsetMinutes * 60 * 1000);
    return result;
}
/**
 * Get day of year (1-366) based on UTC date components
 * (so we avoid local DST / calendar surprises).
 */
function dayOfYearUTC(date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth(); // 0-indexed
    const day = date.getUTCDate();
    const startOfYear = Date.UTC(year, 0, 1);
    const currentDay = Date.UTC(year, month, day);
    return Math.floor((currentDay - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
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
export function getHourBranch(date, longitude, isDST) {
    const solarHours = getSolarHours(date, longitude, isDST);
    const totalMinutes = solarHours * 60;
    // 子时: 23:00–00:59
    if (totalMinutes >= 1380 || totalMinutes < 60)
        return 0;
    // 丑=1, 寅=2, ..., 亥=11
    // 1:00–2:59 → 1, 3:00–4:59 → 2, ...
    return Math.floor((totalMinutes + 60) / 120);
}
/**
 * Get the true solar time as decimal hours (local time).
 */
export function getSolarHours(date, longitude, isDST) {
    // If DST, adjust clock back to standard time
    const adjustedDate = isDST
        ? new Date(date.getTime() - 1 * 60 * 60 * 1000)
        : new Date(date);
    // Local clock hours and minutes
    const localHours = adjustedDate.getHours();
    const localMinutes = adjustedDate.getMinutes();
    // Longitude correction: 4 minutes per degree from standard meridian (120°E)
    const lmtOffsetMinutes = (longitude - 120) * 4;
    // Equation of time
    const eotMinutes = equationOfTime(adjustedDate);
    // True solar time in local minutes
    let solarTotalMinutes = localHours * 60 + localMinutes + lmtOffsetMinutes + eotMinutes;
    // Normalize to 0–1439
    solarTotalMinutes = ((solarTotalMinutes % 1440) + 1440) % 1440;
    return solarTotalMinutes / 60;
}
//# sourceMappingURL=solarTime.js.map