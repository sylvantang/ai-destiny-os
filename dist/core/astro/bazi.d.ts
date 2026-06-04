import type { BaZi, BirthInfo, DestinyChart } from './types.js';
/**
 * Calculate the complete BaZi (Four Pillars) for a given birth.
 *
 * @param birth - Birth information including date, time, and location
 * @returns Complete BaZi chart
 */
export declare function calcBaZi(birth: BirthInfo): BaZi;
/**
 * Generate a complete destiny chart from birth information.
 */
export declare function generateChart(birth: BirthInfo): DestinyChart;
/**
 * Format a BaZi chart as a readable string.
 */
export declare function formatBaZi(bazi: BaZi): string;
//# sourceMappingURL=bazi.d.ts.map