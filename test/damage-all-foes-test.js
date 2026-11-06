// Compare shared all-foe damage against the released v1.94.2 engine.
const assert = require('assert');
const fs = require('fs');

function loadEngine(file){
  let s=fs.readFileSync(file,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const damageExport=s.includes('function damageAllFoes(')?'damageAllFoes,':'';
  const EXPORT=`globalThis.__D={startGame,raceById,TIER1,SHOP,${damageExport}
    get grid(){return grid}, get player(){return player}, get logHistory(){return logHistory},
    get rngState(){return __rngState}, set replaying(v){replaying=v}, set replayRec(v){replayRec=v}, set headless(v){headless=v}};`;
  if(!s.includes('resize(); showClassSelect(); loop();')) throw new Error('startup marker missing: '+file);
  s=s.replace('resize(); showClassSelect(); loop();',EXPORT);
  const handler={get(t,p){
    if(p==='style') return t._s||(t._s={});
    if(p==='dataset') return t._d||(t._d={});
    if(p==='classList') return {add(){},remove(){},toggle(){}};
    if(p==='getContext') return ()=>new Proxy({},{get:()=>()=>{},set:()=>true});
    if(['addEventListener','appendChild','setAttribute','focus','click'].includes(p)) return ()=>{};
    if(p==='querySelector') return ()=>new Proxy({},handler);
    if(p==='querySelectorAll') return ()=>[];
    if(p==='getBoundingClientRect') return ()=>({left:0,top:0,width:420,height:420});
    if(['width','height','clientWidth','clientHeight'].includes(p)) return 420;
    return t[p];
  },set(t,p,v){t[p]=v;return true;}};
  const mk=()=>new Proxy({},handler);
  new Function('document','window','localStorage','requestAnimationFrame','location','navigator','fetch','URLSearchParams',s)(
    {getElementById:mk,createElement:mk,querySelector:mk,querySelectorAll:()=>[],addEventListener(){},body:mk()},
    {addEventListener(){},requestAnimationFrame:()=>0},
    {getItem(){return null},setItem(){},removeItem(){}},()=>0,
    {search:'',hostname:'test',origin:'http://test',pathname:'/'},{language:'en'},()=>{},URLSearchParams);
  return globalThis.__D;
}

function run(file,effect){
  const G=loadEngine(file);
  G.replayRec={seed:92741,race:'human',acts:[]}; G.replaying=true; G.startGame(G.raceById('human')); G.replaying=false; G.headless=true;
  const p=G.player;
  Object.assign(p,{turns:20,level:20,xp:0,gold:210,hp:700,maxHp:1000,swordFlat:7,gunpowder:2,
    shadowBombGold:true,demolitionist:true,rotflesh:true,lifesteal:1,killXp:0});
  const cells=[[0,0,3,'enemy'],[1,2,7,'enemy'],[2,3,8,'enemy'],[4,1,26,'enemy'],[5,5,50,'enemy'],[0,5,6,'boss','statue'],[5,0,2,'boss','overlord',true]];
  for(let r=0;r<6;r++)for(let c=0;c<6;c++) G.grid[r][c]=null;
  for(const [r,c,hp,type='enemy',bossId,finale=false] of cells) G.grid[r][c]={type,bossId,finale,hp,maxHp:hp,tier:1,atk:1,cd:3,baseCd:3};
  p.hp=700;
  if(effect==='bomb') G.SHOP.bomb.f();
  else G.TIER1.lich.skill.f(p);
  return JSON.stringify({player:p,grid:G.grid,logs:G.logHistory,rng:G.rngState});
}

const baseline='engines/v1.94.2.html';
for(const effect of ['bomb','frostNova']){
  assert.strictEqual(run('dungeon-raid-dev.html',effect),run(baseline,effect),effect+' changed released-engine state');
  console.log(effect+' parity PASS');
}

function matryoshkaEngine(){
  const G=loadEngine('dungeon-raid-dev.html');
  G.replayRec={seed:227,race:'human',acts:[]}; G.replaying=true; G.startGame(G.raceById('human')); G.replaying=false; G.headless=true;
  for(let r=0;r<6;r++)for(let c=0;c<6;c++) G.grid[r][c]=null;
  G.player.gold=0; G.player.xp=0;
  return G;
}
function matryoshka(tier,id,hp){ return {type:'boss',bossId:'matryoshka',matryoshkaId:id,tier,hp,maxHp:hp,atk:1,cd:3,baseCd:3}; }

{
  const G=matryoshkaEngine(), p=G.player;
  G.grid[0][0]=matryoshka(8,1,3); G.grid[0][1]=matryoshka(1,1,30);
  G.damageAllFoes(5,{matryoshkaBomb:true});
  assert.strictEqual(G.grid[0][0],null,'bomb should remove the hit branch without splitting');
  assert.strictEqual(G.grid[0][1].tier,1,'other branch should remain alive');
  assert.strictEqual(p.gold,0,'partial lineage must not award boss gold');
  G.damageAllFoes(99,{matryoshkaBomb:true});
  assert.strictEqual(G.grid[0][1],null,'bomb should remove the remaining branch');
  assert.strictEqual(p.gold,20,'the final branch should award exactly one boss reward');
  assert.strictEqual(p.xp,15,'the final branch should award boss XP once');
  console.log('Matryoshka bomb-branch completion PASS');
}

{
  const G=matryoshkaEngine(), p=G.player;
  G.grid[0][0]=matryoshka(2,4,1);
  G.damageAllFoes(99,{snapshot:true});
  const children=G.grid.flat().filter(t=>t&&t.bossId==='matryoshka');
  assert.strictEqual(children.length,2,'non-bomb kill should split into two children');
  assert(children.every(t=>t.tier===1&&t.matryoshkaId===4),'split children should retain tier and lineage');
  assert.strictEqual(p.gold,0,'unresolved split children must not award boss gold');
  G.damageAllFoes(99,{snapshot:true});
  assert.strictEqual(p.gold,20,'reward should be granted when the last child is eliminated');
  assert.strictEqual(p.xp,15,'the lineage should award boss XP only once');
  console.log('Matryoshka full-lineage reward PASS');
}
