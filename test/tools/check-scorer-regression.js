'use strict';

const fs = require('fs');
const path = require('path');
const { analyzeRecording } = require('./score-ai-suspicion.js');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_MANIFESTS = [
  path.join(ROOT, 'test', 'scorer-regression', 'scorer-regression-ai.json'),
  path.join(ROOT, 'test', 'scorer-regression', 'scorer-regression-human.json'),
];

function parseArgs(argv) {
  const opts = { json: false, manifests: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--manifest') opts.manifests.push(argv[++i]);
    else if (a.startsWith('--manifest=')) opts.manifests.push(a.split('=')[1]);
    else throw new Error(`Unknown arg: ${a}`);
  }
  if (!opts.manifests.length) opts.manifests = DEFAULT_MANIFESTS.slice();
  return opts;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadCases(manifestPath) {
  const absManifest = path.resolve(ROOT, manifestPath);
  const dir = path.dirname(absManifest);
  const rows = readJson(absManifest);
  if (!Array.isArray(rows)) throw new Error(`Manifest must be an array: ${manifestPath}`);
  return rows.map(row => {
    const file = path.resolve(dir, row.file);
    return {
      manifest: path.relative(ROOT, absManifest),
      ...row,
      file,
    };
  });
}

function evaluateCase(def) {
  const rec = readJson(def.file);
  const result = analyzeRecording({ id: def.id || rec.id || path.basename(def.file, '.json'), source: path.relative(ROOT, def.file), rec });
  const failures = [];
  if (def.minScore != null && result.score < def.minScore) failures.push(`expected score >= ${def.minScore}, got ${result.score}`);
  if (def.maxScore != null && result.score > def.maxScore) failures.push(`expected score <= ${def.maxScore}, got ${result.score}`);
  if (def.expectedRisk && result.risk !== def.expectedRisk) failures.push(`expected risk ${def.expectedRisk}, got ${result.risk}`);
  if (def.forbidRisk && result.risk === def.forbidRisk) failures.push(`forbid risk ${def.forbidRisk}, got ${result.risk}`);
  if (def.expectedReasonIncludes && !(result.reasons || []).some(r => r.includes(def.expectedReasonIncludes))) failures.push(`expected reason including ${def.expectedReasonIncludes}`);
  return {
    id: result.id,
    expectation: def.expectation || '',
    manifest: def.manifest,
    file: path.relative(ROOT, def.file),
    notes: def.notes || '',
    score: result.score,
    risk: result.risk,
    reasons: result.reasons,
    metrics: result.metrics,
    ok: failures.length === 0,
    failures,
  };
}

function summarize(results) {
  const summary = {
    total: results.length,
    passed: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    ai: { total: 0, passed: 0, failed: 0 },
    human: { total: 0, passed: 0, failed: 0 },
  };
  for (const r of results) {
    const bucket = r.expectation === 'ai' ? summary.ai : r.expectation === 'human' ? summary.human : null;
    if (!bucket) continue;
    bucket.total++;
    if (r.ok) bucket.passed++; else bucket.failed++;
  }
  return summary;
}

function printText(results, summary) {
  console.log('Scorer regression');
  console.log('=================');
  for (const r of results) {
    const mark = r.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${r.id} [${r.expectation}] score=${r.score} risk=${r.risk} file=${r.file}`);
    if (r.reasons && r.reasons.length) console.log(`  reasons: ${r.reasons.join(' / ')}`);
    if (r.failures.length) console.log(`  failures: ${r.failures.join(' ; ')}`);
  }
  console.log('\nSummary:');
  console.log(`  total  ${summary.total}`);
  console.log(`  passed ${summary.passed}`);
  console.log(`  failed ${summary.failed}`);
  console.log(`  ai     ${summary.ai.passed}/${summary.ai.total} passed`);
  console.log(`  human  ${summary.human.passed}/${summary.human.total} passed`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const defs = opts.manifests.flatMap(loadCases);
  const results = defs.map(evaluateCase);
  const summary = summarize(results);
  const out = { ok: summary.failed === 0, summary, results };
  if (opts.json) console.log(JSON.stringify(out, null, 2));
  else printText(results, summary);
  if (summary.failed) process.exit(1);
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
