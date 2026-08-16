// ============================================================
// AI Destiny OS — Memory Layer: Event Context
// 把重要人生事件与当前大运/流年关联（纯确定性计算）。
// ============================================================

import type { BirthInfo, DestinyChart } from '../core/astro/types.js';
import { generateChart, calcLiuNian, getCurrentDayun } from '../core/astro/index.js';
import { SEXAGENARY_NAMES } from '../core/astro/constants.js';
import { MemoryStore } from './memoryStore.js';
import type { LifeEvent } from './types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface EventContext {
  /** 事件当年的流年干支，如 '庚戌' */
  yearPillar: string;
  /** 事件发生时所在的大运干支，如 '辛酉' */
  dayunAtTime: string;
  /** 事件时的实足年龄（岁） */
  ageAtEvent: number;
}

/**
 * 计算某事件时刻的命理上下文（流年/大运/年龄）。
 * birth 与 eventDate 均按 UTC+8 墙上钟解释。
 */
export function computeEventContext(birth: BirthInfo, eventDate: string | Date): EventContext {
  const chart = generateChart(birth);

  const eventMs = typeof eventDate === 'string'
    ? Date.parse(eventDate)
    : eventDate.getTime();
  if (Number.isNaN(eventMs)) {
    throw new Error('无效的事件日期');
  }

  const eventYear = new Date(eventMs + 8 * 3600 * 1000).getUTCFullYear();

  // 年龄
  const birthEpoch =
    Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour, birth.minute) - 8 * 3600 * 1000;
  const ageAtEvent = (eventMs - birthEpoch) / (365.25 * DAY_MS);

  // 大运
  const currentDayun = getCurrentDayun(chart.dayun, Math.max(0, ageAtEvent));

  // 流年
  const liunian = calcLiuNian(chart.bazi, eventYear, eventYear)[0];

  return {
    yearPillar: liunian ? SEXAGENARY_NAMES[liunian.pillar.sexagenaryIndex]! : '',
    dayunAtTime: currentDayun
      ? SEXAGENARY_NAMES[currentDayun.pillar.sexagenaryIndex]!
      : '',
    ageAtEvent: Math.round(ageAtEvent * 10) / 10,
  };
}

/**
 * 记录一条人生事件，并自动填充 yearPillar / dayunAtTime 命理上下文。
 */
export function addEventWithContext(
  store: MemoryStore,
  birth: BirthInfo,
  event: Omit<LifeEvent, 'id' | 'yearPillar' | 'dayunAtTime'>,
): LifeEvent {
  const ctx = computeEventContext(birth, event.date);
  return store.addEvent({
    ...event,
    yearPillar: ctx.yearPillar,
    dayunAtTime: ctx.dayunAtTime,
  });
}

/** 便捷：取得命盘缓存（供 REPL /alerts 使用）。 */
export function chartOf(birth: BirthInfo): DestinyChart {
  return generateChart(birth);
}
