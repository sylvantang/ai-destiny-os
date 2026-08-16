// ============================================================
// AI Destiny OS — Astro Core: HuangLi (老黄历 / Almanac)
// 完全基于自有引擎：干支/节气复用 calcBaZi + getJieQi，
// 建除十二神、宜忌、彭祖百忌、神煞、吉神方位、胎神、
// 十二时辰宜忌均为通行万年历标准表（纯查表，确定性）。
//
// v1 limitations（依赖农历/更多历法的字段暂置空，接口保留）:
//   农历、月相、九星、六曜、二十八宿、节令（三伏/数九/梅雨/物候）。
// 黄黑道遵循通行歌诀「建满平收黑，除危定执黄，成开皆可用，闭破不相当」；
// 值神名按此歌诀与黄/黑道一致分配（shunshi 内部值神对照非公开公式，不追平）。
// ============================================================

import type { BirthInfo, EarthlyBranchIndex } from './types.js';
import { calcBaZi } from './bazi.js';
import { getJieQi } from './jieqi.js';
import {
  getHourStemStart,
  sexagenaryIndex,
  SEXAGENARY_NAMES,
  ALL_BRANCHES,
} from './constants.js';
import {
  isClash, isCombination, getPunishment, isHarm,
} from './earthlyBranchRelations.js';

// ---- 基础表 ----

const SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

const BRANCH_DIRECTION: Record<number, string> = {
  0: '正北', 1: '东北', 2: '东北', 3: '正东', 4: '东南', 5: '东南',
  6: '正南', 7: '西南', 8: '西南', 9: '正西', 10: '西北', 11: '西北',
};

/** 建除十二神（正月建寅）：value = (日支 − 月支) mod 12 */
const JIANCHU = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];

/** 黄道/黑道：通行歌诀「建满平收黑，除危定执黄，成开皆可用，闭破不相当」 */
const YELLOW_VALUES = new Set([1, 4, 5, 7, 8, 10]);

/** 值神（与黄黑道一致的通行分配） */
const ZHISHEN_BY_VALUE = [
  '天刑', '青龙', '朱雀', '白虎', '金匮', '天德',
  '天牢', '明堂', '玉堂', '玄武', '司命', '勾陈',
];

/** 各建除值宜忌（常用通书表） */
const YIJI_BY_VALUE: Record<number, { yi: string[]; ji: string[] }> = {
  0: { yi: ['出行', '赴任', '会友', '上书', '见贵', '开市'], ji: ['动土', '开仓', '安葬', '破土'] },
  1: { yi: ['扫舍', '沐浴', '祭祀', '祈福', '出行', '修造'], ji: ['求医疗病', '安葬'] },
  2: { yi: ['祭祀', '祈福', '会友', '进人口', '开市'], ji: ['动土', '修造', '安床', '栽种'] },
  3: { yi: ['修饰垣墙', '平治道涂', '祭祀', '开市'], ji: ['安葬', '开渠', '动土'] },
  4: { yi: ['祭祀', '祈福', '订婚', '结婚', '会友', '安床'], ji: ['出行', '搬家', '动土'] },
  5: { yi: ['订婚', '结婚', '捕捉', '立约', '祭祀'], ji: ['开市', '交易', '安葬'] },
  6: { yi: ['破屋', '坏垣', '求医疗病', '扫舍'], ji: ['开市', '嫁娶', '动土', '出行', '立约'] },
  7: { yi: ['祭祀', '祈福', '安床', '订婚', '结婚', '出行'], ji: ['动土', '安葬', '开渠', '栽种'] },
  8: { yi: ['入学', '开市', '交易', '立约', '结婚', '搬家'], ji: ['词讼', '动土', '安葬'] },
  9: { yi: ['祭祀', '纳财', '捕捉', '入学'], ji: ['出行', '结婚', '安葬', '动土'] },
  10: { yi: ['开市', '交易', '出行', '上任', '入学', '结婚'], ji: ['安葬', '破土'] },
  11: { yi: ['祭祀', '祈福', '安床', '修造'], ji: ['开市', '出行', '上任', '嫁娶', '动土'] },
};

/** 彭祖百忌（天干十条 / 地支十二条） */
const PENGZU_STEM = [
  '甲不开仓财物耗散', '乙不栽植千株不长', '丙不修灶必见灾殃', '丁不剃头头必生疮', '戊不受田田主不祥',
  '己不破券二比并亡', '庚不经络织机虚张', '辛不合酱主人不尝', '壬不泱水更难提防', '癸不词讼理弱敌强',
];
const PENGZU_BRANCH = [
  '子不问卜自惹祸殃', '丑不冠带主不还乡', '寅不祭祀神鬼不尝', '卯不穿井水泉不香', '辰不哭泣必主重丧',
  '巳不远行财物伏藏', '午不苫盖屋主更张', '未不服药毒气入肠', '申不安床鬼祟入房', '酉不会客醉坐颠狂',
  '戌不吃犬作怪上床', '亥不嫁娶不利新郎',
];

/** 天德（按月支：坤=申 乾=亥 巽=巳 艮=寅，值可为天干或地支） */
const TIANDE: Record<number, string> = {
  2: '丁', 3: '申', 4: '壬', 5: '辛', 6: '亥', 7: '甲',
  8: '癸', 9: '寅', 10: '丙', 11: '乙', 0: '巳', 1: '庚',
};

/** 月德（按月支三合：日干匹配） */
const YUEDE: Record<number, string> = {
  2: '丙', 6: '丙', 10: '丙', 11: '甲', 3: '甲', 7: '甲',
  8: '壬', 0: '壬', 4: '壬', 5: '庚', 9: '庚', 1: '庚',
};

/** 天恩日（固定十五日） */
const TIANEN = new Set([
  '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己卯', '庚辰', '辛巳', '壬午', '癸未',
  '己酉', '庚戌', '辛亥', '壬子', '癸丑',
]);

/** 母仓（按四时月令：日支匹配） */
const MUCANG: Record<string, number[]> = {
  寅: [11, 0], 卯: [11, 0], 辰: [11, 0],   // 春：亥子
  巳: [2, 3], 午: [2, 3], 未: [2, 3],      // 夏：寅卯
  申: [4, 10, 1, 7], 酉: [4, 10, 1, 7], 戌: [4, 10, 1, 7], // 秋：辰戌丑未
  亥: [8, 9], 子: [8, 9], 丑: [8, 9],      // 冬：申酉
};

/** 三合局（月支所在局） */
const SANHE: Record<number, number[]> = {
  2: [2, 6, 10], 6: [2, 6, 10], 10: [2, 6, 10],   // 寅午戌
  11: [11, 3, 7], 3: [11, 3, 7], 7: [11, 3, 7],   // 亥卯未
  8: [8, 0, 4], 0: [8, 0, 4], 4: [8, 0, 4],       // 申子辰
  5: [5, 9, 1], 9: [5, 9, 1], 1: [5, 9, 1],       // 巳酉丑
};

/** 驿马（按年支三合） */
const YIMA: Record<number, number> = {
  2: 8, 6: 8, 10: 8,   // 寅午戌 → 申
  11: 5, 3: 5, 7: 5,    // 亥卯未 → 巳
  8: 2, 0: 2, 4: 2,     // 申子辰 → 寅
  5: 11, 9: 11, 1: 11,  // 巳酉丑 → 亥
};

/** 天赦日（按四时：日柱匹配） */
const TIANSHU: Record<string, string> = {
  寅: '戊寅', 卯: '戊寅', 辰: '戊寅',
  巳: '甲午', 午: '甲午', 未: '甲午',
  申: '戊申', 酉: '戊申', 戌: '戊申',
  亥: '甲子', 子: '甲子', 丑: '甲子',
};

/** 四击（按四时：日支匹配） */
const SIJI: Record<string, number> = {
  寅: 10, 卯: 10, 辰: 10,   // 春戌
  巳: 1, 午: 1, 未: 1,      // 夏丑
  申: 4, 酉: 4, 戌: 4,      // 秋辰
  亥: 7, 子: 7, 丑: 7,      // 冬未
};

/** 喜神方位（按日干） */
const XISHEN: Record<string, string> = {
  甲: '东北', 己: '东北', 乙: '西北', 庚: '西北', 丙: '西南', 辛: '西南',
  丁: '正南', 壬: '正南', 戊: '东南', 癸: '东南',
};

/** 财神方位（按日干） */
const CAISHEN: Record<string, string> = {
  甲: '东北', 乙: '东北', 丙: '西南', 丁: '西南', 戊: '正北',
  己: '正北', 庚: '正东', 辛: '正东', 壬: '正南', 癸: '正南',
};

/** 天乙贵人（按日干：[阳贵支, 阴贵支]） */
const TIANYI: Record<string, [number, number]> = {
  甲: [1, 7], 戊: [1, 7], 庚: [1, 7],   // 丑未
  乙: [0, 8], 己: [0, 8],               // 子申
  丙: [11, 9], 丁: [11, 9],             // 亥酉
  壬: [3, 5], 癸: [3, 5],               // 卯巳
  辛: [6, 2],                           // 午寅
};

/** 胎神：日干定占处 / 日支定方位 */
const TAISHEN_STEM: Record<string, string> = {
  甲: '门', 己: '门', 乙: '碓磨', 庚: '碓磨', 丙: '厨灶', 辛: '厨灶',
  丁: '仓库', 壬: '仓库', 戊: '房床', 癸: '房床',
};
const TAISHEN_BRANCH: Record<number, string> = {
  0: '碓', 6: '碓', 1: '厕', 7: '厕', 2: '炉', 8: '炉',
  3: '大门', 9: '大门', 4: '鸡栖', 10: '鸡栖', 5: '床', 11: '床',
};

/** 星座（按公历月日） */
const XINGZUO: [number, number, string][] = [
  [1, 20, '水瓶座'], [2, 19, '双鱼座'], [3, 21, '白羊座'], [4, 20, '金牛座'],
  [5, 21, '双子座'], [6, 22, '巨蟹座'], [7, 23, '狮子座'], [8, 23, '处女座'],
  [9, 23, '天秤座'], [10, 24, '天蝎座'], [11, 23, '射手座'], [12, 22, '摩羯座'],
];

/** 公历固定节日 */
const FESTIVALS: Record<string, string> = {
  '1-1': '元旦', '2-14': '情人节', '3-8': '妇女节', '3-12': '植树节',
  '5-1': '劳动节', '5-4': '青年节', '6-1': '儿童节', '7-1': '建党节',
  '8-1': '建军节', '9-10': '教师节', '10-1': '国庆节', '12-24': '平安夜', '12-25': '圣诞节',
};

const SHICHEN_NAMES = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

// ---- 输出类型（与 MCP 既有接口字段名保持一致） ----

export interface HuangliResult {
  公历: string;
  星期: string;
  农历: string | null;
  生肖: string;
  干支: { 年: string; 月: string; 日: string };
  节气: string | null;
  星座: string;
  宜: string[];
  忌: string[];
  彭祖百忌: string[];
  十二神: { 建除: string; 黄黑道: string };
  二十八宿: string | null;
  九星: string | null;
  六曜: string | null;
  神煞: { 吉神: string[]; 凶煞: string[] };
  胎神: string;
  月相: string | null;
  吉神方位: { 喜神: string; 财神: string; 福神: string | null; 阳贵: string; 阴贵: string; 太岁: string };
  节令: { 三伏: string | null; 数九: string | null; 梅雨: string | null; 物候: string | null };
  节日: string[];
  时辰宜忌: { 时辰: string; 干支: string; 宜: string[]; 忌: string[] }[];
  /** v1 局限说明 */
  limitations: string[];
}

// ---- 主 API ----

/**
 * 计算某公历日期（UTC+8）的老黄历。
 */
export function getHuangli(year: number, month: number, day: number): HuangliResult {
  const birth: BirthInfo = {
    year, month, day,
    hour: 12, minute: 0,
    longitude: 116.4, isDST: false, gender: '男',
  };
  const bazi = calcBaZi(birth);

  const yearGz = SEXAGENARY_NAMES[bazi.year.sexagenaryIndex]!;
  const monthGz = SEXAGENARY_NAMES[bazi.month.sexagenaryIndex]!;
  const dayGz = SEXAGENARY_NAMES[bazi.day.sexagenaryIndex]!;
  const yearBranch = bazi.year.branchIndex;
  const monthBranch = bazi.month.branchIndex;
  const dayBranch = bazi.day.branchIndex;
  const dayStemIdx = bazi.day.stemIndex;
  const dayStemName = bazi.day.stem.name;

  // 星期
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  // 生肖
  const shengxiao = SHENGXIAO[yearBranch]!;

  // 星座（按公历月日边界：取最后一个「月 < 当前月 或 同月且日 >= 边界」的星座）
  let xingzuo = '摩羯座';
  for (const [m, d, name] of XINGZUO) {
    if (m < month || (m === month && d <= day)) xingzuo = name;
  }

  // 节气（当日交节才标出）
  let jieqiName: string | null = null;
  for (const jq of getJieQi(year)) {
    const t = new Date(jq.date.getTime() + 8 * 3600 * 1000);
    if (t.getUTCFullYear() === year && t.getUTCMonth() + 1 === month && t.getUTCDate() === day) {
      jieqiName = jq.name;
      break;
    }
  }

  // 建除 + 黄黑道
  const jianchuValue = (((dayBranch - monthBranch) % 12) + 12) % 12;
  const jianchu = JIANCHU[jianchuValue]!;
  const isYellow = YELLOW_VALUES.has(jianchuValue);
  const zhishen = ZHISHEN_BY_VALUE[jianchuValue]!;

  // 宜忌
  const yi = YIJI_BY_VALUE[jianchuValue]?.yi ?? [];
  const ji = YIJI_BY_VALUE[jianchuValue]?.ji ?? [];

  // 彭祖百忌
  const pengzu = [PENGZU_STEM[dayStemIdx]!, PENGZU_BRANCH[dayBranch]!];

  // 神煞
  const jiShen: string[] = [];
  const xiongSha: string[] = [];

  if (TIANDE[monthBranch] === dayStemName) jiShen.push('天德');
  if (YUEDE[monthBranch] === dayStemName) jiShen.push('月德');
  if (TIANEN.has(dayGz)) jiShen.push('天恩');
  if (TIANSHU[ALL_BRANCHES[monthBranch]!.name] === dayGz) jiShen.push('天赦');
  if (MUCANG[ALL_BRANCHES[monthBranch]!.name]?.includes(dayBranch)) jiShen.push('母仓');
  if (SANHE[monthBranch]?.includes(dayBranch) && dayBranch !== monthBranch) jiShen.push('三合');
  if (isCombination(dayBranch, monthBranch)) jiShen.push('六合');
  if (YIMA[yearBranch] === dayBranch) jiShen.push('驿马');
  if (isYellow) jiShen.push(zhishen); // 黄道值神入吉神

  if (dayBranch === (monthBranch + 6) % 12) xiongSha.push('月破');
  if (dayBranch === (yearBranch + 6) % 12) xiongSha.push('大耗');
  const sijiTarget = SIJI[ALL_BRANCHES[monthBranch]!.name];
  if (sijiTarget !== undefined && dayBranch === sijiTarget) xiongSha.push('四击');
  if (dayBranch === 5 || dayBranch === 11) xiongSha.push('重日');
  if (!isYellow) xiongSha.push(zhishen); // 黑道值神入凶煞

  // 胎神
  const taishen = `占${TAISHEN_STEM[dayStemName] ?? ''}${TAISHEN_BRANCH[dayBranch] ?? ''}（${BRANCH_DIRECTION[dayBranch] ?? ''}）`;

  // 吉神方位
  const xishen = XISHEN[dayStemName] ?? '';
  const caishen = CAISHEN[dayStemName] ?? '';
  const guiren = TIANYI[dayStemName] ?? [1, 7];
  // 阳贵/阴贵按最通行约定：歌诀前支为阳贵、后支为阴贵
  const yanggui = BRANCH_DIRECTION[guiren[0]] ?? '';
  const yingui = BRANCH_DIRECTION[guiren[1]] ?? '';
  const taisui = BRANCH_DIRECTION[yearBranch] ?? '';

  // 节日
  const festivals = FESTIVALS[`${month}-${day}`] ? [FESTIVALS[`${month}-${day}`]!] : [];

  // 十二时辰宜忌
  const hourStemStart = getHourStemStart(dayStemIdx);
  const shichen: HuangliResult['时辰宜忌'] = [];
  for (let h = 0; h < 12; h++) {
    const hIdx = h as EarthlyBranchIndex;
    const stem = (hourStemStart + h) % 10;
    const gz = SEXAGENARY_NAMES[sexagenaryIndex(stem, h)]!;
    let yiList: string[] = [];
    let jiList: string[] = [];
    if (isCombination(dayBranch, hIdx)) {
      yiList = ['会友', '求财', '出行'];
    } else if (isClash(dayBranch, hIdx)) {
      jiList = ['出行', '嫁娶', '动土'];
    } else if (getPunishment(dayBranch, hIdx) || isHarm(dayBranch, hIdx)) {
      jiList = ['安床', '安葬'];
    } else {
      yiList = ['祭祀', '祈福'];
    }
    shichen.push({ 时辰: SHICHEN_NAMES[h]!, 干支: gz, 宜: yiList, 忌: jiList });
  }

  return {
    公历: `${year}年${month}月${day}日`,
    星期: `星期${WEEKDAYS[weekday]}`,
    农历: null,
    生肖: shengxiao,
    干支: { 年: yearGz, 月: monthGz, 日: dayGz },
    节气: jieqiName,
    星座: xingzuo,
    宜: yi,
    忌: ji,
    彭祖百忌: pengzu,
    十二神: { 建除: jianchu, 黄黑道: isYellow ? '黄道' : '黑道' },
    二十八宿: null,
    九星: null,
    六曜: null,
    神煞: { 吉神: [...new Set(jiShen)], 凶煞: [...new Set(xiongSha)] },
    胎神: taishen,
    月相: null,
    吉神方位: { 喜神: xishen, 财神: caishen, 福神: null, 阳贵: yanggui, 阴贵: yingui, 太岁: taisui },
    节令: { 三伏: null, 数九: null, 梅雨: null, 物候: null },
    节日: festivals,
    时辰宜忌: shichen,
    limitations: [
      '农历/月相/九星/六曜/二十八宿/节令依赖农历历法，自有 core 尚无农历引擎，v1 置空',
      '交节当日（如立春、小暑当天）月建按日首时刻计算；个别历书按交节后整日算新月建',
      '黄黑道与值神遵循通行歌诀（建满平收黑、除危定执黄），与个别万年历的内部值神表可能不同',
      '吉神方位采用标准八方位名（正北/东北/正东/东南/正南/西南/正西/西北）；太岁方位按年支',
      '阳贵/阴贵按通行约定（歌诀前支为阳贵、后支为阴贵），个别历书按昼夜贵另行区分',
      '胎神方位按日支本气方位标注，个别历书用其他排布',
      '宜忌/神煞为通行通书标准表，不同流派历书或有出入',
    ],
  };
}
