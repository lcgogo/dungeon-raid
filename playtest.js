'use strict';
// 无头玩法机器人：加载 dungeon-raid.html 里的真实脚本（桩件顶替 DOM），自动玩并统计平衡。
const fs = require('fs');

// ---------- 1) 取出真实脚本，并在 IIFE 末尾注入导出钩子 ----------
const html = fs.readFileSync(__dirname + '/dungeon-raid.html', 'utf8');
let script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const EXPORT = `globalThis.__G={CLASSES,UPGRADES,startGame,resolve,buyItem,shopCost,SHOP,
  get grid(){return grid}, set grid(v){grid=v},
  get player(){return player},
  set selection(v){selection=v},
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
  for(const[r,c]of path){ const t=g[r][c]; if(t.type==='sword')nS++; else if(t.type==='enemy')enemies.push(t); }
  const combo=1+Math.max(0,nS-2)*0.15;
  let pool=(nS*p.weaponPower+p.swordFlat)*combo;
  if(p.berserk && p.hp<p.maxHp*0.5) pool*=1.5;
  pool=Math.floor(pool);
  let kills=0, threat=0;
  for(const e of enemies){ if(pool>=e.hp){ kills++; threat+=e.atk*(e.cd<=1?3:1); } }
  return { nS, enemies:enemies.length, kills, threat, len:path.length };
}

function bestSword(){
  const g=grid(); let best=null;
  const pred=t=>t&&(t.type==='sword'||t.type==='enemy');
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const t=g[r][c]; if(!t||!(t.type==='sword'||t.type==='enemy'))continue;
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
const UP_PRIORITY=['强健体魄','重型护甲','磨利刀刃','坚盾强化','神圣治疗','狂战之力','吸血鬼','生命恢复','贪婪之心'];
function resolveLevels(){
  while(G.pendingLevels>0){
    const pool=shuffle(G.UPGRADES).slice(0,3);
    pool.sort((a,b)=>UP_PRIORITY.indexOf(a.n)-UP_PRIORITY.indexOf(b.n));
    pool[0].f(P()); P().hp=Math.min(P().hp,P().maxHp);
    G.pendingLevels=G.pendingLevels-1;
  }
  G.busy=false;
}

function boardEnemies(){ const g=grid(),e=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=g[r][c]; if(t&&t.type==='enemy')e.push(t);} return e; }

// ---------- 4) 单局 ----------
function playGame(cls){
  G.startGame(cls);
  let turn=0;
  for(; turn<4000; turn++){
    const p=P();
    if(p.hp<=0) break;
    // 商店（先于行动；买东西不推进回合）
    G.busy=false;
    const ens=boardEnemies(), threatened=ens.some(e=>e.cd<=1);
    if(p.hp<=0.3*p.maxHp && p.gold>=G.shopCost('heal')){ G.buyItem('heal'); resolveLevels(); }
    if(boardEnemies().length>=4 && p.gold>=G.shopCost('bomb')){ G.buyItem('bomb'); resolveLevels(); }
    if(p.armor===0 && threatened && p.gold>=G.shopCost('armor')){ G.buyItem('armor'); resolveLevels(); }

    // 选招
    const sword=bestSword();
    const heart=bestSimple('heart');
    const shield=bestSimple('shield');
    const coin=bestSimple('coin');

    let sel=null;
    if(p.hp<=0.35*p.maxHp && heart){ sel=toSelection(heart.path,'heart'); }
    else if(sword){ sel=toSelection(sword.path,'sword'); }
    else if(p.hp<0.6*p.maxHp && heart){ sel=toSelection(heart.path,'heart'); }
    else if(p.armor<p.armorCap*0.5 && shield){ sel=toSelection(shield.path,'shield'); }
    else if(coin){ sel=toSelection(coin.path,'coin'); }
    else if(shield){ sel=toSelection(shield.path,'shield'); }
    else if(heart){ sel=toSelection(heart.path,'heart'); }
    else break; // 无可行连线（极少）

    G.selection=sel;
    G.resolve();
    if(P().hp<=0){ turn++; break; }
    resolveLevels();
  }
  const p=P();
  return { level:p.level, turns:p.turns, gold:p.gold, maxHp:p.maxHp, died:p.hp<=0, loopTurns:turn };
}

// ---------- 5) 批量跑 ----------
const GAMES=25;
const med=arr=>{ const a=arr.slice().sort((x,y)=>x-y); return a[Math.floor(a.length/2)]; };
const avg=arr=>arr.reduce((s,x)=>s+x,0)/arr.length;
function runBatch(){
  const out=[];
  for(const cls of G.CLASSES){
    const res=[];
    for(let i=0;i<GAMES;i++){ try{ res.push(playGame(cls)); }catch(e){ res.push({error:e.message}); } }
    const ok=res.filter(r=>!r.error);
    const levels=ok.map(r=>r.level), turns=ok.map(r=>r.turns);
    out.push({ cls:cls.n, games:ok.length,
      lvl_med:med(levels), lvl_avg:+avg(levels).toFixed(1), lvl_max:Math.max(...levels),
      turn_med:med(turns), turn_avg:Math.round(avg(turns)), turn_max:Math.max(...turns),
      capped:ok.filter(r=>!r.died).length, errors:res.length-ok.length, err0:(res.find(r=>r.error)||{}).error });
  }
  return out;
}
// 目标：总回合中位 ≈ 60。扫一批更硬的候选，自动挑最接近的。
const TARGET=60;
const CANDIDATES=[
  { name:'F atk0.8/cd3-4', v:{ hp:'3 + Math.floor(Math.random()*3) + Math.floor(lv*0.7)', atk:'2 + Math.floor(lv*0.8)', cd:'3 + Math.floor(Math.random()*2)', chance:'Math.min(0.32, 0.11 + player.level*0.015)' } },
  { name:'G atk1.0/cd2-3', v:{ hp:'3 + Math.floor(Math.random()*3) + Math.floor(lv*0.8)', atk:'3 + Math.floor(lv*1.0)', cd:'2 + Math.floor(Math.random()*2)', chance:'Math.min(0.34, 0.12 + player.level*0.016)' } },
  { name:'H atk1.2/cd2-3', v:{ hp:'4 + Math.floor(Math.random()*3) + Math.floor(lv*0.9)', atk:'3 + Math.floor(lv*1.2)', cd:'2 + Math.floor(Math.random()*2)', chance:'Math.min(0.36, 0.13 + player.level*0.017)' } },
  { name:'I atk1.0/cd1-2', v:{ hp:'3 + Math.floor(Math.random()*3) + Math.floor(lv*0.8)', atk:'3 + Math.floor(lv*1.0)', cd:'1 + Math.floor(Math.random()*2)', chance:'Math.min(0.34, 0.12 + player.level*0.016)' } },
];
console.log('扫描更硬候选（每职业 '+GAMES+' 局），目标总回合中位 ≈ '+TARGET+'\n');
console.log('候选             | 骑士 狂战 盗贼 牧师 | 等级中位均 | 回合中位');
console.log('-----------------|--------------------|-----------|--------');
let bestCand=null;
for(const cand of CANDIDATES){
  G = loadGame(variant(cand.v));
  const out = runBatch();
  const lvls = out.map(r=>r.lvl_med);
  const avgLvl = (lvls.reduce((a,b)=>a+b,0)/lvls.length).toFixed(1);
  const turnMed = med(out.map(r=>r.turn_med));
  const byCls = {}; out.forEach(r=>byCls[r.cls]=r.lvl_med);
  console.log(
    cand.name.padEnd(16)+' | '+
    String(byCls['骑士']).padStart(4)+String(byCls['狂战士']).padStart(5)+
    String(byCls['盗贼']).padStart(5)+String(byCls['牧师']).padStart(5)+' | '+
    String(avgLvl).padStart(9)+' | '+String(turnMed).padStart(6));
  cand.turnMed=turnMed; cand.avgLvl=avgLvl;
  if(!bestCand || Math.abs(turnMed-TARGET)<Math.abs(bestCand.turnMed-TARGET)) bestCand=cand;
}
console.log('\n最接近目标('+TARGET+'回合)的是：'+bestCand.name+'（回合中位 '+bestCand.turnMed+'，等级中位均 '+bestCand.avgLvl+'）');
console.log('对应数值：');
console.log('  hp: '+bestCand.v.hp);
console.log('  atk: '+bestCand.v.atk);
console.log('  baseCd: '+bestCand.v.cd);
console.log('  enemyChance: '+bestCand.v.chance);
