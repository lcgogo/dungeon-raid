// embed-changelog.js — 把 CHANGELOG.md 摘要注入 HTML 文件的 const CHANGELOG_LINES
// 用法：node embed-changelog.js [file1.html] [file2.html] ...
// 默认：embed-changelog.js dungeon-raid-dev.html

const fs = require('fs');
const path = require('path');

const files = process.argv.slice(1);
const targets = files.length > 0 ? files : ['dungeon-raid-dev.html'];

// 解析 CHANGELOG.md：提取 [vX.Y.Z]: description 行
let lines = [];
try {
  const cl = fs.readFileSync('CHANGELOG.md', 'utf8');
  const re = /^\[(v[\d.]+)\]:\s*(.+?)\s*$/gm;
  let m;
  while ((m = re.exec(cl)) !== null) {
    lines.push(m[1] + ' — ' + m[2]);
  }
} catch (e) {
  console.error('无法读取 CHANGELOG.md:', e.message);
  process.exit(1);
}
lines = lines.slice(0, 5);

const arr = 'const CHANGELOG_LINES=' + JSON.stringify(lines, null, 0) + ';  /* auto-injected by dr.ps1 embed-changelog */';
let n = 0;
for (const f of targets) {
  if (!fs.existsSync(f)) { console.warn('文件不存在，跳过:', f); continue; }
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/^const CHANGELOG_LINES=.*$/m, arr);
  fs.writeFileSync(f, s, 'utf8');
  n++;
}
console.log('📝 注入 ' + lines.length + ' 条更新摘要 → ' + n + ' 个文件');
