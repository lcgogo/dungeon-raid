'use strict';
// 排行榜防作弊验证：拉取 API 的待验证录像 → 用游戏确定性引擎重放 → 比对声称结局 → 回写。
// 由 GitHub Actions 每小时跑（也可本地 `API_BASE=… VERIFY_SECRET=… node verify.js`）。
const fs = require('fs');
const crypto = require('crypto');

const API = process.env.API_BASE || 'https://api.dungeonraid.win';
const SECRET = process.env.VERIFY_SECRET;
if (!SECRET) { console.error('缺少 VERIFY_SECRET 环境变量'); process.exit(1); }

// ---- 加载游戏确定性引擎（与 playtest.js 同法：DOM 桩件 + 注入导出）----
function loadEngine(file) {
  const script = fs.readFileSync(__dirname + '/' + file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const EXPORT = `globalThis.__E={VERSION,startGame,raceById,dispatchReplayAct,
    get player(){return player}, set replaying(v){replaying=v}, set replayRec(v){replayRec=v}};`;
  if (!script.includes('resize(); showClassSelect(); loop();')) throw new Error('startup line not found in ' + file);
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

// 确定性重放一份录像，返回真实结局（含是否破关）
function replay(G, rec) {
  G.replayRec = rec; G.replaying = true;
  G.startGame(G.raceById(rec.race));
  const p = G.player;
  for (const a of rec.acts) { if (p.hp <= 0 || p.cleared) break; G.dispatchReplayAct(a); }
  return { turns: p.turns, level: p.level, gold: p.gold, cleared: !!p.cleared };
}

async function main() {
  // 先加载引擎、直接读它运行时的 VERSION（不靠正则抽源码，因此 minify 也不影响），只向 /pending 要这个版本的待验证项
  const G = loadEngine('dungeon-raid.html');
  const ENGINE_VER = G.VERSION || '';
  // 完整性校验：版本号是人类标签，sha256 用来核对「这份文件确实是该版本」
  try {
    const want = (JSON.parse(fs.readFileSync(__dirname + '/engines.json', 'utf8')) || {})[ENGINE_VER];
    if (want) {
      const got = crypto.createHash('sha256').update(fs.readFileSync(__dirname + '/dungeon-raid.html')).digest('hex');
      console.log(got === want ? `🔏 完整性校验通过（${ENGINE_VER}）` : `⚠️ 完整性告警：sha256 ${got} ≠ engines.json 登记 ${want}（文件可能被改动）`);
    }
  } catch (e) {}
  const purl = `${API}/pending?k=${encodeURIComponent(SECRET)}` + (ENGINE_VER ? `&version=${encodeURIComponent(ENGINE_VER)}` : '');
  const pend = (await (await fetch(purl)).json()).pending || [];
  if (!pend.length) { console.log(`没有待验证项（引擎版本 ${ENGINE_VER}）`); return; }
  let pass = 0, fail = 0, skip = 0;
  for (const e of pend) {
    // 录像只能在自己那个版本的引擎上正确重放；版本不符则跳过（不同版本本就不混排）
    if ((e.version || '') !== ENGINE_VER) { skip++; console.log(`⏭️  ${e.id} 版本 ${e.version || '?'} ≠ 引擎 ${ENGINE_VER}，跳过`); continue; }
    let actual = null;
    try {
      const rec = await (await fetch(`${API}/rec/${e.id}`)).json();
      actual = replay(G, rec);
    } catch (err) { actual = null; }
    let ok;
    if (!actual) ok = false;
    else if (e.cleared) ok = actual.cleared === true && actual.level === e.level;  // 破关：必须真的破关且等级吻合
    else if (e.source === 'share') ok = actual.turns >= e.turns - 1;             // 分享：能跑出≈声称回合即视为真录像
    else ok = actual.turns === e.turns && actual.level === e.level && actual.gold === e.gold;  // 分数：三项全中才算真
    await fetch(`${API}/verify?k=${encodeURIComponent(SECRET)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: e.id, ok, turns: actual ? actual.turns : 0, level: actual ? actual.level : 0, gold: actual ? actual.gold : 0 }),
    });
    ok ? pass++ : fail++;
    console.log(`${ok ? '✅' : '❌'} ${e.id} [${e.source}] claim ${e.turns}/${e.level}/${e.gold} → actual ${actual ? `${actual.turns}/${actual.level}/${actual.gold}` : 'ERR'}`);
  }
  console.log(`完成：${pass} 通过 / ${fail} 失败 / ${skip} 跳过（共 ${pend.length}），引擎版本 ${ENGINE_VER}`);
}
main().catch(e => { console.error(e); process.exit(1); });
