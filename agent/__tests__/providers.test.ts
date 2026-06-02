// ============================================================
// AI Destiny OS — Agent Layer: Provider Tests
// Tests the LLMProvider agentic loop with mock tool calls.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { LLMProvider } from '../providers/llmProvider.js';
import { DeterministicProvider } from '../providers/deterministic.js';
import { LLMClient, type ChatMessage, type LLMResponse, type ToolCall } from '../llmClient.js';
import { buildDestinyContext } from '../context.js';
import type { ProviderState } from '../providers/types.js';
import type { ToolContext, ToolResult } from '../tools/types.js';
import { toolRegistry } from '../tools/index.js';
import type { BirthInfo } from '../../core/astro/types.js';

// ---- Test Data ----

const birth: BirthInfo = {
  year: 1993, month: 7, day: 23, hour: 9, minute: 30,
  longitude: 116.4, isDST: false, gender: '男',
};

function makeProviderState(): { state: ProviderState; toolCtx: ToolContext } {
  const dc = buildDestinyContext(birth);
  const state: ProviderState = {
    chart: dc.chart,
    ctx: dc.ctx,
    personality: dc.personality,
    career: dc.career,
    relationship: dc.relationship,
    strategy: dc.strategy,
  };
  const toolCtx: ToolContext = {
    ...state,
    memory: null,
    history: [],
  };
  return { state, toolCtx };
}

const samplePrompt = {
  system: 'You are a helpful assistant.',
  user: '帮我排盘',
  data: {},
};

// ---- Mock LLM Client ----

/**
 * A mock LLM client that returns predefined responses.
 * Allows testing the agentic loop without real API calls.
 */
class MockLLMClient extends LLMClient {
  private responses: LLMResponse[];
  private callCount = 0;
  public lastMessages: ChatMessage[][] = [];
  public lastTools: unknown[][] = [];

  constructor(responses: LLMResponse[]) {
    super({ provider: 'openai', apiKey: 'mock-key', model: 'mock-model' });
    this.responses = responses;
  }

  override async chat(messages: ChatMessage[], tools?: unknown[]): Promise<LLMResponse> {
    this.lastMessages.push([...messages]);
    this.lastTools.push(tools ?? []);
    const resp = this.responses[this.callCount] ?? {
      content: 'fallback response',
      model: 'mock',
    };
    this.callCount++;
    return resp;
  }
}

// ---- Helpers ----

function makeToolCall(name: string, args: Record<string, unknown>, id?: string): ToolCall {
  return {
    id: id ?? `call_${name}_1`,
    type: 'function',
    function: {
      name,
      arguments: JSON.stringify(args),
    },
  };
}

// ---- Deterministic Provider Tests ----

describe('DeterministicProvider', () => {
  it('should return personality prose for 性格 topic', () => {
    const provider = new DeterministicProvider();
    const { state } = makeProviderState();
    const response = provider.respond('性格', state, state.chart);

    expect(response.topic).toBe('性格');
    expect(response.llmGenerated).toBe(false);
    expect(response.text).toContain('日主');
    expect(response.text.length).toBeGreaterThan(100);
  });

  it('should return career prose for 事业 topic', () => {
    const provider = new DeterministicProvider();
    const { state } = makeProviderState();
    const response = provider.respond('事业', state, state.chart);

    expect(response.topic).toBe('事业');
    expect(response.text).toContain('核心竞争力');
  });

  it('should return chart visualization for 排盘 topic', () => {
    const provider = new DeterministicProvider();
    const { state } = makeProviderState();
    const response = provider.respond('排盘', state, state.chart);

    expect(response.topic).toBe('排盘');
    expect(response.visualization).toBeDefined();
    expect(response.visualization).toContain('Day Master');
  });
});

// ---- LLMProvider Agentic Loop Tests ----

describe('LLMProvider — Agentic Loop', () => {
  it('should return LLM text when no tool calls are requested', async () => {
    const mockClient = new MockLLMClient([
      { content: '你好，这是你的命理分析。', model: 'mock', finishReason: 'stop' },
    ]);
    const { state, toolCtx } = makeProviderState();
    const provider = new LLMProvider(mockClient, toolCtx);

    const response = await provider.respondAsync('综合', state, state.chart, samplePrompt, [], null);

    expect(response.text).toBe('你好，这是你的命理分析。');
    expect(response.llmGenerated).toBe(true);
    expect(mockClient.lastMessages.length).toBe(1);
  });

  it('should execute a single tool call and re-call LLM for final response', async () => {
    const mockClient = new MockLLMClient([
      {
        content: null,
        model: 'mock',
        finishReason: 'tool_calls',
        toolCalls: [makeToolCall('get_current_context', {})],
      },
      {
        content: '根据你的命盘，乙木日主有这些特点...',
        model: 'mock',
        finishReason: 'stop',
      },
    ]);
    const { state, toolCtx } = makeProviderState();
    const provider = new LLMProvider(mockClient, toolCtx);

    const response = await provider.respondAsync('综合', state, state.chart, samplePrompt, [], null);

    // Should return the second LLM response after tool execution
    expect(response.text).toBe('根据你的命盘，乙木日主有这些特点...');
    expect(response.llmGenerated).toBe(true);

    // Should have made 2 LLM calls
    expect(mockClient.lastMessages.length).toBe(2);

    // First call should include tools
    expect(mockClient.lastTools[0]!.length).toBeGreaterThan(0);

    // Second call's messages should include tool results
    const secondMsgs = mockClient.lastMessages[1]!;
    const toolMessages = secondMsgs.filter(m => m.role === 'tool');
    expect(toolMessages.length).toBe(1);
    expect(toolMessages[0]!.tool_call_id).toBe('call_get_current_context_1');
    expect(toolMessages[0]!.content).toContain('日主');

    // Second call should also include an assistant message with tool_calls
    const assistantMsgs = secondMsgs.filter(m => m.role === 'assistant' && m.tool_calls);
    expect(assistantMsgs.length).toBe(1);
  });

  it('should execute multiple tools in sequence and loop', async () => {
    const mockClient = new MockLLMClient([
      {
        content: null,
        model: 'mock',
        finishReason: 'tool_calls',
        toolCalls: [
          makeToolCall('get_current_context', {}, 'call_ctx_1'),
          makeToolCall('calculate_chart', { year: 1993, month: 7, day: 23, hour: 9 }, 'call_chart_1'),
        ],
      },
      {
        content: '综合来看，你的命局特点是...',
        model: 'mock',
        finishReason: 'stop',
      },
    ]);
    const { state, toolCtx } = makeProviderState();
    const provider = new LLMProvider(mockClient, toolCtx);

    const response = await provider.respondAsync('综合', state, state.chart, samplePrompt, [], null);

    expect(response.text).toBe('综合来看，你的命局特点是...');
    expect(response.llmGenerated).toBe(true);
    expect(mockClient.lastMessages.length).toBe(2);

    // Should have 2 tool result messages in the second call
    const secondMsgs = mockClient.lastMessages[1]!;
    const toolResults = secondMsgs.filter(m => m.role === 'tool');
    expect(toolResults.length).toBe(2);
  });

  it('should handle tool execution errors gracefully', async () => {
    const mockClient = new MockLLMClient([
      {
        content: null,
        model: 'mock',
        finishReason: 'tool_calls',
        toolCalls: [makeToolCall('nonexistent_tool', {})],
      },
      {
        content: '抱歉，我无法完成那个操作。',
        model: 'mock',
        finishReason: 'stop',
      },
    ]);
    const { state, toolCtx } = makeProviderState();
    const provider = new LLMProvider(mockClient, toolCtx);

    const response = await provider.respondAsync('综合', state, state.chart, samplePrompt, [], null);

    expect(response.text).toBe('抱歉，我无法完成那个操作。');

    // Check the error message was passed to the LLM
    const secondMsgs = mockClient.lastMessages[1]!;
    const toolMsg = secondMsgs.find(m => m.role === 'tool');
    expect(toolMsg).toBeDefined();
    expect(toolMsg!.content).toContain('未找到');
  });

  it('should not pass tools when no toolContext is set', async () => {
    const mockClient = new MockLLMClient([
      { content: '没有工具可用的回复。', model: 'mock', finishReason: 'stop' },
    ]);
    const { state } = makeProviderState();
    // Create provider WITHOUT tool context
    const provider = new LLMProvider(mockClient);

    await provider.respondAsync('综合', state, state.chart, samplePrompt, [], null);

    // Should not have passed tools to the LLM
    expect(mockClient.lastTools[0]!.length).toBe(0);
  });

  it('should enforce max iterations and fall back to deterministic', async () => {
    // LLM keeps requesting tool calls forever → should stop after MAX_TOOL_ITERATIONS
    const responses = Array.from({ length: 10 }, () => ({
      content: null,
      model: 'mock',
      finishReason: 'tool_calls' as const,
      toolCalls: [makeToolCall('get_current_context', {})],
    }));
    const mockClient = new MockLLMClient(responses);
    const { state, toolCtx } = makeProviderState();
    const provider = new LLMProvider(mockClient, toolCtx);

    const response = await provider.respondAsync('综合', state, state.chart, samplePrompt, [], null);

    // Should have stopped after 3 iterations (MAX_TOOL_ITERATIONS)
    expect(mockClient.lastMessages.length).toBeLessThanOrEqual(3);
    // Should fallback to deterministic
    expect(response.llmGenerated).toBe(false);
  });

  it('should accumulate usage across tool call iterations', async () => {
    const mockClient = new MockLLMClient([
      {
        content: null,
        model: 'mock',
        finishReason: 'tool_calls',
        toolCalls: [makeToolCall('get_current_context', {})],
        usage: { inputTokens: 100, outputTokens: 50 },
      },
      {
        content: '最终分析结果。',
        model: 'mock',
        finishReason: 'stop',
        usage: { inputTokens: 200, outputTokens: 80 },
      },
    ]);
    const { state, toolCtx } = makeProviderState();
    const provider = new LLMProvider(mockClient, toolCtx);

    const response = await provider.respondAsync('综合', state, state.chart, samplePrompt, [], null);

    expect(response.usage).toEqual({ inputTokens: 300, outputTokens: 130 });
  });
});

// ---- LLMProvider — Streaming Tests ----

describe('LLMProvider — Stream with Tool Resolution', () => {
  it('should stream final text after resolving tool calls', async () => {
    // resolveToolCallsNonStreaming makes 2 chat() calls:
    //   Call 1: returns tool_calls → executes tool → appends results
    //   Call 2: re-calls LLM with tool results → returns final content (no tool_calls)
    const mockClient = new MockLLMClient([
      {
        content: null,
        model: 'mock',
        finishReason: 'tool_calls',
        toolCalls: [makeToolCall('get_current_context', {})],
      },
      {
        content: 'resolved — no more tools',
        model: 'mock',
        finishReason: 'stop',
      },
    ]);

    // Spy on stream() for the final streaming call (after tool resolution).
    const streamSpy = vi.spyOn(mockClient, 'stream').mockImplementation(async function* () {
      yield { type: 'token', content: '根据你的' };
      yield { type: 'token', content: '命盘分析' };
      yield { type: 'done' };
    });

    const { state, toolCtx } = makeProviderState();
    const provider = new LLMProvider(mockClient, toolCtx);

    const events: Array<{ type: string; content?: string }> = [];
    for await (const evt of provider.respondStream('综合', state, state.chart, samplePrompt, [], null)) {
      events.push({ type: evt.type, content: evt.content });
    }

    // Should have streamed the final response
    const tokens = events.filter(e => e.type === 'token');
    expect(tokens.length).toBe(2);
    expect(tokens.map(t => t.content).join('')).toBe('根据你的命盘分析');

    // resolveToolCallsNonStreaming: 1st call gets tool_calls, 2nd call confirms no more tools
    expect(mockClient.lastMessages.length).toBe(2);

    streamSpy.mockRestore();
  });
});

// ---- Tool Registry Integration ----

describe('Tool Registry Integration', () => {
  it('should execute calculate_chart via the agentic loop', async () => {
    const mockClient = new MockLLMClient([
      {
        content: null,
        model: 'mock',
        finishReason: 'tool_calls',
        toolCalls: [makeToolCall('calculate_chart', {
          year: 1993, month: 7, day: 23, hour: 9,
        })],
      },
      {
        content: '四柱排盘结果已显示，乙木日主坐巳火...',
        model: 'mock',
        finishReason: 'stop',
      },
    ]);
    const { state, toolCtx } = makeProviderState();
    const provider = new LLMProvider(mockClient, toolCtx);

    const response = await provider.respondAsync('综合', state, state.chart, samplePrompt, [], null);

    expect(response.text).toBe('四柱排盘结果已显示，乙木日主坐巳火...');

    // Check the tool result was injected into the conversation
    const secondMsgs = mockClient.lastMessages[1]!;
    const toolMsg = secondMsgs.find(m => m.role === 'tool');
    expect(toolMsg!.content).toContain('Day Master');
    expect(toolMsg!.content).toContain('乙');
  });

  it('should execute get_current_context via the agentic loop', async () => {
    const mockClient = new MockLLMClient([
      {
        content: null,
        model: 'mock',
        finishReason: 'tool_calls',
        toolCalls: [makeToolCall('get_current_context', {})],
      },
      {
        content: '你的日主乙木，当前运势上升期...',
        model: 'mock',
        finishReason: 'stop',
      },
    ]);
    const { state, toolCtx } = makeProviderState();
    const provider = new LLMProvider(mockClient, toolCtx);

    const response = await provider.respondAsync('综合', state, state.chart, samplePrompt, [], null);

    const secondMsgs = mockClient.lastMessages[1]!;
    const toolMsg = secondMsgs.find(m => m.role === 'tool');
    expect(toolMsg!.content).toContain('日主');
    expect(toolMsg!.content).toContain('乙木');
  });
});
