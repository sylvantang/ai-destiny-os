// ============================================================
// AI Destiny OS — Cross-engine precision comparison
// 同一组出生信息同时跑自有引擎与 shunshi-bazi-core（如已安装
// 也尝试 @openfate/bazi-engine），输出差异报告。
//
// 用法: npx tsx scripts/compare-engines.ts
// 注意: 不依赖第三方包安装 —— shunshi 经 web 依赖解析，
//       openfate 缺失时自动跳过。
// ============================================================

import { calcBaZi, calcDaYun, generateChart, getJieQi } from '../core/astro/index.js';
import { getBaziChart } from '../web/src/lib/bazi/engine-adapter';
import { SEXAGENARY_NAMES } from '../core/astro/constants.js';

interface CaseInput {
  name: string;
  year: number; month: number; day: number; hour: number; minute: number;
  longitude: number; gender: 'male' | 'female'; isDST: boolean;
  standardMeridian?: number;
  /** 已知约定差异（不换日/夏令时/标准子午线），不计入实质差异 */
  knownConvention?: string[];
}

const CASES: CaseInput[] = [
  { name: '经典-奥运开幕', year: 2008, month: 8, day: 8, hour: 20, minute: 0, longitude: 116.4, gender: 'male', isDST: false },
  { name: '立春前-2024', year: 2024, month: 2, day: 4, hour: 16, minute: 20, longitude: 116.4, gender: 'male', isDST: false },
  { name: '立春后-2024', year: 2024, month: 2, day: 4, hour: 16, minute: 30, longitude: 116.4, gender: 'male', isDST: false, knownConvention: ['立春比较口径：本引擎钟表时 vs 交节时刻；shunshi 真太阳时口径'] },
  { name: '立春前-2000', year: 2000, month: 2, day: 4, hour: 20, minute: 30, longitude: 116.4, gender: 'male', isDST: false },
  { name: '立春后-2000', year: 2000, month: 2, day: 4, hour: 20, minute: 50, longitude: 116.4, gender: 'male', isDST: false, knownConvention: ['立春比较口径：本引擎钟表时 vs 交节时刻；shunshi 真太阳时口径'] },
  { name: '早子时-2000', year: 2000, month: 1, day: 1, hour: 0, minute: 30, longitude: 116.4, gender: 'female', isDST: false },
  { name: '晚子时-2000', year: 2000, month: 1, day: 1, hour: 23, minute: 30, longitude: 116.4, gender: 'female', isDST: false, knownConvention: ['晚子时：本引擎不换日，shunshi sect=1 换日'] },
  { name: '丑时边界', year: 1990, month: 6, day: 1, hour: 2, minute: 0, longitude: 116.4, gender: 'male', isDST: false },
  { name: '寅时边界', year: 1990, month: 6, day: 1, hour: 3, minute: 0, longitude: 116.4, gender: 'male', isDST: false },
  { name: '上海经度', year: 1990, month: 5, day: 15, hour: 14, minute: 0, longitude: 121.5, gender: 'female', isDST: false },
  { name: '成都经度', year: 1990, month: 5, day: 15, hour: 14, minute: 30, longitude: 104.1, gender: 'female', isDST: false },
  { name: '乌鲁木齐经度', year: 1990, month: 5, day: 15, hour: 14, minute: 0, longitude: 87.6, gender: 'female', isDST: false, knownConvention: ['标准子午线：本引擎 120°E（北京时），shunshi 默认四舍五入 90°E'] },
  { name: '纽约经度', year: 1990, month: 5, day: 15, hour: 14, minute: 0, longitude: -74, gender: 'male', isDST: false, standardMeridian: -75 },
  { name: '伦敦经度', year: 1990, month: 5, day: 15, hour: 12, minute: 0, longitude: -0.13, gender: 'male', isDST: false, standardMeridian: 0 },
  { name: '悉尼经度', year: 1990, month: 5, day: 15, hour: 20, minute: 0, longitude: 151.2, gender: 'female', isDST: false, standardMeridian: 150 },
  { name: 'DST-1988', year: 1988, month: 7, day: 15, hour: 9, minute: 0, longitude: 116.4, gender: 'male', isDST: true, knownConvention: ['夏令时：shunshi 无 isDST 概念，按原钟表时'] },
  { name: '基准1900', year: 1900, month: 1, day: 1, hour: 0, minute: 30, longitude: 116.4, gender: 'male', isDST: false },
  { name: '1984立春', year: 1984, month: 2, day: 4, hour: 23, minute: 0, longitude: 116.4, gender: 'male', isDST: false },
  { name: '女性逆排-深圳', year: 1998, month: 7, day: 7, hour: 16, minute: 0, longitude: 114.1, gender: 'female', isDST: false },
  { name: '边界2100', year: 2100, month: 12, day: 31, hour: 23, minute: 0, longitude: 116.4, gender: 'female', isDST: false, knownConvention: ['晚子时：本引擎不换日'] },
];

// 官方节气时刻（紫金山天文台公布，北京时间 → UTC）
const OFFICIAL_JIEQI: [number, string, string][] = [
  [2024, '立春', '2024-02-04T08:26:53Z'],
  [2025, '立春', '2025-02-03T14:10:13Z'],
  [2026, '立春', '2026-02-03T20:01:51Z'],
  [2024, '惊蛰', '2024-03-05T02:22:31Z'],
  [2024, '冬至', '2024-12-21T09:20:20Z'],
  [2000, '立春', '2000-02-04T12:40:24Z'],
];

function gz(p: { stem: { name: string }; branch: { name: string } }): string {
  return p.stem.name + p.branch.name;
}

async function main() {
  console.log('=== 跨引擎精度对比（自有引擎 vs shunshi-bazi-core）===\n');

  let agree = 0;
  let conventionDiff = 0;
  let realDiff = 0;

  // 可选 openfate
  let openfate: unknown = null;
  try {
    openfate = await import('@openfate/bazi-engine');
  } catch {
    console.log('（@openfate/bazi-engine 未安装，跳过）\n');
  }

  for (const c of CASES) {
    const birth = { year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute, longitude: c.longitude, isDST: c.isDST, gender: c.gender === 'male' ? '男' as const : '女' as const, standardMeridian: c.standardMeridian };
    const bazi = calcBaZi(birth);
    const dayun = calcDaYun(birth, bazi.month, bazi.year.stemIndex, bazi.day.stemIndex);

    const shunshi = getBaziChart({
      year: c.year, month: c.month, day: c.day, hour: c.hour, minute: c.minute,
      gender: c.gender === 'male' ? 1 : 0, longitude: c.longitude, latitude: 39.9,
      useTrueSolarTime: true, sect: 1, standardMeridian: c.standardMeridian,
    });

    const ours = [gz(bazi.year), gz(bazi.month), gz(bazi.day), gz(bazi.hour)];
    const theirs = shunshi.八字.四柱.split(' ');
    const pillarDiff = ours.map((p, i) => (p === theirs[i] ? '' : `${ours[i]}≠${theirs[i]}`)).filter(Boolean);

    const oursDayun0 = dayun[0] ? `${SEXAGENARY_NAMES[dayun[0].pillar.sexagenaryIndex]}(${dayun[0].direction})` : '?';
    const theirsDayun0 = shunshi.八字.大运[0] ? shunshi.八字.大运[0].干支 : '?';
    const dayunDiff = oursDayun0.split('(')[0] !== theirsDayun0;

    const relations = generateChart(birth).relations;
    const ourRel = [
      ...relations.branchClashes, ...relations.branchCombinations, ...relations.branchPunishments, ...relations.branchHarms,
    ];
    const shunRel = [...shunshi.八字.刑冲合会.天干, ...shunshi.八字.刑冲合会.地支];

    if (pillarDiff.length === 0 && !dayunDiff) {
      agree++;
      console.log(`✓ ${c.name}: 四柱与大运0完全一致 (${ours.join(' ')} / dayun0=${oursDayun0})`);
    } else if ((c.knownConvention ?? []).length > 0) {
      conventionDiff++;
      console.log(`△ ${c.name}: ${pillarDiff.join('; ') || '大运差异'} — 约定差异（${c.knownConvention!.join('；')}）`);
      console.log(`    ours=${ours.join(' ')} | shunshi=${theirs.join(' ')} | dayun0 ours=${oursDayun0} shunshi=${theirsDayun0}`);
    } else {
      realDiff++;
      console.log(`✗ ${c.name}: ${pillarDiff.join('; ') || `大运0: ${oursDayun0}≠${theirsDayun0}`}`);
      console.log(`    ours=${ours.join(' ')} | shunshi=${theirs.join(' ')}`);
    }

    // 刑冲合害对比（信息性输出）
    if (ourRel.length > 0 || shunRel.length > 0) {
      console.log(`    刑冲合会 ours=${ourRel.join('/') || '无'} | shunshi=${shunRel.join('/') || '无'}`);
    }
  }

  console.log('\n=== 节气时刻 vs 官方公布值 ===');
  let jieqiOk = 0;
  for (const [year, name, iso] of OFFICIAL_JIEQI) {
    const jq = getJieQi(year).find((j) => j.name === name);
    if (!jq) continue;
    const diffSec = (jq.date.getTime() - new Date(iso).getTime()) / 1000;
    const ok = Math.abs(diffSec) <= 90;
    if (ok) jieqiOk++;
    console.log(`${ok ? '✓' : '✗'} ${year} ${name}: 本引擎 ${jq.date.toISOString()}（官方 ${iso}，偏差 ${diffSec >= 0 ? '+' : ''}${diffSec.toFixed(0)}s）`);
  }

  console.log('\n=== 汇总 ===');
  console.log(`四柱/大运0 完全一致: ${agree}/${CASES.length}`);
  console.log(`约定差异（预期）: ${conventionDiff}/${CASES.length}`);
  console.log(`实质差异: ${realDiff}/${CASES.length}`);
  console.log(`节气与官方值 ±90s: ${jieqiOk}/${OFFICIAL_JIEQI.length}`);
  console.log(openfate ? 'openfate 对比: 已加载（本脚本未做其字段级对比）' : 'openfate 对比: 跳过（未安装）');
}

main();
