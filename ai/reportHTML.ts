// ============================================================
// AI Destiny OS — Report HTML Builder
// Extracted from server.ts: builds standalone HTML analysis report.
// ============================================================

import { ALL_STEMS, SEXAGENARY_NAMES } from '../core/astro/constants.js';
import type { DestinyAgent } from '../agent/agentEngine.js';

export const WX_COLOR_HEX: Record<string, string> = { '木': '#4a9', '火': '#e55', '土': '#c93', '金': '#bbb', '水': '#48b' };

export function buildReportHTML(agent: DestinyAgent, _analysis?: Record<string, unknown>): string {
  const c = agent.state.chart;
  const bz = c.bazi;
  const pillars = [bz.year, bz.month, bz.day, bz.hour];
  const labels = ['年柱', '月柱', '日柱', '时柱'];
  const birth = agent.state.birth;

  const pillarRows = pillars.map((p, i) => `
    <tr>
      <td>${labels[i]}</td>
      <td>${SEXAGENARY_NAMES[p.sexagenaryIndex]}</td>
      <td style="color:${WX_COLOR_HEX[p.stem.wuxing]}">${p.stem.name}</td>
      <td style="color:${WX_COLOR_HEX[p.branch.wuxing]}">${p.branch.name}</td>
      <td>${p.hiddenStems.map(idx => `<span style="color:${WX_COLOR_HEX[ALL_STEMS[idx]!.wuxing]}">${ALL_STEMS[idx]!.name}</span>`).join('')}</td>
      <td>${p.nayin}</td>
      <td>${p.shiShen ?? '—'}</td>
    </tr>`).join('');

  const wuxingBars = Object.entries(c.wuxingCount)
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([wx, n]) => `<span style="color:${WX_COLOR_HEX[wx]}">${wx}:${'█'.repeat(n)} ${n}</span>`)
    .join(' ');

  const dm = c.dayMaster;
  const ctx = agent.state.ctx;
  const personality = agent.state.personality;
  const career = agent.state.career;
  const strategy = agent.state.strategy;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>AI Destiny OS · 命理分析报告</title>
<style>
  @page { margin: 15mm; size: A4; }
  body { font-family: "PingFang SC", "Noto Sans SC", sans-serif; color: #1a1a1a; line-height: 1.8; max-width: 700px; margin: 0 auto; padding: 20px; }
  h1 { text-align: center; font-size: 1.4rem; border-bottom: 2px solid #c93; padding-bottom: 12px; margin-bottom: 8px; }
  .subtitle { text-align: center; color: #888; font-size: 0.8rem; margin-bottom: 24px; }
  h2 { font-size: 1rem; color: #c93; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 24px 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin: 10px 0; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
  th { background: #f8f8f8; font-weight: 500; font-size: 0.8rem; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 0.85rem; margin: 8px 0; }
  .info-grid .label { color: #888; }
  .tag { background: #f0f0f0; border-radius: 3px; padding: 1px 6px; font-size: 0.8rem; }
  .bar { font-family: monospace; }
  footer { text-align: center; color: #aaa; font-size: 0.7rem; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; }
  .wx-wood { color: #4a9; } .wx-fire { color: #e55; } .wx-earth { color: #c93; } .wx-metal { color: #888; } .wx-water { color: #48b; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>AI Destiny OS · 命理分析报告</h1>
<p class="subtitle">生成时间: ${new Date().toLocaleString('zh-CN')}</p>

<h2>出生信息</h2>
<div class="info-grid">
  <div><span class="label">出生日期</span> ${birth.year}年${birth.month}月${birth.day}日 ${String(birth.hour).padStart(2, '0')}:${String(birth.minute).padStart(2, '0')}</div>
  <div><span class="label">性别</span> ${birth.gender}</div>
  <div><span class="label">经度</span> ${birth.longitude}°</div>
  <div><span class="label">夏令时</span> ${birth.isDST ? '是' : '否'}</div>
</div>

<h2>四柱八字 · Four Pillars</h2>
<table>
  <tr><th>柱位</th><th>六十甲子</th><th>天干</th><th>地支</th><th>藏干</th><th>纳音</th><th>十神</th></tr>
  ${pillarRows}
</table>
<div style="margin:8px 0;font-size:0.85rem;"><strong>日主:</strong> <span style="color:${WX_COLOR_HEX[dm.wuxing]}">${dm.name}${dm.wuxing} (${dm.yinYang})</span></div>
<div class="bar">五行分布: ${wuxingBars}</div>

<h2>命理分析</h2>
<div class="info-grid">
  <div><span class="label">格局</span> ${ctx.structure.primaryPattern}</div>
  <div><span class="label">格局说明</span> ${ctx.structure.analysis.join('，')}</div>
  <div><span class="label">旺衰</span> ${ctx.strength.level} (${ctx.strength.strengthScore}分)</div>
  <div><span class="label">调候</span> ${ctx.climate.needsAdjustment ? '需' + ctx.climate.neededWuxing : '中和'}</div>
</div>

<h2>性格分析</h2>
<p>核心特质: ${personality.coreTraits.map(t => `<span class="tag">${t}</span>`).join(' ')}</p>
<p>MBTI倾向: ${personality.mbtiTendency.join(' / ')}</p>

<h2>事业分析</h2>
<p>推荐行业: ${career.industries.slice(0, 5).map(i => i.industry).join('、')}</p>
<p>创业评分: ${'★'.repeat(Math.round(career.entrepreneurshipScore / 2))}${'☆'.repeat(5 - Math.round(career.entrepreneurshipScore / 2))} (${career.entrepreneurshipScore}/10)</p>

<h2>运势概览</h2>
<div class="info-grid">
  <div><span class="label">总体运势</span> ${ctx.fortune.overall.level}期 (${ctx.fortune.overall.score}分)</div>
  <div><span class="label">最佳领域</span> ${ctx.fortune.overall.bestDimension}</div>
  <div><span class="label">风险领域</span> ${ctx.fortune.overall.riskDimension}</div>
</div>
${ctx.fortune.yearlyAnalysis.length > 0 ? `
<h3>${ctx.fortune.yearlyAnalysis[0]!.year}年流年运势</h3>
<div class="info-grid">
  <div><span class="label">事业运</span> ${ctx.fortune.yearlyAnalysis[0]!.career}分</div>
  <div><span class="label">财运</span> ${ctx.fortune.yearlyAnalysis[0]!.wealth}分</div>
  <div><span class="label">感情运</span> ${ctx.fortune.yearlyAnalysis[0]!.relationship}分</div>
  <div><span class="label">健康运</span> ${ctx.fortune.yearlyAnalysis[0]!.health}分</div>
</div>` : ''}

${c.currentDayun ? `
<h2>大运信息</h2>
<p>当前大运: ${SEXAGENARY_NAMES[c.currentDayun.pillar.sexagenaryIndex]} (${c.currentDayun.startAge}-${c.currentDayun.startAge + 10}岁) ${c.currentDayun.direction}</p>
` : ''}

<h2>人生战略</h2>
<p>当前阶段: ${strategy.currentPhase.name}</p>
<p>最有利方位: ${strategy.locationAdvice.slice(0, 3).map(l => l.location).join('、') || '综合考量'}</p>

<footer>AI Destiny OS · 命理分析报告 · 仅供参考</footer>
</body>
</html>`;
}
