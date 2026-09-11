//==================== 初始化 ====================
let __seedCtr=0;
let pendingServerSeed=null;   // 选种族页预取的服务端 seed：只保留 1 个，优先本地 warm seed，再按 race+version 复用，避免点种族后现等
const SEED_WARM_MS=71*60*60*1000;   // 服务端 token 标称 72h；前端本地预热保守 71h，避免边界时刻刚好过期
function serverSeedKey(rc){ return rc&&rc.id ? `${rc.id}|${VERSION}` : ''; }
function preferredSeedRace(){
  try{
    const save=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    if(save&&save.player&&raceById(save.player.race).id===save.player.race) return raceById(save.player.race);
  }catch(e){}
  const last=getLastRec();
  if(last&&last.race) return raceById(last.race);
  return RACES[0];
}
function warmSeedExpiry(){ return Date.now()+SEED_WARM_MS; }
function readWarmSeed(rc){
  if(DEV||!rc) return null;
  try{
    const raw=localStorage.getItem(SEED_POOL_KEY); if(!raw) return null;
    const x=JSON.parse(raw);
    const key=serverSeedKey(rc);
    if(!x || x.used || !x.token || typeof x.seed!=='number' || x.key!==key || x.ver!==VERSION || !x.expiresAt || x.expiresAt<=Date.now()){ localStorage.removeItem(SEED_POOL_KEY); return null; }
    return {seed:x.seed>>>0, token:x.token};
  }catch(e){ try{ localStorage.removeItem(SEED_POOL_KEY); }catch(_e){} return null; }
}
function storeWarmSeed(rc, srv){
  if(DEV||!rc||!srv||typeof srv.seed!=='number'||!srv.token) return;
  try{
    localStorage.setItem(SEED_POOL_KEY, JSON.stringify({
      key: serverSeedKey(rc),
      ver: VERSION,
      seed: srv.seed>>>0,
      token: srv.token,
      issuedAt: Date.now(),
      expiresAt: warmSeedExpiry(),
    }));
  }catch(e){}
}
function consumeWarmSeed(rc){
  const srv=readWarmSeed(rc);
  if(srv){ try{ localStorage.removeItem(SEED_POOL_KEY); }catch(e){} }
  return srv;
}
function purgeWarmSeed(){
  try{
    const raw=localStorage.getItem(SEED_POOL_KEY); if(!raw) return;
    const x=JSON.parse(raw);
    if(!x || x.used || !x.token || typeof x.seed!=='number' || x.ver!==VERSION || !x.expiresAt || x.expiresAt<=Date.now()) localStorage.removeItem(SEED_POOL_KEY);
  }catch(e){ try{ localStorage.removeItem(SEED_POOL_KEY); }catch(_e){} }
}
function prefetchServerSeed(rc){
  if(DEV||!rc) return null;
  if(typeof navigator!=='undefined' && navigator.onLine===false) return null;
  if(readWarmSeed(rc)) return Promise.resolve(readWarmSeed(rc));
  const key=serverSeedKey(rc); if(!key) return null;
  if(pendingServerSeed && pendingServerSeed.key===key) return pendingServerSeed.promise || Promise.resolve(pendingServerSeed.srv||null);
  const slot={key,srv:null,promise:null};
  slot.promise=fetchServerSeed(rc).then(srv=>{
    if(pendingServerSeed===slot){
      slot.srv=srv||null;
      slot.promise=null;
      if(srv) storeWarmSeed(rc, srv);
    }
    return srv||null;
  }).catch(()=>{
    if(pendingServerSeed===slot){ slot.srv=null; slot.promise=null; }
    return null;
  });
  pendingServerSeed=slot;
  return slot.promise;
}
function pendingSeedPromise(rc){
  const key=serverSeedKey(rc);
  if(pendingServerSeed && pendingServerSeed.key===key){
    if(pendingServerSeed.promise) return pendingServerSeed.promise;
    if(pendingServerSeed.srv) return Promise.resolve(pendingServerSeed.srv);
  }
  return null;
}
function consumePrefetchedServerSeed(rc){
  const warm=consumeWarmSeed(rc); if(warm) return warm;
  const key=serverSeedKey(rc);
  if(pendingServerSeed && pendingServerSeed.key===key && pendingServerSeed.srv){ const srv=pendingServerSeed.srv; pendingServerSeed=null; return srv; }
  return null;
}
// 正式版服务端种子请求：页面启动时只清理/读取本地 warm seed；进入选种族页后若本地没有，再偷偷预取 1 个；真开局时优先消费本地或同 race + version 的预取结果，没命中再现拉。
async function fetchServerSeed(rc){
  if(DEV) return null;
  if(typeof navigator!=='undefined' && navigator.onLine===false) return null;
  try{
    const qs = new URLSearchParams({ race: rc.id, version: VERSION });
    const r=await fetch(REC_API+'/seed?'+qs.toString(),{method:'POST'});
    if(r&&r.ok){ const x=await r.json(); if(typeof x.seed==='number'&&x.token) return {seed:x.seed>>>0, token:x.token}; }
  }catch(e){}
  return null;
}

async function fetchThresholdSnapshot(race, version, agent){
  try{
    const qs = new URLSearchParams({ race, version, agent: agent||'human' });
    const r = await fetch(REC_API+'/threshold?'+qs.toString());
    if(r&&r.ok){ const x = await r.json(); return x && x.threshold ? x.threshold : null; }
  }catch(e){}
  return null;
}
// 顶部居中的临时提示条，数秒后淡出（纯 UI，不影响逻辑/重放）
function toast(html, ms){
  if(headless||replaying) return;
  let el=document.getElementById('toast');
  if(!el){ el=document.createElement('div'); el.id='toast'; document.body.appendChild(el); }
  el.style.cssText='position:fixed;left:50%;top:13%;transform:translateX(-50%);max-width:86%;z-index:70;background:rgba(40,32,16,.96);border:1px solid var(--gold);color:#ffe9a8;font-size:13px;line-height:1.55;padding:10px 14px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.55);text-align:center;transition:opacity .45s;opacity:1';
  el.innerHTML=html;
  clearTimeout(toast._t); toast._t=setTimeout(()=>{ el.style.opacity='0'; }, ms||4200);
}
// 没拿到服务端种子时的统一提示：醒目 toast + 日志，讲清「本地随机、照常可玩、只是不计榜」
function offlineSeedNotice(){
  log(tr('⚠️ 没拿到服务端种子：本局本地随机，照常可玩，只是不计排行榜。','⚠️ No server seed: local random run — fully playable, just not ranked.'), 'debuff');
  toast(tr('⚠️ 没拿到服务端种子，本局用<b>本地随机</b>开局<br>照常可玩，<b>只是不计排行榜</b>','⚠️ No server seed — using a <b>local random</b> seed<br>fully playable, <b>just not ranked</b>'));
}
// 开新局入口：正式版优先消费本地 warm seed；若本地没有，再复用选种族页里的同 race+version 预取结果，最后才现拉；dev 或离线失败 → 本地随机（可玩，不计排名）
async function freshStart(rc){
  if(DEV){ startGame(rc); return; }
  if(typeof navigator!=='undefined' && navigator.onLine===false){ startGame(rc); offlineSeedNotice(); return; }   // 明确离线：秒开不等
  let srv=consumePrefetchedServerSeed(rc);
  if(!srv){
    const pending=pendingSeedPromise(rc);
    try{ srv=await Promise.race([ pending || fetchServerSeed(rc), new Promise(res=>setTimeout(()=>res(null), 2500)) ]); }catch(e){}
  }
  startGame(rc, srv);
  if(!srv) offlineSeedNotice();
}
function startGame(rc, srv){   // srv={seed,token}：服务端发的种子（正式版上榜用）；缺省则本地随机（dev / 离线，不计排名）
  ended=false;   // 新局开始，重新允许存档
  let firstGame=false;
  if(replaying){ srand(replayRec.seed); firstGame=!!replayRec.tut; }   // 回放：是否新手局以录像里的 tut 标志为准（保持棋盘可复现）
  else {
    try{ firstGame = !localStorage.getItem(TUT_KEY); }catch(e){}        // 本机第一次游玩
    const seed = (srv && typeof srv.seed==='number') ? (srv.seed>>>0) : (((Date.now()>>>0)^(__seedCtr++*0x9E3779B9))>>>0); srand(seed);
    rec={v:1,seed,ver:VERSION,race:rc.id,t0:Date.now(),acts:[]};        // ver：版本分桶；t0：开局时刻
    if(srv && srv.token) rec.token=srv.token;                          // 服务端种子 token：提交时随录像带上、供 worker 校验
    if(firstGame){ rec.tut=1; try{ localStorage.setItem(TUT_KEY,'1'); }catch(e){} }
    saveRec();
  }
  player=newPlayer(); player.race=rc.id; rc.f(player); player.hp=player.maxHp;
  player.autoUse={heal:false,bomb:false};   // 新局不继承上一局的自动释放状态；只有“继续上局”才恢复存档状态
  selection=[]; dragging=false; busy=false; pendingLevels=0;
  grid=[];
  for(let r=0;r<ROWS;r++){ grid[r]=[]; for(let c=0;c<COLS;c++){
    const pool=connectablePool();
    let type = rnd()<0.08 ? 'enemy'
             : pool[Math.floor(rnd()*pool.length)];
    grid[r][c]=makeTile(type);
  }}
  player.fireChainTurn=false;
  if(firstGame) seedTutorialBoard();   // 新手第一局：保证棋盘里有一只怪、且能被多把剑连起来（剑-怪-剑）
  syncPositions(true);
  hideOverlay(); logClear();
  log(tr(`【${rc.e}${L(rc.n)}】踏入地牢… 祝你好运！`, `${rc.e}${L(rc.n)} enters the dungeon… good luck!`));
  updateHUD();
}
// 新手第一局教学棋盘：在内部格放一只弱怪，左右各一把剑（剑-怪-剑，可连成穿怪剑链一击带走）。用 rnd() 故确定可重放。
function seedTutorialBoard(){
  const r=1+Math.floor(rnd()*(ROWS-2)), c=1+Math.floor(rnd()*(COLS-2));
  const e=makeTile('enemy'); e.hp=e.maxHp=2;   // 压低血量，2 把剑即可秒杀，教学手感更好
  grid[r][c]=e; grid[r][c-1]=makeTile('sword'); grid[r][c+1]=makeTile('sword');
}
