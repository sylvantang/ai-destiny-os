import type { PromptContext, AIPrompt } from './promptBuilder.js';
export interface CareerResult {
    /** Top industry recommendations */
    industries: IndustryRecommendation[];
    /** Entrepreneurship score 1-10 */
    entrepreneurshipScore: number;
    /** Entrepreneurship analysis */
    entrepreneurshipAnalysis: string;
    /** Wealth accumulation pattern */
    wealthPattern: string;
    /** Wealth peak periods */
    wealthPeaks: string[];
    /** Risk tolerance profile */
    riskProfile: string;
    /** Key career advantage */
    competitiveAdvantage: string[];
    /** Career risk factors */
    careerRisks: string[];
    /** AI prompt */
    prompt: AIPrompt;
}
export interface IndustryRecommendation {
    industry: string;
    fit: number;
    reason: string;
}
/**
 * Analyze career path from BaZi structure.
 */
export declare function analyzeCareer(ctx: PromptContext): CareerResult;
export declare function renderCareerProse(result: CareerResult, ctx: PromptContext): string;
//# sourceMappingURL=career.d.ts.map