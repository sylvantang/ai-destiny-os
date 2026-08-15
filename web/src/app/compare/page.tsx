'use client';

import { useState } from 'react';
import { BirthForm, birthToPayload, defaultBirth, type BirthInfo } from '../_components/BirthForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface CompareSide {
  dayMaster?: string;
  strength?: { level?: string; score?: number };
  structure?: { pattern?: string; favorable?: boolean };
  yongShen?: { wuxing?: string; shiShen?: string };
  fortune?: { level?: string; score?: number };
}

interface CompareResult {
  compatibility?: { wuxing?: string; yongShen?: string };
  self?: CompareSide;
  other?: CompareSide;
}

export default function ComparePage() {
  const [self, setSelf] = useState<BirthInfo>({ ...defaultBirth });
  const [other, setOther] = useState<BirthInfo>({ ...defaultBirth, year: 1995, month: 3, day: 15, hour: 14, minute: 0, gender: '女' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          self: birthToPayload(self),
          other: birthToPayload(other),
        }),
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

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold tracking-tight">合盘</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">本人</CardTitle></CardHeader>
          <CardContent><BirthForm value={self} onChange={setSelf} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">对方</CardTitle></CardHeader>
          <CardContent><BirthForm value={other} onChange={setOther} /></CardContent>
        </Card>
      </div>

      <Button onClick={submit} disabled={loading} className="w-full">
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />合盘中...</> : '开始合盘'}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">合盘结果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-semibold text-destiny-400 mb-1">五行</div>
                <div className="text-muted-foreground">{result.compatibility?.wuxing}</div>
              </div>
              <div>
                <div className="font-semibold text-destiny-400 mb-1">用神</div>
                <div className="text-muted-foreground">{result.compatibility?.yongShen}</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['self', 'other'] as const).map((key) => {
              const d = result[key];
              const label = key === 'self' ? '本人' : '对方';
              return (
                <Card key={key}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <Row label="日主" value={d?.dayMaster} />
                    <Row label="旺衰" value={`${d?.strength?.level}（${d?.strength?.score}分）`} highlight />
                    <Row label="格局" value={d?.structure?.pattern} />
                    <Row label="喜忌" value={d?.structure?.favorable ? '喜' : '忌'} />
                    <Row label="用神" value={`${d?.yongShen?.wuxing}（${d?.yongShen?.shiShen}）`} highlight />
                    <Row label="运势" value={`${d?.fortune?.level}（${d?.fortune?.score}分）`} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-destiny-400' : ''}`}>{value || '—'}</span>
    </div>
  );
}
