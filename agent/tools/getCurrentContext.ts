// ============================================================
// AI Destiny OS — Agent Layer: get_current_context Tool
// ============================================================

import type { ToolDefinition, ToolContext, ToolResult } from './types.js';

export const getCurrentContextTool: ToolDefinition = {
  name: 'get_current_context',
  description: '获取当前用户的完整命理分析上下文，包括日主、旺衰、格局、用神、运势等所有已计算的分析结果。',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  async execute(_params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const { ctx } = context;
    const s = ctx.strength;
    const st = ctx.structure;
    const ys = ctx.yongShen;
    const f = ctx.fortune;

    const summary = [
      `当前命理分析上下文`,
      ``,
      `【日主】${s.dayMaster.stem}${s.dayMaster.wuxing}（${s.dayMaster.yinYang}性）`,
      `【旺衰】${s.level}（${s.strengthScore}分）— ${s.levelLabel}`,
      `【格局】${st.primaryPattern}${st.subPattern ? '（兼' + st.subPattern + '）' : ''}，${st.isFavorable ? '得用' : '需调整'}`,
      `【用神】${ys.yongShen.wuxing}（${ys.yongShen.shiShen}）— ${ys.yongShen.reason}`,
      `【喜神】${ys.xiShen.map(x => x.wuxing).join('、')}`,
      `【忌神】${ys.jiShen.map(j => j.wuxing).join('、')}`,
      ys.climateYongShen ? `【调候用神】${ys.climateYongShen.wuxing} — ${ys.climateYongShen.reason}` : '',
      `【运势】${f.overall.score}分 — ${f.overall.level}期`,
      `【最佳领域】${f.overall.bestDimension}（${getDimensionScore(f.overall.dimensions, f.overall.bestDimension)}分）`,
      `【关注风险】${f.overall.riskDimension}（${getDimensionScore(f.overall.dimensions, f.overall.riskDimension)}分）`,
      f.keyYears.best ? `【最佳年份】${f.keyYears.best.year}年` : '',
      f.keyYears.worst ? `【需注意】${f.keyYears.worst.year}年` : '',
      `【十神主题】${ctx.relations.dominantTheme}`,
    ].filter(Boolean).join('\n');

    return {
      content: summary,
      data: {
        strength: s,
        structure: st,
        yongShen: ys,
        fortune: { overall: f.overall, keyYears: f.keyYears },
        relations: { dominantTheme: ctx.relations.dominantTheme, summary: ctx.relations.summary },
      },
    };
  },
};

function getDimensionScore(dims: { career: number; wealth: number; relationship: number; health: number }, key: string): number {
  const map: Record<string, number> = { '事业': dims.career, '财富': dims.wealth, '感情': dims.relationship, '健康': dims.health };
  return map[key] ?? 0;
}
