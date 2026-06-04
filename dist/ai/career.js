// ============================================================
// AI Destiny OS — AI Layer: Career Analysis
// Industry fit, entrepreneurship, wealth path, risk profile.
// ============================================================
import { buildCareerPrompt } from './promptBuilder.js';
// Industry database keyed by favorable wuxing
const WUXING_INDUSTRIES = {
    '木': [
        { industry: '教育培训', fit: 9, reason: '木主生长，教育培训助人成长' },
        { industry: '医疗健康', fit: 8, reason: '木主生发，健康行业滋养生命' },
        { industry: '环保生态', fit: 8, reason: '木主自然，环保行业顺应天性' },
        { industry: '文化出版', fit: 7, reason: '木主文采，文化传播发挥所长' },
        { industry: '人力资源', fit: 7, reason: '木主仁爱，人才发展正合其性' },
    ],
    '火': [
        { industry: '互联网科技', fit: 9, reason: '火主传播，科技行业高速发展' },
        { industry: '媒体娱乐', fit: 9, reason: '火主热情，传媒娱乐需要感染力' },
        { industry: '能源电力', fit: 8, reason: '火主能量，能源行业正合其性' },
        { industry: '市场营销', fit: 8, reason: '火主扩散，市场营销需要传播力' },
        { industry: '餐饮食品', fit: 7, reason: '火主烹饪，餐饮行业发挥热忱' },
    ],
    '土': [
        { industry: '房地产建筑', fit: 9, reason: '土主承载，地产建筑根基深厚' },
        { industry: '金融保险', fit: 8, reason: '土主信实，金融行业需要稳定感' },
        { industry: '农业食品', fit: 8, reason: '土主稼穑，农业是立身之本' },
        { industry: '物业管理', fit: 7, reason: '土主稳定，物业管理持续可靠' },
        { industry: '矿产能源', fit: 7, reason: '土藏金玉，资源行业匹配度高' },
    ],
    '金': [
        { industry: '金融投资', fit: 9, reason: '金主财富，金融行业得心应手' },
        { industry: '法律审计', fit: 9, reason: '金主义，法律行业重原则公正' },
        { industry: '机械制造', fit: 8, reason: '金主利器，精密制造发挥精准特质' },
        { industry: '珠宝奢侈品', fit: 7, reason: '金属贵重，高端行业合乎其性' },
        { industry: '军警安保', fit: 7, reason: '金主肃杀，军警行业体现决断力' },
    ],
    '水': [
        { industry: '贸易物流', fit: 9, reason: '水主流动，贸易物流畅通无阻' },
        { industry: '咨询智库', fit: 9, reason: '水主智慧，咨询行业发挥洞察力' },
        { industry: '旅游出行', fit: 8, reason: '水主流动，旅游行业顺应天性' },
        { industry: '艺术设计', fit: 8, reason: '水主灵气，创意行业发挥想象力' },
        { industry: '外交公关', fit: 7, reason: '水主沟通，外交公关长袖善舞' },
    ],
};
/**
 * Analyze career path from BaZi structure.
 */
export function analyzeCareer(ctx) {
    const { chart, strength, structure, climate, relations, fortune } = ctx;
    // Determine favorable elements
    const favorableElements = determineFavorableElements(chart, strength, structure, climate);
    // Industry recommendations
    const industries = recommendIndustries(favorableElements);
    // Entrepreneurship
    const { score: entScore, analysis: entAnalysis } = evalEntrepreneurship(chart, strength, structure, relations);
    // Wealth pattern
    const wealthPattern = deriveWealthPattern(chart, structure, relations);
    // Wealth peaks
    const wealthPeaks = deriveWealthPeaks(chart, fortune);
    // Risk profile
    const riskProfile = deriveRiskProfile(chart, strength, structure, relations);
    // Competitive advantage
    const competitiveAdvantage = deriveCompetitiveAdvantage(chart, structure, relations);
    // Career risks
    const careerRisks = deriveCareerRisks(chart, strength, structure, relations);
    return {
        industries,
        entrepreneurshipScore: entScore,
        entrepreneurshipAnalysis: entAnalysis,
        wealthPattern,
        wealthPeaks,
        riskProfile,
        competitiveAdvantage,
        careerRisks,
        prompt: buildCareerPrompt(ctx),
    };
}
// ---- Analysis Functions ----
function determineFavorableElements(chart, strength, _structure, climate) {
    const elements = new Set();
    // Climate priority: if needs adjustment, that element is most favorable
    if (climate.needsAdjustment && climate.neededWuxing) {
        elements.add(climate.neededWuxing);
    }
    // Strength-based: weak needs support (生我/同我), strong needs drain (我生/我克/克我)
    if (strength.level === '偏弱' || strength.level === '从弱') {
        // Favor elements that generate or match the day master
        const dmWx = chart.dayMasterWuxing;
        const generators = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
        elements.add(generators[dmWx]);
        elements.add(dmWx);
    }
    else if (strength.level === '偏旺' || strength.level === '从旺') {
        // Favor elements that the day master generates, controls, or is controlled by
        const dmWx = chart.dayMasterWuxing;
        const generated = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
        const controlled = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };
        const controllers = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };
        elements.add(generated[dmWx]);
        elements.add(controlled[dmWx]);
        if (strength.level !== '从旺')
            elements.add(controllers[dmWx]);
    }
    return [...elements];
}
function recommendIndustries(favorableElements) {
    const results = [];
    for (const el of favorableElements) {
        const inds = WUXING_INDUSTRIES[el] ?? [];
        for (const ind of inds) {
            if (!results.some(r => r.industry === ind.industry)) {
                results.push(ind);
            }
        }
    }
    return results.sort((a, b) => b.fit - a.fit).slice(0, 8);
}
function evalEntrepreneurship(_chart, strength, _structure, relations) {
    let score = 5;
    const reasons = [];
    // 食伤生财 → strong entrepreneurship signal
    if (relations.relations.some(r => r.name === '食伤生财' && r.category === 'favorable')) {
        score += 2;
        reasons.push('食伤生财，才华变现能力强');
    }
    // 偏财格 → natural entrepreneur
    if (relations.relations.some(r => r.name.includes('财'))) {
        score += 1;
        reasons.push('财星有力，商业头脑清晰');
    }
    // Strong day master → can handle entrepreneurship stress
    if (strength.level === '偏旺' || strength.level === '从旺') {
        score += 1;
        reasons.push('偏旺能担财官，承压能力强');
    }
    else if (strength.level === '偏弱' || strength.level === '从弱') {
        score -= 1;
        reasons.push('身偏弱，创业需合伙或贵人扶持');
    }
    // 伤官 → innovation drive
    const hasShangGuan = relations.relations.some(r => r.shiShens?.includes('伤官'));
    if (hasShangGuan) {
        score += 1;
        reasons.push('伤官创新力强，适合颠覆性创业');
    }
    // 正官重 → may prefer stability
    const hasZhengGuan = relations.relations.some(r => r.shiShens?.includes('正官'));
    if (hasZhengGuan) {
        score -= 1;
        reasons.push('正官心性，更适合稳步升迁而非冒险创业');
    }
    return {
        score: Math.max(1, Math.min(10, score)),
        analysis: reasons.join('。'),
    };
}
function deriveWealthPattern(_chart, structure, relations) {
    if (relations.relations.some(r => r.name === '食伤生财' && r.category === 'favorable')) {
        return '才华变现型 — 依靠专业技能和创意获取财富，收入与技术能力正相关';
    }
    if (relations.relations.some(r => r.name === '财官相生' && r.category === 'favorable')) {
        return '资源积累型 — 通过职位晋升和资源整合积累财富，财富增长稳定持续';
    }
    if (structure.patternShiShen === '偏财') {
        return '投资机会型 — 善于捕捉市场机会获得超额回报，需注意风险控制';
    }
    return '综合多元型 — 财富来源多元化，正职稳定收入配合副业和投资';
}
function deriveWealthPeaks(_chart, fortune) {
    const peaks = [];
    for (const lp of fortune.lifePeriods) {
        if (lp.keyAdvice.includes('财富') || lp.description.includes('财')) {
            peaks.push(`${lp.name}（${lp.ageRange}）`);
        }
    }
    if (peaks.length === 0) {
        peaks.push('需结合具体大运流年进一步分析');
    }
    return peaks.slice(0, 3);
}
function deriveRiskProfile(_chart, strength, _structure, relations) {
    const hasCaiHuaiYin = relations.relations.some(r => r.name === '财坏印');
    const hasBiJieDuoCai = relations.relations.some(r => r.name === '比劫夺财');
    if (strength.level === '偏旺' || strength.level === '从旺') {
        return hasCaiHuaiYin
            ? '高风险偏好，但需注意为钱损学。建议投资前充分调研。'
            : '高风险偏好，能承担较大波动。适合权益类投资和创业投资。';
    }
    if (strength.level === '偏弱' || strength.level === '从弱') {
        return hasBiJieDuoCai
            ? '偏保守型，需防合作破财。建议稳健理财，避免高风险投资。'
            : '偏保守型，适合稳健增值策略。优先考虑固定收益和保险配置。';
    }
    return '中性风险偏好，适合均衡配置。可配置部分高风险资产但需设止损。';
}
function deriveCompetitiveAdvantage(chart, structure, relations) {
    const advantages = [];
    const wx = chart.dayMasterWuxing;
    const wxAdv = {
        '木': '长远规划和系统思考能力',
        '火': '感染力和团队激励能力',
        '土': '稳定性和可靠性',
        '金': '决断力和原则性',
        '水': '适应力和学习能力',
    };
    advantages.push(wxAdv[wx] ?? '综合能力强');
    if (structure.patternShiShen === '食神' || structure.patternShiShen === '伤官') {
        advantages.push('创新思维和技术专长');
    }
    if (structure.patternShiShen === '正官' || structure.patternShiShen === '七杀') {
        advantages.push('领导力和执行力');
    }
    if (relations.relations.some(r => r.name === '官印相生' && r.category === 'favorable')) {
        advantages.push('资源整合和贵人运');
    }
    return advantages.slice(0, 3);
}
function deriveCareerRisks(_chart, _strength, _structure, relations) {
    const risks = [];
    for (const r of relations.relations) {
        if (r.category === 'unfavorable') {
            switch (r.name) {
                case '伤官见官':
                    risks.push('与上级或权威的冲突可能影响职业发展');
                    break;
                case '财坏印':
                    risks.push('过度追求短期利益可能损害长期发展基础');
                    break;
                case '比劫夺财':
                    risks.push('合作纠纷或竞争可能导致财务损失');
                    break;
            }
        }
    }
    if (risks.length === 0) {
        risks.push('需注意行业周期变化', '避免过度依赖单一收入来源');
    }
    return risks;
}
// ---- Prose Renderer ----
function careerDirectionNote(industries, wx) {
    const wxField = {
        '木': '教育、文化、健康、环保等需要长期耕耘和滋养他人的领域',
        '火': '互联网、媒体、能源、营销等需要传播力和感染力的领域',
        '土': '地产、金融、农业、管理等需要稳定性和承载力的领域',
        '金': '金融、法律、制造、审计等需要精准度和原则性的领域',
        '水': '贸易、咨询、旅游、设计等需要灵活性和沟通力的领域',
    };
    let text = `从格局和五行来看，${wxField[wx] ?? '多元化领域'}天生适合你。`;
    if (industries.length > 0) {
        const top = industries.slice(0, 3);
        text += `具体来说，${top.map(i => `${i.industry}（契合度${i.fit}分）`).join('、')}是最值得关注的方向。`;
        if (industries.length > 3) {
            text += `此外，${industries.slice(3, 6).map(i => i.industry).join('、')}等方向也值得探索。`;
        }
    }
    return text;
}
function entrepreneurshipNote(score, analysis) {
    if (score >= 7) {
        return `关于创业，你的命盘给出了比较强的支持信号（创业评分${score}/10）。${analysis}。你具备独立开创事业的核心条件，关键在于选对赛道和时机。`;
    }
    else if (score >= 5) {
        return `创业方面，你的命盘显示有一定潜力但需要更多准备（创业评分${score}/10）。${analysis}。建议先积累行业经验和人脉，等待合适的时机再出手。`;
    }
    else {
        return `创业方面，从命盘来看你可能更适合在现有体系中发展（创业评分${score}/10）。${analysis}。这并不意味着你不能拥有自己的事业，而是说稳扎稳打的路径可能更适合你。`;
    }
}
function fortuneRhythmNote(fortune, wealthPeaks) {
    let text = `从大运走势来看，你的事业发展有自己的节奏。当前运势处于${fortune.overall.level}期（${fortune.overall.score}分），`;
    switch (fortune.overall.level) {
        case '高峰':
            text += '现在是天时地利人和的阶段，该进攻就大胆进攻，不要犹豫。';
            break;
        case '上升':
            text += '运势正在往上走，现在做的布局和投入，未来两三年会看到回报。';
            break;
        case '平缓':
            text += '这是一个适合沉淀和准备的阶段。磨刀不误砍柴工，现在积累的能力和人脉，会在下一个上升期集中爆发。';
            break;
        case '低谷':
            text += '此刻不宜冒进，守住基本盘就是胜利。利用这段时间学习和提升自己，为下一次起跳蓄力。';
            break;
    }
    if (wealthPeaks.length > 0) {
        text += `财富积累的高峰期在${wealthPeaks.join('、')}，这些阶段要重点把握。`;
    }
    return text;
}
function riskNote(risks, riskProfile, wealthPattern) {
    let text = `风险方面需要清醒认识。你的财富模式是"${wealthPattern}"。`;
    text += `风险偏好属于"${riskProfile}"。`;
    if (risks.length > 0) {
        text += `需要留意的职业风险包括：${risks.join('；')}。提前预判、做好预案，就能平稳度过。`;
    }
    return text;
}
export function renderCareerProse(result, ctx) {
    const { strength, structure, fortune } = ctx;
    const dm = strength.dayMaster;
    const paragraphs = [];
    // 1. Career direction
    paragraphs.push(`${dm.stem}${dm.wuxing}日主配合${structure.primaryPattern}格局，决定了你的事业底色。` +
        careerDirectionNote(result.industries, dm.wuxing));
    // 2. Core competencies
    paragraphs.push(`你的核心竞争力在于：${result.competitiveAdvantage.join('、')}。` +
        `在职场中，这些能力让你在${result.industries[0]?.industry ?? '适合的领域'}里尤其能发挥优势。` +
        `日主${strength.level}的状态意味着${strength.levelLabel}，这在职业选择上是一个重要的参考维度。`);
    // 3. Entrepreneurship
    paragraphs.push(entrepreneurshipNote(result.entrepreneurshipScore, result.entrepreneurshipAnalysis));
    // 4. Fortune rhythm
    paragraphs.push(fortuneRhythmNote(fortune, result.wealthPeaks));
    // 5. Risk
    paragraphs.push(riskNote(result.careerRisks, result.riskProfile, result.wealthPattern));
    // 6. Closing advice
    paragraphs.push('事业发展的核心心法是：顺势而为。运势好的时候大胆出击，运势平的时候沉淀积累，运势差的时候守住底线。' +
        '了解自己的五行优势和格局特点，选择与之匹配的行业和岗位，就能事半功倍。' +
        '命理给你的是一张地图，怎么走、走多快，取决于你的选择和行动。');
    return paragraphs.join('\n\n');
}
//# sourceMappingURL=career.js.map