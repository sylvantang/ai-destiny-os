import type { BirthInfo, DestinyChart } from '../core/astro/types.js';
import { MemoryStore } from './memoryStore.js';
import type { LifeEvent } from './types.js';
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
export declare function computeEventContext(birth: BirthInfo, eventDate: string | Date): EventContext;
/**
 * 记录一条人生事件，并自动填充 yearPillar / dayunAtTime 命理上下文。
 */
export declare function addEventWithContext(store: MemoryStore, birth: BirthInfo, event: Omit<LifeEvent, 'id' | 'yearPillar' | 'dayunAtTime'>): LifeEvent;
/** 便捷：取得命盘缓存（供 REPL /alerts 使用）。 */
export declare function chartOf(birth: BirthInfo): DestinyChart;
//# sourceMappingURL=eventContext.d.ts.map