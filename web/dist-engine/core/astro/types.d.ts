/** 天干索引 (0-9): 甲0 乙1 丙2 丁3 戊4 己5 庚6 辛7 壬8 癸9 */
export type HeavenlyStemIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
/** 地支索引 (0-11): 子0 丑1 寅2 卯3 辰4 巳5 午6 未7 申8 酉9 戌10 亥11 */
export type EarthlyBranchIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
/** 六十甲子索引 (0-59) */
export type SexagenaryIndex = number;
/** 五行: 木火土金水 */
export type Wuxing = '木' | '火' | '土' | '金' | '水';
/** 阴阳 */
export type YinYang = '阳' | '阴';
/** 十神 */
export type ShiShen = '比肩' | '劫财' | '食神' | '伤官' | '正财' | '偏财' | '正官' | '七杀' | '正印' | '偏印';
/** 单个天干 */
export interface HeavenlyStem {
    index: HeavenlyStemIndex;
    name: string;
    wuxing: Wuxing;
    yinYang: YinYang;
}
/** 单个地支 */
export interface EarthlyBranch {
    index: EarthlyBranchIndex;
    name: string;
    wuxing: Wuxing;
    yinYang: YinYang;
}
/** 藏干 */
export interface HiddenStem {
    stem: HeavenlyStemIndex;
    dominant: boolean;
}
/** 四柱中的一柱 */
export interface Pillar {
    stem: HeavenlyStem;
    branch: EarthlyBranch;
    stemIndex: HeavenlyStemIndex;
    branchIndex: EarthlyBranchIndex;
    sexagenaryIndex: SexagenaryIndex;
    hiddenStems: HeavenlyStemIndex[];
    nayin: string;
    shiShen: ShiShen;
}
/** 完整八字 (四柱) */
export interface BaZi {
    /** 年柱 */
    year: Pillar;
    /** 月柱 */
    month: Pillar;
    /** 日柱 */
    day: Pillar;
    /** 时柱 */
    hour: Pillar;
}
/** 出生信息 */
export interface BirthInfo {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    longitude: number;
    isDST: boolean;
    gender: '男' | '女';
    city?: string;
    /** 钟表时对应的标准子午线（°E），默认 120（北京时间）；海外出生请显式传入 */
    standardMeridian?: number;
}
/** 大运一柱 */
export interface DaYunPillar {
    pillar: Pillar;
    startAge: number;
    startYear: number;
    endYear: number;
    direction: '顺排' | '逆排';
}
/** 节气信息 */
export interface JieQi {
    name: string;
    index: number;
    isJie: boolean;
    longitude: number;
    date: Date;
}
/** 流年信息 */
export interface LiuNian {
    year: number;
    pillar: Pillar;
    /** 该流年各维度得分 0-100 */
    scores: {
        career: number;
        wealth: number;
        relationship: number;
        health: number;
        overall: number;
    };
}
/** 四柱干支之间的刑冲合害关系汇总 */
export interface ChartRelations {
    /** 天干相冲，如 '年-月 甲庚相冲' */
    stemClashes: string[];
    /** 天干相合，如 '年-月 甲己合土' */
    stemCombines: string[];
    /** 地支六冲，如 '年-月 子午冲' */
    branchClashes: string[];
    /** 地支六合，如 '年-月 子丑合' */
    branchCombinations: string[];
    /** 地支三刑，如 '年-月 无恩之刑' */
    branchPunishments: string[];
    /** 地支六害，如 '年-月 子未害' */
    branchHarms: string[];
}
/** 完整的命盘输出 */
export interface DestinyChart {
    bazi: BaZi;
    birthInfo: BirthInfo;
    dayun: DaYunPillar[];
    currentDayun: DaYunPillar | null;
    wuxingCount: Record<Wuxing, number>;
    dayMaster: HeavenlyStem;
    dayMasterWuxing: Wuxing;
    relations: ChartRelations;
}
//# sourceMappingURL=types.d.ts.map