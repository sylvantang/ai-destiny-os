import { NextResponse } from 'next/server';
import type { BirthInfo } from '@engine/core/astro/types.js';
import { buildDestinyContext } from '@engine/agent/context.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { self: selfInfo, other: otherInfo } = body;

    if (!selfInfo || !otherInfo) {
      return NextResponse.json(
        { error: 'Missing "self" or "other" birth info in request body' },
        { status: 400 },
      );
    }

    const toBirth = (info: Record<string, unknown>): BirthInfo => ({
      year: info.year as number,
      month: info.month as number,
      day: info.day as number,
      hour: info.hour as number,
      minute: (info.minute as number) ?? 0,
      longitude: (info.longitude as number) ?? 116.4,
      isDST: (info.isDST as boolean) ?? false,
      gender: (info.gender as string) ?? '男',
    });

    const selfCtx = buildDestinyContext(toBirth(selfInfo));
    const otherCtx = buildDestinyContext(toBirth(otherInfo));

    const s = selfCtx.ctx.strength;
    const o = otherCtx.ctx.strength;
    const sSt = selfCtx.ctx.structure;
    const oSt = otherCtx.ctx.structure;
    const sYs = selfCtx.ctx.yongShen;
    const oYs = otherCtx.ctx.yongShen;
    const sF = selfCtx.ctx.fortune;
    const oF = otherCtx.ctx.fortune;

    const wuxingCompat = computeWuxingCompat(
      s.dayMaster.wuxing,
      o.dayMaster.wuxing,
    );

    const yongShenCompat = computeYongShenCompat(
      sYs.yongShen.wuxing,
      oYs.yongShen.wuxing,
    );

    return NextResponse.json({
      self: {
        dayMaster: `${s.dayMaster.stem}${s.dayMaster.wuxing}（${s.dayMaster.yinYang}性）`,
        strength: { level: s.level, score: s.strengthScore },
        structure: { pattern: sSt.primaryPattern, favorable: sSt.isFavorable },
        yongShen: { wuxing: sYs.yongShen.wuxing, shiShen: sYs.yongShen.shiShen },
        fortune: { score: sF.overall.score, level: sF.overall.level },
      },
      other: {
        dayMaster: `${o.dayMaster.stem}${o.dayMaster.wuxing}（${o.dayMaster.yinYang}性）`,
        strength: { level: o.level, score: o.strengthScore },
        structure: { pattern: oSt.primaryPattern, favorable: oSt.isFavorable },
        yongShen: { wuxing: oYs.yongShen.wuxing, shiShen: oYs.yongShen.shiShen },
        fortune: { score: oF.overall.score, level: oF.overall.level },
      },
      compatibility: {
        wuxing: wuxingCompat,
        yongShen: yongShenCompat,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 400 },
    );
  }
}

function computeWuxingCompat(a: string, b: string): string {
  const generates: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  const controls: Record<string, string> = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };

  if (a === b) return '五行相同，相互理解';
  if (generates[a] === b) return `${a}生${b}，本人滋养对方`;
  if (generates[b] === a) return `${b}生${a}，对方滋养本人`;
  if (controls[a] === b) return `${a}克${b}，本人克制对方`;
  if (controls[b] === a) return `${b}克${a}，对方克制本人`;
  return '五行中性';
}

function computeYongShenCompat(a: string, b: string): string {
  const generates: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
  if (a === b) return '用神相同，目标一致';
  if (generates[a] === b) return '本人用神生对方用神';
  if (generates[b] === a) return '对方用神生本人用神';
  return '用神不同，各有侧重';
}
