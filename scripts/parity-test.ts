// ============================================================
// AI Destiny OS — Engine Parity Test
// Compares the unified adapter output field-by-field against
// direct shunshi-bazi-core calls, on 10 golden cases + 1000
// random cases across 1900–2100.
// ============================================================

import type { UnifiedInput } from '../web/src/lib/bazi/engine-adapter';

interface CaseInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: 'male' | 'female';
  longitude: number;
  latitude: number;
}

const GOLDEN_CASES: { name: string; input: CaseInput }[] = [
  { name: '标准案例-北京', input: { year: 1990, month: 5, day: 15, hour: 14, gender: 'male', longitude: 116.4, latitude: 39.9 } },
  { name: '子时跨天-上海', input: { year: 1985, month: 2, day: 3, hour: 23, gender: 'female', longitude: 121.5, latitude: 31.2 } },
  { name: '节气交节日-广州', input: { year: 2000, month: 2, day: 4, hour: 10, gender: 'male', longitude: 113.3, latitude: 23.1 } }, // 立春日
  { name: '闰月案例-成都', input: { year: 1995, month: 8, day: 15, hour: 12, gender: 'female', longitude: 104.1, latitude: 30.7 } },
  { name: '高纬度-哈尔滨', input: { year: 1992, month: 12, day: 22, hour: 8, gender: 'male', longitude: 126.6, latitude: 45.8 } },
  { name: '边界-1900年', input: { year: 1900, month: 1, day: 1, hour: 0, gender: 'male', longitude: 116.4, latitude: 39.9 } },
  { name: '边界-2100年', input: { year: 2100, month: 12, day: 31, hour: 23, gender: 'female', longitude: 116.4, latitude: 39.9 } },
  { name: '女性-深圳', input: { year: 1998, month: 7, day: 7, hour: 16, gender: 'female', longitude: 114.1, latitude: 22.5 } },
  { name: '男性-西安', input: { year: 1988, month: 10, day: 10, hour: 11, gender: 'male', longitude: 108.9, latitude: 34.3 } },
  { name: '标准-杭州', input: { year: 1993, month: 3, day: 18, hour: 9, gender: 'male', longitude: 120.2, latitude: 30.3 } },
  // 1000 random cases generated below
];

// Generate 1000 random valid dates 1900-2100
function randomDate() {
  const start = new Date(1900, 0, 1).getTime();
  const end = new Date(2100, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
}
for (let i = 0; i < 1000; i++) {
  const d = randomDate();
  GOLDEN_CASES.push({
    name: `random-${i}`,
    input: {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: Math.floor(Math.random() * 24),
      gender: Math.random() > 0.5 ? 'male' : 'female',
      longitude: 116.4 + (Math.random() - 0.5) * 30,
      latitude: 39.9 + (Math.random() - 0.5) * 20,
    },
  });
}

async function main() {
  // Dynamic import: works around tsx CJS/ESM interop in this monorepo layout
  const {
    computeUnifiedBazi,
    getBaziChart,
  } = await import('../web/src/lib/bazi/engine-adapter');

  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  for (const tc of GOLDEN_CASES) {
    try {
      const unifiedInput: UnifiedInput = {
        year: tc.input.year,
        month: tc.input.month,
        day: tc.input.day,
        hour: tc.input.hour,
        minute: 0,
        gender: tc.input.gender === 'male' ? '男' : '女',
        longitude: tc.input.longitude,
        latitude: tc.input.latitude,
      };
      const unified = await computeUnifiedBazi(unifiedInput);

      const shunshi = getBaziChart({
        year: tc.input.year,
        month: tc.input.month,
        day: tc.input.day,
        hour: tc.input.hour,
        minute: 0,
        gender: tc.input.gender === 'male' ? 1 : 0,
        longitude: tc.input.longitude,
        latitude: tc.input.latitude,
        useTrueSolarTime: true,
        sect: 1,
      });

      const d = shunshi.八字.柱位详细;

      // Critical field comparisons
      const checks = [
        { key: 'year stem', a: unified.chart.pillars.year.stem.name, b: d.年柱.天干 },
        { key: 'year branch', a: unified.chart.pillars.year.branch.name, b: d.年柱.地支 },
        { key: 'month stem', a: unified.chart.pillars.month.stem.name, b: d.月柱.天干 },
        { key: 'month branch', a: unified.chart.pillars.month.branch.name, b: d.月柱.地支 },
        { key: 'day stem', a: unified.chart.pillars.day.stem.name, b: d.日柱.天干 },
        { key: 'day branch', a: unified.chart.pillars.day.branch.name, b: d.日柱.地支 },
        { key: 'hour stem', a: unified.chart.pillars.hour.stem.name, b: d.时柱.天干 },
        { key: 'hour branch', a: unified.chart.pillars.hour.branch.name, b: d.时柱.地支 },
        { key: 'day master', a: unified.chart.dayMaster.stem, b: shunshi.八字.日主 },
        { key: 'day master wuxing', a: unified.chart.dayMaster.wuxing, b: shunshi.八字.五行分值.日主五行 },
      ];

      let tcPass = true;
      for (const c of checks) {
        if (c.a !== c.b) {
          failures.push(`${tc.name}: ${c.key} mismatch - adapter: "${c.a}" vs shunshi: "${c.b}"`);
          tcPass = false;
        }
      }

      // Decade luck start age parity (within 1 year)
      const ad = unified.fortune.lifePeriods[0];
      const sd = shunshi.八字.大运[0];
      if (ad && sd) {
        const ageDiff = Math.abs(ad.startAge - sd.起始年龄);
        if (ageDiff > 1) {
          failures.push(`${tc.name}: decade luck startAge diff ${ageDiff} - adapter: ${ad.startAge} vs shunshi: ${sd.起始年龄}`);
          tcPass = false;
        }
      }

      if (tcPass) pass++;
      else fail++;
    } catch (e) {
      failures.push(`${tc.name}: ERROR ${e instanceof Error ? e.message : String(e)}`);
      fail++;
    }
  }

  console.log('\n=== PARITY TEST RESULT ===');
  console.log(`PASS: ${pass} / ${GOLDEN_CASES.length}`);
  console.log(`FAIL: ${fail} / ${GOLDEN_CASES.length}`);

  if (failures.length > 0) {
    console.log('\n--- FAILURES ---');
    failures.slice(0, 100).forEach((f) => console.log(f));
    process.exit(1);
  }
  console.log('\nALL TESTS PASSED');
}

main();
