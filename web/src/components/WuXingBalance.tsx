'use client';

// ---- Five Elements config ----
const WUXING_CONFIG: Record<string, { label: string; bar: string; glow: string; text: string }> = {
  木: { label: '木', bar: 'bg-emerald-500', glow: 'shadow-[0_0_8px_rgba(74,222,128,0.4)]', text: 'text-emerald-400' },
  火: { label: '火', bar: 'bg-red-500', glow: 'shadow-[0_0_8px_rgba(248,113,113,0.4)]', text: 'text-red-400' },
  土: { label: '土', bar: 'bg-amber-500', glow: 'shadow-[0_0_8px_rgba(251,191,36,0.4)]', text: 'text-amber-400' },
  金: { label: '金', bar: 'bg-stone-400', glow: 'shadow-[0_0_8px_rgba(245,245,244,0.3)]', text: 'text-stone-300' },
  水: { label: '水', bar: 'bg-blue-500', glow: 'shadow-[0_0_8px_rgba(96,165,250,0.4)]', text: 'text-blue-400' },
};

const WUXING_ORDER = ['木', '火', '土', '金', '水'] as const;

interface WuxingCounts {
  [key: string]: number;
}

interface YongShenData {
  yongShen?: { wuxing: string; shiShen?: string; reason?: string };
  xiShen?: Array<{ wuxing: string; reason?: string }>;
  jiShen?: Array<{ wuxing: string; reason?: string }>;
  summary?: string;
}

interface WuXingBalanceProps {
  wuxingCounts: WuxingCounts;
  yongShen?: YongShenData;
  /** Max count for scaling bars (defaults to max in data) */
  maxCount?: number;
}

export function WuXingBalance({ wuxingCounts, yongShen, maxCount }: WuXingBalanceProps) {
  const yongWuxing = yongShen?.yongShen?.wuxing;
  const xiWuxings = new Set(yongShen?.xiShen?.map((x) => x.wuxing) ?? []);
  const jiWuxings = new Set(yongShen?.jiShen?.map((x) => x.wuxing) ?? []);

  const max = maxCount ?? Math.max(...Object.values(wuxingCounts), 1);

  return (
    <div className="space-y-4">
      {/* Bars */}
      <div className="space-y-3">
        {WUXING_ORDER.map((wx) => {
          const count = wuxingCounts[wx] ?? 0;
          const pct = Math.round((count / max) * 100);
          const cfg = WUXING_CONFIG[wx]!;
          const isYong = wx === yongWuxing;
          const isXi = xiWuxings.has(wx);
          const isJi = jiWuxings.has(wx);

          return (
            <div key={wx} className="space-y-1">
              {/* Label row */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${cfg.text}`}>{cfg.label}</span>
                  {isYong && (
                    <span className="px-1.5 py-px rounded-full bg-purple-900/60 text-purple-400 text-[10px] font-medium">
                      用神
                    </span>
                  )}
                  {isXi && !isYong && (
                    <span className="px-1.5 py-px rounded-full bg-cyan-900/60 text-cyan-400 text-[10px] font-medium">
                      喜神
                    </span>
                  )}
                  {isJi && (
                    <span className="px-1.5 py-px rounded-full bg-red-900/40 text-red-400/70 text-[10px]">
                      忌
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground tabular-nums">{count}</span>
              </div>

              {/* Bar */}
              <div className="relative h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.bar} ${
                    isYong || isXi ? cfg.glow : ''
                  } ${isYong ? 'ring-1 ring-purple-500/50' : ''} ${isXi && !isYong ? 'ring-1 ring-cyan-500/30' : ''}`}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* YongShen summary */}
      {yongShen?.summary && (
        <div className="pt-2 border-t border-[hsl(var(--border))]">
          <p className="text-xs text-muted-foreground leading-relaxed">{yongShen.summary}</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500/60" />
          用神 — 最有利
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/60" />
          喜神 — 次有利
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
          忌神 — 不利
        </div>
      </div>
    </div>
  );
}
