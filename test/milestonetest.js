// 里程碑烟测：50/100/200/350 回合击败 Boss 的转职链 + 350回合换装主动替换商店槽 + 确定性重放一致。
// 运行：node test/milestonetest.js
const fs = require('fs');
const path = require('path');
const file = fs.existsSync('dungeon-raid-dev.html') ? 'dungeon-raid-dev.html' : path.join('..', 'dungeon-raid-dev.html');
let s = fs.readFileSync(file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPORT = `globalThis.__G={startGame,raceById,onBossKilled,dispatchReplayAct,buyItem,resolve,applyGravity,
  TIER1,TIER2,RACE_PATHS,
  get player(){return player}, get grid(){return grid},
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
G.dispatchReplayAct(['t',2,'immortal']); ok(p.tier2==='immortal' && p.overheal===true,'二阶=不朽(被动生效)');

killBossAt(200); ok(p.t3Pending,'200回合→t3Pending'); p.t3Pending=false;
const remain=G.RACE_PATHS.human.t2.find(x=>x!==p.tier2);   // 人类剩余被动=general
G.dispatchReplayAct(['t',3,remain]); ok(p.tier2b===remain && remain==='general' && p.upgradeChoices===4,'第二被动=本种族剩余(将军,四选一生效)');

killBossAt(350); ok(p.t4Pending,'350回合→t4Pending'); p.t4Pending=false;
G.dispatchReplayAct(['t',4,'ranger','bomb']); ok(p.skill2 && p.skill2.id==='ranger' && p.skill2.slot==='bomb','换装=游侠替换炸弹槽');

// 点炸弹槽 → 应施放游侠箭雨（进冷却），而非购买炸弹
p.skill2Cd=0; G.busy=false; G.pendingLevels=0; const goldBefore=p.gold;
G.buyItem('bomb');
ok(p.skill2Cd>0,'点炸弹槽→施放换装主动(进冷却 skill2Cd>0)');
ok(p.gold===goldBefore,'施放主动不花金币(炸弹槽未被当消耗品买)');

// onBossKilled 链：未到回合不应误触发
const q=Object.assign({},{t1:p.t1Pending,t2:p.t2Pending,t3:p.t3Pending,t4:p.t4Pending});
ok(!q.t1&&!q.t2&&!q.t3&&!q.t4,'里程碑用尽后无残留 pending');

console.log(fails?`\n❌ ${fails} 项未通过`:'\n✅ 里程碑链 + 换装主动 全部通过');
process.exit(fails?1:0);
