// Regression test for the weapon-attackable Cyclops boss.
const fs = require('fs');
const file = fs.existsSync('dungeon-raid-dev.html') ? 'dungeon-raid-dev.html' : '../dungeon-raid-dev.html';
let s = fs.readFileSync(file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPORT = `globalThis.__G={startGame,raceById,advanceEnemies,
  get grid(){return grid}, set grid(v){grid=v}, get player(){return player}, set replaying(v){replaying=v}, set replayRec(v){replayRec=v}};`;
s = s.replace('resize(); showClassSelect(); loop();', EXPORT);
const elH={get(t,p){if(p==='style')return t._s||(t._s={});if(p==='dataset')return t._d||(t._d={});if(p==='classList')return{add(){},remove(){},toggle(){}};if(p==='getContext')return()=>new Proxy({},{get:()=>()=>{},set:()=>true});if(['addEventListener','appendChild','setAttribute','focus','click'].includes(p))return()=>{};if(p==='querySelector')return()=>new Proxy({},elH);if(p==='querySelectorAll')return()=>[];if(p==='getBoundingClientRect')return()=>({left:0,top:0,width:420,height:420});if(['width','height','clientWidth','clientHeight'].includes(p))return 420;return t[p];},set(t,p,v){t[p]=v;return true;}};
const mk=()=>new Proxy({},elH);
new Function('document','window','localStorage','requestAnimationFrame','location','navigator','fetch','URLSearchParams',s)(
  {getElementById:mk,createElement:mk,querySelector:mk,querySelectorAll:()=>[],addEventListener(){},body:mk()},
  {addEventListener(){},requestAnimationFrame:()=>0},{getItem(){return null},setItem(){},removeItem(){}},()=>0,
  {search:''},{language:'zh'},()=>{},URLSearchParams);
const G=globalThis.__G;
G.replayRec={seed:7,race:'human',acts:[]}; G.replaying=true; G.startGame(G.raceById('human')); G.replaying=false;
const p=G.player; p.hp=1000; p.maxHp=1000; p.armor=0;
const empty=()=>({type:'coin'});
const board=Array.from({length:6},()=>Array.from({length:6},empty));
const cyclops={type:'boss',bossId:'cyclops',tier:2,hp:100,maxHp:100,atk:0,cd:1,baseCd:1};
const low={type:'enemy',hp:10,maxHp:10,atk:1,cd:99,baseCd:99};
const highA={type:'enemy',hp:20,maxHp:20,atk:1,cd:99,baseCd:99};
const highB={type:'enemy',hp:20,maxHp:20,atk:1,cd:99,baseCd:99};
board[0][0]=cyclops; board[0][1]=low; board[0][2]=highA; board[0][3]=highB; G.grid=board;
G.advanceEnemies();
if(p.hp!==972) throw new Error(`expected Lv2 Cyclops damage 28, got HP ${p.hp}`);
if(board[0][1]!==low) throw new Error('Cyclops did not leave the lower-HP enemy alone');
if(board[0][2]===highA && board[0][3]===highB) throw new Error('Cyclops did not remove one highest-HP enemy');
if((p.dmgBy||{}).cyclops!==28) throw new Error(`missing Cyclops damage source: ${JSON.stringify(p.dmgBy)}`);
console.log('Cyclops regression passed');
