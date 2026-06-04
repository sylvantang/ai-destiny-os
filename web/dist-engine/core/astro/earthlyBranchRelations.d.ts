import type { EarthlyBranchIndex } from './types.js';
export declare function isClash(a: EarthlyBranchIndex, b: EarthlyBranchIndex): boolean;
export declare function getClashPair(a: EarthlyBranchIndex): EarthlyBranchIndex | null;
/** All 6 clash pairs as [branchA, branchB, description] */
export declare const CLASH_PAIRS: [EarthlyBranchIndex, EarthlyBranchIndex, string][];
export declare function isCombination(a: EarthlyBranchIndex, b: EarthlyBranchIndex): boolean;
export declare function getCombinationPartner(a: EarthlyBranchIndex): EarthlyBranchIndex | null;
/** Combination → resulting wuxing element */
export declare const COMBINATION_WUXING: Record<string, string>;
export type PunishmentType = '无恩之刑' | '恃势之刑' | '无礼之刑' | '自刑';
/**
 * Check if two earthly branches form a punishment (刑).
 * Returns the punishment type or null.
 */
export declare function getPunishment(a: EarthlyBranchIndex, b: EarthlyBranchIndex): PunishmentType | null;
/**
 * Check if a single branch forms a self-punishment (自刑).
 */
export declare function isSelfPunishment(branch: EarthlyBranchIndex): boolean;
export declare function isHarm(a: EarthlyBranchIndex, b: EarthlyBranchIndex): boolean;
export declare function getHarm(a: EarthlyBranchIndex, b: EarthlyBranchIndex): {
    harm: true;
    description: string;
} | null;
/** 三合局: three specific branches form a complete harmony, producing a wuxing element. */
export declare const THREE_HARMONY_SETS: {
    branches: [EarthlyBranchIndex, EarthlyBranchIndex, EarthlyBranchIndex];
    wuxing: string;
    name: string;
}[];
/** 半合局: two of the three branches in a 三合 (must include the central branch 子/卯/午/酉). */
export declare const HALF_HARMONY_PAIRS: Record<string, {
    wuxing: string;
    name: string;
}>;
export declare function getHalfHarmony(a: EarthlyBranchIndex, b: EarthlyBranchIndex): {
    wuxing: string;
    name: string;
} | null;
/** 三会局: three consecutive branches form the strongest directional force. */
export declare const THREE_MEETING_SETS: {
    branches: [EarthlyBranchIndex, EarthlyBranchIndex, EarthlyBranchIndex];
    wuxing: string;
    name: string;
}[];
/** 天干相冲: stems 5 positions apart (甲庚/乙辛/丙壬/丁癸). */
export declare function isStemClash(a: number, b: number): boolean;
export declare function getStemClashName(a: number, b: number): string | null;
/** 天干五合: 甲己合土/乙庚合金/丙辛合水/丁壬合木/戊癸合火. */
export declare function isStemCombine(a: number, b: number): {
    wuxing: string;
    name: string;
} | null;
//# sourceMappingURL=earthlyBranchRelations.d.ts.map