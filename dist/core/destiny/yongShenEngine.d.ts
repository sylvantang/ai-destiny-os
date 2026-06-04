import type { BaZi, Wuxing } from '../astro/types.js';
import type { StrengthResult } from './strengthEngine.js';
import type { StructureResult } from './structureEngine.js';
import type { ClimateResult } from './climateEngine.js';
export interface YongShenResult {
    /** 用神 — the most beneficial element for the day master */
    yongShen: YongShenDetail;
    /** 喜神 — elements that support the 用神 (generates 用神) */
    xiShen: WuxingDetail[];
    /** 忌神 — elements that harm the 用神 or day master */
    jiShen: WuxingDetail[];
    /** 仇神 — element that controls the 用神 */
    chouShen: WuxingDetail | null;
    /** 闲神 — neutral elements */
    xianShen: Wuxing[];
    /** 调候用神 — climate-driven 用神, if different from primary */
    climateYongShen: WuxingDetail | null;
    /** Step-by-step derivation reasoning */
    analysis: string[];
    /** Human-readable summary */
    summary: string;
}
export interface YongShenDetail {
    wuxing: Wuxing;
    /** Which 十神 this wuxing represents relative to the day master */
    shiShen: string;
    /** Priority: 'primary' = main 用神, 'climate' = 调候用神 */
    priority: 'primary' | 'climate' | 'secondary';
    reason: string;
}
export interface WuxingDetail {
    wuxing: Wuxing;
    reason: string;
}
export declare function deriveYongShen(bazi: BaZi, strength: StrengthResult, structure: StructureResult, climate: ClimateResult): YongShenResult;
//# sourceMappingURL=yongShenEngine.d.ts.map