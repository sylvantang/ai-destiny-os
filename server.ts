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
        currentDayun: chart.currentDayun
          ? {
              pillar: SEXAGENARY_NAMES[chart.currentDayun.pillar.sexagenaryIndex],
              startAge: chart.currentDayun.startAge,
              endAge: chart.currentDayun.endAge,
            }
          : null,
        startAge: firstDayun?.startAge ?? 0,
        direction: firstDayun?.direction ?? '',
        wuxingCounts: chart.wuxingCount,
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

  try {
    for await (const event of agent.processQueryStream(question)) {
      if (event.type === 'token' && event.content) {
        res.write(`data: ${JSON.stringify({ type: 'token', content: event.content })}\n\n`);
      } else if (event.type === 'done') {
        res.write(`data: ${JSON.stringify({ type: 'done', topic: event.topic })}\n\n`);
      } else if (event.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', error: event.error })}\n\n`);
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err instanceof Error ? err.message : 'Unknown' })}\n\n`);
  }

  res.end();
}

function buildChartPayload(agent: DestinyAgent): Record<string, unknown> {
  const chart = agent.state.chart;
  const bz = chart.bazi;
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
    currentDayun: chart.currentDayun ? {
      pillar: SEXAGENARY_NAMES[chart.currentDayun.pillar.sexagenaryIndex],
      startAge: chart.currentDayun.startAge,
    } : null,
    startAge: chart.startAge,
  };
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
