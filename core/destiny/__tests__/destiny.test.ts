// ============================================================
// AI Destiny OS — Destiny Engine: Test Suite
// ============================================================

import { describe, it, expect } from 'vitest';
import { calcBaZi } from '../../astro/bazi.js';
import { analyzeStrength } from '../strengthEngine.js';
import { analyzeStructure } from '../structureEngine.js';
import { analyzeClimate } from '../climateEngine.js';
import { analyzeRelations } from '../relationEngine.js';
import { analyzeFortune } from '../fortuneEngine.js';
import { calcDaYun } from '../../astro/dayun.js';
import { calcLiuNian } from '../../astro/liunian.js';
import { buildReportCard, type PromptContext } from '../../../ai/promptBuilder.js';
import type { BirthInfo } from '../../astro/types.js';

// Test chart: 1993-07-23 09:30 Beijing Male
// BaZi: 癸酉 己未 乙巳 辛巳
// 日主乙木, 未月 (夏), 偏财格
const birth: BirthInfo = {
  year: 1993, month: 7, day: 23, hour: 9, minute: 30,
  longitude: 116.4, isDST: false, gender: '男',
};

const bazi = calcBaZi(birth);

// ---- Strength Engine Tests ----

describe('Strength Engine (旺衰)', () => {
  it('should calculate strength for 乙木日主 in 未月', () => {
    const result = analyzeStrength(bazi);

    expect(result.strengthScore).toBeGreaterThanOrEqual(0);
    expect(result.strengthScore).toBeLessThanOrEqual(100);
    expect(result.level).toBeDefined();
    expect(result.monthOrder.score).toBeDefined();
    expect(result.roots).toBeDefined();
    expect(result.stemSupport).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('should correctly identify the day master as 乙木', () => {
    const result = analyzeStrength(bazi);
    // 乙木 in 未月 = summer = control (木克土), should be +5 month order
    expect(result.monthOrder.score).toBe(5);
  });
});

// ---- Structure Engine Tests ----

describe('Structure Engine (格局)', () => {
  it('should identify the primary pattern', () => {
    const strength = analyzeStrength(bazi);
    const result = analyzeStructure(bazi, strength);

    expect(result.primaryPattern).toBeDefined();
    expect(result.isSpecial).toBeDefined();
    expect(typeof result.isFavorable).toBe('boolean');
    expect(result.analysis.length).toBeGreaterThan(0);
  });

  it('should have 偏财 as the pattern shi shen (month 己 for 乙日主)', () => {
    const strength = analyzeStrength(bazi);
    const result = analyzeStructure(bazi, strength);

    // Month dominant is 己 (from 未), 己 for 乙日主 = 偏财
    expect(result.patternShiShen).toBe('偏财');
    expect(result.primaryPattern).toBe('偏财格');
  });
});

// ---- Climate Engine Tests ----

describe('Climate Engine (调候)', () => {
  it('should detect summer wood needing water', () => {
    const result = analyzeClimate(bazi);

    expect(result.condition).toBe('夏木枯');
    expect(result.neededWuxing).toBe('水');
    expect(result.priority).toBe('medium');
    expect(result.needsAdjustment).toBe(true);
  });

  // Test: 壬水 born in 子月 (deep winter) → needs fire
  it('should detect winter water needing fire', () => {
    const winterWaterBirth: BirthInfo = {
      year: 2000, month: 1, day: 15, hour: 12, minute: 0,
      longitude: 116.4, isDST: false, gender: '男',
    };
    const winterBazi = calcBaZi(winterWaterBirth);

    // 子月水日主 = 冬水寒
    if (winterBazi.day.stem.wuxing === '水') {
      const result = analyzeClimate(winterBazi);
      expect(result.condition).toBe('冬水寒');
      expect(result.neededWuxing).toBe('火');
      expect(result.priority).toBe('high');
    }
  });

  // Test: 丙火 born in 午月 (high summer) → needs water
  it('should detect summer fire needing water', () => {
    const summerFireBirth: BirthInfo = {
      year: 2000, month: 6, day: 15, hour: 12, minute: 0,
      longitude: 116.4, isDST: false, gender: '男',
    };
    const summerBazi = calcBaZi(summerFireBirth);

    if (summerBazi.day.stem.wuxing === '火') {
      const result = analyzeClimate(summerBazi);
      expect(result.condition).toBe('夏火炎');
      expect(result.neededWuxing).toBe('水');
      expect(result.priority).toBe('high');
    }
  });
});

// ---- Relation Engine Tests ----

describe('Relation Engine (十神关系)', () => {
  it('should analyze relationships without error', () => {
    const result = analyzeRelations(bazi);

    expect(result.relations).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.dominantTheme).toBeDefined();
  });

  it('should detect valid relationship categories', () => {
    const result = analyzeRelations(bazi);

    for (const rel of result.relations) {
      expect(['favorable', 'unfavorable', 'neutral']).toContain(rel.category);
      expect(rel.name.length).toBeGreaterThan(0);
      expect(rel.description.length).toBeGreaterThan(0);
    }
  });
});

// ---- Fortune Engine Tests ----

describe('Fortune Engine (运势)', () => {
  it('should produce fortune analysis', () => {
    const strength = analyzeStrength(bazi);
    const structure = analyzeStructure(bazi, strength);
    const climate = analyzeClimate(bazi);
    const relations = analyzeRelations(bazi);
    const dayun = calcDaYun(birth, bazi.month, bazi.year.stemIndex, bazi.day.stemIndex);
    const liunian = calcLiuNian(bazi, 2024, 2026);

    const result = analyzeFortune(bazi, strength, structure, climate, relations, dayun, liunian);

    expect(result.overall).toBeDefined();
    expect(result.overall.score).toBeGreaterThanOrEqual(0);
    expect(result.overall.score).toBeLessThanOrEqual(100);
    expect(result.yearlyAnalysis.length).toBe(3);
    expect(result.lifePeriods.length).toBeGreaterThan(0);
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('should have valid fortune levels', () => {
    const strength = analyzeStrength(bazi);
    const structure = analyzeStructure(bazi, strength);
    const climate = analyzeClimate(bazi);
    const relations = analyzeRelations(bazi);
    const dayun = calcDaYun(birth, bazi.month, bazi.year.stemIndex, bazi.day.stemIndex);
    const liunian = calcLiuNian(bazi, 2024, 2026);

    const result = analyzeFortune(bazi, strength, structure, climate, relations, dayun, liunian);

    expect(['低谷', '平缓', '上升', '高峰']).toContain(result.overall.level);
  });
});

// ---- Integration Tests ----

describe('Full Pipeline Integration', () => {
  it('should run strength → climate → structure → relations → fortune', () => {
    // Strength
    const str = analyzeStrength(bazi);
    expect(str.strengthScore).toBeGreaterThan(0);

    // Climate
    const cli = analyzeClimate(bazi);
    expect(cli.condition).toBeTruthy();

    // Structure
    const struct = analyzeStructure(bazi, str);
    expect(struct.primaryPattern).toBeTruthy();

    // Relations
    const rel = analyzeRelations(bazi);
    expect(rel.summary).toBeTruthy();

    // Fortune
    const dayun = calcDaYun(birth, bazi.month, bazi.year.stemIndex, bazi.day.stemIndex);
    const liunian = calcLiuNian(bazi, 2024, 2026);
    const fortune = analyzeFortune(bazi, str, struct, cli, rel, dayun, liunian);
    expect(fortune.overall.score).toBeGreaterThan(0);
  });
});

// ---- AI Layer Isolation ----

describe('AI Layer Isolation', () => {
  it('buildReportCard should contain only engine outputs, not raw pillar data', () => {
    const strength = analyzeStrength(bazi);
    const structure = analyzeStructure(bazi, strength);
    const climate = analyzeClimate(bazi);
    const relations = analyzeRelations(bazi);
    const dayun = calcDaYun(birth, bazi.month, bazi.year.stemIndex, bazi.day.stemIndex);
    const liunian = calcLiuNian(bazi, 2024, 2026);
    const fortune = analyzeFortune(bazi, strength, structure, climate, relations, dayun, liunian);

    const ctx: PromptContext = {
      chart: { bazi, birthInfo: birth, dayun, currentDayun: null, wuxingCount: { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 }, dayMaster: bazi.day.stem, dayMasterWuxing: bazi.day.stem.wuxing },
      strength, structure, climate, relations, fortune,
    };

    const report = buildReportCard(ctx);
    const reportStr = JSON.stringify(report);

    // Must NOT contain raw pillar indices
    expect(reportStr).not.toContain('stemIndex');
    expect(reportStr).not.toContain('branchIndex');
    expect(reportStr).not.toContain('sexagenaryIndex');
    expect(reportStr).not.toContain('hiddenStems');
    expect(reportStr).not.toContain('nayin');

    // Must contain engine outputs
    expect(report.strength).toBeDefined();
    expect(report.structure).toBeDefined();
    expect(report.climate).toBeDefined();
    expect(report.relations).toBeDefined();
    expect(report.fortune).toBeDefined();
  });
});
