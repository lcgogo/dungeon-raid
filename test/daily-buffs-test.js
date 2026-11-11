const fs=require('fs');
const path=require('path');
const file=fs.existsSync('dungeon-raid-dev.html')?'dungeon-raid-dev.html':path.join('..','dungeon-raid-dev.html');
let s=fs.readFileSync(file,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPORT=`globalThis.__G={startGame,raceById,TIER1,dealDamage,dailyBlessing,dailyBlessingSummary,dailyMultiplier,healingMultiplier,extraFoeCd,effSkillCd,addXp,gainHeal,vampGain,burnTickDamage,firewallTickDamage,bombDamage,bombShopSummary,buyItem,resolve,
  get player(){return player},get grid(){return grid},get replayRec(){return replayRec},set replaying(v){replaying=v},set replayRec(v){replayRec=v},set selection(v){selection=v},set pendingLevels(v){pendingLevels=v},set busy(v){busy=v},set headless(v){headless=v}};`;
s=s.replace('resize(); showClassSelect(); loop();',EXPORT);
const h={get(t,p){
  if(p==='style')return t._s||(t._s={});
  if(p==='dataset')return t._d||(t._d={});
  if(p==='classList')return{add(){},remove(){},toggle(){}};
  if(p==='getContext')return()=>new Proxy({},{get:()=>()=>{},set:()=>true});
  if(['addEventListener','appendChild','setAttribute','focus','click'].includes(p))return()=>{};
  if(p==='querySelector')return()=>new Proxy({},h);
  if(p==='querySelectorAll')return[];
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
let fails=0;
function ok(c,m){console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;}
function start(day,race='human'){
  G.replayRec={seed:1907,race,weekday:day,acts:[]}; G.replaying=true; G.startGame(G.raceById(race)); G.replaying=false; G.headless=true;
  G.busy=false; G.pendingLevels=0; return G.player;
}
function clearBoard(){for(let r=0;r<6;r++)for(let c=0;c<6;c++)G.grid[r][c]=null;}

for(let d=0;d<7;d++){
  const p=start(d);
  ok(p.weekday===d&&G.replayRec.weekday===d,`weekday ${d} is fixed on player and recording`);
  ok(G.dailyBlessing(p).id===['war','night','wisdom','earth','sun','storm','steam'][d],`weekday ${d} maps to its blessing`);
}
{
  const p=start(0); clearBoard(); G.grid[0][0]={type:'enemy',hp:100,maxHp:100};
  const r=G.dealDamage(5,[{r:0,c:0,type:'sword'}]);
  ok(r.dmg===10,'War God doubles weapon damage');
}
{
  const p=start(1);
  ok(G.extraFoeCd()===1,'Goddess of Night adds one foe countdown');
}
{
  const p=start(2);
  ok(G.addXp(p,3)===6&&p.xp===6,'Knowledge and Wisdom doubles XP');
  ok(G.effSkillCd('knight')===4,'Knowledge and Wisdom reduces active cooldown by one');
}
{
  const p=start(3); p.hp=10; p.maxHp=50;
  ok(G.gainHeal(3)===6&&p.hp===16,'Earth Mother doubles direct healing');
  p.hp=10;
  ok(G.vampGain(3)===6&&p.hp===16,'Earth Mother doubles lifesteal and drain healing');
  const undead=start(3,'undead'); undead.hp=10;
  ok(G.gainHeal(3)===3&&undead.hp===13,'Earth Mother and Undead healing penalty combine');
}
{
  const p=start(4); p.swordFlat=5;
  ok(G.burnTickDamage({burnStacks:1})===2&&G.firewallTickDamage()===2,'Eternal Sun doubles burn and Firewall damage');
}
{
  const p=start(5); clearBoard();
  G.grid[0][0]={type:'shield'}; G.grid[0][1]={type:'shield'};
  G.selection=[{r:0,c:0,type:'shield'},{r:0,c:1,type:'shield'}];
  G.resolve();
  ok(p.armor===1&&p.shieldXp===1,'Lord of Storms doubles linked shield progress');
  ok(p.armorPerShield===2,'Lord of Storms doubles Forge shield value');
  p.armor=0; p.shieldXp=0; clearBoard(); G.grid[0][0]={type:'shield'}; G.grid[0][1]={type:'shield'};
  G.TIER1.blacksmith.skill.f(p);
  ok(p.armor===1&&p.shieldXp===1,'Lord of Storms doubles shields consumed by Forge');
}
{
  const p=start(6); p.gunpowder=1;
  ok(G.bombDamage(p)===12,'Steam and Machinery doubles bomb damage including powder');
  ok(G.bombShopSummary(p).includes('伤害 12（火药+2）'),'bomb tile shows doubled powder contribution');
  p.gold=125; p.shadowBombGold=true; p.shopCd={bomb:0}; clearBoard();
  const target=G.grid[0][0]={type:'enemy',hp:80,maxHp:80};
  G.buyItem('bomb');
  ok(target.hp===30,'Steam and Machinery doubles the bomb total including All-In');
}
{
  const src=fs.readFileSync(path.join(path.dirname(file),'src/engine/15-upgrades.js'),'utf8');
  ok(src.includes('${dailyReport}'),'death settlement includes the run daily blessing');
}
console.log(fails?`\n${fails} daily blessing checks failed`:'\nAll daily blessing checks passed');
process.exit(fails?1:0);
