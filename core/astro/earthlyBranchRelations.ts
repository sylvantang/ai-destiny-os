// ============================================================
// AI Destiny OS — Astro Core: Earthly Branch Relations
// 六冲 / 六合 / 三刑 / 六害 — deterministic lookup tables.
// ============================================================

import type { EarthlyBranchIndex } from './types.js';

// ---- 六冲 (Six Clashes) ----

const BRANCH_CLASHES: Record<EarthlyBranchIndex, EarthlyBranchIndex> = {
  0: 6, 1: 7, 2: 8, 3: 9, 4: 10, 5: 11,
  6: 0, 7: 1, 8: 2, 9: 3, 10: 4, 11: 5,
};

export function isClash(a: EarthlyBranchIndex, b: EarthlyBranchIndex): boolean {
  return BRANCH_CLASHES[a] === b;
}

export function getClashPair(a: EarthlyBranchIndex): EarthlyBranchIndex | null {
  if (a in BRANCH_CLASHES) return BRANCH_CLASHES[a];
  return null;
}

/** All 6 clash pairs as [branchA, branchB, description] */
export const CLASH_PAIRS: [EarthlyBranchIndex, EarthlyBranchIndex, string][] = [
  [0, 6, '子午冲'], [1, 7, '丑未冲'], [2, 8, '寅申冲'],
  [3, 9, '卯酉冲'], [4, 10, '辰戌冲'], [5, 11, '巳亥冲'],
];

// ---- 六合 (Six Combinations) ----

const BRANCH_COMBINATIONS: Record<EarthlyBranchIndex, EarthlyBranchIndex> = {
  0: 1, 1: 0,   // 子丑合土
  2: 11, 11: 2, // 寅亥合木
  3: 10, 10: 3, // 卯戌合火
  4: 9, 9: 4,   // 辰酉合金
  5: 8, 8: 5,   // 巳申合水
  6: 7, 7: 6,   // 午未合土
};

export function isCombination(a: EarthlyBranchIndex, b: EarthlyBranchIndex): boolean {
  return BRANCH_COMBINATIONS[a] === b;
}

export function getCombinationPartner(a: EarthlyBranchIndex): EarthlyBranchIndex | null {
  if (a in BRANCH_COMBINATIONS) return BRANCH_COMBINATIONS[a];
  return null;
}

/** Combination → resulting wuxing element */
export const COMBINATION_WUXING: Record<string, string> = {
  '0,1': '土', '1,0': '土',
  '2,11': '木', '11,2': '木',
  '3,10': '火', '10,3': '火',
  '4,9': '金', '9,4': '金',
  '5,8': '水', '8,5': '水',
  '6,7': '土', '7,6': '土',
};

// ---- 三刑 (Punishments) ----

export type PunishmentType = '无恩之刑' | '恃势之刑' | '无礼之刑' | '自刑';

/**
 * Check if two earthly branches form a punishment (刑).
 * Returns the punishment type or null.
 */
export function getPunishment(a: EarthlyBranchIndex, b: EarthlyBranchIndex): PunishmentType | null {
  // 寅巳申 → 无恩之刑 (Ungrateful punishment)
  if ((a === 2 && (b === 5 || b === 8)) || (b === 2 && (a === 5 || a === 8))) return '无恩之刑';
  if (a === 5 && b === 8 || a === 8 && b === 5) return '无恩之刑';

  // 丑戌未 → 恃势之刑 (Abuse-of-power punishment)
  if ((a === 1 && (b === 10 || b === 7)) || (b === 1 && (a === 10 || a === 7))) return '恃势之刑';
  if (a === 10 && b === 7 || a === 7 && b === 10) return '恃势之刑';

  // 子卯 → 无礼之刑 (Discourtesy punishment)
  if ((a === 0 && b === 3) || (a === 3 && b === 0)) return '无礼之刑';

  return null;
}

/**
 * Check if a single branch forms a self-punishment (自刑).
 */
export function isSelfPunishment(branch: EarthlyBranchIndex): boolean {
  // 辰、午、酉、亥 → 自刑
  return branch === 4 || branch === 6 || branch === 9 || branch === 11;
}

// ---- 六害 (Six Harms) ----

const BRANCH_HARMS: Record<EarthlyBranchIndex, EarthlyBranchIndex> = {
  0: 7, 7: 0,    // 子未害
  1: 6, 6: 1,    // 丑午害
  2: 5, 5: 2,    // 寅巳害
  3: 4, 4: 3,    // 卯辰害
  8: 11, 11: 8,  // 申亥害
  9: 10, 10: 9,  // 酉戌害
};

export function isHarm(a: EarthlyBranchIndex, b: EarthlyBranchIndex): boolean {
  return BRANCH_HARMS[a] === b;
}

export function getHarm(a: EarthlyBranchIndex, b: EarthlyBranchIndex): { harm: true; description: string } | null {
  if (isHarm(a, b)) {
    const pair = [a, b].sort((x, y) => x - y);
    const key = `${pair[0]},${pair[1]}`;
    const labels: Record<string, string> = {
      '0,7': '子未害', '1,6': '丑午害', '2,5': '寅巳害',
      '3,4': '卯辰害', '8,11': '申亥害', '9,10': '酉戌害',
    };
    return { harm: true, description: labels[key] ?? '地支相害' };
  }
  return null;
}
