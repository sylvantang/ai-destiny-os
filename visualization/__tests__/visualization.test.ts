// ============================================================
// AI Destiny OS — Visualization Layer: Test Suite
// ============================================================

import { describe, it, expect } from 'vitest';
import { calcBaZi, generateChart } from '../../core/astro/bazi.js';
import { calcDaYun } from '../../core/astro/dayun.js';
import { calcLiuNian } from '../../core/astro/liunian.js';
import { analyzeStrength } from '../../core/destiny/strengthEngine.js';
import { analyzeStructure } from '../../core/destiny/structureEngine.js';
import { analyzeClimate } from '../../core/destiny/climateEngine.js';
import { analyzeRelations } from '../../core/destiny/relationEngine.js';
import { analyzeFortune } from '../../core/destiny/fortuneEngine.js';
import { MemoryStore } from '../../memory/memoryStore.js';
import { trackEvent } from '../../memory/eventTracker.js';
import { logPrediction, verifyPrediction } from '../../memory/predictionTracker.js';
import type { BirthInfo } from '../../core/astro/types.js';
import {
  renderChart,
  renderChartSummary,
  renderChartPlain,
  colorWx,
} from '../chartRenderer.js';
import { renderDashboard } from '../dashboard.js';
import {
  renderFortuneTimeline,
  renderDayunCycles,
  renderLifePeriods,
  renderYearCard,
} from '../fortuneTimeline.js';
import {
  renderLifeTimeline,
  renderAccuracyReport,
  renderPatterns,
  renderEventsByDomain,
  renderPendingVerifications,
  renderMemoryViews,
} from '../memoryViews.js';

// Test chart: 1993-07-23 09:30 Beijing Male
const birth: BirthInfo = {
  year: 1993, month: 7, day: 23, hour: 9, minute: 30,
  longitude: 116.4, isDST: false, gender: '男',
};

const bazi = calcBaZi(birth);
const chart = generateChart(birth);
const dayun = calcDaYun(birth, bazi.month, bazi.year.stemIndex, bazi.day.stemIndex);
const liunian = calcLiuNian(bazi, 2024, 2029);
const strength = analyzeStrength(bazi);
const structure = analyzeStructure(bazi, strength);
const climate = analyzeClimate(bazi);
const relations = analyzeRelations(bazi);
const fortune = analyzeFortune(bazi, strength, structure, climate, relations, dayun, liunian);

function createTestStore(): MemoryStore {
  const store = new MemoryStore('test-viz', birth);
  trackEvent(store, { date: '2024-01-15', domain: '事业', title: '晋升', description: '升职', impact: 5 });
  trackEvent(store, { date: '2024-06-20', domain: '财富', title: '投资获利', description: '', impact: 4 });
  const pred = logPrediction(store, { targetYear: 2024, domain: '事业', predicted: '事业上升', predictedScore: 75 });
  verifyPrediction(store, pred.id, '确实晋升了', 2);
  return store;
}

// ---- Chart Renderer Tests ----

describe('Chart Renderer', () => {
  it('should render a full chart as text', () => {
    const output = renderChart(chart);
    expect(output).toContain('四 柱 八 字');
    expect(output).toContain('年柱');
    expect(output).toContain('月柱');
    expect(output).toContain('日柱');
    expect(output).toContain('时柱');
    expect(output).toContain('天干');
    expect(output).toContain('地支');
  });

  it('should render a compact summary', () => {
    const summary = renderChartSummary(chart);
    expect(summary).toContain('日主');
    expect(summary.length).toBeGreaterThan(0);
  });

  it('should render plain text without ANSI codes', () => {
    const plain = renderChartPlain(chart);
    expect(plain).not.toContain('\x1b[3');
    expect(plain).toContain('四 柱 八 字');
  });

  it('should color text by wuxing', () => {
    const colored = colorWx('木', '甲');
    expect(colored).toContain('\x1b[32m');
    expect(colored).toContain('\x1b[0m');
  });
});

// ---- Dashboard Tests ----

describe('Destiny Dashboard', () => {
  it('should render full dashboard', () => {
    const output = renderDashboard(chart, strength, structure, climate, relations, fortune);
    expect(output).toContain('Destiny Cockpit');
    expect(output).toContain('旺衰');
    expect(output).toContain('格局');
    expect(output).toContain('运势');
  });

  it('should render compact dashboard', () => {
    const output = renderDashboard(chart, strength, structure, climate, relations, fortune, { compact: true });
    expect(output).toContain('Destiny Cockpit');
    // Compact uses different chart rendering
    expect(output.length).toBeGreaterThan(0);
  });

  it('should render dashboard with AI section', () => {
    const output = renderDashboard(chart, strength, structure, climate, relations, fortune, { includeAI: true });
    expect(output).toContain('AI 解释');
  });

  it('should render dashboard with memory section', () => {
    const output = renderDashboard(chart, strength, structure, climate, relations, fortune, { includeMemory: true });
    expect(output).toContain('记忆数据');
  });
});

// ---- Fortune Timeline Tests ----

describe('Fortune Timeline', () => {
  it('should render fortune timeline with yearly bars', () => {
    const output = renderFortuneTimeline(fortune);
    expect(output).toContain('事业');
    expect(output).toContain('健康');
    // Should have year entries
    expect(output.split('\n').length).toBeGreaterThan(5);
  });

  it('should render DaYun cycles table', () => {
    const output = renderDayunCycles(dayun);
    expect(output).toContain('大运');
    expect(output).toContain('天干');
    expect(output).toContain('纳音');
  });

  it('should render life periods', () => {
    const output = renderLifePeriods(fortune);
    expect(output).toContain('人生阶段');
    expect(output).toContain('岁');
  });

  it('should render a year card for the first year', () => {
    const yf = fortune.yearlyAnalysis[0];
    if (yf) {
      const output = renderYearCard(yf);
      expect(output).toContain('年运势');
      expect(output).toContain('事业');
      expect(output).toContain('财富');
    }
  });

  it('should highlight current year in timeline', () => {
    const output = renderFortuneTimeline(fortune);
    const currentYear = new Date().getFullYear();
    expect(output).toContain(String(currentYear));
  });
});

// ---- Memory Views Tests ----

describe('Memory Views', () => {
  const store = createTestStore();

  it('should render life timeline', () => {
    const output = renderLifeTimeline(store);
    expect(output).toContain('生活时间线');
    expect(output).toContain('晋升');
  });

  it('should render accuracy report', () => {
    const output = renderAccuracyReport(store);
    expect(output).toContain('预测准确性');
    expect(output).toContain('已核实');
  });

  it('should render patterns', () => {
    const output = renderPatterns(store);
    // With only 2 events in different domains, may report no patterns
    expect(output.length).toBeGreaterThan(0);
  });

  it('should render events filtered by domain', () => {
    const output = renderEventsByDomain(store, '事业');
    expect(output).toContain('事业');
    expect(output).toContain('晋升');
  });

  it('should render pending verifications', () => {
    const output = renderPendingVerifications(store);
    expect(output).toContain('预测核实面板');
  });

  it('should render all memory views', () => {
    const output = renderMemoryViews(store);
    expect(output).toContain('生活时间线');
    expect(output).toContain('暂无足够数据发现规律');
    expect(output).toContain('预测准确性');
  });
});
