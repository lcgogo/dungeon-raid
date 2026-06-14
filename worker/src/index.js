// Dungeon Raid API（Cloudflare Worker + KV 录像 + D1 排行榜）
//   POST /rec        存录像 → { id }（分享用；<30回合拒收；回合远超榜单则标记待验证）
//   GET  /rec/:id    取录像
//   POST /score      正式版死亡上报 { race,turns,level,gold,rec } → 入库 + 返回总榜/种族榜百分位
//   GET  /top?race=&n=        排行榜（仅 source=play 且未被判作弊）
//   GET  /pending?k=secret    待验证的高分录像（给定时任务）
//   POST /verify?k=secret     回写验证结果 { id, ok, turns?,level?,gold? }
// 排名：回合↓ → 等级↓ → 金币↓。百分位按回合近似。

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
async function ranking(env, version, race, turns) {
  const base = "source='play' AND verified>=0 AND version=?";
  const tot = await cnt(env, base, version);
  const better = await cnt(env, base + ' AND turns>?', version, turns);
  const rtot = await cnt(env, base + ' AND race=?', version, race);
  const rbetter = await cnt(env, base + ' AND race=? AND turns>?', version, race, turns);
  const pct = (b, t) => t > 0 ? Math.round((1 - b / t) * 1000) / 10 : 100;
  return {
    version,
    overall: { rank: better + 1, total: tot, pct: pct(better, tot) },
    race: { rank: rbetter + 1, total: rtot, pct: pct(rbetter, rtot) },
  };
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url), p = url.pathname;

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
      const id = shortId();
      await env.REC.put(id, JSON.stringify(d.rec));
      await env.DB.prepare("INSERT INTO scores(id,version,race,turns,level,gold,source,verified,created) VALUES(?,?,?,?,?,?,'play',0,?)")
        .bind(id, version, race, turns, level, gold, Date.now()).run();
      const rk = await ranking(env, version, race, turns);
      return json({ id, turns, ...rk });
    }

    // GET /top?version=&race=&n=  —— 榜单（按版本过滤，不传则只看有版本号的最新成绩）
    if (req.method === 'GET' && p === '/top') {
      const race = url.searchParams.get('race');
      const version = url.searchParams.get('version');
      const n = Math.min(50, Math.max(1, +(url.searchParams.get('n') || 10)));
      const cols = 'id,version,race,turns,level,gold,verified';
      const order = 'ORDER BY turns DESC, level DESC, gold DESC LIMIT ?';
      let where = "source='play' AND verified>=0", binds = [];
      if (version) { where += ' AND version=?'; binds.push(version); }
      if (race) { where += ' AND race=?'; binds.push(race); }
      binds.push(n);
      const { results } = await env.DB.prepare(`SELECT ${cols} FROM scores WHERE ${where} ${order}`).bind(...binds).all();
      return json({ top: results || [] });
    }

    // GET /pending?k= —— 最强的未验证录像（含 share 触发），交给定时任务
    if (req.method === 'GET' && p === '/pending') {
      if (url.searchParams.get('k') !== env.VERIFY_SECRET) return json({ error: 'forbidden' }, 403);
      const { results } = await env.DB.prepare(
        "SELECT id,version,race,turns,level,gold,source FROM scores WHERE verified=0 ORDER BY turns DESC LIMIT 50").all();
      return json({ pending: results || [] });
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
