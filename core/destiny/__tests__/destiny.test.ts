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

  it('should include 季节状态 factor in factors array', () => {
    const result = analyzeStrength(bazi);
    const seasonal = result.factors.find(f => f.name.startsWith('季节状态·'));
    expect(seasonal).toBeDefined();
    expect(['旺', '相', '休', '囚', '死']).toContain(seasonal!.name.split('·')[1]);
  });

  it('乙木 in 未月(夏) should be 休 state (木生火，生令者休)', () => {
    const result = analyzeStrength(bazi);
    const seasonal = result.factors.find(f => f.name.startsWith('季节状态·'));
    expect(seasonal!.name).toBe('季节状态·休');
    expect(seasonal!.score).toBe(-3);
  });

  it('丙火 in 午月(夏) should be 旺 state (火当令于夏)', () => {
    const fireBirth: BirthInfo = {
      year: 2000, month: 6, day: 15, hour: 12, minute: 0,
      longitude: 116.4, isDST: false, gender: '男',
    };
    const fireBazi = calcBaZi(fireBirth);
    if (fireBazi.day.stem.wuxing === '火') {
      const result = analyzeStrength(fireBazi);
      const seasonal = result.factors.find(f => f.name.startsWith('季节状态·'));
      expect(seasonal!.name).toBe('季节状态·旺');
      expect(seasonal!.score).toBe(5);
    }
  });

  it('壬水 in 子月(冬) should be 旺 state (水当令于冬)', () => {
    const waterBirth: BirthInfo = {
      year: 2000, month: 1, day: 15, hour: 12, minute: 0,
      longitude: 116.4, isDST: false, gender: '男',
    };
    const waterBazi = calcBaZi(waterBirth);
    if (waterBazi.day.stem.wuxing === '水') {
      const result = analyzeStrength(waterBazi);
      const seasonal = result.factors.find(f => f.name.startsWith('季节状态·'));
      expect(seasonal!.name).toBe('季节状态·旺');
      expect(seasonal!.score).toBe(5);
    }
  });

  it('庚金 in 午月(夏) should be 死 state (火克金，令克者死)', () => {
    const metalBirth: BirthInfo = {
      year: 2000, month: 6, day: 20, hour: 6, minute: 0,
      longitude: 116.4, isDST: false, gender: '男',
    };
    const metalBazi = calcBaZi(metalBirth);
    if (metalBazi.day.stem.wuxing === '金') {
      const result = analyzeStrength(metalBazi);
      const seasonal = result.factors.find(f => f.name.startsWith('季节状态·'));
      expect(seasonal!.name).toBe('季节状态·死');
      expect(seasonal!.score).toBe(-8);
    }
  });

  it('scoring should include seasonalState field', () => {
    const result = analyzeStrength(bazi);
    expect(result.scoring.seasonalState).toBeDefined();
    expect(typeof result.scoring.seasonalState).toBe('number');
  });
});

// ---- Climate → Strength Integration Tests ----

describe('Climate → Strength Integration (调候联动)', () => {
  it('should accept climate parameter without error', () => {
    const climate = analyzeClimate(bazi);
    const result = analyzeStrength(bazi, climate);
    expect(result.strengthScore).toBeGreaterThanOrEqual(0);
  });

  it('乙木 in 未月 should have 调候修正 factor when climate passed', () => {
    const climate = analyzeClimate(bazi);
    // 乙木 in 未月 = 夏木枯, medium priority, needs 水
    const result = analyzeStrength(bazi, climate);
    const climateFactor = result.factors.find(f => f.name === '调候修正');
    expect(climateFactor).toBeDefined();
    expect(climateFactor!.category).toBe('weaken');
    // medium priority, check if 水 is present in chart
    expect(climateFactor!.score).toBeLessThanOrEqual(-3);
  });

  it('scoring should include climateAdjustment when climate passed', () => {
    const climate = analyzeClimate(bazi);
    const result = analyzeStrength(bazi, climate);
    expect(result.scoring.climateAdjustment).toBeDefined();
    expect(typeof result.scoring.climateAdjustment).toBe('number');
    expect(result.scoring.climateAdjustment).toBeLessThanOrEqual(0);
  });

  it('strengthScore should decrease when high-priority climate need exists', () => {
    // Winter fire day master needs 木 fire support → high priority
    const winterFireBirth: BirthInfo = {
      year: 2000, month: 1, day: 15, hour: 12, minute: 0,
      longitude: 116.4, isDST: false, gender: '男',
    };
    const winterFireBazi = calcBaZi(winterFireBirth);
    if (winterFireBazi.day.stem.wuxing === '火') {
      const withoutClimate = analyzeStrength(winterFireBazi);
      const climate = analyzeClimate(winterFireBazi);
      const withClimate = analyzeStrength(winterFireBazi, climate);

      // Strength score should be lower when climate factor is applied
      // (winter fire = 冬火弱, medium priority, needs 木)
      if (climate.needsAdjustment && climate.priority !== 'none') {
        expect(withClimate.strengthScore).toBeLessThanOrEqual(withoutClimate.strengthScore);
      }
    }
  });

  it('should still work without climate (backward compatible)', () => {
    const result = analyzeStrength(bazi);
    expect(result.strengthScore).toBeGreaterThanOrEqual(0);
    const climateFactor = result.factors.find(f => f.name === '调候修正');
    expect(climateFactor).toBeUndefined();
  });
});

// ---- 十二长生 (12 Growth Stages) Tests ----

describe('十二长生 (12 Growth Stages)', () => {
  it('should include 十二长生 factor in results', () => {
    const result = analyzeStrength(bazi);
    const factor = result.factors.find(f => f.name.startsWith('十二长生·'));
    expect(factor).toBeDefined();
    expect(factor!.category).toBeDefined();
    expect(factor!.score).toBeDefined();
  });

  it('乙木坐巳 should be 沐浴 stage (+1)', () => {
    // Test chart: 乙木日主坐巳支 → 沐浴
    const result = analyzeStrength(bazi);
    const factor = result.factors.find(f => f.name.startsWith('十二长生·'));
    expect(factor!.name).toBe('十二长生·沐浴');
    expect(factor!.score).toBe(1);
    expect(factor!.category).toBe('support');
  });

  it('甲木坐寅 should be 临官 (禄) stage (+8)', () => {
    // 甲日主 (stem 0), 寅 branch (2)
    // 甲: 亥长生(11), 子沐浴(0), 丑冠带(1), 寅临官(2) → stage 3
    const jiaBirth: BirthInfo = {
      year: 1984, month: 2, day: 4, hour: 6, minute: 0,  // 立春附近甲日
      longitude: 116.4, isDST: false, gender: '男',
    };
    const jiaBazi = calcBaZi(jiaBirth);
    if (jiaBazi.day.stemIndex === 0) {
      const result = analyzeStrength(jiaBazi);
      const factor = result.factors.find(f => f.name.startsWith('十二长生·'));
      expect(factor!.name).toBe('十二长生·临官');
      expect(factor!.score).toBe(8);
      expect(factor!.category).toBe('support');
    }
  });

  it('丙火坐午 should be 帝旺 stage (+10)', () => {
    const bingBirth: BirthInfo = {
      year: 2000, month: 6, day: 15, hour: 12, minute: 0,
      longitude: 116.4, isDST: false, gender: '男',
    };
    const bingBazi = calcBaZi(bingBirth);
    if (bingBazi.day.stemIndex === 2) {
      const result = analyzeStrength(bingBazi);
      const factor = result.factors.find(f => f.name.startsWith('十二长生·'));
      expect(factor!.name).toBe('十二长生·帝旺');
      expect(factor!.score).toBe(10);
    }
  });

  it('壬水坐申 should be 长生 stage (+4)', () => {
    // Test chart: 壬日主, 日支申
    // 壬: 申长生(8)→index 0, so 壬坐申=长生
    const renBirth: BirthInfo = {
      year: 2012, month: 8, day: 17, hour: 12, minute: 0,
      longitude: 116.4, isDST: false, gender: '男',
    };
    const renBazi = calcBaZi(renBirth);
    if (renBazi.day.stemIndex === 8) {
      const result = analyzeStrength(renBazi);
      const factor = result.factors.find(f => f.name.startsWith('十二长生·'));
      expect(factor!.name).toBe('十二长生·长生');
      expect(factor!.score).toBe(4);
    }
  });

  it('庚金坐子 should be 死 stage (-6)', () => {
    // 庚: 长生巳(5), 沐浴午(6), 冠带未(7), 临官申(8), 帝旺酉(9),
    //     衰戌(10), 病亥(11), 死子(0) → index 7
    const gengBirth: BirthInfo = {
      year: 2000, month: 1, day: 10, hour: 6, minute: 0,
      longitude: 116.4, isDST: false, gender: '男',
    };
    const gengBazi = calcBaZi(gengBirth);
    if (gengBazi.day.stemIndex === 6) {
      const result = analyzeStrength(gengBazi);
      const factor = result.factors.find(f => f.name.startsWith('十二长生·'));
      expect(factor!.name).toBe('十二长生·死');
      expect(factor!.score).toBe(-6);
      expect(factor!.category).toBe('weaken');
    }
  });

  it('scoring should include twelveStage field', () => {
    const result = analyzeStrength(bazi);
    expect(result.scoring.twelveStage).toBeDefined();
    expect(typeof result.scoring.twelveStage).toBe('number');
  });
});

// ---- 透干联动 (Stem Revelation Feedback) Tests ----

describe('透干联动 (Stem Revelation Feedback)', () => {
  it('test chart (乙日主, 未月, 己透干) should have 透干联动 factor', () => {
    // Month 未(7): dominant stem = 己(5)
    // Heavenly stems: 年癸(9), 月己(5), 时辛(7) → 己透干
    // 己 for 乙日主 = 偏财 → score -3
    const result = analyzeStrength(bazi);
    const factor = result.factors.find(f => f.name === '透干联动');
    expect(factor).toBeDefined();
    expect(factor!.category).toBe('weaken');
    expect(factor!.score).toBe(-3);
    expect(factor!.description).toContain('偏财');
  });

  it('should have 透干联动 factor when month dominant is 透干', () => {
    // Chart with 印星透干: 壬日主, 申月(dominant 庚), 月干庚 → 偏印透干 → +5
    const yinBirth: BirthInfo = {
      year: 2012, month: 8, day: 17, hour: 12, minute: 0,  // 申月
      longitude: 116.4, isDST: false, gender: '男',
    };
    const yinBazi = calcBaZi(yinBirth);
    const dmIdx = yinBazi.day.stemIndex;
    const monthHid = yinBazi.month.branchIndex; // 申=8
    // HIDDEN_STEMS[8] = [{stem:6 (庚), dominant:true}, {stem:8 (壬)}, {stem:4 (戊)}]
    // For 壬日主 (stem 8), month dominant 庚(6): 生我+同阴阳 = 偏印
    // Check if 庚(6) is on any stem
    const stems = [yinBazi.year.stemIndex, yinBazi.month.stemIndex, yinBazi.hour.stemIndex];
    const dominant = 6; // 庚
    if (stems.includes(dominant) && dmIdx === 8) {
      const result = analyzeStrength(yinBazi);
      const factor = result.factors.find(f => f.name === '透干联动');
      expect(factor).toBeDefined();
      expect(factor!.category).toBe('support');
      expect(factor!.score).toBe(5);
      expect(factor!.description).toContain('偏印');
    }
  });

  it('should NOT have 透干联动 when not 透干', () => {
    // Create a chart where month dominant NOT on stems
    // 甲日主, 戌月(dominant 戊=4), check stems don't include 4
    const birth: BirthInfo = {
      year: 1984, month: 10, day: 1, hour: 6, minute: 0,
      longitude: 116.4, isDST: false, gender: '男',
    };
    const testBazi = calcBaZi(birth);
    const monthHidStem = 4; // 戌月本气戊
    const stems = [testBazi.year.stemIndex, testBazi.month.stemIndex, testBazi.hour.stemIndex];
    if (!stems.includes(monthHidStem)) {
      const result = analyzeStrength(testBazi);
      const factor = result.factors.find(f => f.name === '透干联动');
      expect(factor).toBeUndefined();
    }
  });

  it('scoring should include touGan field', () => {
    const result = analyzeStrength(bazi);
    expect(result.scoring.touGan).toBeDefined();
    expect(typeof result.scoring.touGan).toBe('number');
  });
});

// ---- 三合/半合/三会 (Three Harmony / Meeting) Tests ----

describe('三合/半合/三会 (Three Harmony / Meeting)', () => {
  it('should include threeHarmony in scoring', () => {
    const result = analyzeStrength(bazi);
    expect(result.scoring.threeHarmony).toBeDefined();
    expect(typeof result.scoring.threeHarmony).toBe('number');
  });

  it('should detect 三会木局 when 寅卯辰 are all present', () => {
    // Construct a birth with branches 2, 3, 4
    // 2022年 is 壬寅 (branch 2), Feb is 寅月 (branch 2)
    // Pick a date with 辰日 and 卯时
    const birth: BirthInfo = {
      year: 2022, month: 2, day: 19, hour: 5, minute: 0,
      longitude: 116.4, isDST: false, gender: '男',
    };
    const testBz = calcBaZi(birth);
    const brs = [testBz.year.branchIndex, testBz.month.branchIndex, testBz.day.branchIndex, testBz.hour.branchIndex];
    const has2 = brs.includes(2), has3 = brs.includes(3), has4 = brs.includes(4);
    if (has2 && has3 && has4) {
      const result = analyzeStrength(testBz);
      const factor = result.factors.find(f => f.name.includes('三会'));
      expect(factor).toBeDefined();
    }
  });

  it('should detect 半合 when two branches form half harmony', () => {
    // Test chart: 癸酉 己未 乙巳 辛巳 — branches: 酉(9), 未(7), 巳(5), 巳(5)
    // 酉丑半合金: need 酉(9) and 丑(1). Not in test chart.
    // 巳酉半合金: need 巳(5) and 酉(9). Test chart has both!
    const result = analyzeStrength(bazi);
    const halfFactor = result.factors.find(f => f.name.includes('半合'));
    // 巳酉半合金 → 巳(5) + 酉(9) → yes, test chart has 巳 and 酉
    expect(halfFactor).toBeDefined();
    expect(halfFactor!.name).toBe('巳酉半合金');
    // 金克木, 乙木日主被半合金气所克 → weaken
    expect(halfFactor!.score).toBeLessThan(0);
  });

  it('should detect 三合火局 for 寅午戌 chart', () => {
    // 1966 is 丙午年 (branch 6), Feb 4+ is 寅月 (branch 2)
    // Find a 戌日
    const birth: BirthInfo = {
      year: 1966, month: 2, day: 9, hour: 19, minute: 0, // 戌时
      longitude: 116.4, isDST: false, gender: '男',
    };
    const testBz = calcBaZi(birth);
    const brs = [testBz.year.branchIndex, testBz.month.branchIndex, testBz.day.branchIndex, testBz.hour.branchIndex];
    if (brs.includes(2) && brs.includes(6) && brs.includes(10)) {
      const result = analyzeStrength(testBz);
      const factor = result.factors.find(f => f.name.includes('三合'));
      expect(factor).toBeDefined();
      expect(factor!.name).toContain('火');
    }
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
