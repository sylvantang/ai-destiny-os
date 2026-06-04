// ============================================================
// AI Destiny OS — Agent Layer: search_memory Tool
// ============================================================
export const searchMemoryTool = {
    name: 'search_memory',
    description: '搜索用户的历史记忆，包括过往事件、运势记录和已验证的预测。可按领域和年份筛选。',
    parameters: {
        type: 'object',
        properties: {
            query: { type: 'string', description: '搜索关键词或领域（事业/财运/感情/健康/综合）' },
            startYear: { type: 'number', description: '起始年份（可选）' },
            endYear: { type: 'number', description: '结束年份（可选）' },
            minImpact: { type: 'number', description: '最小影响程度 1-10（可选）' },
        },
        required: ['query'],
    },
    async execute(params, context) {
        if (!context.memory) {
            return {
                content: '记忆系统尚未启用。请先开启记忆功能以记录和查询历史数据。',
            };
        }
        const query = params.query.toLowerCase();
        const domain = mapQueryToDomain(query);
        const filter = {};
        if (domain)
            filter.domain = domain;
        if (params.startYear)
            filter.startYear = params.startYear;
        if (params.endYear)
            filter.endYear = params.endYear;
        if (params.minImpact)
            filter.minImpact = params.minImpact;
        const events = context.memory.getEvents(filter);
        const predictions = context.memory.getPredictionsByYear(params.startYear ?? new Date().getFullYear());
        if (events.length === 0 && predictions.length === 0) {
            return {
                content: `未找到与"${params.query}"相关的历史记忆。`,
            };
        }
        const lines = [`搜索"${params.query}"的结果：`, ''];
        if (events.length > 0) {
            lines.push('【历史事件】');
            for (const e of events.slice(0, 10)) {
                lines.push(`- ${e.date.slice(0, 10)} | ${e.domain} | ${e.description}（影响: ${e.impact > 0 ? '+' : ''}${e.impact}）`);
            }
            lines.push('');
        }
        if (predictions.length > 0) {
            lines.push('【运势预测】');
            for (const p of predictions.slice(0, 5)) {
                const status = p.verified ? (p.accuracyRating !== null ? `准确度${p.accuracyRating > 0 ? '+' : ''}${p.accuracyRating}` : '已验证') : '未验证';
                lines.push(`- ${p.targetYear}年: ${p.predicted}（${status}）`);
            }
        }
        return {
            content: lines.join('\n'),
            data: { events: events.slice(0, 10), predictions: predictions.slice(0, 5) },
        };
    },
};
function mapQueryToDomain(query) {
    const q = query.toLowerCase();
    if (q.includes('事业') || q.includes('工作') || q.includes('职业'))
        return '事业';
    if (q.includes('财') || q.includes('钱') || q.includes('收入'))
        return '财运';
    if (q.includes('感情') || q.includes('婚姻') || q.includes('恋爱'))
        return '感情';
    if (q.includes('健康') || q.includes('身体'))
        return '健康';
    return null; // 综合搜索
}
//# sourceMappingURL=searchMemory.js.map