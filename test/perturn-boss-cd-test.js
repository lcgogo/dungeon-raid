const fs = require('fs');
const file = fs.existsSync('dungeon-raid-dev.html') ? 'dungeon-raid-dev.html' : '../dungeon-raid-dev.html';
let s=fs.readFileSync(file,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPORT=`globalThis.__G={startGame,raceById,advanceEnemies,
  get grid(){return grid}, get player(){return player}, set replaying(v){replaying=v}, set replayRec(v){replayRec=v}, set headless(v){headless=v}};`;
s=s.replace('resize(); showClassSelect(); loop();',EXPORT);
const h={get(t,p){
  if(p==='style')return t._s||(t._s={});
  if(p==='dataset')return t._d||(t._d={});
  if(p==='classList')return{add(){},remove(){},toggle(){}};
  if(p==='getContext')return()=>new Proxy({},{get:()=>()=>{},set:()=>true});
  if(['addEventListener','appendChild','setAttribute','focus','click'].includes(p))return()=>{};
  if(p==='querySelector')return()=>new Proxy({},h);
  if(p==='querySelectorAll')return()=>[];
  if(p==='getBoundingClientRect')return()=>({left:0,top:0,width:420,height:420});
  if(['width','height','clientWidth','clientHeight'].includes(p))return 420;
  return t[p];
},set(t,p,v){t[p]=v;return true;}};
const mk=()=>new Proxy({},h);
new Function('document','window','localStorage','requestAnimationFrame','location','navigator','fetch','URLSearchParams',s)(
  {getElementById:mk,createElement:mk,querySelector:mk,querySelectorAll:()=>[],addEventListener(){},body:mk()},
  {addEventListener(){},requestAnimationFrame:()=>0},{getItem(){return null},setItem(){},removeItem(){}},()=>0,
  {search:''},{language:'zh'},()=>{},URLSearchParams);
const G=globalThis.__G;
function setup(race){
  G.replayRec={seed:812,race,acts:[]}; G.replaying=true; G.startGame(G.raceById(race)); G.replaying=false; G.headless=true;
  const p=G.player; p.hp=p.maxHp=100; p.armor=0;
  for(let r=0;r<6;r++)for(let c=0;c<6;c++)G.grid[r][c]=null;
  G.grid[0][0]={type:'boss',bossId:'birdman',tier:1,hp:100,maxHp:100,atk:4,cd:3,baseCd:3};
  return p;
}
function assert(ok,msg){if(!ok)throw new Error(msg);console.log('PASS '+msg);}

{
  const p=setup('undead'), t=G.grid[0][0];
  G.advanceEnemies();
  assert(p.hp===100&&t.turnCd===1,'Undead delays a per-turn Boss on the first turn');
  G.advanceEnemies();
  assert(p.hp===98&&t.turnCd===2,'Undead per-turn Boss acts every second turn');
}
{
  const p=setup('human'), t=G.grid[0][0];
  G.advanceEnemies();
  assert(p.hp===98&&t.turnCd===1,'Other races keep per-turn Boss actions every turn');
}
