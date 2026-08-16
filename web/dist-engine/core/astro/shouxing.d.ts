declare const XL0: number[];
declare const NUT_B: number[];
declare const DT_AT: number[];
export { XL0, NUT_B, DT_AT };
/**
 * Julian Date (UT) when the Sun's apparent ecliptic longitude reaches
 * the given degree (0-360). approxJD is a rough Julian Date guess for
 * the target year (within ~±10 days). Arcsecond-level accuracy
 * (ShouXing/VSOP87 truncated series + nutation + aberration + ΔT).
 */
export declare function solarTermToJulianDateUT(targetLonDeg: number, approxJD: number): number;
/**
 * Sun's apparent ecliptic longitude (degrees, 0-360) at a UT Julian Date.
 */
export declare function sunApparentLongitudeUT(jdUT: number): number;
//# sourceMappingURL=shouxing.d.ts.map