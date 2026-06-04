import type { DestinyChart, Wuxing } from '../core/astro/types.js';
/**
 * Render the full Four Pillars chart as a formatted string.
 */
export declare function renderChart(chart: DestinyChart): string;
/** Color a string by wuxing */
export declare function colorWx(wx: Wuxing, text: string): string;
/**
 * Render a compact single-line chart summary.
 */
export declare function renderChartSummary(chart: DestinyChart): string;
/**
 * Render the full chart as plain text (no ANSI codes) for file output.
 */
export declare function renderChartPlain(chart: DestinyChart): string;
//# sourceMappingURL=chartRenderer.d.ts.map