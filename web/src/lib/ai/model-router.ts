// ============================================================
// AI Destiny OS — Multi-model router (AI SDK).
// ============================================================

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

export type Provider = 'openai'|'anthropic'|'google'|'deepseek'|'moonshot'|'qwen'|'glm'|'ollama'|'baichuan'|'minimax'|'doubao'|'hunyuan'|'spark';

type ModelFn = (model: string) => LanguageModel;

const factories: Record<Provider, (key: string, base?: string) => ModelFn> = {
  openai: (k, b) => { const o = createOpenAI({ apiKey: k, baseURL: b }); return (m) => o(m); },
  anthropic: (k) => { const o = createAnthropic({ apiKey: k }); return (m) => o(m) as never; },
  google: (k) => { const o = createGoogleGenerativeAI({ apiKey: k }); return (m) => o(m) as never; },
  deepseek: (k, b) => { const o = createOpenAI({ apiKey: k, baseURL: b || 'https://api.deepseek.com' }); return (m) => o(m); },
  moonshot: (k) => { const o = createOpenAI({ apiKey: k, baseURL: 'https://api.moonshot.cn' }); return (m) => o(m); },
  qwen: (k) => { const o = createOpenAI({ apiKey: k, baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' }); return (m) => o(m); },
  glm: (k) => { const o = createOpenAI({ apiKey: k, baseURL: 'https://open.bigmodel.cn/api/paas/v4' }); return (m) => o(m); },
  baichuan: (k) => { const o = createOpenAI({ apiKey: k, baseURL: 'https://api.baichuan-ai.com/v1' }); return (m) => o(m); },
  minimax: (k) => { const o = createOpenAI({ apiKey: k, baseURL: 'https://api.minimax.chat/v1' }); return (m) => o(m); },
  doubao: (k) => { const o = createOpenAI({ apiKey: k, baseURL: 'https://ark.cn-beijing.volces.com/api/v3' }); return (m) => o(m); },
  hunyuan: (k) => { const o = createOpenAI({ apiKey: k, baseURL: 'https://api.hunyuan.cloud.tencent.com/v1' }); return (m) => o(m); },
  spark: (k) => { const o = createOpenAI({ apiKey: k, baseURL: 'https://spark-api-open.xf-yun.com/v1' }); return (m) => o(m); },
  ollama: (k, b) => { const o = createOpenAI({ apiKey: k || 'ollama', baseURL: b || 'http://localhost:11434/v1' }); return (m) => o(m); },
};

export function getModel(provider: Provider, model: string, apiKey: string, baseURL?: string) {
  const factory = factories[provider] || factories.openai;
  return factory(apiKey, baseURL)(model);
}

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  openai: ['gpt-4o','gpt-4o-mini'], anthropic: ['claude-3-5-sonnet-20241022','claude-3-haiku-20240307'],
  google: ['gemini-1.5-pro','gemini-1.5-flash'], deepseek: ['deepseek-chat','deepseek-reasoner'],
  moonshot: ['moonshot-v1-8k','moonshot-v1-32k'], qwen: ['qwen-max','qwen-plus'],
  glm: ['glm-4-plus','glm-4-air'], baichuan: ['Baichuan4','Baichuan3-Turbo'],
  minimax: ['abab6.5s-chat'], doubao: ['doubao-pro-32k'], hunyuan: ['hunyuan-turbos'],
  spark: ['generalv3.5'], ollama: ['llama3.3:latest','qwen2.5:latest']
};
