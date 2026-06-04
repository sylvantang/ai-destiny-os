import type { ToolDefinition, ToolContext, ToolResult } from './types.js';
export type { ToolDefinition, ToolContext, ToolResult } from './types.js';
/** Registry of all available tools. */
export declare const toolRegistry: Map<string, ToolDefinition>;
/** Get a tool by name. */
export declare function getTool(name: string): ToolDefinition | undefined;
/** List all registered tool names. */
export declare function listToolNames(): string[];
/**
 * Execute a tool by name.
 * Returns null if the tool doesn't exist.
 */
export declare function executeTool(name: string, params: Record<string, unknown>, context: ToolContext): Promise<ToolResult | null>;
/** Serialize all tools to OpenAI function-calling format. */
export declare function toolsToOpenAIFormat(): Array<{
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, unknown>;
            required: string[];
        };
    };
}>;
//# sourceMappingURL=index.d.ts.map