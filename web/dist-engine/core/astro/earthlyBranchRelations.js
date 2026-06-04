// ============================================================
// AI Destiny OS — Astro Core: Earthly Branch Relations
// 六冲 / 六合 / 三刑 / 六害 — deterministic lookup tables.
// ============================================================
// ---- 六冲 (Six Clashes) ----
const BRANCH_CLASHES = {
    0: 6, 1: 7, 2: 8, 3: 9, 4: 10, 5: 11,
    6: 0, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5,
};
export function isClash(a, b) {
    return BRANCH_CLASHES[a] === b;
}
export function getClashPair(a) {
    if (a in BRANCH_CLASHES)
        return BRANCH_CLASHES[a];
    return null;
}
/** All 6 clash pairs as [branchA, branchB, description] */
export const CLASH_PAIRS = [
    [0, 6, '子午冲'], [1, 7, '丑未冲'], [2, 8, '寅申冲'],
    [3, 9, '卯酉冲'], [4, 10, '辰戌冲'], [5, 11, '巳亥冲'],
];
// ---- 六合 (Six Combinations) ----
const BRANCH_COMBINATIONS = {
    0: 1, 1: 0, // 子丑合土
    2: 11, 11: 2, // 寅亥合木
    3: 10, 10: 3, // 卯戌合火
    4: 9, 9: 4, // 辰酉合金
    5: 8, 8: 5, // 巳申合水
    6: 7, 7: 6, // 午未合土
};
export function isCombination(a, b) {
    return BRANCH_COMBINATIONS[a] === b;
}
export function getCombinationPartner(a) {
    if (a in BRANCH_COMBINATIONS)
        return BRANCH_COMBINATIONS[a];
    return null;
}
/** Combination → resulting wuxing element */
export const COMBINATION_WUXING = {
    '0,1': '土', '1,0': '土',
    '2,11': '木', '11,2': '木',
    '3,10': '火', '10,3': '火',
    '4,9': '金', '9,4': '金',
    '5,8': '水', '8,5': '水',
    '6,7': '土', '7,6': '土',
};
/**
 * Check if two earthly branches form a punishment (刑).
 * Returns the punishment type or null.
 */
export function getPunishment(a, b) {
    // 寅巳申 → 无恩之刑 (Ungrateful punishment)
    if ((a === 2 && (b === 5 || b === 8)) || (b === 2 && (a === 5 || a === 8)))
        return '无恩之刑';
    if (a === 5 && b === 8 || a === 8 && b === 5)
        return '无恩之刑';
    // 丑戌未 → 恃势之刑 (Abuse-of-power punishment)
    if ((a === 1 && (b === 10 || b === 7)) || (b === 1 && (a === 10 || a === 7)))
        return '恃势之刑';
    if (a === 10 && b === 7 || a === 7 && b === 10)
        return '恃势之刑';
    // 子卯 → 无礼之刑 (Discourtesy punishment)
    if ((a === 0 && b === 3) || (a === 3 && b === 0))
        return '无礼之刑';
    return null;
}
/**
 * Check if a single branch forms a self-punishment (自刑).
 */
export function isSelfPunishment(branch) {
    // 辰、午、酉、亥 → 自刑
    return branch === 4 || branch === 6 || branch === 9 || branch === 11;
}
// ---- 六害 (Six Harms) ----
const BRANCH_HARMS = {
    0: 7, 7: 0, // 子未害
    1: 6, 6: 1, // 丑午害
    2: 5, 5: 2, // 寅巳害
    3: 4, 4: 3, // 卯辰害
    8: 11, 11: 8, // 申亥害
    9: 10, 10: 9, // 酉戌害
};
export function isHarm(a, b) {
    return BRANCH_HARMS[a] === b;
}
export function getHarm(a, b) {
    if (isHarm(a, b)) {
        const pair = [a, b].sort((x, y) => x - y);
        const key = `${pair[0]},${pair[1]}`;
        const labels = {
            '0,7': '子未害', '1,6': '丑午害', '2,5': '寅巳害',
            '3,4': '卯辰害', '8,11': '申亥害', '9,10': '酉戌害',
        };
        return { harm: true, description: labels[key] ?? '地支相害' };
    }
    return null;
}
// ---- 三合局 (Three Harmony Combinations) ----
/** 三合局: three specific branches form a complete harmony, producing a wuxing element. */
export const THREE_HARMONY_SETS = [
    { branches: [8, 0, 4], wuxing: '水', name: '申子辰三合水局' }, // 申子辰 → 水
    { branches: [11, 3, 7], wuxing: '木', name: '亥卯未三合木局' }, // 亥卯未 → 木
    { branches: [2, 6, 10], wuxing: '火', name: '寅午戌三合火局' }, // 寅午戌 → 火
    { branches: [5, 9, 1], wuxing: '金', name: '巳酉丑三合金局' }, // 巳酉丑 → 金
];
/** 半合局: two of the three branches in a 三合 (must include the central branch 子/卯/午/酉). */
export const HALF_HARMONY_PAIRS = {
    '0,8': { wuxing: '水', name: '申子半合水' }, // 申子
    '0,4': { wuxing: '水', name: '子辰半合水' }, // 子辰
    '3,11': { wuxing: '木', name: '亥卯半合木' }, // 亥卯
    '3,7': { wuxing: '木', name: '卯未半合木' }, // 卯未
    '2,6': { wuxing: '火', name: '寅午半合火' }, // 寅午
    '6,10': { wuxing: '火', name: '午戌半合火' }, // 午戌
    '5,9': { wuxing: '金', name: '巳酉半合金' }, // 巳酉
    '1,9': { wuxing: '金', name: '酉丑半合金' }, // 酉丑
};
export function getHalfHarmony(a, b) {
    const key = [a, b].sort((x, y) => x - y).join(',');
    return HALF_HARMONY_PAIRS[key] ?? null;
}
// ---- 三会局 (Three Meetings / Directional Combinations) ----
/** 三会局: three consecutive branches form the strongest directional force. */
export const THREE_MEETING_SETS = [
    { branches: [2, 3, 4], wuxing: '木', name: '寅卯辰三会木局' }, // 东方木
    { branches: [5, 6, 7], wuxing: '火', name: '巳午未三会火局' }, // 南方火
    { branches: [8, 9, 10], wuxing: '金', name: '申酉戌三会金局' }, // 西方金
    { branches: [11, 0, 1], wuxing: '水', name: '亥子丑三会水局' }, // 北方水
];
// ---- 天干冲 (Heavenly Stem Clashes) ----
/** 天干相冲: stems 5 positions apart (甲庚/乙辛/丙壬/丁癸). */
export function isStemClash(a, b) {
    // Stems 6 positions apart clash: 甲(0)↔庚(6), 乙(1)↔辛(7), 丙(2)↔壬(8), 丁(3)↔癸(9)
    return Math.abs(a - b) === 6;
}
export function getStemClashName(a, b) {
    if (!isStemClash(a, b))
        return null;
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    return `${stems[Math.min(a, b)]}${stems[Math.max(a, b)]}相冲`;
}
/** 天干五合: 甲己合土/乙庚合金/丙辛合水/丁壬合木/戊癸合火. */
export function isStemCombine(a, b) {
    const pairs = {
        0: { partner: 5, wuxing: '土', name: '甲己合土' },
        1: { partner: 6, wuxing: '金', name: '乙庚合金' },
        2: { partner: 7, wuxing: '水', name: '丙辛合水' },
        3: { partner: 8, wuxing: '木', name: '丁壬合木' },
        4: { partner: 9, wuxing: '火', name: '戊癸合火' },
        5: { partner: 0, wuxing: '土', name: '甲己合土' },
        6: { partner: 1, wuxing: '金', name: '乙庚合金' },
        7: { partner: 2, wuxing: '水', name: '丙辛合水' },
        8: { partner: 3, wuxing: '木', name: '丁壬合木' },
        9: { partner: 4, wuxing: '火', name: '戊癸合火' },
    };
    const pair = pairs[a];
    if (pair && pair.partner === b) {
        return { wuxing: pair.wuxing, name: pair.name };
    }
    return null;
}
//# sourceMappingURL=earthlyBranchRelations.js.map