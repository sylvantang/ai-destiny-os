'use client';

import { useState } from 'react';
import { BirthForm, birthToPayload, defaultBirth, type BirthInfo } from '../_components/BirthForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BaziChart } from '@/components/BaziChart';
import { WuXingBalance } from '@/components/WuXingBalance';
import { Loader2 } from 'lucide-react';

export default function ChartPage() {
  const [birth, setBirth] = useState<BirthInfo>({ ...defaultBirth });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

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
    } catch (e: any) {
      setError(e.message);
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
              <BaziChart data={chart} />
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
                  value={yongShen?.xiShen?.map((x: any) => x.wuxing).join('、')}
                />
                <Row
                  label="忌神"
                  value={yongShen?.jiShen?.map((x: any) => x.wuxing).join('、')}
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
