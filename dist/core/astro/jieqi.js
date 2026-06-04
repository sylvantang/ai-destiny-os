// ============================================================
// AI Destiny OS — Astro Core: Solar Terms (节气)
// Calculates the 24 solar terms using sun ecliptic longitude.
// ============================================================
import { JIEQI_NAMES, JIEQI_LONGITUDE } from './constants.js';
// ---- Julian Date Conversions ----
/** Convert a UTC Date to Julian Date. */
export function toJulianDate(date) {
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
    return (Math.floor(365.25 * (y + 4716))
        + Math.floor(30.6001 * (m + 1))
        + day
        + hour / 24
        + B
        - 1524.5);
}
/** Convert a Julian Date to a UTC Date. */
export function fromJulianDate(jd) {
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
// ---- Sun's Ecliptic Longitude ----
/** Sine of angle in degrees */
function sind(x) {
    return Math.sin((x * Math.PI) / 180);
}
/**
 * Calculate the Sun's apparent ecliptic longitude in degrees (0–360).
 *
 * Based on Jean Meeus' simplified formula. Accuracy ~0.01°,
 * which corresponds to ~15 minutes of time. More than adequate
 * for BaZi purposes (1900–2100).
 */
export function sunLongitude(jd) {
    // Julian centuries from J2000.0
    const T = (jd - 2451545.0) / 36525.0;
    // Mean anomaly of the Sun
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    // Equation of centre
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sind(M)
        + (0.019993 - 0.000101 * T) * sind(2 * M)
        + 0.000289 * sind(3 * M);
    // Mean ecliptic longitude
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    // True ecliptic longitude (mod 360)
    const L = (L0 + C) % 360;
    return L < 0 ? L + 360 : L;
}
// ---- Solar Term Finding ----
/**
 * Find the exact Julian Date when the Sun reaches a specific
 * ecliptic longitude. Uses Newton-Raphson iteration.
 *
 * @param year - Gregorian year
 * @param targetLon - Target ecliptic longitude in degrees (0-360)
 * @param approxJD - Initial guess (JD)
 */
function findSolarTermJD(targetLon, approxJD) {
    let jd = approxJD;
    // Newton-Raphson: iterate up to 10 times
    for (let i = 0; i < 10; i++) {
        const lon = sunLongitude(jd);
        // Difference accounting for circular wrap
        let diff = targetLon - lon;
        if (diff > 180)
            diff -= 360;
        if (diff < -180)
            diff += 360;
        if (Math.abs(diff) < 0.0001)
            break; // converged (~1 second accuracy)
        // Derivative: sun moves ~0.9856° per day
        // Adjust: jd + diff / dailyMotion
        const dailyMotion = 0.9856;
        jd += diff / dailyMotion;
    }
    return jd;
}
/**
 * Calculate all 24 solar terms for a given year.
 *
 * Returns an array of JieQi objects sorted by date.
 * The first term is 小寒 of the given year (falls in January).
 * The last term (冬至) falls in December of the given year.
 */
export function getJieQi(year) {
    const results = [];
    // Approximate times for each solar term:
    // Each term is ~365.2422 / 24 ≈ 15.22 days apart.
    // Term 0 (小寒) is around Jan 5–7.
    // We use a rough estimate of Jan 6 for term 0.
    for (let i = 0; i < 24; i++) {
        const targetLon = JIEQI_LONGITUDE[i];
        // Rough guess: Jan 1 + i * 15.2 days
        // Actually, term 0 (小寒) is around Jan 5-7. Let's estimate:
        // The base reference: vernal equinox (春分, i=5, 0°) is around March 20
        // So term 0 (小寒) = March 20 - 5 * 15.218 ≈ March 20 - 76 ≈ Jan 3
        // Let's just use a direct approximation
        // Better approximation: compute rough JD for each term
        // Start with the year's Jan 1
        const jan1 = Date.UTC(year, 0, 1);
        const jan1JD = toJulianDate(new Date(jan1));
        // Each term is ~15.218 days apart
        // 小寒 (i=0) is roughly at Jan 6 = day 5
        const roughDayOffset = 5 + i * 15.218;
        const approxJD = jan1JD + roughDayOffset;
        const exactJD = findSolarTermJD(targetLon, approxJD);
        const date = fromJulianDate(exactJD);
        results.push({
            name: JIEQI_NAMES[i],
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
export function getJieQiByName(year, name) {
    return getJieQi(year).find(jq => jq.name === name);
}
/**
 * Determine which month branch a given date falls into based on solar terms.
 * The month branch changes at each 节 (not 气).
 *
 * Returns the earthly branch index of the month (寅=2, 卯=3, ..., 丑=1).
 */
export function getMonthBranchByDate(date, isDST) {
    const solarDate = applyDST(date, isDST);
    const year = solarDate.getUTCFullYear();
    // Get solar terms for this year and the previous year
    // (because someone born in January is in the previous year's 丑月)
    const thisYearJieQi = getJieQi(year);
    const prevYearJieQi = getJieQi(year - 1);
    // Combine the relevant solar terms: the 12 节 terms
    const allJie = [...prevYearJieQi, ...thisYearJieQi]
        .filter(jq => jq.isJie)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    // Find which interval the date falls into
    // The 节 marks the START of a month. So we look for the last 节 before the given date.
    let lastJie = null;
    // The jie-to-month mapping
    const JIE_INDEX_TO_MONTH = {
        0: 1, // 小寒 → 丑月
        2: 2, // 立春 → 寅月
        4: 3, // 惊蛰 → 卯月
        6: 4, // 清明 → 辰月
        8: 5, // 立夏 → 巳月
        10: 6, // 芒种 → 午月
        12: 7, // 小暑 → 未月
        14: 8, // 立秋 → 申月
        16: 9, // 白露 → 酉月
        18: 10, // 寒露 → 戌月
        20: 11, // 立冬 → 亥月
        22: 0, // 大雪 → 子月
    };
    for (const jie of allJie) {
        if (jie.date.getTime() <= solarDate.getTime()) {
            lastJie = jie;
        }
        else {
            break;
        }
    }
    if (!lastJie) {
        // Before 小寒 of prev year — should be 丑月 of the year before
        return 1; // 丑月
    }
    return JIE_INDEX_TO_MONTH[lastJie.index] ?? 1;
}
function applyDST(date, isDST) {
    if (!isDST)
        return date;
    return new Date(date.getTime() - 1 * 60 * 60 * 1000);
}
//# sourceMappingURL=jieqi.js.map