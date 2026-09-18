#!/usr/bin/env node
// Bundle source-owned content into the self-contained dev HTML.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'dungeon-raid-dev.html');
const configPath = path.join(root, 'src', 'config.js');
const contentPath = path.join(root, 'src', 'content.js');
const engineDir = path.join(root, 'src', 'engine');
const html = fs.readFileSync(htmlPath, 'utf8');
const config = fs.readFileSync(configPath, 'utf8').trim();
const content = fs.readFileSync(contentPath, 'utf8').trim();
const changelogPath = path.join(root, 'CHANGELOG.md');
const engineFiles = fs.readdirSync(engineDir).filter(f => f.endsWith('.js')).sort();
if (!engineFiles.length) throw new Error(`no engine modules found in ${engineDir}`);
const engine = engineFiles.map(f => fs.readFileSync(path.join(engineDir, f), 'utf8')).join('\n');
const start = '/* CONTENT_BUNDLE_START */';
const end = '/* CONTENT_BUNDLE_END */';
const bundle = `${start}\n${config}\n\n${content}\n${end}`;
const engineStart = engine.indexOf(start);
const engineEnd = engine.indexOf(end, engineStart + start.length);
if (engineStart < 0 || engineEnd < 0) throw new Error(`missing ${start}/${end} markers in ${engineDir}`);
const bundledEngine = engine.slice(0, engineStart) + bundle + engine.slice(engineEnd + end.length);
const changelog = fs.readFileSync(changelogPath, 'utf8');
const changelogEntries = [];
let currentVersion = null;
let bullets = [];
const flushChangelog = () => {
  if(!currentVersion || !bullets.length) return;
  changelogEntries.push({
    ver: currentVersion,
    zh: bullets[0].replace(/\*\*/g, ''),
    en: (bullets[1] || bullets[0]).replace(/\*\*/g, ''),
  });
};
for(const line of changelog.split(/\r?\n/)){
  const heading = line.match(/^##\s*\[(v[\d.]+)\]/);
  if(heading){ flushChangelog(); currentVersion=heading[1]; bullets=[]; continue; }
  if(currentVersion){
    const bullet = line.match(/^\s*-\s+(.+?)\s*$/);
    if(bullet && bullets.length<2) bullets.push(bullet[1]);
  }
}
flushChangelog();
const changelogLiteral = `const CHANGELOG_LINES=${JSON.stringify(changelogEntries.slice(0, 5))};   /* generated from CHANGELOG.md */`;
const withChangelog = bundledEngine.replace(/^const CHANGELOG_LINES=.*$/m, changelogLiteral);
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>', scriptStart);
if (scriptStart < 0 || scriptEnd < 0) throw new Error(`missing script shell in ${htmlPath}`);
if(withChangelog === bundledEngine) throw new Error('missing CHANGELOG_LINES placeholder in engine bundle');
const next = html.slice(0, scriptStart) + `<script>\n${withChangelog}</script>` + html.slice(scriptEnd + '</script>'.length);
fs.writeFileSync(htmlPath, next);
console.log(`built ${path.relative(root, htmlPath)} from ${engineFiles.length} engine modules + data modules`);
