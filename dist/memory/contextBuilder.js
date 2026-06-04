// ============================================================
// AI Destiny OS — Memory Layer: Context Builder
// Builds memory-enriched prompt context for the AI layer.
// Bridges the Memory System → AI Interpretation Layer.
// ============================================================
import { buildMemoryContext } from './eventTracker.js';
import { getAccuracyReport, getDueVerifications, getActivePredictions } from './predictionTracker.js';
/**
 * Build a memory-enriched context by combining deterministic analysis
 * with the user's personal history.
 */
export function buildEnrichedContext(store, base) {
    const memory = buildMemoryContext(store);
    const accuracy = getAccuracyReport(store);
    const dueVerifications = getDueVerifications(store);
    const activePredictions = getActivePredictions(store);
    return {
        base,
        memory,
        accuracy,
        dueVerifications,
        activePredictions,
    };
}
/**
 * Format memory context as a structured text block for LLM prompts.
 */
export function formatMemoryForPrompt(ctx) {
    const parts = [];
    // Life phase
    parts.push(`## 当前人生阶段\n${ctx.memory.currentLifePhase}`);
    // Recent events
    if (ctx.memory.recentEvents.length > 0) {
        parts.push('\n## 近期重要事件');
        for (const event of ctx.memory.recentEvents) {
            const impactLabel = event.impact > 0 ? `+${event.impact}` : `${event.impact}`;
            parts.push(`- [${event.date.slice(0, 7)}] ${impactLabel} ${event.domain} | ${event.title}`);
        }
    }
    // Patterns
    if (ctx.memory.patterns.length > 0) {
        parts.push('\n## 人生规律');
        for (const pattern of ctx.memory.patterns.slice(0, 5)) {
            const confPct = Math.round(pattern.confidence * 100);
            parts.push(`- ${pattern.description}（置信度: ${confPct}%）`);
        }
    }
    // Prediction accuracy
    parts.push('\n## 预测准确性');
    parts.push(`- 整体准确度: ${formatAccuracy(ctx.accuracy.overall)}`);
    parts.push(`- 已核实预测: ${ctx.accuracy.totalVerified}条`);
    parts.push(`- 最准领域: ${ctx.accuracy.mostAccurateDomain}`);
    parts.push(`- 最需改进领域: ${ctx.accuracy.leastAccurateDomain}`);
    if (ctx.memory.predictionAccuracy.trend !== 'stable') {
        const trendLabel = ctx.memory.predictionAccuracy.trend === 'improving' ? '上升中' : '需关注';
        parts.push(`- 趋势: ${trendLabel}`);
    }
    // Due verifications
    if (ctx.dueVerifications.length > 0) {
        parts.push('\n## 待核实的预测');
        for (const pred of ctx.dueVerifications.slice(0, 5)) {
            parts.push(`- ${pred.targetYear}年 ${pred.domain}: ${pred.predicted}`);
        }
    }
    return parts.join('\n');
}
function formatAccuracy(score) {
    if (score >= 1.5)
        return '非常准确';
    if (score >= 0.5)
        return '比较准确';
    if (score >= -0.5)
        return '基本准确';
    if (score >= -1.5)
        return '不太准确';
    return '需要大幅改进';
}
/**
 * Build a personalized system prompt overlay based on user history.
 */
export function buildPersonalizedOverlay(store) {
    const user = store.getUser();
    const stats = store.getStats();
    const accuracy = getAccuracyReport(store);
    const parts = [];
    parts.push(`用户已记录${stats.totalEvents}个生活事件，追踪时间跨度${stats.yearRange ? `${stats.yearRange[0]}-${stats.yearRange[1]}年` : '暂无数据'}。`);
    if (stats.bestDomain) {
        parts.push(`最常记录领域为${stats.bestDomain}。`);
    }
    if (accuracy.totalVerified > 0) {
        parts.push(`命理预测准确度：${formatAccuracy(accuracy.overall)}，${accuracy.mostAccurateDomain}预测最准。`);
    }
    if (user.focusAreas.length > 0) {
        parts.push(`用户关注领域：${user.focusAreas.join('、')}。`);
    }
    if (user.tags.length > 0) {
        parts.push(`用户标签：${user.tags.join('、')}。`);
    }
    return parts.join('\n');
}
/**
 * Suggest memory-guided adjustments to AI interpretation tone.
 */
export function suggestToneAdjustment(store) {
    const stats = store.getStats();
    if (stats.verifiedPredictions >= 5 && stats.averageAccuracy >= 0.5) {
        return 'encouraging';
    }
    if (stats.verifiedPredictions >= 5 && stats.averageAccuracy < -0.5) {
        return 'cautionary';
    }
    const recentEvents = store.getRecentEvents(5);
    const negativeCount = recentEvents.filter(e => e.impact < 0).length;
    if (negativeCount >= 3)
        return 'encouraging';
    if (negativeCount === 0)
        return 'balanced';
    return 'balanced';
}
//# sourceMappingURL=contextBuilder.js.map