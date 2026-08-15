'use client';

import { useState } from 'react';
import { BirthForm, birthToPayload, defaultBirth, type BirthInfo } from '../_components/BirthForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BaziChart } from '@/components/BaziChart';
import { WuXingBalance } from '@/components/WuXingBalance';
import { WuxingRadar } from '@/components/WuxingRadar';
import { DayunTimeline } from '@/components/DayunTimeline';
import { Loader2, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ChartApiPillar {
  stem: { name: string; wuxing: string; yinYang?: string };
  branch: { name: string; wuxing: string };
  shiShen?: string;
  nayin?: string;
  hiddenStems?: { name: string; wuxing: string }[];
}

interface ChartApiResult {
  chart?: {
    pillars: Record<'year' | 'month' | 'day' | 'hour', ChartApiPillar>;
    pillarLabels?: Record<string, string>;
    dayMaster: { stem: string; wuxing: string };
    wuxingCounts?: Record<string, number>;
  };
  strength?: { score?: number; level?: string; label?: string; summary?: string };
  structure?: { pattern?: string; subPattern?: string; shiShen?: string; isFavorable?: boolean };
  yongShen?: {
    yongShen?: { wuxing: string };
    xiShen?: { wuxing: string }[];
    jiShen?: { wuxing: string }[];
    summary?: string;
  };
  fortune?: {
    overall?: { score?: number; level?: string; bestDimension?: string };
    lifePeriods?: { startAge: number; pillar: string; years: number[]; summary: string }[];
  };
  climate?: { needsAdjustment?: boolean; neededWuxing?: string; condition?: string };
}

export default function ChartPage() {
  const [birth, setBirth] = useState<BirthInfo>({ ...defaultBirth });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChartApiResult | null>(null);
  const [error, setError] = useState('');

  // Feedback state
  const [fbRating, setFbRating] = useState<string | null>(null);
  const [fbComment, setFbComment] = useState('');
  const [fbSubmitted, setFbSubmitted] = useState(false);
  const [fbSubmitting, setFbSubmitting] = useState(false);

  const submitFeedback = async () => {
    if (!fbRating || fbSubmitting) return;
    setFbSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `chart_fb_${Date.now()}`,
          rating: fbRating,
          comment: fbComment,
        }),
      });
      setFbSubmitted(true);
    } catch { /* best-effort */ }
    setFbSubmitting(false);
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(birthToPayload(birth)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '请求失败');
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const { chart, strength, structure, yongShen, fortune, climate } = result || {};

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">排盘</h1>
      </div>

      {/* Birth form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">出生信息</CardTitle>
        </CardHeader>
        <CardContent>
          <BirthForm value={birth} onChange={setBirth} />
          <Button onClick={submit} disabled={loading} className="mt-4 w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                排盘中...
              </>
            ) : (
              '开始排盘'
            )}
          </Button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <>
          {/* BaziChart — Four Pillars */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">四柱八字</CardTitle>
              <CardDescription>
                {chart?.dayMaster?.stem}
                {chart?.dayMaster?.wuxing}日主 · {structure?.pattern}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chart && <BaziChart data={chart} />}
            </CardContent>
          </Card>

          {/* WuXing Balance */}
          {chart?.wuxingCounts && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">五行平衡</CardTitle>
                <CardDescription>八字中各五行元素的分布状态</CardDescription>
              </CardHeader>
              <CardContent>
                <WuXingBalance wuxingCounts={chart.wuxingCounts} yongShen={yongShen} />
              </CardContent>
            </Card>
          )}

          {/* WuXing Donut Chart */}
          {chart?.wuxingCounts && (
            <WuXingDonut wuxingCounts={chart.wuxingCounts} />
          )}

          {/* WuXing Radar */}
          {chart?.wuxingCounts && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">五行能量雷达</CardTitle>
                <CardDescription>五行能量分布雷达图</CardDescription>
              </CardHeader>
              <CardContent>
                <WuxingRadar scores={chart.wuxingCounts} />
              </CardContent>
            </Card>
          )}

          {/* Strength + Structure side by side */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">旺衰</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row label="评分" value={`${strength?.score} 分`} />
                <Row label="等级" value={strength?.level} highlight />
                <Row label="判断" value={strength?.label} />
                {strength?.summary && (
                  <p className="pt-2 text-xs text-muted-foreground leading-relaxed">{strength.summary}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">格局</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row label="主格" value={structure?.pattern} highlight />
                <Row label="子格" value={structure?.subPattern || '-'} />
                <Row label="十神" value={structure?.shiShen || '-'} />
                <Row label="喜忌" value={structure?.isFavorable ? '为喜' : '为忌'} />
              </CardContent>
            </Card>
          </div>

          {/* YongShen details */}
          {yongShen && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">用神体系</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row label="用神" value={yongShen?.yongShen?.wuxing} highlight />
                <Row
                  label="喜神"
                  value={yongShen?.xiShen?.map((x: { wuxing: string }) => x.wuxing).join('、')}
                />
                <Row
                  label="忌神"
                  value={yongShen?.jiShen?.map((x: { wuxing: string }) => x.wuxing).join('、')}
                />
              </CardContent>
            </Card>
          )}

          {/* Climate + Fortune */}
          <div className="grid grid-cols-2 gap-4">
            {climate && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">调候</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Row label="是否需要" value={climate?.needsAdjustment ? '需要' : '无需'} />
                  <Row label="所需五行" value={climate?.neededWuxing || '—'} highlight />
                  <Row label="状态" value={climate?.condition || '—'} />
                </CardContent>
              </Card>
            )}

            {fortune && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">综合运势</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <Row label="评分" value={`${fortune?.overall?.score} 分`} highlight />
                  <Row label="等级" value={fortune?.overall?.level} />
                  <Row label="最佳领域" value={fortune?.overall?.bestDimension || '—'} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* DaYun Timeline */}
          {fortune && fortune.lifePeriods && fortune.lifePeriods.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">大运走势</CardTitle>
                <CardDescription>十年一步大运，滑动查看</CardDescription>
              </CardHeader>
              <CardContent>
                <DayunTimeline
                  periods={fortune.lifePeriods}
                  currentAge={new Date().getFullYear() - birth.year}
                />
              </CardContent>
            </Card>
          )}

          {/* Feedback form */}
          <Card className="border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">这份分析如何？</CardTitle>
            </CardHeader>
            <CardContent>
              {fbSubmitted ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  感谢反馈！
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[
                      { key: 'good', label: '很准 ✓' },
                      { key: 'ok', label: '一般' },
                      { key: 'bad', label: '不准' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setFbRating(opt.key)}
                        disabled={fbSubmitting}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                          fbRating === opt.key
                            ? 'border-destiny-600 bg-destiny-950/40 text-destiny-400'
                            : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <Input
                    value={fbComment}
                    onChange={(e) => setFbComment(e.target.value)}
                    placeholder="哪里最有帮助？（选填）"
                    disabled={fbSubmitting}
                    className="h-8 text-sm"
                  />
                  <Button
                    onClick={submitFeedback}
                    disabled={!fbRating || fbSubmitting}
                    size="sm"
                    className="w-full"
                  >
                    {fbSubmitting ? '提交中...' : '提交反馈'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-destiny-400' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}

// ---- WuXing Donut Chart ----

const wuxingColors: Record<string, string> = { '木': '#22c55e', '火': '#ef4444', '土': '#eab308', '金': '#a1a1aa', '水': '#3b82f6' };
const wuxingOrder = ['木', '火', '土', '金', '水'] as const;

function WuXingDonut({ wuxingCounts }: { wuxingCounts: Record<string, number> }) {
  const total = wuxingOrder.reduce((s, w) => s + (wuxingCounts[w] || 0), 0);
  if (total === 0) return null;

  const cx = 100, cy = 100, outerR = 95, innerR = 60;
  let startAngle = -Math.PI / 2; // start from top

  const segments = wuxingOrder.map((wx) => {
    const count = wuxingCounts[wx] || 0;
    const pct = Math.round((count / total) * 100);
    const angle = (count / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const segment = { wx, count, pct, startAngle, endAngle, midAngle: (startAngle + endAngle) / 2 };
    startAngle = endAngle;
    return segment;
  });

  function arcPath(a1: number, a2: number, r: number): string {
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const large = a2 - a1 > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">五行能量分布</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <svg width={200} height={200} viewBox="0 0 200 200">
          {segments.map((seg) => (
            <path
              key={seg.wx}
              d={`${arcPath(seg.startAngle, seg.endAngle, outerR)} L ${cx + innerR * Math.cos(seg.endAngle)} ${cy + innerR * Math.sin(seg.endAngle)} ${arcPath(seg.endAngle, seg.startAngle, innerR)} Z`}
              fill={wuxingColors[seg.wx]}
              opacity={0.85}
              stroke="hsl(240 6% 10%)"
              strokeWidth={1.5}
            />
          ))}
          {/* Labels on large segments */}
          {segments.map((seg) => {
            if (seg.pct <= 15) return null;
            const labelR = (innerR + outerR) / 2;
            const lx = cx + labelR * Math.cos(seg.midAngle);
            const ly = cy + labelR * Math.sin(seg.midAngle);
            return (
              <text key={`lbl-${seg.wx}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={11} fontWeight={600}>
                {seg.wx}
              </text>
            );
          })}
          {/* Center hole */}
          <circle cx={cx} cy={cy} r={innerR} fill="hsl(240 6% 10%)" />
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 text-xs">
          {segments.map((seg) => (
            <div key={`leg-${seg.wx}`} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: wuxingColors[seg.wx] }} />
              <span className="text-zinc-400">{seg.wx}</span>
              <span className="text-zinc-500 tabular-nums">{seg.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
