import type { PromptContext, AIPrompt } from './promptBuilder.js';
export interface PersonalityResult {
    /** Core traits derived from the day master */
    coreTraits: string[];
    /** MBTI tendency */
    mbtiTendency: string[];
    /** Dominant work style */
    workStyle: string;
    /** Stress response pattern */
    stressResponse: string;
    /** Key strengths (3-5) */
    strengths: string[];
    /** Growth areas (3-5) */
    growthAreas: string[];
    /** Decision-making style */
    decisionStyle: string;
    /** Social interaction pattern */
    socialPattern: string;
    /** Ready-to-use AI prompt */
    prompt: AIPrompt;
}
/**
 * Analyze personality from BaZi structure.
 *
 * Framework:
 *   Day master wuxing → core temperament
 *   Day master yin/yang → introversion/extraversion tendency
 *   Structure/pattern → behavioral style
 *   Strength level → confidence and energy
 *   十神 distribution → cognitive patterns
 */
export declare function analyzePersonality(ctx: PromptContext): PersonalityResult;
/**
 * Render a rule-based natural Chinese prose for personality analysis.
 * Used as fallback when no LLM is available, or as a standalone report.
 */
export declare function renderPersonalityProse(result: PersonalityResult, ctx: PromptContext): string;
//# sourceMappingURL=personality.d.ts.map