// 点击 HUD：查看角色全部属性 + 职业
function showPlayerInfo(){
  if(busy||pendingLevels||replaying||!player) return;   // 回放中不弹角色面板（避免 busy 干扰回放）
  busy=true;
  const p=player, rc=p.race?raceById(p.race):null, an=armorNeeded(p.armor);
  const rowItem=(k,v)=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 2px;border-bottom:1px solid #3a2d4d">
       <span style="color:var(--dim)">${k}</span><b style="text-align:right">${v}</b></div>`;
  const rows=[
    [tr('❤️ 生命','❤️ HP'), `${Math.round(p.hp)} / ${p.maxHp}`],
    [tr('🔰 护甲','🔰 Armor'), p.noArmor?tr('无甲','none'):`${p.armor}${p.armorMult>1?` ×${p.armorMult}`:''}　${p.shieldXp}/${an}`],
    [tr('📈 经验','📈 XP'), `Lv.${p.level} · ${p.xp}/${xpNeeded(p.level)}`],
    [tr('💰 金币 · 回合','💰 Gold · Turn'), `${p.gold} · ${p.turns}`],
    [tr(`${wE()} ${wN()}威力`,`${wE()} ${wN()} power`), `×${p.weaponPower}${p.swordFlat?` +${p.swordFlat}`:''}${p.swordMult!=1?` ·总伤×${p.swordMult}`:''}`],
    [tr('🔢 连击加成','🔢 Combo'), `+${Math.round(15*(p.comboMult||1))}%/${tr('个','tile')}`],
    [tr('💗 每心回复','💗 Heal/heart'), `+${p.healPerHeart}`],
    [tr('💰 每金币','💰 Gold/coin'), `+${p.goldPerCoin}`],
  ].map(([k,v])=>rowItem(k,v)).join('');
  const perks=[];
  if(p.lowHpDmg) perks.push(tr(`狂怒：越缺血${wN()}伤越高`,'Frenzy: low HP, high dmg'));
  if(p.titan) perks.push(tr(`巨力：固定${wN()}伤 +${Math.floor(p.maxHp/12)}`,`Titan: +${Math.floor(p.maxHp/12)} flat ${wN()} dmg`));
  if(p.thorns) perks.push(tr('荆棘（反弹护甲）','Thorns (reflect armor)'));
  if(p.bloodFrenzy) perks.push(tr('血狂（吸血溢出升上限）','Blood Frenzy'));
  if(p.lifesteal) perks.push(tr(`吸血 +${p.lifesteal}/杀`,`Lifesteal +${p.lifesteal}`));
  if(p.regen) perks.push(tr(`每回合回复 +${p.regen}`,`Regen +${p.regen}`));
  if(p.holyStrike) perks.push(tr('神圣打击（溢出攻击）','Holy Strike'));
  if(p.killXp) perks.push(tr(`击杀+${p.killXp}经验`,`+${p.killXp} XP/kill`));
  if(p.tycoonGoldShield) perks.push(tr('钱能买命','Money Buys Life'));
  if(p.firewall) perks.push(tr(`火墙：每回合 ${firewallTickDamage()} 伤害`,`Firewall: ${firewallTickDamage()} dmg/turn`));
  const perkLine = perks.length ? `<div style="text-align:left;font-size:12px;color:var(--gold);margin:8px 0 0">${tr('✦ 特性：','✦ Perks: ')}${perks.join('　')}</div>` : '';
  const t1 = p.tier1?TIER1[p.tier1]:null, t2 = p.tier2?TIER2[p.tier2]:null;
  const t2b = p.tier2b?TIER2[p.tier2b]:null, s2 = p.skill2&&TIER1[p.skill2.id]?TIER1[p.skill2.id]:null;
  let cls=`<div style="text-align:left;font-size:12px;margin:8px 0 0;padding:8px;background:var(--panel2);border-radius:10px">`;
  if(t1){ cls+=`${tr('职业','Class')}【${L(t1.n)}】<i style="color:#caa6e6">「${L(t1.quip)}」</i><br>`;   // 俏皮话紧跟职业名
    cls+=`${tr('主动','Active')}：${L(t1.skill.short)}（${t1.skill.noCd?tr('无冷却','no CD'):`${tr('每','every')} ${effSkillCd(p.tier1)} ${tr('回合','t')}`}）<br>`;   // 有效冷却（含迷惑/回春），收买无冷却
    if(t1.passive) cls+=`　${tr('被动','Passive')}：${L(t1.passive)}<br>`; }
  else cls+=tr('击败第 50 回合 Boss → 转职，解锁职业主动技能<br>','Beat the turn-50 boss → advance to a class, unlock its active.<br>');
  if(t2) cls+=`${tr('二阶技能','Tier-2 Skill')}【${L(t2.n)}】${tr('被动','Passive')}：${L(t2.d)}<br>`;
  else cls+=tr('继续深入 → 解锁二阶技能（被动）<br>','Delve deeper → unlock a Tier-2 Skill (passive).<br>');
  if(t2b) cls+=`${tr('本族技能','Race Skill')}【${L(t2b.n)}】${tr('被动','Passive')}：${L(t2b.d)}<br>`;
  else cls+=tr('更深处 → 获得本族技能（再一项被动）<br>','Deeper still → gain a Race Skill (another passive).<br>');
  if(s2) cls+=`${tr('跨界技能','Crossover')}【${L(s2.skill.name)}】→ ${p.skill2.slot==='heal'?'💊':'💥'}（${tr('每','every')} ${effSkillCd(p.skill2.id)} ${tr('回合','t')}）${s2.quip?`<br><i style="color:#caa6e6">「${L(s2.quip)}」</i>`:''}`;
  else cls+=tr('深渊尽头 → 跨界技能（换任意职业主动）','At the abyss’s end → a Crossover Skill (swap in any class active).');
  cls+='</div>';
  const card=document.getElementById('card');
  card.innerHTML=`<h2>${rc?`${rc.e} ${L(rc.n)}`:tr('冒险者','Adventurer')}</h2>
    ${rc?`<p>${L(rc.d)}</p>`:''}
    <div style="text-align:left;font-size:13px;margin:0 0 4px">${rows}</div>
    ${cls}${perkLine}
    <button class="btn" id="infoClose" style="width:100%;margin-top:12px">${tr('关闭','Close')}</button>`;
  document.getElementById('infoClose').onclick=()=>{ busy=false; hideOverlay(); updateHUD(); };
  showOverlay();
}
document.getElementById('hud').onclick=showPlayerInfo;

function showOverlay(){ document.getElementById('overlay').classList.add('show'); }
function hideOverlay(){ document.getElementById('overlay').classList.remove('show'); }
