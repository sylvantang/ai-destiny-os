// ============================================================
// AI Destiny OS — Interpretation quality evaluation framework.
// 内置 25 条测试用例，覆盖：
// - 身旺/身弱各 3 条
// - 不同格局各 2 条（正官、七杀、食神、伤官、正财）
// - 婚姻/事业/健康/财运各 2 条
// - 特殊格局 1 条（从格或化气格）
// ============================================================

export interface QATestCase {
  id: string;
  question: string;
  chart: { year: string; month: string; day: string; hour: string; gender: 'male' | 'female' };
  referencePoints: string[]; // 参考答案关键点
  requiredKeywords: string[]; // 必须出现的关键词
  direction: 'positive' | 'negative' | 'neutral'; // 吉凶方向
}

export interface EvalResult {
  testCaseId: string;
  keywordHitRate: number; // 命中关键词数 / 总关键词数
  directionMatch: boolean; // 吉凶方向是否一致
  hasReasoningChain: boolean; // 是否包含"因为...所以..."结构
  citesAncientText: boolean; // 是否引用了古籍
  overallScore: number; // 0-100
}

const POSITIVE_WORDS = ['顺利', '吉', '旺', '有利', '贵人', '成功', '富贵', '上升', '福', '顺遂', '得助', '有成'];
const NEGATIVE_WORDS = ['凶', '不利', '坎坷', '破财', '病', '灾', '困', '忌', '败', '损', '刑', '冲', '失', '忧', '难'];

export function getTestCases(): QATestCase[] {
  const c = (
    id: string,
    year: string,
    month: string,
    day: string,
    hour: string,
    gender: 'male' | 'female',
    question: string,
    referencePoints: string[],
    requiredKeywords: string[],
    direction: 'positive' | 'negative' | 'neutral',
  ): QATestCase => ({
    id,
    question,
    chart: { year, month, day, hour, gender },
    referencePoints,
    requiredKeywords,
    direction,
  });

  return [
    // ---- 身旺 3 ----
    c('strong-01', '1990', '4', '5', '12', 'male', '我的性格特点是什么？',
      ['身旺喜克泄耗', '性格刚强主动', '忌印比再扶'],
      ['身旺', '克泄耗', '性格'], 'neutral'),
    c('strong-02', '1986', '5', '18', '14', 'male', '我适合什么行业？',
      ['身旺宜官杀食伤财方向', '技术/经营/管理皆可', '不宜单靠体力'],
      ['行业', '身旺', '方向'], 'positive'),
    c('strong-03', '1988', '3', '8', '8', 'female', '今年运势如何？',
      ['旺者逢生扶之岁运需防过旺', '喜财官食伤流年', '注意情绪与竞争'],
      ['流年', '运势', '身旺'], 'neutral'),
    // ---- 身弱 3 ----
    c('weak-01', '1995', '12', '20', '3', 'female', '我的贵人运如何？',
      ['身弱喜印比', '贵人为印比之星', '得帮扶则顺'],
      ['身弱', '印', '帮扶'], 'positive'),
    c('weak-02', '1984', '11', '9', '18', 'male', '今年适合创业吗？',
      ['身弱不宜独立扛重', '宜借力合作', '逢生扶之运可行'],
      ['身弱', '创业', '合作'], 'negative'),
    c('weak-03', '1997', '1', '25', '22', 'female', '我的健康需要注意什么？',
      ['身弱忌克泄太过', '注意脾胃与精力', '宜静养培元'],
      ['身弱', '健康', '注意'], 'negative'),
    // ---- 格局 10（正官/七杀/食神/伤官/正财 各 2） ----
    c('pat-zhengguan-01', '1985', '2', '14', '10', 'male', '我的事业发展怎么样？',
      ['正官格宜从正途', '利公职与管理', '官星得用则贵'],
      ['正官', '事业', '格局'], 'positive'),
    c('pat-zhengguan-02', '1992', '3', '22', '6', 'male', '我适合考公吗？',
      ['正官格与体制缘分深', '利考试', '官印相生更佳'],
      ['正官', '考试', '格局'], 'positive'),
    c('pat-qisha-01', '1987', '8', '12', '4', 'male', '我的魄力与决策风格如何？',
      ['七杀格有魄力', '杀需制化', '制杀得宜掌权'],
      ['七杀', '制化', '魄力'], 'neutral'),
    c('pat-qisha-02', '1993', '10', '30', '20', 'male', '今年事业竞争激烈吗？',
      ['七杀主竞争压力', '有制则化压力为动力', '忌杀旺无制'],
      ['七杀', '竞争', '压力'], 'negative'),
    c('pat-shishen-01', '1991', '6', '2', '16', 'female', '我的财运怎么样？',
      ['食神生财主财源稳定', '福气厚', '宜食禄之业'],
      ['食神', '财', '格局'], 'positive'),
    c('pat-shishen-02', '1989', '7', '27', '12', 'female', '我适合做餐饮或内容创作吗？',
      ['食神主口福与表达', '利餐饮文创', '食神吐秀'],
      ['食神', '适合', '行业'], 'positive'),
    c('pat-shangguan-01', '1994', '5', '16', '8', 'female', '我的才华如何发挥？',
      ['伤官主才华外露', '宜技艺创作', '忌伤官见官'],
      ['伤官', '才华', '格局'], 'positive'),
    c('pat-shangguan-02', '1983', '9', '4', '14', 'female', '我的人际关系要注意什么？',
      ['伤官易直言伤人', '谨防口舌', '宜谦和收敛'],
      ['伤官', '口舌', '注意'], 'negative'),
    c('pat-zhengcai-01', '1982', '4', '11', '10', 'male', '我的理财风格如何？',
      ['正财主勤俭积蓄', '宜稳健理财', '财宜身旺胜任'],
      ['正财', '理财', '格局'], 'positive'),
    c('pat-zhengcai-02', '1996', '2', '28', '24', 'male', '今年适合买房吗？',
      ['正财之年利于置业', '量入为出', '忌借贷过重'],
      ['正财', '置业', '财'], 'positive'),
    // ---- 婚姻 2 ----
    c('marriage-01', '1988', '8', '8', '20', 'female', '我的婚姻感情怎么样？',
      ['看官星与日支', '官星得用婚姻稳定', '日支逢冲多波折'],
      ['婚姻', '官星', '感情'], 'neutral'),
    c('marriage-02', '1990', '11', '11', '11', 'male', '我什么时候适合结婚？',
      ['看财星与配偶宫', '财星得地之年利婚', '配偶宫动则成'],
      ['婚姻', '财星', '婚期'], 'positive'),
    // ---- 事业 2 ----
    c('career-01', '1986', '6', '6', '6', 'male', '我该跳槽还是留下？',
      ['看官杀与印星', '岁运喜用则动', '忌神之运宜守'],
      ['事业', '跳槽', '岁运'], 'neutral'),
    c('career-02', '1992', '12', '12', '12', 'female', '我的职业方向怎么选？',
      ['以用神五行取行业', '用神得地则顺', '忌五行相悖之业'],
      ['职业', '用神', '行业'], 'positive'),
    // ---- 健康 2 ----
    c('health-01', '1978', '3', '3', '3', 'male', '我的健康隐患在哪里？',
      ['看五行偏枯之字', '过旺过弱之行为病', '岁运引动则发'],
      ['健康', '五行', '注意'], 'negative'),
    c('health-02', '1995', '9', '9', '9', 'female', '今年身体要注意什么？',
      ['流年冲克日主需防', '注意调候与作息', '岁运见忌神宜体检'],
      ['健康', '流年', '注意'], 'negative'),
    // ---- 财运 2 ----
    c('money-01', '1984', '7', '7', '7', 'male', '我的财运大方向如何？',
      ['看财星与身之强弱', '身强任财则富', '身弱财多反为累'],
      ['财运', '财星', '身强'], 'positive'),
    c('money-02', '1993', '1', '1', '1', 'female', '我适合投资理财吗？',
      ['财星得用可投', '忌盲目重仓', '逢比劫之年防破财'],
      ['投资', '财', '注意'], 'neutral'),
    // ---- 特殊格局 1（从格/化气） ----
    c('special-congge-01', '2000', '8', '8', '8', 'male', '我的命格有什么特殊之处？',
      ['全局气势偏向一方', '从格顺其势', '化气成象则从化'],
      ['从格', '格局', '特殊'], 'neutral'),
  ];
}

function detectDirection(text: string): 'positive' | 'negative' | 'neutral' {
  let pos = 0;
  let neg = 0;
  for (const w of POSITIVE_WORDS) if (text.includes(w)) pos += 1;
  for (const w of NEGATIVE_WORDS) if (text.includes(w)) neg += 1;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

export function evaluateResponse(response: string, testCase: QATestCase): EvalResult {
  const text = response || '';
  if (!text.trim()) {
    return {
      testCaseId: testCase.id,
      keywordHitRate: 0,
      directionMatch: false,
      hasReasoningChain: false,
      citesAncientText: false,
      overallScore: 0,
    };
  }

  const total = testCase.requiredKeywords.length;
  const hits = testCase.requiredKeywords.filter((k) => text.includes(k)).length;
  const keywordHitRate = total > 0 ? hits / total : 0;

  const direction = detectDirection(text);
  const directionMatch = testCase.direction === 'neutral' || direction === testCase.direction;

  const hasReasoningChain = /因为[^。，]{1,60}所以|所以[^。，]{1,60}因为/.test(text);
  const citesAncientText = /《[^》]{1,40}》/.test(text);

  const overallScore = Math.round(
    keywordHitRate * 40 + (directionMatch ? 30 : 0) + (hasReasoningChain ? 15 : 0) + (citesAncientText ? 15 : 0),
  );

  return {
    testCaseId: testCase.id,
    keywordHitRate: Math.round(keywordHitRate * 100) / 100,
    directionMatch,
    hasReasoningChain,
    citesAncientText,
    overallScore,
  };
}

export function runEvalSuite(responses: Map<string, string>): { averageScore: number; results: EvalResult[] } {
  const results: EvalResult[] = [];
  for (const tc of getTestCases()) {
    const response = responses.get(tc.id) ?? '';
    results.push(evaluateResponse(response, tc));
  }
  const averageScore =
    results.length > 0 ? Math.round(results.reduce((s, r) => s + r.overallScore, 0) / results.length) : 0;
  return { averageScore, results };
}
