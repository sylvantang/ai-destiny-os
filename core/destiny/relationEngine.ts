// ============================================================
// AI Destiny OS — Destiny Engine: Relationship Analysis (十神关系引擎)
// Maps out interactions between the Ten Gods (十神) in the chart.
// ============================================================

import type { BaZi, HeavenlyStemIndex, ShiShen } from '../astro/types.js';
import { getShiShen } from '../astro/constants.js';

export interface RelationResult {
  /** All identified significant relationships */
  relations: NamedRelation[];
  /** Combined relationship summary (one paragraph) */
  summary: string;
  /** The dominant life theme based on relationships */
  dominantTheme: string;
}

export interface NamedRelation {
  name: string;
  category: 'favorable' | 'unfavorable' | 'neutral';
  description: string;
  stems: HeavenlyStemIndex[];
  shiShens: ShiShen[];
}

/**
 * Analyze the 十神 relationships in a BaZi chart.
 *
 * Key relationships:
 *   官印相生 (Officer produces Seal) → 官→印→身 → career+education synergy
 *   食神制杀 (Food controls Seven Killings) → 以智制煞 → skill overcomes danger
 *   财坏印 (Wealth damages Seal) → 财破印 → conflict between money and study
 *   伤官见官 (Hurting Officer meets Officer) → 才华与权威冲突
 *   比劫夺财 (Rob Wealth steals Wealth) → 竞争破财
 *   印星护身 (Seal protects body) → 印化官杀 → protection from harm
 *   食伤生财 (Output produces Wealth) → 才华生财 → talent monetization
 *   财官相生 (Wealth produces Officer) → 财生官 → wealth builds authority
 */
export function analyzeRelations(bazi: BaZi): RelationResult {
  const dm = bazi.day.stemIndex;
  const relations: NamedRelation[] = [];

  const yearStem = bazi.year.stemIndex;
  const monthStem = bazi.month.stemIndex;
  const hourStem = bazi.hour.stemIndex;
  const stems = [yearStem, monthStem, hourStem];

  // Compute all 十神
  const yearSS = getShiShen(dm, yearStem);
  const monthSS = getShiShen(dm, monthStem);
  const hourSS = getShiShen(dm, hourStem);

  // ---- 1. 官印相生 (Officer → Seal → Body) ----
  const hasOfficer = [yearSS, monthSS, hourSS].some(s => s === '正官' || s === '七杀');
  const hasSeal = [yearSS, monthSS, hourSS].some(s => s === '正印' || s === '偏印');

  if (hasOfficer && hasSeal) {
    const officerStems = stems.filter((_s, i) => {
      const ss = [yearSS, monthSS, hourSS][i]!;
      return ss === '正官' || ss === '七杀';
    });
    const sealStems = stems.filter((_s, i) => {
      const ss = [yearSS, monthSS, hourSS][i]!;
      return ss === '正印' || ss === '偏印';
    });
    relations.push({
      name: '官印相生',
      category: 'favorable',
      description: '官星与印星并存，官生印、印护身，形成良性循环。主学业有成、事业稳定、贵人力强。',
      stems: [...officerStems, ...sealStems],
      shiShens: ['正官', '正印'],
    });
  }

  // ---- 2. 食神制杀 (Food → controls → Seven Killings) ----
  const hasFood = [yearSS, monthSS, hourSS].some(s => s === '食神');
  const hasSevenKill = [yearSS, monthSS, hourSS].some(s => s === '七杀');

  if (hasFood && hasSevenKill) {
    relations.push({
      name: '食神制杀',
      category: 'favorable',
      description: '食神克制七杀，以智慧和才华化解凶险。主以智取胜、化险为夷、技术能力强。',
      stems: stems,
      shiShens: ['食神', '七杀'],
    });
  }

  // ---- 3. 财坏印 (Wealth → damages → Seal) ----
  const hasWealth = [yearSS, monthSS, hourSS].some(s => s === '正财' || s === '偏财');

  if (hasWealth && hasSeal) {
    relations.push({
      name: '财坏印',
      category: 'unfavorable',
      description: '财星克制印星，学业或贵人运受财运影响。需注意为钱损学、因利失贵。',
      stems: stems,
      shiShens: ['正财', '正印'],
    });
  }

  // ---- 4. 伤官见官 (Hurting Officer → meets → Officer) ----
  const hasHurtingOfficer = [yearSS, monthSS, hourSS].some(s => s === '伤官');
  const hasProperOfficer = [yearSS, monthSS, hourSS].some(s => s === '正官');

  if (hasHurtingOfficer && hasProperOfficer) {
    relations.push({
      name: '伤官见官',
      category: 'unfavorable',
      description: '伤官与正官并见，才华与规则冲突。主不服管教、职场口舌、与权威不合。',
      stems: stems,
      shiShens: ['伤官', '正官'],
    });
  }

  // ---- 5. 比劫夺财 (Rob Wealth → steals → Wealth) ----
  const hasPeer = [yearSS, monthSS, hourSS].some(s => s === '比肩' || s === '劫财');

  if (hasPeer && hasWealth) {
    relations.push({
      name: '比劫夺财',
      category: 'unfavorable',
      description: '比肩劫财与财星同现，竞争破财。需注意合作纠纷、朋友借钱、投资分散。',
      stems: stems,
      shiShens: ['劫财', '正财'],
    });
  }

  // ---- 6. 食伤生财 (Output → produces → Wealth) ----
  const hasOutput = [yearSS, monthSS, hourSS].some(s => s === '食神' || s === '伤官');

  if (hasOutput && hasWealth) {
    relations.push({
      name: '食伤生财',
      category: 'favorable',
      description: '食伤生财，以才华和技术创造财富。主靠能力赚钱、创业有成、技艺致富。',
      stems: stems,
      shiShens: ['食神', '正财'],
    });
  }

  // ---- 7. 财官相生 (Wealth → produces → Officer) ----
  if (hasWealth && hasOfficer) {
    relations.push({
      name: '财官相生',
      category: 'favorable',
      description: '财星生官星，以财力获取地位。主财能生官、以经济实力获得社会地位。',
      stems: stems,
      shiShens: ['正财', '正官'],
    });
  }

  // ---- Summary ----
  const favorable = relations.filter(r => r.category === 'favorable');
  const unfavorable = relations.filter(r => r.category === 'unfavorable');

  let summary: string;
  let dominantTheme: string;

  if (relations.length === 0) {
    summary = '此造十神分布平和，无明显特殊组合，格局清纯。';
    dominantTheme = '平稳发展';
  } else {
    const favNames = favorable.map(r => r.name).join('、');
    const unfavNames = unfavorable.map(r => r.name).join('、');

    if (favorable.length > unfavorable.length) {
      summary = `命局以${favNames}为吉，形成良性配置。`;
      dominantTheme = favorable[0]?.name ?? '平稳发展';
    } else if (unfavorable.length > 0) {
      summary = `命局出现${unfavNames}，需注意相关风险。`;
      dominantTheme = unfavorable[0]?.name ?? '需注意';
    } else {
      summary = '十神配置均衡，各有得失。';
      dominantTheme = '均衡发展';
    }
  }

  return { relations, summary, dominantTheme };
}
