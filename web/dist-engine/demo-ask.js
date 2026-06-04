import { DestinyAgent } from './agent/agentEngine.js';
// Replace with your own birth info
const birth = {
    year: 1993, month: 7, day: 23, hour: 9, minute: 30,
    longitude: 116.4, isDST: false, gender: '男',
};
import { LLMClient } from './agent/llmClient.js';
const apiKey = process.env['ANTHROPIC_AUTH_TOKEN'] || process.env['ANTHROPIC_API_KEY'];
if (!apiKey) {
    console.error('No API key found. Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN.');
    process.exit(1);
}
const llm = new LLMClient({
    provider: 'anthropic',
    apiKey,
    model: process.env['ANTHROPIC_MODEL'] || 'claude-sonnet-4-6',
    baseURL: process.env['ANTHROPIC_BASE_URL'],
    maxTokens: 8192,
});
const agent = new DestinyAgent(birth, llm);
// Show the chart
console.log(agent.renderChart());
const question = process.argv[2] || '我适合创业还是打工？请结合命盘详细分析。';
console.log('\nQ: ' + question + '\n');
const response = await agent.processQueryAsync(question);
console.log(response.text);
if (response.usage) {
    console.log(`\n[Tokens: ${response.usage.inputTokens} in / ${response.usage.outputTokens} out]`);
}
//# sourceMappingURL=demo-ask.js.map