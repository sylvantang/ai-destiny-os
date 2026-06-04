import type { Wuxing } from '../core/astro/types.js';
import type { PromptContext, AIPrompt } from './promptBuilder.js';
import type { PersonalityResult } from './personality.js';
import type { CareerResult } from './career.js';
import type { RelationshipResult } from './relationship.js';
export interface StrategyResult {
    /** City/country recommendations */
    locationAdvice: LocationAdvice[];
    /** Current life phase analysis */
    currentPhase: LifePhase;
    /** Recommended actions for next 3 years */
    actionPlan: ActionPlan;
    /** Decision-making framework based on chart */
    decisionFramework: string;
    /** AI prompt for the user's specific question */
    prompt: AIPrompt;
}
export interface LocationAdvice {
    location: string;
    direction: string;
    element: Wuxing;
    fit: number;
    reason: string;
}
export interface LifePhase {
    name: string;
    description: string;
    focus: string[];
    avoid: string[];
}
export interface ActionPlan {
    year1: ActionItem[];
    year2: ActionItem[];
    year3: ActionItem[];
}
export interface ActionItem {
    domain: string;
    action: string;
    priority: '高' | '中' | '低';
}
/**
 * Analyze life strategy combining all other analyses.
 *
 * This is the "CEO-level" analysis that integrates every dimension
 * into actionable strategic advice.
 */
export declare function analyzeStrategy(ctx: PromptContext, personality: PersonalityResult, career: CareerResult, relationship: RelationshipResult, question?: string): StrategyResult;
export declare function renderStrategyProse(result: StrategyResult, _ctx: PromptContext): string;
//# sourceMappingURL=strategy.d.ts.map