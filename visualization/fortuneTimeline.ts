// ============================================================
// AI Destiny OS — Visualization: Fortune Timeline
// DaYun cycles + LiuNian fortunes as a scrollable timeline.
// ============================================================

import type { DaYunPillar } from '../core/astro/types.js';
import { SEXAGENARY_NAMES } from '../core/astro/constants.js';
import type { FortuneResult, YearlyFortune } from '../core/destiny/fortuneEngine.js';

/**
 * Render fortune timeline showing yearly scores and DaYun cycles.
 */
export function renderFortuneTimeline(fortune: FortuneResult): string {
  const years = fortune.yearlyAnalysis;
  if (years.length === 0) return '';

  const lines: string[] = [];
  const currentYear = new Date().getFullYear();

  for (const yf of years) {
    const isCurrent = yf.year === currentYear;
    const marker = isCurrent ? '▶' : ' ';
    const bar = yearBar(yf);
    const score = averageScore(yf);
    const level = scoreLevel(score);
    const daYunLabel = yf.daiyunPillar
      ? SEXAGENARY_NAMES[yf.daiyunPillar.pillar.sexagenaryIndex] ?? '—'
      : '  ';

    const yearStr = `${marker}${yf.year}`.padEnd(7);
    const barPart = `${bar}`.padEnd(22);
    const scorePart = `${String(score).padStart(3)}`.padEnd(6);
    const highlight = isCurrent ? ` ← ${currentYear}年` : '';

    lines.push(`│  ${yearStr}${barPart}${scorePart}${daYunLabel}${highlight}`);
  }

  // Legend
  lines.push('│');
  lines.push('│  ████ 事业  ░░░░ 财富  ▓▓▓▓ 感情  ▒▒▒▒ 健康');

  return lines.join('\n') + '\n';
}

function yearBar(yf: YearlyFortune): string {
  const segments: [number, string][] = [
    [yf.career / 25, '█'],
    [yf.wealth / 25, '░'],
    [yf.relationship / 25, '▓'],
    [yf.health / 25, '▒'],
  ];

  return segments.map(([count, char]) => char.repeat(Math.round(count))).join('');
}

function averageScore(yf: YearlyFortune): number {
  return Math.round((yf.career + yf.wealth + yf.relationship + yf.health) / 4);
}

function scoreLevel(score: number): string {
  if (score >= 75) return '高峰';
  if (score >= 60) return '上升';
  if (score >= 40) return '平缓';
  return '低谷';
}

/**
 * Render DaYun cycles overview.
 */
export function renderDayunCycles(dayun: DaYunPillar[]): string {
  if (dayun.length === 0) return '大运数据不足';

  const lines: string[] = [];
  lines.push('┌──────┬──────────┬───────────┬───────────┬───────────┬──────┐');
  lines.push('│ 起运  │   大运    │   天干    │   地支    │    纳音    │ 方向  │');
  lines.push('├──────┼──────────┼───────────┼───────────┼───────────┼──────┤');

  for (const dy of dayun.slice(0, 8)) {
    const name = SEXAGENARY_NAMES[dy.pillar.sexagenaryIndex] ?? '??';
    const stem = dy.pillar.stem;
    const branch = dy.pillar.branch;

    lines.push(
      `│ ${String(dy.startAge).padStart(2)}岁 ` +
      `│ ${`${stem.name}${branch.name}`.padEnd(8)} ` +
      `│ ${`${stem.name} ${stem.wuxing}`.padEnd(9)} ` +
      `│ ${`${branch.name} ${branch.wuxing}`.padEnd(9)} ` +
      `│ ${dy.pillar.nayin.padEnd(9)} ` +
      `│ ${dy.direction.padEnd(4)} │`
    );
  }

  lines.push('└──────┴──────────┴───────────┴───────────┴───────────┴──────┘');
  return lines.join('\n');
}

/**
 * Render life periods summary.
 */
export function renderLifePeriods(fortune: FortuneResult): string {
  const periods = fortune.lifePeriods;
  if (periods.length === 0) return '';

  const lines: string[] = [];
  lines.push('人生阶段 · Life Periods:');
  lines.push('');

  for (const period of periods) {
    lines.push(`  ${period.name} (${period.ageRange})`);
    lines.push(`    ${period.description}`);
    lines.push(`    → ${period.keyAdvice}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Render yearly fortune detail card.
 */
export function renderYearCard(year: YearlyFortune): string {
  const dims: [string, number, string][] = [
    ['事业', year.career, '💼'],
    ['财富', year.wealth, '💰'],
    ['感情', year.relationship, '❤️'],
    ['健康', year.health, '🏥'],
  ];
  dims.sort(([, a], [, b]) => b - a);

  const lines: string[] = [];
  lines.push(`┌────────────────────────────────┐`);
  lines.push(`│  📅 ${year.year}年运势详情              │`);
  lines.push(`├────────────────────────────────┤`);

  for (const [domain, score, icon] of dims) {
    const bar = '█'.repeat(Math.round(score / 5)) + '░'.repeat(20 - Math.round(score / 5));
    lines.push(`│  ${icon} ${domain}: ${bar} ${String(score).padStart(3)} │`);
  }

  const avg = averageScore(year);
  lines.push(`├────────────────────────────────┤`);
  lines.push(`│  综合: ${avg}/100  ${scoreLevel(avg)}                      │`);
  lines.push(`└────────────────────────────────┘`);

  return lines.join('\n');
}
