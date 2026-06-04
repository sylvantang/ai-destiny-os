import type { DaYunPillar } from '../core/astro/types.js';
import type { FortuneResult, YearlyFortune } from '../core/destiny/fortuneEngine.js';
/**
 * Render fortune timeline showing yearly scores and DaYun cycles.
 */
export declare function renderFortuneTimeline(fortune: FortuneResult): string;
/**
 * Render DaYun cycles overview.
 */
export declare function renderDayunCycles(dayun: DaYunPillar[]): string;
/**
 * Render life periods summary.
 */
export declare function renderLifePeriods(fortune: FortuneResult): string;
/**
 * Render yearly fortune detail card.
 */
export declare function renderYearCard(year: YearlyFortune): string;
//# sourceMappingURL=fortuneTimeline.d.ts.map