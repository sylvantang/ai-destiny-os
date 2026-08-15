import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools.js';
const server = new Server({ name: 'bazi-mcp', version: '0.1.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) }));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = tools.find(t => t.name === req.params.name);
    if (!tool)
        throw new Error(`Unknown tool: ${req.params.name}`);
    try {
        return await tool.handler(req.params.arguments);
    }
    catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
