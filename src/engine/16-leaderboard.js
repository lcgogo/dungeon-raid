// ==================== 排行榜浏览（人类 / AI 切换） ====================
let lbAgent='human', lbBoard='top', lbRace='';   // 当前查看：human|ai，top(闯关·按回合)|clear(破关·按最低等级)，lbRace=''为全部种族
function medal(i){ return i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`; }
function showLeaderboard(){ busy=true; renderLeaderboard(); }
async function renderLeaderboard(){
  const card=document.getElementById('card');
  const tab=(id,lab,on)=>`<button class="choice" id="${id}" style="width:auto;margin:0;padding:5px 12px;${on?'border-color:var(--gold);color:var(--gold)':''}">${lab}</button>`;
  const rtab=(id,lab)=>`<button class="choice" id="lbR_${id||'all'}" style="width:auto;margin:0;padding:5px 9px;font-size:13px;${lbRace===id?'border-color:var(--gold);color:var(--gold)':''}">${lab}</button>`;
  card.innerHTML=`<h2 style="color:var(--gold)">🏆 ${tr('排行榜','Leaderboard')}</h2>
    <p style="color:var(--dim);font-size:12px;margin:-6px 0 8px">${lbBoard==='clear'?tr('历代全部','All builds'):tr('最近 3 个版本','Latest 3 builds')} · ${tr('仅已验证','verified only')}</p>
    <div style="display:flex;gap:6px;justify-content:center;margin-bottom:6px">
      ${tab('lbHuman','🧑 '+tr('人类','Human'),lbAgent==='human')}${tab('lbAi','🤖 '+tr('AI','AI'),lbAgent==='ai')}</div>
    <div style="display:flex;gap:6px;justify-content:center;margin-bottom:6px">
      ${tab('lbTop','⚔️ '+tr('闯关榜','Survival'),lbBoard==='top')}${tab('lbClear','👑 '+tr('破关榜','Clears'),lbBoard==='clear')}</div>
    <div style="display:flex;gap:5px;justify-content:center;margin-bottom:8px;flex-wrap:wrap">
      ${rtab('',tr('全部','All'))}${RACES.map(rc=>rtab(rc.id,rc.e)).join('')}</div>
    <div id="lbList" style="text-align:left;min-height:90px;background:var(--panel2);border-radius:10px;padding:6px 4px;margin-bottom:10px">${tr('加载中…','Loading…')}</div>
    <button class="btn" id="lbBack">${tr('返回','Back')}</button>`;
  document.getElementById('lbHuman').onclick=()=>{ lbAgent='human'; renderLeaderboard(); };
  document.getElementById('lbAi').onclick=()=>{ lbAgent='ai'; renderLeaderboard(); };
  document.getElementById('lbTop').onclick=()=>{ lbBoard='top'; renderLeaderboard(); };
  document.getElementById('lbClear').onclick=()=>{ lbBoard='clear'; renderLeaderboard(); };
  document.getElementById('lbR_all').onclick=()=>{ lbRace=''; renderLeaderboard(); };
  RACES.forEach(rc=>{ document.getElementById('lbR_'+rc.id).onclick=()=>{ lbRace=rc.id; renderLeaderboard(); }; });
  document.getElementById('lbBack').onclick=showClassSelect;
  showOverlay();
  const list=document.getElementById('lbList');
  try{
    const rq = lbRace ? `&race=${lbRace}` : '';
    const ep = lbBoard==='clear'
      ? `/clearboard?agent=${lbAgent}${rq}&n=20`        // 破关榜：历代全部（稀有里程碑，不按版本分桶，免得被频繁发版挤出窗口）
      : `/top?recent=3&agent=${lbAgent}${rq}&n=10`;
    const res=await fetch(REC_API+ep); const j=await res.json();
    const rows = lbBoard==='clear' ? (j.clears||[]) : (j.top||[]);
    if(!rows.length){ const empty = lbBoard==='clear'
        ? tr('🏆 还没有人破关<br><span style="font-size:11px">撑过第 500 回合的终局 10 波即可登顶</span>','🏆 No one has cleared yet<br><span style="font-size:11px">Survive all 10 endgame waves after turn 500 to top it</span>')
        : tr('暂无记录','No entries yet');
      list.innerHTML=`<div style="text-align:center;color:var(--dim);padding:20px 0;line-height:1.7">${empty}</div>`; return; }
    _lbEntries={};
    list.innerHTML=rows.map((e,i)=>{
      _lbEntries[e.id]=e;   // 缓存榜单条目（含已验证的 level/turns），详情弹框用
      const rc=raceById(e.race); const rn=`${rc?rc.e:'❓'} ${e.name||tr('无名','Anon')}`;
      const ver=e.version&&e.version!==VERSION?` <span style="color:var(--dim);font-size:10px">${e.version}</span>`:'';
      const metric = lbBoard==='clear'
        ? `${tr('等级','Lv')} <b style="color:var(--gold)">${e.level}</b> · ${e.turns}${tr('回合','t')}`
        : `<b style="color:var(--gold)">${e.turns}</b>${tr('回合','t')} · Lv${e.level}`;
      return `<div class="lbRow" data-rid="${e.id}" style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:7px 8px;font-size:13px;cursor:pointer;border-radius:6px;${i%2?'background:rgba(255,255,255,.03)':''}">
          <span>${medal(i)} ${rn}${ver} <span style="color:var(--gold);font-size:11px">ⓘ</span></span><span style="white-space:nowrap">${metric}</span></div>`;
    }).join('');
    list.querySelectorAll('.lbRow').forEach(row=>{ row.onclick=()=>showRecDetail(row.dataset.rid); });   // 整行可点→弹详情（JS 绑定，避免内联 onclick 在 iOS 等环境偶发不触发）
  }catch(e){ list.innerHTML=`<div style="text-align:center;color:var(--dim);padding:20px 0">${tr('榜单加载失败','Leaderboard unavailable')}</div>`; }
}