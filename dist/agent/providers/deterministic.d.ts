import type { DestinyChart } from '../../core/astro/types.js';
import type { QueryDomain, AgentResponse } from '../agentEngine.js';
import type { ProviderState, ResponseProvider } from './types.js';
export declare class DeterministicProvider implements ResponseProvider {
    readonly name = "deterministic";
    respond(topic: QueryDomain, state: ProviderState, chart: DestinyChart, _prompt?: import('../../ai/promptBuilder.js').AIPrompt | null): AgentResponse;
}
//# sourceMappingURL=deterministic.d.ts.map