import type { JieQi } from './types.js';
/** Convert a UTC Date to Julian Date. */
export declare function toJulianDate(date: Date): number;
/** Convert a Julian Date to a UTC Date. */
export declare function fromJulianDate(jd: number): Date;
/**
 * Calculate the Sun's apparent ecliptic longitude in degrees (0–360).
 *
 * Based on Jean Meeus' simplified formula. Accuracy ~0.01°,
 * which corresponds to ~15 minutes of time. More than adequate
 * for BaZi purposes (1900–2100).
 */
export declare function sunLongitude(jd: number): number;
/**
 * Calculate all 24 solar terms for a given year.
 *
 * Returns an array of JieQi objects sorted by date.
 * The first term is 小寒 of the given year (falls in January).
 * The last term (冬至) falls in December of the given year.
 */
export declare function getJieQi(year: number): JieQi[];
/**
 * Get the specific solar term (by name or index) for a given year.
 */
export declare function getJieQiByName(year: number, name: string): JieQi | undefined;
/**
 * Determine which month branch a given date falls into based on solar terms.
 * The month branch changes at each 节 (not 气).
 *
 * Returns the earthly branch index of the month (寅=2, 卯=3, ..., 丑=1).
 */
export declare function getMonthBranchByDate(date: Date, isDST: boolean): number;
//# sourceMappingURL=jieqi.d.ts.map