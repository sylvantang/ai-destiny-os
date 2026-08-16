import type { JieQi } from './types.js';
/** Convert a UTC Date to Julian Date. */
export declare function toJulianDate(date: Date): number;
/** Convert a Julian Date to a UTC Date. */
export declare function fromJulianDate(jd: number): Date;
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
export declare function sunPosition(jd: number): SunPosition;
/**
 * Calculate the Sun's apparent ecliptic longitude in degrees (0–360)
 * at a UT Julian Date. ShouXing/VSOP87 truncated series + nutation +
 * aberration + ΔT — arcsecond-level accuracy.
 */
export declare function sunLongitude(jd: number): number;
/**
 * Equation of Time in minutes for a Julian Date (Meeus Ch.28).
 * EoT = apparent solar time − mean solar time; positive = sundial ahead.
 * Accuracy ~1–2 seconds.
 */
export declare function equationOfTimeMinutes(jd: number): number;
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
export declare function getJieQi(year: number): JieQi[];
/**
 * Get the specific solar term (by name or index) for a given year.
 */
export declare function getJieQiByName(year: number, name: string): JieQi | undefined;
/**
 * Determine which month branch a given date falls into based on solar terms.
 * The month branch changes at each 节 (not 气).
 *
 * The date is interpreted as a UTC+8 (China Standard Time) wall-clock
 * instant; isDST subtracts one hour explicitly.
 *
 * Returns the earthly branch index of the month (寅=2, 卯=3, ..., 丑=1).
 */
export declare function getMonthBranchByDate(date: Date, isDST: boolean): number;
//# sourceMappingURL=jieqi.d.ts.map