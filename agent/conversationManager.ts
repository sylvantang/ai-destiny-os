// ============================================================
// AI Destiny OS — Agent Layer: Conversation Manager
// Multi-turn conversation, context persistence, question routing.
// ============================================================

import type { DestinyAgent, AgentResponse, QueryDomain } from './agentEngine.js';

export interface ConversationState {
  /** The agent instance */
  agent: DestinyAgent;
  /** Quick-access computed values */
  summary: ConversationSummary;
  /** Suggested follow-up questions */
  suggestions: string[];
  /** Context window for the LLM */
  contextWindow: Message[];
}

export interface ConversationSummary {
  /** Day master summary */
  dayMaster: string;
  /** Pattern */
  pattern: string;
  /** Strength */
  strength: string;
  /** Current fortune level */
  fortuneLevel: string;
  /** Topics covered so far */
  topicsCovered: string[];
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Create a conversation around an agent.
 */
export function createConversation(agent: DestinyAgent): ConversationState {
  return {
    agent,
    summary: buildSummary(agent),
    suggestions: generateSuggestions([]),
    contextWindow: buildInitialContext(agent),
  };
}

function buildSummary(agent: DestinyAgent): ConversationSummary {
  const { ctx } = agent.state;

  return {
    dayMaster: `${ctx.chart.dayMaster.name}${ctx.chart.dayMasterWuxing}`,
    pattern: ctx.structure.primaryPattern,
    strength: ctx.strength.level,
    fortuneLevel: ctx.fortune.overall.level,
    topicsCovered: [],
  };
}

function buildInitialContext(agent: DestinyAgent): Message[] {
  const { ctx } = agent.state;

  return [{
    role: 'system',
    content: [
      `你是AI命理师，正在为用户提供八字命理咨询。`,
      `用户命盘：${ctx.chart.dayMaster.name}${ctx.chart.dayMasterWuxing}日主，格局${ctx.structure.primaryPattern}，日主${ctx.strength.level}，当前运势${ctx.fortune.overall.level}期。`,
      `用户问命时间为${new Date().toISOString().slice(0, 10)}。`,
    ].join('\n'),
  }];
}

// ---- Turn Processing ----

export interface TurnResult {
  response: AgentResponse;
  state: ConversationState;
}

/**
 * Process a single turn in the conversation.
 */
export function processTurn(
  state: ConversationState,
  input: string,
): TurnResult {
  const response = state.agent.processQuery(input);

  // Update topics
  if (response.topic && !state.summary.topicsCovered.includes(response.topic)) {
    state.summary.topicsCovered.push(response.topic);
  }

  // Add to context window
  state.contextWindow.push({ role: 'user', content: input });
  state.contextWindow.push({
    role: 'assistant',
    content: response.text,
  });

  // Trim context window if too long (keep last 20 messages)
  if (state.contextWindow.length > 22) {
    state.contextWindow = [
      state.contextWindow[0]!,
      ...state.contextWindow.slice(-20),
    ];
  }

  // Generate new suggestions
  state.suggestions = generateSuggestions(state.summary.topicsCovered);

  return { response, state };
}

/**
 * Process with memory integration.
 */
export function processTurnWithMemory(
  state: ConversationState,
  input: string,
): TurnResult {
  const response = state.agent.processQueryWithMemory(input);

  if (response.topic && !state.summary.topicsCovered.includes(response.topic)) {
    state.summary.topicsCovered.push(response.topic);
  }

  state.contextWindow.push({ role: 'user', content: input });
  state.contextWindow.push({
    role: 'assistant',
    content: response.memoryContext
      ? `${response.text}\n\n[记忆上下文]\n${response.memoryContext}`
      : response.text,
  });

  state.suggestions = generateSuggestions(state.summary.topicsCovered);
  return { response, state };
}

// ---- Suggestions ----

const ALL_SUGGESTIONS: { label: string; topic: QueryDomain; trigger: string }[] = [
  { label: '我的性格特点是什么？', topic: '性格', trigger: '性格' },
  { label: '我适合什么行业？', topic: '事业', trigger: '事业' },
  { label: '我的感情运势如何？', topic: '感情', trigger: '感情' },
  { label: '今年运势怎么样？', topic: '运势', trigger: '运势' },
  { label: '给我一些人生建议', topic: '战略', trigger: '战略' },
  { label: '看看我的八字命盘', topic: '排盘', trigger: '排盘' },
  { label: '我的财运什么时候最好？', topic: '运势', trigger: '财运' },
  { label: '我适合创业还是打工？', topic: '事业', trigger: '创业' },
  { label: '我的正缘是什么样的人？', topic: '感情', trigger: '正缘' },
  { label: '未来三年我应该注意什么？', topic: '战略', trigger: '三年' },
];

function generateSuggestions(topicsCovered: string[]): string[] {
  const remaining = ALL_SUGGESTIONS
    .filter(s => !topicsCovered.includes(s.topic))
    .slice(0, 4);

  if (remaining.length < 4) {
    const extras = ALL_SUGGESTIONS
      .filter(s => topicsCovered.includes(s.topic))
      .filter(s => !remaining.some(r => r.label === s.label))
      .slice(0, 4 - remaining.length);
    return [...remaining, ...extras].map(s => s.label);
  }

  return remaining.map(s => s.label);
}

/**
 * Get suggested questions for a specific domain.
 */
export function getSuggestionsForDomain(domain: QueryDomain): string[] {
  return ALL_SUGGESTIONS
    .filter(s => s.topic === domain)
    .map(s => s.label);
}

// ---- Context Export ----

/**
 * Export conversation as LLM-ready messages.
 */
export function exportForLLM(state: ConversationState): Message[] {
  return [...state.contextWindow];
}

/**
 * Format the full conversation as a readable transcript.
 */
export function formatTranscript(state: ConversationState): string {
  const lines: string[] = [];
  lines.push('═══════════════════════════════════════');
  lines.push('  AI 命理师 · 对话记录');
  lines.push('═══════════════════════════════════════');
  lines.push('');
  lines.push(`命盘摘要: ${state.summary.dayMaster}日主 · ${state.summary.pattern} · ${state.summary.strength} · ${state.summary.fortuneLevel}期`);
  lines.push('');

  for (const msg of state.contextWindow) {
    if (msg.role === 'system') continue;
    const label = msg.role === 'user' ? '👤 用户' : '🤖 AI命理师';
    lines.push(`${label}: ${msg.content}`);
    lines.push('');
  }

  return lines.join('\n');
}
