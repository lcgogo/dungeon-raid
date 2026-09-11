//==================== 升级（技能三选一）====================
const UPGRADES=[
  {n:['强化体魄','Fortify Body'],  d:p=>{const v=Math.round(6*(p.maxHpUpMult||1)), h=Math.round(v*(p.healMult||1)); return [`最大生命 +${v}，回血 ${h}`,`+${v} max HP, heal ${h}`];}, f:p=>{const v=Math.round(6*(p.maxHpUpMult||1)); p.maxHp+=v; p.hp=Math.min(p.maxHp, p.hp+Math.round(v*(p.healMult||1)));}}, // 兽人×2上限/回12，精灵×0.5上限/回3，活死人治疗减半→回3；不再回满
  {n:['磨利刀刃','Sharpen Blade'], d:['{W}伤 +50%（连越长收益越大）','+50% {W} power (longer chains gain more)'], f:p=>{p.weaponPower+=0.5;}},
  {n:['淬炼锋芒','Temper Edge'],   d:['每次{WC}额外 +3 固定伤害','+3 flat damage per {WC}'], f:p=>{p.swordFlat+=3;}},
  {n:['加固护甲','Reinforce Armor'], d:['立即 +1 减伤','+1 damage reduction now'], f:p=>{ if(!p.noArmor) p.armor+=1; }}, // 兽人无甲：无效
  {n:['强化盾术','Hone Shielding'], d:['每个盾提供的护甲 +1','+1 Armor progress per shield'], f:p=>{p.armorPerShield+=1;}},
  {n:['精研医术','Refine Healing'], d:['每颗心回复生命 +1','+1 HP healed per heart'], f:p=>{p.healPerHeart+=1;}},
  {n:['搜刮财富','Gather Gold'],   d:['每枚金币收益 +1','+1 gold per coin'], f:p=>{p.goldPerCoin+=1;}},
  {n:['汲取生命','Drain Life'],    d:['每击杀一只怪物回复 1 生命','Heal 1 HP per enemy killed'], f:p=>{p.lifesteal+=1;}},
  {n:['凝聚生机','Channel Vitality'], d:['每次选择时，「每回合自动回复」+1（第1次回1，第2次回2，第3次回3…）','Each pick increases per-turn regen by +1 more than last time (1, then 2, then 3, ...)'], f:p=>{ const next=(p.regenLevel||0)+1; p.regenLevel=next; p.regen+=next; }},
];
// 升级三选一的洗牌（消耗 RNG）——供 UI 与回放共用，确保 RNG 消耗一致
function rollUpgradePool(){
  // 兽人无甲：剔除护甲相关升级（死选项）
  const avail=player.noArmor ? UPGRADES.filter(u=>u.n[0]!=='加固护甲'&&u.n[0]!=='强化盾术') : UPGRADES;
  const arr=[...avail];
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr.slice(0,(player.upgradeChoices||3));  // 将军：四选一（确定性 Fisher-Yates，避免 sort 比较器跨引擎耗 RNG 不一致）
}
function applyUpgrade(u){ u.f(player); player.hp=Math.min(player.hp,player.maxHp); pendingLevels--; }
function deferLevelUpAfterActive(){
  if(!pendingLevels || replaying || headless) return false;
  busy=true; updateHUD();
  setTimeout(()=>{
    if(ended || !player || player.hp<=0) return;
    busy=false; showLevelUp();
  }, ACTIVE_POPUP_WAIT);
  return true;
}
function showLevelUp(){
  if(replaying||headless) return;   // 回放/无头：升级由动作序列(或机器人)驱动，不弹窗、不在此抽池（避免重复消耗RNG）
  busy=true;
  const pool=rollUpgradePool();
  const card=document.getElementById('card');
  card.innerHTML=`<h2>${tr(`⬆️ 升到 ${player.level} 级！`,`⬆️ Level ${player.level}!`)}</h2><p>${tr('选择一项强化','Pick one upgrade')}</p>`;
  pool.forEach(u=>{
    const b=document.createElement('button'); b.className='choice';
    b.innerHTML=`<b>${L(u.n)}</b><small>${L(typeof u.d==='function'?u.d(player):u.d)}</small>`;
    b.onclick=()=>{ recAct(['u', UPGRADES.indexOf(u)]); player.chosenPerks.push(u.id); applyUpgrade(u);   // 录制升级选择（按 UPGRADES 索引）
      log(tr(`⬆️ 升级选择：${L(u.n)}`,`⬆️ Upgrade picked: ${L(u.n)}`), 'buff');
      if(pendingLevels>0){ showLevelUp(); } else { busy=false; hideOverlay(); }
      updateHUD(); };   // 必须在 busy 置回 false 之后刷新，否则技能/商店按钮一直禁用到下一回合
    card.appendChild(b);
  });
  showOverlay();
}

function gameOver(){
  if(jumping) return;   // 跳回合快进中：不弹结束画面（循环靠 hp>0 自行停下）
  ended=true;   // 本局结束，封死后续存档写入
  busy=true;
  const durMs=playMs();   // 游玩时长（须在 stopReplay 清空 replayRec 之前取）
  const wasReplay=replaying;
  if(rec){ rec.maxHp=player.maxHp; rec.level=player.level; rec.gold=player.gold; rec.turns=player.turns; rec.cleared=!!player.cleared; rec.token=rec.token||(player.token||''); rec.perks=player.chosenPerks.slice(); }
  if(wasReplay){ stopReplay(); }                 // 回放播到死亡：停止回放，照常显示死亡报告
  else { saveBest(); clearSave();
    try{ if(rec) localStorage.setItem(REC_LAST_KEY, JSON.stringify(rec)); }catch(e){}  // 保存本局完整录像供回放
  }
  // 死亡报告：血死时列伤害来源；死局时直接说明“被怪物淹没，无路可走”，避免把本回合零星伤害误当成死因
  const dmg=player.dmgBy||{};
  const ents=Object.entries(dmg).filter(([k,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const tot=ents.reduce((s,[,v])=>s+v,0);
  let report='';
  if(player.deathMode==='deadlock'){
    report=`<div style="text-align:left;margin:4px 0 10px;background:var(--panel2);border-radius:10px;padding:8px 10px;font-size:12px;color:var(--dim);line-height:1.7">${player.finaleStarted
      ? tr('👑 被 Boss 淹没，无路可走。','👑 Overrun by bosses — no way out.')
      : tr('🪦 被怪物淹没，无路可走。','🪦 Overrun by monsters — no way out.')}</div>`;
  }else if(ents.length){
    const rows=ents.slice(0,3).map(([k,v])=>{ const s=dmgSourceLabel(k);   // 仅列前 3 大来源，控高
      const pct=Math.round(v/tot*100);
      return `<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 6px;font-size:12px">
        <span>${s.emoji} ${L(s.name)}</span><b style="color:var(--gold)">${Math.round(v)} · ${pct}%</b></div>`; }).join('');
    report=`<div style="text-align:left;margin:4px 0 10px;background:var(--panel2);border-radius:10px;padding:5px 4px">
      <div style="text-align:center;color:var(--dim);font-size:11px;margin-bottom:1px">${tr('☠️ 致命回合伤害来源','☠️ Killing blow — damage this turn')}</div>${rows}</div>`;
  }
  const card=document.getElementById('card');
  card.innerHTML=`<h2 style="color:var(--hp);margin-bottom:4px">${tr('💀 你倒下了','💀 You fell')}</h2>
    <p style="margin-bottom:8px">${tr('地牢吞噬了又一位冒险者…','The dungeon claims another adventurer…')}</p>
    <div style="font-size:14px;margin-bottom:8px">${tr('等级','Lv')} <b style="color:var(--gold)">${player.level}</b> · 💰<b style="color:var(--gold)">${player.gold}</b> · <b style="color:var(--gold)">${player.turns}</b> ${tr('回合','turns')}</div>
    <div style="font-size:12px;color:var(--dim);margin:-4px 0 8px">⏱ ${tr('用时','Played')} ${fmtDur(durMs)}</div>
    ${report}
    ${settlementLogBox()}
    ${DEV?'':`<div id="rankBox" style="text-align:left;margin:4px 0 12px;background:var(--panel2);border-radius:10px;padding:6px 4px;min-height:20px"></div>`}
    <div style="display:flex;gap:6px;justify-content:center;margin-bottom:8px;flex-wrap:wrap">
      <button class="choice" id="goReplay" style="width:auto;margin:0;padding:7px 12px">🎬 ${tr('回放本局','Replay')}</button>
      <button class="choice" id="goShare" style="width:auto;margin:0;padding:7px 12px">🔗 ${tr('分享链接','Share')}</button>
      <button class="choice" id="goCopy" style="width:auto;margin:0;padding:7px 12px">📋 ${tr('复制录像','Copy')}</button>
      <button class="choice" id="goExport" style="width:auto;margin:0;padding:7px 12px">⏬ ${tr('导出','Export')}</button>
      <button class="choice" id="goBoard" style="width:auto;margin:0;padding:7px 12px;border-color:#a8852c">🏆 ${tr('排行榜','Board')}</button>
    </div>
    <button class="btn" id="again">${tr('换个职业再来','Play again')}</button>`;
  document.getElementById('again').onclick=showRaceSelect;   // 重开直接到选种族（落地页仅 boot 看）
  const finished=getLastRec();
  wireEndButtons(finished);
  showOverlay();
  if(!DEV && !wasReplay && !headless && finished){
    canReachApi().then(ok=>{
      if(!ok) toast(tr('⚠️ 当前无法连接排行榜服务：本局录像已保留，可稍后从回放详情里补交。','⚠️ Leaderboard service is unreachable right now: this run is preserved and can be resubmitted later from replay details.'));
      submitScore(finished, player.level, player.gold);
    });
  }   // 正式版：上报分数 + 显示百分位（dev/回放/无头机器人不参与）
}
// 破关：撑过终焉 10 波。胜利结算 + 破关榜（按最低等级排名）
function onClear(){
  if(jumping){ player.cleared=true; return; }   // 跳回合快进中：标记破关但不弹结束画面
  busy=true; player.cleared=true; ended=true;   // 破关也结束本局，封死后续存档
  const durMs=playMs();   // 游玩时长（须在 stopReplay 前取）
  const wasReplay=replaying;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t&&t.bossId==='finale') grid[r][c]=null; }  // 移除终焉之主
  if(rec){ rec.maxHp=player.maxHp; rec.level=player.level; rec.gold=player.gold; rec.turns=player.turns; rec.cleared=!!player.cleared; rec.perks=player.chosenPerks.slice(); }
  if(wasReplay){ stopReplay(); }
  else { saveBest(); clearSave(); try{ if(rec) localStorage.setItem(REC_LAST_KEY, JSON.stringify(rec)); }catch(e){} }
  const card=document.getElementById('card');
  card.innerHTML=`<h2 style="color:var(--gold);margin-bottom:4px">🏆 ${tr('破关！','CLEARED!')}</h2>
    <p style="line-height:1.6;margin-bottom:8px">${tr('🎉 终焉之主的浪潮退去，你撑过全部 10 波，成为第一个活着走出地牢的冒险者——「再无人生还」的传说终于有了结局。','🎉 The Overlord’s waves recede; you survived all 10 and became the first to walk out of the dungeon alive — the legend that “none returned” finally has its ending.')} <span style="color:var(--dim)">${tr('感谢游玩这份致敬之作 🙏','Thanks for playing this tribute 🙏')}</span></p>
    <div style="font-size:14px;margin-bottom:8px">${tr('破关等级','Clear Lv')} <b style="color:var(--gold)">${player.level}</b> <span style="color:var(--dim);font-size:11px">${tr('越低越强','lower=better')}</span> · 💰<b style="color:var(--gold)">${player.gold}</b> · <b style="color:var(--gold)">${player.turns}</b> ${tr('回合','t')}</div>
    <div style="font-size:12px;color:var(--dim);margin:-4px 0 8px">⏱ ${tr('用时','Played')} ${fmtDur(durMs)}</div>
    ${settlementLogBox()}
    ${DEV?'':`<div id="rankBox" style="text-align:left;margin:4px 0 12px;background:var(--panel2);border-radius:10px;padding:6px 4px;min-height:20px"></div>`}
    <div style="display:flex;gap:6px;justify-content:center;margin-bottom:8px;flex-wrap:wrap">
      <button class="choice" id="goReplay" style="width:auto;margin:0;padding:7px 12px">🎬 ${tr('回放本局','Replay')}</button>
      <button class="choice" id="goShare" style="width:auto;margin:0;padding:7px 12px">🔗 ${tr('分享链接','Share')}</button>
      <button class="choice" id="goCopy" style="width:auto;margin:0;padding:7px 12px">📋 ${tr('复制录像','Copy')}</button>
      <button class="choice" id="goExport" style="width:auto;margin:0;padding:7px 12px">⏬ ${tr('导出','Export')}</button>
      <button class="choice" id="goBoard" style="width:auto;margin:0;padding:7px 12px;border-color:#a8852c">🏆 ${tr('排行榜','Board')}</button>
    </div>
    <button class="btn" id="again">${tr('再来一局','Play again')}</button>`;
  document.getElementById('again').onclick=showRaceSelect;   // 重开直接到选种族（落地页仅 boot 看）
  const finished=getLastRec();
  wireEndButtons(finished);
  showOverlay();
  if(!DEV && !wasReplay && !headless && finished){
    canReachApi().then(ok=>{
      if(!ok) toast(tr('⚠️ 当前无法连接排行榜服务：本局录像已保留，可稍后从回放详情里补交。','⚠️ Leaderboard service is unreachable right now: this run is preserved and can be resubmitted later from replay details.'));
      submitClear(finished, player.level);
    });
  }   // 正式版：上报破关榜（dev/回放/无头机器人不参与）
}
async function canReachApi(){
  try{
    const res=await fetch(REC_API+'/top?agent=human&n=1&recent=1', {method:'GET'});
    return !!(res && res.ok);
  }catch(e){ return false; }
}
async function submitReplayRecord(recObj, box){
  if(!recObj || !box) return;
  const turns = recObj.turns!=null ? recObj.turns : (recObj.acts ? recObj.acts.filter(a=>a[0]==='m').length : 0);
  const level = recObj.level|0;
  const gold = recObj.gold|0;
  box.innerHTML=`<div style="text-align:center;color:var(--dim);font-size:12px">${tr('⏳ 正在补交排行榜…','⏳ Resubmitting to leaderboard…')}</div>`;
  if(recObj.cleared) await submitClear(recObj, level); else await submitScore(recObj, level, gold);
}
function wireEndButtons(finished){
  const rep=document.getElementById('goReplay'), sh=document.getElementById('goShare'), cp=document.getElementById('goCopy'), ex=document.getElementById('goExport');
  const bd=document.getElementById('goBoard'); if(bd) bd.onclick=()=>showLeaderboard();   // 看榜与是否有录像无关
  if(finished){
    rep.onclick=()=>startReplay(finished);
    sh.onclick=()=>shareRec(finished, sh);
    cp.onclick=()=>{ const s=JSON.stringify(finished); try{ navigator.clipboard.writeText(s); log(tr('📋 录像已复制到剪贴板','📋 Recording copied')); }catch(e){ prompt(tr('复制以下录像：','Copy this recording:'), s); } };
    ex.onclick=()=>exportRec(finished);
  } else if(rep){ rep.style.display=sh.style.display=cp.style.display=ex.style.display='none'; }
}
// 正式版上报破关，回填破关榜（按最低破关等级）名次
function uploadFailToast(msg, err){
  const raw=(err&&err.message)||'';
  if(raw.includes('unknown-or-expired')){ toast(tr(`⚠️ ${msg}：服务端种子已过期（72h），请重新开局获取新种子`,`⚠️ ${msg}: server seed expired (72h) — start a new run for a fresh seed`)); return; }
  if(raw.includes('used')){ toast(tr(`⚠️ ${msg}：这枚服务端种子已被使用，不能重复提交`,`⚠️ ${msg}: this server seed was already used and cannot be submitted again`)); return; }
  if(raw.includes('seed-mismatch')){ toast(tr(`⚠️ ${msg}：录像和服务端种子不匹配`,`⚠️ ${msg}: recording does not match the server seed`)); return; }
  if(raw.includes('below upload threshold')){ toast(tr(`⚠️ ${msg}：本局未达到上传门槛`,`⚠️ ${msg}: this run did not reach the upload threshold`)); return; }
  toast(tr(`⚠️ ${msg}：网络或服务异常，请稍后重试`,`⚠️ ${msg}: network or service issue — please try again later`));
}
async function submitClear(r, level){
  const box=document.getElementById('rankBox'); if(!box) return;
  if(!r.token){ box.innerHTML=`<div style="text-align:center;color:var(--dim);font-size:12px">${tr('🔌 本局未用服务端种子（离线），未计破关榜','🔌 Offline run (no server seed) — not on clear board')}</div>`; return; }
  box.innerHTML=`<div style="text-align:center;color:var(--dim);font-size:12px;margin-bottom:4px">${tr('🔏 服务端种子有效期：现实时间 72 小时（过期后不可补交）','🔏 Server seed valid for 72 real-time hours (cannot be resubmitted after expiry)')}</div>`;
  if(!r.threshold) r.threshold = await fetchThresholdSnapshot(r.race, r.ver||VERSION, 'human');
  if(r.threshold && !((r.threshold.upload_min_turns<=0) || (((r.threshold.upload_min_turns>0) && (r.turns||0) >= r.threshold.upload_min_turns) || clearTop10Eligible(r.threshold, r.turns||0, level)))){ box.innerHTML+=`<div style="text-align:center;color:var(--dim);font-size:12px">${approxPctLine(r.threshold, r.turns||0, level, 0, true)}</div>`; return; }
  box.innerHTML+=`<div style="text-align:center;color:var(--dim);font-size:12px">🏆 ${tr('破关榜上传中…','Submitting clear…')}</div>`;
  try{
    const res=await fetch(REC_API+'/clear',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level,rec:r,agent:'human',name:getName()})});   // 真人破关上报人类榜
    const j=await res.json(); if(!j.overall) throw new Error(j.error||'no rank');
    const raceName=L(raceById(r.race).n);
    box.innerHTML=`<div style="text-align:center;color:var(--gold);font-size:12px;margin-bottom:2px">🏆 ${tr('破关榜','Clear board')}（${tr('按最低破关等级','by lowest clear level')}）</div>`
      + rankRow(tr('总榜','Overall'), j.overall)
      + rankRow(`${tr('种族榜','Race')}·${raceName}`, j.race);
  }catch(e){ box.innerHTML=`<div style="text-align:center;color:var(--dim);font-size:12px">${tr('破关榜上传失败','Clear board unavailable')}</div>`; uploadFailToast(tr('破关榜上传失败','Clear board submission failed'), e); }
}
// 正式版死亡上报分数，回填总榜/种族榜百分位（dev 版无此功能）
function rankRow(label, o){
  return `<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 6px;font-size:13px">
    <span>${label}</span><b style="color:var(--gold)">#${o.rank} / ${o.total} · ${tr('超过','beats')} ${o.pct}%</b></div>`;
}
function scoreTop10Eligible(th, turns, level, gold){
  if(!th || !th.score_top10_turns) return false;
  if(turns>th.score_top10_turns) return true;
  if(turns<th.score_top10_turns) return false;
  if(level>th.score_top10_level) return true;
  if(level<th.score_top10_level) return false;
  return gold>=th.score_top10_gold;
}
function clearTop10Eligible(th, turns, level){
  if(!th || !th.clear_total || !th.clear_top10_level) return false;
  if(level<th.clear_top10_level) return true;
  if(level>th.clear_top10_level) return false;
  return turns<=th.clear_top10_turns;
}
function approxPctLine(th, turns, level, gold, cleared){
  if(cleared){
    if(clearTop10Eligible(th, turns, level)) return tr('🏆 本局虽低于基础上传门槛，但已进入当前口径的种族前10，仍可上传破关榜','🏆 This run is below the base gate, but it is still in the current race top 10, so it can upload to the clear board');
  } else {
    if(scoreTop10Eligible(th, turns, level, gold)) return tr('🏆 本局虽低于基础上传门槛，但已进入当前口径的种族前10，仍可上传正式榜单','🏆 This run is below the base gate, but it is still in the current race top 10, so it can upload to the ranked board');
  }
  if(!th||!th.total) return tr('📊 本局未达上传门槛，未计入正式榜单','📊 Below upload threshold — not submitted to the ranked board');
  turns = turns || (player&&player.turns) || 0;
  const pct = turns>=th.p5?5 : turns>=th.p10?10 : turns>=th.p30?30 : turns>=th.p50?50 : turns>=th.p70?70 : turns>=th.p90?90 : 100;
  return tr(`📊 本局未达上传门槛（需至少 ${th.upload_min_turns} 回合，或进入当前口径种族前10）；按开局快照估算，约超过 ${pct}% 对局`,`📊 Below upload threshold (need at least ${th.upload_min_turns} turns, or a current-scope race top 10); launch-time snapshot estimates you beat about ${pct}% of runs`);
}