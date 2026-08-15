import { NextResponse } from 'next/server';
import { computeUnifiedBazi } from '@/lib/bazi/engine-adapter';
import { renderChartPlain } from '@/lib/visualization/chartRenderer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = {
      year: body.year,
      month: body.month,
      day: body.day,
      hour: body.hour,
      minute: body.minute ?? 0,
      gender: body.gender ?? '男',
      longitude: body.longitude ?? 116.4,
      latitude: body.latitude ?? 39.9,
      isLunar: body.isLunar ?? false,
    };

    const result = await computeUnifiedBazi(input);
    result.visualization = renderChartPlain(result.rawShunshi);

    return NextResponse.json({
      chart: result.chart,
      strength: result.strength,
      structure: result.structure,
      climate: result.climate,
      yongShen: result.yongShen,
      fortune: result.fortune,
      relations: result.relations,
      visualization: result.visualization,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 400 },
    );
  }
}
