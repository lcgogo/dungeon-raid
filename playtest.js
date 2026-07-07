'use strict';
// 无头玩法机器人：加载 dungeon-raid.html 里的真实脚本（桩件顶替 DOM），自动玩并统计平衡。
const fs = require('fs');

// ---------- 1) 取出真实脚本，并在 IIFE 末尾注入导出钩子 ----------
const HTML_FILE = process.argv.includes('--dev') ? 'dungeon-raid-dev.html' : 'dungeon-raid.html';   // --dev：用开发版跑（测未发布的平衡改动）
const html = fs.readFileSync(__dirname + '/' + HTML_FILE, 'utf8');
let script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const EXPORT = `globalThis.__G={RACES,RACE_PATHS,TIER1,TIER2,CLASS_T2,UPGRADES,BOSSES,startGame,resolve,buyItem,shopCost,SHOP,activateSkill,isSwordTarget,
  raceById, dispatchReplayAct, dmgSourceLabel, rollUpgradePool, applyUpgrade, recAct,
  get grid(){return grid}, set grid(v){grid=v},
  get player(){return player}, get rec(){return rec},
  set selection(v){selection=v},
  set replaying(v){replaying=v}, set replayRec(v){replayRec=v}, set headless(v){headless=v},
  get pendingLevels(){return pendingLevels}, set pendingLevels(v){pendingLevels=v},
  get busy(){return busy}, set busy(v){busy=v}};`;
if (!script.includes('resize(); showClassSelect(); loop();'))
  throw new Error('startup line not found — 文件结构变了');
script = script.replace('resize(); showClassSelect(); loop();', EXPORT);

// ---------- 2) DOM / canvas / localStorage 桩件 ----------
const fakeCtx = new Proxy({}, { get: () => () => {}, set: () => true });
const elHandler = {
  get(t, p) {
    if (p === 'style') return t._s || (t._s = {});
    if (p === 'dataset') return t._d || (t._d = {});
    if (p === 'classList') return { add(){}, remove(){}, toggle(){} };
    if (p === 'getContext') return () => fakeCtx;
    if (['addEventListener','removeEventListener','appendChild','removeChild','focus','setAttribute'].includes(p)) return () => {};
    if (p === 'querySelector') return () => makeEl();
    if (p === 'querySelectorAll') return () => [];
    if (p === 'getBoundingClientRect') return () => ({ left:0, top:0, width:420, height:420 });
    if (['width','height','clientWidth','clientHeight'].includes(p)) return 420;
    return t[p];
  },
  set(t, p, v) { t[p] = v; return true; },
};
function makeEl() { return new Proxy({}, elHandler); }
const document = { getElementById: makeEl, createElement: makeEl, querySelector: makeEl, querySelectorAll: () => [], addEventListener(){}, body: makeEl() };
const window = { addEventListener(){}, requestAnimationFrame: () => 0 };
const localStorage = { _m:{}, getItem(k){ return k in this._m ? this._m[k] : null; }, setItem(k,v){ this._m[k]=String(v); }, removeItem(k){ delete this._m[k]; } };
const requestAnimationFrame = () => 0;

// 用正则匹配并替换当前文件里的怪物数值（不依赖具体旧内容）
function variant(v){
  return s=>s
    .replace(/\n\s*hp: .*/,     '\n    hp: '+v.hp+',')
    .replace(/\n\s*atk: .*/,    '\n    atk: '+v.atk+',')
    .replace(/\n\s*baseCd: .*/, '\n    baseCd: '+v.cd+',')
    .replace(/function enemyChance\(\)\{[^}]*\}/, 'function enemyChance(){ return '+v.chance+'; }');
}
function loadGame(transform){
  const src = transform ? transform(script) : script;
  new Function('document','window','localStorage','requestAnimationFrame', src)
    (document, window, localStorage, requestAnimationFrame);
  return globalThis.__G;
}
let G = loadGame();

// ---------- 2.5) 命令行参数：可指定职业线 / Boss，便于和历史对比 ----------
//   node playtest.js --race=orc --t1=berserker --t2=titan --boss=zombie --enemy=C2 --games=40
const ARG = Object.fromEntries(process.argv.slice(2).map(s=>{ const m=s.match(/^--([^=]+)=?(.*)$/); return m?[m[1], m[2]]:[s,'']; }));
const COMPETITIVE = 'competitive' in ARG || 'submit-ai' in ARG || 'submit-human' in ARG;
const FOCUS = !!(ARG.race||ARG.boss||ARG.t1||ARG.t2||ARG.profile) || ('report' in ARG);
// 把指定 Boss 固定为唯一会刷的 Boss（原地裁剪 BOSSES，spawnBoss 闭包引用同一数组）
function applyBossFilter(g){
  if(!ARG.boss) return;
  const keep=g.BOSSES.filter(b=>b.id===ARG.boss);
  if(!keep.length){ console.error('未知 Boss id: '+ARG.boss+'（可选：'+g.BOSSES.map(b=>b.id).join(', ')+'）'); process.exit(1); }
  g.BOSSES.length=0; keep.forEach(b=>g.BOSSES.push(b));
}

// ---------- 2.6) 回放真实录像：node playtest.js --replay=<录像.json> ----------
// 用游戏自带的确定性回放逻辑（dispatchReplayAct）跑一份人类录像，输出结局，便于分析真实玩法。
if(ARG.replay){
  const rec=JSON.parse(fs.readFileSync(ARG.replay,'utf8'));
  if(!rec||!Array.isArray(rec.acts)||typeof rec.seed!=='number'){ console.error('录像无效（需含 seed/race/acts）'); process.exit(1); }
  G.replayRec=rec; G.replaying=true;
  G.startGame(G.raceById(rec.race));   // replaying=true → 用 rec.seed 播种
  G.busy=false;
  let done=0;
  for(const a of rec.acts){ if(G.player.hp<=0) break; try{ G.dispatchReplayAct(a); }catch(e){ console.error('回放在第'+done+'步出错: '+e.message); break; } done++; }
  const p=G.player;
  const db=p.dmgBy||{}; let src=null,mx=0; for(const k in db){ if(db[k]>mx){mx=db[k];src=k;} }
  const counts={}; rec.acts.forEach(a=>counts[a[0]]=(counts[a[0]]||0)+1);
  console.log('=== 录像回放 '+ARG.replay+' ===');
  console.log('种族:', rec.race, '| 种子:', rec.seed, '| 动作数:', rec.acts.length, '(已执行 '+done+')');
  console.log('动作分布: 连线 '+(counts.m||0)+' / 购买 '+(counts.b||0)+' / 技能 '+(counts.k||0)+' / 升级 '+(counts.u||0)+' / 转职 '+(counts.t||0));
  console.log('结局: 等级 '+p.level+' · 回合 '+p.turns+' · 金币 '+p.gold+' · 生命 '+Math.max(0,Math.round(p.hp))+'/'+p.maxHp+(p.hp<=0?' ☠️死亡':' (录像结束时仍存活)'));
  console.log('一阶/二阶:', (p.tier1||'—')+' / '+(p.tier2||'—'));
  if(src){ const L2=x=>Array.isArray(x)?x[0]:x; const s=G.dmgSourceLabel(src); console.log('致命回合主要伤害来源:', s.emoji+L2(s.name), Math.round(mx)); }
  process.exit(0);
}

// ---------- 3) 机器人辅助 ----------
const ROWS=6, COLS=6;
const grid = () => G.grid;
const P = () => G.player;
const N8 = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
function neighbors(r,c){ const o=[]; for(const[dr,dc]of N8){const nr=r+dr,nc=c+dc; if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS)o.push([nr,nc]); } return o; }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// Warnsdorff 式贪心最长路径
function greedyPath(sr, sc, pred, preferEnemy){
  const g=grid(), used=new Set([sr+','+sc]), path=[[sr,sc]];
  let cr=sr, cc=sc;
  const onward=([r,c])=>neighbors(r,c).filter(([nr,nc])=>!used.has(nr+','+nc)&&pred(g[nr][nc])).length;
  while(true){
    let cands=neighbors(cr,cc).filter(([nr,nc])=>!used.has(nr+','+nc)&&pred(g[nr][nc]));
    if(!cands.length) break;
    if(preferEnemy){ const en=cands.filter(([r,c])=>g[r][c].type==='enemy'); if(en.length) cands=en; }
    cands.sort((a,b)=>onward(a)-onward(b));
    const [nr,nc]=cands[0]; used.add(nr+','+nc); path.push([nr,nc]); cr=nr; cc=nc;
  }
  return path;
}

// 计算一条剑链能杀多少怪、移除多少威胁
function swordEval(path){
  const g=grid(), p=P();
  let nS=0, enemies=[];
  for(const[r,c]of path){ const t=g[r][c]; if(t.type==='sword')nS++; else if(G.isSwordTarget(t))enemies.push(t); }
  const combo=1+Math.max(0,nS-2)*0.15*(p.comboMult||1);
  const titanFlat=p.titan?Math.floor(p.maxHp/12):0;
  let pool=(nS*p.weaponPower+p.swordFlat+titanFlat)*combo*(p.swordMult||1);
  if(p.lowHpDmg) pool*=1+(1-p.hp/p.maxHp)*0.6;   // 与游戏一致：狂怒残血增伤
  pool=Math.floor(pool);
  let kills=0, threat=0;
  for(const e of enemies){ if(pool>=e.hp){ kills++; threat+=e.atk*(e.cd<=1?3:1); } }
  return { nS, enemies:enemies.length, kills, threat, len:path.length };
}

function bestSword(){
  const g=grid(); let best=null;
  const pred=t=>t&&(t.type==='sword'||G.isSwordTarget(t));
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const t=g[r][c]; if(!t||!(t.type==='sword'||G.isSwordTarget(t)))continue;
    const path=greedyPath(r,c,pred,true);
    if(path.length<2)continue;
    const ev=swordEval(path);
    if(ev.nS<1||ev.enemies<1)continue; // 必须有剑且串到怪
    const score=ev.kills*1000 + ev.threat*30 + ev.enemies*5 + ev.nS;
    if(!best||score>best.score) best={path,score,ev};
  }
  return best;
}
function bestSimple(type){
  const g=grid(); let best=null;
  const pred=t=>t&&t.type===type;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!pred(g[r][c]))continue;
    const path=greedyPath(r,c,pred,false);
    if(path.length<2)continue;
    if(!best||path.length>best.path.length) best={path,len:path.length};
  }
  return best;
}

function toSelection(path, baseType){
  const g=grid();
  return path.map(([r,c],i)=>({ r, c, type: i===0?baseType : g[r][c].type }));
}

// 升级：模拟"三选一"，按优先级挑
// 升级取向：不同的「三选一」优先级，遍历它们=覆盖所有升级分支（未列出的→最低优先，如搜刮财富）
const UP_PROFILES={
  balanced:['强化体魄','加固护甲','磨利刀刃','强化盾术','精研医术','淬炼锋芒','汲取生命','凝聚生机'],   // 均衡（历史默认）
  offense: ['磨利刀刃','淬炼锋芒','强化体魄','加固护甲','汲取生命','强化盾术','精研医术','凝聚生机'],   // 纯攻：先堆{W}伤害
  tank:    ['强化体魄','加固护甲','强化盾术','精研医术','凝聚生机','汲取生命','磨利刀刃','淬炼锋芒'],   // 纯肉：上限/护甲/续航
  sustain: ['汲取生命','凝聚生机','精研医术','强化体魄','加固护甲','磨利刀刃','强化盾术','淬炼锋芒'],   // 续航：吸血/回血/医术
  elder_survival: ['强化体魄','加固护甲','汲取生命','凝聚生机','精研医术','磨利刀刃','强化盾术','淬炼锋芒'],   // 长老专精：最大生命优先（蔓藤伤害=30%最大生命）
};
let UP_PRIORITY=UP_PROFILES.balanced;   // 当前取向（默认均衡，与历史一致）；--upsweep 时逐套切换
const upRank=n=>{const i=UP_PRIORITY.indexOf(n);return i<0?99:i;};
const COMPETITIVE_BUILDS={
  human:{ t1:['firemage','knight','priest','swordsaint'], t3:['firewall','holystrike','bladeall','general'], profile:'offense' },
  elf:{ t1:['elder','ranger','rogue'], t3:['sharpshooter','shadow','thorns'], profile:'elder_survival' },
  dwarf:{ t1:['guildmaster','miser','musketeer','blacksmith'], t3:['demolitionist','tycoon','cheapskate','shieldbash'], profile:'offense' },
  orc:{ t1:['fighter','berserker','witchdoctor'], t3:['titan','bloodfrenzy','allispoison'], profile:'offense' },
  undead:{ t1:['necromancer','butcher','skeletonking'], t3:['splash','rejuvenation','carrion'], profile:'sustain' },
};
const COMPETITIVE_SWAP_SKILLS=['guildmaster','elder','priest','knight','musketeer','rogue','ranger','necromancer'];
function countBoard(type){ const g=grid(); let n=0; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=g[r][c]; if(t&&t.type===type)n++;} return n; }
function boardEnemies(){ const g=grid(),e=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=g[r][c]; if(t&&t.type==='enemy')e.push(t);} return e; }
function boardSwords(){ return countBoard('sword'); }
function boardBoss(){ const g=grid(); for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=g[r][c]; if(t&&t.type==='boss')return t;} return null; }
function boardHearts(){ return countBoard('heart'); }
function boardCoins(){ return countBoard('coin'); }
function boardShields(){ return countBoard('shield'); }
function boardState(){
  const p=P();
  const enemies=boardEnemies();
  const boss=boardBoss();
  const imminent=enemies.filter(e=>e.cd<=1).reduce((s,e)=>s+e.atk,0) + (boss&&boss.cd<=1?boss.atk:0);
  const enemyHp=enemies.reduce((s,e)=>s+e.hp,0);
  const immuneBoss=!!(boss && !G.isSwordTarget(boss));
  return {
    player:p,
    enemies,
    enemyCount:enemies.length,
    enemyHp,
    boss,
    bossId:boss&&boss.bossId,
    imminent,
    immuneBoss,
    hearts:boardHearts(),
    shields:boardShields(),
    coins:boardCoins(),
    swords:boardSwords(),
    lowHp:p.hp<=0.45*p.maxHp,
    moderateHp:p.hp<=0.62*p.maxHp,
    criticalHp:p.hp<=0.28*p.maxHp,
  };
}
function competitiveProfile(){
  if(!COMPETITIVE) return UP_PRIORITY;
  const cfg=COMPETITIVE_BUILDS[ARG.race||''] || COMPETITIVE_BUILDS[(P()&&P().race)||''] || null;
  const explicit=ARG.profile && UP_PROFILES[ARG.profile];
  return explicit || (cfg && UP_PROFILES[cfg.profile]) || UP_PROFILES.sustain;
}
function dynamicUpgradeScore(u, state){
  const p=state.player, name=u.n[0];
  const prof=competitiveProfile();
  const idx=prof.indexOf(name);
  let score=120 - (idx<0?90:idx*12);
  if(name==='强化体魄') score += state.criticalHp?120:state.lowHp?70:15;
  if(name==='加固护甲') score += p.race==='dwarf'?80:25;
  if(name==='强化盾术') score += state.shields?55:10;
  if(name==='磨利刀刃') score += state.enemyCount>=2?85:35;
  if(name==='淬炼锋芒') score += state.boss?85:30;
  if(name==='汲取生命') score += state.enemyCount>=2?100:45;
  if(name==='凝聚生机') score += state.lowHp?85:40;
  if(name==='精研医术') score += state.hearts>=2?70:20;
  if(name==='搜刮财富') score += p.tier1==='guildmaster'?90:15;
  if(name==='临战突破') score += state.boss?50:10;
  return score;
}
function resolveLevels(){
  while(G.pendingLevels>0){
    const pool=G.rollUpgradePool();   // 用游戏真实升级池（消耗游戏 RNG），保证录像可确定性重放
    const state=boardState();
    const choose=(COMPETITIVE
      ? pool.slice().sort((a,b)=>dynamicUpgradeScore(b,state)-dynamicUpgradeScore(a,state) || upRank(a.n[0])-upRank(b.n[0]))[0]
      : pool.slice().sort((a,b)=>upRank(a.n[0])-upRank(b.n[0]))[0]);
    G.recAct(['u', G.UPGRADES.indexOf(choose)]);   // 录制升级选择（按 UPGRADES 索引，与回放一致）
    G.applyUpgrade(choose);   // 内部 u.f + 钳血 + pendingLevels--
  }
  G.busy=false;
}
function chooseTier1(p){
  const ids=G.RACE_PATHS[p.race].t1;
  const forced=ARG.t1;
  if(forced&&ids.includes(forced)) return forced;
  if(!COMPETITIVE) return ids[0];
  const pref=(COMPETITIVE_BUILDS[p.race]&&COMPETITIVE_BUILDS[p.race].t1)||ids;
  return pref.find(id=>ids.includes(id)) || ids[0];
}
function chooseTier3(p){
  const pool=G.RACE_PATHS[p.race].t2.filter(x=>x!==p.tier2);
  const forced=ARG.t2;
  if(forced&&pool.includes(forced)) return forced;
  if(!COMPETITIVE) return pool[0];
  const pref=(COMPETITIVE_BUILDS[p.race]&&COMPETITIVE_BUILDS[p.race].t3)||pool;
  return pref.find(id=>pool.includes(id)) || pool[0];
}
function chooseSwap(p){
  const boss=boardBoss();
  if(p.tier1==='elder' || p.race==='elf'){
    return { id:'knight', slot: 'heal' };   // 圣盾：本回合免伤——专克幽灵重击，CD独立于一阶蔓藤
  }
  const keepBomb = !!(boss || p.bombBoost || p.cheapskate || p.tier1==='guildmaster' || p.race==='dwarf' || p.tier1==='elder');
  const ids=COMPETITIVE ? COMPETITIVE_SWAP_SKILLS : [p.tier1||Object.keys(G.TIER1)[0]];
  const skillId=(ids.find(id=>G.TIER1[id]) || p.tier1 || Object.keys(G.TIER1)[0]);
  return { id:skillId, slot: keepBomb ? 'heal' : 'bomb' };
}
function scoreSwordCandidate(path, state){
  const ev=swordEval(path);
  const killWeight=state.boss?1300:1000;
  let score=ev.kills*killWeight + ev.threat*55 + ev.enemies*18 + ev.nS*8 + ev.len;
  if(state.criticalHp) score += ev.threat*25;
  if(state.immuneBoss) score -= 220;
  if(state.immuneBoss && state.boss && state.boss.cd<=1) score -= 400;   // 幽灵即将重击：进一步降低剑链优先级，转向盾/心
  if(state.player.tier1==='fighter'&&state.immuneBoss) score += 260;
  return {path, score, ev};
}
function bestSword(){
  const g=grid(); let best=null;
  const pred=t=>t&&(t.type==='sword'||G.isSwordTarget(t));
  const state=boardState();
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const t=g[r][c]; if(!t||!(t.type==='sword'||G.isSwordTarget(t)))continue;
    const path=greedyPath(r,c,pred,true);
    if(path.length<2)continue;
    const cand=scoreSwordCandidate(path,state);
    if(cand.ev.nS<1||cand.ev.enemies<1)continue;
    if(!best||cand.score>best.score) best=cand;
  }
  return best;
}
function resourceValue(type, len, state){
  const p=state.player;
  const ghostImminent = state.immuneBoss && state.boss && state.boss.cd<=1;
  if(type==='heart') return len*(state.criticalHp?120:state.lowHp?70:state.moderateHp?38:20) + (state.bossId==='pollution'?-9999:0) + (ghostImminent?30:0);
  if(type==='shield') return len*((p.race==='dwarf'?50:26) + (state.imminent>0?18:0) + (ghostImminent?35:0));
  if(type==='coin'){
    let score=len*(state.boss||p.tier1==='guildmaster'||p.tier1==='miser'?42:20);
    if(state.boss && p.gold<G.shopCost('bomb')) score+=90;
    if(p.tier1==='guildmaster'&&p.cheapskate) score+=80;
    if(p.tier1==='miser'&&p.goldLock<=0) score+=60;
    if(p.tier1==='miser'&&p.tier2==='tycoon'&&p.goldLock>0&&state.imminent>0) score-=120;
    return score;
  }
  return len;
}
function bestSimple(type){
  const g=grid(); let best=null;
  const pred=t=>t&&t.type===type;
  const state=boardState();
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(!pred(g[r][c]))continue;
    const path=greedyPath(r,c,pred,false);
    if(path.length<2)continue;
    const score=resourceValue(type, path.length, state);
    if(!best||score>best.score) best={path,len:path.length,score};
  }
  return best;
}
function shouldUseSkill(state){
  const p=state.player; if(!p.tier1 || p.skillCd>0) return false;
  const id=p.tier1;
  if(id==='knight') return !!(state.boss || state.imminent>0 || state.criticalHp);
  if(id==='priest') return state.hearts>=2 && (state.lowHp || state.boss || p.level<8);
  if(id==='firemage') return state.enemyCount>=2 || !!state.boss;
  if(id==='ranger') return state.enemyCount>=2 || !!state.boss;
  if(id==='blacksmith') return state.shields>=2 || (state.imminent>0 && state.shields>=1);
  if(id==='fighter') return state.immuneBoss || state.enemyCount>=3 || state.lowHp;
  if(id==='berserker') return state.imminent>0 && p.hp<=0.45*p.maxHp;
  if(id==='guildmaster'){
    const cost=p.cheapskate?Math.ceil(state.enemyHp/2):state.enemyHp;
    return state.enemyCount>=2 && cost>0 && p.gold>=cost;
  }
  if(id==='elder') return !p.deathCoil && (state.immuneBoss || state.enemyCount>=3 || (!!state.boss && state.boss.cd<=2));   // 蔓藤留给幽灵/群怪/Boss临危，不浪费在单怪上
  if(id==='butcher') return !!state.boss || state.enemyCount>=3;
  if(id==='musketeer') return !!state.boss || state.enemyCount>=1;
  if(id==='necromancer') return !!state.boss || state.enemyCount>=2 || state.lowHp;
  if(id==='rogue') return (state.enemyCount>=2 && state.swords>=2) || (!!state.boss && state.swords>=1);
  if(id==='swordsaint') return state.hearts+state.coins>=4;
  return false;
}
function shouldUseSkill2(state){
  const p=state.player; if(!p.skill2 || p.skill2Cd>0) return false;
  const id=p.skill2.id;
  if(p.frozen && p.frozen[p.skill2.slot]>0) return false;
  if(id==='knight') return !!(state.boss || state.immuneBoss || state.criticalHp);   // 圣盾留给 Boss/幽灵/濒死，不浪费在普通怪上
  if(id==='priest') return state.hearts>=2 && (state.lowHp || state.boss || p.level<8);
  if(id==='firemage') return state.enemyCount>=2 || !!state.boss;
  if(id==='ranger') return state.enemyCount>=2 || !!state.boss;
  if(id==='blacksmith') return state.shields>=2 || (state.imminent>0 && state.shields>=1);
  if(id==='fighter') return state.immuneBoss || state.enemyCount>=3 || state.lowHp;
  if(id==='berserker') return state.imminent>0 && p.hp<=0.45*p.maxHp;
  if(id==='guildmaster'){
    const cost=p.cheapskate?Math.ceil(state.enemyHp/2):state.enemyHp;
    return state.enemyCount>=2 && cost>0 && p.gold>=cost;
  }
  if(id==='elder') return !p.deathCoil && (state.immuneBoss || state.enemyCount>=3 || (!!state.boss && state.boss.cd<=2));   // 蔓藤留给幽灵/群怪/Boss临危，不浪费在单怪上
  if(id==='butcher') return !!state.boss || state.enemyCount>=3;
  if(id==='musketeer') return !!state.boss || state.enemyCount>=1;
  if(id==='necromancer') return !!state.boss || state.enemyCount>=2 || state.lowHp;
  if(id==='rogue') return (state.enemyCount>=2 && state.swords>=2) || (!!state.boss && state.swords>=1);
  if(id==='swordsaint') return state.hearts+state.coins>=4;
  return false;
}
function maybeSkill(){
  let acted=false;
  let state=boardState();
  if(shouldUseSkill2(state)){
    const slot=state.player.skill2.slot;
    G.buyItem(slot);
    botTransform(); resolveLevels();
    acted=true;
    state=boardState();
  }
  if(!shouldUseSkill(state)) return acted;
  const ok=G.activateSkill();
  resolveLevels();
  return ok || acted;
}
// 机器人处理转职选择（resolve/buyItem 触发 showTierSelect/showSkillSwap 后，按 build-aware 方案选）
function botTransform(){
  const p=P(); if(!p.awaitingTier) return;
  const t=p.awaitingTier;
  if(t===1){ const id=chooseTier1(p); G.recAct(['t',1,id]); p.tier1=id; }
  else if(t===2){ const id=G.CLASS_T2[p.tier1]; G.recAct(['t',2,id]); p.tier2=id; G.TIER2[id].f(p); p.hp=Math.min(p.hp,p.maxHp); }   // 100回合：锁定职业专属被动
  else if(t===3){ const id=chooseTier3(p); if(id){ G.recAct(['t',3,id]); p.tier2b=id; G.TIER2[id].f(p); p.hp=Math.min(p.hp,p.maxHp); } }   // 200回合：同族其余被动（--t2 选）
  else if(t===4){ const pick=chooseSwap(p); G.recAct(['t',4,pick.id,pick.slot]); p.skill2={id:pick.id, slot:pick.slot}; p.skill2Cd=0; }   // 350回合：按 build 决定换装技能与槽位
  p.awaitingTier=0; G.busy=false;
}

// ---------- 4) 单局 ----------
function playGame(rc, srv){   // srv={seed,token}：用服务端种子开局（--submit-ai 上榜需要），缺省则本地随机
  G.headless=true;   // 抑制升级弹窗在 resolve 里抽池，避免与机器人 resolveLevels 重复消耗 RNG（保证录像可重放）
  G.startGame(rc, srv);
  let turn=0;
  for(; turn<4000; turn++){
    const p=P();
    if(p.hp<=0) break;
    botTransform();   // 处理上一步触发的转职
    G.busy=false;
    let state=boardState();

    if(state.criticalHp && p.gold>=G.shopCost('heal') && state.hearts<2){ G.buyItem('heal'); botTransform(); resolveLevels(); state=boardState(); }
    else if(!(p.skill2&&p.skill2.slot==='heal') && state.lowHp && !state.boss && p.gold>=G.shopCost('heal')+10 && state.hearts===0 && state.enemyCount>=2){ G.buyItem('heal'); botTransform(); resolveLevels(); state=boardState(); }
    else if(state.boss && p.gold>=G.shopCost('bomb') && (state.immuneBoss || state.enemyCount>=3 || state.bossId==='pollution')){ G.buyItem('bomb'); botTransform(); resolveLevels(); state=boardState(); }
    else if(p.tier1==='guildmaster'){
      const buyCost=p.cheapskate?Math.ceil(state.enemyHp/2):state.enemyHp;
      if(state.enemyCount>=2 && buyCost>0 && p.gold<buyCost && state.coins>=2){ /* 留给金币链攒钱 */ }
      else if(state.enemyCount>=4 && p.gold>=G.shopCost('bomb')){ G.buyItem('bomb'); botTransform(); resolveLevels(); state=boardState(); }
    }
    else if(state.enemyCount>=4 && p.gold>=G.shopCost('bomb') && (state.imminent>0 || state.lowHp)){ G.buyItem('bomb'); botTransform(); resolveLevels(); state=boardState(); }
    maybeSkill();   // 一阶主动
    state=boardState();

    const sword=bestSword();
    let heart=bestSimple('heart');
    if(state.boss && state.bossId==='pollution') heart=null;   // 污染怪在场：心变毒心，连之扣血——机器人不碰，改靠炸弹清掉它
    const shield=bestSimple('shield');
    const coin=bestSimple('coin');

    const options=[];
    if(heart) options.push({type:'heart', score:resourceValue('heart', heart.len, state), sel:toSelection(heart.path,'heart')});
    if(shield) options.push({type:'shield', score:resourceValue('shield', shield.len, state), sel:toSelection(shield.path,'shield')});
    if(coin) options.push({type:'coin', score:resourceValue('coin', coin.len, state), sel:toSelection(coin.path,'coin')});
    if(sword) options.push({type:'sword', score:sword.score, sel:toSelection(sword.path,'sword')});
    if(!options.length) break;
    options.sort((a,b)=>b.score-a.score);
    const pick=options[0];

    G.selection=pick.sel;
    G.resolve();
    if(P().hp<=0){ turn++; break; }
    botTransform();   // resolve 可能触发转职
    resolveLevels();
  }
  const p=P();
  const db=p.dmgBy||{}; let deathSrc=null,mx=0; for(const k in db){ if(db[k]>mx){mx=db[k];deathSrc=k;} }  // 致命回合主要死因
  return { level:p.level, turns:p.turns, gold:p.gold, maxHp:p.maxHp, died:p.hp<=0, loopTurns:turn, t1:p.tier1, t2:p.tier2, t2b:p.tier2b, skill2:(p.skill2&&p.skill2.id)||null, deathSrc };
}

// ---------- 5) 批量跑 ----------
const GAMES=ARG.games?+ARG.games:25;
const med=arr=>{ const a=arr.slice().sort((x,y)=>x-y); return a.length?a[Math.floor(a.length/2)]:0; };
const avg=arr=>arr.length?arr.reduce((s,x)=>s+x,0)/arr.length:0;
const srcName=k=>{ if(k==='enemy')return'👹普通怪'; const b=G.BOSSES.find(x=>x.id===k); return b?b.emoji+b.name[0]:(k||'—'); };
function runBatch(){
  const out=[];
  for(const rc of G.RACES){
    const res=[];
    for(let i=0;i<GAMES;i++){ try{ res.push(playGame(rc)); }catch(e){ res.push({error:e.message}); } }
    const ok=res.filter(r=>!r.error);
    const levels=ok.map(r=>r.level), turns=ok.map(r=>r.turns);
    out.push({ cls:rc.n[0], games:ok.length,
      lvl_med:med(levels), turn_med:med(turns||[0]), turn_max:Math.max(0,...turns),
      capped:ok.filter(r=>!r.died).length, errors:res.length-ok.length, err0:(res.find(r=>r.error)||{}).error });
  }
  return out;
}
// 目标：总回合中位 ≈ 60。扫一批更硬的候选，自动挑最接近的。
const TARGET=150;
const CANDIDATES=[
  { name:'C atk0.7/cd3-4', v:{ hp:'3 + Math.floor(Math.random()*3) + Math.floor(lv*0.7)', atk:'2 + Math.floor(lv*0.7)', cd:'3 + Math.floor(Math.random()*2)', chance:'Math.min(0.30, 0.10 + player.level*0.014)' } },
  { name:'C2 atk0.75/cd3-4',v:{ hp:'3 + Math.floor(Math.random()*3) + Math.floor(lv*0.75)', atk:'2 + Math.floor(lv*0.75)', cd:'3 + Math.floor(Math.random()*2)', chance:'Math.min(0.31, 0.105 + player.level*0.0145)' } },
  { name:'D atk0.8/cd3-4', v:{ hp:'3 + Math.floor(Math.random()*3) + Math.floor(lv*0.8)', atk:'2 + Math.floor(lv*0.8)', cd:'3 + Math.floor(Math.random()*2)', chance:'Math.min(0.32, 0.11 + player.level*0.015)' } },
  { name:'D2 atk0.85/cd3-4',v:{ hp:'3 + Math.floor(Math.random()*3) + Math.floor(lv*0.82)', atk:'2 + Math.floor(lv*0.85)', cd:'3 + Math.floor(Math.random()*2)', chance:'Math.min(0.33, 0.115 + player.level*0.015)' } },
];
if('clearsweep' in ARG){
  // ---- 全分支破关扫描：所有 种族 × 一阶职业 × 200级第二被动（含锁定的二阶），每个 build 跑 N 局，看有没有能破关(≥511回合)的 ----
  //      加 --upsweep：再叠加「升级取向」维度（均衡/纯攻/纯肉/续航），覆盖所有升级分支。
  G = loadGame(); applyBossFilter(G);
  const N = ARG.games?+ARG.games:60;
  const profiles = 'upsweep' in ARG ? Object.keys(UP_PROFILES) : ['balanced'];
  const nm=(pool,id)=> id&&pool[id]?pool[id].n[0]:(id||'—');
  console.log(`全分支破关扫描（每个组合 ${N} 局，实时文件值，全 Boss 池${profiles.length>1?`；升级取向 ×${profiles.length}`:''}）  破关线=511 回合\n`);
  console.log('种族   一阶/锁定二阶          +200级被动    升级取向 | 局数 | 回合中位 最高 | 破关');
  console.log('-------|----------------------|------------|---------|------|---------------|-----');
  let combos=0, totalClears=0, best={turns:0};
  const clearedBuilds=[];
  for(const rc of G.RACES){
    for(const t1 of G.RACE_PATHS[rc.id].t1){
      const locked=G.CLASS_T2[t1];
      for(const t2b of G.RACE_PATHS[rc.id].t2.filter(x=>x!==locked)){
        for(const prof of profiles){
          UP_PRIORITY=UP_PROFILES[prof];
          ARG.t1=t1; ARG.t2=t2b; combos++;
          const turns=[]; let clears=0, errs=0;
          for(let i=0;i<N;i++){ let o; try{ o=playGame(rc); }catch(e){ errs++; continue; } turns.push(o.turns); if(o.turns>=511) clears++; }
          const mx=Math.max(0,...turns), md=med(turns);
          if(clears>0){ totalClears+=clears; clearedBuilds.push({rc:rc.n[0], t1:nm(G.TIER1,t1), t2b:nm(G.TIER2,t2b), prof, clears, N, mx}); }
          if(mx>best.turns) best={turns:mx, rc:rc.n[0], t1:nm(G.TIER1,t1), locked:nm(G.TIER2,locked), t2b:nm(G.TIER2,t2b), prof};
          console.log(
            rc.n[0].padEnd(5)+'  '+(`${nm(G.TIER1,t1)}/${nm(G.TIER2,locked)}`).padEnd(20)+' +'+nm(G.TIER2,t2b).padEnd(10)+' '+prof.padEnd(8)+' | '+
            String(turns.length).padStart(4)+' | '+String(md).padStart(6)+String(mx).padStart(6)+' | '+
            (clears?('🏆'+clears):'0')+(errs?` ⚠️${errs}`:''));
        }
      }
    }
  }
  UP_PRIORITY=UP_PROFILES.balanced;   // 复位
  console.log(`\n扫描 ${combos} 个组合 × ${N} 局。破关(≥511回合)总计 ${totalClears} 局。`);
  if(clearedBuilds.length){ console.log('能破关的组合：'); clearedBuilds.forEach(b=>console.log(`  ${b.rc} ${b.t1}+${b.t2b} [${b.prof}]：${b.clears}/${b.N} 局破关（最高 ${b.mx} 回合）`)); }
  else console.log(`❌ 没有任何组合破关。最长记录：${best.rc} ${best.t1}/${best.locked}+${best.t2b} [${best.prof}] → ${best.turns} 回合。`);
}
else if('survivors' in ARG){
  // ---- 分析模式：列出撑到 >=阈值 回合的每一局及其完整 build（种族/一阶/二阶/第二被动/换装主动）----
  G = loadGame(); applyBossFilter(G);
  const TH = +ARG.survivors || 500, N = ARG.games?+ARG.games:80;
  const races = ARG.race ? G.RACES.filter(r=>r.id===ARG.race) : G.RACES;
  const nm = (pool,id)=> id&&pool[id] ? pool[id].n[0] : (id||'—');
  console.log(`撑到 ≥${TH} 回合的局（每种族 ${N} 局）：\n`);
  let total=0, hit=0;
  for(const rc of races){ for(let i=0;i<N;i++){ total++;
    let o; try{ o=playGame(rc); }catch(e){ continue; }
    if(o.turns>=TH){ hit++;
      const t1=nm(G.TIER1,o.t1), t2=nm(G.TIER2,o.t2), t2b=nm(G.TIER2,o.t2b);
      console.log(`${rc.e}${rc.n[0]}  回合${o.turns} 等级${o.level}  | 一阶 ${t1} · 二阶 ${t2}${o.t2b?` +${t2b}`:''}${o.skill2?` · 换装 ${nm(G.TIER1,o.skill2)}→💥`:''}`);
    }
  }}
  console.log(`\n共 ${hit}/${total} 局撑到 ≥${TH} 回合。`);
}
else if('submit-ai' in ARG || 'submit-human' in ARG){
  // ---- 提交模式：跑竞技机器人 → 本地重放校验 → 把可验证录像提交到 AI 榜或人类榜 ----
  const AGENT = 'submit-human' in ARG ? 'human' : 'ai';
  G = loadGame(); applyBossFilter(G);
  const API = ARG.api || 'https://api.dungeonraid.win';
  const submitRace = ARG.race || 'elf';
  if(!ARG.race) ARG.race = submitRace;
  if(!ARG.t1 && submitRace==='elf') ARG.t1='elder';
  else if(!ARG.t1 && submitRace==='dwarf') ARG.t1='guildmaster';
  else if(!ARG.t1 && submitRace==='human') ARG.t1='knight';
  else if(!ARG.t1 && submitRace==='undead') ARG.t1='necromancer';
  else if(!ARG.t1 && submitRace==='orc') ARG.t1='fighter';
  if(!ARG.t2 && submitRace==='elf') ARG.t2='sharpshooter';
  else if(!ARG.t2 && submitRace==='dwarf') ARG.t2='demolitionist';
  else if(!ARG.t2 && submitRace==='human') ARG.t2='holystrike';
  else if(!ARG.t2 && submitRace==='undead') ARG.t2='splash';
  else if(!ARG.t2 && submitRace==='orc') ARG.t2='titan';
  if(!ARG.profile){ const cfg=COMPETITIVE_BUILDS[submitRace]; if(cfg) ARG.profile=cfg.profile; }
  UP_PRIORITY = competitiveProfile();
  const races = G.RACES.filter(r=>r.id===submitRace);
  if(!races.length){ console.error('未知种族: '+submitRace); process.exit(1); }
  const N = ARG.games?+ARG.games:3, DRY='dry' in ARG;
  (async()=>{
    const runs=[];
    for(const rc of races){ for(let i=0;i<N;i++){
      // 上榜需服务端种子：每局先取一次性 /seed（与真人客户端同路径），带 race/version 以拿到匹配的上传门槛快照，用它的种子开局、录像带 token
      let srv=null;
      try{ const qs=new URLSearchParams({race:rc.id, version:G.VERSION||''}); const r=await fetch(API+'/seed?'+qs.toString(),{method:'POST'}); if(r.ok){ const x=await r.json(); if(typeof x.seed==='number'&&x.token) srv={seed:x.seed>>>0, token:x.token, threshold:x.threshold||null}; } }catch(e){}
      if(!srv){ console.log('✗ 取服务端种子失败，跳过', rc.id); continue; }
      let out; try{ out=playGame(rc, srv); }catch(e){ console.log('✗ 跑局出错', rc.id, e.message); continue; }
      runs.push({race:rc.id, out, rec:JSON.parse(JSON.stringify(G.rec))});   // 深拷贝本局录像（含 token；下局 startGame 会覆盖 rec）
      await new Promise(r=>setTimeout(r, +ARG.gap||4200));   // /seed 也走写入限流(20次/60s)，与提交共用 --gap 间隔
    }}
    // 本地重放校验：与服务端 verify 同一引擎，本地过即服务端可验证
    const replayCheck=rec=>{ try{ G.replaying=true; G.replayRec=rec; G.startGame(G.raceById(rec.race));
      const p=G.player; for(const a of rec.acts){ if(p.hp<=0||p.cleared) break; G.dispatchReplayAct(a); }
      G.replaying=false; return {turns:p.turns, level:p.level, gold:p.gold, cleared:!!p.cleared};
    }catch(e){ G.replaying=false; return null; } };
    const good=[];
    for(const run of runs){
      const a=replayCheck(run.rec);
      const ok = a && a.turns===run.out.turns && a.level===run.out.level && a.gold===run.out.gold;
      console.log((ok?'✓':'✗')+` ${run.race} 回合${run.out.turns} 等级${run.out.level} 金${run.out.gold}`+(ok?'':` ← 重放不符 ${a?`${a.turns}/${a.level}/${a.gold}`:'ERR'}`));
      if(ok) good.push({...run, cleared:a.cleared});
    }
    const MINT = +ARG.min || 50;
    const toPost = good.filter(r=>r.out.turns>=MINT);   // 跳过太短的局，AI 榜不堆噪声
    console.log(`\n可验证录像 ${good.length}/${runs.length}，待提交(回合≥${MINT}) ${toPost.length}`+(DRY?'（--dry：不提交）':''));
    if(DRY) return;
    let posted=0, failed=0;
    for(const run of toPost){
      const clear = run.cleared || run.out.turns>=511;
      const ep = clear ? '/clear' : '/score';
      const body = clear ? {level:run.out.level, rec:run.rec, agent:AGENT} : {level:run.out.level, gold:run.out.gold, rec:run.rec, agent:AGENT};
      try{
        const res=await fetch(API+ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const j=await res.json().catch(()=>({}));
        if(res.ok && (j.id||j.overall)){ posted++; console.log(`↑ ${ep} ${run.race} 回合${run.out.turns} → id ${j.id||'?'}`); }
        else { failed++; console.log(`✗ ${ep} ${run.race} HTTP${res.status} ${JSON.stringify(j).slice(0,80)}`); }
      }catch(e){ failed++; console.log('✗ 提交出错', e.message); }
      await new Promise(r=>setTimeout(r, +ARG.gap||4200));   // 限流：避开写入端点 20次/60s（--gap 可调，单位 ms）
    }
    console.log(`\n提交完成：${posted} 成功 / ${failed} 失败（agent=${AGENT}）。需等下一次每小时 verify 重放校验通过后才会出现在${AGENT==='ai'?'AI':'人类'}榜（榜单只显示 verified=1）。`);
  })();
}
else if(FOCUS){
  // ---- 定向模式：指定职业线/Boss，跑详细统计，便于和历史对比 ----
  const cand = ARG.enemy ? CANDIDATES.find(c=>c.name.split(' ')[0]===ARG.enemy||c.name.startsWith(ARG.enemy)) : null;
  if(ARG.enemy && !cand){ console.error('未知 enemy 候选: '+ARG.enemy+'（可选：'+CANDIDATES.map(c=>c.name.split(' ')[0]).join(', ')+'）'); process.exit(1); }
  G = loadGame(cand?variant(cand.v):undefined);   // 默认用文件里的真实敌人数值
  applyBossFilter(G);
  const races = ARG.race ? G.RACES.filter(r=>r.id===ARG.race) : G.RACES;
  if(ARG.race && !races.length){ console.error('未知种族: '+ARG.race+'（可选：'+G.RACES.map(r=>r.id).join(', ')+'）'); process.exit(1); }
  const cfg=[`敌人=${cand?cand.name.split(' ')[0]:'实时文件值'}`];
  if(ARG.boss)cfg.push(`Boss=${ARG.boss}(唯一)`); if(ARG.t1)cfg.push(`一阶=${ARG.t1}`); if(ARG.t2)cfg.push(`二阶=${ARG.t2}`);
  console.log(`定向测试（每配置 ${GAMES} 局）  ${cfg.join('  ')}\n`);
  console.log('种族   一阶/二阶          | 回合中位 均值 最高 | 等级中位 | 达一阶 达二阶 | 主要死因');
  console.log('-------|-------------------|--------------------|----------|---------------|---------');
  for(const rc of races){
    const res=[]; for(let i=0;i<GAMES;i++){ try{ res.push(playGame(rc)); }catch(e){ res.push({error:e.message}); } }
    const ok=res.filter(r=>!r.error);
    const turns=ok.map(r=>r.turns), lv=ok.map(r=>r.level);
    const r1=ok.filter(r=>r.t1).length, r2=ok.filter(r=>r.t2).length;
    const deaths={}; ok.forEach(r=>{ if(r.deathSrc)deaths[r.deathSrc]=(deaths[r.deathSrc]||0)+1; });
    const topD=Object.entries(deaths).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k,v])=>`${srcName(k)} ${Math.round(v/ok.length*100)}%`).join(' · ')||'—';
    const t1id=ARG.t1||G.RACE_PATHS[rc.id].t1[0];
    const path=`${t1id}/${G.CLASS_T2[t1id]}`;   // 二阶被动锁定职业
    const err=res.length-ok.length;
    console.log(
      rc.n[0].padEnd(5)+'  '+path.padEnd(18)+' | '+
      String(med(turns)).padStart(6)+String(Math.round(avg(turns))).padStart(5)+String(Math.max(0,...turns)).padStart(5)+' | '+
      String(med(lv)).padStart(7)+'  | '+
      (Math.round(r1/ok.length*100)+'%').padStart(6)+(Math.round(r2/ok.length*100)+'%').padStart(8)+' | '+
      topD + (err?`  ⚠️${err}错误`:''));
  }
  console.log('\n回合=存活回合，达一阶=击败50回合Boss转一阶的比例，达二阶=转二阶的比例，主要死因=致命回合伤害来源占比。');
} else {
  // ---- 扫描模式：四族 × 多套敌人数值，找最接近目标回合的一套 ----
  console.log('种族系统平衡扫描（每种族 '+GAMES+' 局，回合中位数），目标 ≈ '+TARGET+'\n');
  console.log('候选             | 人族  精灵  矮人  兽人 |总回合中位');
  console.log('-----------------|------------------------|--------');
  let bestCand=null;
  for(const cand of CANDIDATES){
    G = loadGame(variant(cand.v)); applyBossFilter(G);
    const out = runBatch();
    const turnMed = med(out.map(r=>r.turn_med));
    const byCls = {}; out.forEach(r=>byCls[r.cls]=r.turn_med);
    console.log(
      cand.name.padEnd(16)+' | '+
      String(byCls['人族']).padStart(5)+String(byCls['精灵']).padStart(6)+
      String(byCls['矮人']).padStart(6)+String(byCls['兽人']).padStart(6)+' | '+
      String(turnMed).padStart(6));
    cand.turnMed=turnMed; cand.byCls=byCls;
    if(!bestCand || Math.abs(turnMed-TARGET)<Math.abs(bestCand.turnMed-TARGET)) bestCand=cand;
  }
  console.log('\n（数字=该种族回合中位数）');
  console.log('最接近目标('+TARGET+'回合)的是：'+bestCand.name+'（总回合中位 '+bestCand.turnMed+'）');
  console.log('  hp: '+bestCand.v.hp+' / atk: '+bestCand.v.atk+' / baseCd: '+bestCand.v.cd);
}
