// ============================================================
// AI Destiny OS — Visualization: Memory Views
// Life timeline, prediction accuracy, pattern summaries.
// ============================================================
import { getLifeTimeline, detectPatterns } from '../memory/eventTracker.js';
import { getAccuracyReport } from '../memory/predictionTracker.js';
/**
 * Render the full life timeline with events and predictions.
 */
export function renderLifeTimeline(store) {
    const timeline = getLifeTimeline(store);
    if (timeline.length === 0)
        return '暂无生活事件记录。';
    const lines = [];
    lines.push('生活时间线 · Life Timeline');
    lines.push('══════════════════════════════════════');
    for (const { events, summary } of timeline) {
        lines.push('');
        lines.push(`  ▸ ${summary}`);
        for (const event of events) {
            const impactIcon = event.impact > 0 ? '+' : event.impact < 0 ? '-' : '·';
            const impactBar = impactIcon.repeat(Math.abs(event.impact));
            lines.push(`    ${event.date.slice(0, 10)}  [${event.domain}] ${impactBar} ${event.title}`);
            if (event.notes) {
                lines.push(`      📝 ${event.notes}`);
            }
        }
    }
    return lines.join('\n');
}
/**
 * Render prediction accuracy dashboard.
 */
export function renderAccuracyReport(store) {
    const report = getAccuracyReport(store);
    const lines = [];
    lines.push('预测准确性 · Prediction Accuracy');
    lines.push('══════════════════════════════════════');
    lines.push('');
    lines.push(`  整体准确度: ${accuracyStars(report.overall)} ${report.overall.toFixed(2)}`);
    lines.push(`  已核实: ${report.totalVerified} 条    未核实: ${report.totalUnverified} 条`);
    lines.push(`  最佳领域: ${report.mostAccurateDomain}`);
    lines.push(`  需改进: ${report.leastAccurateDomain}`);
    lines.push('');
    // By domain
    if (Object.keys(report.byDomain).length > 0) {
        lines.push('  各领域准确度:');
        const entries = Object.entries(report.byDomain)
            .sort(([, a], [, b]) => b - a);
        for (const [domain, score] of entries) {
            const bar = accuracyBar(score);
            lines.push(`    ${domain.padEnd(4)} ${bar} ${score.toFixed(2)}`);
        }
    }
    // By year
    if (Object.keys(report.byYear).length > 0) {
        lines.push('');
        lines.push('  各年准确度:');
        const entries = Object.entries(report.byYear)
            .sort(([a], [b]) => Number(a) - Number(b));
        for (const [year, score] of entries) {
            const bar = accuracyBar(score);
            lines.push(`    ${year} ${bar} ${score.toFixed(2)}`);
        }
    }
    return lines.join('\n');
}
function accuracyStars(score) {
    if (score >= 1.5)
        return '★★★★★';
    if (score >= 1.0)
        return '★★★★☆';
    if (score >= 0.5)
        return '★★★☆☆';
    if (score >= 0.0)
        return '★★☆☆☆';
    if (score >= -1.0)
        return '★☆☆☆☆';
    return '☆☆☆☆☆';
}
function accuracyBar(score) {
    const normalized = (score + 2) / 4; // -2..2 → 0..1
    const filled = Math.round(normalized * 20);
    return '█'.repeat(filled) + '░'.repeat(20 - filled);
}
/**
 * Render detected life patterns.
 */
export function renderPatterns(store) {
    const patterns = detectPatterns(store);
    if (patterns.length === 0)
        return '暂无足够数据发现规律。需要至少两个同领域事件。';
    const lines = [];
    lines.push('人生规律 · Life Patterns');
    lines.push('══════════════════════════════════════');
    lines.push('');
    for (const pattern of patterns) {
        const conf = Math.round(pattern.confidence * 100);
        lines.push(`  📊 ${pattern.description}`);
        lines.push(`     置信度: ${conf}% | 年份: ${pattern.observedYears.join(', ')}`);
        lines.push('');
    }
    return lines.join('\n');
}
/**
 * Render a list of events filtered by domain.
 */
export function renderEventsByDomain(store, domain) {
    const events = store.getEvents({ domain });
    if (events.length === 0)
        return `${domain}领域暂无记录事件。`;
    const lines = [];
    lines.push(`${domain}事件记录`);
    lines.push('══════════════');
    for (const event of events) {
        const impact = event.impact > 0 ? `+${event.impact}` : `${event.impact}`;
        lines.push(`  [${event.date.slice(0, 10)}] ${impact} ${event.title}`);
    }
    return lines.join('\n');
}
/**
 * Render pending verifications.
 */
export function renderPendingVerifications(store) {
    const predictions = store.getSnapshot().predictions.filter(p => !p.verified);
    const pastDue = predictions.filter(p => p.targetYear < new Date().getFullYear());
    const upcoming = predictions.filter(p => p.targetYear >= new Date().getFullYear());
    const lines = [];
    lines.push('预测核实面板 · Verification Panel');
    lines.push('══════════════════════════════════════');
    lines.push('');
    if (pastDue.length > 0) {
        lines.push(`  待核实 (过期, ${pastDue.length}条):`);
        for (const pred of pastDue) {
            lines.push(`    ⚠️ ${pred.targetYear}年 ${pred.domain}: ${pred.predicted} (预测分: ${pred.predictedScore})`);
        }
        lines.push('');
    }
    if (upcoming.length > 0) {
        lines.push(`  进行中 (${upcoming.length}条):`);
        for (const pred of upcoming) {
            lines.push(`    ⏳ ${pred.targetYear}年 ${pred.domain}: ${pred.predicted} (预测分: ${pred.predictedScore})`);
        }
    }
    if (pastDue.length === 0 && upcoming.length === 0) {
        lines.push('  暂无活跃预测。');
    }
    return lines.join('\n');
}
/**
 * Render all memory views as a combined report.
 */
export function renderMemoryViews(store) {
    const sections = [];
    sections.push(renderLifeTimeline(store));
    sections.push('');
    sections.push(renderPatterns(store));
    sections.push('');
    sections.push(renderAccuracyReport(store));
    sections.push('');
    sections.push(renderPendingVerifications(store));
    return sections.join('\n');
}
//# sourceMappingURL=memoryViews.js.map