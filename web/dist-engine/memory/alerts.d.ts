import type { DestinyChart } from '../core/astro/types.js';
export interface LifeAlert {
    level: 'info' | 'warn';
    year: number;
    title: string;
    detail: string;
}
/**
 * 检查 startYear..endYear 每年流年与命局的冲克关系。
 */
export declare function checkLifeAlerts(chart: DestinyChart, startYear: number, endYear?: number): LifeAlert[];
/** 格式化预警输出（REPL /alerts 命令使用）。 */
export declare function formatAlerts(alerts: LifeAlert[]): string;
//# sourceMappingURL=alerts.d.ts.map