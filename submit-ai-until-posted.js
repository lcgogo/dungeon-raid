'use strict';

const fs = require('fs');
const { spawnSync } = require('child_process');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseArgs(argv) {
  const opts = {
    maxAttempts: 20,
    waitMs: 8000,
    verifyPolls: 18,
    buildSets: [
      ['--submit-ai', '--games=1', '--gap=4200', '--min=0', '--race=elf', '--t1=elder', '--t2=sharpshooter'],
      ['--submit-ai', '--games=1', '--gap=4200', '--min=0', '--race=elf', '--t1=elder', '--t2=shadow'],
      ['--submit-ai', '--games=1', '--gap=4200', '--min=0', '--race=dwarf', '--t1=guildmaster', '--t2=demolitionist', '--boss=assassin'],
      ['--submit-ai', '--games=1', '--gap=4200', '--min=0', '--race=dwarf', '--t1=miser', '--t2=tycoon', '--boss=assassin'],
      ['--submit-ai', '--games=1', '--gap=4200', '--min=0', '--race=human', '--t1=knight', '--t2=holystrike'],
    ],
    extraArgs: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--max-attempts=')) opts.maxAttempts = +a.split('=')[1] || opts.maxAttempts;
    else if (a === '--max-attempts') opts.maxAttempts = +(argv[++i] || opts.maxAttempts) || opts.maxAttempts;
    else if (a.startsWith('--wait-ms=')) opts.waitMs = +a.split('=')[1] || opts.waitMs;
    else if (a === '--wait-ms') opts.waitMs = +(argv[++i] || opts.waitMs) || opts.waitMs;
    else if (a.startsWith('--verify-polls=')) opts.verifyPolls = +a.split('=')[1] || opts.verifyPolls;
    else if (a === '--verify-polls') opts.verifyPolls = +(argv[++i] || opts.verifyPolls) || opts.verifyPolls;
    else opts.extraArgs.push(a);
  }
  return opts;
}

function formalVersion() {
  const src = fs.readFileSync(__dirname + '/dungeon-raid.html', 'utf8');
  const m = src.match(/const VERSION='(v\d+\.\d+\.\d+)'/);
  if (!m) throw new Error('无法解析 dungeon-raid.html 的 VERSION');
  return m[1];
}

function runOnce(playArgs) {
  const res = spawnSync('node', ['playtest.js', ...playArgs], {
    cwd: __dirname,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  const out = (res.stdout || '') + (res.stderr || '');
  process.stdout.write(out);
  const post = out.match(/↑ \/(score|clear) .* → id ([a-z0-9]+)/);
  const threshold = out.match(/below upload threshold/);
  return { out, id: post && post[2], endpoint: post && post[1], threshold: !!threshold, code: res.status || 0 };
}

async function pollBoard(version, endpoint, id, verifyPolls, waitMs) {
  const path = endpoint === 'clear' ? 'clearboard' : 'top';
  for (let i = 1; i <= verifyPolls; i++) {
    await sleep(waitMs);
    const url = `https://api.dungeonraid.win/${path}?agent=ai&n=10&version=${encodeURIComponent(version)}`;
    const res = await fetch(url);
    const json = await res.json();
    const rows = endpoint === 'clear' ? (json.clears || []) : (json.top || []);
    const hit = rows.find(r => r.id === id);
    console.log(`\n[verify poll ${i}/${verifyPolls}] ${rows.length ? '已有 AI 榜条目' : 'AI 榜仍空'} ${url}`);
    if (hit) {
      console.log(`✅ 已在 AI 榜看到本次成绩：${id}`);
      return true;
    }
  }
  console.log(`⚠️ 已提交 ${id}，但在轮询窗口内还没出现在 AI 榜；大概率仍在等待 verify。`);
  return false;
}

(async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const version = formalVersion();
  console.log(`目标版本：${version}`);
  console.log(`最多尝试 ${opts.maxAttempts} 次，每次命中后轮询 AI 榜 ${opts.verifyPolls} 次。`);
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    const build = opts.buildSets[(attempt - 1) % opts.buildSets.length].concat(opts.extraArgs);
    console.log(`\n=== attempt ${attempt}/${opts.maxAttempts} === ${build.join(' ')}`);
    const r = runOnce(build);
    if (r.id) {
      console.log(`✅ 已成功提交 AI 成绩：${r.id} (${r.endpoint})`);
      await pollBoard(version, r.endpoint, r.id, opts.verifyPolls, opts.waitMs);
      return;
    }
    if (!r.threshold) console.log('⚠️ 本次没有命中上传门槛，也没有检测到已提交；继续下一次。');
  }
  console.log('❌ 在最大尝试次数内仍未打出可提交的 AI 成绩。');
  process.exit(1);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
