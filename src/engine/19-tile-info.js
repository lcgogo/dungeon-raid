//==================== 方块说明（点击查看）====================
function tileInfo(t){
  const p=player;
  if(t.type==='sword') return {icon:wE(), title:tr(`${wN()} · 攻击`,`${wN()} · Attack`),
    desc:L(CONTENT.tile.sword),
    rows:[ [tr(`每个${wN()}威力`,`Power per ${wN()}`), `×${p.weaponPower}`],
      [tr('固定伤害','Flat damage'), `+${p.swordFlat}`],
      [tr('火法固定伤害','Fire flat damage'), `${currentSwordFlat()}`],
      [tr('多连奖励','Combo bonus'), tr(`每超出 2 个 +${Math.round(15*(p.comboMult||1))}%`,`+${Math.round(15*(p.comboMult||1))}% per tile over 2`)],
      [tr('伤害加成','Damage bonus'), ((p.lowHpDmg?tr('越缺血越猛','low HP↑'):'')+(p.titan?tr(` ·巨力+${Math.floor(p.maxHp/12)}`,` ·Titan+${Math.floor(p.maxHp/12)}`):'')).trim()||'—'] ]};
  if(t.type==='shield') return {icon:'🔰', title:tr('盾 · 减伤','Shield · Armor'),
    desc:L(CONTENT.tile.shield),
    rows:[ [tr('当前减伤','Damage reduction'), p.noArmor?tr('无甲（兽人）','none (Orc)'):`${p.armor}`],
      [tr('护甲','Armor'), p.noArmor?'—':`${p.shieldXp} / ${armorNeeded(p.armor)}`],
      [tr('每个盾 +进度','Progress per shield'), `+${p.armorPerShield}`],
      [tr('减伤倍率(矮人)','Armor mult (Dwarf)'), p.armorMult>1?`×${p.armorMult}`:'—'] ]};
  if(t.type==='heart'&&pollutionActive()) return {icon:'💚', title:tr('毒心 · 危险','Poison Heart · Danger'),
    desc:L(CONTENT.tile.poisonHeart),
    rows:[ [tr('连接后果','If linked'), tr('扣血（=本会回复的量）','HP loss (= would-be heal)')],
      [tr('解法','Fix'), tr('炸掉污染怪 / 别碰','Bomb Corruptor / avoid')] ]};
  if(t.type==='heart'&&t.poison) return {icon:'🖤', title:tr('黑毒心 · 万物皆毒','Black Poison Heart'),
    desc:L(CONTENT.tile.blackHeart),
    rows:[ [tr('连接后果','If linked'), tr('毒全场怪（=本会回复的量）','Poison all foes (= would-be heal)')],
      [tr('每颗毒量','Poison each'), `${p.healPerHeart}`] ]};
  if(t.type==='heart') return {icon:'💗', title:tr('心 · 治疗','Heart · Heal'),
    desc:L(CONTENT.tile.heart),
    rows:[ [tr('每颗心回复','Heal per heart'), `+${p.healPerHeart}`],
      [tr('当前生命','Current HP'), `${Math.round(p.hp)} / ${p.maxHp}`],
      [tr('每回合自动回复','Heal each turn'), p.regen?`+${p.regen}`:'—'],
      [tr('溢出攻击(神圣打击)','Overflow strikes (Holy Strike)'), p.holyStrike?tr('是','Yes'):'—'] ]};
  if(t.type==='coin') return {icon:'💰', title:tr('金币','Coin'),
    desc:L(CONTENT.tile.coin),
    rows:[ [tr('每枚金币','Gold per coin'), `+${p.goldPerCoin}`],
      [tr('当前金币','Current gold'), `${p.gold}`],
      [tr('囤金投入','Hoard invested'), p.goldLock>0?tr(`${p.goldFrozen} 金币，剩 ${p.goldLock} 回合`,`${p.goldFrozen} gold, ${p.goldLock} turns left`):'—'],
      [tr('钱能买命(财阀)','Money Buys Life (Tycoon)'), p.tycoonGoldShield?tr('只扣手头金币，不动囤金','Current gold only; Hoard untouched'):'—'] ]};
  if((t.type==='enemy'||t.type==='boss') && t.burnTurns) return {icon:'🔥', title:tr('点燃状态','Ignited'),
    desc:L(CONTENT.tile.ignited),
    rows:[ [tr('火焰层数','Burn stacks'), `${t.burnStacks||0}`],
      [tr('单层每回合掉血','Burn / stack'), `${Math.max(1, Math.floor(currentSwordFlat()*0.2))}`],
      [tr('当前总掉血','Total burn / turn'), `${Math.max(1, Math.floor(currentSwordFlat()*0.2))} × ${Math.max(1, t.burnStacks||0)} = ${burnTickDamage(t)}`] ]};
  if(t.type==='boss'){ const def=bossDef(t);
    const rows=[ [tr('血量','HP'), `${t.hp} / ${t.maxHp}`] ];
    if(def.special) rows.push([tr('特殊','Special'), L(def.special)]);
    if(def.shownAtk) rows.push([L(def.atkLabel||['攻击力','Attack']), `${def.shownAtk(t)}`]);
    else if(!def.special) rows.push([def.trueDmg?tr('攻击力（真实·无视护甲）','Attack (TRUE, ignores armor)'):tr('攻击力','Attack'), `${t.atk}`]);
    if(def.dynAtk) rows.push([tr('当前攻击','Attack now'), `${def.dynAtk(t)} ${tr('（=血量50%）','(=50% HP)')}`]);   // 饕餮：动态攻击
    if(!def.perTurn) rows.push([tr(def.flee?'逃走倒计时':'倒计时',def.flee?'Escape timer':'Timer'), `${t.cd} / ${t.baseCd}`]);
    else if(!def.finale) rows.push([tr('倒计时','Timer'), tr('每回合出手','Every turn')]);
    if(def.id==='thief'&&t.stolen) rows.push([tr('已偷金币','Stolen gold'), tr(`${t.stolen}（击败夺回）`,`${t.stolen} (recover on kill)`)]);
    rows.push([tr('攻击方式','How to hit'), def.swordable?tr(`${wN()} / 炸弹`,`${wN()} / Bomb`):tr('只能炸弹','Bomb only')]);
    rows.push([tr('击败奖励','Kill reward'), '💰+20 · XP+15']);
    return {icon:def.emoji, title:'Boss · '+L(def.name)+` Lv${t.tier||1}`, desc:L(def.desc)+(def.quip?`<br><span style="color:#caa6e6;font-style:italic">「${L(def.quip)}」</span>`:''), rows};
  }
  return {icon:'👹', title:tr('怪物','Enemy'),
    desc:L(CONTENT.tile.enemy),
    rows:[ [tr('血量','HP'), `${t.hp} / ${t.maxHp}`],
      [tr('攻击力','Attack'), `${normalEnemyAttack(t)}`],
      [tr('倒计时','Timer'), `${t.cd} / ${t.baseCd}`] ]};
}
function showTileInfo(t){
  busy=true;
  const info=tileInfo(t);
  const rows=info.rows.map(([k,v])=>
    `<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 2px;border-bottom:1px solid #3a2d4d">
       <span style="color:var(--dim)">${k}</span><b style="text-align:right">${v}</b></div>`).join('');
  const card=document.getElementById('card');
  card.innerHTML=`<h2>${info.icon} ${info.title}</h2><p>${info.desc}</p>
    <div style="text-align:left;font-size:13px;margin:0 0 14px">${rows}</div>
    <button class="btn" id="infoClose" style="width:100%">${tr('关闭','Close')}</button>`;
  document.getElementById('infoClose').onclick=()=>{ busy=false; hideOverlay(); updateHUD(); };
  showOverlay();
}
