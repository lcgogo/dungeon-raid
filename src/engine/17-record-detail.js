// 点击排行榜玩家名：弹框展示该记录详情（回合/等级/职业线/技能、回放/分享）
const _recDetailCache = {}; let _lbEntries = {};
async function showRecDetail(id){
  let modal=document.getElementById('recModal');
  if(!modal){ modal=document.createElement('div'); modal.id='recModal'; document.body.appendChild(modal); }
  modal.style.cssText='position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(10,6,18,.7);backdrop-filter:blur(2px);padding:18px';
  modal.innerHTML=`<div style="background:var(--panel);border:1px solid #4a3a63;border-radius:14px;max-width:330px;width:100%;padding:16px;text-align:left;box-shadow:0 8px 30px rgba(0,0,0,.5)">
    <div id="recModalBody" style="font-size:13px;color:var(--txt);min-height:40px">${tr('加载中…','Loading…')}</div>
    <button class="btn" id="recModalClose" style="width:100%;margin-top:14px">${tr('关闭','Close')}</button></div>`;
  modal.onclick=(ev)=>{ if(ev.target===modal) closeRecModal(); };   // 点遮罩关闭
  document.getElementById('recModalClose').onclick=closeRecModal;
  const body=document.getElementById('recModalBody');
  let rec=_recDetailCache[id];
  if(!rec){
    try{ const res=await fetch(REC_API+'/rec/'+id); if(!res.ok) throw 0; rec=await res.json(); _recDetailCache[id]=rec; }
    catch(e){ body.innerHTML=`<span style="color:#c66">${tr('加载失败','Failed')}</span>`; return; }
  }
  renderRecDetail(rec, body, _lbEntries[id]);
}
function closeRecModal(){ const m=document.getElementById('recModal'); if(m) m.remove(); }
// 从录像的 acts 里解析职业线（id 取值，跨版本稳定，旧录像也认）：一阶职业 / 二阶被动 / 350 跨界
function recClassLine(rec){
  const cls=[];
  for(const a of (rec.acts||[])){ if(a[0]!=='t') continue;
    if(a[1]===1 && TIER1[a[2]]) cls.push(L(TIER1[a[2]].n));
    else if((a[1]===2||a[1]===3) && TIER2[a[2]]) cls.push(L(TIER2[a[2]].n));
    else if(a[1]===4 && TIER1[a[2]]) cls.push(L(TIER1[a[2]].n)+(a[3]==='heal'?'→💊':'→💥'));
  }
  return cls;
}
function renderRecDetail(rec, box, entry){
  entry = entry || {};
  const turns = entry.turns!=null ? entry.turns : (rec.acts ? rec.acts.filter(a=>a[0]==='m').length : 0);
  const level = entry.level!=null ? entry.level : '--';
  const cleared = lbBoard==='clear' || rec.cleared;
  const rcd = raceById(entry.race||rec.race);
  const cls = recClassLine(rec);
  const perks = (rec.perks||[]).map(pid=>{ const u=UPGRADES.find(x=>x.id===pid); return u?L(u.n):pid; });
  box.innerHTML = `<div style="line-height:1.8">
    <div>📊 ${tr('回合','Turns')} <b style="color:var(--gold)">${turns}</b> · ${tr('等级','Lv')} <b style="color:var(--gold)">${level}</b>${cleared?` · 🏆 ${tr('已破关','Cleared')}`:''}</div>
    <div style="margin-top:5px">⚔️ ${rcd?rcd.e+' ':''}${cls.length?cls.join(' / '):tr('（无职业记录）','(no class)')}</div>
    <div style="margin-top:5px;color:var(--dim);font-size:12px">🔼 ${tr('技能','Perks')}：${perks.length?perks.join(' · '):tr('旧录像未记录','not recorded')}</div>
    ${rec.token?`<div style="margin-top:5px;color:#8b7aaa;font-size:12px">${tr('服务端种子·可验证 · 72h 内可补交','Server seed · verifiable · resubmittable within 72h')}</div>`:`<div style="margin-top:5px;color:#c66;font-size:12px">${tr('离线对局','Offline run')}</div>`}
    <div id="recSubmitBox" style="margin-top:8px"></div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="choice" id="recReplayBtn" style="flex:1;width:auto;margin:0;padding:7px;font-size:12px;text-align:center">${tr('▶ 回放','▶ Replay')}</button>
      <button class="choice" id="recShareBtn" style="flex:1;width:auto;margin:0;padding:7px;font-size:12px;text-align:center">${tr('🔗 分享','🔗 Share')}</button>
      ${rec.token?`<button class="choice" id="recSubmitBtn" style="flex:1;width:auto;margin:0;padding:7px;font-size:12px;text-align:center">${tr('🏆 补交排行榜','🏆 Resubmit')}</button>`:''}
    </div>
  </div>`;
  const rb=box.querySelector('#recReplayBtn'); if(rb) rb.onclick=()=>{ closeRecModal(); startReplay(rec); };   // 闭包绑定本条 rec（修旧版 onclick 引用全局 rec 的隐患）
  const sb=box.querySelector('#recShareBtn'); if(sb) sb.onclick=()=>{ shareRec(rec, sb); };
  const submitBox=box.querySelector('#recSubmitBox');
  const tb=box.querySelector('#recSubmitBtn');
  if(tb && submitBox) tb.onclick=()=>submitReplayRecord(rec, submitBox);
}
async function submitScore(r, level, gold){
  const box=document.getElementById('rankBox'); if(!box) return;
  if(!r.token){ box.innerHTML=`<div style="text-align:center;color:var(--dim);font-size:12px">${tr('🔌 本局未用服务端种子（离线），未计排名','🔌 Offline run (no server seed) — not ranked')}</div>`; return; }   // 无 token：不计排名
  box.innerHTML=`<div style="text-align:center;color:var(--dim);font-size:12px;margin-bottom:4px">${tr('🔏 服务端种子有效期：现实时间 72 小时（过期后不可补交）','🔏 Server seed valid for 72 real-time hours (cannot be resubmitted after expiry)')}</div>`;
  if(!r.threshold) r.threshold = await fetchThresholdSnapshot(r.race, r.ver||VERSION, 'human');
  if(r.threshold && !((r.threshold.upload_min_turns<=0) || (((r.threshold.upload_min_turns>0) && (r.turns||0) >= r.threshold.upload_min_turns) || scoreTop10Eligible(r.threshold, r.turns||0, level, gold)))){ box.innerHTML+=`<div style="text-align:center;color:var(--dim);font-size:12px">${approxPctLine(r.threshold, r.turns||0, level, gold, false)}</div>`; return; }
  box.innerHTML+=`<div style="text-align:center;color:var(--dim);font-size:12px">🏆 ${tr('排名上传中…','Submitting score…')}</div>`;
  try{
    const res=await fetch(REC_API+'/score',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({level,gold,rec:r,agent:'human',name:getName()})});   // 真人对局上报人类榜（AI/机器人自报 'ai'）
    const j=await res.json(); if(!j.overall) throw new Error(j.error||'no rank');
    const raceName=L(raceById(r.race).n);
    box.innerHTML=`<div style="text-align:center;color:var(--dim);font-size:12px;margin-bottom:2px">🏆 ${tr('排名','Ranking')}（${tr('按坚持回合','by turns')} ${j.turns}）</div>`
      + rankRow(tr('总榜','Overall'), j.overall)
      + rankRow(`${tr('种族榜','Race')}·${raceName}`, j.race);
  }catch(e){ box.innerHTML=`<div style="text-align:center;color:var(--dim);font-size:12px">${tr('排名上传失败','Ranking unavailable')}</div>`; uploadFailToast(tr('排名上传失败','Ranking submission failed'), e); }
}
// 上传录像换取分享链接（当前页 + ?rec=id），复制到剪贴板
async function shareRec(r, btn){
  const turns=r.acts.filter(a=>a[0]==='m').length;   // 一次连线=一回合
  if(turns<30){ log(tr(`回合数不足 30（本局 ${turns}），不能分享`,`Need ≥30 turns to share (this run: ${turns})`)); return; }
  if(btn) btn.textContent='⏳…';
  try{
    const res=await fetch(REC_API+'/rec',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(r)});
    const j=await res.json(); if(!j.id) throw new Error(j.error||'no id');
    const link=location.origin+location.pathname+'?rec='+j.id;
    try{ await navigator.clipboard.writeText(link); }catch(e){}
    log(tr('🔗 分享链接已复制：','🔗 Share link copied: ')+link);
    if(btn) btn.textContent='✅ '+tr('已复制链接','Link copied');
    prompt(tr('分享链接（已复制）：','Share link (copied):'), link);
  }catch(e){ if(btn) btn.textContent='🔗 '+tr('分享链接','Share'); log(tr('分享失败：','Share failed: ')+e.message); }
}
function exportRec(r){
  try{ const blob=new Blob([JSON.stringify(r)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`dungeon-raid-${r.race}-${(r.acts?r.acts.length:0)}acts.json`;
    a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }catch(e){ log('导出失败: '+e.message); }
}
