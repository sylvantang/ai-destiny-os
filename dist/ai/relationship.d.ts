import type { PromptContext, AIPrompt } from './promptBuilder.js';
export interface RelationshipResult {
    /** Attachment style */
    attachmentStyle: string;
    /** Emotional needs */
    emotionalNeeds: string[];
    /** Ideal partner traits */
    idealPartnerTraits: string[];
    /** Marriage timing */
    marriageTiming: string;
    /** Relationship strengths */
    relationshipStrengths: string[];
    /** Relationship risks */
    relationshipRisks: string[];
    /** Relationship advice */
    advice: string[];
    /** Compatible day master types */
    compatibleTypes: string[];
    /** AI prompt */
    prompt: AIPrompt;
}
/**
 * Analyze relationship patterns from BaZi structure.
 */
export declare function analyzeRelationship(ctx: PromptContext): RelationshipResult;
export declare function renderRelationshipProse(result: RelationshipResult, ctx: PromptContext): string;
//# sourceMappingURL=relationship.d.ts.map