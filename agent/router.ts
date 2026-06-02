// ============================================================
// AI Destiny OS — Agent Layer: Topic Router
// Detects query domain from user input via keyword matching.
// ============================================================

import type { QueryDomain } from './agentEngine.js';

const TOPIC_KEYWORDS: [QueryDomain, string[]][] = [
  ['性格', ['性格', '个性', '特点', '是什么样的人', 'mbti', '五行', '特质']],
  ['事业', ['事业', '工作', '职业', '行业', '创业', '跳槽', '升职', '求职']],
  ['感情', ['感情', '爱情', '婚姻', '恋爱', '对象', '桃花', '配偶', '脱单']],
  ['运势', ['运势', '流年', '今年', '明年', '运气', '财运', '健康运', '走势']],
  ['战略', ['战略', '方向', '选择', '建议', '决策', '计划', '规划', '发展']],
  ['排盘', ['排盘', '八字', '四柱', '命盘', '盘面', '显示', '查看']],
];

export function detectTopic(input: string): QueryDomain {
  const lower = input.toLowerCase();

  for (const [domain, keywords] of TOPIC_KEYWORDS) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return domain;
    }
  }

  return '综合';
}
