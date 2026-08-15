// ============================================================
// AI Destiny OS — plain-text chart renderer for shunshi output.
// Real shunshi-bazi-core API: getBaziChart() → { 输入, 真太阳时?, 八字 }.
// ============================================================

import type { GetBaziChartOutput } from 'shunshi-bazi-core';

export function renderChartPlain(shunshi: GetBaziChartOutput): string {
  const bz = shunshi.八字;
  const lines: string[] = ['═══ 八字命盘 ═══'];
  lines.push(`四柱：${bz.四柱}`);
  lines.push(`日主：${bz.日主}${bz.五行分值.日主五行}`);
  lines.push('');

  const keys = ['年柱', '月柱', '日柱', '时柱'] as const;
  for (const k of keys) {
    const q = bz.柱位详细[k];
    lines.push(`${k}：${q.干支}（${q.天干}${q.地支}）`);
    lines.push(`  十神：${q.主星}`);
    lines.push(`  纳音：${q.纳音}`);
    lines.push(`  藏干：${q.藏干详情.map((h) => `${h.干}(${h.五行})`).join(' ')}`);
  }

  if (bz.大运.length > 0) {
    lines.push('');
    lines.push('═══ 大运 ═══');
    bz.大运.slice(0, 8).forEach((d) => {
      lines.push(`${d.起始年龄}岁 ${d.干支} (${d.起始年份}-${d.起始年份 + 9})`);
    });
  }

  return lines.join('\n');
}
