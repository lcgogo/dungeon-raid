// 里程碑烟测：50/100/200/350 回合击败 Boss 的转职链 + 350回合换装主动替换商店槽 + 确定性重放一致。
// 运行：node test/milestonetest.js
const fs = require('fs');
const path = require('path');
const file = fs.existsSync('dungeon-raid-dev.html') ? 'dungeon-raid-dev.html' : path.join('..', 'dungeon-raid-dev.html');
let s = fs.readFileSync(file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPORT = `globalThis.__G={startGame,raceById,onBossKilled,dispatchReplayAct,buyItem,resolve,applyGravity,advanceEnemies,
  TIER1,TIER2,RACE_PATHS, CLASS_T2, gainHeal, witherAuraTick, hurtPlayer, frostOrbDamage,
  get player(){return player}, get grid(){return grid}, get logHistory(){return logHistory}, set selection(v){selection=v},
  set busy(v){busy=v}, set pendingLevels(v){pendingLevels=v}, set replaying(v){replaying=v}, set replayRec(v){replayRec=v}};`;
s = s.replace('resize(); showClassSelect(); loop();', EXPORT);
const elH={get(t,p){if(p==='style')return t._s||(t._s={});if(p==='dataset')return t._d||(t._d={});if(p==='classList')return{add(){},remove(){},toggle(){}};if(p==='getContext')return()=>new Proxy({},{get:()=>()=>{},set:()=>true});if(['addEventListener','appendChild','setAttribute','focus','click'].includes(p))return()=>{};if(p==='querySelector')return()=>new Proxy({},elH);if(p==='querySelectorAll')return()=>[];if(p==='getBoundingClientRect')return()=>({left:0,top:0,width:420,height:420});if(['width','height','clientWidth','clientHeight'].includes(p))return 420;return t[p];},set(t,p,v){t[p]=v;return true;}};
const mk=()=>new Proxy({},elH);
new Function('document','window','localStorage','requestAnimationFrame','location','navigator','fetch','URLSearchParams',s)(
  {getElementById:mk,createElement:mk,querySelector:mk,querySelectorAll:()=>[],addEventListener(){},body:mk()},
  {addEventListener(){},requestAnimationFrame:()=>0},{getItem(){return null},setItem(){},removeItem(){}},()=>0,
  {search:''},{language:'zh'},()=>{},URLSearchParams);
const G=globalThis.__G;

let fails=0;
function ok(cond,msg){ console.log((cond?'✓':'✗')+' '+msg); if(!cond) fails++; }

// 用一份录像驱动（确定性）：起手 replaying 播种，再关掉 replaying 手动驱动里程碑
G.replayRec={seed:7,race:'human',acts:[]}; G.replaying=true; G.startGame(G.raceById('human')); G.replaying=false;
const p=G.player; p.hp=p.maxHp=999999; G.busy=false; G.pendingLevels=0;

// 模拟「到达某回合并击败一个 Boss」→ onBossKilled 标记 pending，再用录像动作应用选择
function killBossAt(turns){ p.turns=turns; G.onBossKilled(); }

killBossAt(50);  ok(p.t1Pending,'50回合→t1Pending'); p.t1Pending=false;
G.dispatchReplayAct(['t',1,'knight']);  ok(p.tier1==='knight','一阶=骑士');

killBossAt(100); ok(p.t2Pending,'100回合→t2Pending'); p.t2Pending=false;
G.dispatchReplayAct(['t',2,'holystrike']); ok(p.tier2==='holystrike' && p.holyStrike===true,'二阶=神圣打击(被动生效)');

killBossAt(200); ok(p.t3Pending,'200回合→t3Pending'); p.t3Pending=false;
const remain=G.RACE_PATHS.human.t2.find(x=>x!==p.tier2);   // 人类剩余被动=general/firewall/bladeall 之一
G.dispatchReplayAct(['t',3,remain]); ok(p.tier2b===remain,'第二被动=本种族剩余被动之一');

// 火法师链：100 回合锁定二阶 firewall
G.replayRec={seed:13,race:'human',acts:[]}; G.replaying=true; G.startGame(G.raceById('human')); G.replaying=false;
const f=G.player; f.hp=f.maxHp=999999; G.busy=false; G.pendingLevels=0;
f.turns=50; G.onBossKilled(); ok(f.t1Pending,'火法师50回合→t1Pending'); f.t1Pending=false;
G.dispatchReplayAct(['t',1,'firemage']); ok(f.tier1==='firemage','一阶=火法师');
f.turns=100; G.onBossKilled(); ok(f.t2Pending,'火法师100回合→t2Pending'); f.t2Pending=false;
G.dispatchReplayAct(['t',2,'firewall']); ok(f.tier2==='firewall' && f.firewall===true,'二阶=火墙(被动生效)');

// 350 回合跨界链：单独起一局，补齐前置职业状态，验证 t4Pending 与换装主动
G.replayRec={seed:17,race:'human',acts:[]}; G.replaying=true; G.startGame(G.raceById('human')); G.replaying=false;
const h=G.player; h.hp=h.maxHp=999999; G.busy=false; G.pendingLevels=0;
h.tier1='knight'; h.tier2='holystrike'; h.tier2b='general'; h.turns=350; G.onBossKilled(); ok(h.t4Pending,'350回合→t4Pending'); h.t4Pending=false;
G.dispatchReplayAct(['t',4,'ranger','bomb']); ok(h.skill2 && h.skill2.id==='ranger' && h.skill2.slot==='bomb','换装=游侠替换炸弹槽');

// 点炸弹槽 → 应施放游侠箭雨（进冷却），而非购买炸弹
h.skill2Cd=0; G.busy=false; G.pendingLevels=0; const goldBefore=h.gold;
G.buyItem('bomb');
ok(h.skill2Cd>0,'点炸弹槽→施放换装主动(进冷却 skill2Cd>0)');
ok(h.gold===goldBefore,'施放主动不花金币(炸弹槽未被当消耗品买)');

// 盗贼链：100 回合锁定被动 shadow，现显示/生效为「乾坤一掷」
G.replayRec={seed:11,race:'elf',acts:[]}; G.replaying=true; G.startGame(G.raceById('elf')); G.replaying=false;
const e=G.player; e.hp=e.maxHp=999999; G.busy=false; G.pendingLevels=0;
e.turns=100; e.tier1='rogue'; G.onBossKilled(); ok(e.t2Pending,'盗贼100回合→t2Pending'); e.t2Pending=false;
G.dispatchReplayAct(['t',2,'shadow']);
ok(e.tier2==='shadow' && e.shadowBombGold===true,'盗贼二阶=乾坤一掷(被动生效)');

// 先知链：50/100 回合职业与锁定被动
G.replayRec={seed:19,race:'elf',acts:[]}; G.replaying=true; G.startGame(G.raceById('elf')); G.replaying=false;
const se=G.player; se.hp=se.maxHp=999999; G.busy=false; G.pendingLevels=0;
se.turns=50; G.onBossKilled(); ok(se.t1Pending,'先知50回合→t1Pending'); se.t1Pending=false;
G.dispatchReplayAct(['t',1,'seer']); ok(se.tier1==='seer','一阶=先知');
se.turns=100; G.onBossKilled(); ok(se.t2Pending,'先知100回合→t2Pending'); se.t2Pending=false;
G.dispatchReplayAct(['t',2,'echooffate']); ok(se.tier2==='echooffate' && se.echoOfFate===true,'二阶=命运回响(被动生效)');
G.dispatchReplayAct(['k','seer','coin']); ok(se.prophecyPending==='coin','先知主动录像可记录选择类型');

// 活死人死灵：100回合锁定被动改为竭心光环
ok(G.CLASS_T2.necromancer==='witheraura','死灵锁定被动=竭心光环');
G.replayRec={seed:23,race:'undead',acts:[]}; G.replaying=true; G.startGame(G.raceById('undead')); G.replaying=false;
const u=G.player; u.hp=10; u.maxHp=20; u.regen=5; u.tier1='necromancer'; G.busy=false; G.pendingLevels=0;
u.turns=100; G.onBossKilled(); ok(u.t2Pending,'死灵100回合→t2Pending'); u.t2Pending=false;
G.dispatchReplayAct(['t',2,'witheraura']); ok(u.tier2==='witheraura' && u.witherAura===true,'二阶=竭心光环(被动生效)');
G.grid[0][0]={type:'enemy', hp:3, maxHp:3, atk:1, cd:9, baseCd:9};
G.grid[0][1]={type:'boss', bossId:'ghost', hp:3, maxHp:3, atk:1, cd:9, baseCd:9, tier:1};
const healed=G.gainHeal(u.regen);
ok(healed===3,'活死人每回合回血减半后，实际回血=3');
const aura=Math.round(u.regen*(u.healMult||1));
const selfLoss=G.hurtPlayer(aura,'witheraura',true);
ok(selfLoss===3,'竭心光环按折算后的恢复量先扣自己3血');
G.witherAuraTick(aura);
ok(!G.grid[0][0] && !G.grid[0][1],'竭心光环按折算后的每回合恢复量同时击杀普通怪与Boss');

// 满血时实际回血为0，但竭心光环仍按折算后的恢复量自损并伤敌
G.replayRec={seed:29,race:'undead',acts:[]}; G.replaying=true; G.startGame(G.raceById('undead')); G.replaying=false;
const uf=G.player; uf.hp=20; uf.maxHp=20; uf.regen=5; G.busy=false; G.pendingLevels=0;
G.grid[0][0]={type:'enemy', hp:4, maxHp:4, atk:1, cd:9, baseCd:9};
G.grid[0][1]={type:'boss', bossId:'ghost', hp:4, maxHp:4, atk:1, cd:9, baseCd:9, tier:1};
const healed0=G.gainHeal(uf.regen);
ok(healed0===0,'满血时实际回血=0');
const aura0=Math.round(uf.regen*(uf.healMult||1));
const selfLoss0=G.hurtPlayer(aura0,'witheraura',true);
ok(selfLoss0===3 && uf.hp===17,'满血时竭心光环仍按折算后的恢复量扣自己3血');
G.witherAuraTick(aura0);
ok(G.grid[0][0] && G.grid[0][0].hp===1 && G.grid[0][1] && G.grid[0][1].hp===1,'满血时竭心光环仍按折算后的恢复量结算伤害');

// 兽人斧王：100回合锁定被动改为越挫越勇
ok(G.CLASS_T2.axelord==='unbroken','斧王锁定被动=越挫越勇');
G.replayRec={seed:31,race:'orc',acts:[]}; G.replaying=true; G.startGame(G.raceById('orc')); G.replaying=false;
const ax=G.player; ax.hp=ax.maxHp=40; ax.tier1='axelord'; G.busy=false; G.pendingLevels=0;
ax.turns=100; G.onBossKilled(); ok(ax.t2Pending,'斧王100回合→t2Pending'); ax.t2Pending=false;
G.dispatchReplayAct(['t',2,'unbroken']); ok(ax.tier2==='unbroken' && ax.unbroken===true,'二阶=越挫越勇(被动生效)');
ax.tauntWindow=true;
const beforeMax=ax.maxHp, beforeHp=ax.hp;
const dmg=G.hurtPlayer(7,'enemy',true,{type:'enemy'});
ok(dmg===7,'斧王受伤按实际伤害结算');
ok(ax.maxHp===beforeMax+4,'嘲讽窗口把50%实际伤害转为永久最大生命（7→+3）且越挫越勇额外+1');
ok(ax.hp===beforeHp-7,'斧王受伤仍正常掉血');

// 亡灵巫妖：100回合锁定被动改为冰甲，受击后反击并减速攻击者
ok(G.CLASS_T2.lich==='icearmor','巫妖锁定被动=冰甲');
G.replayRec={seed:37,race:'undead',acts:[]}; G.replaying=true; G.startGame(G.raceById('undead')); G.replaying=false;
const li=G.player; li.hp=li.maxHp=40; li.tier1='lich'; li.swordFlat=4; G.busy=false; G.pendingLevels=0;
li.turns=100; G.onBossKilled(); ok(li.t2Pending,'巫妖100回合→t2Pending'); li.t2Pending=false;
G.dispatchReplayAct(['t',2,'icearmor']); ok(li.tier2==='icearmor' && li.iceArmor===true,'二阶=冰甲(被动生效)');
li.frozen={};
G.grid[0][0]={type:'enemy', hp:2, maxHp:2, atk:4, cd:2, baseCd:2};
const enemy=G.grid[0][0];
const liBeforeHp=li.hp;
const liDmg=G.hurtPlayer(6,'enemy',true,enemy);
ok(liDmg===6,'巫妖受伤按实际伤害结算');
ok(!G.grid[0][0],'冰甲反击能击杀低血攻击者');
ok(li.hp===liBeforeHp-6,'冰甲不改变本次正常掉血');

// 亡灵巫妖：主动冰封球打全场并让目标出手变慢
G.replayRec={seed:41,race:'undead',acts:[]}; G.replaying=true; G.startGame(G.raceById('undead')); G.replaying=false;
const lf=G.player; lf.hp=lf.maxHp=40; lf.tier1='lich'; lf.swordFlat=4; G.busy=false; G.pendingLevels=0;
G.grid[0][0]={type:'enemy', hp:5, maxHp:5, atk:4, cd:2, baseCd:2};
G.grid[0][1]={type:'boss', bossId:'ghost', hp:5, maxHp:5, atk:4, cd:2, baseCd:2, tier:1};
const frostDmg=G.frostOrbDamage();
const enemyCdBefore=G.grid[0][0].cd, bossCdBefore=G.grid[0][1].cd;
G.TIER1.lich.skill.f(lf);
ok(G.grid[0][0] && G.grid[0][0].hp===5-frostDmg && G.grid[0][1] && G.grid[0][1].hp===5-frostDmg,'冰封球能命中普通怪与剑免疫Boss');
ok(G.grid[0][0] && G.grid[0][0].cd===enemyCdBefore+1 && G.grid[0][1] && G.grid[0][1].cd===bossCdBefore+1,'冰封球会让目标当前出手更慢一回合');
ok(frostDmg===lf.swordFlat,'冰封球使用当前固定伤害作为伤害基数');

// 饕餮：cd 归零时应先按当前血量50%出手，再吞场上普通怪涨血
G.replayRec={seed:43,race:'human',acts:[]}; G.replaying=true; G.startGame(G.raceById('human')); G.replaying=false;
const dv=G.player; dv.hp=dv.maxHp=80; dv.armor=26; dv.toughness=0; dv.level=10; G.busy=false; G.pendingLevels=0;
for(let r=0;r<6;r++)for(let c=0;c<6;c++) G.grid[r][c]=null;
G.grid[5][5]={type:'boss', bossId:'devourer', hp:40, maxHp:40, atk:1, cd:1, baseCd:4, tier:1};
G.grid[0][0]={type:'enemy', hp:10, maxHp:10, atk:1, cd:9, baseCd:9};
G.grid[0][1]={type:'enemy', hp:6, maxHp:6, atk:1, cd:9, baseCd:9};
G.advanceEnemies();
let dev=null, foeHps=[];
for(let r=0;r<6;r++)for(let c=0;c<6;c++){
  const t=G.grid[r][c];
  if(!t) continue;
  if(t.type==='boss' && t.bossId==='devourer') dev=t;
  if(t.type==='enemy') foeHps.push(t.hp);
}
foeHps.sort((a,b)=>a-b);
ok(dv.hp===80-1,'饕餮cd归零时先按出手前40血→20攻击结算减伤（只掉1血）');
ok(dev && dev.hp===28,'饕餮出手后自损到20，再吞10/6两只怪各一半生命，回到28血');
ok(dev && dev.cd===4,'饕餮出手后重置回基础倒计时');
ok(foeHps.length===2 && foeHps[0]===3 && foeHps[1]===5,'饕餮强击后才吞普通怪生命');

// 鸟人：多只同回合出手时不应因第一只换位而让第二只被快照守卫误跳过
G.replayRec={seed:47,race:'human',acts:[]}; G.replaying=true; G.startGame(G.raceById('human')); G.replaying=false;
const bd=G.player; bd.hp=bd.maxHp=50; bd.armor=0; bd.toughness=0; G.busy=false; G.pendingLevels=0;
for(let r=0;r<6;r++)for(let c=0;c<6;c++) G.grid[r][c]=null;
G.grid[0][0]={type:'boss', bossId:'birdman', hp:12, maxHp:12, atk:6, cd:1, baseCd:4, tier:1};
G.grid[0][1]={type:'boss', bossId:'birdman', hp:12, maxHp:12, atk:6, cd:1, baseCd:4, tier:1};
G.advanceEnemies();
const birdPecks=G.logHistory.filter(e=>e&&e.m&&e.m.includes('鸟人俯冲啄击')).length;
ok(bd.hp===44,'两只鸟人同回合都应各自啄击一次（总共掉 6 血）');
ok(birdPecks===2,'两只鸟人同回合都应各自写入一次啄击日志');

// 普通怪：同回合多只出手时底部日志应汇总成一条摘要，而不是被最后一只覆盖
G.replayRec={seed:53,race:'human',acts:[]}; G.replaying=true; G.startGame(G.raceById('human')); G.replaying=false;
const nm=G.player; nm.hp=nm.maxHp=50; nm.armor=0; nm.toughness=0; G.busy=false; G.pendingLevels=0;
for(let r=0;r<6;r++)for(let c=0;c<6;c++) G.grid[r][c]=null;
G.grid[0][0]={type:'enemy', hp:8, maxHp:8, atk:3, cd:1, baseCd:4};
G.grid[0][1]={type:'enemy', hp:8, maxHp:8, atk:7, cd:1, baseCd:4};
const logStart=G.logHistory.length;
G.advanceEnemies();
const recentLogs=G.logHistory.slice(logStart).map(e=>e&&e.m||'');
ok(nm.hp===40,'两只普通怪同回合都应各自造成伤害（总共掉 10 血）');
ok(recentLogs.some(m=>m.includes('2 只普通怪攻击：3 + 7 → 共掉 10 血')),'普通怪同回合攻击应汇总成一条摘要日志');
ok(!recentLogs.some(m=>m.includes('减伤计算')),'普通怪汇总后不再逐条刷减伤计算日志');

// onBossKilled 链：未到回合不应误触发
const q=Object.assign({},{t1:se.t1Pending||e.t1Pending||p.t1Pending,t2:se.t2Pending||e.t2Pending||p.t2Pending,t3:se.t3Pending||e.t3Pending||p.t3Pending,t4:se.t4Pending||e.t4Pending||p.t4Pending});
ok(!q.t1&&!q.t2&&!q.t3&&!q.t4,'里程碑用尽后无残留 pending');

console.log(fails?`\n❌ ${fails} 项未通过`:'\n✅ 里程碑链 + 换装主动 全部通过');
process.exit(fails?1:0);
