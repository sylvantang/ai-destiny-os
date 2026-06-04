import type { HeavenlyStem, EarthlyBranch, HiddenStem, HeavenlyStemIndex, EarthlyBranchIndex, ShiShen, SexagenaryIndex } from './types.js';
export declare function getStem(index: HeavenlyStemIndex): HeavenlyStem;
export declare const ALL_STEMS: HeavenlyStem[];
export declare function getBranch(index: EarthlyBranchIndex): EarthlyBranch;
export declare const ALL_BRANCHES: EarthlyBranch[];
/**
 * Compute sexagenary index (0-59) from stem and branch.
 * Chinese Remainder Theorem: k ≡ stem (mod 10), k ≡ branch (mod 12)
 */
export declare function sexagenaryIndex(stem: number, branch: number): SexagenaryIndex;
/** Get stem index from sexagenary index */
export declare function stemFromSexagenary(idx: SexagenaryIndex): HeavenlyStemIndex;
/** Get branch index from sexagenary index */
export declare function branchFromSexagenary(idx: SexagenaryIndex): EarthlyBranchIndex;
/** All 60 sexagenary cycle names */
export declare const SEXAGENARY_NAMES: string[];
type HiddenStemsMap = Record<EarthlyBranchIndex, HiddenStem[]>;
export declare const HIDDEN_STEMS: HiddenStemsMap;
export declare function getHiddenStems(branch: EarthlyBranchIndex): HeavenlyStemIndex[];
export declare function getNayin(sexagenaryIdx: SexagenaryIndex): string;
/**
 * 根据日主天干和目标天干，判断十神关系。
 * dayMaster: 日主天干索引
 * target: 目标天干索引
 */
export declare function getShiShen(dayMaster: HeavenlyStemIndex, target: HeavenlyStemIndex): ShiShen;
export declare function getMonthStemStart(yearStem: HeavenlyStemIndex): HeavenlyStemIndex;
export declare function getHourStemStart(dayStem: HeavenlyStemIndex): HeavenlyStemIndex;
/** 24节气名称 (index 0 = 小寒) */
export declare const JIEQI_NAMES: string[];
/** 每个节气对应的太阳黄经 (0-360°) */
export declare const JIEQI_LONGITUDE: number[];
/** 换月的节 (month-changing jie) — the ones that determine the month pillar */
export declare const MONTH_CHANGING_JIE_INDICES: Set<number>;
/** Month-changing jie → month branch index (寅=2, ..., 丑=1) */
export declare const JIE_TO_MONTH_BRANCH: Record<number, EarthlyBranchIndex>;
export {};
//# sourceMappingURL=constants.d.ts.map