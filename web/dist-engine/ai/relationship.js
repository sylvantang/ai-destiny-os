// ============================================================
// AI Destiny OS — AI Layer: Relationship Analysis
// Attachment style, emotional risks, marriage timing.
// ============================================================
import { buildRelationshipPrompt } from './promptBuilder.js';
/**
 * Analyze relationship patterns from BaZi structure.
 */
export function analyzeRelationship(ctx) {
    const { chart, strength, structure, relations } = ctx;
    const attachmentStyle = deriveAttachmentStyle(chart, strength);
    const emotionalNeeds = deriveEmotionalNeeds(chart, strength, structure);
    const idealPartnerTraits = deriveIdealPartnerTraits(chart, strength, structure);
    const marriageTiming = deriveMarriageTiming(chart, relations);
    const relationshipStrengths = deriveRelationshipStrengths(chart, relations);
    const relationshipRisks = deriveRelationshipRisks(chart, strength, relations);
    const advice = deriveRelationshipAdvice(chart, strength, structure, relations);
    const compatibleTypes = deriveCompatibleTypes(chart);
    return {
        attachmentStyle,
        emotionalNeeds,
        idealPartnerTraits,
        marriageTiming,
        relationshipStrengths,
        relationshipRisks,
        advice,
        compatibleTypes,
        prompt: buildRelationshipPrompt(ctx),
    };
}
// ---- Analysis Functions ----
function deriveAttachmentStyle(chart, strength) {
    const wx = chart.dayMasterWuxing;
    const yy = chart.dayMaster.yinYang;
    const baseStyle = {
        '木': '安全型依恋倾向 — 在关系中寻求成长和相互支持，能建立稳定的情感连接',
        '火': '热情型依恋倾向 — 感情热烈直接，需要对方的回应和关注来维持情感温度',
        '土': '稳定型依恋倾向 — 重视承诺和安全感，在关系中忠诚可靠但可能略显保守',
        '金': '原则型依恋倾向 — 重视义气和责任感，情感表达可能不够柔软但内心坚定',
        '水': '灵活型依恋倾向 — 感情流动自然，善于适应伴侣，但需注意边界感',
    };
    let style = baseStyle[wx] ?? '均衡型依恋倾向';
    if (yy === '阳') {
        style += '。阳干外向，在关系中更主动表达';
    }
    else {
        style += '。阴干内敛，情感深沉但表达含蓄';
    }
    if (strength.level === '偏弱') {
        style += '，有时需要伴侣更多的情感确认';
    }
    return style;
}
function deriveEmotionalNeeds(chart, strength, _structure) {
    const wx = chart.dayMasterWuxing;
    const needs = [];
    const wxNeeds = {
        '木': ['被理解和认可', '共同成长的空间', '精神共鸣'],
        '火': ['被关注和赞美', '热情回应', '共同的目标感'],
        '土': ['稳定和安全感', '忠诚和承诺', '实际的关怀'],
        '金': ['尊重和信任', '原则一致性', '精神独立空间'],
        '水': ['深度沟通', '情感流动性', '适度的自由空间'],
    };
    needs.push(...(wxNeeds[wx] ?? ['理解与尊重']));
    if (strength.level === '偏弱' || strength.level === '从弱') {
        needs.push('需要更多的支持和鼓励');
    }
    return needs;
}
function deriveIdealPartnerTraits(chart, _strength, structure) {
    // Ideal partner elements: the one that generates the day master (印) or is controlled by day master (财)
    const traits = [];
    // Based on pattern
    switch (structure.patternShiShen) {
        case '正官':
        case '七杀':
            traits.push('事业有成', '有担当', '稳重可靠');
            break;
        case '正财':
        case '偏财':
            traits.push('务实能干', '会理财', '脚踏实地');
            break;
        case '食神':
        case '伤官':
            traits.push('有才华', '懂欣赏', '精神契合');
            break;
        case '正印':
        case '偏印':
            traits.push('有学识', '善解人意', '包容温和');
            break;
        default:
            traits.push('性格互补', '价值观一致', '共同成长');
    }
    // Based on day master
    const dmWx = chart.dayMasterWuxing;
    const generator = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
    traits.push(`五行${generator[dmWx] ?? '相生'}之人更合`);
    return traits;
}
function deriveMarriageTiming(_chart, relations) {
    // In practice, marriage timing comes from DaYun + LiuNian analysis
    // Here we provide general guidance based on the chart structure
    if (relations.relations.some(r => r.name === '财官相生' && r.category === 'favorable')) {
        return '命局财官有力，婚缘较早或婚姻质量较高。通常在25-35岁之间是较好的婚恋窗口期。';
    }
    if (relations.relations.some(r => r.name === '伤官见官')) {
        return '伤官见官，婚恋需更多磨合。建议晚婚（30岁以后）更有利于婚姻稳定。';
    }
    return '婚恋时机与大运流年关系密切。印星旺的年份和官星旺的年份是较好的婚恋窗口。';
}
function deriveRelationshipStrengths(_chart, relations) {
    const strengths = [];
    if (relations.relations.some(r => r.name === '官印相生' && r.category === 'favorable')) {
        strengths.push('在关系中善于维护稳定和互相尊重');
    }
    if (relations.relations.some(r => r.name === '食伤生财' && r.category === 'favorable')) {
        strengths.push('善于用行动和创意表达爱意');
    }
    if (strengths.length === 0) {
        strengths.push('真诚待人的品格', '在关系中持续成长的能力', '为关系付出的意愿');
    }
    return strengths;
}
function deriveRelationshipRisks(_chart, _strength, relations) {
    const risks = [];
    for (const r of relations.relations) {
        if (r.category === 'unfavorable') {
            switch (r.name) {
                case '伤官见官':
                    risks.push('沟通方式可能过于直接，容易伤害亲密关系');
                    break;
                case '比劫夺财':
                    risks.push('需注意第三方介入影响感情稳定');
                    break;
            }
        }
    }
    if (risks.length === 0) {
        risks.push('需注意工作与感情的平衡', '避免因外在压力影响感情质量');
    }
    return risks;
}
function deriveRelationshipAdvice(_chart, strength, structure, relations) {
    const advice = [];
    if (strength.level === '偏弱') {
        advice.push('选择能给予支持和鼓励的伴侣，建立安全的情感基础');
    }
    if (structure.patternShiShen === '正官' || structure.patternShiShen === '七杀') {
        advice.push('在关系中学会柔软，不要总是处于"管理者"角色');
    }
    if (relations.relations.some(r => r.name === '财坏印')) {
        advice.push('不要让财务问题影响感情质量，建立清晰的经济边界');
    }
    advice.push('培养共同的兴趣爱好，增进情感连接');
    advice.push('学会表达需求，避免压抑真实感受');
    return advice;
}
function deriveCompatibleTypes(chart) {
    const dmWx = chart.dayMasterWuxing;
    // Compatibility based on wuxing cycles
    // Generally: the element that generates you (印) or you generate (食伤) creates harmony
    const generator = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
    const generated = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
    const genWx = generator[dmWx]; // 生我 → 提供支持
    const genByWx = generated[dmWx]; // 我生 → 我能滋养
    const wxNames = {
        '木': '木（甲乙）日主',
        '火': '火（丙丁）日主',
        '土': '土（戊己）日主',
        '金': '金（庚辛）日主',
        '水': '水（壬癸）日主',
    };
    return [
        `${wxNames[genWx]} — 能滋养你，提供情感支持`,
        `${wxNames[genByWx]} — 你能给予能量，关系中有成就感`,
        `${wxNames[dmWx]} — 同类相吸，互相理解最深`,
    ];
}
// ---- Prose Renderer ----
function emotionalStyleNote(wx, isYang) {
    const wxEmotion = {
        '木': '木性之人在感情中像一棵树，需要扎根的土壤和向上生长的空间。你渴望的是能一起成长的关系，不是相互缠绕的寄生。你的温柔是内敛的，不善于甜言蜜语，但会用行动默默守护',
        '火': '火性之人在感情中热烈而直接，喜欢就是喜欢，藏不住也等不了。你需要的是能回应你热情的伴侣，给你关注和肯定。但也正是因为太在乎回应，有时候容易患得患失',
        '土': '土性之人在感情中最看重的两个字是"踏实"。你不喜欢戏剧化的起起落落，更向往细水长流的陪伴。你给的爱是实实在在的——记住对方的习惯、为共同的未来储蓄、在对方需要的时候永远在场',
        '金': '金性之人在感情中有自己的原则和底线。你重视承诺和义气，一旦认定一个人就会坚定不移。但你的情感表达可能不够柔软，有时候会让对方觉得"你很好，但是不够温暖"',
        '水': '水性之人在感情中灵动而深刻，善于理解和共情。你能敏锐地感知伴侣的情绪变化，并用恰到好处的方式回应。但也因为太灵活，有时候会让对方觉得捉摸不透',
    };
    return (wxEmotion[wx] ?? '') +
        (isYang ? '。作为阳干，你在关系中更倾向于主动表达和主导节奏' : '。作为阴干，你的情感深沉而含蓄，不轻易外露但一旦投入就非常认真');
}
function idealPartnerNote(traits, compatibleTypes) {
    let text = '从命盘来看，你理想的伴侣画像大致是这样的：';
    text += traits.filter(t => !t.includes('五行')).join('、') + '。';
    const wuxingTrait = traits.find(t => t.includes('五行'));
    if (wuxingTrait) {
        text += `从五行互补的角度，${wuxingTrait}。`;
    }
    if (compatibleTypes.length > 0) {
        text += `日主方面，${compatibleTypes[0]}。${compatibleTypes[1] ? compatibleTypes[1] + '。' : ''}`;
    }
    return text;
}
function timingNote(marriageTiming, strength) {
    let text = `关于缘分时机，${marriageTiming}`;
    if (strength.level === '偏弱') {
        text += '对于偏弱的人来说，选择一个能给你安全感和支持的伴侣尤为重要。不要因为外界压力而仓促决定，好的缘分值得等待。';
    }
    return text;
}
function riskAndAdviceNote(risks, advice, strengths) {
    let text = '';
    if (strengths.length > 0) {
        text += `在感情中，你的优势是${strengths.join('、')}。`;
    }
    if (risks.length > 0) {
        text += `需要留意的方面：${risks.join('；')}。`;
    }
    text += '给感情的建议是：';
    text += advice.join('；') + '。';
    return text;
}
export function renderRelationshipProse(result, ctx) {
    const { strength, structure } = ctx;
    const dm = strength.dayMaster;
    const paragraphs = [];
    // 1. Emotional style
    paragraphs.push(`从命盘看感情，先要了解你在亲密关系中的底色。` +
        emotionalStyleNote(dm.wuxing, dm.yinYang === '阳') +
        `。命带${structure.primaryPattern}格局的你，在感情中也会不自觉地带着这份特质。`);
    // 2. Emotional needs
    paragraphs.push(`在亲密关系中，你最核心的情感需求是：${result.emotionalNeeds.join('、')}。` +
        '这些需求不是"作"，而是你的命盘结构决定的真实需要。' +
        '当这些需求被满足时，你会展现出最好的自己；当长期缺失时，你会感到枯萎。' +
        '了解自己的情感需求，才能在选择伴侣和经营关系时有的放矢。');
    // 3. Ideal partner
    paragraphs.push(idealPartnerNote(result.idealPartnerTraits, result.compatibleTypes));
    // 4. Timing
    paragraphs.push(timingNote(result.marriageTiming, strength));
    // 5. Risks and advice
    paragraphs.push(riskAndAdviceNote(result.relationshipRisks, result.advice, result.relationshipStrengths));
    // 6. Closing
    paragraphs.push('说到底，八字看的是趋势和特质，不是判决书。' +
        '命盘可以告诉你什么样的人跟你比较合、什么时候缘分比较旺、你在感情中容易踩什么坑。' +
        '但真正能让一段关系走得长远的，是两个人的用心经营、相互理解和共同成长。' +
        '命理是指南针，爱是脚下的路。');
    return paragraphs.join('\n\n');
}
//# sourceMappingURL=relationship.js.map