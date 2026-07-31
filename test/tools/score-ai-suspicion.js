'use strict';

const fs = require('fs');
const path = require('path');
const { resolveEnginePath, API } = require('../../verify.js');

function parseArgs(argv) {
  const opts = {
    json: false,
    top: 20,
    minScore: 0,
    idsFile: null,
    files: [],
    boardFetch: false,
    board: 'top',
    boardN: 50,
    agent: 'human',
    race: null,
    version: null,
    recent: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--top') opts.top = +(argv[++i] || opts.top);
    else if (a.startsWith('--top=')) opts.top = +(a.split('=')[1] || opts.top);
    else if (a === '--min-score') opts.minScore = +(argv[++i] || opts.minScore);
    else if (a.startsWith('--min-score=')) opts.minScore = +(a.split('=')[1] || opts.minScore);
    else if (a === '--ids') opts.idsFile = argv[++i] || null;
    else if (a.startsWith('--ids=')) opts.idsFile = a.split('=')[1] || null;
    else if (a === '--top-human') { opts.boardFetch = true; opts.agent = 'human'; opts.boardN = +(argv[++i] || opts.boardN); }
    else if (a.startsWith('--top-human=')) { opts.boardFetch = true; opts.agent = 'human'; opts.boardN = +(a.split('=')[1] || opts.boardN); }
    else if (a === '--top-ai') { opts.boardFetch = true; opts.agent = 'ai'; opts.boardN = +(argv[++i] || opts.boardN); }
    else if (a.startsWith('--top-ai=')) { opts.boardFetch = true; opts.agent = 'ai'; opts.boardN = +(a.split('=')[1] || opts.boardN); }
    else if (a === '--board') opts.board = argv[++i] || opts.board;
    else if (a.startsWith('--board=')) opts.board = a.split('=')[1] || opts.board;
    else if (a === '--race') opts.race = argv[++i] || null;
    else if (a.startsWith('--race=')) opts.race = a.split('=')[1] || null;
    else if (a === '--version') opts.version = argv[++i] || null;
    else if (a.startsWith('--version=')) opts.version = a.split('=')[1] || null;
    else if (a === '--recent') opts.recent = +(argv[++i] || 0) || null;
    else if (a.startsWith('--recent=')) opts.recent = +(a.split('=')[1] || 0) || null;
    else opts.files.push(a);
  }
  return opts;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function loadRecordingById(id) {
  const res = await fetch(`${API}/rec/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for rec/${id}`);
  return await res.json();
}

async function loadBoardIds(opts) {
  const route = opts.board === 'clearboard' ? 'clearboard' : 'top';
  const qs = new URLSearchParams();
  qs.set('agent', opts.agent || 'human');
  qs.set('n', String(opts.boardN || 50));
  if (opts.race) qs.set('race', opts.race);
  if (opts.version) qs.set('version', opts.version);
  if (opts.recent) qs.set('recent', String(opts.recent));

  const url = `${API}/${route}?${qs.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const json = await res.json();
  const rows = route === 'clearboard' ? (json.clears || []) : (json.top || []);
  return rows.map(r => r.id).filter(Boolean);
}

async function loadRecordings(opts) {
  const out = [];

  for (const f of opts.files) {
    try {
      const rec = readJson(f);
      out.push({ id: rec.id || null, source: f, rec });
    } catch (e) {
      out.push({ id: null, source: f, error: e.message });
    }
  }

  if (opts.idsFile) {
    const ids = fs.readFileSync(opts.idsFile, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const id of ids) {
      try {
        const rec = await loadRecordingById(id);
        out.push({ id, source: 'api-ids', rec });
      } catch (e) {
        out.push({ id, source: 'api-ids', error: e.message });
      }
    }
  }

  if (opts.boardFetch) {
    const ids = await loadBoardIds(opts);
    for (const id of ids) {
      try {
        const rec = await loadRecordingById(id);
        out.push({ id, source: `board:${opts.board}:${opts.agent}`, rec });
      } catch (e) {
        out.push({ id, source: `board:${opts.board}:${opts.agent}`, error: e.message });
      }
    }
  }

  return out;
}

function loadAnalysisEngine(version) {
  const file = resolveEnginePath(version || '');
  const fullPath = path.isAbsolute(file) ? file : path.join(__dirname, file);
  const html = fs.readFileSync(fullPath, 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`cannot find <script> in ${fullPath}`);
  const script = m[1];

  const EXPORT = `
globalThis.__A = {
  VERSION,
  startGame,
  raceById,
  dispatchReplayAct,
  bossDef,
  isSwordTarget,
  get player(){ return player; },
  get grid(){ return grid; },
  get replaying(){ return replaying; },
  set replaying(v){ replaying = v; },
  get replayRec(){ return replayRec; },
  set replayRec(v){ replayRec = v; },
  srand,
  rnd
};`;

  if (!script.includes('resize(); showClassSelect(); loop();')) throw new Error('startup line not found in ' + fullPath);
  const src = script.replace('resize(); showClassSelect(); loop();', EXPORT);

  const elH = {
    get(t, p) {
      if (p === 'style') return t._s || (t._s = {});
      if (p === 'dataset') return t._d || (t._d = {});
      if (p === 'classList') return { add() {}, remove() {}, toggle() {} };
      if (p === 'getContext') return () => new Proxy({}, { get: () => () => {}, set: () => true });
      if (['addEventListener', 'appendChild', 'setAttribute', 'focus', 'click', 'remove'].includes(p)) return () => {};
      if (p === 'querySelector') return () => new Proxy({}, elH);
      if (p === 'querySelectorAll') return () => [];
      if (p === 'getBoundingClientRect') return () => ({ left: 0, top: 0, width: 420, height: 420 });
      if (['width', 'height', 'clientWidth', 'clientHeight'].includes(p)) return 420;
      return t[p];
    },
    set(t, p, v) { t[p] = v; return true; }
  };

  const mk = () => new Proxy({}, elH);
  const document = {
    getElementById: mk,
    createElement: mk,
    querySelector: mk,
    querySelectorAll: () => [],
    addEventListener() {},
    body: mk(),
  };

  new Function('document', 'window', 'localStorage', 'requestAnimationFrame', 'location', 'navigator', 'fetch', 'URLSearchParams', src)(
    document,
    { addEventListener() {}, requestAnimationFrame: () => 0 },
    { getItem() { return null; }, setItem() {}, removeItem() {} },
    () => 0,
    { search: '', hostname: 'verify', origin: 'http://verify', pathname: '/' },
    { language: 'en' },
    () => {},
    URLSearchParams
  );

  return globalThis.__A;
}

function mean(arr) { return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0; }
function median(arr) {
  if (!arr.length) return 0;
  const a = arr.slice().sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)];
}
function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map(x => (x - m) ** 2)));
}
function percentile(arr, p) {
  if (!arr.length) return 0;
  const a = arr.slice().sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor((a.length - 1) * p)));
  return a[idx];
}
function rateAtMost(arr, limit) {
  return arr.length ? arr.filter(x => x <= limit).length / arr.length : 0;
}

function allTimedActs(rec) { return (rec.acts || []).filter(a => Array.isArray(a) && typeof a[a.length - 1] === 'number'); }
function moveActs(rec) { return (rec.acts || []).filter(a => Array.isArray(a) && a[0] === 'm'); }
function deltasFromActs(acts) {
  const ts = acts.map(a => a[a.length - 1]).filter(n => typeof n === 'number');
  const ds = [];
  for (let i = 1; i < ts.length; i++) ds.push(ts[i] - ts[i - 1]);
  return ds;
}

function boardCounts(grid) {
  let enemyCount = 0, bossCount = 0;
  let swordCount = 0, heartCount = 0, coinCount = 0, shieldCount = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const t = grid[r][c];
      if (!t) continue;
      if (t.type === 'enemy') enemyCount++;
      else if (t.type === 'boss' && !t.finale) bossCount++;
      else if (t.type === 'sword') swordCount++;
      else if (t.type === 'heart') heartCount++;
      else if (t.type === 'coin') coinCount++;
      else if (t.type === 'shield') shieldCount++;
    }
  }
  return { enemyCount, bossCount, swordCount, heartCount, coinCount, shieldCount };
}

function extractTimingMetrics(rec) {
  const acts = allTimedActs(rec);
  const deltas = deltasFromActs(acts);
  const moves = moveActs(rec);
  const moveLens = moves.map(a => Array.isArray(a[1]) ? a[1].length : 0);

  const meanDt = mean(deltas), medianDt = median(deltas), stdDt = stddev(deltas);
  const cv = meanDt > 0 ? stdDt / meanDt : 0;
  const sub20Rate = rateAtMost(deltas, 20);
  const sub50Rate = rateAtMost(deltas, 50);
  const sub100Rate = rateAtMost(deltas, 100);

  const seg1 = deltas.slice(0, Math.floor(deltas.length / 3));
  const seg2 = deltas.slice(Math.floor(deltas.length / 3), Math.floor(deltas.length * 2 / 3));
  const seg3 = deltas.slice(Math.floor(deltas.length * 2 / 3));
  const segs = [seg1, seg2, seg3].filter(s => s.length);

  const segMedians = segs.map(median);
  const segCvs = segs.map(s => {
    const m = mean(s);
    return m > 0 ? stddev(s) / m : 0;
  });

  const maxMedian = segMedians.length ? Math.max(...segMedians) : 0;
  const minMedian = segMedians.length ? Math.min(...segMedians) : 0;
  const maxMedianGap = medianDt > 0 ? (maxMedian - minMedian) / medianDt : 0;
  const lateEarlyRatio = segMedians.length === 3 && segMedians[0] > 0 ? segMedians[2] / segMedians[0] : 1;

  return {
    actCount: acts.length,
    moveCount: moves.length,
    meanDt,
    medianDt,
    stdDt,
    cv,
    p10: percentile(deltas, 0.10),
    p90: percentile(deltas, 0.90),
    sub20Rate,
    sub50Rate,
    sub100Rate,
    lateEarlyRatio,
    maxMedianGap,
    segmentCvs: segCvs,
    meanChainLen: mean(moveLens),
    longChainRate: moveLens.length ? moveLens.filter(n => n >= 6).length / moveLens.length : 0,
  };
}

function replayWithContext(rec) {
  const G = loadAnalysisEngine(rec.ver || '');
  G.replayRec = rec;
  G.replaying = true;
  G.startGame(G.raceById(rec.race));

  const samples = [];
  let prevTs = null;

  for (let i = 0; i < rec.acts.length; i++) {
    const a = rec.acts[i];
    if (G.player.hp <= 0 || G.player.cleared) break;

    const ts = typeof a[a.length - 1] === 'number' ? a[a.length - 1] : null;
    const dt = prevTs == null || ts == null ? null : ts - prevTs;
    const counts = boardCounts(G.grid);

    samples.push({
      idx: i,
      kind: a[0],
      ts,
      dt,
      turn: G.player.turns,
      hp: G.player.hp,
      gold: G.player.gold,
      level: G.player.level,
      ...counts,
    });

    G.dispatchReplayAct(a);
    if (ts != null) prevTs = ts;
  }

  return {
    final: {
      turns: G.player.turns,
      hp: G.player.hp,
      gold: G.player.gold,
      level: G.player.level,
      cleared: !!G.player.cleared,
    },
    samples,
  };
}

function extractContextMetrics(samples) {
  const normal = [], boss = [], dense = [], decision = [];
  for (const s of samples) {
    if (typeof s.dt !== 'number') continue;
    if (s.kind === 'u' || s.kind === 't') { decision.push(s.dt); continue; }
    if (s.kind !== 'm') continue;
    if (s.bossCount > 0) boss.push(s.dt);
    else if (s.enemyCount >= 8) dense.push(s.dt);
    else normal.push(s.dt);
  }

  const normalMedian = median(normal);
  const decisionMedian = median(decision);
  const bossMedian = median(boss);
  const denseMedian = median(dense);

  return {
    normalCount: normal.length,
    decisionCount: decision.length,
    bossCount: boss.length,
    denseCount: dense.length,
    decisionPauseRatio: normalMedian > 0 && decisionMedian > 0 ? decisionMedian / normalMedian : null,
    bossPauseRatio: normalMedian > 0 && bossMedian > 0 ? bossMedian / normalMedian : null,
    densePauseRatio: normalMedian > 0 && denseMedian > 0 ? denseMedian / normalMedian : null,
  };
}

function scoreFromMetrics(m, c) {
  let score = 0;
  const reasons = [];
  const dr = c && c.decisionPauseRatio;
  const br = c && c.bossPauseRatio;
  const xr = c && c.densePauseRatio;
  const mechSignals = [dr, br, xr].filter(v => v != null && v <= 1.05).length;
  const coarseMechanical = m.moveCount > 180 && m.p10 === 0 && m.p90 <= 2 && m.longChainRate >= 0.70 && m.meanChainLen >= 7 && mechSignals >= 2;
  const inhumanMsTiming = m.moveCount >= 80 && m.medianDt <= 5 && m.p90 <= 20 && m.sub20Rate >= 0.80;
  const inhumanFastLongRun = m.moveCount >= 180 && m.meanDt < 100 && m.medianDt < 50 && m.sub100Rate >= 0.80;
  const inhumanFast = inhumanMsTiming || inhumanFastLongRun;

  if (inhumanMsTiming) {
    score += 85;
    reasons.push('整局毫秒级操作间隔，超过人类触屏能力');
  } else if (inhumanFastLongRun) {
    score += 70;
    reasons.push('长局操作间隔低于人类反应能力');
  }

  if (m.cv < 0.08) { score += 28; reasons.push('节奏极稳'); }
  else if (m.cv < 0.12) { score += 22; reasons.push('节奏很稳'); }
  else if (m.cv < 0.18) { score += 15; reasons.push('节奏偏稳'); }
  else if (m.cv < 0.25) { score += 8; }
  else if (m.cv < 0.35) { score += 4; }

  if (m.maxMedianGap < 0.05) { score += 10; reasons.push('前中后节奏几乎不变'); }
  else if (m.maxMedianGap < 0.08) { score += 7; }
  else if (m.maxMedianGap < 0.12) { score += 4; }

  const segCvGap = m.segmentCvs.length ? Math.max(...m.segmentCvs) - Math.min(...m.segmentCvs) : 1;
  if (segCvGap < 0.05) score += 5;
  else if (segCvGap < 0.08) score += 3;

  if (m.meanDt < 900 && m.cv < 0.12) { score += 5; reasons.push('又快又稳'); }
  if (m.meanDt < 750 && m.cv < 0.10) score += 3;

  if (m.longChainRate > 0.30 && m.meanChainLen >= 6.2 && m.cv < 0.12) {
    score += 7;
    reasons.push('长链高频且节奏稳定');
  } else if (m.longChainRate > 0.22 && m.meanChainLen >= 5.5 && m.cv < 0.14) {
    score += 4;
  }

  if (m.moveCount > 180 && m.lateEarlyRatio < 1.03) {
    score += 3;
    reasons.push('长局后期无明显疲劳');
  }

  if (c) {
    if (dr != null) {
      if (dr < 1.00) { score += 14; reasons.push('升级/转职几乎不停顿'); }
      else if (dr < 1.08) score += 10;
      else if (dr < 1.20) score += 6;
      else if (dr < 1.35) score += 3;
      else if (dr > 1.80) { score -= 10; reasons.push('关键节点明显停顿'); }
      else if (dr > 1.50) { score -= 6; reasons.push('关键节点有明显人类停顿'); }
    }
    if (br != null) {
      if (br < 1.00) { score += 10; reasons.push('Boss 局面不变慢'); }
      else if (br < 1.08) score += 6;
      else if (br < 1.20) score += 3;
    }
    if (xr != null) {
      if (xr < 0.95) { score += 10; reasons.push('高压局面仍保持机械节奏'); }
      else if (xr < 1.05) score += 6;
      else if (xr < 1.18) score += 3;
    }
  }

  if (coarseMechanical) {
    score += 36;
    reasons.push('离散时间戳下仍保持机械节奏');
  } else if (mechSignals >= 3 && m.longChainRate >= 0.65 && m.meanChainLen >= 7) {
    score += 8;
    reasons.push('多类局面都近乎不停顿');
  }

  if (m.cv > 0.35 && !coarseMechanical && !inhumanFast) { score -= 4; reasons.push('节奏波动较像真人'); }
  if (!inhumanFast) {
    if (m.lateEarlyRatio > 1.35) score -= 8;
    else if (m.lateEarlyRatio > 1.20) { score -= 5; reasons.push('后期明显变慢'); }
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  const risk = score >= 65 ? 'Very High' : score >= 45 ? 'High' : score >= 25 ? 'Medium' : 'Low';
  return { score, risk, reasons };
}

function analyzeRecording(item) {
  const rec = item.rec;
  const timing = extractTimingMetrics(rec);
  const replayCtx = replayWithContext(rec);
  const ctxMetrics = extractContextMetrics(replayCtx.samples);
  const verdict = scoreFromMetrics(timing, ctxMetrics);

  return {
    id: item.id || rec.id || null,
    source: item.source,
    ver: rec.ver || null,
    race: rec.race || null,
    turns: rec.turns || moveActs(rec).length,
    score: verdict.score,
    risk: verdict.risk,
    reasons: verdict.reasons,
    metrics: { ...timing, ...ctxMetrics },
  };
}

function pct(n) { return `${Math.round((n || 0) * 100)}%`; }
function formatMs(n) { return String(Math.round(n || 0)); }

function formatTable(results, top, minScore) {
  const rows = results.filter(r => !r.error && r.score >= minScore).slice().sort((a,b)=>b.score-a.score).slice(0, top);
  console.log('score  risk       turns  race     ver       mean  med   p90  <=20  cv     decR   bossR  source/id');
  console.log('-----  ---------  -----  -------  --------  ----  ----  ---  ----  -----  -----  -----  ----------------');
  for (const r of rows) {
    const decR = r.metrics.decisionPauseRatio == null ? '-' : r.metrics.decisionPauseRatio.toFixed(2);
    const bossR = r.metrics.bossPauseRatio == null ? '-' : r.metrics.bossPauseRatio.toFixed(2);
    console.log(
      String(r.score).padStart(5),
      r.risk.padEnd(9),
      String(r.turns).padStart(5),
      String(r.race || '-').padEnd(7),
      String(r.ver || '-').padEnd(8),
      formatMs(r.metrics.meanDt).padStart(4),
      formatMs(r.metrics.medianDt).padStart(4),
      formatMs(r.metrics.p90).padStart(3),
      pct(r.metrics.sub20Rate).padStart(4),
      r.metrics.cv.toFixed(3).padStart(5),
      String(decR).padStart(5),
      String(bossR).padStart(5),
      `${r.source}${r.id ? ':' + r.id : ''}`
    );
    if (r.reasons.length) console.log('      reasons:', r.reasons.join(' / '));
  }
}

function printSummary(results) {
  const bucket = { Low: 0, Medium: 0, High: 0, 'Very High': 0, ERR: 0 };
  for (const r of results) bucket[r.risk || 'ERR'] = (bucket[r.risk || 'ERR'] || 0) + 1;
  console.log('\nSummary:');
  for (const k of ['Low','Medium','High','Very High','ERR']) console.log(`  ${k.padEnd(10)} ${bucket[k] || 0}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const loaded = await loadRecordings(opts);
  if (!loaded.length) {
    console.error('No recordings loaded. Pass local files, --ids ids.txt, or --top-human/--top-ai.');
    process.exit(1);
  }

  const results = [];
  for (const item of loaded) {
    if (item.error) {
      results.push({ id: item.id || null, source: item.source, error: item.error, score: -1, risk: 'ERR' });
      continue;
    }
    try { results.push(analyzeRecording(item)); }
    catch (e) { results.push({ id: item.id || null, source: item.source, error: e.message, score: -1, risk: 'ERR' }); }
  }

  if (opts.json) console.log(JSON.stringify(results, null, 2));
  else {
    formatTable(results, opts.top, opts.minScore);
    printSummary(results);
  }
}

module.exports = {
  analyzeRecording,
  extractTimingMetrics,
  extractContextMetrics,
  scoreFromMetrics,
  loadRecordingById,
  loadRecordings,
};

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
