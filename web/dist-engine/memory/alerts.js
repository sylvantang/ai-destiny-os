// ============================================================
// AI Destiny OS — Memory Layer: Proactive Alerts
// 主动预警：当前/未来流年与命局发生冲、刑、伏吟、
// 七杀克身、比劫争财等关系时给出提示（纯确定性）。
// ============================================================
import { calcLiuNian } from '../core/astro/index.js';
import { SEXAGENARY_NAMES, getShiShen } from '../core/astro/constants.js';
import { isClash, isCombination, isStemCombine } from '../core/astro/earthlyBranchRelations.js';
/**
 * 检查 startYear..endYear 每年流年与命局的冲克关系。
 */
export function checkLifeAlerts(chart, startYear, endYear = startYear) {
    const alerts = [];
    const bazi = chart.bazi;
    const dm = bazi.day.stemIndex;
    const liunian = calcLiuNian(bazi, startYear, endYear);
    for (const ln of liunian) {
        const year = ln.year;
        const p = ln.pillar;
        const gz = SEXAGENARY_NAMES[p.sexagenaryIndex];
        // 流年支冲日支 — 婚姻/家庭/健康之动
        if (isClash(p.branchIndex, bazi.day.branchIndex)) {
            alerts.push({
                level: 'warn',
                year,
                title: `${year} 流年${gz}冲日支`,
                detail: `流年地支${p.branch.name}与日支${bazi.day.branch.name}相冲，主家庭、婚姻或健康之变动，宜稳不宜激进。`,
            });
        }
        // 流年支冲年支 — 根基变动
        if (isClash(p.branchIndex, bazi.year.branchIndex)) {
            alerts.push({
                level: 'warn',
                year,
                title: `${year} 流年${gz}冲年支`,
                detail: `流年地支${p.branch.name}与年支${bazi.year.branch.name}相冲，主根基、环境或长辈之事有变。`,
            });
        }
        // 伏吟 — 流年干支与日柱相同
        if (p.sexagenaryIndex === bazi.day.sexagenaryIndex) {
            alerts.push({
                level: 'warn',
                year,
                title: `${year} 流年${gz}与日柱伏吟`,
                detail: `流年与日柱干支相同为伏吟，主反复与停滞，诸事宜守成。`,
            });
        }
        // 流年支与日支相合 — 婚恋人际之喜
        if (isCombination(p.branchIndex, bazi.day.branchIndex)) {
            alerts.push({
                level: 'info',
                year,
                title: `${year} 流年${gz}合日支`,
                detail: `流年地支${p.branch.name}与日支${bazi.day.branch.name}相合，主婚恋、人际、合作之喜。`,
            });
        }
        // 流年天干与日主天干相合 — 遇合
        if (isStemCombine(p.stemIndex, dm)) {
            alerts.push({
                level: 'info',
                year,
                title: `${year} 流年天干与日主相合`,
                detail: `流年天干${p.stem.name}与日主${bazi.day.stem.name}相合，主遇合、合作、贵人引荐。`,
            });
        }
        // 十神压力提示
        const tg = getShiShen(dm, p.stemIndex);
        if (tg === '七杀' || tg === '正官') {
            alerts.push({
                level: 'info',
                year,
                title: `${year} 流年${gz}透${tg}`,
                detail: `流年天干为${tg}，工作压力与责任增大，注意劳逸结合与规则边界。`,
            });
        }
        else if (tg === '比肩' || tg === '劫财') {
            alerts.push({
                level: 'info',
                year,
                title: `${year} 流年${gz}见${tg}`,
                detail: `流年天干为${tg}，注意合伙分利、开支控制，避免意气之争。`,
            });
        }
    }
    return alerts;
}
/** 格式化预警输出（REPL /alerts 命令使用）。 */
export function formatAlerts(alerts) {
    if (alerts.length === 0)
        return '（该区间流年与命局无显著冲克，运势平稳）';
    return alerts
        .map((a) => `\x1b[${a.level === 'warn' ? '31' : '33'}m[${a.level === 'warn' ? '预警' : '提示'}] ${a.title}\x1b[0m\n  ${a.detail}`)
        .join('\n');
}
//# sourceMappingURL=alerts.js.map