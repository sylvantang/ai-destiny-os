'use client';

// ---- Five Elements color mapping ----
const WUXING_STYLE: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  木: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-700', glow: 'shadow-[0_0_12px_rgba(74,222,128,0.15)]' },
  火: { bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-700', glow: 'shadow-[0_0_12px_rgba(248,113,113,0.15)]' },
  土: { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-700', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.15)]' },
  金: { bg: 'bg-stone-800/40', text: 'text-stone-300', border: 'border-stone-600', glow: 'shadow-[0_0_12px_rgba(245,245,244,0.10)]' },
  水: { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-700', glow: 'shadow-[0_0_12px_rgba(96,165,250,0.15)]' },
};

interface StemBranch {
  name: string;
  wuxing: string;
  yinYang?: string;
}

interface PillarData {
  stem: StemBranch;
  branch: StemBranch;
  shiShen?: string;
  nayin?: string;
  hiddenStems?: { name: string; wuxing: string }[];
}

interface ChartData {
  pillars: {
    year: PillarData;
    month: PillarData;
    day: PillarData;
    hour: PillarData;
  };
  pillarLabels?: Record<string, string>;
  dayMaster: { stem: string; wuxing: string };
}

const PILLAR_ORDER = ['year', 'month', 'day', 'hour'] as const;
const PILLAR_LABELS: Record<string, string> = {
  year: '年柱', month: '月柱', day: '日柱', hour: '时柱',
};
const PILLAR_SUBTITLES: Record<string, string> = {
  year: '祖上·童年', month: '父母·青年', day: '自己·配偶', hour: '子女·晚年',
};

export function BaziChart({ data }: { data: ChartData }) {
  const { pillars, dayMaster, pillarLabels } = data;
  const labels = pillarLabels ?? PILLAR_LABELS;

  return (
    <div className="space-y-3">
      {/* Day Master header */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">日主</span>
        <span className={`font-bold text-lg ${WUXING_STYLE[dayMaster.wuxing]?.text ?? ''}`}>
          {dayMaster.stem}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${WUXING_STYLE[dayMaster.wuxing]?.bg ?? ''} ${WUXING_STYLE[dayMaster.wuxing]?.text ?? ''}`}>
          {dayMaster.wuxing}
        </span>
      </div>

      {/* Four Pillars grid: 2 rows x 4 cols */}
      <div className="grid grid-cols-4 gap-2">
        {PILLAR_ORDER.map((key) => {
          const p = pillars[key];
          if (!p) return null;
          return (
            <PillarCell
              key={key}
              label={labels[key] ?? key}
              subtitle={PILLAR_SUBTITLES[key] ?? ''}
              stem={p.stem}
              branch={p.branch}
              shiShen={p.shiShen}
              nayin={p.nayin}
              hiddenStems={p.hiddenStems}
              isDayMaster={key === 'day'}
            />
          );
        })}
      </div>
    </div>
  );
}

function PillarCell({
  label,
  subtitle,
  stem,
  branch,
  shiShen,
  nayin,
  hiddenStems,
  isDayMaster,
}: {
  label: string;
  subtitle: string;
  stem: StemBranch;
  branch: StemBranch;
  shiShen?: string;
  nayin?: string;
  hiddenStems?: { name: string; wuxing: string }[];
  isDayMaster?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col items-center rounded-xl border p-3 pt-4 transition-all ${
        WUXING_STYLE[stem.wuxing]?.border ?? 'border-border'
      } ${WUXING_STYLE[stem.wuxing]?.bg ?? 'bg-card'} ${
        isDayMaster ? WUXING_STYLE[stem.wuxing]?.glow ?? '' : ''
      }`}
    >
      {/* Pillar label */}
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>

      {/* ShiShen badge */}
      {shiShen && (
        <div className="text-[10px] px-1.5 py-px rounded-full bg-destiny-900/50 text-destiny-400 mb-1.5 font-medium">
          {shiShen}
        </div>
      )}

      {/* Heavenly Stem */}
      <div className={`text-xl font-bold ${WUXING_STYLE[stem.wuxing]?.text ?? ''}`}>
        {stem.name}
      </div>

      {/* Earthly Branch */}
      <div className={`text-lg font-semibold mt-0.5 ${WUXING_STYLE[branch.wuxing]?.text ?? ''}`}>
        {branch.name}
      </div>

      {/* Hidden stems */}
      {hiddenStems && hiddenStems.length > 0 && (
        <div className="flex gap-1 mt-1.5">
          {hiddenStems.map((hs, i) => (
            <span
              key={i}
              className={`text-[10px] px-1 py-px rounded ${WUXING_STYLE[hs.wuxing]?.bg ?? ''} ${WUXING_STYLE[hs.wuxing]?.text ?? ''}`}
            >
              {hs.name}
            </span>
          ))}
        </div>
      )}

      {/* Nayin */}
      {nayin && (
        <div className="text-[10px] text-muted-foreground mt-1.5 opacity-70">
          {nayin}
        </div>
      )}

      {/* Subtitle */}
      <div className="text-[10px] text-muted-foreground mt-1 opacity-50">
        {subtitle}
      </div>
    </div>
  );
}
