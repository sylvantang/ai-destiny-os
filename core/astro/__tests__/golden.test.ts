// ============================================================
// AI Destiny OS — Astro Core: Golden Test Suite (P0)
// 黄金测试集：立春边界 / 子时边界 / 多经度 / 夏令时 / 经典命例。
// 参考值经 shunshi-bazi-core（tyme4ts/寿星算法）独立交叉验证，
// 节气时刻与紫金山天文台/官方公布值对照（误差 < 90 秒）。
//
// 本引擎约定（与部分引擎不同，特此注明）：
// 1) 晚子时（23:00–23:59）日柱不换日：日柱取当日干支，
//    时柱按当日天干五鼠遁取子时（shunshi 默认 sect=1 换日）。
// 2) 年/月柱边界：出生钟表时刻（UTC+8，夏令时先扣 1 小时）与
//    交节时刻（北京时间）直接比较，不做真太阳时二次换算。
// 3) 标准子午线默认 120°E（北京时间），海外可用 standardMeridian。
// 4) 起运年龄为实岁（出生至前后节天数 / 3，保留 1 位小数），
//    部分软件按虚岁（+1）展示。
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  calcBaZi,
  generateChart,
  calcDaYun,
  getJieQi,
} from '../index.js';
import type { BirthInfo, BaZi } from '../types.js';

function gz(p: { stem: { name: string }; branch: { name: string } }): string {
  return p.stem.name + p.branch.name;
}

function pillars(bazi: BaZi): [string, string, string, string] {
  return [gz(bazi.year), gz(bazi.month), gz(bazi.day), gz(bazi.hour)];
}

function birth(
  year: number, month: number, day: number, hour: number, minute: number,
  longitude: number, gender: '男' | '女', opts: { isDST?: boolean; standardMeridian?: number } = {},
): BirthInfo {
  return {
    year, month, day, hour, minute,
    longitude,
    isDST: opts.isDST ?? false,
    gender,
    standardMeridian: opts.standardMeridian,
  };
}

const BJ = 116.4;

describe('P0 Golden — 经典命例', () => {
  it('2008-08-08 20:00 北京（奥运开幕）→ 戊子 庚申 庚辰 丙戌', () => {
    const bazi = calcBaZi(birth(2008, 8, 8, 20, 0, BJ, '男'));
    expect(pillars(bazi)).toEqual(['戊子', '庚申', '庚辰', '丙戌']);
  });

  it('1998-07-07 16:00 深圳（女）→ 戊寅 己未 乙卯 甲申', () => {
    const bazi = calcBaZi(birth(1998, 7, 7, 16, 0, 114.1, '女'));
    expect(pillars(bazi)).toEqual(['戊寅', '己未', '乙卯', '甲申']);
  });

  it('1900-01-01 00:30 北京（日柱基准锚点）→ 己亥 丙子 甲戌 甲子', () => {
    const bazi = calcBaZi(birth(1900, 1, 1, 0, 30, BJ, '男'));
    expect(pillars(bazi)).toEqual(['己亥', '丙子', '甲戌', '甲子']);
  });
});

describe('P0 Golden — 立春边界', () => {
  it('2024-02-04 16:20（立春前）→ 癸卯 乙丑 戊戌 庚申', () => {
    const bazi = calcBaZi(birth(2024, 2, 4, 16, 20, BJ, '男'));
    expect(pillars(bazi)).toEqual(['癸卯', '乙丑', '戊戌', '庚申']);
  });

  it('2024-02-04 16:30（立春后）→ 甲辰 丙寅 戊戌 庚申', () => {
    const bazi = calcBaZi(birth(2024, 2, 4, 16, 30, BJ, '男'));
    expect(pillars(bazi)).toEqual(['甲辰', '丙寅', '戊戌', '庚申']);
  });

  it('1984-02-04 06:00 与 23:00（均在 1984 立春 23:19 之前）→ 癸亥 乙丑 戊辰', () => {
    const morning = calcBaZi(birth(1984, 2, 4, 6, 0, BJ, '男'));
    const night = calcBaZi(birth(1984, 2, 4, 23, 0, BJ, '男'));
    expect(pillars(morning).slice(0, 3)).toEqual(['癸亥', '乙丑', '戊辰']);
    expect(pillars(night).slice(0, 3)).toEqual(['癸亥', '乙丑', '戊辰']);
  });

  it('2024-03-05 惊蛰换月：10:00 → 丙寅月，11:00 → 丁卯月', () => {
    const before = calcBaZi(birth(2024, 3, 5, 10, 0, BJ, '男'));
    const after = calcBaZi(birth(2024, 3, 5, 11, 0, BJ, '男'));
    expect(gz(before.month)).toBe('丙寅');
    expect(gz(after.month)).toBe('丁卯');
  });

  it('2000-02-04 立春（20:40 交节）换年换月：20:30 → 己卯 丁丑，20:50 → 庚辰 戊寅', () => {
    const before = calcBaZi(birth(2000, 2, 4, 20, 30, BJ, '男'));
    const after = calcBaZi(birth(2000, 2, 4, 20, 50, BJ, '男'));
    expect(pillars(before)).toEqual(['己卯', '丁丑', '壬辰', '庚戌']);
    expect(pillars(after)).toEqual(['庚辰', '戊寅', '壬辰', '庚戌']);
  });

  it('2026-02-04 立春（04:01 交节）换年换月：03:50 → 乙巳 己丑，04:10 → 丙午 庚寅', () => {
    const before = calcBaZi(birth(2026, 2, 4, 3, 50, BJ, '男'));
    const after = calcBaZi(birth(2026, 2, 4, 4, 10, BJ, '男'));
    expect(pillars(before)).toEqual(['乙巳', '己丑', '己酉', '丙寅']);
    expect(pillars(after)).toEqual(['丙午', '庚寅', '己酉', '丙寅']);
  });
});

describe('P0 Golden — 节气时刻精度（官方公布值 ±90 秒）', () => {
  const CASES: [number, string, string][] = [
    // [年份, 节气, 官方北京时间]
    [2024, '立春', '2024-02-04T08:26:53Z'],
    [2025, '立春', '2025-02-03T14:10:13Z'],
    [2026, '立春', '2026-02-03T20:01:51Z'],
    [2024, '惊蛰', '2024-03-05T02:22:31Z'],
    [2024, '冬至', '2024-12-21T09:20:20Z'],
    [2000, '立春', '2000-02-04T12:40:24Z'],
  ];

  for (const [year, name, iso] of CASES) {
    it(`${year} ${name} ≈ ${iso} (±90s)`, () => {
      const jq = getJieQi(year).find((j) => j.name === name);
      expect(jq).toBeDefined();
      const diffMs = Math.abs(jq!.date.getTime() - new Date(iso).getTime());
      expect(diffMs).toBeLessThanOrEqual(90 * 1000);
    });
  }
});

describe('P0 Golden — 子时边界（本引擎约定：不换日）', () => {
  it('早子时 2000-01-01 00:30 → 己卯 丙子 戊午 壬子', () => {
    const bazi = calcBaZi(birth(2000, 1, 1, 0, 30, BJ, '女'));
    expect(pillars(bazi)).toEqual(['己卯', '丙子', '戊午', '壬子']);
    expect(bazi.hour.branchIndex).toBe(0);
  });

  it('晚子时 2000-01-01 23:30 → 己卯 丙子 戊午 壬子（日柱不换日）', () => {
    const bazi = calcBaZi(birth(2000, 1, 1, 23, 30, BJ, '女'));
    expect(pillars(bazi)).toEqual(['己卯', '丙子', '戊午', '壬子']);
    expect(bazi.hour.branchIndex).toBe(0);
  });
});

describe('P0 Golden — 时辰边界（真太阳时）', () => {
  it('1990-06-01 02:00 → 丑时（辛丑）', () => {
    const bazi = calcBaZi(birth(1990, 6, 1, 2, 0, BJ, '男'));
    expect(gz(bazi.day)).toBe('丁酉');
    expect(gz(bazi.hour)).toBe('辛丑');
  });

  it('1990-06-01 03:00 → 真太阳时约 02:48，仍为丑时（辛丑）', () => {
    const bazi = calcBaZi(birth(1990, 6, 1, 3, 0, BJ, '男'));
    expect(gz(bazi.hour)).toBe('辛丑');
  });

  it('1990-06-01 04:00 → 寅时（壬寅）', () => {
    const bazi = calcBaZi(birth(1990, 6, 1, 4, 0, BJ, '男'));
    expect(gz(bazi.hour)).toBe('壬寅');
  });

  it('1990-06-01 06:00 → 卯时（癸卯）', () => {
    const bazi = calcBaZi(birth(1990, 6, 1, 6, 0, BJ, '男'));
    expect(gz(bazi.hour)).toBe('癸卯');
  });

  it('1990-06-01 22:00 与 23:00 → 真太阳时约 21:46/22:46，均为亥时（辛亥）', () => {
    const a = calcBaZi(birth(1990, 6, 1, 22, 0, BJ, '男'));
    const b = calcBaZi(birth(1990, 6, 1, 23, 0, BJ, '男'));
    expect(gz(a.hour)).toBe('辛亥');
    expect(gz(b.hour)).toBe('辛亥');
  });
});

describe('P0 Golden — 不同经度', () => {
  it('上海 121.5°E 14:00 → 癸未时', () => {
    const bazi = calcBaZi(birth(1990, 5, 15, 14, 0, 121.5, '女'));
    expect(pillars(bazi)).toEqual(['庚午', '辛巳', '庚辰', '癸未']);
  });

  it('成都 104.1°E 14:30 → 癸未时', () => {
    const bazi = calcBaZi(birth(1990, 5, 15, 14, 30, 104.1, '女'));
    expect(gz(bazi.hour)).toBe('癸未');
  });

  it('乌鲁木齐 87.6°E 14:00 → 真太阳时约 11:54，午时（壬午）', () => {
    const bazi = calcBaZi(birth(1990, 5, 15, 14, 0, 87.6, '女'));
    expect(gz(bazi.hour)).toBe('壬午');
  });

  it('纽约 -74°E, standardMeridian=-75, 14:00 → 未时（癸未）', () => {
    const bazi = calcBaZi(birth(1990, 5, 15, 14, 0, -74, '男', { standardMeridian: -75 }));
    expect(gz(bazi.hour)).toBe('癸未');
  });

  it('伦敦 -0.13°E, standardMeridian=0, 12:00 → 午时（壬午）', () => {
    const bazi = calcBaZi(birth(1990, 5, 15, 12, 0, -0.13, '男', { standardMeridian: 0 }));
    expect(gz(bazi.hour)).toBe('壬午');
  });

  it('悉尼 151.2°E, standardMeridian=150, 20:00 → 戌时（丙戌）', () => {
    const bazi = calcBaZi(birth(1990, 5, 15, 20, 0, 151.2, '女', { standardMeridian: 150 }));
    expect(gz(bazi.hour)).toBe('丙戌');
  });
});

describe('P0 Golden — 夏令时（中国 1986–1991）', () => {
  it('1988-07-15 09:00 isDST=true → 按 08:00 标准时排盘：戊辰 己未 辛未 壬辰', () => {
    const bazi = calcBaZi(birth(1988, 7, 15, 9, 0, BJ, '男', { isDST: true }));
    expect(pillars(bazi)).toEqual(['戊辰', '己未', '辛未', '壬辰']);
  });

  it('1988-07-15 23:30 isDST=true → 标准时 22:30，亥时（己亥）', () => {
    const bazi = calcBaZi(birth(1988, 7, 15, 23, 30, BJ, '男', { isDST: true }));
    expect(gz(bazi.day)).toBe('辛未');
    expect(gz(bazi.hour)).toBe('己亥');
  });

  it('1988-07-16 00:30 isDST=true → 标准时 07-15 23:30，晚子时按当日干支：辛未日 戊子时', () => {
    const bazi = calcBaZi(birth(1988, 7, 16, 0, 30, BJ, '男', { isDST: true }));
    expect(gz(bazi.day)).toBe('辛未');
    expect(gz(bazi.hour)).toBe('戊子');
  });
});

describe('P0 Golden — 大运', () => {
  it('2008-08-08 20:00 北京（阳年男）→ 顺排，第一步大运 辛酉', () => {
    const b = birth(2008, 8, 8, 20, 0, BJ, '男');
    const bazi = calcBaZi(b);
    const dayun = calcDaYun(b, bazi.month, bazi.year.stemIndex, bazi.day.stemIndex);
    expect(dayun[0]!.direction).toBe('顺排');
    expect(gz(dayun[0]!.pillar)).toBe('辛酉');
    expect(dayun[0]!.startAge).toBeCloseTo(9.9, 1);
    expect(dayun.length).toBe(10);
  });

  it('1998-07-07 16:00 深圳（阳年女）→ 逆排', () => {
    const b = birth(1998, 7, 7, 16, 0, 114.1, '女');
    const bazi = calcBaZi(b);
    const dayun = calcDaYun(b, bazi.month, bazi.year.stemIndex, bazi.day.stemIndex);
    expect(dayun[0]!.direction).toBe('逆排');
    expect(gz(dayun[0]!.pillar)).toBe('戊午');
  });
});

describe('P0 Golden — 输出完整性', () => {
  it('generateChart 输出包含四柱/十神/藏干/纳音/大运/五行统计/刑冲合害', () => {
    const chart = generateChart(birth(2008, 8, 8, 20, 0, BJ, '男'));

    for (const key of ['year', 'month', 'day', 'hour'] as const) {
      const p = chart.bazi[key];
      expect(typeof p.nayin).toBe('string');
      expect(p.nayin.length).toBeGreaterThan(0);
      expect(p.hiddenStems.length).toBeGreaterThan(0);
      expect(typeof p.shiShen).toBe('string');
    }

    for (const wx of ['木', '火', '土', '金', '水'] as const) {
      expect(typeof chart.wuxingCount[wx]).toBe('number');
    }

    expect(chart.dayun.length).toBeGreaterThanOrEqual(8);
    expect(chart.dayMasterWuxing).toBe(chart.bazi.day.stem.wuxing);

    const r = chart.relations;
    for (const key of [
      'stemClashes', 'stemCombines', 'branchClashes',
      'branchCombinations', 'branchPunishments', 'branchHarms',
    ] as const) {
      expect(Array.isArray(r[key])).toBe(true);
    }
    // 奥运盘：日支辰与年支子半合水局，无天干相冲（戊/庚/庚/丙）
    expect(r.stemClashes.length).toBe(0);
  });

  it('日主十神应固定为比肩', () => {
    const bazi = calcBaZi(birth(1990, 5, 15, 14, 0, 121.5, '女'));
    expect(bazi.day.shiShen).toBe('比肩');
  });
});
