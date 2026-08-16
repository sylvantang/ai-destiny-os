// ============================================================
// AI Destiny OS — Astro Core: HuangLi Test Suite（自有黄历引擎）
// 参考值在开发期与 shunshi-bazi-core 交叉对照（干支/建除/彭祖/
// 喜神/财神/生肖/星座/胎神占处/时辰干支 一致；方位措辞与
// 阳贵阴贵标签等约定差异已在 limitations 中注明）。
// ============================================================

import { describe, it, expect } from 'vitest';
import { getHuangli } from '../index.js';

describe('黄历 — 干支 / 生肖 / 星座 / 星期', () => {
  it('2026-08-16 → 丙午年 丙申月 壬戌日，生肖马，狮子座', () => {
    const h = getHuangli(2026, 8, 16);
    expect(h.干支).toEqual({ 年: '丙午', 月: '丙申', 日: '壬戌' });
    expect(h.生肖).toBe('马');
    expect(h.星座).toBe('狮子座');
    expect(h.星期).toBe('星期日');
    expect(h.公历).toBe('2026年8月16日');
  });

  it('星座边界：2024-02-19 双鱼座、2024-02-18 水瓶座', () => {
    expect(getHuangli(2024, 2, 19).星座).toBe('双鱼座');
    expect(getHuangli(2024, 2, 18).星座).toBe('水瓶座');
  });
});

describe('黄历 — 建除 / 黄黑道（寅月十二日循环）', () => {
  // 2024 寅月（立春后）：甲寅日=建，乙卯日=除，依次循环
  it('2024-02-20 甲寅日 → 建', () => {
    const h = getHuangli(2024, 2, 20);
    expect(h.十二神.建除).toBe('建');
  });

  it('2024-02-21 乙卯日 → 除（黄道）', () => {
    const h = getHuangli(2024, 2, 21);
    expect(h.十二神.建除).toBe('除');
    expect(h.十二神.黄黑道).toBe('黄道');
  });

  it('建满平破收闭为黑道；除危定执成开为黄道', () => {
    const yellow = [1, 4, 5, 7, 8, 10];
    const black = [0, 2, 3, 6, 9, 11];
    // 用 2024 寅月的连续 12 天：2-20(建) 起
    const start = Date.UTC(2024, 1, 20);
    for (let k = 0; k < 12; k++) {
      const d = new Date(start + k * 86400000);
      const h = getHuangli(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      const expectColor = yellow.includes(k) ? '黄道' : black.includes(k) ? '黑道' : '?';
      expect(h.十二神.黄黑道).toBe(expectColor);
    }
  });
});

describe('黄历 — 彭祖百忌', () => {
  it('壬戌日 → 壬不泱水更难提防 + 戌不吃犬作怪上床', () => {
    const h = getHuangli(2026, 8, 16);
    expect(h.彭祖百忌).toEqual(['壬不泱水更难提防', '戌不吃犬作怪上床']);
  });

  it('甲辰日 → 甲不开仓财物耗散 + 辰不哭泣必主重丧', () => {
    const h = getHuangli(2024, 2, 10);
    expect(h.彭祖百忌).toEqual(['甲不开仓财物耗散', '辰不哭泣必主重丧']);
  });
});

describe('黄历 — 喜神 / 财神 / 贵人方位', () => {
  it('壬日 → 喜神正南、财神正南', () => {
    const h = getHuangli(2026, 8, 16);
    expect(h.吉神方位.喜神).toBe('正南');
    expect(h.吉神方位.财神).toBe('正南');
  });

  it('甲日 → 喜神东北、财神东北、阳贵东北、阴贵西南', () => {
    const h = getHuangli(2024, 2, 10);
    expect(h.吉神方位.喜神).toBe('东北');
    expect(h.吉神方位.财神).toBe('东北');
    expect(h.吉神方位.阳贵).toBe('东北');
    expect(h.吉神方位.阴贵).toBe('西南');
  });

  it('太岁方位按年支：甲辰年 → 东南', () => {
    expect(getHuangli(2024, 2, 10).吉神方位.太岁).toBe('东南');
  });
});

describe('黄历 — 神煞', () => {
  it('2026-08-16（申月壬日）→ 月德', () => {
    expect(getHuangli(2026, 8, 16).神煞.吉神).toContain('月德');
  });

  it('2026-08-08（申月甲寅日）→ 月破', () => {
    const h = getHuangli(2026, 8, 8);
    expect(h.神煞.凶煞).toContain('月破');
    expect(h.十二神.建除).toBe('破');
  });

  it('2024-02-14（寅月戊申日）→ 月破', () => {
    expect(getHuangli(2024, 2, 14).神煞.凶煞).toContain('月破');
  });

  it('2024-02-16（寅月庚戌日）→ 大耗、四击', () => {
    const h = getHuangli(2024, 2, 16);
    expect(h.神煞.凶煞).toContain('大耗');
    expect(h.神煞.凶煞).toContain('四击');
  });

  it('天恩日：2024-02-15 己酉', () => {
    expect(getHuangli(2024, 2, 15).神煞.吉神).toContain('天恩');
  });

  it('驿马：2024-02-20（甲辰年甲寅日）', () => {
    expect(getHuangli(2024, 2, 20).神煞.吉神).toContain('驿马');
  });

  it('吉神凶煞无重复', () => {
    const h = getHuangli(2024, 2, 13);
    expect(new Set(h.神煞.吉神).size).toBe(h.神煞.吉神.length);
    expect(new Set(h.神煞.凶煞).size).toBe(h.神煞.凶煞.length);
  });
});

describe('黄历 — 胎神', () => {
  it('壬戌日 → 占仓库鸡栖（西北）', () => {
    expect(getHuangli(2026, 8, 16).胎神).toBe('占仓库鸡栖（西北）');
  });

  it('甲子日 → 占门碓（正北）', () => {
    // 2024-01-01 甲子日
    const h = getHuangli(2024, 1, 1);
    expect(h.干支.日).toBe('甲子');
    expect(h.胎神).toBe('占门碓（正北）');
  });
});

describe('黄历 — 节气', () => {
  it('2024-02-04（立春当日）→ 节气=立春', () => {
    expect(getHuangli(2024, 2, 4).节气).toBe('立春');
  });

  it('2024-02-19 → 雨水', () => {
    expect(getHuangli(2024, 2, 19).节气).toBe('雨水');
  });

  it('非交节日 → null', () => {
    expect(getHuangli(2026, 8, 16).节气).toBeNull();
  });
});

describe('黄历 — 十二时辰宜忌', () => {
  it('壬日十二时辰干支按五鼠遁（庚子起）', () => {
    const h = getHuangli(2026, 8, 16);
    const gz = h.时辰宜忌.map((s) => s.干支);
    expect(gz).toEqual(['庚子', '辛丑', '壬寅', '癸卯', '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥']);
  });

  it('辰时与戌日相冲 → 忌出行；卯时与戌日六合 → 宜会友', () => {
    const h = getHuangli(2026, 8, 16);
    const chen = h.时辰宜忌.find((s) => s.时辰 === '辰时')!;
    const mao = h.时辰宜忌.find((s) => s.时辰 === '卯时')!;
    expect(chen.忌).toContain('出行');
    expect(mao.宜).toContain('会友');
  });
});

describe('黄历 — v1 置空字段与 limitations', () => {
  it('农历相关字段为 null，并带 limitations 说明', () => {
    const h = getHuangli(2026, 8, 16);
    expect(h.农历).toBeNull();
    expect(h.月相).toBeNull();
    expect(h.九星).toBeNull();
    expect(h.六曜).toBeNull();
    expect(h.二十八宿).toBeNull();
    expect(h.节令).toEqual({ 三伏: null, 数九: null, 梅雨: null, 物候: null });
    expect(h.limitations.length).toBeGreaterThanOrEqual(4);
  });
});
