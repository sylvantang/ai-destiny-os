// ============================================================
// AI Destiny OS — Agent Layer: calculate_chart Tool
// ============================================================
import { buildDestinyContext } from '../context.js';
import { renderChart } from '../../visualization/chartRenderer.js';
export const calculateChartTool = {
    name: 'calculate_chart',
    description: '根据出生信息计算用户的八字命盘，返回四柱八字排盘、日主、五行统计。可重新计算指定出生时间的命盘。',
    parameters: {
        type: 'object',
        properties: {
            year: { type: 'number', description: '出生年份' },
            month: { type: 'number', description: '出生月份 (1-12)' },
            day: { type: 'number', description: '出生日 (1-31)' },
            hour: { type: 'number', description: '出生小时 (0-23)' },
            minute: { type: 'number', description: '出生分钟 (0-59)' },
            longitude: { type: 'number', description: '出生地经度，默认 116.4（北京）' },
            gender: { type: 'string', description: '性别', enum: ['男', '女'] },
        },
        required: ['year', 'month', 'day', 'hour'],
    },
    async execute(params, _context) {
        const birth = {
            year: params.year,
            month: params.month,
            day: params.day,
            hour: params.hour,
            minute: params.minute ?? 0,
            longitude: params.longitude ?? 116.4,
            isDST: false,
            gender: params.gender ?? '男',
        };
        const dc = buildDestinyContext(birth);
        const viz = renderChart(dc.chart);
        return {
            content: viz,
            data: {
                chart: dc.chart,
                strength: dc.ctx.strength,
                structure: dc.ctx.structure,
                yongShen: dc.ctx.yongShen,
            },
        };
    },
};
//# sourceMappingURL=calculateChart.js.map