'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BirthForm, birthToPayload, defaultBirth, type BirthInfo } from '../_components/BirthForm';
import { SettingsModal } from '@/components/SettingsModal';
import { Send, ChevronDown, ChevronUp, Sparkles, ThumbsUp, ThumbsDown, RefreshCw, AlertTriangle, Settings } from 'lucide-react';
import { consumeDataStream } from '@/lib/ai/parse-stream';

// ---- Types ----

interface Message {
  role: 'user' | 'agent';
  text: string;
  topic?: string;
  isStreaming?: boolean;
  isFallback?: boolean;
  hasError?: boolean;
  turnId?: number;
  rating?: 'up' | 'down';
}

interface ChartContext {
  dayMaster: { name: string; wuxing: string };
  pattern: string;
  strength: string;
  fortune: string;
  yongShen?: string;
  xiShen?: string[];
}

interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseURL: string;
  temperature: number;
  systemPrompt: string;
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

function loadConfig(): ModelConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('ai-model-config');
    return raw ? (JSON.parse(raw) as ModelConfig) : null;
  } catch {
    return null;
  }
}

function formatChartCtx(ctx: ChartContext): string {
  const parts = [
    `日主：${ctx.dayMaster.name}${ctx.dayMaster.wuxing}`,
    `格局：${ctx.pattern}`,
    `旺衰：${ctx.strength}`,
    `运势：${ctx.fortune}`,
  ];
  if (ctx.yongShen) parts.push(`用神：${ctx.yongShen}`);
  if (ctx.xiShen && ctx.xiShen.length > 0) parts.push(`喜神：${ctx.xiShen.join('、')}`);
  return parts.join('，');
}

// ---- Context-aware suggestions ----

function generateSuggestions(chartCtx: ChartContext | null): string[] {
  const base = [
    '我的性格特点是什么？',
    '今年运势如何？',
    '我适合什么行业？',
    '帮我排盘看看运势',
  ];

  if (!chartCtx) return base;

  const ctx = [
    `我是${chartCtx.dayMaster.wuxing}命，我的用神是什么？`,
    `${chartCtx.pattern}格局有什么特点？`,
    '未来三年我应该注意什么？',
    '我的贵人运如何？',
  ];

  if (chartCtx.yongShen) {
    ctx.push(`我的用神是${chartCtx.yongShen}，我适合去什么方向发展？`);
  }
  if (chartCtx.xiShen && chartCtx.xiShen.length > 0) {
    ctx.push(`我的喜神是${chartCtx.xiShen.join('、')}，日常应该注意什么？`);
  }

  return ctx.slice(0, 4);
}

// ---- Component ----

export default function ChatPage() {
  const [birth, setBirth] = useState<BirthInfo>({ ...defaultBirth });
  const [showBirth, setShowBirth] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'thinking' | 'streaming'>('idle');
  const [mode, setMode] = useState<'quick' | 'detail'>('quick');
  const [chartCtx, setChartCtx] = useState<ChartContext | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const turnCounter = useRef(0);
  const chartCtxRef = useRef<ChartContext | null>(null);

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

  // Build (and cache) chart context from /api/chart
  const buildChartContext = useCallback(async (b: BirthInfo): Promise<string> => {
    if (chartCtxRef.current) return formatChartCtx(chartCtxRef.current);
    const res = await fetch('/api/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(birthToPayload(b)),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const ctx: ChartContext = {
      dayMaster: {
        name: data.chart?.dayMaster?.stem ?? '?',
        wuxing: data.chart?.dayMaster?.wuxing ?? '土',
      },
      pattern: data.structure?.pattern ?? '未知',
      strength: data.strength?.level ?? '未知',
      fortune: data.fortune?.overall?.level ?? '平稳',
      yongShen: data.yongShen?.yongShen?.wuxing,
      xiShen: (data.yongShen?.xiShen ?? []).map((x: { wuxing: string }) => x.wuxing),
    };
    chartCtxRef.current = ctx;
    setChartCtx(ctx);
    return formatChartCtx(ctx);
  }, []);

  // Submit feedback
  const submitFeedback = useCallback(async (msgIndex: number, rating: 'up' | 'down') => {
    setMessages((prev) => {
      const updated = [...prev];
      if (updated[msgIndex]) {
        updated[msgIndex] = { ...updated[msgIndex], rating };
      }
      return updated;
    });

    // Persist feedback to database (fire-and-forget)
    if (sessionId) {
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            rating,
            turnId: messages[msgIndex]?.turnId,
          }),
        });
      } catch { /* best-effort */ }
    }
  }, [sessionId, messages]);

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || status !== 'idle') return;
    setInput('');
    setRetryMsg(null);
    turnCounter.current += 1;
    const currentTurn = turnCounter.current;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setStatus('thinking');

    // Add placeholder for streaming agent response
    setMessages((prev) => [...prev, {
      role: 'agent',
      text: '',
      isStreaming: true,
      turnId: currentTurn,
    }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const config = loadConfig();
      const hasKey = Boolean(config?.apiKey);
      const chartText = await buildChartContext(birth);
      const userText = mode === 'detail'
        ? `请详细分析。按以下结构依次展开：\n1. 童年与成长（0-20岁）\n2. 青年与发展（20-35岁）\n3. 中年与事业（35-50岁）\n4. 晚年与总结（50岁以上）\n5. 当前大运建议\n\n用户问题：${text}`
        : text;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: chartText },
            { role: 'user', content: userText },
          ],
          birth: birthToPayload(birth),
          userConfig: config || {},
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          if (err && typeof err.error === 'string') errMsg = err.error;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      if (!res.body) throw new Error('No response body');

      let hadError = false;
      const outcome = await consumeDataStream(res.body, {
        onText: (delta) => {
          setStatus('streaming');
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'agent' && last.isStreaming) {
              last.text += delta;
            }
            return updated;
          });
        },
        onError: () => {
          hadError = true;
        },
        onFinish: () => {
          setStatus('idle');
        },
      });
      hadError = hadError || outcome.hadError;

      setStatus('idle');
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'agent' && last.isStreaming) {
          last.isStreaming = false;
          if (hadError && !last.text.trim()) {
            last.text = hasKey ? '连接出现问题，请重试' : '请点击右上角设置按钮配置 API Key 后再提问';
            last.hasError = true;
          }
        }
        return updated;
      });
      if (hadError) setRetryMsg(text);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setStatus('idle');
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'agent' && last.isStreaming) {
          last.text = `连接失败: ${err instanceof Error ? err.message : String(err)}`;
          last.isStreaming = false;
          last.hasError = true;
        }
        return updated;
      });
      setRetryMsg(text);
    }
  }, [input, status, birth, mode, buildChartContext]);

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

  const suggestions = generateSuggestions(chartCtx);

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
              {suggestions.map((q) => (
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
          <div key={i}>
            <div
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

                {/* Error notice with retry */}
                {m.role === 'agent' && m.hasError && !m.isStreaming && (
                  <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-red-950/30 border border-red-800/40 text-red-400 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span>连接出现问题</span>
                    {retryMsg && (
                      <button
                        onClick={() => send(retryMsg)}
                        className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded bg-red-800/40 hover:bg-red-800/60 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        重试
                      </button>
                    )}
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

            {/* Feedback buttons — only on completed agent messages */}
            {m.role === 'agent' && !m.isStreaming && m.text && (
              <div className="flex items-center gap-2 mt-1 ml-1">
                <button
                  onClick={() => submitFeedback(i, 'up')}
                  className={cn(
                    'p-1 rounded transition-colors',
                    m.rating === 'up'
                      ? 'text-green-400 bg-green-950/40'
                      : 'text-muted-foreground hover:text-green-400 hover:bg-green-950/20',
                  )}
                  title="有帮助"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => submitFeedback(i, 'down')}
                  className={cn(
                    'p-1 rounded transition-colors',
                    m.rating === 'down'
                      ? 'text-red-400 bg-red-950/40'
                      : 'text-muted-foreground hover:text-red-400 hover:bg-red-950/20',
                  )}
                  title="不准确"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Inline thinking indicator */}
        {status === 'thinking' && messages.length === 0 && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm text-muted-foreground animate-pulse-glow">
              <span className="text-base">🔮</span>
              <span>正在为您排盘推演...</span>
            </div>
          </div>
        )}
      </div>

      {/* Mode toggle + Input area — pinned to bottom */}
      <div className="pt-3 border-t border-[hsl(var(--border))] mt-3">
        {/* Mode buttons + settings */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setMode('quick')}
            disabled={status !== 'idle'}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              mode === 'quick'
                ? 'border-destiny-600 bg-destiny-950/40 text-destiny-400'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            快速
          </button>
          <button
            onClick={() => setMode('detail')}
            disabled={status !== 'idle'}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              mode === 'detail'
                ? 'border-destiny-600 bg-destiny-950/40 text-destiny-400'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            详细
          </button>
          <button
            onClick={() => setShowSettings(true)}
            title="模型设置"
            className="ml-auto p-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

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
            <Button onClick={() => send()} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          AI 命理分析仅供参考，不构成人生决策依据
        </p>
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
