import { NextResponse } from 'next/server';
import type { BirthInfo } from '@engine/core/astro/types.js';
import { calcBaZi, generateChart } from '@engine/core/astro/bazi.js';
import { calcDaYun } from '@engine/core/astro/dayun.js';
import { calcLiuNian } from '@engine/core/astro/liunian.js';
import { ALL_STEMS } from '@engine/core/astro/constants.js';
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

    const pillars = [bazi.year, bazi.month, bazi.day, bazi.hour];
    const pillarLabels = ['year', 'month', 'day', 'hour'] as const;
    const pillarNames = ['年柱', '月柱', '日柱', '时柱'];

    return NextResponse.json({
      chart: {
        pillars: Object.fromEntries(
          pillars.map((p, i) => [
            pillarLabels[i],
            {
              stem: { name: p.stem.name, wuxing: p.stem.wuxing, yinYang: p.stem.yinYang },
              branch: { name: p.branch.name, wuxing: p.branch.wuxing },
              shiShen: p.shiShen,
              nayin: p.nayin,
              hiddenStems: p.hiddenStems.map((idx) => ({
                name: ALL_STEMS[idx]?.name ?? '?',
                wuxing: ALL_STEMS[idx]?.wuxing ?? '?',
              })),
            },
          ]),
        ),
        pillarLabels: Object.fromEntries(
          pillarLabels.map((k, i) => [k, pillarNames[i]]),
        ),
        dayMaster: { stem: chart.dayMaster.name, wuxing: chart.dayMasterWuxing },
        wuxingCounts: chart.wuxingCount,
      },
      strength: {
        score: strength.strengthScore,
        level: strength.level,
        label: strength.levelLabel,
        summary: strength.summary,
        breakdown: strength.scoring,
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
