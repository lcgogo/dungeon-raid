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
const SHARE_VERIFY_TURN_CAP = 511;  // 分享待验证阈值封顶：避免榜首抬到终局可达范围之外
const SEED_TTL = 259200;      // 服务端发放的种子 token 有效期（秒）：现实时间 72 小时内可用于排行榜提交/补交
const THRESH_SCOPE = 'upload:human:race=all:recent3';
const THRESH_RECENT = 3;
const THRESH_SURVIVAL_CAP = 350;
const THRESH_MIN_SAMPLE = 30;
const PLAYABLE_RACES = ['human', 'elf', 'dwarf', 'orc', 'undead'];
const THRESH_DEFAULT = { scope: THRESH_SCOPE, recent: THRESH_RECENT, agent: 'human', race: 'all', target_race: 'all', version_bucket: '', requested_version_bucket: '', scope_kind: `recent${THRESH_RECENT}`, versions: [], total: 0, upload_min_turns: 0, top1_turns: 0, p5: 0, p10: 0, p30: 0, p50: 0, p70: 0, p90: 0, computed: 0 };
const AUTO_CLASSIFY_BATCH_MAX = 50;
// 反作弊·服务端发种子：上榜成绩必须用服务端发的种子（防离线刷幸运种子）。
// true = 强制：无 token 的提交一律拒收（v1.22.0 带 token 的正式版上线后开启）。
const REQUIRE_TOKEN = true;

// 校验并消费一次性种子 token：present 且有效 → 标记已用、返回 {ok:true,dbg,gate}；否则 {ok:false,reason}
async function consumeToken(env, token, seed) {
  if (!token) return { ok: false, reason: 'no-token' };
  if (!env.REC) return { ok: false, reason: 'no-kv' };
  const k = 'seed:' + token;
  const raw = await env.REC.get(k);
  if (!raw) return { ok: false, reason: 'unknown-or-expired' };
  let t; try { t = JSON.parse(raw); } catch { return { ok: false, reason: 'corrupt' }; }
  if (t.u) return { ok: false, reason: 'used' };
  if ((t.s >>> 0) !== (seed >>> 0)) return { ok: false, reason: 'seed-mismatch' };
  await env.REC.put(k, JSON.stringify({ ...t, u: 1 }), { expirationTtl: 600 });  // 标记已用，短 TTL 防复用
  return { ok: true, dbg: !!t.dbg, gate: t.gate || null };
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
// 榜单按【大.次版本】分桶（v1.30.12 → v1.30）：避免频繁补丁号把榜单切碎；凡是会影响 verify/replay 兼容边界的变更应升次版本，开启新的榜单桶。
const minorKey = v => 'v' + String(v || '').replace(/^v/, '').split('.').slice(0, 2).join('.');   // v1.30.12 → v1.30
const minorLike = v => minorKey(v) + '.%';   // SQL LIKE 模式，匹配同一「大.次」下所有补丁号
// 百分位：超过了多少比例（按回合近似）。在【同大.次版本桶】内统计。
async function ranking(env, version, race, turns, agent = 'human') {
  const vb = minorLike(version);
  const base = "source='play' AND verified>=0 AND agent=? AND version LIKE ?";   // 人类榜/AI榜分开计名次；同大.次桶
  const tot = await cnt(env, base, agent, vb);
  const better = await cnt(env, base + ' AND turns>?', agent, vb, turns);
  const rtot = await cnt(env, base + ' AND race=?', agent, vb, race);
  const rbetter = await cnt(env, base + ' AND race=? AND turns>?', agent, vb, race, turns);
  const pct = (b, t) => t > 0 ? Math.round((1 - b / t) * 1000) / 10 : 100;
  return {
    version: minorKey(version),
    overall: { rank: better + 1, total: tot, pct: pct(better, tot) },
    race: { rank: rbetter + 1, total: rtot, pct: pct(rbetter, rtot) },
  };
}
// 破关榜名次：按【最低破关等级】，level 越低越前。rank = 比我等级更低的 + 1。（同大.次桶）
async function clearRanking(env, version, race, level, agent = 'human') {
  const vb = minorLike(version);
  const base = "cleared=1 AND verified=1 AND agent=? AND version LIKE ?";   // 仅计已重放验证的真破关；人类榜/AI榜分开
  const tot = await cnt(env, base, agent, vb);
  const better = await cnt(env, base + ' AND level<?', agent, vb, level);
  const worse = await cnt(env, base + ' AND level>?', agent, vb, level);
  const rtot = await cnt(env, base + ' AND race=?', agent, vb, race);
  const rbetter = await cnt(env, base + ' AND race=? AND level<?', agent, vb, race, level);
  const rworse = await cnt(env, base + ' AND race=? AND level>?', agent, vb, race, level);
  const pct = (w, t) => t > 0 ? Math.round((w / t) * 1000) / 10 : 100;   // 我比 w 个更强（等级更高的）领先
  return {
    version: minorKey(version),
    overall: { rank: better + 1, total: tot, pct: pct(worse, tot) },
    race: { rank: rbetter + 1, total: rtot, pct: pct(rworse, rtot) },
  };
}

// 最近 n 个【大.次版本桶】（按 semver 倒序）：榜单只保留最近几个桶，避免频繁补丁号把榜单切碎
async function recentVersions(env, n) {
  const { results } = await env.DB.prepare("SELECT DISTINCT version FROM scores WHERE version != ''").all();
  const minors = [...new Set((results || []).map(r => minorKey(r.version)))];
  const sv = v => v.replace(/^v/, '').split('.').map(x => parseInt(x, 10) || 0);
  minors.sort((a, b) => {
    const A = sv(a), B = sv(b);
    for (let i = 0; i < 2; i++) { if ((A[i] || 0) !== (B[i] || 0)) return (B[i] || 0) - (A[i] || 0); }
    return 0;
  });
  return minors.slice(0, n);   // 返回「大.次」键，如 ["v1.30","v1.29"]
}
// 定期清理：删除「不在最近 keepVers 个版本」且「created 早于 days 天」的录像（KV）+ 其 scores 行。
// 每条 KV 录像都有对应 scores 行（/rec、/score、/clear 都同时写两边），故按 D1 驱动即可删全。
// 每次最多删 max 条（留余量给 KV 免费版每日删除配额），多了下次接着删。
async function pruneOld(env, { days = 30, keepVers = 5, max = 400 } = {}) {
  const keep = await recentVersions(env, keepVers);   // 最近 keepVers 个「大.次」桶
  const cutoff = Date.now() - days * 86400000;
  const notIn = keep.length ? ` AND ${keep.map(() => 'version NOT LIKE ?').join(' AND ')}` : '';   // 不在保留桶内
  const { results } = await env.DB.prepare(
    `SELECT id FROM scores WHERE created < ?${notIn} LIMIT ?`
  ).bind(cutoff, ...keep.map(m => m + '.%'), max).all();
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
    const mins = await recentVersions(env, Math.min(5, Math.max(1, +recent || 3)));   // 最近 n 个「大.次」桶
    if (mins.length) return { sql: ` AND (${mins.map(() => 'version LIKE ?').join(' OR ')})`, binds: mins.map(m => m + '.%'), versions: mins };
    return { sql: '', binds: [], versions: [] };
  }
  const version = url.searchParams.get('version');
  if (version) { const mk = minorKey(version); return { sql: ' AND version LIKE ?', binds: [mk + '.%'], versions: [mk] }; }   // 指定版本也按其大.次桶
  return { sql: '', binds: [], versions: null };
}

function quantileDesc(rows, pct) {
  if (!rows.length) return 0;
  const idx = Math.min(rows.length - 1, Math.max(0, Math.ceil(rows.length * pct) - 1));
  return rows[idx] ? rows[idx].turns | 0 : 0;
}
function thresholdScope({ agent = 'human', race = 'all', versionBucket = '', scopeKind = `recent${THRESH_RECENT}` }) {
  return `upload:${agent}:race=${race}:${scopeKind}${versionBucket ? `=${versionBucket}` : ''}`;
}
function thresholdKinds(recent = THRESH_RECENT) {
  return [`recent${recent}`];
}
async function computeThresholdSnapshot(env, { agent = 'human', race = 'all', versionBucket = '', scopeKind = `recent${THRESH_RECENT}`, recent = THRESH_RECENT, targetRace = race } = {}) {
  const versions = scopeKind === 'minor' ? (versionBucket ? [versionBucket] : []) : await recentVersions(env, recent);
  const whereParts = ["source='play'", 'verified>=0', 'agent=?', 'turns < 510'];
  const binds = [agent];
  if (race !== 'all') { whereParts.push('race=?'); binds.push(race); }
  if (versions.length) {
    whereParts.push(`(${versions.map(() => 'version LIKE ?').join(' OR ')})`);
    binds.push(...versions.map(v => v + '.%'));
  }
  const where = whereParts.join(' AND ');
  const { results } = await env.DB.prepare(`SELECT turns FROM scores WHERE ${where} ORDER BY turns DESC`).bind(...binds).all();
  const rows = (results || []).map(r => ({ turns: r.turns | 0 }));
  const total = rows.length;
  const top1Idx = total ? Math.min(total - 1, Math.max(0, Math.ceil(total * 0.01) - 1)) : 0;
  const top1Turns = total ? rows[top1Idx].turns : 0;
  const p30 = quantileDesc(rows, 0.30);
  return {
    scope: thresholdScope({ agent, race, versionBucket, scopeKind }),
    recent,
    agent,
    race,
    target_race: targetRace,
    version_bucket: versionBucket || '',
    requested_version_bucket: versionBucket || '',
    scope_kind: scopeKind,
    versions,
    total,
    upload_min_turns: Math.min(p30, THRESH_SURVIVAL_CAP),   // 动态门槛再高也不超过硬上限，避免历史脏数据长期卡死新样本
    top1_turns: top1Turns,
    p5: quantileDesc(rows, 0.05),
    p10: quantileDesc(rows, 0.10),
    p30,
    p50: quantileDesc(rows, 0.50),
    p70: quantileDesc(rows, 0.70),
    p90: quantileDesc(rows, 0.90),
    computed: Date.now(),
  };
}

async function storeThresholdSnapshot(env, snap) {
  await env.DB.prepare(`INSERT INTO score_thresholds(scope,recent,agent,race,target_race,version_bucket,requested_version_bucket,scope_kind,versions_json,total,upload_min_turns,top1_turns,p5,p10,p30,p50,p70,p90,computed)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(scope) DO UPDATE SET recent=excluded.recent, agent=excluded.agent, race=excluded.race, target_race=excluded.target_race,
      version_bucket=excluded.version_bucket, requested_version_bucket=excluded.requested_version_bucket, scope_kind=excluded.scope_kind,
      versions_json=excluded.versions_json, total=excluded.total, upload_min_turns=excluded.upload_min_turns, top1_turns=excluded.top1_turns,
      p5=excluded.p5, p10=excluded.p10, p30=excluded.p30, p50=excluded.p50, p70=excluded.p70, p90=excluded.p90, computed=excluded.computed`)
    .bind(
      snap.scope,
      snap.recent,
      snap.agent,
      snap.race,
      snap.target_race || snap.race,
      snap.version_bucket || '',
      snap.requested_version_bucket || snap.version_bucket || '',
      snap.scope_kind,
      JSON.stringify(snap.versions || []),
      snap.total,
      snap.upload_min_turns,
      snap.top1_turns,
      snap.p5,
      snap.p10,
      snap.p30,
      snap.p50,
      snap.p70,
      snap.p90,
      snap.computed
    ).run();
}

async function refreshThresholdSnapshot(env, recent = THRESH_RECENT, agent = 'human') {
  const versions = await recentVersions(env, recent);
  const snaps = [];
  for (const versionBucket of versions) {
    snaps.push(await computeThresholdSnapshot(env, { agent, race: 'all', versionBucket, scopeKind: 'minor', recent, targetRace: 'all' }));
    for (const race of PLAYABLE_RACES) snaps.push(await computeThresholdSnapshot(env, { agent, race, versionBucket, scopeKind: 'minor', recent, targetRace: race }));
  }
  for (const race of ['all', ...PLAYABLE_RACES]) snaps.push(await computeThresholdSnapshot(env, { agent, race, scopeKind: `recent${recent}`, recent, targetRace: race }));
  for (const snap of snaps) await storeThresholdSnapshot(env, snap);
  return { refreshed: snaps.length, versions, recent, agent };
}

async function insertClassificationEvent(env, ev) {
  const reasonsJson = ev.suspicion_reasons ? JSON.stringify(ev.suspicion_reasons) : '[]';
  await env.DB.prepare(`INSERT INTO classification_events(
      score_id, from_agent, to_agent, mode, reason, suspicion_score, suspicion_risk, suspicion_reasons_json,
      workflow_run_id, workflow_run_url, workflow_sha, created
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(
      ev.score_id,
      ev.from_agent,
      ev.to_agent,
      ev.mode,
      ev.reason || '',
      ev.suspicion_score == null ? null : (ev.suspicion_score | 0),
      ev.suspicion_risk || '',
      reasonsJson,
      ev.workflow_run_id || '',
      ev.workflow_run_url || '',
      ev.workflow_sha || '',
      Date.now()
    ).run();
}

async function classifyScore(env, { id, targetAgent, mode, reason, suspicionScore, suspicionRisk, suspicionReasons, workflowRunId, workflowRunUrl, workflowSha }) {
  const row = await env.DB.prepare("SELECT id, agent, verified FROM scores WHERE id=?").bind(id).first();
  if (!row) return { id, ok: false, status: 'missing' };
  if (targetAgent !== 'ai' && targetAgent !== 'human') return { id, ok: false, status: 'invalid-target' };
  if (row.agent === targetAgent) return { id, ok: true, status: 'already-target', agent: row.agent };
  if (mode === 'auto') {
    if (targetAgent !== 'ai') return { id, ok: false, status: 'auto-target-must-be-ai', agent: row.agent };
    if (row.agent !== 'human') return { id, ok: false, status: 'not-human', agent: row.agent };
    if ((row.verified | 0) !== 1) return { id, ok: false, status: 'not-verified', agent: row.agent };
  }
  await env.DB.prepare("UPDATE scores SET agent=? WHERE id=?").bind(targetAgent, id).run();
  await insertClassificationEvent(env, {
    score_id: id,
    from_agent: row.agent,
    to_agent: targetAgent,
    mode,
    reason,
    suspicion_score: suspicionScore,
    suspicion_risk: suspicionRisk,
    suspicion_reasons: suspicionReasons,
    workflow_run_id: workflowRunId,
    workflow_run_url: workflowRunUrl,
    workflow_sha: workflowSha,
  });
  return { id, ok: true, status: 'applied', from: row.agent, agent: targetAgent };
}

function normalizeThresholdRow(row) {
  if (!row) return { ...THRESH_DEFAULT };
  let versions = [];
  try { versions = JSON.parse(row.versions_json || '[]'); } catch (e) {}
  return {
    scope: row.scope,
    recent: row.recent | 0,
    agent: row.agent || 'human',
    race: row.race || 'all',
    target_race: row.target_race || row.race || 'all',
    version_bucket: row.version_bucket || '',
    requested_version_bucket: row.requested_version_bucket || row.version_bucket || '',
    scope_kind: row.scope_kind || `recent${THRESH_RECENT}`,
    versions,
    total: row.total | 0,
    upload_min_turns: row.upload_min_turns | 0,
    top1_turns: row.top1_turns | 0,
    p5: row.p5 | 0,
    p10: row.p10 | 0,
    p30: row.p30 | 0,
    p50: row.p50 | 0,
    p70: row.p70 | 0,
    p90: row.p90 | 0,
    computed: row.computed | 0,
  };
}
async function loadThresholdSnapshot(env, { agent = 'human', race = 'all', version = '', scope = null } = {}) {
  try {
    const versionBucket = minorKey(version || '');
    if (scope) {
      const row = await env.DB.prepare("SELECT scope,recent,agent,race,target_race,version_bucket,requested_version_bucket,scope_kind,versions_json,total,upload_min_turns,top1_turns,p5,p10,p30,p50,p70,p90,computed FROM score_thresholds WHERE scope=?").bind(scope).first();
      return normalizeThresholdRow(row);
    }
    const ladder = [
      thresholdScope({ agent, race, versionBucket, scopeKind: 'minor' }),
      thresholdScope({ agent, race, scopeKind: `recent${THRESH_RECENT}` }),
      thresholdScope({ agent, race: 'all', versionBucket, scopeKind: 'minor' }),
      thresholdScope({ agent, race: 'all', scopeKind: `recent${THRESH_RECENT}` }),
    ];
    let fallback = null;
    for (const key of ladder) {
      const row = await env.DB.prepare("SELECT scope,recent,agent,race,target_race,version_bucket,requested_version_bucket,scope_kind,versions_json,total,upload_min_turns,top1_turns,p5,p10,p30,p50,p70,p90,computed FROM score_thresholds WHERE scope=?").bind(key).first();
      const snap = normalizeThresholdRow(row);
      if (snap.scope === THRESH_DEFAULT.scope || snap.total <= 0) continue;
      fallback = { ...snap, target_race: race, requested_version_bucket: versionBucket };
      if (snap.total >= THRESH_MIN_SAMPLE) return fallback;
    }
    return fallback || { ...THRESH_DEFAULT, target_race: race, requested_version_bucket: versionBucket };
  } catch (e) {
    return { ...THRESH_DEFAULT, target_race: race, requested_version_bucket: minorKey(version || '') };
  }
}

// 该成绩是否进入「顶尖」（前 1%，且至少前 10 名）→ 值得即时验证
function isTopTier(rk) { const o = rk && rk.overall; return !!o && o.rank <= Math.max(10, Math.ceil(o.total * 0.01)); }
// 顶尖成绩即时验证：直接 ping 常驻验证服务的 /verify-now，让它立刻重放校验。
// 仅当验证器健康端点报告的 engineVersion 与本次成绩的精确 release 版本一致时才推，避免发版窗口里旧引擎误杀新成绩。
// 验证服务地址走 secret env.VERIFY_PUSH_URL（不写进仓库；可填 render 原址或 Cloudflare 代理子域）。
// 未设置时跳过推送——仍由 render 每 ~7s 轮询 + GitHub cron 兜底。
async function triggerVerify(env, runVersion) {
  if (!env.REC || !env.VERIFY_SECRET || !env.VERIFY_PUSH_URL || !runVersion) return;
  try {
    const base = env.VERIFY_PUSH_URL.replace(/\/$/, '');
    const status = await fetch(base, { headers: { 'User-Agent': 'dungeon-raid-worker' } });
    if (!status.ok) return;
    const info = await status.json();
    if (!info || info.engineVersion !== runVersion) return;         // render 还没切到同版本 → 留给轮询/cron 安全兜底
    if (await env.REC.get('vdispatch')) return;                     // 去抖：版本已匹配时才占 90s 窗口，避免旧引擎卡住后续真推送
    await env.REC.put('vdispatch', '1', { expirationTtl: 90 });
    await fetch(`${base}/verify-now?k=${encodeURIComponent(env.VERIFY_SECRET)}`, { headers: { 'User-Agent': 'dungeon-raid-worker' } });
  } catch (e) { /* 推送失败不影响成绩提交：render 轮询 + GitHub cron 兜底 */ }
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

    // POST /seed —— 发放一次性服务端种子 + token（上榜成绩须用它，防离线刷种子）+ 当前上传门槛快照。已被上方按 IP 限流。
    if (req.method === 'POST' && p === '/seed') {
      const seed = crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
      const token = shortId(16);
      const race = url.searchParams.get('race') || 'all';
      const version = url.searchParams.get('version') || '';
      const threshold = await loadThresholdSnapshot(env, { agent: 'human', race, version });
      if (env.REC) await env.REC.put('seed:' + token, JSON.stringify({ s: seed, u: 0, dbg: 0, gate: threshold }), { expirationTtl: SEED_TTL });
      return json({ seed, token, threshold, debug_bypass: false });
    }

    // POST /seed-debug?k= —— 调试专用 seed：允许绕过上传门槛，但仍复用正常 token / 排名 / 验证链。
    if (req.method === 'POST' && p === '/seed-debug') {
      if (url.searchParams.get('k') !== env.DEBUG_SEED_SECRET) return json({ error: 'forbidden' }, 403);
      const seed = crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
      const token = shortId(16);
      const race = url.searchParams.get('race') || 'all';
      const version = url.searchParams.get('version') || '';
      const threshold = await loadThresholdSnapshot(env, { agent: 'human', race, version });
      if (env.REC) await env.REC.put('seed:' + token, JSON.stringify({ s: seed, u: 0, dbg: 1, gate: threshold }), { expirationTtl: SEED_TTL });
      return json({ seed, token, threshold, debug_bypass: true });
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
      // 但阈值必须封顶到终局可达范围，否则榜首一高就会把门槛推到 510+ 之外。
      try {
        const topRow = await env.DB.prepare("SELECT MAX(turns) m FROM scores WHERE source='play' AND verified>=0").first();
        const top = (topRow && topRow.m) || 0;
        const shareThreshold = Math.min(Math.max(top * SHARE_VERIFY_FACTOR, top + 30), SHARE_VERIFY_TURN_CAP - 1);
        if (turns > shareThreshold) {
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
      const race = d.rec.race, version = d.rec.ver || '';
      let threshold = tok.gate || null;
      const thresholdBucket = threshold && threshold.requested_version_bucket ? threshold.requested_version_bucket : minorKey(version);
      if (!threshold || threshold.target_race !== race || thresholdBucket !== minorKey(version)) threshold = await loadThresholdSnapshot(env, { agent: 'human', race, version });
      if (!tok.dbg && threshold.upload_min_turns > 0 && turns < threshold.upload_min_turns) return json({ error: 'below upload threshold', threshold, turns }, 422);
      const level = d.level | 0, gold = d.gold | 0;
      const agent = d.agent === 'ai' ? 'ai' : 'human';   // 自报，非 'ai' 一律按人类
      const name = subName(d, agent);   // 玩家展示名（alias）；AI 无名则随机起名
      const id = shortId();
      await env.REC.put(id, JSON.stringify(d.rec));
      await env.DB.prepare("INSERT INTO scores(id,version,race,turns,level,gold,source,agent,name,verified,created) VALUES(?,?,?,?,?,?,'play',?,?,0,?)")
        .bind(id, version, race, turns, level, gold, agent, name, Date.now()).run();
      const rk = await ranking(env, version, race, turns, agent);
      if (isTopTier(rk) && ctx) ctx.waitUntil(triggerVerify(env, version));   // 顶尖成绩：仅当 render 已切到同 release 版本时才即时推送，不阻塞响应
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
      const race = d.rec.race, version = d.rec.ver || '';
      let threshold = tok.gate || null;
      const thresholdBucket = threshold && threshold.requested_version_bucket ? threshold.requested_version_bucket : minorKey(version);
      if (!threshold || threshold.target_race !== race || thresholdBucket !== minorKey(version)) threshold = await loadThresholdSnapshot(env, { agent: 'human', race, version });
      if (!tok.dbg && threshold.upload_min_turns > 0 && turns < threshold.upload_min_turns) return json({ error: 'below upload threshold', threshold, turns }, 422);
      const level = d.level | 0;
      const agent = d.agent === 'ai' ? 'ai' : 'human';   // 自报，非 'ai' 一律按人类
      const name = subName(d, agent);
      const id = shortId();
      await env.REC.put(id, JSON.stringify(d.rec));
      await env.DB.prepare("INSERT INTO scores(id,version,race,turns,level,gold,source,cleared,agent,name,verified,created) VALUES(?,?,?,?,?,0,'play',1,?,?,0,?)")
        .bind(id, version, race, turns, level, agent, name, Date.now()).run();
      const rk = await clearRanking(env, version, race, level, agent);
      if (isTopTier(rk) && ctx) ctx.waitUntil(triggerVerify(env, version));   // 顶尖破关：仅当 render 已切到同 release 版本时才即时推送，不阻塞响应
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

    // POST /classify?k= —— 私有黑盒改判某条成绩的 agent（human↔ai）。仅管理密钥可调。
    if (req.method === 'POST' && p === '/classify') {
      if (url.searchParams.get('k') !== env.ADMIN_SECRET) return json({ error: 'forbidden' }, 403);
      let d; try { d = JSON.parse(await req.text()); } catch { return json({ error: 'invalid json' }, 400); }
      if (!d || !d.id || (d.agent !== 'ai' && d.agent !== 'human')) return json({ error: 'invalid' }, 400);
      const result = await classifyScore(env, {
        id: d.id,
        targetAgent: d.agent,
        mode: 'manual',
        reason: d.reason || 'manual classify',
      });
      const statusCode = result.ok ? 200 : result.status === 'missing' ? 404 : 400;
      return json(result, statusCode);
    }

    // POST /classify-auto?k= —— GitHub Actions 自动把高可疑度人类榜成绩单向改判到 AI 榜。
    if (req.method === 'POST' && p === '/classify-auto') {
      const autoSecret = req.headers.get('x-classify-automation-secret') || url.searchParams.get('k');
      if (autoSecret !== env.CLASSIFY_AUTOMATION_SECRET) return json({ error: 'forbidden' }, 403);
      let d; try { d = JSON.parse(await req.text()); } catch { return json({ error: 'invalid json' }, 400); }
      const candidates = d && Array.isArray(d.candidates) ? d.candidates : null;
      if (!candidates || !candidates.length) return json({ error: 'invalid candidates' }, 400);
      if (candidates.length > AUTO_CLASSIFY_BATCH_MAX) return json({ error: `too many candidates (max ${AUTO_CLASSIFY_BATCH_MAX})` }, 400);
      const dryRun = !!(d && d.dryRun);
      const meta = d && typeof d.meta === 'object' && d.meta ? d.meta : {};
      const results = [];
      for (const c of candidates) {
        if (!c || !c.id) { results.push({ id: null, ok: false, status: 'invalid-candidate' }); continue; }
        if (dryRun) {
          const row = await env.DB.prepare("SELECT id, agent, verified FROM scores WHERE id=?").bind(c.id).first();
          if (!row) { results.push({ id: c.id, ok: false, status: 'missing' }); continue; }
          if (row.agent === 'ai') { results.push({ id: c.id, ok: true, status: 'already-target', agent: row.agent }); continue; }
          if (row.agent !== 'human') { results.push({ id: c.id, ok: false, status: 'not-human', agent: row.agent }); continue; }
          if ((row.verified | 0) !== 1) { results.push({ id: c.id, ok: false, status: 'not-verified', agent: row.agent }); continue; }
          results.push({ id: c.id, ok: true, status: 'would-apply', from: row.agent, agent: 'ai' });
          continue;
        }
        results.push(await classifyScore(env, {
          id: c.id,
          targetAgent: 'ai',
          mode: 'auto',
          reason: c.reason || 'auto suspicion classify',
          suspicionScore: c.score,
          suspicionRisk: c.risk,
          suspicionReasons: c.reasons,
          workflowRunId: meta.runId || '',
          workflowRunUrl: meta.runUrl || '',
          workflowSha: meta.sha || '',
        }));
      }
      const summary = {
        applied: results.filter(r => r.status === 'applied').length,
        wouldApply: results.filter(r => r.status === 'would-apply').length,
        alreadyTarget: results.filter(r => r.status === 'already-target').length,
        missing: results.filter(r => r.status === 'missing').length,
        notVerified: results.filter(r => r.status === 'not-verified').length,
        notHuman: results.filter(r => r.status === 'not-human').length,
        invalidCandidate: results.filter(r => r.status === 'invalid-candidate').length,
      };
      return json({ ok: true, dryRun, count: candidates.length, results, summary });
    }

    // POST /admin?k= —— 管理删除（仅管理密钥）：删单条 {op:'del',id}，或清空全部 {op:'wipe',confirm:'YES'}
    if (req.method === 'POST' && p === '/admin') {
      if (url.searchParams.get('k') !== env.ADMIN_SECRET) return json({ error: 'forbidden' }, 403);
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

  // 定时任务：刷新上传门槛快照 + 每日清理旧版本+陈旧录像（默认保留最近 5 版、删 30 天前的，单次≤400 条）
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshThresholdSnapshot(env).then(r => console.log('threshold', JSON.stringify(r))).catch(e => console.log('threshold_err', e && e.message ? e.message : String(e))));
    ctx.waitUntil(pruneOld(env, {}).then(r => console.log('prune', JSON.stringify(r))));
  },
};
