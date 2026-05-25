// ============================================================
// AI Destiny OS — Astro Core: Type Definitions
// 100% deterministic layer. No AI involvement allowed.
// ============================================================

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
export type ShiShen =
  | '比肩' | '劫财'   // 同五行同阴阳/异阴阳
  | '食神' | '伤官'   // 我生同阴阳/异阴阳
  | '正财' | '偏财'   // 我克异阴阳/同阴阳
  | '正官' | '七杀'   // 克我异阴阳/同阴阳
  | '正印' | '偏印';  // 生我异阴阳/同阴阳

/** 单个天干 */
export interface HeavenlyStem {
  index: HeavenlyStemIndex;
  name: string;         // '甲','乙',...
  wuxing: Wuxing;
  yinYang: YinYang;
}

/** 单个地支 */
export interface EarthlyBranch {
  index: EarthlyBranchIndex;
  name: string;         // '子','丑',...
  wuxing: Wuxing;       // 本气五行
  yinYang: YinYang;
}

/** 藏干 */
export interface HiddenStem {
  stem: HeavenlyStemIndex;
  dominant: boolean;    // 是否本气
}

/** 四柱中的一柱 */
export interface Pillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  stemIndex: HeavenlyStemIndex;
  branchIndex: EarthlyBranchIndex;
  sexagenaryIndex: SexagenaryIndex;  // 60甲子序号
  hiddenStems: HeavenlyStemIndex[];  // 藏干
  nayin: string;                     // 纳音五行
  shiShen?: ShiShen;                 // 十神 (relative to day master, set by calcBaZi)
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
  month: number;        // 1-12
  day: number;
  hour: number;         // 0-23
  minute: number;       // 0-59
  longitude: number;    // 经度 (东经为正), e.g. 北京 116.4
  isDST: boolean;       // 是否夏令时
  gender: '男' | '女';
  city?: string;
}

/** 大运一柱 */
export interface DaYunPillar {
  pillar: Pillar;
  startAge: number;      // 起运年龄 (实岁)
  startYear: number;     // 起运年份
  endYear: number;       // 结束年份
  direction: '顺排' | '逆排';
}

/** 节气信息 */
export interface JieQi {
  name: string;           // '立春','雨水',...
  index: number;          // 0-23 (0=小寒)
  isJie: boolean;         // true=节(换月), false=气
  longitude: number;      // 太阳黄经度数
  date: Date;             // 精确时间
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

/** 完整的命盘输出 */
export interface DestinyChart {
  bazi: BaZi;
  birthInfo: BirthInfo;
  dayun: DaYunPillar[];
  currentDayun: DaYunPillar | null;
  wuxingCount: Record<Wuxing, number>;
  dayMaster: HeavenlyStem;   // 日主
  dayMasterWuxing: Wuxing;
}
