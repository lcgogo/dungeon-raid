'use strict';
// 常驻验证服务：把 verify.js 的「拉取待验证→确定性重放→回写」做成每隔几秒轮询一次，
// 这样当前正式版的成绩提交后最多 POLL_MS 就完成校验上榜（取代 GitHub Actions 半小时 cron 的延迟）。
//
// 云无关：只用 Node 标准库 + 全局 fetch（Node 18+），监听 $PORT。可部署到 render / railway / fly / heroku / 任意 VPS。
//   环境变量：VERIFY_SECRET（必填，与 Worker 一致）、API_BASE（默认 https://api.dungeonraid.win）、POLL_MS（默认 7000）、PORT（平台注入）
//   启动：node verify-server.js
const http = require('http');
const { loadEngine, verifyPending, integrityNote, API } = require('./verify.js');

const SECRET = process.env.VERIFY_SECRET;
if (!SECRET) { console.error('缺少 VERIFY_SECRET 环境变量，拒绝启动'); process.exit(1); }
const PORT = +process.env.PORT || 10000;
const POLL_MS = Math.max(2000, +process.env.POLL_MS || 7000);   // 最小 2s，避免打爆 API 写入限流

const G = loadEngine('dungeon-raid.html');
const VER = G.VERSION || '';
integrityNote(VER);
console.log(`🛡️ verify-server 引擎 ${VER} · API ${API} · 轮询 ${POLL_MS}ms`);

let last = { at: null, pass: 0, fail: 0, skip: 0, total: 0 };
let lastErr = null;
let busy = false;

// 立即验一轮（带忙碌保护，避免重叠）。轮询和 /verify-now 共用。
async function runVerify() {
  if (busy) return;
  busy = true;
  try {
    const r = await verifyPending(G, VER);
    if (r.total) { last = { at: new Date().toISOString(), ...r }; }
    lastErr = null;
  } catch (e) { lastErr = e.message; console.error('verify 出错：', e.message); }
  busy = false;
}

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  // 推送入口：Worker 收到顶尖成绩后打这里 → 立刻验一轮（密钥保护）
  if (u.pathname === '/verify-now') {
    if (u.searchParams.get('k') !== SECRET) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end('{"error":"forbidden"}'); return; }
    res.writeHead(202, { 'Content-Type': 'application/json' }); res.end('{"triggered":true}');
    runVerify();   // 不 await：立刻返回，后台验
    return;
  }
  // 健康/状态端点（也供免费档外部保活 ping、肉眼查看进度）
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ service: 'dungeon-raid-verify', engineVersion: VER, pollMs: POLL_MS, last, lastErr }));
}).listen(PORT, () => console.log(`🌐 健康端点 + /verify-now :${PORT}`));

// 轮询兜底（即便没人推送，也每 POLL_MS 自己捡一遍）
(function tick() { runVerify().finally(() => setTimeout(tick, POLL_MS)); })();
