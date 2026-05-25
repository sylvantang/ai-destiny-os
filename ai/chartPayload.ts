// ============================================================
// AI Destiny OS — Chart Payload Builder
// Extracted from server.ts: builds the JSON payload sent to the UI.
// ============================================================

import { ALL_STEMS, SEXAGENARY_NAMES } from '../core/astro/constants.js';
import type { DestinyAgent } from '../agent/agentEngine.js';

export function buildChartPayload(agent: DestinyAgent): Record<string, unknown> {
  const chart = agent.state.chart;
  const bz = chart.bazi;
  const ctx = agent.state.ctx;
  const pillars = [bz.year, bz.month, bz.day, bz.hour];
  return {
    pillars: pillars.map(p => ({
      stem: { name: p.stem.name, wuxing: p.stem.wuxing },
      branch: { name: p.branch.name, wuxing: p.branch.wuxing },
      hiddenStems: p.hiddenStems.map(idx => ({ name: ALL_STEMS[idx]!.name, wuxing: ALL_STEMS[idx]!.wuxing })),
      nayin: p.nayin,
      shiShen: p.shiShen,
      sexagenary: SEXAGENARY_NAMES[p.sexagenaryIndex],
    })),
    dayMaster: { name: chart.dayMaster.name, wuxing: chart.dayMasterWuxing },
    wuxingCounts: chart.wuxingCount,
    currentDayun: (() => {
      if (!chart.currentDayun) return null;
      const cdIdx = chart.dayun.indexOf(chart.currentDayun);
      const endAge = cdIdx >= 0 && cdIdx < chart.dayun.length - 1
        ? chart.dayun[cdIdx + 1]!.startAge
        : chart.currentDayun.startAge + 10;
      return {
        pillar: SEXAGENARY_NAMES[chart.currentDayun.pillar.sexagenaryIndex],
        startAge: chart.currentDayun.startAge,
        endAge,
      };
    })(),
    startAge: chart.dayun[0]?.startAge ?? 0,
    dayun: chart.dayun.slice(0, 8).map((d, i, arr) => ({
      pillar: SEXAGENARY_NAMES[d.pillar.sexagenaryIndex],
      shiShen: d.pillar.shiShen,
      startAge: d.startAge,
      endAge: i < arr.length - 1 ? arr[i + 1]!.startAge : d.startAge + 10,
    })),
    lifePeriods: ctx.fortune.lifePeriods.map(lp => ({
      name: lp.name,
      ageRange: lp.ageRange,
      theme: lp.theme,
    })),
  };
}
