'use client';
import { useState, useEffect } from 'react';
import { X, Save, TestTube, Check } from 'lucide-react';

interface Cfg { provider:string; model:string; apiKey:string; baseURL:string; temperature:number; systemPrompt:string; }
const DEF: Cfg = { provider:'deepseek', model:'deepseek-chat', apiKey:'', baseURL:'', temperature:0.7, systemPrompt:'' };

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [cfg, setCfg] = useState<Cfg>(DEF);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem('ai-model-config');
      if (s) setCfg(JSON.parse(s) as Cfg);
      void fetchModels(cfg.provider);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchModels = async (p: string) => {
    try {
      const r = await fetch(`/api/chat?provider=${p}`);
      const d = await r.json() as { models?: string[] };
      setModels(d.models || []);
      if (d.models?.[0]) setCfg(c => ({ ...c, model: d.models![0] }));
    } catch { /* ignore */ }
  };

  const save = () => { localStorage.setItem('ai-model-config', JSON.stringify(cfg)); onClose(); };
  const test = async () => {
    setTesting(true); setTestOk(null);
    try {
      const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages:[{role:'user',content:'测试'}], userConfig:cfg, birth:{year:1990,month:1,day:1,hour:12,gender:'男'} }) });
      setTestOk(r.ok);
    } catch { setTestOk(false); }
    setTesting(false);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border shadow-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">AI 模型配置</h2>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X size={20}/></button>
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-medium mb-1">供应商</label>
          <select value={cfg.provider} onChange={e=>{setCfg(c=>({...c,provider:e.target.value}));void fetchModels(e.target.value);}} className="w-full rounded border bg-input px-3 py-2">
            {['deepseek','openai','anthropic','google','moonshot','qwen','glm','ollama'].map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <label className="block text-sm font-medium mb-1">模型</label>
          <select value={cfg.model} onChange={e=>setCfg(c=>({...c,model:e.target.value}))} className="w-full rounded border bg-input px-3 py-2">
            {models.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <label className="block text-sm font-medium mb-1">API Key</label>
          <input type="password" value={cfg.apiKey} onChange={e=>setCfg(c=>({...c,apiKey:e.target.value}))} className="w-full rounded border bg-input px-3 py-2"/>
          <label className="block text-sm font-medium mb-1">Base URL</label>
          <input value={cfg.baseURL} onChange={e=>setCfg(c=>({...c,baseURL:e.target.value}))} className="w-full rounded border bg-input px-3 py-2"/>
          <label className="block text-sm font-medium mb-1">Temperature: {cfg.temperature.toFixed(1)}</label>
          <input type="range" min="0" max="1" step="0.1" value={cfg.temperature} onChange={e=>setCfg(c=>({...c,temperature:parseFloat(e.target.value)}))} className="w-full"/>
          <div className="flex gap-2 pt-4 border-t">
            <button onClick={()=>void test()} disabled={testing||!cfg.apiKey} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded border bg-muted">
              <TestTube size={16}/> {testing?'测试中...':'测试连接'}
              {testOk===true&&<Check className="text-green-500"/>} {testOk===false&&<span className="text-red-500">失败</span>}
            </button>
            <button onClick={save} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground"><Save size={16}/> 保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}
