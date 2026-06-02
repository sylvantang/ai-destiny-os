// ============================================================
// AI Destiny OS — Agent Layer: calculate_chart Tool
// ============================================================

import type { BirthInfo } from '../../core/astro/types.js';
import { buildDestinyContext } from '../context.js';
import { renderChart } from '../../visualization/chartRenderer.js';
import type { ToolDefinition, ToolContext, ToolResult } from './types.js';

export const calculateChartTool: ToolDefinition = {
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
  async execute(params: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
    const birth: BirthInfo = {
      year: params.year as number,
      month: params.month as number,
      day: params.day as number,
      hour: params.hour as number,
      minute: (params.minute as number) ?? 0,
      longitude: (params.longitude as number) ?? 116.4,
      isDST: false,
      gender: (params.gender as '男' | '女') ?? '男',
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
