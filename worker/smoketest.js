// API 冒烟测试：POST 一个 40 回合分数 → 看百分位；再拉榜单。
// 运行：cd worker && node smoketest.js
const API = 'https://api.dungeonraid.win';
(async () => {
  // 先测连通
  try {
    const r = await fetch(API + '/');
    console.log('连通 GET / →', r.status, await r.text());
  } catch (e) {
    console.error('连不上 API:', e.message, '| cause:', e.cause && (e.cause.code || e.cause.message));
    console.error('（可能是本机 DNS 还没解析到 api.dungeonraid.win，或网络/代理问题）');
    process.exit(1);
  }
  const acts = [];
  for (let i = 0; i < 40; i++) acts.push(['m', [[0, 0], [0, 1]], 'coin']);
  const rec = { v: 1, seed: 1, ver: 'v1.10.0', race: 'human', acts };

  const sres = await fetch(API + '/score', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level: 5, gold: 99, rec }),
  });
  console.log('POST /score →', JSON.stringify(await sres.json()));

  const tres = await fetch(API + '/top?n=5');
  console.log('GET /top    →', JSON.stringify(await tres.json()));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
