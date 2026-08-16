// ============================================================
// AI Destiny OS — Memory Layer: Alerts & Event Context Tests (P2)
// ============================================================

import { describe, it, expect } from 'vitest';
import { generateChart, calcLiuNian } from '../../core/astro/index.js';
import type { BirthInfo } from '../../core/astro/types.js';
import { SEXAGENARY_NAMES } from '../../core/astro/constants.js';
import { checkLifeAlerts, formatAlerts } from '../alerts.js';
import { computeEventContext, addEventWithContext } from '../eventContext.js';
import { MemoryStore } from '../memoryStore.js';

// 奥运案例：2008-08-08 20:00 北京 → 戊子 庚申 庚辰 丙戌
const birth: BirthInfo = {
  year: 2008, month: 8, day: 8, hour: 20, minute: 0,
  longitude: 116.4, isDST: false, gender: '男',
};

describe('P2 — 流年预警 checkLifeAlerts', () => {
  it('2030 庚戌年流年支戌冲日支辰 → 预警', () => {
    const chart = generateChart(birth);
    const alerts = checkLifeAlerts(chart, 2030, 2030);
    const clash = alerts.find((a) => a.title.includes('冲日支'));
    expect(clash).toBeDefined();
    expect(clash!.level).toBe('warn');
    expect(clash!.title).toContain('2030');
    expect(clash!.title).toContain('庚戌');
  });

  it('2060 庚辰年与日柱伏吟 → 预警', () => {
    const chart = generateChart(birth);
    const alerts = checkLifeAlerts(chart, 2060, 2060);
    const fuyin = alerts.find((a) => a.title.includes('伏吟'));
    expect(fuyin).toBeDefined();
    expect(fuyin!.level).toBe('warn');
  });

  it('2026 丙午年天干丙为日主庚之七杀 → 提示', () => {
    const chart = generateChart(birth);
    const alerts = checkLifeAlerts(chart, 2026, 2026);
    const qisha = alerts.find((a) => a.title.includes('七杀'));
    expect(qisha).toBeDefined();
  });

  it('平稳年份（如 2027 丁未）不应有冲日支/伏吟预警', () => {
    const chart = generateChart(birth);
    const alerts = checkLifeAlerts(chart, 2027, 2027);
    expect(alerts.find((a) => a.title.includes('冲日支'))).toBeUndefined();
    expect(alerts.find((a) => a.title.includes('伏吟'))).toBeUndefined();
  });

  it('formatAlerts 输出包含标题与详情', () => {
    const chart = generateChart(birth);
    const text = formatAlerts(checkLifeAlerts(chart, 2030, 2030));
    expect(text).toContain('2030');
    expect(text).toContain('相冲');
  });
});

describe('P2 — 事件与大运/流年关联 computeEventContext', () => {
  it('2026 年事件 → 流年丙午', () => {
    const ctx = computeEventContext(birth, '2026-06-01T12:00:00+08:00');
    expect(ctx.yearPillar).toBe('丙午');
  });

  it('事件年龄 = 事件日期 − 出生日期', () => {
    const ctx = computeEventContext(birth, '2026-08-08T12:00:00+08:00');
    expect(ctx.ageAtEvent).toBeCloseTo(18, 0);
  });

  it('大运：2026 年（18 岁）仍在第一步大运辛酉（2018–2028）', () => {
    const ctx = computeEventContext(birth, '2026-08-08T12:00:00+08:00');
    expect(ctx.dayunAtTime).toBe('辛酉');
  });

  it('addEventWithContext 自动填充 yearPillar / dayunAtTime', () => {
    const store = new MemoryStore('test-user', birth);
    const event = addEventWithContext(store, birth, {
      date: '2030-03-01T08:00:00+08:00',
      domain: '事业',
      title: '换工作',
      description: '',
      impact: 2,
      relatedPredictionIds: [],
      notes: '',
      tags: [],
    });
    expect(event.yearPillar).toBe('庚戌');
    expect(event.dayunAtTime).toBe('壬戌');
    expect(store.getEvents().length).toBe(1);
  });
});

describe('P2 — 流年序列一致性', () => {
  it('calcLiuNian 给出的 2030 流年干支应为庚戌', () => {
    const chart = generateChart(birth);
    const ln = calcLiuNian(chart.bazi, 2030, 2030)[0]!;
    expect(SEXAGENARY_NAMES[ln.pillar.sexagenaryIndex]).toBe('庚戌');
  });
});
