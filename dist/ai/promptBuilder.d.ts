import type { DestinyChart } from '../core/astro/types.js';
import type { StrengthResult } from '../core/destiny/strengthEngine.js';
import type { StructureResult } from '../core/destiny/structureEngine.js';
import type { ClimateResult } from '../core/destiny/climateEngine.js';
import type { RelationResult } from '../core/destiny/relationEngine.js';
import type { FortuneResult } from '../core/destiny/fortuneEngine.js';
import type { YongShenResult } from '../core/destiny/yongShenEngine.js';
export interface PromptContext {
    chart: DestinyChart;
    strength: StrengthResult;
    structure: StructureResult;
    climate: ClimateResult;
    relations: RelationResult;
    fortune: FortuneResult;
    yongShen: YongShenResult;
}
export interface AIPrompt {
    system: string;
    user: string;
    /** The structured report card (engine outputs only) */
    data: Record<string, unknown>;
}
/**
 * Build a "report card" containing ONLY pre-computed engine outputs.
 * The LLM never sees raw chart data — only structured analysis results.
 */
export declare function buildReportCard(ctx: PromptContext): Record<string, unknown>;
/**
 * Comprehensive analysis — all dimensions.
 */
export declare function buildComprehensivePrompt(ctx: PromptContext): AIPrompt;
/**
 * Personality analysis.
 */
export declare function buildPersonalityPrompt(ctx: PromptContext): AIPrompt;
/**
 * Career analysis.
 */
export declare function buildCareerPrompt(ctx: PromptContext): AIPrompt;
/**
 * Relationship analysis.
 */
export declare function buildRelationshipPrompt(ctx: PromptContext): AIPrompt;
/**
 * Strategy / life decision analysis — the only prompt where the LLM
 * does some reasoning, but it must ground all conclusions in the report.
 */
export declare function buildStrategyPrompt(ctx: PromptContext, question: string): AIPrompt;
/**
 * Yearly fortune analysis for a specific year.
 */
export declare function buildYearlyFortunePrompt(ctx: PromptContext, year: number): AIPrompt;
//# sourceMappingURL=promptBuilder.d.ts.map