import type { BaZi } from '../astro/types.js';
export interface ClimateResult {
    needsAdjustment: boolean;
    priority: 'high' | 'medium' | 'low' | 'none';
    /** The wuxing needed for climate adjustment */
    neededWuxing: string | null;
    /** Description of the climate condition */
    condition: string;
    analysis: string[];
}
/**
 * Climate adjustment (调候) analysis.
 *
 * Core principle: certain day masters in certain months need
 * specific elements to "adjust the temperature" before any
 * other analysis is meaningful.
 *
 * Key rules:
 *   - 冬水寒 → need 火 to warm (冬季水日主需火调候)
 *   - 夏火炎 → need 水 to cool (夏季火日主需水调候)
 *   - 金生冬月 → need 火 (金生冬月需火)
 *   - 木生冬月 → need 火 (木生冬月需火暖局)
 *   - 夏土燥 → need 水 (夏季土日主需水润局)
 */
export declare function analyzeClimate(bazi: BaZi): ClimateResult;
//# sourceMappingURL=climateEngine.d.ts.map