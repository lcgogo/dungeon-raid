// Regression: Magmafiend melts at most one shield per tier, deterministically.
const fs = require('fs');
const s0 = fs.readFileSync('dungeon-raid-dev.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPORT = `globalThis.__M={startGame,raceById,BOSSES,get grid(){return grid},get player(){return player},set replaying(v){replaying=v},set replayRec(v){replayRec=v},set headless(v){headless=v}};`;
const s=s0.replace('resize(); showClassSelect(); loop();',EXPORT);
const elH={get(t,p){if(p==='style')return t._s||(t._s={});if(p==='dataset')return t._d||(t._d={});if(p==='classList')return{add(){},remove(){},toggle(){}};if(p==='getContext')return()=>new Proxy({},{get:()=>()=>{},set:()=>true});if(['addEventListener','appendChild','setAttribute','focus','click'].includes(p))return()=>{};if(p==='querySelector')return()=>new Proxy({},elH);if(p==='querySelectorAll')return[];if(['width','height','clientWidth','clientHeight'].includes(p))return 420;return t[p];},set(t,p,v){t[p]=v;return true;}};
const mk=()=>new Proxy({},elH);
new Function('document','window','localStorage','requestAnimationFrame','location','navigator','fetch','URLSearchParams',s)(
  {getElementById:mk,createElement:mk,querySelector:mk,querySelectorAll:()=>[],addEventListener(){},body:mk()},
  {addEventListener(){},requestAnimationFrame:()=>0},{getItem(){return null},setItem(){},removeItem(){}},()=>0,
  {search:'',hostname:'test',origin:'http://test',pathname:'/'},{language:'en'},()=>{},URLSearchParams);
const G=globalThis.__M, act=G.BOSSES.find(b=>b.id==='magmafiend').act;
for(const [tier,initial,expected] of [[1,6,5],[2,6,4],[3,6,3],[3,2,0]]){
  G.replayRec={seed:8100+tier*10+initial,race:'human',acts:[]}; G.replaying=true; G.startGame(G.raceById('human')); G.replaying=false; G.headless=true;
  const p=G.player; p.noArmor=true;
  for(let r=0;r<6;r++)for(let c=0;c<6;c++) G.grid[r][c]={type:'sword'};
  for(let i=0;i<initial;i++) G.grid[0][i]={type:'shield'};
  const boss={type:'boss',bossId:'magmafiend',tier,hp:99,maxHp:99,atk:0,cd:1,baseCd:1};
  G.grid[5][5]=boss;
  act(boss);
  const left=G.grid.flat().filter(t=>t&&t.type==='shield').length;
  if(left!==expected) throw new Error(`Lv${tier} with ${initial} shields: expected ${expected} remaining, got ${left}`);
  if(boss.hp!==99) throw new Error(`Lv${tier} shield melting healed Magmafiend`);
}
console.log('✅ magmafiend tier shield regression passed');
