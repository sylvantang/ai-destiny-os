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
import { saveRecord, listRecords, getRecord, deleteRecord, saveAnalysis, getHistory } from './data/database.js';
import { buildChartPayload } from './ai/chartPayload.js';
import { buildReportHTML } from './ai/reportHTML.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const PUBLIC = join(ROOT, 'ui');

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
        strength: { level: ctx.strength.level, strengthScore: ctx.strength.strengthScore },
        structure: { primary: ctx.structure.primaryPattern, description: ctx.structure.analysis.join('，') },
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

function handleRecordHistory(_req: IncomingMessage, res: ServerResponse, id: number): void {
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

  if (method === 'GET' && (url === '/' || url.startsWith('/ui/'))) return serveStatic(res, url);

  res.writeHead(404);
  res.end('Not found');
}

// ---- Start ----

const server = createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\n  AI Destiny OS · Web Server`);
  console.log(`  http://localhost:${PORT}\n`);
});
