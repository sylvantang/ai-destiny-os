import type { BirthInfo } from '@engine/core/astro/types.js';
import { DestinyAgent } from '@engine/agent/agentEngine.js';
import type { LLMClient } from '@engine/agent/llmClient.js';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { message, birth: birthInfo, sessionId, llm: llmConfig } = body;

  if (!message || !birthInfo) {
    return new Response(JSON.stringify({ error: 'Missing "message" or "birth"' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const birth: BirthInfo = {
    year: birthInfo.year,
    month: birthInfo.month,
    day: birthInfo.day,
    hour: birthInfo.hour,
    minute: birthInfo.minute ?? 0,
    longitude: birthInfo.longitude ?? 116.4,
    isDST: birthInfo.isDST ?? false,
    gender: birthInfo.gender ?? '男',
  };

  const agent = new DestinyAgent(birth);

  // Configure LLM if API key provided
  if (llmConfig?.apiKey) {
    try {
      const { createOpenAIClient, createAnthropicClient } = await import(
        '@engine/agent/llmClient.js'
      );
      let llm: LLMClient | null = null;
      if (llmConfig.provider === 'anthropic') {
        llm = createAnthropicClient(llmConfig.apiKey, llmConfig.model);
      } else {
        llm = createOpenAIClient(llmConfig.apiKey, llmConfig.model);
      }
      if (llm) agent.setLLM(llm);
    } catch { /* best-effort */ }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Send initial chart context
        const ctx = agent.state.ctx;
        send({
          type: 'chart',
          dayMaster: { name: ctx.chart.dayMaster.name, wuxing: ctx.chart.dayMasterWuxing },
          pattern: ctx.structure.primaryPattern,
          strength: ctx.strength.level,
          fortune: ctx.fortune.overall.level,
        });

        // Send thinking indicator
        send({ type: 'status', status: 'thinking' });

        let fullText = '';

        for await (const event of agent.processQueryStream(message)) {
          if (event.type === 'token' && event.content) {
            fullText += event.content;
            send({ type: 'token', content: event.content });
          } else if (event.type === 'done') {
            send({ type: 'done', topic: event.topic, sessionId });
          } else if (event.type === 'error') {
            send({ type: 'error', error: event.error });
          }
        }

        // Persist turn if sessionId provided
        if (sessionId && fullText) {
          try {
            const { addSessionTurn } = await import('@engine/data/database.js');
            addSessionTurn(sessionId, 'user', message);
            addSessionTurn(sessionId, 'agent', fullText);
          } catch { /* best-effort */ }
        }
      } catch (err) {
        send({
          type: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
