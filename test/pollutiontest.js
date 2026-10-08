// 回归：无 act() 的 perTurn Boss（污染怪）不能在回合结算时中断补子。
const fs = require('fs');
const file = fs.existsSync('dungeon-raid-dev.html') ? 'dungeon-raid-dev.html' : '../dungeon-raid-dev.html';
let s = fs.readFileSync(file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPORT = `globalThis.__G={startGame,raceById,resolve,applyGravity,advanceEnemies,syncPositions,
  get grid(){return grid}, get player(){return player}, set selection(v){selection=v},
  get busy(){return busy}, set busy(v){busy=v}, set replaying(v){replaying=v}, set replayRec(v){replayRec=v}};`;
s = s.replace('resize(); showClassSelect(); loop();', EXPORT);
const elH={get(t,p){if(p==='style')return t._s||(t._s={});if(p==='dataset')return t._d||(t._d={});if(p==='classList')return{add(){},remove(){},toggle(){}};if(p==='getContext')return()=>new Proxy({},{get:()=>()=>{},set:()=>true});if(['addEventListener','appendChild','setAttribute','focus','click'].includes(p))return()=>{};if(p==='querySelector')return()=>new Proxy({},elH);if(p==='querySelectorAll')return()=>[];if(p==='getBoundingClientRect')return()=>({left:0,top:0,width:420,height:420});if(['width','height','clientWidth','clientHeight'].includes(p))return 420;return t[p];},set(t,p,v){t[p]=v;return true;}};
const mk=()=>new Proxy({},elH);
new Function('document','window','localStorage','requestAnimationFrame','location','navigator','fetch','URLSearchParams',s)(
  {getElementById:mk,createElement:mk,querySelector:mk,querySelectorAll:()=>[],addEventListener(){},body:mk()},
  {addEventListener(){},requestAnimationFrame:()=>0},{getItem(){return null},setItem(){},removeItem(){}},()=>0,
  {search:''},{language:'zh'},()=>{},URLSearchParams);
const G=globalThis.__G;
G.replayRec={seed:42,race:'orc',acts:[]}; G.replaying=true; G.startGame(G.raceById('orc')); G.replaying=false;
const p=G.player;
const pollution={type:'boss',bossId:'pollution',tier:1,hp:999,maxHp:999,atk:0,cd:1,baseCd:1};
G.grid[0][0]=pollution;
const before=G.grid.flat().filter(Boolean).length;
G.selection=[{r:0,c:1,type:G.grid[0][1].type},{r:0,c:2,type:G.grid[0][2].type}];
G.resolve();
const after=G.grid.flat().filter(Boolean).length;
if(p.turns!==1 || after!==36) throw new Error(`pollution turn did not settle: turns=${p.turns}, tiles=${after}, before=${before}`);
console.log('✅ pollution perTurn regression passed');
