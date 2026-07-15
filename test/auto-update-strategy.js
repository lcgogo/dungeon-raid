'use strict';
/**
 * auto-update-strategy.js
 *
 * 当游戏版本更新时自动执行：
 * 1. 从 dungeon-raid.html 源码提取所有种族/职业/被动/锁定关系
 * 2. 生成全部有效 build 组合（race × t1 × t2b）
 * 3. 逐个调 playtest.js 跑 N 局，提取中位/最高回合
 * 4. 按中位回合降序排名，取前 TOP_N 名
 * 5. 自动重写 submit-ai-until-posted.js 的 buildSets 数组
 *
 * 用法：node test/auto-update-strategy.js [--games=5] [--top=8]
 */
const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const HTML_FILE = path.join(PROJECT_ROOT, 'dungeon-raid.html');
const SUBMIT_FILE = path.join(__dirname, 'tools', 'submit-ai-until-posted.js');

// ---------- 参数 ----------
const ARG = Object.fromEntries(process.argv.slice(2).map(s => {
  const m = s.match(/^--([^=]+)=?(.*)$/);
  return m ? [m[1], m[2]] : [s, ''];
}));
const GAMES = +ARG.games || 5;
const TOP_N = +ARG.top || 8;

// ---------- 1) 从源码提取游戏数据 ----------
function extractGameData() {
  const src = fs.readFileSync(HTML_FILE, 'utf8');

  // RACE_PATHS: { raceId: { t1: [...], t2: [...] } }
  const rpMatch = src.match(/const RACE_PATHS=\{([\s\S]*?)\};/);
  const racePaths = {};
  if (rpMatch) {
    const races = [...rpMatch[1].matchAll(/(\w+):\s*\{[^}]*t1:\s*\[([^\]]*)\][^}]*t2:\s*\[([^\]]*)\]/g)];
    for (const m of races) {
      racePaths[m[1]] = {
        t1: m[2].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean),
        t2: m[3].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean),
      };
    }
  }

  // CLASS_T2: { t1Id: lockedT2Id }
  const ct2Match = src.match(/const CLASS_T2=\{([\s\S]*?)\}/);
  const classT2 = {};
  if (ct2Match) {
    for (const m of ct2Match[1].matchAll(/(\w+):\s*'(\w+)'/g)) {
      classT2[m[1]] = m[2];
    }
  }

  // VERSION
  const verMatch = src.match(/const VERSION='(v[\d.]+)'/);
  const version = verMatch ? verMatch[1] : 'unknown';

  return { racePaths, classT2, version };
}

// ---------- 2) 生成全部有效 build ----------
function generateBuilds(data) {
  const builds = [];
  for (const [race, paths] of Object.entries(data.racePaths)) {
    for (const t1 of paths.t1) {
      const locked = data.classT2[t1];
      for (const t2b of paths.t2) {
        if (t2b === locked) continue;   // 跳过锁定的二阶（100回合自动获得，不算 build 差异）
        builds.push({ race, t1, t2b, locked });
      }
    }
  }
  return builds;
}

// ---------- 3) 测试单个 build ----------
function testBuild(build) {
  const args = [
    'test/tools/playtest.js',
    `--race=${build.race}`,
    `--t1=${build.t1}`,
    `--t2=${build.t2b}`,
    `--games=${GAMES}`,
    '--min=0',
  ];
  const res = spawnSync('node', args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 180000,
  });
  const out = (res.stdout || '') + (res.stderr || '');

  // FOCUS 模式输出格式：
  //   人族  swordsaint/bladeall |    222  220   441 |  ...
  // 取第一个 | 之后的三个数字：中位 均值 最高
  const lines = out.split('\n');
  for (const line of lines) {
    if (!line.includes('|') || line.includes('---') || line.includes('种族') || line.includes('定向')) continue;
    const parts = line.split('|');
    if (parts.length < 2) continue;
    const nums = parts[1].trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
    if (nums.length >= 3) {
      return { median: nums[0], avg: nums[1], max: nums[2] };
    }
  }
  return { median: 0, avg: 0, max: 0 };
}

// ---------- 4) 重写 submit-ai-until-posted.js ----------
function updateSubmitFile(topBuilds, version) {
  const content = fs.readFileSync(SUBMIT_FILE, 'utf8');

  // 生成注释表
  const commentLines = topBuilds.map((b, i) =>
    `  //   ${b.race} ${b.t1} + ${b.t2b}`.padEnd(38) +
    `${String(b.median).padStart(5)}  ${String(b.max).padStart(5)}   ${b.race}`
  ).join('\n');

  const newComment = `  // Builds ordered by strength (${GAMES}-game test data, ${version}):\n${commentLines}\n  // NOTE: --boss filter is NOT used — server verify replays with full BOSSES array,\n  //   so filtering would cause replay mismatch and fail verification.`;

  // 生成 buildSets 数组
  const buildLines = topBuilds.map(b =>
    `      ['--submit-ai', '--games=1', '--gap=4200', '--min=0', '--race=${b.race}', '--t1=${b.t1}', '--t2=${b.t2b}'],`
  ).join('\n');

  // 替换注释块 + buildSets
  let newContent = content.replace(
    /\/\/ Builds ordered by strength[\s\S]*?\/\/\s+so filtering would cause replay mismatch and fail verification\./,
    newComment
  );
  newContent = newContent.replace(
    /buildSets:\s*\[[\s\S]*?\],/,
    `buildSets: [\n${buildLines}\n    ],`
  );

  fs.writeFileSync(SUBMIT_FILE, newContent, 'utf8');
}

// ---------- main ----------
console.log('=== auto-update-strategy ===');
const data = extractGameData();
console.log(`版本: ${data.version}`);
console.log(`种族: ${Object.keys(data.racePaths).join(', ')}`);

const builds = generateBuilds(data);
console.log(`共 ${builds.length} 个有效 build 组合，每个跑 ${GAMES} 局\n`);

const results = [];
for (let i = 0; i < builds.length; i++) {
  const b = builds[i];
  process.stdout.write(`[${i + 1}/${builds.length}] ${b.race}/${b.t1}/${b.t2b} ... `);
  const r = testBuild(b);
  console.log(`中位 ${r.median} / 最高 ${r.max}`);
  results.push({ ...b, ...r });
}

// 按中位降序，平手看最高
results.sort((a, b) => b.median - a.median || b.max - a.max);

const top = results.slice(0, TOP_N);
console.log(`\n=== TOP ${TOP_N} (by median turns) ===`);
console.log('#  build                             median  max');
console.log('-  -----                             ------  ---');
top.forEach((b, i) => {
  console.log(`${i + 1}. ${b.race} ${b.t1} + ${b.t2b}`.padEnd(38) +
    `${String(b.median).padStart(5)}  ${String(b.max).padStart(5)}`);
});

updateSubmitFile(top, data.version);
console.log(`\n✅ 已更新 submit-ai-until-posted.js (${data.version})`);
