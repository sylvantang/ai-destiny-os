// ============================================================
// AI Destiny OS — Visualization: Chart Renderer
// Text-based Four Pillars chart rendering with ANSI color.
// ============================================================

import type { DestinyChart, BaZi, Wuxing } from '../core/astro/types.js';
import { HIDDEN_STEMS, SEXAGENARY_NAMES } from '../core/astro/constants.js';

// ANSI color codes for Wuxing
const WX_COLORS: Record<Wuxing, (s: string) => string> = {
  '木': (s) => `\x1b[32m${s}\x1b[0m`,   // Green
  '火': (s) => `\x1b[31m${s}\x1b[0m`,   // Red
  '土': (s) => `\x1b[33m${s}\x1b[0m`,   // Yellow
  '金': (s) => `\x1b[37m${s}\x1b[0m`,   // White
  '水': (s) => `\x1b[34m${s}\x1b[0m`,   // Blue
};

const WX_ICONS: Record<Wuxing, string> = {
  '木': '🌳', '火': '🔥', '土': '🏔️', '金': '⚜️', '水': '💧',
};

/**
 * Render the full Four Pillars chart as a formatted string.
 */
export function renderChart(chart: DestinyChart): string {
  const { bazi } = chart;
  const lines: string[] = [];

  lines.push(boxHeader('四 柱 八 字 · Four Pillars'));
  lines.push('');

  // Pillar headers
  lines.push(formatPillarHeaders());
  lines.push(formatSeparator());

  // Stem row
  lines.push(formatStemRow(bazi));
  lines.push(formatSeparator());

  // Branch row
  lines.push(formatBranchRow(bazi));
  lines.push(formatSeparator());

  // Hidden stems row
  lines.push(formatHiddenStemsRow(bazi));
  lines.push(formatSeparator());

  // Nayin row
  lines.push(formatNayinRow(bazi));
  lines.push(formatSeparator());

  // Shi Shen row (relative to day master)
  lines.push(formatShiShenRow(bazi));
  lines.push(formatSeparator());

  lines.push('');
  lines.push(formatWuxingCount(chart));
  lines.push(formatDayMasterInfo(chart));

  return lines.join('\n');
}

function boxHeader(title: string): string {
  const width = 72;
  const pad = Math.max(0, width - title.length - 4);
  const left = Math.floor(pad / 2);
  const right = pad - left;
  return `┌${'─'.repeat(width)}┐\n│${' '.repeat(left)}${title}${' '.repeat(right)}│\n└${'─'.repeat(width)}┘`;
}

function formatPillarHeaders(): string {
  const headers = ['年柱 Year', '月柱 Month', '日柱 Day', '时柱 Hour'];
  return headers.map(h => `  ${h.padEnd(14)}  `).join('│');
}

function formatSeparator(): string {
  const cols = ['年柱', '月柱', '日柱', '时柱'];
  return cols.map(() => '─'.repeat(20)).join('┼');
}

function formatStemRow(bazi: BaZi): string {
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  return pillars.map(p => {
    const stem = colorWx(p.stem.wuxing, p.stem.name);
    const label = `天干 ${stem.padEnd(12)}`;
    return `  ${label}`;
  }).join('│');
}

function formatBranchRow(bazi: BaZi): string {
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  return pillars.map(p => {
    const branch = colorWx(p.branch.wuxing, p.branch.name);
    const label = `地支 ${branch.padEnd(12)}`;
    return `  ${label}`;
  }).join('│');
}

function formatHiddenStemsRow(bazi: BaZi): string {
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  return pillars.map(p => {
    const hiddenNames = HIDDEN_STEMS[p.branchIndex]
      .map(hs => colorWx(STEM_WUXING_MAP[hs.stem]!, STEM_NAMES_MAP[hs.stem]!))
      .join('');
    const label = `藏干 ${hiddenNames.padEnd(18)}`;
    return `  ${label}`;
  }).join('│');
}

const STEM_WUXING_MAP: Record<number, Wuxing> = {
  0:'木',1:'木',2:'火',3:'火',4:'土',5:'土',6:'金',7:'金',8:'水',9:'水',
};
const STEM_NAMES_MAP: Record<number, string> = {
  0:'甲',1:'乙',2:'丙',3:'丁',4:'戊',5:'己',6:'庚',7:'辛',8:'壬',9:'癸',
};

function formatNayinRow(bazi: BaZi): string {
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  return pillars.map(p => {
    const label = `纳音 ${p.nayin.padEnd(12)}`;
    return `  ${label}`;
  }).join('│');
}

function formatShiShenRow(bazi: BaZi): string {
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  return pillars.map((p, i) => {
    if (i === 2) {
      return `  十神 ${'日主'.padEnd(12)}`;
    }
    const label = `十神 ${(p.shiShen ?? '—').padEnd(12)}`;
    return `  ${label}`;
  }).join('│');
}

function formatWuxingCount(chart: DestinyChart): string {
  const counts = chart.wuxingCount;
  const entries = (Object.entries(counts) as [Wuxing, number][])
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a);

  const bars = entries.map(([wx, count]) => {
    const bar = '█'.repeat(count);
    return `${WX_ICONS[wx]} ${colorWx(wx, wx)}: ${bar} ${count}`;
  });

  return `五行分布 Wuxing Balance:\n${bars.join('\n')}`;
}

function formatDayMasterInfo(chart: DestinyChart): string {
  const dm = chart.dayMaster;
  const currentDayun = chart.currentDayun;

  let info = `\n日主 Day Master: ${colorWx(dm.wuxing, dm.name)}${dm.wuxing} (${dm.yinYang})`;

  if (currentDayun) {
    const dnName = SEXAGENARY_NAMES[currentDayun.pillar.sexagenaryIndex];
    info += `\n当前大运 Current DaYun: ${dnName} (${currentDayun.startAge}-${currentDayun.startAge + 10}岁)`;
    info += `\n起运年龄 Start Age: ${currentDayun.startAge}岁 (${currentDayun.direction})`;
  }

  return info;
}

/** Color a string by wuxing */
export function colorWx(wx: Wuxing, text: string): string {
  return (WX_COLORS[wx] ?? ((s: string) => s))(text);
}

/**
 * Render a compact single-line chart summary.
 */
export function renderChartSummary(chart: DestinyChart): string {
  const { bazi } = chart;
  const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
  const names = pillars.map(p => {
    const name = SEXAGENARY_NAMES[p.sexagenaryIndex];
    return `${p.stem.name}${p.branch.name}(${name})`;
  });

  return `${chart.dayMaster.name}${chart.dayMasterWuxing}日主 | ${names.join(' ')}`;
}

/**
 * Render the full chart as plain text (no ANSI codes) for file output.
 */
export function renderChartPlain(chart: DestinyChart): string {
  // Strip ANSI codes
  return renderChart(chart).replace(/\x1b\[\d+m/g, '');
}
