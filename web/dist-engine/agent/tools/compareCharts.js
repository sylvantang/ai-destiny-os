// ============================================================
// AI Destiny OS — Agent Layer: compare_charts Tool
// ============================================================
import { buildDestinyContext } from '../context.js';
export const compareChartsTool = {
    name: 'compare_charts',
    description: '对比两个八字命盘的关键差异，包括日主、旺衰、格局、用神、运势对比。用于合婚、合作分析等场景。',
    parameters: {
        type: 'object',
        properties: {
            otherYear: { type: 'number', description: '对方出生年份' },
            otherMonth: { type: 'number', description: '对方出生月份 (1-12)' },
            otherDay: { type: 'number', description: '对方出生日 (1-31)' },
            otherHour: { type: 'number', description: '对方出生小时 (0-23)' },
            otherMinute: { type: 'number', description: '对方出生分钟 (0-59)' },
            otherGender: { type: 'string', description: '对方性别', enum: ['男', '女'] },
        },
        required: ['otherYear', 'otherMonth', 'otherDay', 'otherHour'],
    },
    async execute(params, context) {
        const otherBirth = {
            year: params.otherYear,
            month: params.otherMonth,
            day: params.otherDay,
            hour: params.otherHour,
            minute: params.otherMinute ?? 0,
            longitude: 116.4,
            isDST: false,
            gender: params.otherGender ?? '男',
        };
        const other = buildDestinyContext(otherBirth);
        const self = context;
        const selfDM = `${self.ctx.strength.dayMaster.stem}${self.ctx.strength.dayMaster.wuxing}`;
        const otherDM = `${other.ctx.strength.dayMaster.stem}${other.ctx.strength.dayMaster.wuxing}`;
        const wuxingCompat = computeWuxingCompat(self.ctx.strength.dayMaster.wuxing, other.ctx.strength.dayMaster.wuxing);
        const lines = [
            `命盘对比分析`,
            ``,
            `【日主对比】`,
            `本人：${selfDM}（${self.ctx.strength.dayMaster.yinYang}性）— ${self.ctx.strength.level}`,
            `对方：${otherDM}（${other.ctx.strength.dayMaster.yinYang}性）— ${other.ctx.strength.level}`,
            `五行关系：${wuxingCompat}`,
            ``,
            `【格局对比】`,
            `本人：${self.ctx.structure.primaryPattern}${self.ctx.structure.isFavorable ? '（得用）' : ''}`,
            `对方：${other.ctx.structure.primaryPattern}${other.ctx.structure.isFavorable ? '（得用）' : ''}`,
            ``,
            `【用神对比】`,
            `本人用神：${self.ctx.yongShen.yongShen.wuxing}（${self.ctx.yongShen.yongShen.shiShen}）`,
            `对方用神：${other.ctx.yongShen.yongShen.wuxing}（${other.ctx.yongShen.yongShen.shiShen}）`,
            `用神互补：${checkYongShenCompatibility(self.ctx.yongShen.yongShen.wuxing, other.ctx.yongShen.yongShen.wuxing)}`,
            ``,
            `【运势对比】`,
            `本人运势：${self.ctx.fortune.overall.score}分 — ${self.ctx.fortune.overall.level}`,
            `对方运势：${other.ctx.fortune.overall.score}分 — ${other.ctx.fortune.overall.level}`,
        ];
        return {
            content: lines.join('\n'),
            data: {
                self: { dayMaster: selfDM, strength: self.ctx.strength, structure: self.ctx.structure, yongShen: self.ctx.yongShen.yongShen },
                other: { dayMaster: otherDM, strength: other.ctx.strength, structure: other.ctx.structure, yongShen: other.ctx.yongShen.yongShen },
                compatibility: wuxingCompat,
            },
        };
    },
};
function computeWuxingCompat(a, b) {
    const generates = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    const controls = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
    if (a === b)
        return '五行相同 — 相互理解但缺乏互补';
    if (generates[a] === b)
        return `${a}生${b} — 本人滋养对方`;
    if (generates[b] === a)
        return `${b}生${a} — 对方滋养本人（有利）`;
    if (controls[a] === b)
        return `${a}克${b} — 本人克制对方`;
    if (controls[b] === a)
        return `${b}克${a} — 对方克制本人（需注意）`;
    return '五行关系中性';
}
function checkYongShenCompatibility(a, b) {
    const generates = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    if (a === b)
        return '用神相同，目标一致，合作关系良好';
    if (generates[a] === b)
        return '本人用神生对方用神，本人能帮助对方发展';
    if (generates[b] === a)
        return '对方用神生本人用神，对方能帮助本人发展';
    return '用神不同，各有侧重，需互相理解';
}
//# sourceMappingURL=compareCharts.js.map