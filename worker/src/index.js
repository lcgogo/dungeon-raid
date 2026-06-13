// Dungeon Raid 录像分享 API（Cloudflare Worker + KV）
// POST /rec      body=录像JSON → 存入 KV，返回 { id }
// GET  /rec/:id  → 返回该录像JSON
// 录像很小（~2-4KB），KV 足够；带 CORS 供 GitHub Pages 上的游戏跨域调用。

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const MAX_BYTES = 200000;          // 单份录像上限 ~200KB（正常 2-4KB，留足余量）
const MIN_TURNS = 30;              // 少于 30 回合的录像不接收（一次连线 'm' = 一回合）

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
}
function shortId(n = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const a = crypto.getRandomValues(new Uint8Array(n));
  let s = '';
  for (let i = 0; i < n; i++) s += chars[a[i] % 36];
  return s;
}
function validRec(r) {
  return r && typeof r.seed === 'number' && typeof r.race === 'string'
    && Array.isArray(r.acts) && r.acts.length > 0;
}
function turnCount(r) {
  return r.acts.filter(a => Array.isArray(a) && a[0] === 'm').length;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);

    // GET /rec/:id —— 取回录像
    const m = url.pathname.match(/^\/rec\/([a-z0-9]{4,16})$/);
    if (req.method === 'GET' && m) {
      const v = await env.REC.get(m[1]);
      if (!v) return json({ error: 'not found' }, 404);
      return new Response(v, { headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    // POST /rec —— 存录像，返回短 id
    if (req.method === 'POST' && url.pathname === '/rec') {
      const body = await req.text();
      if (body.length > MAX_BYTES) return json({ error: 'recording too large' }, 413);
      let rec;
      try { rec = JSON.parse(body); } catch { return json({ error: 'invalid json' }, 400); }
      if (!validRec(rec)) return json({ error: 'invalid recording' }, 400);
      if (turnCount(rec) < MIN_TURNS) return json({ error: 'run too short (min ' + MIN_TURNS + ' turns)' }, 422);
      const id = shortId();
      await env.REC.put(id, JSON.stringify(rec));   // 永久保存（录像极小）
      return json({ id });
    }

    if (req.method === 'GET' && url.pathname === '/') return json({ ok: true, service: 'dungeon-raid-rec' });
    return json({ error: 'not found' }, 404);
  },
};
