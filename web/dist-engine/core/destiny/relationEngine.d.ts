import type { BaZi, HeavenlyStemIndex, ShiShen } from '../astro/types.js';
export interface RelationResult {
    /** All identified significant relationships */
    relations: NamedRelation[];
    /** Combined relationship summary (one paragraph) */
    summary: string;
    /** The dominant life theme based on relationships */
    dominantTheme: string;
}
export interface NamedRelation {
    name: string;
    category: 'favorable' | 'unfavorable' | 'neutral';
    description: string;
    stems: HeavenlyStemIndex[];
    shiShens: ShiShen[];
}
/**
 * Analyze the 十神 relationships in a BaZi chart.
 *
 * Key relationships:
 *   官印相生 (Officer produces Seal) → 官→印→身 → career+education synergy
 *   食神制杀 (Food controls Seven Killings) → 以智制煞 → skill overcomes danger
 *   财坏印 (Wealth damages Seal) → 财破印 → conflict between money and study
 *   伤官见官 (Hurting Officer meets Officer) → 才华与权威冲突
 *   比劫夺财 (Rob Wealth steals Wealth) → 竞争破财
 *   印星护身 (Seal protects body) → 印化官杀 → protection from harm
 *   食伤生财 (Output produces Wealth) → 才华生财 → talent monetization
 *   财官相生 (Wealth produces Officer) → 财生官 → wealth builds authority
 */
export declare function analyzeRelations(bazi: BaZi): RelationResult;
//# sourceMappingURL=relationEngine.d.ts.map