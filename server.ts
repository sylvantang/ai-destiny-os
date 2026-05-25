// ============================================================
// AI Destiny OS — HTTP API Server
// Zero-dependency: Node.js built-in http only.
// ============================================================

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DestinyAgent } from './agent/agentEngine.js';
import { createAutoClient } from './agent/llmClient.js';
import { ALL_STEMS, SEXAGENARY_NAMES } from './core/astro/constants.js';
import type { BirthInfo } from './core/astro/types.js';
import { saveRecord, listRecords, getRecord, deleteRecord, saveAnalysis, getHistory } from './db/database.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const PUBLIC = join(ROOT, 'public');

const llm = createAutoClient();

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// ---- Helpers ----

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk.toString()));
    req.on('end', () => resolve(body));
  });
}

function parseBirth(body: Record<string, unknown>): BirthInfo | null {
  const y = Number(body['year']);
  const m = Number(body['month']);
  const d = Number(body['day']);
  if (!y || !m || !d) return null;

  return {
    year: y,
    month: m,
    day: d,
    hour: Number(body['hour'] ?? 12),
    minute: Number(body['minute'] ?? 0),
    longitude: Number(body['longitude'] ?? 116.4),
    isDST: body['isDST'] === '1' || body['isDST'] === true,
    gender: (body['gender'] === '女' ? '女' : '男') as '男' | '女',
  };
}

// ---- Static Files ----

function serveStatic(res: ServerResponse, url: string): void {
  const filePath = url === '/' ? join(PUBLIC, 'index.html') : join(PUBLIC, url);
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = extname(filePath);
  const mime = MIME[ext] ?? 'application/octet-stream';
  const content = readFileSync(filePath, 'utf-8');
  res.writeHead(200, { 'Content-Type': mime });
  res.end(content);
}

// ---- API Routes ----

async function handleChart(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const raw = await parseBody(req);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return json(res, { error: 'Invalid JSON' }, 400); }

  const birth = parseBirth(body);
  if (!birth) return json(res, { error: 'Missing year/month/day' }, 400);

  try {
    const agent = new DestinyAgent(birth, llm ?? undefined);
    const chart = agent.state.chart;
    const ctx = agent.state.ctx;
    const bz = chart.bazi;
    const pillars = [bz.year, bz.month, bz.day, bz.hour];
    const firstDayun = chart.dayun[0];

    const chartPayload = buildChartPayload(agent);

    // Save to database (fire-and-forget, don't block on DB errors)
    try {
      const record = saveRecord(birth, chartPayload);
      res.setHeader('X-Record-Id', record.id);
    } catch { /* DB save is best-effort */ }

    json(res, {
      chart: {
        pillars: pillars.map(p => ({
          stem: { name: p.stem.name, wuxing: p.stem.wuxing },
          branch: { name: p.branch.name, wuxing: p.branch.wuxing },
          hiddenStems: p.hiddenStems.map(idx => ({ name: ALL_STEMS[idx]!.name, wuxing: ALL_STEMS[idx]!.wuxing })),
          nayin: p.nayin,
          shiShen: p.shiShen,
          sexagenary: SEXAGENARY_NAMES[p.sexagenaryIndex],
        })),
        dayMaster: { name: chart.dayMaster.name, wuxing: chart.dayMasterWuxing },
        currentDayun: (() => {
          if (!chart.currentDayun) return null;
          const cdIdx = chart.dayun.indexOf(chart.currentDayun);
          const endAge = cdIdx >= 0 && cdIdx < chart.dayun.length - 1
            ? chart.dayun[cdIdx + 1]!.startAge
            : chart.currentDayun.startAge + 10;
          return {
            pillar: SEXAGENARY_NAMES[chart.currentDayun.pillar.sexagenaryIndex],
            startAge: chart.currentDayun.startAge,
            endAge,
          };
        })(),
        startAge: firstDayun?.startAge ?? 0,
        direction: firstDayun?.direction ?? '',
        wuxingCounts: chart.wuxingCount,
        dayun: chart.dayun.slice(0, 8).map((d, i, arr) => ({
          pillar: SEXAGENARY_NAMES[d.pillar.sexagenaryIndex],
          startAge: d.startAge,
          endAge: i < arr.length - 1 ? arr[i + 1]!.startAge : d.startAge + 10,
        })),
        lifePeriods: ctx.fortune.lifePeriods.map(lp => ({
          name: lp.name,
          ageRange: lp.ageRange,
          theme: lp.theme,
        })),
      },
      analysis: {
        strength: { level: ctx.strength.level, score: ctx.strength.score },
        structure: { primary: ctx.structure.primaryPattern, description: ctx.structure.description },
        climate: { needsAdjustment: ctx.climate.needsAdjustment, neededWuxing: ctx.climate.neededWuxing },
        fortune: {
          overall: ctx.fortune.overall,
          yearly: ctx.fortune.yearlyAnalysis.slice(0, 8).map(y => ({
            year: y.year,
            score: Math.round((y.career + y.wealth + y.relationship + y.health) / 4),
            career: y.career,
            wealth: y.wealth,
            relationship: y.relationship,
            health: y.health,
          })),
        },
        personality: {
          traits: agent.state.personality.coreTraits,
          mbti: agent.state.personality.mbtiTendency,
        },
        career: {
          industries: agent.state.career.industries.slice(0, 3).map(i => i.industry),
          entrepreneurship: agent.state.career.entrepreneurshipScore,
        },
      },
    });
  } catch (err) {
    console.error('Chart error:', err instanceof Error ? err.stack : err);
    json(res, { error: `Chart calculation failed: ${err instanceof Error ? err.message : err}` }, 500);
  }
}

async function handleAsk(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const raw = await parseBody(req);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return json(res, { error: 'Invalid JSON' }, 400); }

  const birth = parseBirth(body);
  if (!birth) return json(res, { error: 'Missing year/month/day' }, 400);

  const question = String(body['question'] ?? '请分析我的命盘');
  const recordId = Number(body['recordId']) || 0;

  if (!llm) {
    // No LLM — return deterministic fallback as SSE
    const agent = new DestinyAgent(birth);
    const response = agent.processQuery(question);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ type: 'chart', ...buildChartPayload(agent) })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'token', content: response.text })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done', topic: response.topic })}\n\n`);
    res.end();

    if (recordId) {
      try { saveAnalysis(recordId, question, response.text, response.topic); } catch { /* best-effort */ }
    }
    return;
  }

  const agent = new DestinyAgent(birth, llm);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Send chart data first
  res.write(`data: ${JSON.stringify({ type: 'chart', ...buildChartPayload(agent) })}\n\n`);

  let fullText = '';
  let finalTopic = '';

  try {
    for await (const event of agent.processQueryStream(question)) {
      if (event.type === 'token' && event.content) {
        fullText += event.content;
        res.write(`data: ${JSON.stringify({ type: 'token', content: event.content })}\n\n`);
      } else if (event.type === 'done') {
        finalTopic = event.topic ?? '';
        res.write(`data: ${JSON.stringify({ type: 'done', topic: event.topic })}\n\n`);
      } else if (event.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', error: event.error })}\n\n`);
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err instanceof Error ? err.message : 'Unknown' })}\n\n`);
  }

  res.end();

  if (recordId && fullText) {
    try { saveAnalysis(recordId, question, fullText, finalTopic); } catch { /* best-effort */ }
  }
}

function buildChartPayload(agent: DestinyAgent): Record<string, unknown> {
  const chart = agent.state.chart;
  const bz = chart.bazi;
  const ctx = agent.state.ctx;
  const pillars = [bz.year, bz.month, bz.day, bz.hour];
  return {
    pillars: pillars.map(p => ({
      stem: { name: p.stem.name, wuxing: p.stem.wuxing },
      branch: { name: p.branch.name, wuxing: p.branch.wuxing },
      hiddenStems: p.hiddenStems.map(idx => ({ name: ALL_STEMS[idx]!.name, wuxing: ALL_STEMS[idx]!.wuxing })),
      nayin: p.nayin,
      shiShen: p.shiShen,
      sexagenary: SEXAGENARY_NAMES[p.sexagenaryIndex],
    })),
    dayMaster: { name: chart.dayMaster.name, wuxing: chart.dayMasterWuxing },
    wuxingCounts: chart.wuxingCount,
    currentDayun: (() => {
      if (!chart.currentDayun) return null;
      const cdIdx = chart.dayun.indexOf(chart.currentDayun);
      const endAge = cdIdx >= 0 && cdIdx < chart.dayun.length - 1
        ? chart.dayun[cdIdx + 1]!.startAge
        : chart.currentDayun.startAge + 10;
      return {
        pillar: SEXAGENARY_NAMES[chart.currentDayun.pillar.sexagenaryIndex],
        startAge: chart.currentDayun.startAge,
        endAge,
      };
    })(),
    startAge: chart.dayun[0]?.startAge ?? 0,
    dayun: chart.dayun.slice(0, 8).map((d, i, arr) => ({
      pillar: SEXAGENARY_NAMES[d.pillar.sexagenaryIndex],
      startAge: d.startAge,
      endAge: i < arr.length - 1 ? arr[i + 1]!.startAge : d.startAge + 10,
    })),
    lifePeriods: ctx.fortune.lifePeriods.map(lp => ({
      name: lp.name,
      ageRange: lp.ageRange,
      theme: lp.theme,
    })),
  };
}

// ---- Record Management ----

function handleRecords(_req: IncomingMessage, res: ServerResponse): void {
  try {
    const records = listRecords().map(r => ({
      id: r.id,
      name: r.name,
      birthInfo: r.birthInfo,
      createdAt: r.createdAt,
    }));
    json(res, records);
  } catch (err) {
    json(res, { error: 'Failed to list records' }, 500);
  }
}

function handleRecord(req: IncomingMessage, res: ServerResponse, id: number): void {
  if (req.method === 'DELETE') {
    try {
      deleteRecord(id);
      json(res, { ok: true });
    } catch {
      json(res, { error: 'Failed to delete record' }, 500);
    }
    return;
  }

  try {
    const record = getRecord(id);
    if (!record) return json(res, { error: 'Record not found' }, 404);
    json(res, {
      id: record.id,
      name: record.name,
      birthInfo: record.birthInfo,
      chartData: record.chartData,
      createdAt: record.createdAt,
    });
  } catch {
    json(res, { error: 'Failed to get record' }, 500);
  }
}

function handleRecordHistory(req: IncomingMessage, res: ServerResponse, id: number): void {
  try {
    const history = getHistory(id);
    json(res, history.map(h => ({
      id: h.id,
      question: h.question,
      response: h.response,
      topic: h.topic,
      createdAt: h.createdAt,
    })));
  } catch {
    json(res, { error: 'Failed to get history' }, 500);
  }
}

// ---- Report Generation ----

const WX_CLASS: Record<string, string> = { '木': 'wx-wood', '火': 'wx-fire', '土': 'wx-earth', '金': 'wx-metal', '水': 'wx-water' };
const WX_COLOR_HEX: Record<string, string> = { '木': '#4a9', '火': '#e55', '土': '#c93', '金': '#bbb', '水': '#48b' };

function buildReportHTML(agent: DestinyAgent, analysis?: Record<string, unknown>): string {
  const c = agent.state.chart;
  const bz = c.bazi;
  const pillars = [bz.year, bz.month, bz.day, bz.hour];
  const labels = ['年柱', '月柱', '日柱', '时柱'];
  const birth = agent.state.birth;

  const pillarRows = pillars.map((p, i) => `
    <tr>
      <td>${labels[i]}</td>
      <td>${SEXAGENARY_NAMES[p.sexagenaryIndex]}</td>
      <td style="color:${WX_COLOR_HEX[p.stem.wuxing]}">${p.stem.name}</td>
      <td style="color:${WX_COLOR_HEX[p.branch.wuxing]}">${p.branch.name}</td>
      <td>${p.hiddenStems.map(idx => `<span style="color:${WX_COLOR_HEX[ALL_STEMS[idx]!.wuxing]}">${ALL_STEMS[idx]!.name}</span>`).join('')}</td>
      <td>${p.nayin}</td>
      <td>${p.shiShen ?? '—'}</td>
    </tr>`).join('');

  const wuxingBars = Object.entries(c.wuxingCount)
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([wx, n]) => `<span style="color:${WX_COLOR_HEX[wx]}">${wx}:${'█'.repeat(n)} ${n}</span>`)
    .join(' ');

  const dm = c.dayMaster;
  const ctx = agent.state.ctx;
  const personality = agent.state.personality;
  const career = agent.state.career;
  const strategy = agent.state.strategy;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>AI Destiny OS · 命理分析报告</title>
<style>
  @page { margin: 15mm; size: A4; }
  body { font-family: "PingFang SC", "Noto Sans SC", sans-serif; color: #1a1a1a; line-height: 1.8; max-width: 700px; margin: 0 auto; padding: 20px; }
  h1 { text-align: center; font-size: 1.4rem; border-bottom: 2px solid #c93; padding-bottom: 12px; margin-bottom: 8px; }
  .subtitle { text-align: center; color: #888; font-size: 0.8rem; margin-bottom: 24px; }
  h2 { font-size: 1rem; color: #c93; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 24px 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin: 10px 0; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
  th { background: #f8f8f8; font-weight: 500; font-size: 0.8rem; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 0.85rem; margin: 8px 0; }
  .info-grid .label { color: #888; }
  .tag { background: #f0f0f0; border-radius: 3px; padding: 1px 6px; font-size: 0.8rem; }
  .bar { font-family: monospace; }
  footer { text-align: center; color: #aaa; font-size: 0.7rem; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; }
  .wx-wood { color: #4a9; } .wx-fire { color: #e55; } .wx-earth { color: #c93; } .wx-metal { color: #888; } .wx-water { color: #48b; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>AI Destiny OS · 命理分析报告</h1>
<p class="subtitle">生成时间: ${new Date().toLocaleString('zh-CN')}</p>

<h2>出生信息</h2>
<div class="info-grid">
  <div><span class="label">出生日期</span> ${birth.year}年${birth.month}月${birth.day}日 ${String(birth.hour).padStart(2, '0')}:${String(birth.minute).padStart(2, '0')}</div>
  <div><span class="label">性别</span> ${birth.gender}</div>
  <div><span class="label">经度</span> ${birth.longitude}°</div>
  <div><span class="label">夏令时</span> ${birth.isDST ? '是' : '否'}</div>
</div>

<h2>四柱八字 · Four Pillars</h2>
<table>
  <tr><th>柱位</th><th>六十甲子</th><th>天干</th><th>地支</th><th>藏干</th><th>纳音</th><th>十神</th></tr>
  ${pillarRows}
</table>
<div style="margin:8px 0;font-size:0.85rem;"><strong>日主:</strong> <span style="color:${WX_COLOR_HEX[dm.wuxing]}">${dm.name}${dm.wuxing} (${dm.yinYang})</span></div>
<div class="bar">五行分布: ${wuxingBars}</div>

<h2>命理分析</h2>
<div class="info-grid">
  <div><span class="label">格局</span> ${ctx.structure.primaryPattern}</div>
  <div><span class="label">格局说明</span> ${ctx.structure.description}</div>
  <div><span class="label">旺衰</span> ${ctx.strength.level} (${ctx.strength.score}分)</div>
  <div><span class="label">调候</span> ${ctx.climate.needsAdjustment ? '需' + ctx.climate.neededWuxing : '中和'}</div>
</div>

<h2>性格分析</h2>
<p>核心特质: ${personality.coreTraits.map(t => `<span class="tag">${t}</span>`).join(' ')}</p>
<p>MBTI倾向: ${personality.mbtiTendency.join(' / ')}</p>

<h2>事业分析</h2>
<p>推荐行业: ${career.industries.slice(0, 5).map(i => i.industry).join('、')}</p>
<p>创业评分: ${'★'.repeat(Math.round(career.entrepreneurshipScore / 2))}${'☆'.repeat(5 - Math.round(career.entrepreneurshipScore / 2))} (${career.entrepreneurshipScore}/10)</p>

<h2>运势概览</h2>
<div class="info-grid">
  <div><span class="label">总体运势</span> ${ctx.fortune.overall.level}期 (${ctx.fortune.overall.score}分)</div>
  <div><span class="label">最佳领域</span> ${ctx.fortune.overall.bestDimension}</div>
  <div><span class="label">风险领域</span> ${ctx.fortune.overall.riskDimension}</div>
</div>
${ctx.fortune.yearlyAnalysis.length > 0 ? `
<h3>${ctx.fortune.yearlyAnalysis[0]!.year}年流年运势</h3>
<div class="info-grid">
  <div><span class="label">事业运</span> ${ctx.fortune.yearlyAnalysis[0]!.career}分</div>
  <div><span class="label">财运</span> ${ctx.fortune.yearlyAnalysis[0]!.wealth}分</div>
  <div><span class="label">感情运</span> ${ctx.fortune.yearlyAnalysis[0]!.relationship}分</div>
  <div><span class="label">健康运</span> ${ctx.fortune.yearlyAnalysis[0]!.health}分</div>
</div>` : ''}

${c.currentDayun ? `
<h2>大运信息</h2>
<p>当前大运: ${SEXAGENARY_NAMES[c.currentDayun.pillar.sexagenaryIndex]} (${c.currentDayun.startAge}-${c.currentDayun.endAge}岁) ${c.currentDayun.direction}</p>
` : ''}

<h2>人生战略</h2>
<p>当前阶段: ${strategy.currentPhase.name}</p>
<p>最有利方位: ${strategy.locationAdvice.slice(0, 3).map(l => l.location).join('、') || '综合考量'}</p>

<footer>AI Destiny OS · 命理分析报告 · 仅供参考</footer>
</body>
</html>`;
}

async function handleReport(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const body: Record<string, unknown> = {};
  url.searchParams.forEach((v, k) => { body[k] = v; });

  const birth = parseBirth(body);
  if (!birth) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Missing year/month/day</h1>');
    return;
  }

  try {
    const agent = new DestinyAgent(birth, llm ?? undefined);
    const html = buildReportHTML(agent);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Report generation failed: ${err instanceof Error ? err.message : err}</h1>`);
  }
}

// ---- Router ----

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url ?? '/';
  const method = req.method ?? 'GET';

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (method === 'POST' && url === '/api/chart') return handleChart(req, res);
  if (method === 'POST' && url === '/api/ask') return handleAsk(req, res);
  if ((method === 'GET' || method === 'POST') && url.startsWith('/api/report')) return handleReport(req, res);

  // Record management
  const recordMatch = url.match(/^\/api\/records\/(\d+)$/);
  const recordHistoryMatch = url.match(/^\/api\/records\/(\d+)\/history$/);

  if (method === 'GET' && url === '/api/records') return handleRecords(req, res);
  if (recordMatch && (method === 'GET' || method === 'DELETE'))
    return handleRecord(req, res, parseInt(recordMatch[1]!, 10));
  if (recordHistoryMatch && method === 'GET')
    return handleRecordHistory(req, res, parseInt(recordHistoryMatch[1]!, 10));

  if (method === 'GET' && (url === '/' || url.startsWith('/public/'))) return serveStatic(res, url);

  res.writeHead(404);
  res.end('Not found');
}

// ---- Start ----

const server = createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\n  AI Destiny OS · Web Server`);
  console.log(`  http://localhost:${PORT}\n`);
});
