'use strict';

const fs = require('fs');

function die(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function usage() {
  die('用法: node version-gate.js [<fromVer> <toVer> <patch|verify>]');
}

function readVersion(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/const VERSION='(v\d+\.\d+\.\d+)'/);
  if (!m) die(`${file} 里找不到 const VERSION='v主.次.修'`);
  return m[1];
}

function parseVersion(ver) {
  const m = /^v(\d+)\.(\d+)\.(\d+)$/.exec(String(ver || ''));
  if (!m) die(`非法版本号：${ver}（应为 v主.次.修）`);
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function cmpVersion(a, b) {
  const A = parseVersion(a), B = parseVersion(b);
  if (A.major !== B.major) return A.major - B.major;
  if (A.minor !== B.minor) return A.minor - B.minor;
  return A.patch - B.patch;
}

function sameMinor(a, b) {
  const A = parseVersion(a), B = parseVersion(b);
  return A.major === B.major && A.minor === B.minor;
}

function readChangelogSection(ver) {
  const lines = fs.readFileSync('CHANGELOG.md', 'utf8').split(/\r?\n/);
  let seen = false;
  const section = [];
  for (const line of lines) {
    if (/^## \[/.test(line)) {
      if (seen) break;
      if (line.startsWith(`## [${ver}]`)) { seen = true; continue; }
    }
    if (seen) section.push(line);
  }
  if (!seen) die(`CHANGELOG.md 缺少 ${ver} 对应版本节`);
  return section;
}

function normalizeImpact(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v || v === 'patch') return 'patch';
  if (v === 'verify') return 'verify';
  die(`非法 impact：${raw}（只支持 patch 或 verify）`);
}

function detectImpact(ver) {
  const section = readChangelogSection(ver);
  return section.some(line => /^>\s*Version-Impact:\s*verify\s*$/i.test(line)) ? 'verify' : 'patch';
}

function validate(fromVer, toVer, impact, sourceLabel) {
  if (cmpVersion(toVer, fromVer) <= 0) {
    die(`待发版版本号必须高于当前正式版：${fromVer} → ${toVer}`);
  }
  if (impact === 'verify' && sameMinor(fromVer, toVer)) {
    die(`检测到 ${sourceLabel} 为 verify：${fromVer} → ${toVer} 不能只升修订号，至少要升次版本`);
  }
  console.log(`✅ 版本闸门通过：${fromVer} → ${toVer}（impact=${impact}，来源=${sourceLabel}）`);
}

(function main(argv) {
  if (argv.length !== 0 && argv.length !== 3) usage();
  if (argv.length === 3) {
    const [fromVer, toVer, rawImpact] = argv;
    validate(fromVer, toVer, normalizeImpact(rawImpact), 'CLI');
    return;
  }
  const fromVer = readVersion('dungeon-raid.html');
  const toVer = readVersion('dungeon-raid-dev.html');
  const impact = detectImpact(toVer);
  validate(fromVer, toVer, impact, impact === 'verify' ? 'CHANGELOG.md > Version-Impact: verify' : 'CHANGELOG.md 默认 patch');
})(process.argv.slice(2));
