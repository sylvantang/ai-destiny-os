import type { LiuNian, Pillar, HeavenlyStemIndex, BaZi } from './types.js';
/**
 * Calculate LiuNian (流年 / annual fortune) for a range of years.
 *
 * Each year has its own year pillar (determined by the sexagenary cycle,
 * with 立春 as the cutoff). This year pillar interacts with the natal
 * BaZi chart to produce influence scores.
 */
export declare function calcLiuNian(bazi: BaZi, startYear: number, endYear: number): LiuNian[];
/**
 * Calculate LiuYue (流月 / monthly fortune) for a specific year.
 *
 * Each month's pillar is determined by the year stem and the solar term.
 */
export declare function calcLiuYue(bazi: BaZi, year: number): {
    month: number;
    pillar: Pillar;
}[];
/**
 * Calculate LiuRi (流日 / daily fortune) for a specific date.
 */
export declare function calcLiuRi(date: Date, dayMasterIndex: HeavenlyStemIndex): Pillar;
//# sourceMappingURL=liunian.d.ts.map