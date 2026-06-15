// 终局 Boss / 破关 烟测：强制跑到第 500 回合（无限血），验证终焉降临、10 波递增、最终 onClear 破关。
// 运行：node test/finaletest.js   （从仓库根或 worker 目录都行）
const fs = require('fs');
const path = require('path');
const file = fs.existsSync('dungeon-raid-dev.html') ? 'dungeon-raid-dev.html' : path.join('..', 'dungeon-raid-dev.html');
let s = fs.readFileSync(file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPORT = `globalThis.__G={startGame,raceById,resolve,applyGravity,syncPositions,
  get grid(){return grid}, get player(){return player}, set selection(v){selection=v},
  get pendingLevels(){return pendingLevels}, set pendingLevels(v){pendingLevels=v},
  set busy(v){busy=v}, set replaying(v){replaying=v}, set replayRec(v){replayRec=v}};`;
s = s.replace('resize(); showClassSelect(); loop();', EXPORT);
const elH={get(t,p){if(p==='style')return t._s||(t._s={});if(p==='dataset')return t._d||(t._d={});if(p==='classList')return{add(){},remove(){},toggle(){}};if(p==='getContext')return()=>new Proxy({},{get:()=>()=>{},set:()=>true});if(['addEventListener','appendChild','setAttribute','focus','click'].includes(p))return()=>{};if(p==='querySelector')return()=>new Proxy({},elH);if(p==='querySelectorAll')return()=>[];if(p==='getBoundingClientRect')return()=>({left:0,top:0,width:420,height:420});if(['width','height','clientWidth','clientHeight'].includes(p))return 420;return t[p];},set(t,p,v){t[p]=v;return true;}};
const mk=()=>new Proxy({},elH);
new Function('document','window','localStorage','requestAnimationFrame','location','navigator','fetch','URLSearchParams',s)(
  {getElementById:mk,createElement:mk,querySelector:mk,querySelectorAll:()=>[],addEventListener(){},body:mk()},
  {addEventListener(){},requestAnimationFrame:()=>0},{getItem(){return null},setItem(){},removeItem(){}},()=>0,
  {search:''},{language:'zh'},()=>{},URLSearchParams);
const G=globalThis.__G;
const ROWS=6,COLS=6,N8=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const CONN=['sword','shield','heart','coin'];
G.replayRec={seed:42,race:'human',acts:[]}; G.replaying=true; G.startGame(G.raceById('human')); G.replaying=false;
const p=G.player;
p.hp=p.maxHp=999999; p.turns=498;   // 无限血，快进到接近 500
function findMove(){const g=G.grid;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=g[r][c];if(!t||!CONN.includes(t.type))continue;for(const[dr,dc]of N8){const nr=r+dr,nc=c+dc;if(nr<0||nr>=ROWS||nc<0||nc>=COLS)continue;const u=g[nr][nc];if(u&&u.type===t.type)return[{r,c,type:t.type},{r:nr,c:nc,type:u.type}];}}return null;}
let finaleSeen=false, maxWave=0;
for(let i=0;i<60;i++){
  if(p.cleared){ break; }
  while(G.pendingLevels>0) G.pendingLevels=0;   // 测试里跳过升级弹窗
  G.busy=false; p.hp=999999;                     // 无限血撑过终焉
  // 模拟“完美玩家清场”：清掉非终焉的 Boss 再补牌，保持棋盘可玩
  const g=G.grid; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=g[r][c]; if(t&&t.type==='boss'&&!t.finale) g[r][c]=null; }
  G.applyGravity();
  const mv=findMove(); if(!mv){ console.log('无可行连线，停（回合'+p.turns+'）'); break; }
  G.selection=mv; G.resolve();
  if(p.finaleStarted) finaleSeen=true;
  if(typeof p.finaleWave==='number') maxWave=Math.max(maxWave,p.finaleWave);
}
console.log('终焉降临:', finaleSeen?'是':'否');
console.log('最高波次:', maxWave, '(应达到 10)');
console.log('破关 player.cleared:', !!p.cleared, '| 最终回合', p.turns, '| 等级', p.level);
console.log(finaleSeen && p.cleared ? '✅ 终局+破关 流程通过' : '❌ 未达成破关，检查逻辑');
