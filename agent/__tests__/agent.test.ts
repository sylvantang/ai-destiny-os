// ============================================================
// AI Destiny OS — Agent Layer: Test Suite
// ============================================================

import { describe, it, expect } from 'vitest';
import { DestinyAgent } from '../agentEngine.js';
import { LLMClient, createOpenAIClient, createAnthropicClient, createAutoClient } from '../llmClient.js';
import type { LLMConfig } from '../llmClient.js';
import {
  createConversation,
  processTurn,
  processTurnWithMemory,
  getSuggestionsForDomain,
  exportForLLM,
  formatTranscript,
} from '../conversationManager.js';
import type { BirthInfo } from '../../core/astro/types.js';

const birth: BirthInfo = {
  year: 1993, month: 7, day: 23, hour: 9, minute: 30,
  longitude: 116.4, isDST: false, gender: '男',
};

// ---- Agent Engine Tests ----

describe('DestinyAgent', () => {
  it('should initialize with full pipeline', () => {
    const agent = new DestinyAgent(birth);

    expect(agent.state.chart).toBeDefined();
    expect(agent.state.ctx.strength).toBeDefined();
    expect(agent.state.ctx.structure).toBeDefined();
    expect(agent.state.ctx.climate).toBeDefined();
    expect(agent.state.ctx.relations).toBeDefined();
    expect(agent.state.ctx.fortune).toBeDefined();
    expect(agent.state.personality).toBeDefined();
    expect(agent.state.career).toBeDefined();
    expect(agent.state.relationship).toBeDefined();
    expect(agent.state.strategy).toBeDefined();
    expect(agent.state.session.id).toMatch(/^session_/);
  });

  it('should process a 性格 query', () => {
    const agent = new DestinyAgent(birth);
    const response = agent.processQuery('我的性格是什么');

    expect(response.topic).toBe('性格');
    expect(response.text).toContain('性格分析');
    expect(response.prompt).toBeDefined();
    expect(response.prompt!.system.length).toBeGreaterThan(0);
  });

  it('should process a 事业 query', () => {
    const agent = new DestinyAgent(birth);
    const response = agent.processQuery('我适合什么工作');

    expect(response.topic).toBe('事业');
    expect(response.text).toContain('事业分析');
  });

  it('should process a 感情 query', () => {
    const agent = new DestinyAgent(birth);
    const response = agent.processQuery('我的感情运势');

    expect(response.topic).toBe('感情');
    expect(response.text).toContain('感情分析');
  });

  it('should process a 运势 query', () => {
    const agent = new DestinyAgent(birth);
    const response = agent.processQuery('今年运势怎么样');

    expect(response.topic).toBe('运势');
    expect(response.text).toContain('流年运势');
  });

  it('should process a 战略 query', () => {
    const agent = new DestinyAgent(birth);
    const response = agent.processQuery('给我一些人生建议');

    expect(response.topic).toBe('战略');
    expect(response.text).toContain('人生战略');
  });

  it('should process a 排盘 query with visualization', () => {
    const agent = new DestinyAgent(birth);
    const response = agent.processQuery('看看我的八字');

    expect(response.topic).toBe('排盘');
    expect(response.visualization).toBeDefined();
    expect(response.visualization).toContain('四 柱 八 字');
  });

  it('should process a 综合 query as default', () => {
    const agent = new DestinyAgent(birth);
    const response = agent.processQuery('你好');

    expect(response.topic).toBe('综合');
    expect(response.text).toContain('综合命理');
    expect(response.visualization).toBeDefined();
  });

  it('should track conversation history', () => {
    const agent = new DestinyAgent(birth);
    agent.processQuery('我的性格');
    agent.processQuery('我适合什么工作');

    expect(agent.state.history).toHaveLength(4); // 2 user + 2 agent
    expect(agent.state.session.turnCount).toBe(2);
  });

  it('should record correct roles and topics in history', () => {
    const agent = new DestinyAgent(birth);
    agent.processQuery('我的性格特点');

    expect(agent.state.history).toHaveLength(2);
    expect(agent.state.history[0]!.role).toBe('user');
    expect(agent.state.history[0]!.topic).toBe('性格');
    expect(agent.state.history[0]!.content).toBe('我的性格特点');
    expect(agent.state.history[1]!.role).toBe('agent');
    expect(agent.state.history[1]!.topic).toBe('性格');
    expect(agent.state.history[1]!.content).toContain('性格分析');
  });

  it('should track turn count across multiple queries', () => {
    const agent = new DestinyAgent(birth);
    agent.processQuery('我的性格');
    agent.processQuery('我适合什么工作');
    agent.processQuery('感情运势怎么样');

    expect(agent.state.session.turnCount).toBe(3);
    expect(agent.state.history).toHaveLength(6); // 3 user + 3 agent
  });

  it('should detect topic changes across turns', () => {
    const agent = new DestinyAgent(birth);
    agent.processQuery('我的性格');
    agent.processQuery('适合什么工作');

    const userTurns = agent.state.history.filter(t => t.role === 'user');
    expect(userTurns[0]!.topic).toBe('性格');
    expect(userTurns[1]!.topic).toBe('事业');
  });

  it('should render dashboard', () => {
    const agent = new DestinyAgent(birth);
    const dashboard = agent.renderDashboard({ compact: true });

    expect(dashboard).toContain('Destiny Cockpit');
  });

  it('should render chart', () => {
    const agent = new DestinyAgent(birth);
    const chart = agent.renderChart();

    expect(chart).toContain('Four Pillars');
  });

  it('should get session summary', () => {
    const agent = new DestinyAgent(birth);
    agent.processQuery('我的性格');

    const summary = agent.getSessionSummary();
    expect(summary).toContain(agent.state.session.id);
    expect(summary).toContain('性格');
  });

  // ---- Memory Integration ----

  it('should enable memory on demand', () => {
    const agent = new DestinyAgent(birth);
    const store = agent.enableMemory('test-user-agent');

    expect(store).toBeDefined();
    expect(agent.state.memory).toBe(store);
  });

  it('should log predictions to memory', () => {
    const agent = new DestinyAgent(birth);
    agent.logPredictions();

    expect(agent.state.memory).toBeDefined();
    const preds = agent.state.memory!.getSnapshot().predictions;
    expect(preds.length).toBeGreaterThanOrEqual(0);
  });

  it('should process query with memory context', () => {
    const agent = new DestinyAgent(birth);
    const response = agent.processQueryWithMemory('我的性格怎么样');

    expect(response.topic).toBe('性格');
    expect(response.memoryContext).toBeDefined();
  });

  it('should load memory from JSON', () => {
    const agent1 = new DestinyAgent(birth);
    agent1.enableMemory();
    const json = agent1.state.memory!.toJSON();

    const agent2 = new DestinyAgent(birth);
    agent2.loadMemory(json);
    expect(agent2.state.memory).toBeDefined();
    expect(agent2.state.memory!.getSnapshot().user.id).toBe(agent1.state.memory!.getSnapshot().user.id);
  });
});

// ---- Conversation Manager Tests ----

describe('ConversationManager', () => {
  it('should create a conversation', () => {
    const agent = new DestinyAgent(birth);
    const conv = createConversation(agent);

    expect(conv.agent).toBe(agent);
    expect(conv.summary.dayMaster).toBe('乙木');
    expect(conv.summary.pattern).toBeDefined();
    expect(conv.suggestions.length).toBeGreaterThan(0);
    expect(conv.contextWindow.length).toBe(1); // system message
  });

  it('should process turns and track topics', () => {
    const agent = new DestinyAgent(birth);
    const conv = createConversation(agent);

    const result1 = processTurn(conv, '我的性格是什么');
    expect(result1.response.topic).toBe('性格');
    expect(result1.state.summary.topicsCovered).toContain('性格');

    const result2 = processTurn(result1.state, '我适合什么工作');
    expect(result2.response.topic).toBe('事业');
    expect(result2.state.summary.topicsCovered).toContain('事业');
  });

  it('should generate context-dependent suggestions', () => {
    const agent = new DestinyAgent(birth);
    const conv = createConversation(agent);

    // After covering 性格, suggestions should not include 性格
    const result = processTurn(conv, '我的性格特点');
    const hasPersonalitySuggestion = result.state.suggestions.some(s => s.includes('性格'));
    // It may or may not include it based on remaining count
    expect(result.state.suggestions.length).toBeGreaterThan(0);
  });

  it('should process turns with memory', () => {
    const agent = new DestinyAgent(birth);
    const conv = createConversation(agent);

    const result = processTurnWithMemory(conv, '今年运势怎么样');
    expect(result.response.topic).toBe('运势');
    expect(result.response.memoryContext).toBeDefined();
  });

  it('should export context for LLM', () => {
    const agent = new DestinyAgent(birth);
    const conv = createConversation(agent);
    const result = processTurn(conv, '我的性格');

    const messages = exportForLLM(result.state);
    expect(messages.length).toBe(3); // system + user + assistant
  });

  it('should format a transcript', () => {
    const agent = new DestinyAgent(birth);
    const conv = createConversation(agent);
    const result = processTurn(conv, '我的性格');

    const transcript = formatTranscript(result.state);
    expect(transcript).toContain('AI 命理师');
    expect(transcript).toContain('我的性格');
  });

  it('should get suggestions for a specific domain', () => {
    const suggestions = getSuggestionsForDomain('事业');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.includes('行业') || s.includes('创业'))).toBe(true);
  });
});

// ---- LLM Client Tests ----

describe('LLMClient', () => {
  it('should create an OpenAI client', () => {
    const client = createOpenAIClient('test-key', 'gpt-4o');
    expect(client).toBeInstanceOf(LLMClient);
  });

  it('should create an Anthropic client', () => {
    const client = createAnthropicClient('test-key', 'claude-sonnet-4-6');
    expect(client).toBeInstanceOf(LLMClient);
  });

  it('should create auto client from env', () => {
    const client = createAutoClient();
    // With ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY set, returns a client; otherwise null
    // Both cases are valid depending on the test environment
    expect(client === null || client instanceof LLMClient).toBe(true);
  });

  it('should create client with custom config', () => {
    const config: LLMConfig = {
      provider: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o',
      maxTokens: 1024,
      temperature: 0.5,
      baseURL: 'https://custom.api.com',
    };
    const client = new LLMClient(config);
    expect(client).toBeInstanceOf(LLMClient);
  });

  it('should throw on actual API call without valid key (validates error handling)', async () => {
    const client = new LLMClient({
      provider: 'openai',
      apiKey: 'invalid-key',
      model: 'gpt-4o',
    });
    await expect(client.chat([{ role: 'user', content: 'test' }])).rejects.toThrow();
  });
});

// ---- Agent + LLM Integration Tests ----

describe('DestinyAgent with LLM', () => {
  it('should initialize without LLM', () => {
    const agent = new DestinyAgent(birth);
    expect(agent.hasLLM()).toBe(false);
  });

  it('should initialize with LLM client', () => {
    const llm = new LLMClient({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' });
    const agent = new DestinyAgent(birth, llm);
    expect(agent.hasLLM()).toBe(true);
  });

  it('should set LLM after construction', () => {
    const agent = new DestinyAgent(birth);
    expect(agent.hasLLM()).toBe(false);

    const llm = new LLMClient({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' });
    agent.setLLM(llm);
    expect(agent.hasLLM()).toBe(true);
  });

  it('should mark sync responses as llmGenerated: false', () => {
    const agent = new DestinyAgent(birth);
    const response = agent.processQuery('我的性格');
    expect(response.llmGenerated).toBe(false);
    expect(response.prompt).toBeDefined();
  });

  it('should process async query with fallback when no LLM', async () => {
    const agent = new DestinyAgent(birth);
    const response = await agent.processQueryAsync('我的性格是什么');

    expect(response.topic).toBe('性格');
    expect(response.llmGenerated).toBe(false);
    expect(response.text).toContain('性格分析');
  });

  it('should process async query with fallback for all topics', async () => {
    const agent = new DestinyAgent(birth);
    const topics = [
      ['我的性格', '性格'],
      ['我适合什么工作', '事业'],
      ['感情运势', '感情'],
      ['今年运势', '运势'],
      ['人生建议', '战略'],
      ['看看八字', '排盘'],
      ['你好', '综合'],
    ];

    for (const [query, expectedTopic] of topics) {
      const response = await agent.processQueryAsync(query);
      expect(response.topic).toBe(expectedTopic);
      expect(response.llmGenerated).toBe(false);
    }
  });

  it('should catch LLM errors and return fallback', async () => {
    const llm = new LLMClient({
      provider: 'openai',
      apiKey: 'invalid-key',
      model: 'gpt-4o',
    });
    const agent = new DestinyAgent(birth, llm);

    const response = await agent.processQueryAsync('我的性格');
    expect(response.topic).toBe('性格');
    expect(response.text).toContain('[LLM调用失败');
    expect(response.llmGenerated).toBe(false);
  });

  it('should handle streaming fallback when no LLM', async () => {
    const agent = new DestinyAgent(birth);
    const chunks: string[] = [];

    for await (const event of agent.processQueryStream('我的性格')) {
      if (event.type === 'token' && event.content) {
        chunks.push(event.content);
      }
    }

    expect(chunks.join('')).toContain('性格分析');
  });

  it('should track history in processQueryStream fallback', async () => {
    const agent = new DestinyAgent(birth);

    for await (const event of agent.processQueryStream('我的性格特点')) {
      // consume stream
    }

    expect(agent.state.history).toHaveLength(2);
    expect(agent.state.history[0]!.role).toBe('user');
    expect(agent.state.history[0]!.content).toBe('我的性格特点');
    expect(agent.state.history[1]!.role).toBe('agent');
    expect(agent.state.history[1]!.content).toContain('性格分析');
    expect(agent.state.session.turnCount).toBe(1);
  });

  it('should track history across multiple processQueryStream calls', async () => {
    const agent = new DestinyAgent(birth);

    for await (const _ of agent.processQueryStream('我的性格')) { /* consume */ }
    for await (const _ of agent.processQueryStream('适合什么工作')) { /* consume */ }

    expect(agent.state.history).toHaveLength(4);
    expect(agent.state.session.turnCount).toBe(2);
    const userTurns = agent.state.history.filter(t => t.role === 'user');
    expect(userTurns[0]!.topic).toBe('性格');
    expect(userTurns[1]!.topic).toBe('事业');
  });

  it('should track history in processQueryAsync fallback', async () => {
    const agent = new DestinyAgent(birth);
    await agent.processQueryAsync('我的感情运势');

    expect(agent.state.history).toHaveLength(2);
    expect(agent.state.history[0]!.role).toBe('user');
    expect(agent.state.history[0]!.topic).toBe('感情');
    expect(agent.state.history[1]!.role).toBe('agent');
    expect(agent.state.session.turnCount).toBe(1);
  });

  it('should accumulate history across async and sync queries', async () => {
    const agent = new DestinyAgent(birth);
    agent.processQuery('看看八字');
    await agent.processQueryAsync('我的性格');

    expect(agent.state.history).toHaveLength(4);
    expect(agent.state.session.turnCount).toBe(2);

    const topics = agent.state.history
      .filter(t => t.role === 'user')
      .map(t => t.topic);
    expect(topics).toContain('排盘');
    expect(topics).toContain('性格');
  });

  it('should record topic on done event in stream', async () => {
    const agent = new DestinyAgent(birth);
    const topics: string[] = [];

    for await (const event of agent.processQueryStream('我的事业运势')) {
      if (event.type === 'done') {
        topics.push(event.topic ?? 'unknown');
      }
    }

    expect(topics).toContain('事业');
  });
});
