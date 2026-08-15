// ============================================================
// AI Destiny OS — Eval suite runner.
// Flow: load test cases → /api/chart → /api/chat → evaluate.
// Requires a running server (EVAL_BASE_URL, default http://localhost:3000).
//
// 用法（仓库根目录）:
//   方式一（DeepSeek）:
//     DEEPSEEK_API_KEY=sk-xxx npx tsx web/scripts/run-eval.ts
//   方式二（其他模型，如 OpenAI）:
//     EVAL_PROVIDER=openai EVAL_MODEL=gpt-4o OPENAI_API_KEY=sk-xxx \
//       EVAL_LLM_BASE_URL=https://api.openai.com/v1 npx tsx web/scripts/run-eval.ts
//   在 web/ 目录下运行时把路径改为: npx tsx scripts/run-eval.ts
//
// 环境变量:
//   EVAL_BASE_URL        排盘/聊天服务地址（默认 http://localhost:3000）
//   EVAL_PROVIDER        模型供应商（默认 deepseek）
//   EVAL_MODEL           模型名（默认 deepseek-chat）
//   EVAL_API_KEY         通用密钥（优先级最高）
//   DEEPSEEK_API_KEY     DeepSeek 密钥
//   OPENAI_API_KEY       OpenAI 密钥
//   ANTHROPIC_API_KEY    Anthropic 密钥
//   EVAL_LLM_BASE_URL    自定义模型接口地址（可选）
// ============================================================

import { getTestCases, evaluateResponse, type EvalResult, type QATestCase } from '../src/lib/eval/bazi-qa';
import { consumeDataStream } from '../src/lib/ai/parse-stream';

const BASE = process.env.EVAL_BASE_URL || 'http://localhost:3000';
const PROVIDER = process.env.EVAL_PROVIDER || 'deepseek';
const MODEL = process.env.EVAL_MODEL || 'deepseek-chat';

function resolveApiKey(provider: string): string {
  if (process.env.EVAL_API_KEY) return process.env.EVAL_API_KEY;
  const map: Record<string, string | undefined> = {
    deepseek: process.env.DEEPSEEK_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY,
    moonshot: process.env.MOONSHOT_API_KEY,
    qwen: process.env.DASHSCOPE_API_KEY,
    glm: process.env.GLM_API_KEY,
  };
  return map[provider] || process.env.DEEPSEEK_API_KEY || '';
}

const API_KEY = resolveApiKey(PROVIDER);

interface ChartPayload {
  chart?: { dayMaster?: { stem?: string; wuxing?: string } };
  structure?: { pattern?: string };
  strength?: { level?: string };
  yongShen?: { yongShen?: { wuxing?: string }; xiShen?: { wuxing: string }[] };
}

async function fetchChart(tc: QATestCase): Promise<ChartPayload | null> {
  try {
    const res = await fetch(`${BASE}/api/chart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: Number(tc.chart.year),
        month: Number(tc.chart.month),
        day: Number(tc.chart.day),
        hour: Number(tc.chart.hour),
        minute: 0,
        longitude: 116.4,
        gender: tc.chart.gender === 'male' ? '男' : '女',
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ChartPayload;
  } catch {
    return null;
  }
}

function chartContextText(p: ChartPayload): string {
  const parts = [
    `日主：${p.chart?.dayMaster?.stem || ''}${p.chart?.dayMaster?.wuxing || ''}`,
    `格局：${p.structure?.pattern || ''}`,
    `旺衰：${p.strength?.level || ''}`,
    `用神：${p.yongShen?.yongShen?.wuxing || ''}`,
    `喜神：${(p.yongShen?.xiShen || []).map((x) => x.wuxing).join('、')}`,
  ];
  return parts.join('，');
}

async function fetchChat(tc: QATestCase, chart: ChartPayload): Promise<string> {
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: chartContextText(chart) },
          { role: 'user', content: tc.question },
        ],
        birth: {
          year: Number(tc.chart.year),
          month: Number(tc.chart.month),
          day: Number(tc.chart.day),
          hour: Number(tc.chart.hour),
          minute: 0,
          longitude: 116.4,
          gender: tc.chart.gender === 'male' ? '男' : '女',
        },
        userConfig: {
          provider: PROVIDER,
          model: MODEL,
          apiKey: API_KEY,
          baseURL: process.env.EVAL_LLM_BASE_URL || '',
          temperature: 0.7,
        },
      }),
    });
    if (!res.ok) return '';
    if (!res.body) return '';

    let text = '';
    await consumeDataStream(res.body, {
      onText: (delta) => {
        text += delta;
      },
    });
    return text;
  } catch {
    return '';
  }
}

async function main() {
  const cases = getTestCases();
  const responses = new Map<string, string>();
  let chatOk = 0;

  console.log(`\n=== Bazi QA Eval Suite ===`);
  console.log(`Base URL: ${BASE} | Provider: ${PROVIDER} / ${MODEL} | Key: ${API_KEY ? 'set' : 'MISSING'}`);
  console.log(`Cases: ${cases.length}\n`);

  for (const tc of cases) {
    const chart = await fetchChart(tc);
    if (!chart) {
      console.log(`[${tc.id}] chart FAIL → skip`);
      continue;
    }
    const reply = await fetchChat(tc, chart);
    if (reply.trim().length > 0) chatOk += 1;
    responses.set(tc.id, reply);
    const r = evaluateResponse(reply, tc);
    console.log(
      `[${tc.id}] score=${r.overallScore} kw=${r.keywordHitRate} dir=${r.directionMatch ? 'Y' : 'N'} chain=${r.hasReasoningChain ? 'Y' : 'N'} cite=${r.citesAncientText ? 'Y' : 'N'} (len=${reply.length})`,
    );
  }

  const results: EvalResult[] = [];
  for (const tc of cases) results.push(evaluateResponse(responses.get(tc.id) ?? '', tc));

  const avg = results.reduce((s, r) => s + r.overallScore, 0) / Math.max(1, results.length);
  const kwAvg = results.reduce((s, r) => s + r.keywordHitRate, 0) / Math.max(1, results.length);
  const dirOk = results.filter((r) => r.directionMatch).length;
  const chainOk = results.filter((r) => r.hasReasoningChain).length;
  const citeOk = results.filter((r) => r.citesAncientText).length;

  const sorted = [...results].sort((a, b) => a.overallScore - b.overallScore).slice(0, 3);

  console.log(`\n=== Summary ===`);
  console.log(`Chat succeeded: ${chatOk}/${cases.length}`);
  console.log(`Average score: ${Math.round(avg)}/100`);
  console.log(`Avg keyword hit rate: ${Math.round(kwAvg * 100) / 100}`);
  console.log(`Direction match: ${dirOk}/${cases.length}`);
  console.log(`Reasoning chain: ${chainOk}/${cases.length}`);
  console.log(`Cites ancient text: ${citeOk}/${cases.length}`);
  console.log(`\nWorst 3 cases:`);
  for (const r of sorted) {
    console.log(`  - ${r.testCaseId}: score ${r.overallScore}`);
  }
  console.log('');
}

main();
