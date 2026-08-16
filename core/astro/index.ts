// ============================================================
// AI Destiny OS — Astro Core: Public API
// ============================================================

// Types
export type {
  HeavenlyStemIndex,
  EarthlyBranchIndex,
  SexagenaryIndex,
  Wuxing,
  YinYang,
  ShiShen,
  HeavenlyStem,
  EarthlyBranch,
  HiddenStem,
  Pillar,
  BaZi,
  BirthInfo,
  DaYunPillar,
  JieQi,
  LiuNian,
  DestinyChart,
  ChartRelations,
} from './types.js';

// Constants
export {
  getStem,
  getBranch,
  getHiddenStems,
  getNayin,
  getShiShen,
  getMonthStemStart,
  getHourStemStart,
  sexagenaryIndex,
  stemFromSexagenary,
  branchFromSexagenary,
  ALL_STEMS,
  ALL_BRANCHES,
  SEXAGENARY_NAMES,
  HIDDEN_STEMS,
  JIEQI_NAMES,
  JIEQI_LONGITUDE,
} from './constants.js';

// Solar time
export {
  equationOfTime,
  toTrueSolarTime,
  getHourBranch,
  getSolarHours,
} from './solarTime.js';

// JieQi
export {
  toJulianDate,
  fromJulianDate,
  sunLongitude,
  sunPosition,
  equationOfTimeMinutes,
  getJieQi,
  getJieQiByName,
  getMonthBranchByDate,
} from './jieqi.js';
export type { SunPosition } from './jieqi.js';

// BaZi
export {
  calcBaZi,
  generateChart,
  formatBaZi,
} from './bazi.js';

// DaYun
export {
  calcDaYun,
  getCurrentDayun,
} from './dayun.js';

// LiuNian
export {
  calcLiuNian,
  calcLiuYue,
  calcLiuRi,
} from './liunian.js';

// Earthly Branch Relations
export {
  isClash,
  getClashPair,
  CLASH_PAIRS,
  isCombination,
  getCombinationPartner,
  COMBINATION_WUXING,
  getPunishment,
  isSelfPunishment,
  isHarm,
  getHarm,
  THREE_HARMONY_SETS,
  getHalfHarmony,
  THREE_MEETING_SETS,
  isStemClash,
  getStemClashName,
  isStemCombine,
} from './earthlyBranchRelations.js';
export type { PunishmentType } from './earthlyBranchRelations.js';
