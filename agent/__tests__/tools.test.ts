// ============================================================
// AI Destiny OS — Agent Layer: Router & Tools Test Suite
// ============================================================

import { describe, it, expect } from 'vitest';
import { detectTopic } from '../router.js';
import {
  toolRegistry,
  getTool,
  listToolNames,
  executeTool,
  toolsToOpenAIFormat,
} from '../tools/index.js';
import type { ToolContext } from '../tools/types.js';
import { calcBaZi } from '../../core/astro/bazi.js';
import { buildDestinyContext } from '../context.js';
import type { BirthInfo } from '../../core/astro/types.js';

// Test birth: 1993-07-23 09:30 Beijing Male
const birth: BirthInfo = {
  year: 1993, month: 7, day: 23, hour: 9, minute: 30,
  longitude: 116.4, isDST: false, gender: '男',
};

function makeToolContext(birthInfo: BirthInfo = birth): ToolContext {
  const dc = buildDestinyContext(birthInfo);
  return {
    chart: dc.chart,
    ctx: dc.ctx,
    personality: dc.personality,
    career: dc.career,
    relationship: dc.relationship,
    strategy: dc.strategy,
    memory: null,
    history: [],
  };
}

// ---- Router Tests ----

describe('Router (Topic Detection)', () => {
  it('should detect 性格 topic', () => {
    expect(detectTopic('我的性格怎么样')).toBe('性格');
    expect(detectTopic('我是什么样的人')).toBe('性格');
  });

  it('should detect 事业 topic', () => {
    expect(detectTopic('我适合什么工作')).toBe('事业');
    expect(detectTopic('想创业')).toBe('事业');
    expect(detectTopic('什么时候跳槽好')).toBe('事业');
  });

  it('should detect 感情 topic', () => {
    expect(detectTopic('我的感情运势')).toBe('感情');
    expect(detectTopic('什么时候能脱单')).toBe('感情');
    expect(detectTopic('桃花运如何')).toBe('感情');
  });

  it('should detect 运势 topic', () => {
    expect(detectTopic('今年运势')).toBe('运势');
    expect(detectTopic('财运怎么样')).toBe('运势');
  });

  it('should detect 战略 topic', () => {
    expect(detectTopic('我应该怎么规划')).toBe('战略');
    expect(detectTopic('给个建议')).toBe('战略');
  });

  it('should detect 排盘 topic', () => {
    expect(detectTopic('查看排盘')).toBe('排盘');
    expect(detectTopic('八字')).toBe('排盘');
  });

  it('should fallback to 综合 for unrecognized input', () => {
    expect(detectTopic('你好')).toBe('综合');
    expect(detectTopic('今天天气怎么样')).toBe('综合');
  });
});

// ---- Tool Registry Tests ----

describe('Tool Registry', () => {
  it('should register all 4 tools', () => {
    const names = listToolNames();
    expect(names).toContain('calculate_chart');
    expect(names).toContain('compare_charts');
    expect(names).toContain('search_memory');
    expect(names).toContain('get_current_context');
    expect(names.length).toBe(4);
  });

  it('should retrieve tool by name', () => {
    const tool = getTool('calculate_chart');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('calculate_chart');
    expect(tool!.description.length).toBeGreaterThan(0);
    expect(tool!.parameters.type).toBe('object');
  });

  it('should return undefined for unknown tool', () => {
    expect(getTool('nonexistent')).toBeUndefined();
  });

  it('should serialize to OpenAI function-calling format', () => {
    const functions = toolsToOpenAIFormat();
    expect(functions.length).toBe(4);
    for (const fn of functions) {
      expect(fn.type).toBe('function');
      expect(fn.function.name).toBeDefined();
      expect(fn.function.description).toBeDefined();
      expect(fn.function.parameters.type).toBe('object');
    }
  });

  it('should execute unknown tool returning null', async () => {
    const ctx = makeToolContext();
    const result = await executeTool('nonexistent', {}, ctx);
    expect(result).toBeNull();
  });
});

// ---- calculate_chart Tool Tests ----

describe('calculate_chart Tool', () => {
  it('should return chart visualization and data', async () => {
    const ctx = makeToolContext();
    const result = await executeTool('calculate_chart', {
      year: 2000, month: 1, day: 1, hour: 12,
    }, ctx);

    expect(result).not.toBeNull();
    expect(result!.content.length).toBeGreaterThan(0);
    expect(result!.data).toBeDefined();
    expect(result!.data!.chart).toBeDefined();
    expect(result!.data!.strength).toBeDefined();
    expect(result!.data!.structure).toBeDefined();
    expect(result!.data!.yongShen).toBeDefined();
  });

  it('should use defaults for minute, longitude, gender', async () => {
    const ctx = makeToolContext();
    const result = await executeTool('calculate_chart', {
      year: 2000, month: 6, day: 15, hour: 8,
    }, ctx);

    expect(result).not.toBeNull();
    expect(result!.content).toContain('Day Master');
  });
});

// ---- compare_charts Tool Tests ----

describe('compare_charts Tool', () => {
  it('should produce comparison with both day masters', async () => {
    const ctx = makeToolContext();
    const result = await executeTool('compare_charts', {
      otherYear: 2000, otherMonth: 6, otherDay: 15, otherHour: 12,
    }, ctx);

    expect(result).not.toBeNull();
    expect(result!.content).toContain('日主对比');
    expect(result!.content).toContain('格局对比');
    expect(result!.content).toContain('用神对比');
    expect(result!.content).toContain('运势对比');
    expect(result!.data).toBeDefined();
    expect(result!.data!.self).toBeDefined();
    expect(result!.data!.other).toBeDefined();
  });

  it('should produce different outputs for different births', async () => {
    const ctx = makeToolContext();
    const r1 = await executeTool('compare_charts', {
      otherYear: 1990, otherMonth: 1, otherDay: 15, otherHour: 6,
    }, ctx);
    const r2 = await executeTool('compare_charts', {
      otherYear: 2000, otherMonth: 7, otherDay: 20, otherHour: 18,
    }, ctx);

    // At minimum, the other data should differ
    expect(r1!.data!.other).not.toEqual(r2!.data!.other);
  });
});

// ---- search_memory Tool Tests ----

describe('search_memory Tool', () => {
  it('should report memory not enabled when no memory store', async () => {
    const ctx = makeToolContext();
    const result = await executeTool('search_memory', {
      query: '事业',
    }, ctx);

    expect(result).not.toBeNull();
    expect(result!.content).toContain('尚未启用');
  });

  it('should search with memory store present', async () => {
    const { MemoryStore } = await import('../../memory/memoryStore.js');
    const ctx = makeToolContext();
    ctx.memory = new MemoryStore('test-user', birth);

    // Add a test event
    ctx.memory.addEvent({
      date: '2024-06-15',
      domain: '事业',
      description: '换工作，加入科技公司',
      impact: 7,
    });

    const result = await executeTool('search_memory', {
      query: '事业',
    }, ctx);

    expect(result).not.toBeNull();
    expect(result!.content).toContain('历史事件');
    expect(result!.content).toContain('换工作');
  });
});

// ---- get_current_context Tool Tests ----

describe('get_current_context Tool', () => {
  it('should return current analysis summary with all key sections', async () => {
    const ctx = makeToolContext();
    const result = await executeTool('get_current_context', {}, ctx);

    expect(result).not.toBeNull();
    expect(result!.content).toContain('日主');
    expect(result!.content).toContain('旺衰');
    expect(result!.content).toContain('格局');
    expect(result!.content).toContain('用神');
    expect(result!.content).toContain('喜神');
    expect(result!.content).toContain('忌神');
    expect(result!.content).toContain('运势');
    expect(result!.data).toBeDefined();
  });

  it('should include test chart specific info', async () => {
    const ctx = makeToolContext();
    const result = await executeTool('get_current_context', {}, ctx);

    // Test chart is 乙木日主 born 1993-07-23
    expect(result!.content).toContain('乙');
    expect(result!.content).toContain('木');
  });
});
