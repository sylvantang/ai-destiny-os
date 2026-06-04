import type { BaZi, HeavenlyStemIndex, ShiShen } from '../astro/types.js';
import type { StrengthResult } from './strengthEngine.js';
export type PatternType = '正官格' | '七杀格' | '正财格' | '偏财格' | '正印格' | '偏印格' | '食神格' | '伤官格' | '建禄格' | '月刃格' | '从财格' | '从杀格' | '从儿格' | '从势格' | '化气格' | '杂气格';
export interface StructureResult {
    primaryPattern: PatternType;
    subPattern: PatternType | null;
    patternShiShen: ShiShen | null;
    patternStem: HeavenlyStemIndex | null;
    isSpecial: boolean;
    isFavorable: boolean;
    analysis: string[];
}
/**
 * Identify the chart's pattern (格局).
 *
 * Primary determination:
 * 1. Check for special patterns (从格, 化气格) based on strength
 * 2. Look at the month branch's dominant hidden stem (月令本气)
 * 3. If it appears on a heavenly stem (透干), that's the pattern
 * 4. If not, the month branch's dominant qi determines the pattern
 */
export declare function analyzeStructure(bazi: BaZi, strength: StrengthResult): StructureResult;
//# sourceMappingURL=structureEngine.d.ts.map