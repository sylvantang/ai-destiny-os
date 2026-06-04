// ============================================================
// AI Destiny OS — Agent Layer: Agent Engine (AI 命理师)
// Top-level orchestrator: chart → destiny → AI → memory → viz.
// ============================================================
import { buildComprehensivePrompt, buildPersonalityPrompt, buildCareerPrompt, buildRelationshipPrompt, buildStrategyPrompt, buildYearlyFortunePrompt, } from '../ai/promptBuilder.js';
import { MemoryStore } from '../memory/memoryStore.js';
import { logYearlyPredictions } from '../memory/predictionTracker.js';
import { buildEnrichedContext, formatMemoryForPrompt } from '../memory/contextBuilder.js';
import { renderDashboard } from '../visualization/dashboard.js';
import { renderChart } from '../visualization/chartRenderer.js';
import { buildDestinyContext } from './context.js';
import { detectTopic } from './router.js';
import { DeterministicProvider } from './providers/deterministic.js';
import { LLMProvider } from './providers/llmProvider.js';
// ---- Agent Class ----
export class DestinyAgent {
    state;
    llm;
    deterministic;
    llmProvider;
    constructor(birth, llm) {
        this.llm = llm ?? null;
        const dc = buildDestinyContext(birth);
        this.state = {
            birth,
            chart: dc.chart,
            ctx: dc.ctx,
            personality: dc.personality,
            career: dc.career,
            relationship: dc.relationship,
            strategy: dc.strategy,
            memory: null,
            history: [],
            session: {
                id: `session_${Date.now()}`,
                createdAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
                turnCount: 0,
            },
        };
        this.deterministic = new DeterministicProvider();
        this.llmProvider = this.llm ? new LLMProvider(this.llm, this.toolContext) : null;
    }
    // ---- Query Processing ----
    get providerState() {
        const { chart, ctx, personality, career, relationship, strategy } = this.state;
        return { chart, ctx, personality, career, relationship, strategy };
    }
    get toolContext() {
        return {
            chart: this.state.chart,
            ctx: this.state.ctx,
            personality: this.state.personality,
            career: this.state.career,
            relationship: this.state.relationship,
            strategy: this.state.strategy,
            memory: this.state.memory,
            history: this.state.history.map(h => ({
                role: h.role === 'agent' ? 'agent' : 'user',
                content: h.content,
            })),
        };
    }
    /**
     * Process a user query and return an agent response.
     */
    processQuery(input) {
        const topic = detectTopic(input);
        this.state.session.turnCount++;
        this.state.session.lastActiveAt = new Date().toISOString();
        this.state.history.push({
            role: 'user', content: input, topic,
            timestamp: new Date().toISOString(),
        });
        const prompt = this.buildPromptForTopic(input, topic);
        const response = this.deterministic.respond(topic, this.providerState, this.state.chart, prompt);
        // Attach prompt to deterministic response
        const result = { ...response, prompt: prompt ?? undefined };
        this.state.history.push({
            role: 'agent', content: result.text, topic,
            timestamp: new Date().toISOString(),
        });
        return result;
    }
    /**
     * Set or replace the LLM client.
     */
    setLLM(llm) {
        this.llm = llm;
        this.llmProvider = new LLMProvider(llm, this.toolContext);
        // Update tool context on existing provider
        if (this.llmProvider) {
            this.llmProvider.setToolContext(this.toolContext);
        }
    }
    /**
     * Check if an LLM client is configured.
     */
    hasLLM() {
        return this.llm !== null;
    }
    /**
     * Process a query asynchronously with LLM-generated response.
     */
    async processQueryAsync(input) {
        const topic = detectTopic(input);
        this.state.session.turnCount++;
        this.state.session.lastActiveAt = new Date().toISOString();
        this.state.history.push({
            role: 'user', content: input, topic,
            timestamp: new Date().toISOString(),
        });
        const prompt = this.buildPromptForTopic(input, topic);
        // No LLM or no prompt → deterministic fallback
        if (!this.llmProvider || !prompt) {
            const fallback = this.deterministic.respond(topic, this.providerState, this.state.chart);
            const response = { ...fallback, llmGenerated: false };
            this.state.history.push({
                role: 'agent', content: response.text, topic,
                timestamp: new Date().toISOString(),
            });
            return response;
        }
        const response = await this.llmProvider.respondAsync(topic, this.providerState, this.state.chart, prompt, this.state.history, this.state.memory);
        this.state.history.push({
            role: 'agent', content: response.text, topic,
            timestamp: new Date().toISOString(),
        });
        return response;
    }
    /**
     * Stream a query response token by token.
     */
    async *processQueryStream(input) {
        const topic = detectTopic(input);
        const prompt = this.buildPromptForTopic(input, topic);
        this.state.session.turnCount++;
        this.state.session.lastActiveAt = new Date().toISOString();
        this.state.history.push({
            role: 'user', content: input, topic,
            timestamp: new Date().toISOString(),
        });
        // No LLM → fallback to deterministic single yield
        if (!this.llmProvider || !prompt) {
            const fallback = this.deterministic.respond(topic, this.providerState, this.state.chart);
            this.state.history.push({
                role: 'agent', content: fallback.text, topic,
                timestamp: new Date().toISOString(),
            });
            yield { type: 'token', content: fallback.text };
            yield { type: 'done', topic, prompt: prompt ?? undefined };
            return;
        }
        let fullText = '';
        for await (const event of this.llmProvider.respondStream(topic, this.providerState, this.state.chart, prompt, this.state.history, this.state.memory)) {
            if (event.type === 'token' && event.content) {
                fullText += event.content;
                yield { type: 'token', content: event.content };
            }
            else if (event.type === 'error') {
                this.state.history.push({
                    role: 'agent', content: fullText || event.error || 'Stream error', topic,
                    timestamp: new Date().toISOString(),
                });
                yield { type: 'error', error: event.error };
                yield { type: 'done', topic, prompt };
                return;
            }
            else if (event.type === 'done') {
                this.state.history.push({
                    role: 'agent', content: fullText, topic,
                    timestamp: new Date().toISOString(),
                });
                yield { type: 'done', topic, prompt };
                return;
            }
        }
        // Fallthrough: stream ended without done/error event
        this.state.history.push({
            role: 'agent', content: fullText, topic,
            timestamp: new Date().toISOString(),
        });
        yield { type: 'done', topic, prompt };
    }
    /**
     * Build the appropriate AI prompt for a given topic.
     */
    buildPromptForTopic(input, topic) {
        const { ctx } = this.state;
        switch (topic) {
            case '性格': return buildPersonalityPrompt(ctx);
            case '事业': return buildCareerPrompt(ctx);
            case '感情': return buildRelationshipPrompt(ctx);
            case '运势': return buildYearlyFortunePrompt(ctx, new Date().getFullYear());
            case '战略': return buildStrategyPrompt(ctx, input);
            case '综合': return buildComprehensivePrompt(ctx);
            case '排盘': return null;
        }
    }
    // ---- Memory Integration ----
    enableMemory(userId) {
        const id = userId ?? `user_${this.state.birth.year}${this.state.birth.month}${this.state.birth.day}`;
        // Create fresh store synchronously (works without DB)
        this.state.memory = new MemoryStore(id, this.state.birth);
        // Fire-and-forget: try loading existing data + enable persistence in background
        MemoryStore.load(id).then(existing => {
            if (existing) {
                this.state.memory = existing;
            }
            else {
                this.state.memory.enablePersistence();
            }
        }).catch(() => { });
        return this.state.memory;
    }
    loadMemory(json) {
        this.state.memory = MemoryStore.fromJSON(json);
    }
    logPredictions() {
        if (!this.state.memory)
            this.enableMemory();
        const year = new Date().getFullYear();
        const yearlyFortune = this.state.ctx.fortune.yearlyAnalysis.find(y => y.year === year) ?? null;
        logYearlyPredictions(this.state.memory, year, yearlyFortune);
    }
    processQueryWithMemory(input) {
        if (!this.state.memory)
            this.enableMemory();
        const response = this.processQuery(input);
        const enriched = buildEnrichedContext(this.state.memory, this.state.ctx);
        response.memoryContext = formatMemoryForPrompt(enriched);
        return response;
    }
    // ---- Dashboard ----
    renderDashboard(options) {
        const { ctx } = this.state;
        return renderDashboard(ctx.chart, ctx.strength, ctx.structure, ctx.climate, ctx.relations, ctx.fortune, options);
    }
    renderChart() {
        return renderChart(this.state.chart);
    }
    // ---- Session ----
    getSessionSummary() {
        const { session, history } = this.state;
        const topics = history
            .filter(t => t.role === 'user')
            .map(t => t.topic ?? '综合');
        return [
            `会话ID: ${session.id}`,
            `创建时间: ${session.createdAt.slice(0, 10)}`,
            `对话轮次: ${session.turnCount}`,
            `讨论主题: ${[...new Set(topics)].join('、')}`,
        ].join('\n');
    }
}
//# sourceMappingURL=agentEngine.js.map