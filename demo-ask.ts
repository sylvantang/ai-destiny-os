import { DestinyAgent } from './agent/agentEngine.js';
import { createAutoClient } from './agent/llmClient.js';

const birth = {
  year: 1993, month: 7, day: 23, hour: 9, minute: 30,
  longitude: 116.4, isDST: false, gender: '男' as const,
};

const llm = createAutoClient()!;
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
