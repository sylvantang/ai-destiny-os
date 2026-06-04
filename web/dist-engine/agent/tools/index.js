// ============================================================
// AI Destiny OS — Agent Layer: Tool Registry
// ============================================================
import { calculateChartTool } from './calculateChart.js';
import { compareChartsTool } from './compareCharts.js';
import { searchMemoryTool } from './searchMemory.js';
import { getCurrentContextTool } from './getCurrentContext.js';
/** Registry of all available tools. */
export const toolRegistry = new Map([
    [calculateChartTool.name, calculateChartTool],
    [compareChartsTool.name, compareChartsTool],
    [searchMemoryTool.name, searchMemoryTool],
    [getCurrentContextTool.name, getCurrentContextTool],
]);
/** Get a tool by name. */
export function getTool(name) {
    return toolRegistry.get(name);
}
/** List all registered tool names. */
export function listToolNames() {
    return [...toolRegistry.keys()];
}
/**
 * Execute a tool by name.
 * Returns null if the tool doesn't exist.
 */
export async function executeTool(name, params, context) {
    const tool = toolRegistry.get(name);
    if (!tool)
        return null;
    return tool.execute(params, context);
}
/** Serialize all tools to OpenAI function-calling format. */
export function toolsToOpenAIFormat() {
    return [...toolRegistry.values()].map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
        },
    }));
}
//# sourceMappingURL=index.js.map