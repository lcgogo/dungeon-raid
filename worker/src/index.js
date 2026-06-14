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

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });
function shortId(n = 8) {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789', a = crypto.getRandomValues(new Uint8Array(n));
  let s = ''; for (let i = 0; i < n; i++) s += c[a[i] % 36]; return s;
}
const validRec = r => r && typeof r.seed === 'number' && typeof r.race === 'string' && Array.isArray(r.acts) && r.acts.length > 0;
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

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url), p = url.pathname;

    // 写入类端点按来源 IP 限流（每 IP 20 次/60s），挡刷榜/批量伪造。绑定缺失时（本地/未配）跳过。
    if (req.method === 'POST' && (p === '/rec' || p === '/score' || p === '/clear') && env.WRITE_LIMITER) {
      const ip = req.headers.get('cf-connecting-ip') || 'unknown';
      const { success } = await env.WRITE_LIMITER.limit({ key: ip });
      if (!success) return json({ error: 'too many requests, slow down' }, 429);
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
      const turns = turnCount(d.rec);                 // 回合以录像动作数为准，防止伪报
      const level = d.level | 0, gold = d.gold | 0, race = d.rec.race, version = d.rec.ver || '';
      const agent = d.agent === 'ai' ? 'ai' : 'human';   // 自报，非 'ai' 一律按人类
      const id = shortId();
      await env.REC.put(id, JSON.stringify(d.rec));
      await env.DB.prepare("INSERT INTO scores(id,version,race,turns,level,gold,source,agent,verified,created) VALUES(?,?,?,?,?,?,'play',?,0,?)")
        .bind(id, version, race, turns, level, gold, agent, Date.now()).run();
      const rk = await ranking(env, version, race, turns, agent);
      return json({ id, turns, agent, ...rk });
    }

    // POST /clear —— 正式版破关上报（撑过终焉10波）。按最低破关等级排名。
    if (req.method === 'POST' && p === '/clear') {
      const body = await req.text();
      if (body.length > MAX_BYTES) return json({ error: 'too large' }, 413);
      let d; try { d = JSON.parse(body); } catch { return json({ error: 'invalid json' }, 400); }
      if (!d || !validRec(d.rec)) return json({ error: 'invalid' }, 400);
      const turns = turnCount(d.rec);
      if (turns < 510) return json({ error: 'not a clear (need >=510 turns)' }, 422);
      const level = d.level | 0, race = d.rec.race, version = d.rec.ver || '';
      const agent = d.agent === 'ai' ? 'ai' : 'human';   // 自报，非 'ai' 一律按人类
      const id = shortId();
      await env.REC.put(id, JSON.stringify(d.rec));
      await env.DB.prepare("INSERT INTO scores(id,version,race,turns,level,gold,source,cleared,agent,verified,created) VALUES(?,?,?,?,?,0,'play',1,?,0,?)")
        .bind(id, version, race, turns, level, agent, Date.now()).run();
      const rk = await clearRanking(env, version, race, level, agent);
      return json({ id, level, agent, ...rk });
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
        `SELECT id,version,race,level,turns,verified FROM scores WHERE ${where} ORDER BY level ASC, turns ASC LIMIT ?`).bind(...binds).all();
      return json({ clears: results || [], agent, versions: vf.versions });
    }

    // GET /top?version=&race=&n=  —— 榜单（按版本过滤，不传则只看有版本号的最新成绩）
    if (req.method === 'GET' && p === '/top') {
      const race = url.searchParams.get('race');
      const n = Math.min(50, Math.max(1, +(url.searchParams.get('n') || 10)));
      const agent = url.searchParams.get('agent') === 'ai' ? 'ai' : 'human';   // 默认人类榜
      const cols = 'id,version,race,turns,level,gold,verified';
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
};
