'use strict';
// 无头玩法机器人：加载 dungeon-raid.html 里的真实脚本（桩件顶替 DOM），自动玩并统计平衡。
const fs = require('fs');

// ---------- 1) 取出真实脚本，并在 IIFE 末尾注入导出钩子 ----------
const HTML_FILE = process.argv.includes('--dev') ? 'dungeon-raid-dev.html' : 'dungeon-raid.html';   // --dev：用开发版跑（测未发布的平衡改动）
const html = fs.readFileSync(__dirname + '/' + HTML_FILE, 'utf8');
let script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const EXPORT = `globalThis.__G={RACES,RACE_PATHS,TIER1,TIER2,UPGRADES,BOSSES,startGame,resolve,buyItem,shopCost,SHOP,activateSkill,isSwordTarget,
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
//   node playtest.js --race=orc --t1=berserker --t2=warlord --boss=zombie --enemy=C2 --games=40
const ARG = Object.fromEntries(process.argv.slice(2).map(s=>{ const m=s.match(/^--([^=]+)=?(.*)$/); return m?[m[1], m[2]]:[s,'']; }));
const FOCUS = !!(ARG.race||ARG.boss||ARG.t1||ARG.t2) || ('report' in ARG);
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
const UP_PRIORITY=['强化体魄','加固护甲','磨利刀刃','强化盾术','精研医术','淬炼锋芒','汲取生命','凝聚生机'];
const upRank=n=>{const i=UP_PRIORITY.indexOf(n);return i<0?99:i;};
function resolveLevels(){
  while(G.pendingLevels>0){
    const pool=G.rollUpgradePool();   // 用游戏真实升级池（消耗游戏 RNG），保证录像可确定性重放
    const choose=pool.slice().sort((a,b)=>upRank(a.n[0])-upRank(b.n[0]))[0];
    G.recAct(['u', G.UPGRADES.indexOf(choose)]);   // 录制升级选择（按 UPGRADES 索引，与回放一致）
    G.applyUpgrade(choose);   // 内部 u.f + 钳血 + pendingLevels--
  }
  G.busy=false;
}

function boardEnemies(){ const g=grid(),e=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=g[r][c]; if(t&&t.type==='enemy')e.push(t);} return e; }
function boardSwords(){ const g=grid(); let n=0; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=g[r][c]; if(t&&t.type==='sword')n++;} return n; }
function boardBoss(){ const g=grid(); for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=g[r][c]; if(t&&t.type==='boss')return t;} return null; }

// 一阶主动技能使用策略（仅在有利时用；囤金/点金属高风险/情境，机器人不用）
function boardHearts(){ const g=grid(); let n=0; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=g[r][c]; if(t&&t.type==='heart')n++;} return n; }
function maybeSkill(){
  const p=P(); if(!p.tier1 || p.skillCd>0) return;
  const bossT=boardBoss();
  const ens=boardEnemies().length, threat=boardEnemies().some(e=>e.cd<=1), boss=!!bossT;
  const immuneBoss=bossT && !G.isSwordTarget(bossT);  // 剑免疫 Boss（幽灵/小丑）当前在场
  const id=p.tier1;
  if(id==='knight' && (boss||threat)) G.activateSkill();        // 圣盾：将受击时
  else if(id==='priest' && boardHearts()>=3) G.activateSkill(); // 祝福：心多时转经验
  else if(id==='ranger' && ens>=2) G.activateSkill();           // 箭雨：怪多时
  else if(id==='blacksmith' && bestSimple('shield')) G.activateSkill(); // 锻甲：有盾时
  else if(id==='fighter' && (immuneBoss || ens>=2)) G.activateSkill();  // 嗜血：有剑免疫Boss(开穿透)或怪多时
  else if(id==='berserker' && threat && p.hp<=0.5*p.maxHp) G.activateSkill(); // 狂怒：将被打死时用不屈保命
  resolveLevels();
}
// 机器人处理转职选择（resolve/buyItem 触发 showTierSelect/showSkillSwap 后，apply 第一个选项）
function botTransform(){
  const p=P(); if(!p.awaitingTier) return;
  const t=p.awaitingTier;
  if(t===1){ const ids=G.RACE_PATHS[p.race].t1; const f=ARG.t1; const id=(f&&ids.includes(f))?f:ids[0]; G.recAct(['t',1,id]); p.tier1=id; }
  else if(t===2){ const ids=G.RACE_PATHS[p.race].t2; const f=ARG.t2; const id=(f&&ids.includes(f))?f:ids[0]; G.recAct(['t',2,id]); p.tier2=id; G.TIER2[id].f(p); p.hp=Math.min(p.hp,p.maxHp); }
  else if(t===3){ const id=G.RACE_PATHS[p.race].t2.find(x=>x!==p.tier2); if(id){ G.recAct(['t',3,id]); p.tier2b=id; G.TIER2[id].f(p); p.hp=Math.min(p.hp,p.maxHp); } }   // 200回合：本种族剩余被动
  else if(t===4){ const id2=p.tier1||Object.keys(G.TIER1)[0]; G.recAct(['t',4,id2,'bomb']); p.skill2={id:id2, slot:'bomb'}; p.skill2Cd=0; }   // 350回合：用自己的一阶主动替换炸弹槽
  p.awaitingTier=0; G.busy=false;
}

// ---------- 4) 单局 ----------
function playGame(rc){
  G.headless=true;   // 抑制升级弹窗在 resolve 里抽池，避免与机器人 resolveLevels 重复消耗 RNG（保证录像可重放）
  G.startGame(rc);
  let turn=0;
  for(; turn<4000; turn++){
    const p=P();
    if(p.hp<=0) break;
    botTransform();   // 处理上一步触发的转职
    // 商店（先于行动；买东西不推进回合）
    G.busy=false;
    const ens=boardEnemies(), threatened=ens.some(e=>e.cd<=1);
    const boss=boardBoss();
    if(p.hp<=0.3*p.maxHp && p.gold>=G.shopCost('heal')){ G.buyItem('heal'); botTransform(); resolveLevels(); }
    else if(boss && p.gold>=G.shopCost('bomb')){ G.buyItem('bomb'); botTransform(); resolveLevels(); }
    else if(boardEnemies().length>=4 && p.gold>=G.shopCost('bomb')){ G.buyItem('bomb'); botTransform(); resolveLevels(); }
    maybeSkill();   // 一阶主动

    // 选招
    const sword=bestSword();
    const heart=bestSimple('heart');
    const shield=bestSimple('shield');
    const coin=bestSimple('coin');

    let sel=null;
    if(p.hp<=0.35*p.maxHp && heart){ sel=toSelection(heart.path,'heart'); }
    else if(sword){ sel=toSelection(sword.path,'sword'); }
    else if(boss && p.gold<G.shopCost('bomb') && coin){ sel=toSelection(coin.path,'coin'); } // 攒钱炸Boss
    else if(p.hp<0.6*p.maxHp && heart){ sel=toSelection(heart.path,'heart'); }
    else if(p.armor<6 && shield){ sel=toSelection(shield.path,'shield'); }
    else if(coin){ sel=toSelection(coin.path,'coin'); }
    else if(shield){ sel=toSelection(shield.path,'shield'); }
    else if(heart){ sel=toSelection(heart.path,'heart'); }
    else break; // 无可行连线（极少）

    G.selection=sel;
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
if('survivors' in ARG){
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
else if('submit-ai' in ARG){
  // ---- 提交模式：跑机器人 → 本地重放校验 → 把可验证录像以 agent=ai 提交到 AI 榜 ----
  G = loadGame(); applyBossFilter(G);
  const API = ARG.api || 'https://api.dungeonraid.win';
  const races = ARG.race ? G.RACES.filter(r=>r.id===ARG.race) : G.RACES;
  if(ARG.race && !races.length){ console.error('未知种族: '+ARG.race); process.exit(1); }
  const N = ARG.games?+ARG.games:3, DRY='dry' in ARG;
  (async()=>{
    const runs=[];
    for(const rc of races){ for(let i=0;i<N;i++){
      let out; try{ out=playGame(rc); }catch(e){ console.log('✗ 跑局出错', rc.id, e.message); continue; }
      runs.push({race:rc.id, out, rec:JSON.parse(JSON.stringify(G.rec))});   // 深拷贝本局录像（下局 startGame 会覆盖 rec）
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
      const body = clear ? {level:run.out.level, rec:run.rec, agent:'ai'} : {level:run.out.level, gold:run.out.gold, rec:run.rec, agent:'ai'};
      try{
        const res=await fetch(API+ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const j=await res.json().catch(()=>({}));
        if(res.ok && (j.id||j.overall)){ posted++; console.log(`↑ ${ep} ${run.race} 回合${run.out.turns} → id ${j.id||'?'}`); }
        else { failed++; console.log(`✗ ${ep} ${run.race} HTTP${res.status} ${JSON.stringify(j).slice(0,80)}`); }
      }catch(e){ failed++; console.log('✗ 提交出错', e.message); }
      await new Promise(r=>setTimeout(r,4200));   // 限流：避开写入端点 20次/60s
    }
    console.log(`\n提交完成：${posted} 成功 / ${failed} 失败（agent=ai）。需等下一次每小时 verify 重放校验通过后才会出现在 AI 榜（榜单只显示 verified=1）。`);
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
    const path=`${ARG.t1||G.RACE_PATHS[rc.id].t1[0]}/${ARG.t2||G.RACE_PATHS[rc.id].t2[0]}`;
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
