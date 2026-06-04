import type { BaZi, DaYunPillar, LiuNian } from '../astro/types.js';
import type { StrengthResult } from './strengthEngine.js';
import type { StructureResult } from './structureEngine.js';
import type { ClimateResult } from './climateEngine.js';
import type { RelationResult } from './relationEngine.js';
export interface FortuneResult {
    overall: FortuneAssessment;
    yearlyAnalysis: YearlyFortune[];
    keyYears: {
        best: YearlyFortune | null;
        worst: YearlyFortune | null;
    };
    lifePeriods: LifePeriod[];
    summary: string;
}
export interface FortuneAssessment {
    score: number;
    level: string;
    levelLabel: string;
    bestDimension: string;
    riskDimension: string;
    dimensions: {
        career: number;
        wealth: number;
        relationship: number;
        health: number;
    };
    modifiers: string[];
}
export interface YearlyFortune {
    year: number;
    daiyunPillar: string | null;
    liunianPillar: string | null;
    career: number;
    wealth: number;
    relationship: number;
    health: number;
    overall: number;
}
export interface LifePeriod {
    name: string;
    ageRange: string;
    theme: string;
    description: string;
    keyAdvice: string;
}
export declare function analyzeFortune(bazi: BaZi, strength: StrengthResult, structure: StructureResult, climate: ClimateResult, relations: RelationResult, dayun: DaYunPillar[], liunian: LiuNian[]): FortuneResult;
//# sourceMappingURL=fortuneEngine.d.ts.map