// ============================================================
// Bazi MCP — tool definitions (shunshi-bazi-core real API).
// getBaziChart: {year,month,day,hour,minute?,gender:0|1,...} → Chinese-keyed output.
// getHuangli: {year,month,day} → Chinese-keyed almanac.
// inputSchema is a plain JSON Schema (MCP client requirement);
// zod schemas are used inside handlers for runtime validation.
// ============================================================
import { z } from 'zod';
import { getBaziChart, getHuangli } from 'shunshi-bazi-core';
const BaziChartSchema = z.object({
    year: z.number().int().min(1900).max(2100),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59).default(0),
    gender: z.enum(['male', 'female']),
    longitude: z.number().optional(),
    latitude: z.number().optional(),
    city: z.string().optional(),
    useTrueSolarTime: z.boolean().default(true),
    sect: z.union([z.literal(1), z.literal(2)]).default(1),
});
const HuangliSchema = z.object({
    year: z.number().int().min(1900).max(2100).optional(),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
});
export const tools = [
    {
        name: 'get_bazi_chart',
        description: '计算八字命盘：四柱、十神、神煞、大运、五行强弱、格局、用神（shunshi 引擎，含真太阳时校正）',
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
                latitude: { type: 'number' },
                city: { type: 'string' },
                useTrueSolarTime: { type: 'boolean', default: true },
                sect: { type: 'number', enum: [1, 2], default: 1 },
            },
            required: ['year', 'month', 'day', 'hour', 'gender'],
        },
        handler: async (rawArgs) => {
            const args = BaziChartSchema.parse(rawArgs);
            const result = getBaziChart({
                year: args.year,
                month: args.month,
                day: args.day,
                hour: args.hour,
                minute: args.minute,
                gender: args.gender === 'male' ? 1 : 0,
                longitude: args.longitude,
                latitude: args.latitude,
                city: args.city,
                useTrueSolarTime: args.useTrueSolarTime,
                sect: args.sect,
            });
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                structuredContent: result,
            };
        },
    },
    {
        name: 'get_huangli',
        description: '查询黄历：宜/忌、彭祖百忌、节气、神煞(吉/凶)、胎神、吉神方位、十二时辰宜忌',
        inputSchema: {
            type: 'object',
            properties: {
                year: { type: 'number', minimum: 1900, maximum: 2100 },
                month: { type: 'number', minimum: 1, maximum: 12 },
                day: { type: 'number', minimum: 1, maximum: 31 },
            },
        },
        handler: async (rawArgs) => {
            const args = HuangliSchema.parse(rawArgs);
            const today = new Date();
            const huangli = getHuangli({
                year: args.year ?? today.getFullYear(),
                month: args.month ?? today.getMonth() + 1,
                day: args.day ?? today.getDate(),
            });
            return {
                content: [{ type: 'text', text: JSON.stringify(huangli, null, 2) }],
                structuredContent: huangli,
            };
        },
    },
];
