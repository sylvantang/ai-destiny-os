// ============================================================
// Bazi MCP — tool definitions.
// 完全走本仓库自有 deterministic 引擎 core/astro（寿星 VSOP87 节气，
// 真太阳时校正、老黄历），不依赖任何第三方排盘库。
// inputSchema 为纯 JSON Schema（MCP 客户端要求）；zod 仅做运行时校验。
// ============================================================

import { z } from 'zod';
import {
  calcBaZi,
  generateChart,
  calcDaYun,
  getSolarHours,
  equationOfTime,
  getHuangli,
  SEXAGENARY_NAMES,
  ALL_STEMS,
} from '../../../core/astro/index.js';

// ---- zod schemas（运行时校验用） ----

const BirthSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59).default(0),
  gender: z.enum(['male', 'female']),
  longitude: z.number().optional(),
  isDST: z.boolean().default(false),
  standardMeridian: z.number().optional(),
});

const DayunSchema = BirthSchema.extend({
  limit: z.number().int().min(1).max(12).default(8),
});

const HuangliSchema = z.object({
  year: z.number().int().min(1900).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
});

// ---- 序列化辅助 ----

interface BirthLike {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: 'male' | 'female';
  longitude?: number;
  isDST: boolean;
  standardMeridian?: number;
}

function toBirthInfo(b: BirthLike) {
  return {
    year: b.year,
    month: b.month,
    day: b.day,
    hour: b.hour,
    minute: b.minute,
    longitude: b.longitude ?? 116.4,
    isDST: b.isDST,
    gender: b.gender === 'male' ? '男' : '女' as const,
    standardMeridian: b.standardMeridian,
  };
}

function pillarJson(p: { stem: { index: number; name: string; wuxing: string; yinYang: string }; branch: { index: number; name: string; wuxing: string }; sexagenaryIndex: number; hiddenStems: number[]; nayin: string; shiShen: string }) {
  return {
    ganzhi: SEXAGENARY_NAMES[p.sexagenaryIndex],
    stem: { name: p.stem.name, wuxing: p.stem.wuxing, yinYang: p.stem.yinYang },
    branch: { name: p.branch.name, wuxing: p.branch.wuxing },
    shiShen: p.shiShen,
    nayin: p.nayin,
    hiddenStems: p.hiddenStems.map((h) => ALL_STEMS[h]!.name),
  };
}

// ---- tools ----

export const tools = [
  {
    name: 'get_bazi_chart',
    description: '计算完整八字命盘：四柱、十神、藏干、纳音、五行统计、刑冲合害、大运（自有 core/astro 引擎，寿星 VSOP87 节气 + 真太阳时）',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', minimum: 1900, maximum: 2100 },
        month: { type: 'number', minimum: 1, maximum: 12 },
        day: { type: 'number', minimum: 1, maximum: 31 },
        hour: { type: 'number', minimum: 0, maximum: 23 },
        minute: { type: 'number', minimum: 0, maximum: 59, default: 0 },
        gender: { type: 'string', enum: ['male', 'female'] },
        longitude: { type: 'number', description: '出生地经度（东经为正），默认 116.4' },
        isDST: { type: 'boolean', default: false, description: '钟表时是否含夏令时（中国 1986-1991）' },
        standardMeridian: { type: 'number', description: '钟表时标准子午线，默认 120（北京时间）' },
      },
      required: ['year', 'month', 'day', 'hour', 'gender'],
    },
    handler: async (rawArgs: unknown) => {
      const args = BirthSchema.parse(rawArgs);
      const birth = toBirthInfo(args);
      const chart = generateChart(birth);
      const bazi = chart.bazi;

      const epoch = Date.UTC(args.year, args.month - 1, args.day, args.hour, args.minute) - 8 * 3600 * 1000;
      const instant = new Date(epoch);
      const solarHours = getSolarHours(instant, args.longitude ?? 116.4, args.isDST, args.standardMeridian ?? 120);
      const eotMinutes = equationOfTime(instant);

      const result = {
        engine: 'ai-destiny-os core/astro (ShouXing VSOP87)',
        bazi: {
          year: pillarJson(bazi.year),
          month: pillarJson(bazi.month),
          day: pillarJson(bazi.day),
          hour: pillarJson(bazi.hour),
        },
        dayMaster: { name: chart.dayMaster.name, wuxing: chart.dayMasterWuxing },
        wuxingCount: chart.wuxingCount,
        relations: chart.relations,
        trueSolarTime: {
          solarHours: Math.round(solarHours * 100) / 100,
          equationOfTimeMinutes: Math.round(eotMinutes * 100) / 100,
          longitudeOffsetMinutes: ((args.longitude ?? 116.4) - (args.standardMeridian ?? 120)) * 4,
        },
        dayun: chart.dayun.slice(0, 8).map((d) => ({
          ganzhi: SEXAGENARY_NAMES[d.pillar.sexagenaryIndex],
          startAge: d.startAge,
          startYear: d.startYear,
          endYear: d.endYear,
          direction: d.direction,
          shiShen: d.pillar.shiShen,
          nayin: d.pillar.nayin,
        })),
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  },
  {
    name: 'get_dayun_timeline',
    description: '返回大运时间线：起运年龄、每步大运干支、起止年份与十神（自有 core/astro 引擎）',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', minimum: 1900, maximum: 2100 },
        month: { type: 'number', minimum: 1, maximum: 12 },
        day: { type: 'number', minimum: 1, maximum: 31 },
        hour: { type: 'number', minimum: 0, maximum: 23 },
        minute: { type: 'number', minimum: 0, maximum: 59, default: 0 },
        gender: { type: 'string', enum: ['male', 'female'] },
        longitude: { type: 'number' },
        isDST: { type: 'boolean', default: false },
        standardMeridian: { type: 'number' },
        limit: { type: 'number', minimum: 1, maximum: 12, default: 8 },
      },
      required: ['year', 'month', 'day', 'hour', 'gender'],
    },
    handler: async (rawArgs: unknown) => {
      const args = DayunSchema.parse(rawArgs);
      const birth = toBirthInfo(args);
      const bazi = calcBaZi(birth);
      const dayun = calcDaYun(birth, bazi.month, bazi.year.stemIndex, bazi.day.stemIndex);

      const timeline = dayun.slice(0, args.limit).map((d, i) => ({
        index: i + 1,
        ganzhi: SEXAGENARY_NAMES[d.pillar.sexagenaryIndex],
        stem: d.pillar.stem.name,
        branch: d.pillar.branch.name,
        shiShen: d.pillar.shiShen,
        nayin: d.pillar.nayin,
        startAge: d.startAge,
        startYear: d.startYear,
        endYear: d.endYear,
        direction: d.direction,
      }));

      const result = { engine: 'ai-destiny-os core/astro', direction: dayun[0]?.direction ?? '顺排', timeline };
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  },
  {
    name: 'get_relations',
    description: '返回四柱干支之间的刑冲合害关系汇总（六冲/六合/三刑/六害/天干冲合，标注柱位）',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', minimum: 1900, maximum: 2100 },
        month: { type: 'number', minimum: 1, maximum: 12 },
        day: { type: 'number', minimum: 1, maximum: 31 },
        hour: { type: 'number', minimum: 0, maximum: 23 },
        minute: { type: 'number', minimum: 0, maximum: 59, default: 0 },
        gender: { type: 'string', enum: ['male', 'female'] },
        longitude: { type: 'number' },
        isDST: { type: 'boolean', default: false },
        standardMeridian: { type: 'number' },
      },
      required: ['year', 'month', 'day', 'hour', 'gender'],
    },
    handler: async (rawArgs: unknown) => {
      const args = BirthSchema.parse(rawArgs);
      const birth = toBirthInfo(args);
      const chart = generateChart(birth);
      const result = {
        engine: 'ai-destiny-os core/astro',
        pillars: {
          year: SEXAGENARY_NAMES[chart.bazi.year.sexagenaryIndex],
          month: SEXAGENARY_NAMES[chart.bazi.month.sexagenaryIndex],
          day: SEXAGENARY_NAMES[chart.bazi.day.sexagenaryIndex],
          hour: SEXAGENARY_NAMES[chart.bazi.hour.sexagenaryIndex],
        },
        relations: chart.relations,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  },
  {
    name: 'get_huangli',
    description: '查询黄历：干支/生肖/星座/节气、建除十二神与黄黑道、宜忌、彭祖百忌、神煞、胎神、吉神方位、十二时辰宜忌（自有 core/astro 引擎）',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', minimum: 1900, maximum: 2100 },
        month: { type: 'number', minimum: 1, maximum: 12 },
        day: { type: 'number', minimum: 1, maximum: 31 },
      },
    },
    handler: async (rawArgs: unknown) => {
      const args = HuangliSchema.parse(rawArgs);
      const today = new Date();
      const huangli = getHuangli(
        args.year ?? today.getFullYear(),
        args.month ?? today.getMonth() + 1,
        args.day ?? today.getDate(),
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(huangli, null, 2) }],
        structuredContent: huangli,
      };
    },
  },
];
