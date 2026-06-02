// ============================================================
// AI Destiny OS — Agent Layer: Deterministic Provider
// Fallback responses when no LLM is available.
// ============================================================

import type { DestinyChart } from '../../core/astro/types.js';
import { renderPersonalityProse } from '../../ai/personality.js';
import { renderCareerProse } from '../../ai/career.js';
import { renderRelationshipProse } from '../../ai/relationship.js';
import { renderStrategyProse } from '../../ai/strategy.js';
import { renderDashboard } from '../../visualization/dashboard.js';
import { renderChart } from '../../visualization/chartRenderer.js';
import type { QueryDomain, AgentResponse } from '../agentEngine.js';
import type { ProviderState, ResponseProvider } from './types.js';

export class DeterministicProvider implements ResponseProvider {
  readonly name = 'deterministic';

  respond(
    topic: QueryDomain,
    state: ProviderState,
    chart: DestinyChart,
    _prompt?: import('../../ai/promptBuilder.js').AIPrompt | null,
  ): AgentResponse {
    const { ctx, personality, career, relationship, strategy } = state;

    switch (topic) {
      case '性格':
        return {
          text: renderPersonalityProse(personality, ctx),
          topic,
          llmGenerated: false,
        };
      case '事业':
        return {
          text: renderCareerProse(career, ctx),
          topic,
          llmGenerated: false,
        };
      case '感情':
        return {
          text: renderRelationshipProse(relationship, ctx),
          topic,
          llmGenerated: false,
        };
      case '运势': {
        const f = ctx.fortune;
        const yearlyText = f.yearlyAnalysis.slice(0, 3).map(y =>
          `${y.year}年：事业${y.career}分 财富${y.wealth}分 感情${y.relationship}分 健康${y.health}分`
        ).join('\n');
        return {
          text: `流年运势分析\n\n当前运势处于${f.overall.level}期，综合评分${f.overall.score}/100。${f.overall.levelLabel}\n\n最佳领域：${f.overall.bestDimension}，需关注：${f.overall.riskDimension}\n\n${f.summary}\n\n近年流年得分：\n${yearlyText}\n\n${f.keyYears.best ? `最佳年份：${f.keyYears.best.year}年` : ''}${f.keyYears.worst ? `，需注意年份：${f.keyYears.worst.year}年` : ''}。`,
          topic,
          llmGenerated: false,
        };
      }
      case '战略':
        return {
          text: renderStrategyProse(strategy, ctx),
          topic,
          llmGenerated: false,
        };
      case '排盘': {
        const viz = renderChart(chart);
        return {
          text: `命盘排盘完成。日主${chart.dayMaster.name}${chart.dayMasterWuxing}。`,
          visualization: viz,
          topic,
          llmGenerated: false,
        };
      }
      case '综合':
      default: {
        const viz = renderDashboard(
          ctx.chart, ctx.strength, ctx.structure,
          ctx.climate, ctx.relations, ctx.fortune,
          { compact: true },
        );
        const parts = [
          renderPersonalityProse(personality, ctx),
          renderCareerProse(career, ctx),
          renderRelationshipProse(relationship, ctx),
          renderStrategyProse(strategy, ctx),
        ];
        return {
          text: parts.join('\n\n---\n\n'),
          visualization: viz,
          topic,
          llmGenerated: false,
        };
      }
    }
  }
}
