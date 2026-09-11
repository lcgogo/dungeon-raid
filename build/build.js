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
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>', scriptStart);
if (scriptStart < 0 || scriptEnd < 0) throw new Error(`missing script shell in ${htmlPath}`);
const next = html.slice(0, scriptStart) + `<script>\n${bundledEngine}</script>` + html.slice(scriptEnd + '</script>'.length);
fs.writeFileSync(htmlPath, next);
console.log(`built ${path.relative(root, htmlPath)} from ${engineFiles.length} engine modules + data modules`);
