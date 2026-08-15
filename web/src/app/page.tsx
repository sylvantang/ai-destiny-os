'use client';

import { useState, useRef, useEffect } from 'react';
import { BirthForm, birthToPayload, defaultBirth, type BirthInfo } from './_components/BirthForm';
import { BaziChart } from '@/components/BaziChart';
import { WuxingRadar } from '@/components/WuxingRadar';
import { DayunTimeline } from '@/components/DayunTimeline';
import { SettingsModal } from '@/components/SettingsModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Settings, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { consumeDataStream } from '@/lib/ai/parse-stream';

// ---- API result types (mirror /api/chart response) ----

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
  visualization?: string;
}

interface ChatMessage {
  role: 'user' | 'agent';
  text: string;
  streaming?: boolean;
}

function chartContextText(r: ChartApiResult): string {
  const parts = [
    `日主：${r.chart?.dayMaster?.stem || ''}${r.chart?.dayMaster?.wuxing || ''}`,
    `格局：${r.structure?.pattern || ''}`,
    `旺衰：${r.strength?.level || ''}`,
    `用神：${r.yongShen?.yongShen?.wuxing || ''}`,
    `喜神：${(r.yongShen?.xiShen || []).map((x) => x.wuxing).join('、')}`,
    `大运：${(r.fortune?.lifePeriods || []).slice(0, 3).map((p) => p.pillar).join(' → ')}`,
  ];
  return parts.join('，');
}

export default function HomePage() {
  const [birth, setBirth] = useState<BirthInfo>({ ...defaultBirth });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChartApiResult | null>(null);
  const [error, setError] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to results after charting
  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(birthToPayload(birth)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '请求失败');
      setResult(data);
      setShowChat(false);
      setChatMessages([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy || !result) return;
    setChatInput('');
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', text },
      { role: 'agent', text: '', streaming: true },
    ]);
    setChatBusy(true);

    let config: Record<string, unknown> = {};
    try {
      const saved = localStorage.getItem('ai-model-config');
      if (saved) config = JSON.parse(saved) as Record<string, unknown>;
    } catch {
      /* ignore corrupted config */
    }

    const controller = new AbortController();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: chartContextText(result) },
            { role: 'user', content: text },
          ],
          birth: birthToPayload(birth),
          userConfig: config,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          if (err && typeof err.error === 'string') msg = err.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      if (!res.body) throw new Error('No response body');

      let failed = false;
      const outcome = await consumeDataStream(res.body, {
        onText: (delta) => {
          setChatMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'agent' && last.streaming) {
              last.text += delta;
            }
            return updated;
          });
        },
        onError: () => {
          failed = true;
        },
      });
      failed = failed || outcome.hadError;

      setChatMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'agent' && last.streaming) {
          last.streaming = false;
          if (failed && !last.text.trim()) last.text = '连接出现问题，请重试';
        }
        return updated;
      });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setChatMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'agent' && last.streaming) {
          last.streaming = false;
          last.text = `连接失败: ${e instanceof Error ? e.message : String(e)}`;
        }
        return updated;
      });
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header + settings gear */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">AI Destiny OS</h1>
          <p className="text-xs text-muted-foreground mt-0.5">基于千年命理算法的八字分析引擎，为你解读命运的密码</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          title="模型设置"
          className="p-2 rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Birth form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">出生信息</CardTitle>
          <CardDescription>输入出生时间，生成专属八字命盘和 AI 分析报告</CardDescription>
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

      {/* Results */}
      {result && (
        <div ref={resultsRef} className="space-y-4 scroll-mt-6">
          {/* Four pillars */}
          {result.chart && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">四柱八字</CardTitle>
                <CardDescription>
                  {result.chart.dayMaster?.stem}
                  {result.chart.dayMaster?.wuxing}日主 · {result.structure?.pattern || ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BaziChart data={result.chart} />
              </CardContent>
            </Card>
          )}

          {/* Wuxing radar */}
          {result.chart?.wuxingCounts && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">五行能量雷达</CardTitle>
                <CardDescription>五行能量分布雷达图</CardDescription>
              </CardHeader>
              <CardContent>
                <WuxingRadar scores={result.chart.wuxingCounts} />
              </CardContent>
            </Card>
          )}

          {/* Dayun timeline */}
          {result.fortune && result.fortune.lifePeriods && result.fortune.lifePeriods.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">大运走势</CardTitle>
                <CardDescription>十年一步大运，滑动查看</CardDescription>
              </CardHeader>
              <CardContent>
                <DayunTimeline
                  periods={result.fortune.lifePeriods}
                  currentAge={new Date().getFullYear() - birth.year}
                />
              </CardContent>
            </Card>
          )}

          {/* Chart text */}
          {result.visualization && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">命盘文本</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground font-mono">
                  {result.visualization}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Chat section (collapsed by default) */}
          <Card>
            <button
              onClick={() => setShowChat(!showChat)}
              className="flex w-full items-center justify-between px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-medium">与 AI 命理师对话</span>
              {showChat ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showChat && (
              <CardContent className="space-y-3">
                <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                  {chatMessages.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      命盘上下文已自动注入，直接提问即可（如：我的性格特点、今年运势、适合的行业）。
                    </p>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          m.role === 'user'
                            ? 'bg-destiny-600 text-white rounded-br-md'
                            : 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-bl-md'
                        }`}
                      >
                        {m.text || (m.streaming ? '思考中...' : '')}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChat();
                      }
                    }}
                    placeholder="问事业、感情、财运、健康..."
                    disabled={chatBusy}
                    className="flex-1"
                  />
                  <Button onClick={sendChat} disabled={chatBusy || !chatInput.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          <p className="text-[10px] text-muted-foreground text-center">
            AI 命理分析仅供参考，不构成人生决策依据
          </p>
        </div>
      )}

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
