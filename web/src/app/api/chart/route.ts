import { NextResponse } from 'next/server';
import type { BirthInfo } from '@engine/core/astro/types.js';
import { calcBaZi, generateChart } from '@engine/core/astro/bazi.js';
import { calcDaYun } from '@engine/core/astro/dayun.js';
import { calcLiuNian } from '@engine/core/astro/liunian.js';
import { analyzeStrength } from '@engine/core/destiny/strengthEngine.js';
import { analyzeStructure } from '@engine/core/destiny/structureEngine.js';
import { analyzeClimate } from '@engine/core/destiny/climateEngine.js';
import { analyzeRelations } from '@engine/core/destiny/relationEngine.js';
import { analyzeFortune } from '@engine/core/destiny/fortuneEngine.js';
import { deriveYongShen } from '@engine/core/destiny/yongShenEngine.js';
import { buildReportCard } from '@engine/ai/promptBuilder.js';
import { renderChart } from '@engine/visualization/chartRenderer.js';
import { renderDashboard } from '@engine/visualization/dashboard.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const birth: BirthInfo = {
      year: body.year,
      month: body.month,
      day: body.day,
      hour: body.hour,
      minute: body.minute ?? 0,
      longitude: body.longitude ?? 116.4,
      isDST: body.isDST ?? false,
      gender: body.gender ?? '男',
    };

    const bazi = calcBaZi(birth);
    const chart = generateChart(birth);
    const dayun = calcDaYun(birth, bazi.month, bazi.year.stemIndex, bazi.day.stemIndex);

    const currentYear = new Date().getFullYear();
    const liunian = calcLiuNian(bazi, currentYear, currentYear + 5);

    const climate = analyzeClimate(bazi);
    const strength = analyzeStrength(bazi, climate);
    const structure = analyzeStructure(bazi, strength);
    const relations = analyzeRelations(bazi);
    const fortune = analyzeFortune(bazi, strength, structure, climate, relations, dayun, liunian);
    const yongShen = deriveYongShen(bazi, strength, structure, climate);

    return NextResponse.json({
      chart: {
        pillars: {
          year: { stem: bazi.year.stem.name, branch: bazi.year.branch.name },
          month: { stem: bazi.month.stem.name, branch: bazi.month.branch.name },
          day: { stem: bazi.day.stem.name, branch: bazi.day.branch.name },
          hour: { stem: bazi.hour.stem.name, branch: bazi.hour.branch.name },
        },
        dayMaster: { stem: chart.dayMaster.name, wuxing: chart.dayMasterWuxing },
      },
      strength: {
        score: strength.strengthScore,
        level: strength.level,
        label: strength.levelLabel,
        summary: strength.summary,
      },
      structure: {
        pattern: structure.primaryPattern,
        subPattern: structure.subPattern,
        shiShen: structure.patternShiShen,
        isFavorable: structure.isFavorable,
      },
      climate: {
        needsAdjustment: climate.needsAdjustment,
        priority: climate.priority,
        neededWuxing: climate.neededWuxing,
        condition: climate.condition,
      },
      yongShen: {
        yongShen: yongShen.yongShen,
        xiShen: yongShen.xiShen,
        jiShen: yongShen.jiShen,
        summary: yongShen.summary,
      },
      fortune: {
        overall: fortune.overall,
        keyYears: fortune.keyYears,
        lifePeriods: fortune.lifePeriods.slice(0, 6),
      },
      relations: {
        theme: relations.dominantTheme,
        summary: relations.summary,
      },
      visualization: renderChart(chart),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 400 },
    );
  }
}
