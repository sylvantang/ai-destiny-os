'use client';

import { useState } from 'react';
import { BirthForm, birthToPayload, defaultBirth, type BirthInfo } from '../_components/BirthForm';
import { Card, Row } from '../_components/Card';

export default function ChartPage() {
  const [birth, setBirth] = useState<BirthInfo>({ ...defaultBirth });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true); setError(''); setResult(null);
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

  const { chart, strength, structure, yongShen, fortune, climate, relations } = result || {};

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>排盘</h1>

      <Card title="出生信息">
        <BirthForm value={birth} onChange={setBirth} />
        <button onClick={submit} disabled={loading} style={btnStyle}>
          {loading ? '排盘中...' : '开始排盘'}
        </button>
        {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
      </Card>

      {result && (
        <>
          <Card title="四柱八字">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              {['年柱', '月柱', '日柱', '时柱'].map((label, i) => {
                const key = ['year', 'month', 'day', 'hour'][i];
                const p = chart?.pillars?.[key];
                return (
                  <div key={label} style={{ background: '#f9f6f0', borderRadius: 6, padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#999' }}>{label}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#b45309' }}>{p?.stem}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{p?.branch}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.95rem' }}>
              日主：<strong>{chart?.dayMaster?.stem}{chart?.dayMaster?.wuxing}</strong>
            </div>
          </Card>

          <Card title="旺衰">
            <Row label="评分" value={`${strength?.score} 分`} />
            <Row label="等级" value={strength?.level} />
            <Row label="判断" value={strength?.label} />
          </Card>

          <Card title="格局">
            <Row label="主格" value={structure?.pattern} />
            <Row label="子格" value={structure?.subPattern} />
            <Row label="十神" value={structure?.shiShen} />
            <Row label="是否为喜" value={structure?.isFavorable ? '是' : '否'} />
          </Card>

          <Card title="用神">
            <Row label="用神" value={yongShen?.yongShen?.wuxing || yongShen?.yongShen} />
            <Row label="喜神" value={yongShen?.xiShen?.wuxing || yongShen?.xiShen} />
            <Row label="忌神" value={yongShen?.jiShen?.wuxing || yongShen?.jiShen} />
          </Card>

          {climate && (
            <Card title="气候调候">
              <Row label="是否需要" value={climate?.needsAdjustment ? '是' : '否'} />
              <Row label="所需五行" value={climate?.neededWuxing || '-'} />
              <Row label="优先级" value={climate?.priority || '-'} />
            </Card>
          )}

          <Card title="运势">
            <Row label="综合评分" value={`${fortune?.overall?.score} 分`} />
            <Row label="运势等级" value={fortune?.overall?.level} />
            {fortune?.keyYears?.length > 0 && (
              <>
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#888' }}>关键年份</div>
                {fortune.keyYears.slice(0, 5).map((y: any) => (
                  <Row key={y.year} label={`${y.year}年`} value={`${y.level}（${y.score}分）`} />
                ))}
              </>
            )}
          </Card>

          {relations && (
            <Card title="十神关系">
              <Row label="主调" value={relations?.theme} />
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#555', lineHeight: 1.7 }}>{relations?.summary}</div>
            </Card>
          )}

          {result.visualization && (
            <Card title="排盘">
              <pre style={{ fontSize: '0.8rem', lineHeight: 1.4, overflow: 'auto', background: '#f9f6f0', padding: '0.75rem', borderRadius: 4 }}>
                {result.visualization}
              </pre>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  marginTop: '1rem', padding: '0.6rem 2rem',
  background: '#b45309', color: '#fff', border: 'none',
  borderRadius: 4, fontSize: '0.95rem', cursor: 'pointer',
};
