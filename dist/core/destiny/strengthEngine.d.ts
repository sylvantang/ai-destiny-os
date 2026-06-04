import type { BaZi } from '../astro/types.js';
import type { ClimateResult } from './climateEngine.js';
export type StrengthLevel = '从弱' | '偏弱' | '中和' | '偏旺' | '从旺';
export interface StrengthFactor {
    name: string;
    category: 'support' | 'weaken' | 'interaction';
    score: number;
    description: string;
}
export interface StrengthResult {
    dayMaster: {
        stem: string;
        wuxing: string;
        yinYang: string;
    };
    strengthScore: number;
    level: StrengthLevel;
    levelLabel: string;
    factors: StrengthFactor[];
    monthOrder: {
        branch: string;
        wuxing: string;
        relation: string;
        score: number;
        description: string;
    };
    roots: Array<{
        pillar: string;
        branch: string;
        stem: string;
        depth: string;
        score: number;
    }>;
    stemSupport: Array<{
        pillar: string;
        stem: string;
        relation: string;
        score: number;
    }>;
    branchSupport: {
        score: number;
        description: string;
    };
    weakening: Array<{
        pillar: string;
        stem: string;
        reason: string;
        score: number;
    }>;
    scoring: {
        base: number;
        monthOrder: number;
        seasonalState: number;
        twelveStage: number;
        touGan: number;
        roots: number;
        stemSupport: number;
        branchSupport: number;
        weakening: number;
        threeHarmony: number;
        climateAdjustment: number;
        total: number;
    };
    summary: string;
}
export declare function analyzeStrength(bazi: BaZi, climate?: ClimateResult): StrengthResult;
//# sourceMappingURL=strengthEngine.d.ts.map