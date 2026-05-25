// ============================================================
// AI Destiny OS — Destiny Engine: Climate Adjustment (调候引擎)
//
// Before analyzing strength, certain charts need climate
// (temperature) adjustment. This is one of the most advanced
// BaZi concepts — 90% of websites miss this entirely.
// ============================================================

import type { BaZi } from '../astro/types.js';

export interface ClimateResult {
  needsAdjustment: boolean;
  priority: 'high' | 'medium' | 'low' | 'none';
  /** The wuxing needed for climate adjustment */
  neededWuxing: string | null;
  /** Description of the climate condition */
  condition: string;
  analysis: string[];
}

/**
 * Climate adjustment (调候) analysis.
 *
 * Core principle: certain day masters in certain months need
 * specific elements to "adjust the temperature" before any
 * other analysis is meaningful.
 *
 * Key rules:
 *   - 冬水寒 → need 火 to warm (冬季水日主需火调候)
 *   - 夏火炎 → need 水 to cool (夏季火日主需水调候)
 *   - 金生冬月 → need 火 (金生冬月需火)
 *   - 木生冬月 → need 火 (木生冬月需火暖局)
 *   - 夏土燥 → need 水 (夏季土日主需水润局)
 */
export function analyzeClimate(bazi: BaZi): ClimateResult {
  const dmWx = bazi.day.stem.wuxing;
  const monthBranch = bazi.month.branchIndex;
  const analysis: string[] = [];

  // Month branch → season mapping
  // 寅卯辰=春, 巳午未=夏, 申酉戌=秋, 亥子丑=冬
  const season = getSeason(monthBranch);

  // ---- Winter-born (冬生) climate rules ----
  if (season === '冬') {
    // 冬水寒: 水日主生于冬月，天寒地冻，先需火调候
    if (dmWx === '水') {
      analysis.push('水日主生于冬月，天寒地冻，急需火来暖局调候');
      analysis.push('调候为第一优先，旺衰分析为次');
      return {
        needsAdjustment: true,
        priority: 'high',
        neededWuxing: '火',
        condition: '冬水寒',
        analysis,
      };
    }

    // 金生于冬: 金寒水冷，需火暖金
    if (dmWx === '金') {
      analysis.push('金日主生于冬月，金寒水冷，需火来温暖');
      return {
        needsAdjustment: true,
        priority: 'high',
        neededWuxing: '火',
        condition: '冬金寒',
        analysis,
      };
    }

    // 木生于冬: 寒木向阳，需火暖局
    if (dmWx === '木') {
      analysis.push('木日主生于冬月，寒木需要阳光，需火调候');
      return {
        needsAdjustment: true,
        priority: 'medium',
        neededWuxing: '火',
        condition: '冬木寒',
        analysis,
      };
    }

    // 土生于冬: 冻土需火
    if (dmWx === '土') {
      analysis.push('土日主生于冬月，冻土需火化冻');
      return {
        needsAdjustment: true,
        priority: 'medium',
        neededWuxing: '火',
        condition: '冬土冻',
        analysis,
      };
    }

    // 火生于冬: 火弱需木扶 + 火助
    if (dmWx === '火') {
      analysis.push('火日主生于冬月，火势衰弱，需木火扶助');
      return {
        needsAdjustment: true,
        priority: 'medium',
        neededWuxing: '木',
        condition: '冬火弱',
        analysis,
      };
    }
  }

  // ---- Summer-born (夏生) climate rules ----
  if (season === '夏') {
    // 夏火炎: 火日主生于夏月，火炎土燥，需要水来调候
    if (dmWx === '火') {
      analysis.push('火日主生于夏月，火炎土燥，急需水来调候降温');
      return {
        needsAdjustment: true,
        priority: 'high',
        neededWuxing: '水',
        condition: '夏火炎',
        analysis,
      };
    }

    // 夏土燥: 土日主生于夏月，燥烈，需水润局
    if (dmWx === '土') {
      analysis.push('土日主生于夏月，土性燥烈，需要水来滋润');
      return {
        needsAdjustment: true,
        priority: 'medium',
        neededWuxing: '水',
        condition: '夏土燥',
        analysis,
      };
    }

    // 金生于夏: 火旺克金，需水制火护金
    if (dmWx === '金') {
      analysis.push('金日主生于夏月，火旺克金，需水来制火护金');
      return {
        needsAdjustment: true,
        priority: 'high',
        neededWuxing: '水',
        condition: '夏金熔',
        analysis,
      };
    }

    // 木生于夏: 木被火泄，需水滋润
    if (dmWx === '木') {
      analysis.push('木日主生于夏月，被火泄气，需要水来滋养');
      return {
        needsAdjustment: true,
        priority: 'medium',
        neededWuxing: '水',
        condition: '夏木枯',
        analysis,
      };
    }
  }

  // ---- Spring / Autumn: generally mild ----

  // 秋金: can be too sharp, may need 火 to temper or 水 to flow
  if (season === '秋' && dmWx === '金') {
    analysis.push('金日主生于秋月，金气当令，旺而锐利');
    return {
      needsAdjustment: true,
      priority: 'low',
      neededWuxing: '火',
      condition: '秋金刚',
      analysis,
    };
  }

  // 春木: generally good, no adjustment needed
  if (season === '春' && dmWx === '木') {
    analysis.push('木日主生于春月，当令得时，调候需求低');
    return {
      needsAdjustment: false,
      priority: 'low',
      neededWuxing: null,
      condition: '春木旺',
      analysis,
    };
  }

  return {
    needsAdjustment: false,
    priority: 'none',
    neededWuxing: null,
    condition: '平和',
    analysis: ['此造调候需求不显著'],
  };
}

function getSeason(monthBranch: number): '春' | '夏' | '秋' | '冬' {
  if (monthBranch >= 2 && monthBranch <= 4) return '春';  // 寅卯辰
  if (monthBranch >= 5 && monthBranch <= 7) return '夏';  // 巳午未
  if (monthBranch >= 8 && monthBranch <= 10) return '秋'; // 申酉戌
  return '冬';                                             // 亥子丑
}
