import type { DestinyChart } from '../../core/astro/types.js';
import type { PromptContext } from '../../ai/promptBuilder.js';
import type { PersonalityResult } from '../../ai/personality.js';
import type { CareerResult } from '../../ai/career.js';
import type { RelationshipResult } from '../../ai/relationship.js';
import type { StrategyResult } from '../../ai/strategy.js';
import type { MemoryStore } from '../../memory/memoryStore.js';
export interface ToolContext {
    chart: DestinyChart;
    ctx: PromptContext;
    personality: PersonalityResult;
    career: CareerResult;
    relationship: RelationshipResult;
    strategy: StrategyResult;
    memory: MemoryStore | null;
    history: Array<{
        role: 'user' | 'agent';
        content: string;
    }>;
}
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, {
            type: string;
            description: string;
            enum?: string[];
        }>;
        required: string[];
    };
    execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}
export interface ToolResult {
    content: string;
    data?: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map