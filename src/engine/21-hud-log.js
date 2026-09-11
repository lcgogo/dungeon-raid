//==================== HUD / 日志 ====================
function bar(idBar,idTxt,cur,max,suffix){
  document.getElementById(idBar).style.width=Math.max(0,Math.min(100,cur/max*100))+'%';
  document.getElementById(idTxt).textContent=`${Math.max(0,Math.round(cur))} / ${max}`+(suffix||'');
}
function updateHUD(){
  document.getElementById('hud').classList.toggle('hoarding', !!(player && player.goldLock>0));
  bar('hpBar','hpTxt',player.hp,player.maxHp);
  document.getElementById('hpBar').style.background = isInfected() ? '#27ae60' : 'var(--hp)';  // 僵尸尸毒感染：血条变绿
  updateDanger();
  const an=armorNeeded(player.armor);
  document.getElementById('arBar').style.width=Math.min(100,player.shieldXp/an*100)+'%';
  const tortoiseGuard=player.tortoiseGuardTurns>0 ? `　🐢½×${player.tortoiseGuardTurns}` : '';
  document.getElementById('arTxt').textContent=
    `${tr('减伤','DR')} ${player.armor}${player.toughness?`+${player.toughness}`:''}${tortoiseGuard}　${player.shieldXp}/${an}`;
  const need=xpNeeded(player.level);
  document.getElementById('xpBar').style.width=(player.xp/need*100)+'%';
  document.getElementById('xpTxt').textContent=`${player.xp} / ${need}`;
  document.getElementById('lvTxt').textContent=player.level;
  document.getElementById('goldTxt').textContent=player.gold;
  document.getElementById('turnTxt').textContent=player.turns;
  const b=[];
  if(player.race){ const rc=raceById(player.race); let id=`${rc.e}${L(rc.n)}`;
    if(player.tier1) id+=` · ${L(TIER1[player.tier1].n)}`;
    if(player.tier2) id+=` · ${L(TIER2[player.tier2].n)}`;
    b.push(id); }
  b.push(`${wE()}×${player.weaponPower}${player.swordFlat?`+${player.swordFlat}`:''}`);
  b.push(player.noArmor?tr('无甲','No armor'):`🔰${player.armorPerShield}`);
  b.push(`💗${player.healPerHeart}`);
  b.push(`💰${player.goldPerCoin}`);
  if(player.goldLock>0) b.push(tr(`🔒囤金${player.goldLock}`,`🔒${player.goldLock}`));
  if(player.deathCoil>0) b.push(tr(`🟢缠绕${player.deathCoil}`,`🟢Coil ${player.deathCoil}`));
  if(player.lifesteal)b.push(tr(`吸血 ${player.lifesteal}`,`Lifesteal ${player.lifesteal}`));
  if(player.regen)b.push(tr(`恢复 ${player.regen}`,`Regen ${player.regen}`));
  document.getElementById('bonusTxt').textContent=b.join('　');
  const scd=(player.shopCd&&typeof player.shopCd==='object')?player.shopCd:{};
  document.querySelectorAll('.shopBtn[data-buy]').forEach(btn=>{
    const key=btn.dataset.buy;
    const autoOn=!!(player.autoUse&&player.autoUse[key]);
    btn.classList.toggle('auto-on', autoOn);
    updateAutoTrail(btn, autoOn);
    if(player.skill2 && player.skill2.slot===key && TIER1[player.skill2.id]){   // 该槽已换成换装主动
      const sk=TIER1[player.skill2.id].skill;
      btn.querySelector('span').textContent=`✨${L(sk.name)}`;
      btn.querySelector('small').textContent=L(sk.short);
      const fz2=player.frozen&&player.frozen[key]>0;
      const hoard2=player.skill2.id==='miser' && player.goldLock>0;
      btn.querySelector('em').textContent = fz2 ? `❄️${player.frozen[key]}${tr('回合','t')}` : hoard2 ? `🔒${player.goldLock}${tr('回合','t')}` : player.skill2Cd>0 ? `⏳${player.skill2Cd}${tr('回合','t')}` : tr('可发动','Ready');
      btn.classList.toggle('off', busy || pendingLevels || player.skill2Cd>0 || fz2 || hoard2);
      return;
    }
    const c=shopCost(key), cd=scd[key]||0, fz=player.frozen&&player.frozen[key]>0;   // 雪人冰封该槽
    if(key==='heal'){ const hv=Math.round((10+2*(player.healUses||0))*(player.healMult||1)); btn.querySelector('small').textContent=tr(`回复 ${hv} 生命`,`Restore ${hv} HP`); }   // 治疗恢复量随次数递增（活死人按 healMult 折算）
    if(key==='bomb'){ const extra=bombGoldSacrificeBonus(player), D=bombDamage(player)+extra; btn.querySelector('small').textContent=tr(`全场怪 -${D} 血`+(extra?`（乾坤一掷 +${extra}）`:''),`All foes -${D} HP`+(extra?` (All-In +${extra})`:'')); }   // 炸弹伤害随爆破手/乾坤一掷动态显示
    const full = key==='heal' && player.hp>=player.maxHp;   // 满血时治疗禁用
    btn.querySelector('em').textContent = fz ? `❄️${player.frozen[key]}${tr('回合','t')}` : cd>0 ? `⏳${cd}${tr('回合','t')}` : full ? tr('已满血','Full HP') : c+'💰';
    btn.classList.toggle('off', busy || pendingLevels || cd>0 || player.gold < c || fz || full); });
  const sb=document.getElementById('skillBtn'), sk=player.tier1&&TIER1[player.tier1]&&TIER1[player.tier1].skill;
  if(sk){ sb.style.display='flex';
    sb.querySelector('span').textContent=`✨${L(sk.name)}`;
    sb.querySelector('small').textContent=L(sk.short);
    const hoarding = player.tier1==='miser' && player.goldLock>0;   // 囤金期间技能无法再发动，按锁定显示
    const fzs=player.frozen&&player.frozen.skill>0;   // 雪人冰封一阶主动
    const isBuyout = player.tier1==='guildmaster';
    const buyCost = isBuyout ? (player.cheapskate?Math.ceil(enemyHpSum()/2):enemyHpSum()) : 0;   // 收买花费 = 全怪血量（小气鬼减半）
    const cantAfford = isBuyout && (buyCost<=0 || player.gold<buyCost);   // 没怪或钱不够 → 置灰
    sb.querySelector('em').textContent = fzs ? `❄️${player.frozen.skill}${tr('回合','t')}`
      : hoarding ? `🔒${player.goldLock}${tr('回合','t')}`
      : player.skillCd>0 ? `⏳${player.skillCd}${tr('回合','t')}`
      : player.prophecyPending ? `🔮${prophecyLabel(player.prophecyPending)}`
      : isBuyout ? `💰${buyCost}`                                         // 收买：显示当前花费（全怪血量），钱不够时按钮置灰
      : tr('可发动','Ready');
    sb.classList.toggle('off', busy || pendingLevels || player.skillCd>0 || hoarding || fzs || cantAfford);
  } else { sb.style.display='none'; }
  saveGame();
}
// 低血时屏幕边缘变红：血越少越红，危急时呼吸闪烁
const vignetteEl=document.getElementById('vignette');
function updateDanger(){
  const ratio=Math.max(0,player.hp)/player.maxHp;
  // 生命 >50% 不显示；50%→0% 之间，红色从无到最浓
  const t=Math.max(0,(0.5-ratio)/0.5);          // 0 ~ 1
  vignetteEl.style.opacity=(t*0.85).toFixed(3);  // 最浓 0.85
  const danger = ratio>0 && ratio<=0.2;
  vignetteEl.classList.toggle('pulse', danger); // 危急呼吸闪烁
  document.getElementById('hpBar').classList.toggle('low', danger); // 生命条同步闪烁
}
const logEl=document.getElementById('log'); let logHistory=[];
// 日志按事件类型上色：回血=绿 / 增益=蓝 / 攻击敌人=白(默认) / 被攻击·Boss出场=红 / 负面效果=黄
function logColor(e){ const k=e&&e.k; return k==='bad'?'#ff5252':k==='heal'?'#2ecc71':k==='buff'?'#4aa3ff':k==='debuff'?'#f1c40f':'var(--txt)'; }
function log(m, k){
  logHistory.push({m, k}); if(logHistory.length>80)logHistory.shift();   // 完整历史含类型标记（点 log 栏查看更多）
  logEl.innerHTML=logHistory.slice(-2).reverse().map(e=>`<span style="color:${logColor(e)}">${e.m}</span>`).join('<br>'); }
function logClear(){ logHistory=[]; logEl.innerHTML=''; }
function settlementLogBox(){
  const recent=logHistory.slice(-3).reverse(), full=logHistory.slice().reverse();
  const row=e=>`<div style="color:${logColor(e)}">${e.m}</div>`;
  return `<details class="settlementLog"><summary><div class="settlementLogPreview">${recent.length?recent.map(row).join(''):`<div style="color:var(--dim)">${tr('暂无日志','No log entries')}</div>`}</div></summary>
    <div class="settlementLogFull">${full.length?full.map(row).join(''):`<div style="color:var(--dim)">${tr('暂无日志','No log entries')}</div>`}</div>
  </details>`;
}
// 点 log 栏 → 弹出完整日志历史（与底部简报一致，最新在上）。纯 UI，不进录像。
function showLogHistory(){
  if(busy||pendingLevels||!logHistory.length) return;
  busy=true;
  const rows=logHistory.slice().reverse().map(e=>{ const m=(e&&e.m!==undefined)?e.m:e;   // 兼容旧格式（字符串）
    return `<div style="padding:5px 2px;border-bottom:1px solid #3a2d4d;font-size:12px;text-align:left;color:${logColor(e)}">${m}</div>`; }).join('');
  const card=document.getElementById('card');
  card.innerHTML=`<h2>📜 ${tr('日志','Log')}</h2>
    <div style="max-height:58vh;overflow-y:auto;margin:0 0 12px">${rows}</div>
    <button class="btn" id="logClose" style="width:100%">${tr('关闭','Close')}</button>`;
  document.getElementById('logClose').onclick=()=>{ busy=false; hideOverlay(); };
  showOverlay();
}
if(logEl) logEl.onclick=showLogHistory;
// 点版本号 → 展示嵌入页面的更新日志摘要（CHANGELOG_LINES，无需联网；由 dr.sh 从 CHANGELOG.md 注入）
function showChangelog(){
  if(busy||pendingLevels) return;
  busy=true;
  const lines=(typeof CHANGELOG_LINES!=='undefined'?CHANGELOG_LINES:[]);
  const body = lines.length
    ? `<div style="max-height:58vh;overflow-y:auto;margin:0 0 12px">${lines.map(e=>{
        const txt = lang==='en' ? (e.en||e.zh||'') : (e.zh||e.en||'');
        return `<div style="padding:5px 2px;border-bottom:1px solid #3a2d4d;font-size:12px;text-align:left"><b style="color:var(--gold)">${e.ver||''}</b> ${txt}</div>`;
      }).join('')}</div>`
    : `<p style="font-size:13px">${tr('看完整日志：','Full log:')} <a href="https://github.com/lcgogo/dungeon-raid/blob/main/CHANGELOG.md" target="_blank" style="color:var(--gold)">CHANGELOG</a></p>`;
  const card=document.getElementById('card');
  card.innerHTML=`<h2>📝 ${tr('更新日志','Changelog')}</h2>${body}<button class="btn" id="clClose" style="width:100%">${tr('关闭','Close')}</button>`;
  document.getElementById('clClose').onclick=()=>{ busy=false; hideOverlay(); };
  showOverlay();
}
