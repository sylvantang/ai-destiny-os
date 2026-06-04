import type { BirthInfo, DestinyChart } from '../core/astro/types.js';
import type { PromptContext } from '../ai/promptBuilder.js';
import type { PersonalityResult } from '../ai/personality.js';
import type { CareerResult } from '../ai/career.js';
import type { RelationshipResult } from '../ai/relationship.js';
import type { StrategyResult } from '../ai/strategy.js';
export interface DestinedContext {
    chart: DestinyChart;
    ctx: PromptContext;
    personality: PersonalityResult;
    career: CareerResult;
    relationship: RelationshipResult;
    strategy: StrategyResult;
}
export declare function buildDestinyContext(birth: BirthInfo): DestinedContext;
//# sourceMappingURL=context.d.ts.map