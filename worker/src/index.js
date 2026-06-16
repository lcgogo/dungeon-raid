// Dungeon Raid API（Cloudflare Worker + KV 录像 + D1 排行榜）
//   POST /rec        存录像 → { id }（分享用；<30回合拒收；回合远超榜单则标记待验证）
//   GET  /rec/:id    取录像
//   POST /score      正式版死亡上报 { race,turns,level,gold,rec } → 入库 + 返回总榜/种族榜百分位
//   GET  /top?race=&n=        排行榜（仅 source=play 且已重放验证 verified=1；百分位按 verified>=0 近似）
//   GET  /pending?k=secret    待验证的高分录像（给定时任务）
//   POST /verify?k=secret     回写验证结果 { id, ok, turns?,level?,gold? }
//   POST /classify?k=secret   私有黑盒改判 { id, agent:'human'|'ai' }（人类榜↔AI榜）
// 排名：回合↓ → 等级↓ → 金币↓。百分位按回合近似。
// agent 维度：human | ai（提交自报，默认 human；日后黑盒可改判）。/top、/clearboard 按 ?agent= 分人类榜/AI榜。

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const MAX_BYTES = 200000;   // 单份录像上限
const MIN_TURNS = 30;       // 分享门槛：少于 30 回合不接收
const SHARE_VERIFY_FACTOR = 1.5;  // 分享回合数 > 榜首×1.5（且≥榜首+30）→ 标记待验证
const SEED_TTL = 7200;      // 服务端发放的种子 token 有效期（秒）：一局必须在此窗口内完成
// 反作弊·服务端发种子：上榜成绩必须用服务端发的种子（防离线刷幸运种子）。
// true = 强制：无 token 的提交一律拒收（v1.22.0 带 token 的正式版上线后开启）。
const REQUIRE_TOKEN = true;

// 校验并消费一次性种子 token：present 且有效 → 标记已用、返回 {ok:true}；否则 {ok:false,reason}
async function consumeToken(env, token, seed) {
  if (!token) return { ok: false, reason: 'no-token' };
  if (!env.REC) return { ok: false, reason: 'no-kv' };
  const k = 'seed:' + token;
  const raw = await env.REC.get(k);
  if (!raw) return { ok: false, reason: 'unknown-or-expired' };
  let t; try { t = JSON.parse(raw); } catch { return { ok: false, reason: 'corrupt' }; }
  if (t.u) return { ok: false, reason: 'used' };
  if ((t.s >>> 0) !== (seed >>> 0)) return { ok: false, reason: 'seed-mismatch' };
  await env.REC.put(k, JSON.stringify({ s: t.s, u: 1 }), { expirationTtl: 600 });  // 标记已用，短 TTL 防复用
  return { ok: true };
}

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });
function shortId(n = 8) {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789', a = crypto.getRandomValues(new Uint8Array(n));
  let s = ''; for (let i = 0; i < n; i++) s += c[a[i] % 36]; return s;
}
const validRec = r => r && typeof r.seed === 'number' && typeof r.race === 'string' && Array.isArray(r.acts) && r.acts.length > 0;
// 玩家展示名（alias）清洗：去控制字符、限显示宽度≤24（汉字/全角=2，字母=1，即最长 12 汉字）
function cleanName(s) {
  s = String(s || "").trim();
  let out = '', w = 0;
  for (const ch of s) { const c = ch.codePointAt(0); if (c < 32 || c === 127) continue; const cw = c > 0x2e7f ? 2 : 1; if (w + cw > 24) break; out += ch; w += cw; }
  return out;
}
// AI 无名时随机起名：形容词+的+名词
const NM_ADJ = ['勇敢', '狡猾', '无畏', '暴躁', '沉默', '闪光', '幸运', '落魄', '狂热', '冷酷', '神秘', '贪婪', '永恒', '嗜血', '迅捷', '孤独'];
const NM_NOUN = ['剑客', '游侠', '骑士', '守卫', '屠夫', '浪人', '行者', '亡魂', '君王', '流寇', '影子', '猎手', '老兵', '圣徒', '赌徒', '莽夫'];
const genAiName = () => NM_ADJ[Math.floor(Math.random() * NM_ADJ.length)] + '的' + NM_NOUN[Math.floor(Math.random() * NM_NOUN.length)];
const subName = (d, agent) => { const n = cleanName(d.name); return n || (agent === 'ai' ? genAiName() : ''); };
const turnCount = r => r.acts.filter(a => Array.isArray(a) && a[0] === 'm').length;

async function cnt(env, where, ...bind) {
  const row = await env.DB.prepare(`SELECT COUNT(*) c FROM scores WHERE ${where}`).bind(...bind).first();
  return row ? row.c : 0;
}
// 百分位：超过了多少比例（按回合近似）。只在【同版本】内统计，不同版本不混排。
async function ranking(env, version, race, turns, agent = 'human') {
  const base = "source='play' AND verified>=0 AND agent=? AND version=?";   // 人类榜/AI榜分开计名次
  const tot = await cnt(env, base, agent, version);
  const better = await cnt(env, base + ' AND turns>?', agent, version, turns);
  const rtot = await cnt(env, base + ' AND race=?', agent, version, race);
  const rbetter = await cnt(env, base + ' AND race=? AND turns>?', agent, version, race, turns);
  const pct = (b, t) => t > 0 ? Math.round((1 - b / t) * 1000) / 10 : 100;
  return {
    version,
    overall: { rank: better + 1, total: tot, pct: pct(better, tot) },
    race: { rank: rbetter + 1, total: rtot, pct: pct(rbetter, rtot) },
  };
}
// 破关榜名次：按【最低破关等级】，level 越低越前。rank = 比我等级更低的 + 1。
async function clearRanking(env, version, race, level, agent = 'human') {
  const base = "cleared=1 AND verified=1 AND agent=? AND version=?";   // 仅计已重放验证的真破关；人类榜/AI榜分开
  const tot = await cnt(env, base, agent, version);
  const better = await cnt(env, base + ' AND level<?', agent, version, level);
  const worse = await cnt(env, base + ' AND level>?', agent, version, level);
  const rtot = await cnt(env, base + ' AND race=?', agent, version, race);
  const rbetter = await cnt(env, base + ' AND race=? AND level<?', agent, version, race, level);
  const rworse = await cnt(env, base + ' AND race=? AND level>?', agent, version, race, level);
  const pct = (w, t) => t > 0 ? Math.round((w / t) * 1000) / 10 : 100;   // 我比 w 个更强（等级更高的）领先
  return {
    version,
    overall: { rank: better + 1, total: tot, pct: pct(worse, tot) },
    race: { rank: rbetter + 1, total: rtot, pct: pct(rworse, rtot) },
  };
}

// 最近 n 个版本（按 semver 倒序）：榜单只保留最近几个版本，避免频繁补丁把榜单切碎
async function recentVersions(env, n) {
  const { results } = await env.DB.prepare("SELECT DISTINCT version FROM scores WHERE version != ''").all();
  const sv = v => v.replace(/^v/, '').split('.').map(x => parseInt(x, 10) || 0);
  const vers = (results || []).map(r => r.version).sort((a, b) => {
    const A = sv(a), B = sv(b);
    for (let i = 0; i < 3; i++) { if ((A[i] || 0) !== (B[i] || 0)) return (B[i] || 0) - (A[i] || 0); }
    return 0;
  });
  return vers.slice(0, n);
}
// 定期清理：删除「不在最近 keepVers 个版本」且「created 早于 days 天」的录像（KV）+ 其 scores 行。
// 每条 KV 录像都有对应 scores 行（/rec、/score、/clear 都同时写两边），故按 D1 驱动即可删全。
// 每次最多删 max 条（留余量给 KV 免费版每日删除配额），多了下次接着删。
async function pruneOld(env, { days = 30, keepVers = 5, max = 400 } = {}) {
  const keep = await recentVersions(env, keepVers);
  const cutoff = Date.now() - days * 86400000;
  const notIn = keep.length ? ` AND version NOT IN (${keep.map(() => '?').join(',')})` : '';
  const { results } = await env.DB.prepare(
    `SELECT id FROM scores WHERE created < ?${notIn} LIMIT ?`
  ).bind(cutoff, ...keep, max).all();
  const ids = (results || []).map(r => r.id);
  let deleted = 0;
  for (const id of ids) {
    try { if (env.REC) await env.REC.delete(id); } catch (e) {}
    await env.DB.prepare("DELETE FROM scores WHERE id=?").bind(id).run();
    deleted++;
  }
  return { deleted, keptVersions: keep, cutoffDays: days, more: ids.length === max };
}
// 把 version / recent 参数翻译成 where 片段（version IN (...) 或 单版本）；返回 {sql, binds, versions}
async function versionFilter(env, url) {
  const recent = url.searchParams.get('recent');
  if (recent) {
    const vers = await recentVersions(env, Math.min(5, Math.max(1, +recent || 3)));
    if (vers.length) return { sql: ` AND version IN (${vers.map(() => '?').join(',')})`, binds: vers, versions: vers };
    return { sql: '', binds: [], versions: [] };
  }
  const version = url.searchParams.get('version');
  if (version) return { sql: ' AND version=?', binds: [version], versions: [version] };
  return { sql: '', binds: [], versions: null };
}

// 该成绩是否进入「顶尖」（前 1%，且至少前 10 名）→ 值得即时验证
function isTopTier(rk) { const o = rk && rk.overall; return !!o && o.rank <= Math.max(10, Math.ceil(o.total * 0.01)); }
// 顶尖成绩即时验证：触发 GitHub Actions 的 verify 工作流（workflow_dispatch）。去抖：90s 内不重复触发。需 secret GH_DISPATCH_TOKEN（细粒度 PAT，对本仓库 Actions: write）。
const GH_REPO = 'lcgogo/dungeon-raid';
async function triggerVerify(env) {
  if (!env.GH_DISPATCH_TOKEN || !env.REC) return;
  try {
    if (await env.REC.get('vdispatch')) return;                     // 去抖：上次触发 90s 内不再发
    await env.REC.put('vdispatch', '1', { expirationTtl: 90 });
    await fetch(`https://api.github.com/repos/${GH_REPO}/actions/workflows/verify.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.GH_DISPATCH_TOKEN,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'dungeon-raid-worker',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
  } catch (e) { /* 触发失败不影响成绩提交，下次每半小时批量兜底 */ }
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url), p = url.pathname;

    // 写入类端点按来源 IP 限流（每 IP 20 次/60s），挡刷榜/批量伪造。绑定缺失时（本地/未配）跳过。
    if (req.method === 'POST' && (p === '/rec' || p === '/score' || p === '/clear' || p === '/seed') && env.WRITE_LIMITER) {
      const ip = req.headers.get('cf-connecting-ip') || 'unknown';
      const { success } = await env.WRITE_LIMITER.limit({ key: ip });
      if (!success) return json({ error: 'too many requests, slow down' }, 429);
    }

    // POST /seed —— 发放一次性服务端种子 + token（上榜成绩须用它，防离线刷种子）。已被上方按 IP 限流。
    if (req.method === 'POST' && p === '/seed') {
      const seed = crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
      const token = shortId(16);
      if (env.REC) await env.REC.put('seed:' + token, JSON.stringify({ s: seed, u: 0 }), { expirationTtl: SEED_TTL });
      return json({ seed, token });
    }

    // GET /rec/:id
    const m = p.match(/^\/rec\/([a-z0-9]{4,16})$/);
    if (req.method === 'GET' && m) {
      const v = await env.REC.get(m[1]);
      return v ? new Response(v, { headers: { 'Content-Type': 'application/json', ...CORS } }) : json({ error: 'not found' }, 404);
    }

    // POST /rec —— 分享录像
    if (req.method === 'POST' && p === '/rec') {
      const body = await req.text();
      if (body.length > MAX_BYTES) return json({ error: 'too large' }, 413);
      let rec; try { rec = JSON.parse(body); } catch { return json({ error: 'invalid json' }, 400); }
      if (!validRec(rec)) return json({ error: 'invalid recording' }, 400);
      const turns = turnCount(rec);
      if (turns < MIN_TURNS) return json({ error: 'run too short (min ' + MIN_TURNS + ' turns)' }, 422);
      const id = shortId();
      await env.REC.put(id, JSON.stringify(rec));
      // 回合远超正式版榜首 → 记一条 source=share 的待验证（定时任务会拉镜像跑一遍）
      try {
        const topRow = await env.DB.prepare("SELECT MAX(turns) m FROM scores WHERE source='play' AND verified>=0").first();
        const top = (topRow && topRow.m) || 0;
        if (turns > Math.max(top * SHARE_VERIFY_FACTOR, top + 30)) {
          await env.DB.prepare("INSERT INTO scores(id,version,race,turns,level,gold,source,verified,created) VALUES(?,?,?,?,0,0,'share',0,?)")
            .bind(id, rec.ver || '', rec.race, turns, Date.now()).run();
        }
      } catch (e) { /* D1 未就绪也不影响分享 */ }
      return json({ id });
    }

    // POST /score —— 正式版死亡上报
    if (req.method === 'POST' && p === '/score') {
      const body = await req.text();
      if (body.length > MAX_BYTES) return json({ error: 'too large' }, 413);
      let d; try { d = JSON.parse(body); } catch { return json({ error: 'invalid json' }, 400); }
      if (!d || !validRec(d.rec)) return json({ error: 'invalid' }, 400);
      const tkn = d.token || (d.rec && d.rec.token); const tok = await consumeToken(env, tkn, d.rec.seed);   // 服务端种子 token 校验
      if (tkn && !tok.ok) return json({ error: 'invalid seed token: ' + tok.reason }, 422);
      if (!tkn && REQUIRE_TOKEN) return json({ error: 'ranked play requires a server seed' }, 422);
      const turns = turnCount(d.rec);                 // 回合以录像动作数为准，防止伪报
      const level = d.level | 0, gold = d.gold | 0, race = d.rec.race, version = d.rec.ver || '';
      const agent = d.agent === 'ai' ? 'ai' : 'human';   // 自报，非 'ai' 一律按人类
      const name = subName(d, agent);   // 玩家展示名（alias）；AI 无名则随机起名
      const id = shortId();
      await env.REC.put(id, JSON.stringify(d.rec));
      await env.DB.prepare("INSERT INTO scores(id,version,race,turns,level,gold,source,agent,name,verified,created) VALUES(?,?,?,?,?,?,'play',?,?,0,?)")
        .bind(id, version, race, turns, level, gold, agent, name, Date.now()).run();
      const rk = await ranking(env, version, race, turns, agent);
      if (isTopTier(rk) && ctx) ctx.waitUntil(triggerVerify(env));   // 顶尖成绩 → 立刻触发验证（~1 分钟内上榜），不阻塞响应
      return json({ id, turns, agent, name, ...rk });
    }

    // POST /clear —— 正式版破关上报（撑过终焉10波）。按最低破关等级排名。
    if (req.method === 'POST' && p === '/clear') {
      const body = await req.text();
      if (body.length > MAX_BYTES) return json({ error: 'too large' }, 413);
      let d; try { d = JSON.parse(body); } catch { return json({ error: 'invalid json' }, 400); }
      if (!d || !validRec(d.rec)) return json({ error: 'invalid' }, 400);
      const tkn = d.token || (d.rec && d.rec.token); const tok = await consumeToken(env, tkn, d.rec.seed);   // 服务端种子 token 校验
      if (tkn && !tok.ok) return json({ error: 'invalid seed token: ' + tok.reason }, 422);
      if (!tkn && REQUIRE_TOKEN) return json({ error: 'ranked play requires a server seed' }, 422);
      const turns = turnCount(d.rec);
      if (turns < 510) return json({ error: 'not a clear (need >=510 turns)' }, 422);
      const level = d.level | 0, race = d.rec.race, version = d.rec.ver || '';
      const agent = d.agent === 'ai' ? 'ai' : 'human';   // 自报，非 'ai' 一律按人类
      const name = subName(d, agent);
      const id = shortId();
      await env.REC.put(id, JSON.stringify(d.rec));
      await env.DB.prepare("INSERT INTO scores(id,version,race,turns,level,gold,source,cleared,agent,name,verified,created) VALUES(?,?,?,?,?,0,'play',1,?,?,0,?)")
        .bind(id, version, race, turns, level, agent, name, Date.now()).run();
      const rk = await clearRanking(env, version, race, level, agent);
      if (isTopTier(rk) && ctx) ctx.waitUntil(triggerVerify(env));   // 顶尖破关 → 立刻触发验证，不阻塞响应
      return json({ id, level, agent, name, ...rk });
    }

    // GET /clearboard?version=&race=&n= —— 破关榜（按最低破关等级 ASC）
    if (req.method === 'GET' && p === '/clearboard') {
      const race = url.searchParams.get('race');
      const agent = url.searchParams.get('agent') === 'ai' ? 'ai' : 'human';   // 默认人类榜
      const n = Math.min(50, Math.max(1, +(url.searchParams.get('n') || 10)));
      const vf = await versionFilter(env, url);
      let where = "cleared=1 AND verified=1 AND agent=?", binds = [agent];   // 只展示已重放验证的真破关
      where += vf.sql; binds.push(...vf.binds);
      if (race) { where += ' AND race=?'; binds.push(race); }
      binds.push(n);
      const { results } = await env.DB.prepare(
        `SELECT id,version,race,level,turns,name,verified FROM scores WHERE ${where} ORDER BY level ASC, turns ASC LIMIT ?`).bind(...binds).all();
      return json({ clears: results || [], agent, versions: vf.versions });
    }

    // GET /top?version=&race=&n=  —— 榜单（按版本过滤，不传则只看有版本号的最新成绩）
    if (req.method === 'GET' && p === '/top') {
      const race = url.searchParams.get('race');
      const n = Math.min(50, Math.max(1, +(url.searchParams.get('n') || 10)));
      const agent = url.searchParams.get('agent') === 'ai' ? 'ai' : 'human';   // 默认人类榜
      const cols = 'id,version,race,turns,level,gold,name,verified';
      const order = 'ORDER BY turns DESC, level DESC, gold DESC LIMIT ?';
      const vf = await versionFilter(env, url);
      let where = "source='play' AND verified=1 AND agent=?", binds = [agent];   // 榜单只展示已重放验证的成绩（伪造在验证前不可见，验证失败转 -1 永不上榜）；百分位 ranking() 仍按 verified>=0 给即时近似排名
      where += vf.sql; binds.push(...vf.binds);
      if (race) { where += ' AND race=?'; binds.push(race); }
      binds.push(n);
      const { results } = await env.DB.prepare(`SELECT ${cols} FROM scores WHERE ${where} ${order}`).bind(...binds).all();
      return json({ top: results || [], agent, versions: vf.versions });
    }

    // GET /pending?k= —— 最强的未验证录像（含 share 触发），交给定时任务
    if (req.method === 'GET' && p === '/pending') {
      if (url.searchParams.get('k') !== env.VERIFY_SECRET) return json({ error: 'forbidden' }, 403);
      const ver = url.searchParams.get('version');   // 只取当前引擎版本的待验证项：旧版本录像没有对应引擎可重放，否则会长期占满队列、饿死新版本成绩
      let where = 'verified=0', binds = [];
      if (ver) { where += ' AND version=?'; binds.push(ver); }
      const { results } = await env.DB.prepare(
        `SELECT id,version,race,turns,level,gold,source,cleared,agent FROM scores WHERE ${where} ORDER BY turns DESC LIMIT 50`).bind(...binds).all();
      return json({ pending: results || [] });
    }

    // POST /classify?k= —— 私有黑盒改判某条成绩的 agent（human↔ai）。仅密钥可调。
    if (req.method === 'POST' && p === '/classify') {
      if (url.searchParams.get('k') !== env.VERIFY_SECRET) return json({ error: 'forbidden' }, 403);
      let d; try { d = JSON.parse(await req.text()); } catch { return json({ error: 'invalid json' }, 400); }
      if (!d || !d.id || (d.agent !== 'ai' && d.agent !== 'human')) return json({ error: 'invalid' }, 400);
      await env.DB.prepare("UPDATE scores SET agent=? WHERE id=?").bind(d.agent, d.id).run();
      return json({ ok: true, id: d.id, agent: d.agent });
    }

    // POST /admin?k= —— 管理删除（仅密钥）：删单条 {op:'del',id}，或清空全部 {op:'wipe',confirm:'YES'}
    if (req.method === 'POST' && p === '/admin') {
      if (url.searchParams.get('k') !== env.VERIFY_SECRET) return json({ error: 'forbidden' }, 403);
      let d; try { d = JSON.parse(await req.text()); } catch { return json({ error: 'invalid json' }, 400); }
      if (d && d.op === 'del' && d.id) {
        await env.DB.prepare("DELETE FROM scores WHERE id=?").bind(d.id).run();
        try { if (env.REC) await env.REC.delete(d.id); } catch (e) {}
        return json({ ok: true, deleted: d.id });
      }
      if (d && d.op === 'wipe' && d.confirm === 'YES') {
        const r = await env.DB.prepare("DELETE FROM scores").run();
        return json({ ok: true, wiped: (r.meta && r.meta.changes) || 0 });
      }
      if (d && d.op === 'prune') {
        const r = await pruneOld(env, { days: d.days | 0 || 30, keepVers: d.keep | 0 || 5, max: d.max | 0 || 400 });
        return json({ ok: true, ...r });
      }
      return json({ error: "usage: {op:'del',id} | {op:'wipe',confirm:'YES'} | {op:'prune',days?,keep?,max?}" }, 400);
    }

    // POST /verify?k= —— 回写验证结果
    if (req.method === 'POST' && p === '/verify') {
      if (url.searchParams.get('k') !== env.VERIFY_SECRET) return json({ error: 'forbidden' }, 403);
      let d; try { d = JSON.parse(await req.text()); } catch { return json({ error: 'invalid json' }, 400); }
      if (!d || !d.id) return json({ error: 'invalid' }, 400);
      if (d.ok) {
        // 验证通过：标记已验证，并以重放的真实结局校正 turns/level/gold
        await env.DB.prepare("UPDATE scores SET verified=1, turns=?, level=?, gold=? WHERE id=?")
          .bind(d.turns | 0, d.level | 0, d.gold | 0, d.id).run();
      } else {
        await env.DB.prepare("UPDATE scores SET verified=-1 WHERE id=?").bind(d.id).run();
      }
      return json({ ok: true });
    }

    if (req.method === 'GET' && p === '/') return json({ ok: true, service: 'dungeon-raid-api' });
    return json({ error: 'not found' }, 404);
  },

  // 每日 Cron：自动清理旧版本+陈旧录像（默认保留最近 5 版、删 30 天前的，单次≤400 条）
  async scheduled(event, env, ctx) {
    ctx.waitUntil(pruneOld(env, {}).then(r => console.log('prune', JSON.stringify(r))));
  },
};
