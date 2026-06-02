// ============================================================
// AI Destiny OS — Agent Layer: LLM Provider
// Handles LLM-powered responses: chat, streaming, history+memory injection.
// ============================================================

import type { MemoryStore } from '../../memory/memoryStore.js';
import { buildEnrichedContext, formatMemoryForPrompt } from '../../memory/contextBuilder.js';
import type { PromptContext, AIPrompt } from '../../ai/promptBuilder.js';
import type { QueryDomain, AgentResponse, ConversationTurn } from '../agentEngine.js';
import type { LLMClient, ChatMessage } from '../llmClient.js';
import type { ProviderState, StreamEvent, ResponseProvider } from './types.js';
import { DeterministicProvider } from './deterministic.js';

export class LLMProvider implements ResponseProvider {
  readonly name = 'llm';
  private fallback: DeterministicProvider;

  constructor(private llm: LLMClient) {
    this.fallback = new DeterministicProvider();
  }

  respond(): AgentResponse {
    throw new Error('LLMProvider does not support sync respond; use respondAsync');
  }

  async respondAsync(
    topic: QueryDomain,
    state: ProviderState,
    chart: import('../../core/astro/types.js').DestinyChart,
    prompt: AIPrompt,
    history: ConversationTurn[],
    memory: MemoryStore | null,
  ): Promise<AgentResponse> {
    const messages = this.buildMessages(prompt, state.ctx, history, memory);

    try {
      const result = await this.llm.chat(messages);

      return {
        text: result.content,
        llmGenerated: true,
        prompt,
        topic,
        usage: result.usage,
      };
    } catch (err) {
      const fallback = this.fallback.respond(topic, state, chart);
      return {
        ...fallback,
        text: `[LLM调用失败: ${err instanceof Error ? err.message : '未知错误'}]\n\n${fallback.text}`,
        llmGenerated: false,
        prompt,
      };
    }
  }

  async *respondStream(
    topic: QueryDomain,
    state: ProviderState,
    _chart: import('../../core/astro/types.js').DestinyChart,
    prompt: AIPrompt,
    history: ConversationTurn[],
    memory: MemoryStore | null,
  ): AsyncGenerator<StreamEvent> {
    const messages = this.buildMessages(prompt, state.ctx, history, memory);
    let fullText = '';

    for await (const event of this.llm.stream(messages)) {
      if (event.type === 'token' && event.content) {
        fullText += event.content;
        yield { type: 'token', content: event.content };
      } else if (event.type === 'error') {
        yield { type: 'error', error: event.error };
        yield { type: 'done', topic, prompt };
        return;
      } else if (event.type === 'done') {
        yield { type: 'done', topic, prompt };
        return;
      }
    }

    yield { type: 'done', topic, prompt };
  }

  /** Build the LLM message array with system prompt, memory context, and conversation history. */
  private buildMessages(
    prompt: AIPrompt,
    ctx: PromptContext,
    history: ConversationTurn[],
    memory: MemoryStore | null,
  ): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: prompt.system },
    ];

    // Inject memory context
    if (memory) {
      const enriched = buildEnrichedContext(memory, ctx);
      const memoryBlock = formatMemoryForPrompt(enriched);
      messages.push({
        role: 'user',
        content: `[用户历史背景]\n${memoryBlock}`,
      });
    }

    // Include recent conversation history for follow-up context
    const recentHistory = history.slice(-12); // last 6 turns
    for (const turn of recentHistory) {
      messages.push({
        role: turn.role === 'user' ? 'user' : 'assistant',
        content: turn.content,
      });
    }

    messages.push({ role: 'user', content: prompt.user });
    return messages;
  }
}
