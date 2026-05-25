// ============================================================
// AI Destiny OS — Visualization: Destiny Dashboard (命运驾驶舱)
// Integrated view combining all analysis dimensions.
// ============================================================

import type { DestinyChart } from '../core/astro/types.js';
import { SEXAGENARY_NAMES } from '../core/astro/constants.js';
import type { StrengthResult } from '../core/destiny/strengthEngine.js';
import type { StructureResult } from '../core/destiny/structureEngine.js';
import type { ClimateResult } from '../core/destiny/climateEngine.js';
import type { RelationResult } from '../core/destiny/relationEngine.js';
import type { FortuneResult } from '../core/destiny/fortuneEngine.js';
import type { MemoryStats } from '../memory/types.js';
import { renderChart, colorWx } from './chartRenderer.js';
import { renderFortuneTimeline } from './fortuneTimeline.js';

export interface DashboardOptions {
  /** Show full chart or compact */
  compact?: boolean;
  /** Include AI analysis sections */
  includeAI?: boolean;
  /** Include memory stats */
  includeMemory?: boolean;
  /** Use ANSI color */
  color?: boolean;
  /** Width in characters */
  width?: number;
}

/**
 * Render the complete destiny cockpit.
 */
export function renderDashboard(
  chart: DestinyChart,
  strength: StrengthResult,
  structure: StructureResult,
  climate: ClimateResult,
  relations: RelationResult,
  fortune: FortuneResult,
  options: DashboardOptions = {},
): string {
  const sections: string[] = [];

  // 1. Header
  sections.push(renderHeader(chart));
  sections.push('');

  // 2. Chart section
  if (options.compact) {
    sections.push(renderChartCompact(chart));
  } else {
    sections.push(renderChart(chart));
  }
  sections.push('');

  // 3. Key metrics row
  sections.push(renderKeyMetrics(strength, fortune, structure));
  sections.push('');

  // 4. Strength gauge
  sections.push(renderStrengthGauge(strength));
  sections.push('');

  // 5. Structure & Climate side-by-side
  sections.push(renderStructureClimate(structure, climate));
  sections.push('');

  // 6. Relations
  sections.push(renderRelations(relations));
  sections.push('');

  // 7. Fortune timeline
  sections.push(renderFortuneSection(fortune));
  sections.push('');

  // 8. Personality & Career (AI layer)
  sections.push(renderAISection(chart, strength, fortune, options));

  // 9. Memory stats
  sections.push(renderMemorySection(options));

  return sections.join('\n');
}

function renderHeader(chart: DestinyChart): string {
  const dm = chart.dayMaster;
  const currentDayun = chart.currentDayun;
  const dnName = currentDayun
    ? SEXAGENARY_NAMES[currentDayun.pillar.sexagenaryIndex]
    : '—';

  return strip(`
╔══════════════════════════════════════════════════════════════════════╗
║                    🪐 命 运 驾 驶 舱 · Destiny Cockpit                  ║
║   ${colorWx(dm.wuxing, `${dm.name}${dm.wuxing}`)}日主  │  ${dnName}大运  │  ${chart.birthInfo.year}/${chart.birthInfo.month}/${chart.birthInfo.day}
╚══════════════════════════════════════════════════════════════════════╝
`);
}

function renderChartCompact(chart: DestinyChart): string {
  const { bazi } = chart;
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  const labels = ['年', '月', '日', '时'];

  const stemLine = pillars.map(p => colorWx(p.stem.wuxing, p.stem.name)).join('  ');
  const branchLine = pillars.map(p => colorWx(p.branch.wuxing, p.branch.name)).join('  ');
  const labelLine = labels.map(l => ` ${l} `).join('    ');
  const nameLine = pillars.map(p => (SEXAGENARY_NAMES[p.sexagenaryIndex] ?? '??').padEnd(4)).join('  ');

  return [
    `  ${labelLine}`,
    `  ${stemLine}`,
    `  ${branchLine}`,
    `  ${nameLine}`,
  ].join('\n');
}

// ---- Key Metrics ----

function renderKeyMetrics(
  strength: StrengthResult,
  fortune: FortuneResult,
  structure: StructureResult,
): string {
  const scoreBar = '█'.repeat(Math.round(fortune.overall.score / 5))
    + '░'.repeat(20 - Math.round(fortune.overall.score / 5));

  const strengthColor = strength.level === '身旺' || strength.level === '从旺' ? '31' :
    strength.level === '身弱' || strength.level === '从弱' ? '34' : '33';

  return strip(`
┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
│     💪 身强 Strength       │     📊 格局 Structure       │     📈 运势 Fortune         │
├──────────────────────────┼──────────────────────────┼──────────────────────────┤
│  得分: ${String(strength.score).padStart(3)}/100        │  格局: ${structure.primaryPattern.padEnd(16)}│  得分: ${String(fortune.overall.score).padStart(3)}/100          │
│  等级: \x1b[${strengthColor}m${strength.level}\x1b[0m              │  喜用: ${structure.isFavorable ? '✓ 得用' : '注意'}          │  等级: ${fortune.overall.level}              │
│  月令: +${strength.breakdown.monthOrder}                  │                          │  ${scoreBar}  │
│  通根: +${strength.breakdown.roots}                  │                          │  强项: ${fortune.overall.bestDimension}                  │
│  助力: +${strength.breakdown.stemSupport + strength.breakdown.branchSupport}                  │                          │  风险: ${fortune.overall.riskDimension}                  │
└──────────────────────────┴──────────────────────────┴──────────────────────────┘
`);
}

// ---- Strength Gauge ----

function renderStrengthGauge(strength: StrengthResult): string {
  const score = strength.score;
  const barLen = 40;
  const filled = Math.round(score / 100 * barLen);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);

  const labels = ['从弱', '身弱', '中和', '身旺', '从旺'];
  const markerIdx = ['从弱', '身弱', '中和', '身旺', '从旺'].indexOf(strength.level);
  const markerPos = Math.round(barLen * (markerIdx / (labels.length - 1)));

  let markerLine = ' '.repeat(markerPos) + '▲';
  // Adjust for marker line alignment
  const pad = barLen - markerLine.length + 1;
  markerLine = markerLine + ' '.repeat(Math.max(0, pad));

  return strip(`
┌─────────────────────────────────────────────────────────────────────┐
│                      🔋 旺衰仪表 · Strength Gauge                      │
│  从弱         身弱         中和         身旺         从旺               │
│  ${bar}  │
│  ${markerLine}                                                    │
│  得分: ${score}/100  等级: ${strength.level}                                  │
│  ${strength.analysis.join('；')}                                      │
└─────────────────────────────────────────────────────────────────────┘
`);
}

// ---- Structure & Climate ----

function renderStructureClimate(
  structure: StructureResult,
  climate: ClimateResult,
): string {
  const climateIcon = climate.needsAdjustment ? '⚠️' : '✅';
  const climateStatus = climate.needsAdjustment
    ? `需调候: ${climate.neededWuxing} (${climate.condition})`
    : '无需特殊调候';

  return strip(`
┌────────────────────────────────┬────────────────────────────────────┐
│   🏛️ 格局 Structure              │   🌡️ 调候 Climate                  │
├────────────────────────────────┼────────────────────────────────────┤
│   主格: ${structure.primaryPattern.padEnd(23)}│   ${climateIcon} ${climateStatus.padEnd(34)}│
│   ${structure.analysis.slice(0, 2).join('\n   ').padEnd(46)}│   ${climate.analysis.join('；')}  │
└────────────────────────────────┴────────────────────────────────────┘
`);
}

// ---- Relations ----

function renderRelations(relations: RelationResult): string {
  const favorable = relations.relations.filter(r => r.category === 'favorable');
  const unfavorable = relations.relations.filter(r => r.category === 'unfavorable');

  return strip(`
┌─────────────────────────────────────────────────────────────────────┐
│                    🔗 十神关系 · Ten God Relations                      │
│  主题: ${relations.dominantTheme.padEnd(60)}│
│  ✓ 有利: ${(favorable.map(r => r.name).join(', ') || '无').padEnd(60)}│
│  ✗ 不利: ${(unfavorable.map(r => r.name).join(', ') || '无').padEnd(60)}│
│  概要: ${relations.summary.slice(0, 80)}                               │
└─────────────────────────────────────────────────────────────────────┘
`);
}

// ---- Fortune Section ----

function renderFortuneSection(fortune: FortuneResult): string {
  const years = fortune.yearlyAnalysis;
  if (years.length === 0) return '运势数据不足，无法生成时间线。';

  // Current year focus
  const currentYear = new Date().getFullYear();
  const thisYear = years.find(y => y.year === currentYear);

  let focusBlock = '';
  if (thisYear) {
    const dims: [string, number][] = [
      ['事业', thisYear.career],
      ['财富', thisYear.wealth],
      ['感情', thisYear.relationship],
      ['健康', thisYear.health],
    ];
    dims.sort(([, a], [, b]) => b - a);
    focusBlock = `\n│  ${currentYear}年重点: ${dims[0]![0]}(${dims[0]![1]}) > ${dims[1]![0]}(${dims[1]![1]}) > ${dims[2]![0]}(${dims[2]![1]}) > ${dims[3]![0]}(${dims[3]![1]})`.padEnd(69) + '│';
  }

  return strip(`
┌─────────────────────────────────────────────────────────────────────┐
│                 📅 运势时间线 · Fortune Timeline                        │${focusBlock}
│                                                                     │
${renderFortuneTimeline(fortune)}│
└─────────────────────────────────────────────────────────────────────┘
`);
}

// ---- AI Section ----

function renderAISection(
  chart: DestinyChart,
  strength: StrengthResult,
  fortune: FortuneResult,
  options: DashboardOptions,
): string {
  if (!options.includeAI) return '';

  const dm = chart.dayMaster;

  return strip(`
┌─────────────────────────────────────────────────────────────────────┐
│                    🤖 AI 解释 · AI Interpretation                      │
│  日主: ${dm.name}${dm.wuxing} (${dm.yinYang})                                                    │
│  命局特点: 日主${strength.level}，${fortune.overall.level}期运势                    │
│                                                                     │
│  [请使用 AI 引擎生成详细解释]                                               │
└─────────────────────────────────────────────────────────────────────┘
`);
}

// ---- Memory Section ----

function renderMemorySection(options: DashboardOptions): string {
  if (!options.includeMemory) return '';

  return strip(`
┌─────────────────────────────────────────────────────────────────────┐
│                    🧠 记忆数据 · Memory Stats                           │
│  事件总数: —   预测总数: —   核实率: —   准确度: —                        │
└─────────────────────────────────────────────────────────────────────┘
`);
}

/**
 * Render memory stats into the dashboard.
 */
export function renderMemoryStats(stats: MemoryStats): string {
  return strip(`
┌─────────────────────────────────────────────────────────────────────┐
│                    🧠 记忆统计 · Memory Stats                            │
│  生活事件: ${stats.totalEvents}    预测总数: ${stats.totalPredictions}    已核实: ${stats.verifiedPredictions}    准确度: ${stats.averageAccuracy.toFixed(2)}  │
│  最佳领域: ${stats.bestDomain ?? '—'}    覆盖年份: ${stats.yearRange ? `${stats.yearRange[0]}-${stats.yearRange[1]}` : '—'}                              │
└─────────────────────────────────────────────────────────────────────┘
`);
}

// ---- Utility ----

function strip(s: string): string {
  return s
    .split('\n')
    .map(l => l.trimEnd())
    .join('\n')
    .trim();
}

export { renderFortuneTimeline } from './fortuneTimeline.js';
export { renderMemoryViews } from './memoryViews.js';
