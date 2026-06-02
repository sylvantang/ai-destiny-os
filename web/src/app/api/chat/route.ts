import { NextResponse } from 'next/server';
import type { BirthInfo } from '@engine/core/astro/types.js';
import { DestinyAgent } from '@engine/agent/agentEngine.js';
import type { LLMClient } from '@engine/agent/llmClient.js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, birth: birthInfo } = body;

    if (!message || !birthInfo) {
      return NextResponse.json(
        { error: 'Missing "message" or "birth" in request body' },
        { status: 400 },
      );
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

    // Create agent — deterministic mode by default
    const agent = new DestinyAgent(birth);

    // If API key is provided, configure LLM
    const llmConfig = body.llm;
    if (llmConfig?.apiKey) {
      const { createOpenAIClient, createAnthropicClient } = await import(
        '@engine/agent/llmClient.js'
      );
      let llm: LLMClient | null = null;
      if (llmConfig.provider === 'anthropic') {
        llm = createAnthropicClient(llmConfig.apiKey, llmConfig.model);
      } else {
        llm = createOpenAIClient(llmConfig.apiKey, llmConfig.model);
      }
      if (llm) {
        agent.setLLM(llm);
      }
    }

    // Process with LLM if available, otherwise deterministic
    let response;
    if (agent.hasLLM()) {
      response = await agent.processQueryAsync(message);
    } else {
      response = agent.processQuery(message);
    }

    return NextResponse.json({
      text: response.text,
      topic: response.topic,
      llmGenerated: response.llmGenerated,
      visualization: response.visualization ?? null,
      memoryContext: response.memoryContext ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 400 },
    );
  }
}
