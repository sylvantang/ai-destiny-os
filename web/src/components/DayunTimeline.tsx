'use client';
import { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Period { startAge: number; pillar: string; years: number[]; summary: string; }

export function DayunTimeline({ periods, currentAge = 0 }: { periods: Period[]; currentAge?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const idx = periods.findIndex(p => currentAge >= p.startAge && currentAge < p.startAge + 10);
    if (idx >= 0) ref.current.children[idx]?.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
  }, [periods, currentAge]);

  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });

  return (
    <div className="relative">
      <button onClick={()=>scroll(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 rounded-full p-1 border"><ChevronLeft size={16}/></button>
      <div ref={ref} className="flex gap-3 overflow-x-auto scrollbar-hide py-4 px-8 snap-x">
        {periods.map((p, i) => (
          <div key={i} className={`snap-center shrink-0 w-32 rounded-lg border p-3 text-center transition-colors ${currentAge>=p.startAge&&currentAge<p.startAge+10?'bg-primary/10 border-primary':'bg-card'}`}>
            <div className="text-lg font-bold">{p.pillar}</div>
            <div className="text-xs text-muted-foreground">{p.startAge}-{p.startAge+9}岁</div>
            <div className="text-xs mt-1 truncate">{p.summary}</div>
          </div>
        ))}
      </div>
      <button onClick={()=>scroll(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 rounded-full p-1 border"><ChevronRight size={16}/></button>
    </div>
  );
}
