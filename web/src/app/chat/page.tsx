'use client';

import { useState, useRef, useEffect } from 'react';
import { BirthForm, birthToPayload, defaultBirth, type BirthInfo } from '../_components/BirthForm';
import { Card } from '../_components/Card';

interface Message {
  role: 'user' | 'agent';
  text: string;
}

export default function ChatPage() {
  const [birth, setBirth] = useState<BirthInfo>({ ...defaultBirth });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, birth: birthToPayload(birth) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '请求失败');
      setMessages(prev => [...prev, { role: 'agent', text: data.text }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'agent', text: `[错误] ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>聊天</h1>

      <Card title="出生信息">
        <BirthForm value={birth} onChange={setBirth} />
      </Card>

      <Card title="对话">
        <div style={{ minHeight: 300, maxHeight: 500, overflow: 'auto', marginBottom: '0.75rem' }}>
          {messages.length === 0 && (
            <p style={{ color: '#aaa', textAlign: 'center', paddingTop: '3rem' }}>
              输入你的问题，开始解命
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                marginBottom: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 6,
                background: m.role === 'user' ? '#f0f4ff' : '#f9f6f0',
                borderLeft: `3px solid ${m.role === 'user' ? '#48b' : '#b45309'}`,
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#999', marginBottom: '0.25rem' }}>
                {m.role === 'user' ? '你' : '命理AI'}
              </div>
              <div style={{ fontSize: '0.9rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{m.text}</div>
            </div>
          ))}
          {loading && <p style={{ color: '#aaa', fontSize: '0.85rem' }}>命理AI正在推算...</p>}
          <div ref={endRef} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="问事业、感情、财运、健康..."
            disabled={loading}
            style={{
              flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #d5d5d5',
              borderRadius: 4, fontSize: '0.95rem',
            }}
          />
          <button onClick={send} disabled={loading} style={btnStyle}>
            {loading ? '...' : '发送'}
          </button>
        </div>
      </Card>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  background: '#b45309', color: '#fff', border: 'none',
  borderRadius: 4, fontSize: '0.95rem', cursor: 'pointer',
};
