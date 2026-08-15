'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export function WuxingRadar({ scores, className }: { scores: Record<string, number>; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const data = ['木','火','土','金','水'].map(w => scores[w] || 0);
    const mx = Math.max(...data, 100);
    chart.setOption({
      radar: { indicator: ['木','火','土','金','水'].map(n=>({name:n,max:mx})), splitNumber:5, axisName:{color:'#94a3b8',fontSize:12}, splitLine:{lineStyle:{color:'#334155'}}, splitArea:{areaStyle:{color:['rgba(15,23,42,0.5)','rgba(30,41,59,0.5)']}} },
      series: [{ type:'radar', data:[{value:data,name:'五行能量'}], lineStyle:{width:2,color:'#22d3ee'}, areaStyle:{color:'rgba(34,211,238,0.3)'}, symbol:'circle', symbolSize:4 }],
      tooltip: { trigger:'item' }
    });
    return () => chart.dispose();
  }, [scores]);
  return <div ref={ref} className={`w-full h-64 ${className || ''}`} />;
}
