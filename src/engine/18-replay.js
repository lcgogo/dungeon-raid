//==================== 录像回放 ====================
let replayRec=null, replayIdx=0, replayTimer=null, replaySpeed=1, replayPaused=false, replayTotalTurns=0, replayAutoPaused=false, replayPending=null;
let jumping=false;   // 跳回合快进期间：抑制 gameOver/onClear，避免（录像若不一致而提前死亡时）直接弹出结束画面
const REPLAY_BASE=620;   // 每步基础间隔 ms（按倍速缩短）
function startReplay(recObj){
  if(!recObj||!Array.isArray(recObj.acts)){ alert(tr('录像无效','Invalid recording')); return; }
  recObj.acts.forEach(a=>{ if(a&&a[0]==='t'&&typeof a[2]==='string') a[2]=normalizeClassId(a[2]); if(a&&a[0]==='b'&&a[2]==='seer'&&typeof a[1]==='string') a[1]=normalizeClassId(a[1]); });
  replayResumeState = player&&grid ? {
    player: JSON.parse(JSON.stringify(player)),
    grid: grid.map(row=>row.map(t=> t?{type:t.type,hp:t.hp,maxHp:t.maxHp,atk:t.atk,cd:t.cd,baseCd:t.baseCd,bossId:t.bossId,tier:t.tier,stolen:t.stolen,finale:t.finale,incub:t.incub,poison:t.poison,burnTurns:t.burnTurns,burnStacks:t.burnStacks}:null)),
    pendingLevels, busy, dragging:!!dragging, selection:selection?selection.map(s=>({...s})):[], rec:rec?JSON.parse(JSON.stringify(rec)):null, ended
  } : null;
  replaying=true; replayRec=recObj; replayIdx=0; replaySpeed=1; replayPaused=false; replayAutoPaused=false; replayPending=null; rec=null;
  replayTotalTurns=recObj.acts.filter(a=>a[0]==='m').length;   // 总回合数（=连线动作数）
  hideOverlay(); busy=false;
  startGame(raceById(recObj.race));    // replaying=true → 用 recObj.seed 播种、不新建录像
  document.getElementById('replayBar').classList.add('show');
  renderJumps(); updateReplayBar(); scheduleReplay();
}
function scheduleReplay(delay){ clearTimeout(replayTimer); if(replayPaused||!replaying) return; replayTimer=setTimeout(replayStep, delay==null?REPLAY_BASE/replaySpeed:delay); }
function replayStep(){
  if(!replaying) return;
  if(replayPending){   // 第二拍：结算上一拍已预显示连线的那步
    const a=replayPending; replayPending=null; replayIdx++;
    try{ dispatchReplayAct(a); }catch(e){ log('回放出错: '+e.message); replayDone(); return; }
    if(!replaying) return;   // resolve 可能已触发 gameOver→stopReplay
    // 倒数 10 回合自动暂停一次，方便看清怎么死的
    if(!replayAutoPaused && replayTotalTurns>10 && player && player.hp>0 && player.turns>=replayTotalTurns-10){
      replayAutoPaused=true; replayPaused=true; selection=[];   // 静止帧清掉连线
      log(tr('⏸ 接近尾声，已自动暂停。点 ▶ 继续看结局。','⏸ Auto-paused near the ending. Press ▶ to watch how it ends.'));
    }
    updateReplayBar(); scheduleReplay(); return;
  }
  if(replayIdx>=replayRec.acts.length){ replayDone(); return; }
  const a=replayRec.acts[replayIdx];
  if(a[0]==='m'){   // 第一拍：在「结算前」的棋盘上先把本步连线画出来，半拍后再结算（连线才对得上棋子）
    selection=a[1].map(([r,c],i)=>({r,c,type:i===0?a[2]:(grid[r][c]?grid[r][c].type:a[2])}));
    replayPending=a; updateReplayBar();
    scheduleReplay(Math.max(110, REPLAY_BASE/replaySpeed*0.5));
    return;
  }
  // 非连线动作（买道具/技能/升级/转职）：直接执行
  replayIdx++;
  try{ dispatchReplayAct(a); }catch(e){ log('回放出错: '+e.message); replayDone(); return; }
  if(!replaying) return;
  updateReplayBar(); scheduleReplay();
}
function dispatchReplayAct(a){
  const k=a[0];
  if(k==='m'){ const cells=a[1], base=a[2];
    selection=cells.map(([r,c],i)=>({r,c,type:i===0?base:(grid[r][c]?grid[r][c].type:base)}));
    resolve();
    selection=[];   // 结算后立即清：连线由 replayStep 在「结算前」的棋盘上预显示（见两拍逻辑），绝不画在已重排的棋盘上
  } else if(k==='b'){
    if(a[2]==='seer'){ activateSeerSkill(a[3], true, a[1]); }
    else buyItem(a[1]);
  }
  else if(k==='k'){
    if(a[1]==='seer') activateSeerSkill(a[2], true);
    else activateSkill();
  }
  else if(k==='a') setAutoUse(a[1],!!a[2],true);
  else if(k==='u'){ rollUpgradePool(); applyUpgrade(UPGRADES[a[1]]); updateHUD(); }   // 洗牌消耗等量 RNG（丢弃结果），按录像索引应用
  else if(k==='t'){ const tier=a[1], id=normalizeClassId(a[2]);
    if(tier===1){ player.tier1=id; }
    else if(tier===3){ player.tier2b=id; TIER2[id].f(player); player.hp=Math.min(player.hp,player.maxHp); }
    else if(tier===4){ player.skill2={id, slot:a[3]}; player.skill2Cd=0; if(player.autoUse) player.autoUse[a[3]]=false; }
    else { player.tier2=id; TIER2[id].f(player); player.hp=Math.min(player.hp,player.maxHp); }
    player.awaitingTier=0; updateHUD();
  }
}
function updateReplayBar(){
  const tt=replayTotalTurns||0;
  const turn=(player?player.turns:0)+(replayPending?1:0);   // 正在预显示连线（未结算）时，显示的是「即将完成的那一回合」
  document.getElementById('rbTxt').textContent=`🎬 ${tr('回放','Replay')}${replayPaused?' ⏸':''} · ${tr('回合','turn')} ${turn}/${tt}`;
  document.getElementById('rbFill').style.width=(tt?Math.min(100,turn/tt*100):0)+'%';
  // 步进键：仅暂停时可见（用 .hide 隐藏但保留占位，避免挤动其它按钮/进度条）；到首/末回合相应变灰
  const prev=document.getElementById('rbPrev'), next=document.getElementById('rbNext');
  if(prev&&next){ prev.classList.toggle('hide', !replayPaused); next.classList.toggle('hide', !replayPaused);
    prev.classList.toggle('dim', turn<=1); next.classList.toggle('dim', turn>=tt); }
  document.querySelectorAll('#replayBar .rbSpd').forEach(b=>b.classList.toggle('on', +b.dataset.spd===replaySpeed));
}
function replayDone(){ clearTimeout(replayTimer); replayTimer=null; replayPaused=true; replayPending=null; selection=[]; updateReplayBar(); log(tr('🎬 回放结束（点 ⏹ 退出）','🎬 Replay finished (⏹ to exit)')); }
function stopReplay(){
  clearTimeout(replayTimer); replayTimer=null;
  replaying=false; replayRec=null; replayPending=null;
  bombFx.length=0; bossFx.length=0; hookFx.length=0; clearTransientFxDom();
  document.getElementById('replayBar').classList.remove('show');
  if(replayResumeState){
    player=replayResumeState.player;
    grid=replayResumeState.grid;
    pendingLevels=replayResumeState.pendingLevels;
    busy=replayResumeState.busy;
    dragging=replayResumeState.dragging;
    selection=replayResumeState.selection;
    rec=replayResumeState.rec;
    ended=replayResumeState.ended;
    replayResumeState=null;
    syncPositions(true); updateHUD();
  }
}
// 跳到指定回合：从种子重头快进（确定性、瞬间），到目标回合后暂停
function jumpToTurn(target){
  if(!replaying||!replayRec) return;
  const rec0=replayRec, acts=rec0.acts;            // 本地持有：防止快进中误触 stopReplay 把 replayRec 置空
  clearTimeout(replayTimer); replayTimer=null; replayPending=null;
  bombFx.length=0; bossFx.length=0; hookFx.length=0; clearTransientFxDom();   // 清掉上一段残留的爆炸/入场/拖拽/拉线特效，否则会画在跳转后的棋盘上
  replayAutoPaused = target>=replayTotalTurns-10;   // 跳到接近终点就别再自动暂停
  replayIdx=0; busy=false; jumping=true; selection=[];   // 快进期间抑制 gameOver/onClear
  try{
    startGame(raceById(rec0.race));                 // replaying=true → 用 rec0.seed 重新播种
    let mSeen=0;                                    // 已结算的连线数；停在「第 target 个连线」之前
    while(replayIdx<acts.length && player.hp>0 && !player.cleared){
      const a=acts[replayIdx];
      if(a[0]==='m' && mSeen+1===target) break;     // 下一个就是目标连线 → 停下、留给下面预显示
      try{ dispatchReplayAct(a); }catch(e){ break; }
      if(a[0]==='m') mSeen++;
      replayIdx++;
    }
  } finally { jumping=false; }
  replaying=true; replayRec=rec0;                   // 恢复回放状态（以防快进里被改动）
  // 在「结算前」的棋盘上预显示目标回合的连线（线对得上棋子），暂停等用户继续
  if(replayIdx<acts.length && acts[replayIdx][0]==='m' && player.hp>0 && !player.cleared){
    const a=acts[replayIdx];
    selection=a[1].map(([r,c],i)=>({r,c,type:i===0?a[2]:(grid[r][c]?grid[r][c].type:a[2])}));
    replayPending=a;
  } else { selection=[]; replayPending=null; }
  replayPaused=true; updateReplayBar();
  const viewT=player.turns+(replayPending?1:0);
  if(!replayPending && (player.hp<=0||player.cleared))
    log(tr(`⏭ 该录像在第 ${player.turns} 回合就结束了（无法再往后跳）`,`⏭ This recording ends at turn ${player.turns} (cannot jump further)`));
  else
    log(tr(`⏭ 跳到第 ${viewT} 回合（已暂停，点 ▶ 继续）`,`⏭ Jumped to turn ${viewT} (paused, ▶ to play)`));
}
function renderJumps(){
  const box=document.getElementById('rbJumps'); if(!box) return; box.innerHTML='';
  const tt=replayTotalTurns;
  const stops=[50,100,200,350].filter(t=>t<tt);   // 固定节点，只显示录像够长的那几个
  if(!stops.length && tt<=10) return;
  const lbl=document.createElement('span'); lbl.className='rbLbl'; lbl.textContent=tr('跳到回合','Jump to'); box.appendChild(lbl);
  for(const t of stops){ const b=document.createElement('button'); b.textContent=t; b.onclick=()=>jumpToTurn(t); box.appendChild(b); }
  if(tt>10){ const b=document.createElement('button'); b.textContent='−10'; b.title=tr('跳到倒数第 10 回合（看结局）','Jump to 10 turns from the end'); b.onclick=()=>jumpToTurn(Math.max(1,tt-10)); box.appendChild(b); }   // 倒数第10回合
}
// 暂停/继续（点棋盘触发，见 startDrag）
function togglePauseReplay(){ if(!replaying) return; if(replayIdx>=(replayRec?replayRec.acts.length:0)) return; replayPaused=!replayPaused; if(replayPaused){ selection=[]; replayPending=null; } updateReplayBar(); scheduleReplay(); }
// 步进一回合（确定性从种子重跑到目标回合，内部会暂停）
function stepReplay(dir){ if(!replaying||!replayRec) return; const cur=(player?player.turns:0)+(replayPending?1:0); const target=Math.max(1, Math.min(replayTotalTurns, cur+dir)); if(target!==cur) jumpToTurn(target); }
document.getElementById('rbPrev').onclick=()=>stepReplay(-1);
document.getElementById('rbNext').onclick=()=>stepReplay(1);
document.getElementById('rbExit').onclick=()=>{ const hadLive=!!replayResumeState; stopReplay(); if(hadLive){ hideOverlay(); busy=false; } else showClassSelect(); };
document.querySelectorAll('#replayBar .rbSpd').forEach(b=>{ b.onclick=()=>{ replaySpeed=+b.dataset.spd; updateReplayBar(); scheduleReplay(); }; });
