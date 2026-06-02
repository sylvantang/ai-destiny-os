// ============================================================
// AI Destiny OS — Agent Layer: Tool Registry
// ============================================================

import type { ToolDefinition, ToolContext, ToolResult } from './types.js';
import { calculateChartTool } from './calculateChart.js';
import { compareChartsTool } from './compareCharts.js';
import { searchMemoryTool } from './searchMemory.js';
import { getCurrentContextTool } from './getCurrentContext.js';

export type { ToolDefinition, ToolContext, ToolResult } from './types.js';

/** Registry of all available tools. */
export const toolRegistry = new Map<string, ToolDefinition>([
  [calculateChartTool.name, calculateChartTool],
  [compareChartsTool.name, compareChartsTool],
  [searchMemoryTool.name, searchMemoryTool],
  [getCurrentContextTool.name, getCurrentContextTool],
]);

/** Get a tool by name. */
export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name);
}

/** List all registered tool names. */
export function listToolNames(): string[] {
  return [...toolRegistry.keys()];
}

/**
 * Execute a tool by name.
 * Returns null if the tool doesn't exist.
 */
export async function executeTool(
  name: string,
  params: Record<string, unknown>,
  context: ToolContext,
): Promise<ToolResult | null> {
  const tool = toolRegistry.get(name);
  if (!tool) return null;
  return tool.execute(params, context);
}

/** Serialize all tools to OpenAI function-calling format. */
export function toolsToOpenAIFormat(): Array<{
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
}> {
  return [...toolRegistry.values()].map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
