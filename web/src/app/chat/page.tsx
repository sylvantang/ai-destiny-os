'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BirthForm, birthToPayload, defaultBirth, type BirthInfo } from '../_components/BirthForm';
import { Send, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

// ---- Types ----

interface Message {
  role: 'user' | 'agent';
  text: string;
  topic?: string;
  isStreaming?: boolean;
}

interface ChartContext {
  dayMaster: { name: string; wuxing: string };
  pattern: string;
  strength: string;
  fortune: string;
}

const WUXING_COLORS: Record<string, string> = {
  木: 'text-wood dark:text-green-400',
  火: 'text-fire dark:text-red-400',
  土: 'text-earth dark:text-yellow-400',
  金: 'text-metal-dark dark:text-stone-300',
  水: 'text-water dark:text-blue-400',
};

// ---- Helper ----

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// ---- Component ----

export default function ChatPage() {
  const [birth, setBirth] = useState<BirthInfo>({ ...defaultBirth });
  const [showBirth, setShowBirth] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'thinking' | 'streaming'>('idle');
  const [chartCtx, setChartCtx] = useState<ChartContext | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Create session on first load
  useEffect(() => {
    const createSession = async () => {
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(birthToPayload(birth)),
        });
        if (res.ok) {
          const data = await res.json();
          setSessionId(data.sessionId);
        }
      } catch { /* best-effort */ }
    };
    createSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || status !== 'idle') return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setStatus('thinking');

    // Add placeholder for streaming agent response
    setMessages((prev) => [...prev, { role: 'agent', text: '', isStreaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          birth: birthToPayload(birth),
          sessionId,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const raw = trimmed.slice(6);

          try {
            const event = JSON.parse(raw);

            if (event.type === 'chart') {
              setChartCtx(event);
            } else if (event.type === 'status') {
              if (event.status === 'thinking') {
                setStatus('thinking');
              }
            } else if (event.type === 'token') {
              setStatus('streaming');
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'agent' && last.isStreaming) {
                  last.text += event.content;
                }
                return updated;
              });
            } else if (event.type === 'done') {
              setStatus('idle');
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'agent' && last.isStreaming) {
                  last.isStreaming = false;
                  last.topic = event.topic;
                }
                return updated;
              });
            } else if (event.type === 'error') {
              setStatus('idle');
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'agent' && last.isStreaming) {
                  last.text = `[错误] ${event.error}`;
                  last.isStreaming = false;
                }
                return updated;
              });
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setStatus('idle');
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'agent' && last.isStreaming) {
          last.text = `[错误] ${err.message}`;
          last.isStreaming = false;
        }
        return updated;
      });
    }
  }, [input, status, birth, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setStatus('idle');
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === 'agent' && last.isStreaming) {
        last.isStreaming = false;
        if (!last.text) last.text = '[已中断]';
      }
      return updated;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Chart context bar */}
      {chartCtx && (
        <div className="flex items-center gap-3 px-4 py-2 mb-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs">
          <span className="text-muted-foreground">命盘</span>
          <span className={cn('font-semibold', WUXING_COLORS[chartCtx.dayMaster.wuxing] ?? '')}>
            {chartCtx.dayMaster.name}
            {chartCtx.dayMaster.wuxing}日主
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="text-muted-foreground">{chartCtx.pattern}</span>
          <span className="h-3 w-px bg-border" />
          <span className="text-muted-foreground">日主{chartCtx.strength}</span>
          <span className="h-3 w-px bg-border" />
          <span className="text-muted-foreground">运势{chartCtx.fortune}</span>
        </div>
      )}

      {/* Birth info collapsible */}
      <Card className="mb-3">
        <button
          onClick={() => setShowBirth(!showBirth)}
          className="flex w-full items-center justify-between px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>出生信息</span>
          {showBirth ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showBirth && (
          <CardContent className="pb-4">
            <BirthForm value={birth} onChange={setBirth} />
          </CardContent>
        )}
      </Card>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-full bg-destiny-900/30 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-destiny-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">AI 命理师</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              输入你的问题，AI 命理师为你解读八字、运势、事业、感情等人生课题
            </p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {['我的性格特点是什么？', '今年运势如何？', '我适合什么行业？', '帮我排盘看看'].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-xs rounded-full border border-[hsl(var(--border))] hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'bg-destiny-600 text-white rounded-br-md'
                  : 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-bl-md',
              )}
            >
              {/* Tool-loading indicator */}
              {m.role === 'agent' && m.isStreaming && m.text === '' && status === 'thinking' && (
                <div className="flex items-center gap-2 text-muted-foreground animate-pulse-glow">
                  <span className="text-base">🔮</span>
                  <span>正在为您排盘推演...</span>
                </div>
              )}

              {/* Message text */}
              <div className="whitespace-pre-wrap break-words">
                {m.text}
                {m.role === 'agent' && m.isStreaming && m.text !== '' && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-destiny-400 animate-pulse align-text-bottom" />
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Inline thinking indicator — shown when first thinking then disappears on first token */}
        {status === 'thinking' && messages.length === 0 && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm text-muted-foreground animate-pulse-glow">
              <span className="text-base">🔮</span>
              <span>正在为您排盘推演...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input area — pinned to bottom */}
      <div className="pt-3 border-t border-[hsl(var(--border))] mt-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="问事业、感情、财运、健康..."
            disabled={status === 'streaming' || status === 'thinking'}
            className="flex-1"
          />
          {status === 'streaming' || status === 'thinking' ? (
            <Button variant="outline" onClick={stopStreaming}>
              中断
            </Button>
          ) : (
            <Button onClick={send} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          AI 命理分析仅供参考，不构成人生决策依据
        </p>
      </div>
    </div>
  );
}
