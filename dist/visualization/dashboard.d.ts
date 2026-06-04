import type { DestinyChart } from '../core/astro/types.js';
import type { StrengthResult } from '../core/destiny/strengthEngine.js';
import type { StructureResult } from '../core/destiny/structureEngine.js';
import type { ClimateResult } from '../core/destiny/climateEngine.js';
import type { RelationResult } from '../core/destiny/relationEngine.js';
import type { FortuneResult } from '../core/destiny/fortuneEngine.js';
import type { MemoryStats } from '../memory/types.js';
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
export declare function renderDashboard(chart: DestinyChart, strength: StrengthResult, structure: StructureResult, climate: ClimateResult, relations: RelationResult, fortune: FortuneResult, options?: DashboardOptions): string;
/**
 * Render memory stats into the dashboard.
 */
export declare function renderMemoryStats(stats: MemoryStats): string;
export { renderFortuneTimeline } from './fortuneTimeline.js';
export { renderMemoryViews } from './memoryViews.js';
//# sourceMappingURL=dashboard.d.ts.map