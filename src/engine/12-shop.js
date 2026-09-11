//==================== 金币商店 ====================
function triggerDragonMight(){
  if(player.dragonMight) player.dragonMightActive=true;
}
function normalEnemyAttack(t){
  return player.dragonMightActive ? Math.max(1,Math.ceil(t.atk/2)) : t.atk;
}
const SHOP={
  heal: {cost:15, f(){ const base=10+2*(player.healUses||0); const h=gainHeal(base); player.healUses=(player.healUses||0)+1; log(tr(`💊 喝下药水，回复 ${h} 生命`,`💊 Potion: +${h} HP`), 'heal'); }},   // 每使用一次：恢复量 +2、下次多花 1 金（后期不再鸡肋）
  bomb: {cost:25, f(){ let kills=0, boss=0; const extra = bombGoldSacrificeBonus(player); if(extra>0) player.gold=Math.max(0, player.gold-extra); const D = bombDamage(player)+extra;   // 基础5 + 爆破手累计 + 乾坤一掷（先买炸弹，再额外扣当前金币 20% 换伤害）
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c];
      if(t&&(t.type==='enemy'||t.type==='boss')){ if(t.finale) continue; addBombFx(r,c); const dd=Math.min(D,t.hp); t.hp-=D; statueReflect(t, dd);   // 终焉之主打不掉；石像反弹；每个命中格爆一下特效
        if(t.hp<=0){ const isBoss=t.type==='boss'; grid[r][c]=null;
          if(isBoss){ thiefRecover(t); boss++; addXp(player,15); gainGold(20); onBossKilled(); } else { kills++; addXp(player,3+(player.killXp||0)); if(player.rotflesh) player.maxHp++; } } } }   // 屠夫·积累腐肉：炸弹击杀也 +1 上限
    const multiGold=multiKillGold(kills);
    const lifeHeal=lifestealHeal(kills+boss);   // 汲取生命：炸弹击杀也回血
    log(tr(`💥 投掷炸弹，全场怪血量 −${D}`+(extra?`（乾坤一掷 +${extra}）`:''),`💥 Bomb: all foes lose ${D} HP`+(extra?` (All-In +${extra})`:'')) + (kills?tr(`，击杀 ${kills} 只👹`,`, ${kills} killed`):'') + (multiGold?tr(`，多杀奖励 +${multiGold} 金`,`，multi-kill bonus +${multiGold} gold`):'') + (lifeHeal?tr(`，吸血 +${lifeHeal}`,`, +${lifeHeal} lifesteal`):'') + (boss?tr(`，击败 ${boss} 个 Boss`,`, ${boss} boss(es) down`):''));   // Boss 奖励日志由 onBossKilled 统一报
    if(player.bombBoost) player.bombUses=(player.bombUses||0)+1;   // 爆破手：每用一次 → 下次 伤害+1、花费+5
    applyGravity(); syncPositions(false); }},
};
function shopCost(key){ let c=SHOP[key].cost; if(key==='heal') c+=(player.healUses||0); if(key==='bomb'&&player.bombBoost) c+=5*(player.bombUses||0); if(player.cheapskate) c=Math.ceil(c/2); return c; } // 治疗：每用一次，下次花费 +1 金；爆破手：每用一次炸弹，下次花费 +5 金；小气鬼：花费减半
function buyItem(key){
  if(busy||pendingLevels) return;
  if(player.frozen && player.frozen[key]>0) return;   // 雪人冰封该槽（治疗/炸弹），数回合内不可用
  if(player.skill2 && player.skill2.slot===key){ castSkill2(key); return; }   // 该槽被换装主动占用 → 施放，不再购买消耗品
  if(key==='heal' && player.hp>=player.maxHp) return;   // 满血时治疗无意义，不可用（HUD 亦置灰）
  if(typeof player.shopCd!=='object'||!player.shopCd) player.shopCd={}; // 兼容旧存档
  if(player.shopCd[key]>0) return;            // 该商品冷却中
  const it=SHOP[key]; if(!it) return;
  const cost=shopCost(key); if(player.gold<cost) return;
  player.gold-=cost; it.f(); triggerDragonMight();
  if(grid.some(row=>row.some(t=>!t))){ applyGravity(); syncPositions(false); }   // 商店即时效果（如神圣打击）若打出空洞，立刻补格；正常回合结算仍走 resolve 末尾统一补格
  recAct(['b',key]);   // 录制购买
  player.shopCd[key]= (key==='bomb' && player.bombCd) ? player.bombCd : 3;  // 炸弹默认冷却 3；若有被动修改 bombCd，则按其值进入冷却
  checkLevel(); updateHUD();
  const pops=()=>{
    if(player.t1Pending){ player.t1Pending=false; showTierSelect(1); return; }  // 炸弹击败Boss也可触发转职
    if(player.t2Pending){ player.t2Pending=false; showTierSelect(2); return; }
    if(player.t3Pending){ player.t3Pending=false; showTierSelect(3); return; }
    if(player.t4Pending){ player.t4Pending=false; showSkillSwap(); return; }
    if(pendingLevels){ showLevelUp(); return; }
    checkDeadlock();   // 用掉炸弹后若仍无棋可连且无就绪动作 → 判负，不卡死
  };
  // 道具产生转职/升级时，先等治疗/炸弹结算表现完成再弹框，避免遮住主动效果。
  const hasPop = player.t1Pending||player.t2Pending||player.t3Pending||player.t4Pending||pendingLevels;
  const popupWait = key==='bomb' && bombFx.length ? BOMB_FX_MS : key==='heal' && hasPop ? ACTIVE_POPUP_WAIT : 0;
  if(!replaying && !headless && hasPop && popupWait){
    busy=true; updateHUD();   // pendingLevels/busy 已挡输入；等特效
    setTimeout(()=>{ busy=false; pops(); }, popupWait);
  } else pops();
}
function canAutoUse(key){
  if(!player || !grid || !player.autoUse || !player.autoUse[key]) return false;
  if(player.skill2 && player.skill2.slot===key) return false;
  if(player.frozen && player.frozen[key]>0) return false;
  if(player.shopCd && player.shopCd[key]>0) return false;
  if(key==='heal' && player.hp>=player.maxHp) return false;
  return player.gold>=shopCost(key);
}
function autoReleaseItems(){
  if(replaying || busy || pendingLevels || !player) return;
  if(canAutoUse('heal')) buyItem('heal');
  if(canAutoUse('bomb')) buyItem('bomb');
}
function setAutoUse(key, enabled, fromReplay){
  if(!player || (key!=='heal' && key!=='bomb')) return;
  if(player.skill2 && player.skill2.slot===key) return;
  if(!player.autoUse) player.autoUse={heal:false,bomb:false};
  player.autoUse[key]=!!enabled;
  if(!fromReplay) recAct(['a',key,!!enabled]);
  updateHUD();
}
function updateAutoTrail(btn, enabled){
  const trail=btn.querySelector('.autoTrail');
  if(!enabled){ if(trail) trail.remove(); return; }
  if(trail) return;
  const wrap=document.createElement('span'); wrap.className='autoTrail';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 100 40'); svg.setAttribute('preserveAspectRatio','none');
  for(let i=0;i<2;i++){
    const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x','2'); rect.setAttribute('y','2'); rect.setAttribute('width','96'); rect.setAttribute('height','36'); rect.setAttribute('rx','8'); rect.setAttribute('pathLength','100');
    svg.appendChild(rect);
  }
  wrap.appendChild(svg); btn.appendChild(wrap);
}
// 施放换装主动（占用 治疗/炸弹 槽）。走独立冷却 skill2Cd；录像用占用的槽位 key，回放经 buyItem 复现。
function castSkill2(key){
  if(player.skill2Cd>0) return;
  prophecySlotKey=key;
  const def=TIER1[player.skill2.id], sk=def&&def.skill; if(!sk) return;
  const r=sk.f(player);
  if(r===false) return;        // 技能无效（如对无甲用锻甲）：不进冷却、不刷日志
  if(r==='__defer__') return;   // 先知换装：技能函数里已弹框，等待选择
  triggerDragonMight();
  if(!sk.noCd) player.skill2Cd=effSkillCd(player.skill2.id);   // 无冷却技能（收买）不进冷却
  recAct(['b',key]);   // 录制（占用槽位 key）；回放 dispatchReplayAct('b',key)→buyItem→castSkill2
  if(r===undefined) log(tr(`✨ 【${L(sk.name)}】发动！`,`✨ ${L(sk.name)} activated!`), 'buff');
  checkLevel(); updateHUD();
  if(player.t3Pending){ player.t3Pending=false; showTierSelect(3); return; }
  if(player.t4Pending){ player.t4Pending=false; showSkillSwap(); return; }
  if(pendingLevels){ if(deferLevelUpAfterActive()) return; return; }
  checkDeadlock();   // 用掉换装主动后若仍无棋可连 → 判负，不卡死
}
document.querySelectorAll('.shopBtn[data-buy]').forEach(b=>{
  b.onclick=()=>{ if(replaying) return; buyItem(b.dataset.buy); };   // 回放中商店不可点（重放自身经 dispatchReplayAct 直接调 buyItem，不走此处）
});

// 长按商店/技能块 → 弹出详细说明（纯 UI，不进录像、不影响对局）。即使按钮置灰（冷却/买不起）也可长按查看。
function attachLongPress(el, key){
  let timer=null, fired=false, sx=0, sy=0;
  const clear=()=>{ if(timer){ clearTimeout(timer); timer=null; } };
  el.addEventListener('pointerdown', e=>{ if(busy||pendingLevels||replaying) return; fired=false; sx=e.clientX; sy=e.clientY; clear();
    timer=setTimeout(()=>{ timer=null; fired=true; showShopInfo(key); }, 450); });
  el.addEventListener('pointermove', e=>{ if(timer && (Math.abs(e.clientX-sx)>10 || Math.abs(e.clientY-sy)>10)) clear(); });
  el.addEventListener('pointerup', clear);
  el.addEventListener('pointercancel', clear);
  el.addEventListener('pointerleave', clear);
  el.addEventListener('click', e=>{ if(fired){ e.preventDefault(); e.stopImmediatePropagation(); fired=false; } }, true);  // 长按已触发 → 吞掉随后的点击，不误买/误放
}
// 组装某个槽（heal/bomb/skill）的详细说明数据；换装主动占用 heal/bomb 槽时显示该跨界技能
function shopInfoData(key){
  const p=player; if(!p) return null;
  if((key==='heal'||key==='bomb') && p.skill2 && p.skill2.slot===key && TIER1[p.skill2.id]){
    const t=TIER1[p.skill2.id], sk=t.skill;
    return { icon:'✨', title:`${L(sk.name)} · ${tr('跨界','Crossover')}`,
      desc:L(sk.short)+(t.quip?`<br><i style="color:#caa6e6">「${L(t.quip)}」</i>`:''),
      rows:[ [tr('占用槽','Slot'), key==='heal'?'💊':'💥'],
             [tr('冷却','Cooldown'), sk.noCd?tr('无（有钱即可用）','None (gold-gated)'):`${effSkillCd(p.skill2.id)} ${tr('回合','t')}`],
             [tr('状态','Status'), (p.skill2.id==='miser'&&p.goldLock>0)?`🔒${p.goldLock}${tr('回合','t')}`:p.skill2Cd>0?`⏳${p.skill2Cd}${tr('回合','t')}`:tr('可发动','Ready')] ] };
  }
  if(key==='heal'){
    const hv=Math.round((10+2*(p.healUses||0))*(p.healMult||1)), half=(p.healMult&&p.healMult!==1);
    return { icon:'💊', title:tr('治疗','Heal'),
      desc:tr('喝下药水回复生命。每使用一次：恢复量 +2、下次多花 1 金，后期也跟得上。满血时不可用（避免浪费）。'+(half?'（活死人：一切治疗减半）':''),
              'Drink a potion to restore HP. Each use: +2 healing and +1 cost, so it keeps up late-game. Unavailable at full HP (no waste).'+(half?' (Undead: all healing halved.)':'')),
      rows:[ [tr('当前恢复','Heals now'), `+${hv} ❤️`],
             [tr('花费','Cost'), `${shopCost('heal')} 💰`],
             [tr('冷却','Cooldown'), `3 ${tr('回合','t')}`],
             [tr('已使用','Used'), `${p.healUses||0} ${tr('次','×')}`] ] };
  }
  if(key==='bomb'){
    const extra=bombGoldSacrificePreviewBonus(p), cd=p.bombCd||3, D=bombDamage(p)+extra;
    return { icon:'💥', title:tr('炸弹','Bomb'),
      desc:L(['投掷炸弹，对全场怪与 Boss 造成固定伤害（无视档位倍率）。能炸{W}免疫的 Boss（幽灵/小丑/污染怪/雪人）；终焉之主无效；石像会把伤害反弹给你。若有「乾坤一掷」，买完炸弹后还会再额外扣当前金币的 20%，并把这笔数额加到这次炸弹伤害上。',
              'Throw a bomb for fixed damage to all monsters & bosses (ignores tier scaling). Hits {W}-immune bosses (Ghost/Clown/Corruptor/Snowman); no effect on the Overlord; the Statue reflects it back. With All-In, buying the bomb also spends 20% of your current gold and adds exactly that amount to this bomb’s damage.']),
      rows:[ [tr('当前伤害','Damage'), `−${D}`+(p.bombBoost?tr(`（爆破手 +${p.bombUses||0}）`,`(Demo +${p.bombUses||0})`):'')+(extra?tr(`（乾坤一掷 +${extra}）`,` (All-In +${extra})`):'')],
             [tr('花费','Cost'), `${shopCost('bomb')} 💰`+(p.cheapskate?tr('（小气鬼半价）',' (½)'):'')+(p.bombBoost?tr(`（爆破手 +${5*(p.bombUses||0)}）`,` (Demo +${5*(p.bombUses||0)})`):'')],
             [tr('额外扣金','Extra gold spent'), extra?`${extra} 💰`:tr('无','None')],
             [tr('冷却','Cooldown'), `${cd} ${tr('回合','t')}`+(p.shadowBombGold?tr('（乾坤一掷）',' (All-In)'):'')] ] };
  }
  if(key==='skill'){
    const t1=p.tier1&&TIER1[p.tier1]; if(!t1||!t1.skill) return null; const sk=t1.skill;
    const st=(p.frozen&&p.frozen.skill>0)?`❄️${p.frozen.skill}${tr('回合','t')}`:(p.tier1==='miser'&&p.goldLock>0)?`🔒${p.goldLock}${tr('回合','t')}`:p.skillCd>0?`⏳${p.skillCd}${tr('回合','t')}`:p.prophecyPending?`🔮${prophecyLabel(p.prophecyPending)}`:tr('可发动','Ready');
    let desc='';   // 俏皮话紧跟职业名（标题），技能描述/被动另起一行
    if(t1.quip) desc+=`<i style="color:#caa6e6">「${L(t1.quip)}」</i><br>`;
    desc+=`<b>${L(sk.short)}</b>`;
    if(sk.desc) desc+=`<br>${L(sk.desc)}`;   // 技能完整规则（如吸魂的吸取量/规则）
    if(t1.passive) desc+=`<br>${tr('被动','Passive')}：${L(t1.passive)}`;
    return { icon:'✨', title:`${L(t1.n)} · ${L(sk.name)}`, desc,
      rows:[ [tr('冷却','Cooldown'), sk.noCd?tr('无（有钱即可用）','None (gold-gated)'):`${effSkillCd(p.tier1)} ${tr('回合','t')}`],
             [tr('状态','Status'), st] ] };
  }
  return null;
}
function showShopInfo(key){
  if(busy||pendingLevels) return;
  const info=shopInfoData(key); if(!info) return;
  busy=true;
  const rows=info.rows.map(([k,v])=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 2px;border-bottom:1px solid #3a2d4d"><span style="color:var(--dim)">${k}</span><b style="text-align:right">${v}</b></div>`).join('');
  const card=document.getElementById('card');
  card.innerHTML=`<h2>${info.icon} ${info.title}</h2><p style="font-size:13px;line-height:1.5">${info.desc}</p>
    <div style="text-align:left;font-size:13px;margin:0 0 14px">${rows}</div>
    ${((key==='heal'||key==='bomb') && !(player.skill2&&player.skill2.slot===key)) ? `<button class="btn" id="autoToggle" style="width:100%;margin:0 0 8px">${player.autoUse&&player.autoUse[key]?'⏹️ '+tr('自动释放：已开启','Auto-release: On'):'▶️ '+tr('自动释放：已关闭','Auto-release: Off')}</button>` : ''}
    <button class="btn" id="infoClose" style="width:100%">${tr('关闭','Close')}</button>`;
  const autoToggle=document.getElementById('autoToggle');
  if(autoToggle) autoToggle.onclick=()=>{ setAutoUse(key,!(player.autoUse&&player.autoUse[key])); busy=false; hideOverlay(); updateHUD(); };
  document.getElementById('infoClose').onclick=()=>{ busy=false; hideOverlay(); updateHUD(); };
  showOverlay();
}
document.querySelectorAll('.shopBtn[data-buy]').forEach(b=>attachLongPress(b, b.dataset.buy));
