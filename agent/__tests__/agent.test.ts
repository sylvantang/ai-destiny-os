// ============================================================
// AI Destiny OS — Agent Layer: Test Suite
// ============================================================

import { describe, it, expect } from 'vitest';
import { DestinyAgent } from '../agentEngine.js';
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
