import type { BirthInfo, DaYunPillar, Pillar, HeavenlyStemIndex } from './types.js';
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
export declare function calcDaYun(birth: BirthInfo, monthPillar: Pillar, yearStem: HeavenlyStemIndex, dayMasterIndex: HeavenlyStemIndex): DaYunPillar[];
/**
 * Determine the current DaYun for a person at their current age.
 */
export declare function getCurrentDayun(dayun: DaYunPillar[], currentAge: number): DaYunPillar | null;
//# sourceMappingURL=dayun.d.ts.map