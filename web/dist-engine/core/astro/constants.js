// ============================================================
// AI Destiny OS — Astro Core: Constants & Lookup Tables
// ============================================================
// ---- Heavenly Stems ----
const STEM_NAMES = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const STEM_WUXING = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
const STEM_YINYANG = ['阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴'];
export function getStem(index) {
    return {
        index,
        name: STEM_NAMES[index],
        wuxing: STEM_WUXING[index],
        yinYang: STEM_YINYANG[index],
    };
}
export const ALL_STEMS = Array.from({ length: 10 }, (_, i) => getStem(i));
// ---- Earthly Branches ----
const BRANCH_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const BRANCH_WUXING = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
const BRANCH_YINYANG = ['阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴'];
export function getBranch(index) {
    return {
        index,
        name: BRANCH_NAMES[index],
        wuxing: BRANCH_WUXING[index],
        yinYang: BRANCH_YINYANG[index],
    };
}
export const ALL_BRANCHES = Array.from({ length: 12 }, (_, i) => getBranch(i));
// ---- Sexagenary Cycle (六十甲子) ----
/**
 * Compute sexagenary index (0-59) from stem and branch.
 * Chinese Remainder Theorem: k ≡ stem (mod 10), k ≡ branch (mod 12)
 */
export function sexagenaryIndex(stem, branch) {
    const m = (stem - branch) / 2;
    const t = ((m % 6) + 6) % 6;
    return stem + 10 * t;
}
/** Get stem index from sexagenary index */
export function stemFromSexagenary(idx) {
    return (idx % 10);
}
/** Get branch index from sexagenary index */
export function branchFromSexagenary(idx) {
    return (idx % 12);
}
/** All 60 sexagenary cycle names */
export const SEXAGENARY_NAMES = Array.from({ length: 60 }, (_, i) => {
    const s = STEM_NAMES[i % 10];
    const b = BRANCH_NAMES[i % 12];
    return s + b;
});
export const HIDDEN_STEMS = {
    0: [{ stem: 9, dominant: true }], // 子: 癸
    1: [{ stem: 5, dominant: true }, { stem: 9, dominant: false }, { stem: 7, dominant: false }], // 丑: 己癸辛
    2: [{ stem: 0, dominant: true }, { stem: 2, dominant: false }, { stem: 4, dominant: false }], // 寅: 甲丙戊
    3: [{ stem: 1, dominant: true }], // 卯: 乙
    4: [{ stem: 4, dominant: true }, { stem: 1, dominant: false }, { stem: 9, dominant: false }], // 辰: 戊乙癸
    5: [{ stem: 2, dominant: true }, { stem: 6, dominant: false }, { stem: 4, dominant: false }], // 巳: 丙庚戊
    6: [{ stem: 3, dominant: true }, { stem: 5, dominant: false }], // 午: 丁己
    7: [{ stem: 5, dominant: true }, { stem: 3, dominant: false }, { stem: 1, dominant: false }], // 未: 己丁乙
    8: [{ stem: 6, dominant: true }, { stem: 8, dominant: false }, { stem: 4, dominant: false }], // 申: 庚壬戊
    9: [{ stem: 7, dominant: true }], // 酉: 辛
    10: [{ stem: 4, dominant: true }, { stem: 7, dominant: false }, { stem: 3, dominant: false }], // 戌: 戊辛丁
    11: [{ stem: 8, dominant: true }, { stem: 0, dominant: false }], // 亥: 壬甲
};
export function getHiddenStems(branch) {
    return HIDDEN_STEMS[branch].map(h => h.stem);
}
// ---- Nayin (纳音) ----
const NAYIN_PAIRS = [
    '海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火',
    '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土',
    '霹雳火', '松柏木', '长流水', '砂中金', '山下火', '平地木',
    '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金',
    '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
];
// Each pair covers 2 consecutive sexagenary indices
const NAYIN_TABLE = NAYIN_PAIRS.flatMap(n => [n, n]);
export function getNayin(sexagenaryIdx) {
    return NAYIN_TABLE[sexagenaryIdx];
}
// ---- Wuxing Relationships ----
/** 五行相生: 我生者 */
const WUXING_SHENG_BY = {
    '水': '木', // 水生木
    '木': '火', // 木生火
    '火': '土', // 火生土
    '土': '金', // 土生金
    '金': '水', // 金生水
};
/** 五行相克: 克我者 */
const WUXING_KE = {
    '木': '金', // 金克木
    '火': '水', // 水克火
    '土': '木', // 木克土
    '金': '火', // 火克金
    '水': '土', // 土克水
};
/** 五行相克: 我克者 */
const WUXING_KE_BY = {
    '金': '木', // 金克木
    '水': '火', // 水克火
    '木': '土', // 木克土
    '火': '金', // 火克金
    '土': '水', // 土克水
};
// ---- ShiShen (十神) Calculation ----
/**
 * 根据日主天干和目标天干，判断十神关系。
 * dayMaster: 日主天干索引
 * target: 目标天干索引
 */
export function getShiShen(dayMaster, target) {
    const myWx = STEM_WUXING[dayMaster];
    const tWx = STEM_WUXING[target];
    const sameYinYang = STEM_YINYANG[dayMaster] === STEM_YINYANG[target];
    if (myWx === tWx) {
        return sameYinYang ? '比肩' : '劫财';
    }
    if (WUXING_SHENG_BY[myWx] === tWx) {
        return sameYinYang ? '食神' : '伤官';
    }
    if (WUXING_KE_BY[myWx] === tWx) {
        return sameYinYang ? '偏财' : '正财';
    }
    if (WUXING_KE[myWx] === tWx) {
        return sameYinYang ? '七杀' : '正官';
    }
    // WUXING_SHENG[myWx] === tWx
    return sameYinYang ? '偏印' : '正印';
}
// ---- Month Pillar Stem Group (年上起月法) ----
/**
 * Year stem to month stem start index.
 * 甲己年 → 丙寅(2), 乙庚年 → 戊寅(4), 丙辛年 → 庚寅(6),
 * 丁壬年 → 壬寅(8), 戊癸年 → 甲寅(0)
 */
const YEAR_STEM_TO_MONTH_STEM_START = {
    0: 2, 5: 2, // 甲己 → 丙(2)
    1: 4, 6: 4, // 乙庚 → 戊(4)
    2: 6, 7: 6, // 丙辛 → 庚(6)
    3: 8, 8: 8, // 丁壬 → 壬(8)
    4: 0, 9: 0, // 戊癸 → 甲(0)
};
export function getMonthStemStart(yearStem) {
    return YEAR_STEM_TO_MONTH_STEM_START[yearStem];
}
// ---- Hour Pillar Stem Group (日上起时法) ----
/**
 * Day stem to hour stem start index (for 子 hour).
 * 甲己日 → 甲子(0), 乙庚日 → 丙子(2), 丙辛日 → 戊子(4),
 * 丁壬日 → 庚子(6), 戊癸日 → 壬子(8)
 */
const DAY_STEM_TO_HOUR_STEM_START = {
    0: 0, 5: 0, // 甲己 → 甲(0)
    1: 2, 6: 2, // 乙庚 → 丙(2)
    2: 4, 7: 4, // 丙辛 → 戊(4)
    3: 6, 8: 6, // 丁壬 → 庚(6)
    4: 8, 9: 8, // 戊癸 → 壬(8)
};
export function getHourStemStart(dayStem) {
    return DAY_STEM_TO_HOUR_STEM_START[dayStem];
}
// ---- Solar Terms Reference ----
/** 24节气名称 (index 0 = 小寒) */
export const JIEQI_NAMES = [
    '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
    '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
    '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
];
/** 每个节气对应的太阳黄经 (0-360°) */
export const JIEQI_LONGITUDE = [
    285, 300, 315, 330, 345, 0,
    15, 30, 45, 60, 75, 90,
    105, 120, 135, 150, 165, 180,
    195, 210, 225, 240, 255, 270,
];
/** 换月的节 (month-changing jie) — the ones that determine the month pillar */
export const MONTH_CHANGING_JIE_INDICES = new Set([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
/** Month-changing jie → month branch index (寅=2, ..., 丑=1) */
export const JIE_TO_MONTH_BRANCH = {
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
//# sourceMappingURL=constants.js.map