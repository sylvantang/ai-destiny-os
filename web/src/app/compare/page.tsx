'use client';

import { useState } from 'react';
import { BirthForm, birthToPayload, defaultBirth, type BirthInfo } from '../_components/BirthForm';
import { Card, Row } from '../_components/Card';

export default function ComparePage() {
  const [self, setSelf] = useState<BirthInfo>({ ...defaultBirth });
  const [other, setOther] = useState<BirthInfo>({ ...defaultBirth, year: 1995, month: 3, day: 15, hour: 14, minute: 0, gender: '女' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>合盘</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <Card title="本人">
          <BirthForm value={self} onChange={setSelf} />
        </Card>
        <Card title="对方">
          <BirthForm value={other} onChange={setOther} />
        </Card>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button onClick={submit} disabled={loading} style={btnStyle}>
          {loading ? '合盘中...' : '开始合盘'}
        </button>
        {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
      </div>

      {result && (
        <>
          <Card title="合盘结果">
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 600, color: '#b45309', marginBottom: '0.25rem' }}>五行</div>
              <div style={{ fontSize: '0.95rem' }}>{result.compatibility?.wuxing}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#b45309', marginBottom: '0.25rem' }}>用神</div>
              <div style={{ fontSize: '0.95rem' }}>{result.compatibility?.yongShen}</div>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <Card title="本人">
              <Row label="日主" value={result.self?.dayMaster} />
              <Row label="旺衰" value={`${result.self?.strength?.level}（${result.self?.strength?.score}分）`} />
              <Row label="格局" value={result.self?.structure?.pattern} />
              <Row label="格局喜忌" value={result.self?.structure?.favorable ? '喜' : '忌'} />
              <Row label="用神" value={`${result.self?.yongShen?.wuxing}（${result.self?.yongShen?.shiShen}）`} />
              <Row label="运势" value={`${result.self?.fortune?.level}（${result.self?.fortune?.score}分）`} />
            </Card>
            <Card title="对方">
              <Row label="日主" value={result.other?.dayMaster} />
              <Row label="旺衰" value={`${result.other?.strength?.level}（${result.other?.strength?.score}分）`} />
              <Row label="格局" value={result.other?.structure?.pattern} />
              <Row label="格局喜忌" value={result.other?.structure?.favorable ? '喜' : '忌'} />
              <Row label="用神" value={`${result.other?.yongShen?.wuxing}（${result.other?.yongShen?.shiShen}）`} />
              <Row label="运势" value={`${result.other?.fortune?.level}（${result.other?.fortune?.score}分）`} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '0.6rem 2rem',
  background: '#b45309', color: '#fff', border: 'none',
  borderRadius: 4, fontSize: '0.95rem', cursor: 'pointer',
};
