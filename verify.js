'use strict';
// 排行榜防作弊验证：拉取 API 的待验证录像 → 用游戏确定性引擎重放 → 比对声称结局 → 回写。
// 用法：
//   一次性（GitHub Actions / 本地）： API_BASE=… VERIFY_SECRET=… node verify.js
//   常驻轮询（render/railway/fly/任意 Node 主机）：见 verify-server.js（require 本文件的导出函数）。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API = process.env.API_BASE || 'https://api.dungeonraid.win';
const SECRET = process.env.VERIFY_SECRET;
const DEBUG = !!process.env.DEBUG;   // 逐回合重放日志开关（默认关，避免常驻服务刷屏）

// ---- 加载游戏确定性引擎（与 playtest.js 同法：DOM 桩件 + 注入导出）。一次加载可反复 startGame 重放多份录像 ----
function loadEngine(file) {
  const fullPath = path.isAbsolute(file) ? file : path.join(__dirname, file);
  const script = fs.readFileSync(fullPath, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const EXPORT = `globalThis.__E={VERSION,startGame,raceById,dispatchReplayAct,
    get player(){return player}, get replaying(){return replaying}, set replaying(v){replaying=v},
    get replayRec(){return replayRec}, set replayRec(v){replayRec=v},
    srand, rnd};`;
  if (!script.includes('resize(); showClassSelect(); loop();')) throw new Error('startup line not found in ' + fullPath);
  const src = script.replace('resize(); showClassSelect(); loop();', EXPORT);
  const elH = { get(t, p) {
    if (p === 'style') return t._s || (t._s = {});
    if (p === 'dataset') return t._d || (t._d = {});
    if (p === 'classList') return { add() {}, remove() {}, toggle() {} };
    if (p === 'getContext') return () => new Proxy({}, { get: () => () => {}, set: () => true });
    if (['addEventListener', 'appendChild', 'setAttribute', 'focus', 'click'].includes(p)) return () => {};
    if (p === 'querySelector') return () => new Proxy({}, elH);
    if (p === 'querySelectorAll') return () => [];
    if (p === 'getBoundingClientRect') return () => ({ left: 0, top: 0, width: 420, height: 420 });
    if (['width', 'height', 'clientWidth', 'clientHeight'].includes(p)) return 420;
    return t[p];
  }, set(t, p, v) { t[p] = v; return true; } };
  const mk = () => new Proxy({}, elH);
  const document = { getElementById: mk, createElement: mk, querySelector: mk, querySelectorAll: () => [], addEventListener() {}, body: mk() };
  new Function('document', 'window', 'localStorage', 'requestAnimationFrame', 'location', 'navigator', 'fetch', 'URLSearchParams', src)
    (document, { addEventListener() {}, requestAnimationFrame: () => 0 }, { getItem() { return null; }, setItem() {}, removeItem() {} }, () => 0,
     { search: '', hostname: 'verify', origin: 'http://verify', pathname: '/' }, { language: 'en' }, () => {}, URLSearchParams);
  return globalThis.__E;
}

function replay(G, rec, forceFirstGame) {
  // 旧版本录像可能没有 tut 字段，需要强制指定 firstGame 状态
  if (forceFirstGame !== undefined && rec.tut === undefined) {
    rec = { ...rec, tut: forceFirstGame ? 1 : 0 };
  }
  G.replayRec = rec; G.replaying = true;
  G.startGame(G.raceById(rec.race));
  const p = G.player;
  let lastTurn = 0;
  for (let i = 0; i < rec.acts.length; i++) {
    if (p.hp <= 0 || p.cleared) break;
    G.dispatchReplayAct(rec.acts[i]);
    if (DEBUG && p.turns !== lastTurn) {   // 逐回合状态仅在 DEBUG=1 时打印，避免常驻服务/Actions 日志洪水
      console.log(`回合 ${p.turns}: hp=${p.hp} level=${p.level} gold=${p.gold} actIdx=${i}`);
      lastTurn = p.turns;
    }
  }
  return { turns: p.turns, level: p.level, gold: p.gold, cleared: !!p.cleared };
}

// 完整性校验：版本号是人类标签，sha256 核对「这份文件确实是该版本」（仅打印告警，不阻断）
function integrityNote(ENGINE_VER) {
  try {
    const want = (JSON.parse(fs.readFileSync(__dirname + '/engines.json', 'utf8')) || {})[ENGINE_VER];
    if (want) {
      const got = crypto.createHash('sha256').update(fs.readFileSync(__dirname + '/dungeon-raid.html')).digest('hex');
      console.log(got === want ? `🔏 完整性校验通过（${ENGINE_VER}）` : `⚠️ 完整性告警：sha256 ${got} ≠ engines.json 登记 ${want}（文件可能被改动）`);
    }
  } catch (e) {}
}

function resolveEnginePath(version) {
  if (!version) return path.join(__dirname, 'dungeon-raid.html');
  const snap = path.join(__dirname, 'engines', `${version}.html`);
  return fs.existsSync(snap) ? snap : path.join(__dirname, 'dungeon-raid.html');
}

function loadEnginesForPending(pend) {
  const cache = new Map();
  for (const e of pend) {
    const ver = e.version || '';
    if (!cache.has(ver)) cache.set(ver, loadEngine(resolveEnginePath(ver)));
  }
  return cache;
}

// 拉取并验证待验证项，按录像自己的 release 版本选择引擎。返回 {pass,fail,skip,total}。可被常驻服务反复调用。
async function verifyPending(G, ENGINE_VER) {
  if (!SECRET) throw new Error('缺少 VERIFY_SECRET 环境变量');
  const purl = `${API}/pending?k=${encodeURIComponent(SECRET)}` + (ENGINE_VER ? `&version=${encodeURIComponent(ENGINE_VER)}` : '');
  const pend = (await (await fetch(purl)).json()).pending || [];
  if (!pend.length) return { pass: 0, fail: 0, skip: 0, total: 0 };
  const engines = loadEnginesForPending(pend);
  let pass = 0, fail = 0, skip = 0;
  for (const e of pend) {
    const runVer = e.version || '';
    const engine = engines.get(runVer);
    if (!engine || (engine.VERSION || '') !== runVer) { skip++; console.log(`⏭️  ${e.id} 缺少匹配引擎 ${runVer || '?'}`); continue; }
    // 严格判定：重放真实结局是否坐实声称值（不偷看声称值来挑选解释）
    const judge = a => !a ? false
      : e.cleared ? (a.cleared === true && a.level === e.level)        // 破关：必须真的破关且等级吻合
      : e.source === 'share' ? (a.turns >= e.turns - 1)                // 分享：能跑出≈声称回合即视为真录像
      : (a.turns === e.turns && a.level === e.level && a.gold === e.gold);  // 分数：三项全中才算真
    let actual = null, ok = false;
    try {
      const rec = await (await fetch(`${API}/rec/${e.id}`)).json();
      // tut 缺失的旧录像有 ≤3 种确定性解释（默认/firstGame=true/false）：
      // 任一解释满足严格判定即通过（OR 语义），report 用通过的那个，否则用默认重放值。
      const cands = rec.tut === undefined
        ? [replay(engine, rec), replay(engine, rec, true), replay(engine, rec, false)]
        : [replay(engine, rec)];
      actual = cands.find(judge) || cands[0];
      ok = judge(actual);
    } catch (err) { actual = null; ok = false; }
    await fetch(`${API}/verify?k=${encodeURIComponent(SECRET)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: e.id, ok, turns: actual ? actual.turns : 0, level: actual ? actual.level : 0, gold: actual ? actual.gold : 0 }),
    });
    ok ? pass++ : fail++;
    console.log(`${ok ? '✅' : '❌'} ${e.id} [${e.source}] ${runVer || '?'} claim ${e.turns}/${e.level}/${e.gold} → actual ${actual ? `${actual.turns}/${actual.level}/${actual.gold}` : 'ERR'}`);
  }
  return { pass, fail, skip, total: pend.length };
}

// 一次性入口（GitHub Actions / 本地手跑）
async function main() {
  if (!SECRET) { console.error('缺少 VERIFY_SECRET 环境变量'); process.exit(1); }
  const G = loadEngine('dungeon-raid.html');
  const ENGINE_VER = G.VERSION || '';
  integrityNote(ENGINE_VER);
  const r = await verifyPending(G, ENGINE_VER);
  if (!r.total) console.log(`没有待验证项（引擎版本 ${ENGINE_VER}）`);
  else console.log(`完成：${r.pass} 通过 / ${r.fail} 失败 / ${r.skip} 跳过（共 ${r.total}），引擎版本 ${ENGINE_VER}`);
}

module.exports = { loadEngine, replay, verifyPending, integrityNote, resolveEnginePath, loadEnginesForPending, API };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
