//==================== 核心结算 ====================
function resolve(){
  const type=selection[0].type;
  recAct(['m', selection.map(s=>[s.r,s.c]), type]);   // 录制连线（改动棋盘前）
  let msg='', mk=''; // 经验只来自击杀（在 dealDamage 里 +3）；mk=日志颜色类型（''白=攻击/heal绿/buff蓝/bad红/debuff黄）

  if(type==='sword'){
    const swords=selection.filter(s=>{const t=grid[s.r][s.c]; return t&&t.type==='sword';});
    const targets=selection.filter(s=>isSwordTarget(grid[s.r][s.c]));
    const nS=swords.length;
    swords.forEach(s=>grid[s.r][s.c]=null);
    const combo=1+Math.max(0,nS-2)*0.15*(player.comboMult||1);   // 多连奖励（精灵翻倍）
    const flat=currentSwordFlat();  // 巨力 + 盾击(护甲减伤量→固定剑伤)
    let pool=(nS*player.weaponPower+flat)*combo*(player.swordMult||1);
    if(player.lowHpDmg) pool*=1+(1-player.hp/player.maxHp)*0.6;  // 狂战：越缺血越猛（最高+60%）
    if(player.beastDamageMult && player.beastDamageMult!==1) pool*=player.beastDamageMult; // 白虎破军：下一次爪链爆发
    pool=Math.floor(pool);
    if(targets.length && nS>0) pool=Math.max(1, pool);   // 矮人 ×0.85 等减伤仍按 floor；但合法武器攻击至少造成 1 点伤害，避免一锤打出 0 伤
    let dmg=0, kills=0, bonusGold=0, multiGold=0;
    if(targets.length){ ({dmg,kills,bonusGold,multiGold}=dealDamage(pool, targets)); }
    const ignited = fireChainIgnite(selection);
    const lifeHeal=lifestealHeal(kills);   // 汲取生命：每杀一只回血（含溅射击杀，kills 已含）
    let blood=0;
    if(player.bloodthirst && targets.length){ blood=vampGain(targets.length*3); player.bloodthirst=0; } // 斗士嗜血（血狂时溢出转上限）
    const comboTxt=combo>1?tr(` 连击×${combo.toFixed(2)}`,` combo×${combo.toFixed(2)}`):'';
    msg=`${wE()}×${nS}${comboTxt}` + (targets.length
      ? tr(` 直击 ${targets.length} 只怪 → ${dmg} 伤害`,` hit ${targets.length} → ${dmg} dmg`) + (kills?tr(`，击杀 ${kills} 只👹`,`, ${kills} killed`):'') + (multiGold?tr(`，多杀奖励 +${multiGold} 金`,`，multi-kill bonus +${multiGold} gold`):'') + (bonusGold?tr(`，妙手空空 +${bonusGold} 金`,`，Empty Pockets +${bonusGold} gold`):'') + (ignited?tr(`，点燃 ${ignited} 个目标`,`，ignited ${ignited}`):'') + (lifeHeal?tr(`，吸血 +${lifeHeal}`,`, +${lifeHeal} lifesteal`):'') + (blood?tr(`，回血 ${blood}`,`, +${blood} HP`):'')
      : tr('（未串到怪）','(no enemy hit)'));
  } else {
    const count=selection.length;
    const poisonHeart = type==='heart' && pollutionActive();   // 污染怪在场：心是毒心，连之扣血
    const blackN = type==='heart' ? selection.filter(s=>{ const t=grid[s.r][s.c]; return t&&t.poison; }).length : 0;   // 黑毒心数量（万物皆毒）
    selection.forEach(s=>{ grid[s.r][s.c]=null; });
    const combo=1+Math.max(0,count-2)*0.15;            // 多连奖励：每超出2个 +15%
    const comboTxt=combo>1?tr(` 连击×${combo.toFixed(2)}`,` combo×${combo.toFixed(2)}`):'';
    const d=DEF[type];
    if(type==='shield'){ mk='buff';
      if(player.noArmor){ msg=`${d.emoji}×${count}${comboTxt} → `+tr('无甲：护甲无效','No Armor: shields do nothing'); }
      else { player.shieldXp += Math.round(count*player.armorPerShield*(player.armorPerShieldMult||1)*combo);
        let gained=0; while(player.shieldXp>=armorNeeded(player.armor)){ player.shieldXp-=armorNeeded(player.armor); player.armor++; gained++; }
        msg=`${d.emoji}×${count}${comboTxt} → `+tr(`护甲 ${player.shieldXp}/${armorNeeded(player.armor)}`,`Armor ${player.shieldXp}/${armorNeeded(player.armor)}`)+(gained?tr(`，减伤 +${gained}！（当前 ${player.armor}）`,`, DR +${gained}! (now ${player.armor})`):''); } }
    else if(type==='heart'){
      const per=player.healPerHeart*combo;
      if(poisonHeart){ const dd=hurtPlayer(Math.round(count*per),'pollution',true);   // 污染怪毒心：连之不回血，反而按等量扣血（无视护甲），黑毒心也被污染光环盖过
        mk='bad'; msg=`💚×${count}${comboTxt} → `+tr(`毒心反噬 −${dd} 生命！`,`poison hearts: −${dd} HP!`); }
      else {
        const hex=player.heartPoison; player.heartPoison=false;   // 蛊毒：本回合红心也算毒
        const redN=count-blackN, poisonN=blackN+(hex?redN:0), healN=hex?0:redN;   // 黑毒心 + 蛊毒下的红心 → 放毒；其余红心 → 回血
        const parts=[];
        if(poisonN>0){ const r=dealDamage(Math.round(poisonN*per), null, true); const lh=lifestealHeal(r.kills); applyGravity(); syncPositions(false);   // allFoes：毒灌全场怪含剑免疫 Boss
          parts.push(tr(`🧪 毒全场 ${r.dmg}`+(r.kills?`、击杀 ${r.kills}`:'')+(r.multiGold?`、多杀奖励 +${r.multiGold} 金`:'')+(lh?`、吸血 +${lh}`:''),`🧪 ${r.dmg} poison to all`+(r.kills?`, ${r.kills} killed`:'')+(r.multiGold?`, multi-kill +${r.multiGold} gold`:'')+(lh?`, +${lh} lifesteal`:''))); }
        if(healN>0){ const h=gainHeal(Math.round(healN*per)); parts.push(tr(`回复 ${h} 生命`,`+${h} HP`)); }
        mk = poisonN>0 ? '' : 'heal';   // 连黑/蛊毒心毒怪=攻击(白)，纯回血=绿
        msg=`${blackN?'🖤':d.emoji}×${count}${comboTxt} → `+(parts.join(tr('，',', '))||tr('（无效果）','(no effect)')); } }
    else if(type==='coin'){ mk='buff'; const g=Math.round(count*player.goldPerCoin*combo);
      gainGold(g);
      msg=`${d.emoji}×${count}${comboTxt} → `+tr(`获得 ${g} 金币`,`+${g} gold`); }
  }
  log(msg, mk);
  if(player.fireChainTurn) player.fireChainTurn=false;   // 火焰链仅本回合（若本回合没划到怪，也在结算后失效）
  if(player.pierceTurn) player.pierceTurn=false;   // 斗士嗜血穿透仅本回合
  if(type==='sword') player.beastDamageMult=1;     // 白虎破军在实际使用爪链后消耗
  if(player.heartPoison) player.heartPoison=false; // 巫医蛊毒仅本回合（未连心则失效）
  if(player.rogueStealTurn) player.rogueStealTurn=false; // 妙手空空仅本回合（没打到也会失效）

  // 回合推进：怪物倒计时 / 攻击
  player.turns++;
  if(typeof player.shopCd==='object') for(const k in player.shopCd){ if(player.shopCd[k]>0) player.shopCd[k]--; } // 各商品冷却递减
  if(player.skillCd>0) player.skillCd--; // 技能冷却递减
  if(player.skill2Cd>0) player.skill2Cd--; // 换装主动冷却递减
  if(player.frozen) for(const k in player.frozen){ if(player.frozen[k]>0) player.frozen[k]--; }   // 雪人冰封倒数解冻
  if(player.deathCoil>0){ deathCoilTick(); player.deathCoil--; }   // 蔓藤缠绕：未来 3 回合每回合全场怪流失 30% 最大生命
  burnTick();   // 火焰链：已点燃目标每回合持续灼烧，直到死亡
  firewallTick();   // 火墙：底部三行的怪物每回合掉当前固定伤害 20%
  advanceEnemies();
  if(player.hp<=0){ updateHUD(); gameOver(); return; }   // 敌人伤害先结算；致死后不能靠回合恢复复活
  if(player.tortoiseGuardTurns>0) player.tortoiseGuardTurns--;   // 玄甲镇岳：覆盖本回合敌人行动后递减
  if(player.tortoiseRegen && player.hp>0){ const rh=Math.max(1,Math.floor(player.hp*0.1)); const healed=gainHeal(rh); if(healed>0) log(tr(`🐢 恐鳌之心：恢复当前生命的 10%（+${healed}）`,`🐢 Heart of Tarrasque: restored 10% of current HP (+${healed})`), 'heal'); }
  if(player.goldLock>0){ player.goldLock--; if(player.goldLock===0){ const pay=Math.round(player.goldFrozen*1.2); player.gold+=pay; player.goldFrozen=0; log(tr(`🔓 囤金到期：返还 ${pay} 金币`,`🔓 Hoard matured: +${pay} gold`), 'buff'); } } // 守财奴囤金到期（1.2 倍）：放在敌人行动后，让「钱能买命」覆盖最后一回合
  if(player.cleared) return;   // 终焉第10波撑过 → onClear 已结算，停止后续处理
  if(player.regen){ const aura=Math.max(0, Math.round(player.regen*((player.healMult!=null)?player.healMult:1))); const _h=gainHeal(player.regen); if(_h>0) log(tr(`💗 恢复 +${_h}（每回合）`,`💗 Regen +${_h} HP`), 'heal'); if(player.witherAura && aura>0){ const self= hurtPlayer(aura, 'witheraura', true); if(self>0) log(tr(`🪦 竭心光环：失去 ${self} 生命`,`🪦 Wither Aura: lose ${self} HP`), 'bad'); witherAuraTick(aura); } }
  if(player.turns===500 && !player.finaleStarted){ player.finaleStarted=true; player.finaleWave=0; spawnFinale(); }  // 第500回合：终局降临
  if(!player.finaleStarted){
    if(player.turns % 10 === 0) player.bossDue=true;          // 每 10 回合：该来 Boss
    if(player.bossDue && player.doubleBoss){ const id1=spawnBoss(true); spawnBoss(true, id1); player.bossDue=false; }   // 350 后：每 10 回合强制降临 2 个不同 Boss
    else if(player.bossDue){ spawnBoss(true); player.bossDue=false; }  // 每 10 回合必降临 Boss（即便场上已有）——防「囤一只早期弱 Boss 压制后续强 Boss、轻松到里程碑晋级」
  }

  applyGravity();
  syncPositions(false);
  // 在本回合补子完成后才记录，避免把周期效果误消费在触发回合。
  if(player.echoOfFate && player.turns%5===0 && type!=='enemy'){
    player.echoPendingType=type;
    log(tr(`🌀 命运回响：下一回合补子必定为${prophecyLabel(type)}`,`🌀 Echo of Fate: next turn's refill will be all ${prophecyLabel(type,true)}`), 'buff');
  }
  // 二阶被动：每回合棋盘摆完后转 3 个棋子（万物皆毒→黑毒心，污染怪变化之后；皆可为剑→剑）
  if(player.poisonConvert){ if(convertTiles(3,'heart',['sword','shield','coin'], t=>{t.poison=true;})) syncPositions(false); }
  if(player.swordConvert){ if(convertTiles(3,'sword',['shield','heart','coin'])) syncPositions(false); }
  if(player.bloodFrenzy){ const bf=hurtPlayer(Math.max(1, Math.floor(player.maxHp*0.05)), 'bloodfrenzy', true); if(bf>0) log(tr(`🩸 血狂反噬：损失 ${bf} 生命`,`🩸 Blood Frenzy backlash: lose ${bf} HP`), 'bad'); }
  if(player.hp<=0){ updateHUD(); gameOver(); return; }
  checkLevel();
  updateHUD();
  if(player.hp<=0){ gameOver(); return; }
  if(player.t1Pending){ player.t1Pending=false; showTierSelect(1); return; }   // 击败50回合Boss → 选一阶
  if(player.t2Pending){ player.t2Pending=false; showTierSelect(2); return; }   // 击败100回合Boss → 选二阶
  if(player.t3Pending){ player.t3Pending=false; showTierSelect(3); return; }   // 击败200回合Boss → 第二被动
  if(player.t4Pending){ player.t4Pending=false; showSkillSwap(); return; }     // 击败350回合Boss → 主动换装
  if(pendingLevels){ showLevelUp(); return; }
  autoReleaseItems();   // 开启自动释放时，在回合结算后按当前可用条件使用治疗/炸弹
  if(busy || pendingLevels) return;
  checkDeadlock();   // 无弹层待处理时：棋盘塞满怪、无棋可连且无就绪改盘动作 → 判负（含终局被Boss淹没）
}

// 治疗：返回实际回复的生命（超出上限的部分丢弃）
function gainHeal(amount){
  if(player.healMult!=null && player.healMult!==1) amount=Math.round(amount*player.healMult);   // 活死人：一切治疗减半（重生满血走 hp=maxHp，不经此处）
  const space=player.maxHp-player.hp;
  if(amount<=space){ player.hp+=amount; return amount; }
  player.hp+=space; const over=amount-space;
  if(player.holyStrike && over>0) holyStrikeDamage(over); // 神圣打击：溢出的治疗化为对随机敌人的攻击
  return space;
}
// 神圣打击（牧师二阶被动）：把溢出的治疗当伤害优先砸向 Boss；多 Boss 取最低血（排除终焉之主）
function holyStrikeDamage(amt){
  let bossT=null, bossR=-1, bossC=-1, bossHP=Infinity, t=null, tr_=-1, tc=-1, best=-1;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const g=grid[r][c]; if(!g||g.finale) continue;
    if(g.type==='boss'){ if(g.hp<bossHP){ bossT=g; bossHP=g.hp; bossR=r; bossC=c; } }
    else if(g.type==='enemy' && g.hp>best){ t=g; best=g.hp; tr_=r; tc=c; }
  }
  if(bossT){ t=bossT; tr_=bossR; tc=bossC; }
  if(!t) return;
  const isBoss=t.type==='boss', name=isBoss?L(bossDef(t).name):tr('普通怪','enemy'), before=t.hp, dealt=Math.min(amt,before);
  addBombFx(tr_,tc);
  t.hp-=amt;
  if(t.hp<=0){ grid[tr_][tc]=null; if(isBoss){ thiefRecover(t); addXp(player,15); gainGold(20); onBossKilled(); } else { addXp(player,3+(player.killXp||0)); gainGold(1); } }
  log(tr(`✨ 神圣打击：优先命中 ${name}，造成 ${dealt} 伤害`+(t.hp<=0?`，击杀！`:''),`✨ Holy Strike: hit ${name} first for ${dealt} dmg`+(t.hp<=0?`, killed!`:'')));
}

function dealDamage(pool, targets, allFoes){
  let dmg=0, kills=0, normalKills=0, bonusGold=0;
  const list=[];
  const seen=new Set();
  // allFoes=true：命中全场怪含【剑免疫 Boss】（蛊毒/黑毒心「灌给全场怪」，与炸弹/吸魂一致，仅排除终焉之主）；否则只命中可剑攻击目标
  const hits = t => allFoes ? (t && (t.type==='enemy' || (t.type==='boss' && !t.finale))) : isSwordTarget(t);
  if(targets){ targets.forEach(s=>{ const t=grid[s.r][s.c], key=`${s.r},${s.c}`;
    if(hits(t) && !seen.has(key)){ seen.add(key); list.push({r:s.r,c:s.c,t}); } }); }
  else { for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c];
    if(hits(t)) list.push({r,c,t}); } }   // 全场型（箭雨：allFoes 缺省→只可剑攻击 / 蛊毒·黑毒心：allFoes→含剑免疫）
  // 原版算法：剑链伤害对每只目标【独立、全额】生效，不共享、不分配
  const splashes=[];
  for(const e of list){
    const before=e.t.hp;
    if(player.rogueStealTurn && !allFoes && targets) bonusGold += Math.max(1, Math.floor(before*0.2));
    const hit=Math.min(pool, before);
    e.t.hp-=hit; dmg+=hit;
    statueReflect(e.t, hit);   // 石像：等量真实伤害反弹给玩家
    if(e.t.hp<=0){ grid[e.r][e.c]=null; kills++;
      if(e.t.type==='boss'){ thiefRecover(e.t); addXp(player,15); gainGold(20); onBossKilled(); }  // 剑杀 Boss：厚赏 + 可能触发转职
      else { normalKills++; addXp(player,3+(player.killXp||0)); gainGold(1); if(player.rotflesh) player.maxHp++; }   // 神射手：击杀额外经验；屠夫·积累腐肉：+1 生命上限
      if(player.splash && pool>before) splashes.push(pool-before);   // 溅射：本次击杀的溢出留待砸向其它敌人
    }
  }
  if(bonusGold>0) gainGold(bonusGold);
  // 溅射（骷髅王被动）：每份溢出随机砸到棋盘上剩余的一个敌人/Boss（含剑免疫，排除终焉之主）
  for(const over of splashes){ const r=splashHit(over); dmg+=r.dmg; kills+=r.kills; normalKills+=r.normalKills; }
  const multiGold=multiKillGold(normalKills);
  return {dmg,kills,bonusGold,multiGold};
}
// 溅射落点：随机选一个剩余敌人/Boss（含剑免疫，排除终焉之主），造成 over 伤害
function splashHit(over){
  const foes=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t&&(t.type==='enemy'||(t.type==='boss'&&!t.finale))) foes.push([r,c]); }
  if(!foes.length) return {dmg:0,kills:0,normalKills:0};
  const [r,c]=foes[Math.floor(rnd()*foes.length)]; const t=grid[r][c];
  const hit=Math.min(over,t.hp); t.hp-=hit; statueReflect(t, hit); let kills=0, normalKills=0;
  if(t.hp<=0){ const isB=t.type==='boss'; grid[r][c]=null; kills=1; if(isB){thiefRecover(t);addXp(player,15);gainGold(20);onBossKilled();} else {normalKills=1;addXp(player,3+(player.killXp||0));gainGold(1);if(player.rotflesh)player.maxHp++;} }   // 屠夫·积累腐肉：溅射击杀也 +1 上限
  return {dmg:hit, kills, normalKills};
}

function advanceEnemies(){
  player.dmgBy={}; player.deathMode='damage';   // 死亡报告只统计死亡那一回合的伤害；若本回合改为死局判负，checkDeadlock 会把 deathMode 改成 deadlock
  // 先快照本回合的行动者：终焉浪潮在 act 中途生成的新 Boss 不应在同一回合再行动一次
  const actors=[];
  const enemyHits=[]; let enemyTotal=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c];
    if(t && (t.type==='enemy' || t.type==='boss')) actors.push({r,c,t}); }
  for(const actor of actors){
    let {r,c,t}=actor;
    if(player.cleared) break;          // 破关已结算（终焉第10波）：停止其余 Boss 行动
    if(grid[r][c]!==t){
      const pos=findTilePos(t);        // 允许行动者先被别的效果换位（如多只鸟人互换）后，仍按自身当前所在格继续行动一次
      if(!pos) continue;               // 已被本回合其它效果移除/替换（如小偷逃走）→ 跳过
      r=pos.r; c=pos.c;
    }
    const def = t.type==='boss' ? bossDef(t) : null;
    if(def && def.perTurn){ def.act(t); continue; }    // 纯每回合型（小丑/吸血鬼）：无倒计时
    let acted=false;
    t.cd--;
    if(t.cd<=0){
      if(def && def.flee){
        log(tr(`🦹 小偷逃走了！${t.stolen?`你永久失去了 ${t.stolen} 金币。`:''}`,`🦹 The Thief escapes!${t.stolen?` ${t.stolen} gold lost forever.`:''}`), 'debuff');
        grid[r][c]=null; continue;
      } else if(def && def.cdAttack){
        def.cdAttack(t); acted=true;   // 自定义倒计时攻击（饕餮：先按当前血量50%出手）
        if(grid[r][c]!==t) continue;   // cdAttack 可能已被荆棘/冰甲等连锁移除
      } else if(def && def.act){
        def.act(t);   // 特殊 Boss（如小丑）：执行特效，不直接掉血（act 内部自带日志）
      } else if(def && def.trueDmg){
        const dmg=hurtPlayer(t.atk, def.id, true, t);   // 真实伤害：无视护甲（但圣盾仍可挡）
        log(tr(`${def.emoji} ${L(def.name)} 真实伤害 ${dmg}（无视护甲）！`,`${def.emoji} ${L(def.name)} hits for ${dmg} TRUE damage (ignores armor)!`), 'bad');
      } else {
        const atk=def ? t.atk : normalEnemyAttack(t);
        const dmg=hurtPlayer(atk, def?def.id:'enemy', false, t);
        if(def) log(tr(`${def.emoji} Boss 重击 ${t.atk} → 掉 ${dmg} 血！`,`${def.emoji} Boss strike ${t.atk} → ${dmg} HP lost!`), 'bad');
        else if(dmg>0){ enemyHits.push(dmg); enemyTotal+=dmg; }
      }
      t.cd=t.baseCd;
    }
    if(def && def.everyTurn && (!def.cdAttack || acted || t.cd>0)) def.everyTurn(t);   // 饕餮类：cd 到 0 的回合先出手再吞怪；其余回合仍照常每回合生效
  }
  if(enemyHits.length){
    const detail=enemyHits.join(' + ');
    log(tr(`👹 ${enemyHits.length} 只普通怪攻击：${detail} → 共掉 ${enemyTotal} 血！`,`👹 ${enemyHits.length} normal enemies attack: ${detail} → ${enemyTotal} HP lost!`), 'bad');
  }
  if(player.shieldTurn) player.shieldTurn=false;   // 圣盾仅护本回合
  if(player.undyingTurn) player.undyingTurn=false; // 狂怒不屈仅本回合
  if(player.rebirthTurn) player.rebirthTurn=false; // 骷髅王重生仅护本回合（未触发则失效）
  if(player.nirvanaTurn) player.nirvanaTurn=false; // 朱雀涅槃仅护本回合（未触发则失效）
  if(player.tauntWindow) player.tauntWindow=false; // 斧王嘲讽：只覆盖被拉成 cd=1 的这一轮敌人动作
}
function reflectIceArmor(amt, atkr){
  let r=-1,c=-1,t=null;
  if(atkr && (atkr.type==='enemy'||(atkr.type==='boss'&&!atkr.finale))){
    for(let rr=0;rr<ROWS&&!t;rr++)for(let cc=0;cc<COLS;cc++){ if(grid[rr][cc]===atkr){ r=rr;c=cc;t=atkr;break; } }
  }
  if(!t) return;
  const hit=Math.min(amt,t.hp); t.hp-=hit; t.cd+=1; t.frostTurns=2; t.flashWhite=2; let lh=0;
  if(t.hp<=0){ const isB=t.type==='boss'; grid[r][c]=null; if(isB){ thiefRecover(t); addXp(player,15); gainGold(20); onBossKilled(); } else { addXp(player,3+(player.killXp||0)); gainGold(1); } lh=lifestealHeal(1); }
  log(tr(`🧊 冰甲反弹 ${hit} 伤害，并让攻击者更慢出手`+(lh?`，吸血 +${lh}`:''),`🧊 Ice Armor reflects ${hit} damage and slows the attacker`+(lh?`, +${lh} lifesteal`:'')), 'buff');
}
// 玩家受伤的统一入口：圣盾免伤 / 狂怒不屈保命 / 矮人护甲翻倍 / 荆棘反弹 / 伤害统计
function hurtPlayer(atk, sourceKey, ignoreArmor, attacker){
  if(player.fireFeather && attacker && (attacker.type==='enemy' || (attacker.type==='boss'&&!attacker.finale))){ if(igniteTarget(attacker,1)) log(tr('🔥 火羽：攻击者被点燃','🔥 Fire Feather: attacker ignited'), 'buff'); }
  if(player.shieldTurn) return 0;
  const armorReducer = player.armor*(player.armorMult||1) + (player.toughness||0);
  let dmg = ignoreArmor ? atk : Math.max(1, atk - armorReducer);
  if(player.tortoiseGuardTurns>0 && dmg>0) dmg=Math.max(1,Math.ceil(dmg*0.5));
  if(player.tycoonGoldShield && player.goldLock>0 && dmg>0){
    const paid = loseGoldForShield(dmg), spill = dmg-paid;
    if(paid>0) log(tr(`💸 钱能买命：花掉 ${paid} 金币挡住 ${paid} 伤害`,`💸 Money Buys Life: spend ${paid} gold to block ${paid} damage`), 'buff');
    dmg = spill;
  }
  player.hp -= dmg;
  if(player.undyingTurn && player.hp<1) player.hp=1; // 狂怒不屈：本回合最低保留 1 血
  if(player.rebirthTurn && player.hp<=0){ player.hp=player.maxHp; player.rebirthTurn=false; player.rebirthSaves=(player.rebirthSaves||0)+1; // 骷髅王重生：本回合致死则满血复活，此后重生冷却 +2
    log(tr('💀 骷髅王重生！生命恢复至满（重生冷却 +2）','💀 Skeleton King reborn! Full HP (Rebirth cooldown +2)'), 'heal'); }
  if(player.nirvanaTurn && player.hp<=0){ const add=Math.floor(player.level/2); player.maxHp+=add; player.hp=Math.max(1,Math.ceil(player.maxHp*0.5)); player.nirvanaTurn=false; log(tr(`🔥 涅槃：死亡即新生！生命上限 +${add}，恢复至 ${player.hp} 生命`,`🔥 Nirvana: death is new life! Max HP +${add}, revived at ${player.hp} HP`), 'heal'); }
  addDmg(sourceKey, dmg);
  if(dmg>0 && player.tauntWindow){ const grow=Math.max(1, Math.floor(dmg*0.1)); player.maxHp+=grow; log(tr(`🪓 嘲讽吸收：永久最大生命 +${grow}`,`🪓 Taunt converts into +${grow} max HP`), 'buff'); }
  if(dmg>0 && player.unbroken){ player.maxHp+=1; log(tr('🪓 越挫越勇：永久最大生命 +1','🪓 Unbroken: +1 permanent max HP'), 'buff'); }
  if(dmg>0 && player.iceArmor && attacker){ const ice=Math.max(1, Math.floor(frostOrbDamage()*0.5)); reflectIceArmor(ice, attacker); }
  if(player.thorns && dmg>0 && attacker){ const refl=Math.round(player.armor*(player.armorMult||1)+(player.toughness||0)); if(refl>0) reflectThorns(refl, attacker); }   // 荆棘：受到「真·攻击」时把当前护甲减伤量反弹给攻击者（非攻击不传 attacker→不反弹）
  return dmg;
}
// 石像：你对它造成多少伤害，就把等量伤害当作真实伤害（无视护甲）反弹给你。在每个对 Boss 造成伤害的点调用。
function statueReflect(t, hit){ if(t && t.bossId==='statue' && hit>0){ const d=hurtPlayer(hit, 'statue', true); if(d>0) log(tr(`🗿 石像反弹 ${d} 真实伤害！`,`🗿 Statue reflects ${d} TRUE damage!`), 'bad'); } }
// 汲取生命：每击杀 n 只怪回血（受上限封顶），返回实际回血量。供剑/炸弹/毒/箭雨/吸魂/荆棘等所有击杀路径共用。
function lifestealHeal(n){ if(!player.lifesteal||n<=0) return 0; return vampGain(n*player.lifesteal); }
// 吸血类回血（吸血/嗜血）：回到上限封顶；若有「血狂」，溢出全部增为永久生命上限。返回本次实际+的生命。
function vampGain(amount){
  if(amount<=0) return 0; const b=player.hp, space=player.maxHp-player.hp;
  if(amount<=space){ player.hp+=amount; return player.hp-b; }
  player.hp=player.maxHp; const over=amount-space;
  if(player.bloodFrenzy && over>0){ const add=Math.max(1,Math.floor(over*0.3)); player.maxHp+=add; player.hp+=add; }   // 血狂：溢出30%→永久生命上限
  return player.hp-b;
}
// 蔓藤缠绕（树人主动）：当回合让全场怪/Boss（排除终焉）流失 30% 玩家最大生命；可击杀（给奖励+吸血）
function deathCoilTick(){
  const dmg=Math.max(1, Math.floor(player.maxHp*0.3)); let kills=0, normalKills=0, hit=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c];
    if(t&&(t.type==='enemy'||(t.type==='boss'&&!t.finale))){ t.hp-=dmg; hit++;
      if(t.hp<=0){ const isB=t.type==='boss'; grid[r][c]=null; kills++; if(isB){thiefRecover(t);addXp(player,15);gainGold(20);onBossKilled();} else {normalKills++;addXp(player,3+(player.killXp||0));gainGold(1);} } } }
  if(!hit) return;
  const multiGold=multiKillGold(normalKills), lh=lifestealHeal(kills);
  log(tr(`🟢 蔓藤缠绕：全场怪血量 −${dmg}`+(kills?`，击杀 ${kills}`:'')+(multiGold?`，多杀奖励 +${multiGold} 金`:'')+(lh?`，吸血 +${lh}`:''),`🟢 Vine Coil: all foes lose ${dmg} HP`+(kills?`, ${kills} killed`:'')+(multiGold?`, multi-kill +${multiGold} gold`:'')+(lh?`, +${lh} lifesteal`:'')));
}
// 竭心光环（死灵二阶被动）：按本回合恢复量（受治疗减半影响）让全场敌人/Boss（排除终焉）各掉同等生命；可击杀（给奖励+吸血）
function witherAuraTick(healed){
  if(!healed || healed<=0) return;
  let kills=0, normalKills=0, hit=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const t=grid[r][c];
    if(t&&(t.type==='enemy'||(t.type==='boss'&&!t.finale))){
      t.hp-=healed; hit++;
      if(t.hp<=0){ const isB=t.type==='boss'; grid[r][c]=null; kills++; if(isB){ thiefRecover(t); addXp(player,15); gainGold(20); onBossKilled(); } else { normalKills++; addXp(player,3+(player.killXp||0)); gainGold(1); } }
    }
  }
  if(!hit) return;
  const multiGold=multiKillGold(normalKills), lh=lifestealHeal(kills);
  log(tr(`🪦 竭心光环：全场敌人血量 −${healed}`+(kills?`，击杀 ${kills}`:'')+(multiGold?`，多杀奖励 +${multiGold} 金`:'')+(lh?`，吸血 +${lh}`:''),`🪦 Wither Aura: all foes lose ${healed} HP`+(kills?`, ${kills} killed`:'')+(multiGold?`, multi-kill +${multiGold} gold`:'')+(lh?`, +${lh} lifesteal`:'')));
}
function reflectThorns(amt, atkr){
  let r=-1,c=-1,t=null;
  if(atkr && (atkr.type==='enemy'||(atkr.type==='boss'&&!atkr.finale))){   // 优先反弹给「攻击者本人」：按身份在棋盘上找它
    for(let rr=0;rr<ROWS&&!t;rr++)for(let cc=0;cc<COLS;cc++){ if(grid[rr][cc]===atkr){ r=rr;c=cc;t=atkr;break; } }
  }
  if(!t){ const es=[]; for(let rr=0;rr<ROWS;rr++)for(let cc=0;cc<COLS;cc++){ const x=grid[rr][cc]; if(x&&(x.type==='enemy'||x.type==='boss')&&!x.finale) es.push([rr,cc,x]); }
    if(!es.length) return; [r,c,t]=es[Math.floor(rnd()*es.length)]; }   // 攻击者已不在场（如自身已死）→ 退回随机一个敌人
  t.hp-=amt; let lh=0;
  if(t.hp<=0){ const isB=t.type==='boss'; grid[r][c]=null; if(isB){thiefRecover(t);addXp(player,15);gainGold(20);onBossKilled();} else {addXp(player,3+(player.killXp||0));gainGold(1);} lh=lifestealHeal(1); }   // 荆棘反杀也吸血
  log(tr(`🌵 荆棘反弹 ${amt} 伤害`+(lh?`，吸血 +${lh}`:''),`🌵 Thorns reflect ${amt}`+(lh?`, +${lh} lifesteal`:'')));
}

function applyGravity(){
  const prophecyType=player&&player.prophecyPending;
  const echoType=player&&player.echoPendingType;
  const forcedType=prophecyType||echoType;
  const hold=gravityFxHold|0;
  let spawned=0;
  for(let c=0;c<COLS;c++){
    let write=ROWS-1;
    for(let r=ROWS-1;r>=0;r--){ if(grid[r][c]){ const t=grid[r][c];
      if(write!==r){ grid[write][c]=t; grid[r][c]=null; if(hold>0){ t.curY=cellY(r); t.fxHold=hold; } } write--; } }
    let above=-1;
    for(let r=write;r>=0;r--){ const t=makeTile(forcedType||undefined); t.curY=cellY(above); if(hold>0) t.fxHold=hold; above--; grid[r][c]=t; spawned++; }
  }
  gravityFxHold=0;
  if(prophecyType && spawned>0){
    player.prophecyPending=null;
    log(tr(`🔮 神谕应验：本次补子全部变为${prophecyLabel(prophecyType)}` ,`🔮 Prophecy fulfilled: this refill became all ${prophecyLabel(prophecyType,true)}`), 'buff');
  } else if(echoType && spawned>0){
    player.echoPendingType=null;
    log(tr(`🌀 命运回响应验：本次补子全部为${prophecyLabel(echoType)}`,`🌀 Echo of Fate fulfilled: this refill became all ${prophecyLabel(echoType,true)}`), 'buff');
  }
}

function checkLevel(){
  while(player.xp>=xpNeeded(player.level)){
    player.xp-=xpNeeded(player.level); player.level++; pendingLevels++;
  }
}
