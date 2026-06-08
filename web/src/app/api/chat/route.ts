import type { BirthInfo } from '@engine/core/astro/types.js';
import { DestinyAgent } from '@engine/agent/agentEngine.js';
import type { LLMClient } from '@engine/agent/llmClient.js';

const LLM_TIMEOUT_MS = 30000; // 30-second timeout for LLM agentic loop

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { message, birth: birthInfo, sessionId, llm: llmConfig, mode } = body;

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

  // Configure LLM: first try request body, then auto-detect from env vars
  try {
    const llmModule = await import('@engine/agent/llmClient.js');
    let llm: LLMClient | null = null;

    if (llmConfig?.apiKey) {
      if (llmConfig.provider === 'anthropic') {
        llm = llmModule.createAnthropicClient(llmConfig.apiKey, llmConfig.model);
      } else if (llmConfig.provider === 'deepseek') {
        llm = llmModule.createDeepSeekClient(llmConfig.apiKey, llmConfig.model);
      } else {
        llm = llmModule.createOpenAIClient(llmConfig.apiKey, llmConfig.model);
      }
    } else {
      // Auto-detect from environment variables
      llm = llmModule.createAutoClient();
    }

    if (llm) agent.setLLM(llm);
  } catch { /* best-effort */ }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial chart context (with yongShen for context-aware suggestions)
      const ctx = agent.state.ctx;
      send({
        type: 'chart',
        dayMaster: { name: ctx.chart.dayMaster.name, wuxing: ctx.chart.dayMasterWuxing },
        pattern: ctx.structure.primaryPattern,
        strength: ctx.strength.level,
        fortune: ctx.fortune.overall.level,
        yongShen: ctx.yongShen.yongShen.wuxing,
        xiShen: ctx.yongShen.xiShen.map((x) => x.wuxing),
      });

      send({ type: 'status', status: 'thinking' });

      // Apply mode to message
      const modeMsg = mode === 'detail'
        ? `请详细分析：${message}`
        : `请用3-5句话简洁回答，不要展开：${message}`;

      let fullText = '';
      let finalTopic = '';
      let timedOut = false;
      const timeoutId = setTimeout(() => { timedOut = true; }, LLM_TIMEOUT_MS);

      try {
        for await (const event of agent.processQueryStream(modeMsg)) {
          if (timedOut) break;
          if (event.type === 'token' && event.content) {
            fullText += event.content;
            send({ type: 'token', content: event.content });
          } else if (event.type === 'done') {
            finalTopic = event.topic ?? '';
            send({ type: 'done', topic: event.topic, sessionId });
          } else if (event.type === 'error') {
            send({ type: 'error', error: event.error });
          }
        }

        // Timeout or error with no response → deterministic fallback
        if (!fullText.trim()) {
          const fallback = agent.processQuery(modeMsg);
          fullText = fallback.text;
          finalTopic = finalTopic || fallback.topic;
          send({ type: 'status', status: 'fallback' });
          // Simulate streaming for UX consistency
          const chunks = fallback.text.match(/.{1,6}/g) ?? [fallback.text];
          for (const chunk of chunks) {
            send({ type: 'token', content: chunk });
          }
        }

        send({
          type: 'done',
          topic: finalTopic || undefined,
          sessionId,
          fallback: !fullText.trim() ? true : undefined,
        });
      } catch (err) {
        send({
          type: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });

        // Provide fallback on error
        try {
          const fallback = agent.processQuery(modeMsg);
          send({ type: 'status', status: 'fallback' });
          const chunks = fallback.text.match(/.{1,6}/g) ?? [fallback.text];
          for (const chunk of chunks) {
            send({ type: 'token', content: chunk });
          }
          send({ type: 'done', topic: fallback.topic, sessionId, fallback: true });
        } catch {
          send({ type: 'done', sessionId, fallback: true });
        }
      } finally {
        clearTimeout(timeoutId);

        // Persist turn if sessionId provided (fire-and-forget)
        if (sessionId && fullText) {
          try {
            const { addSessionTurn } = await import('@engine/data/database.js');
            addSessionTurn(sessionId, 'user', message).catch(() => {});
            addSessionTurn(sessionId, 'agent', fullText).catch(() => {});
          } catch { /* best-effort */ }
        }

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
