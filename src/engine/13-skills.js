//==================== 职业主动技能 ====================
// 实际冷却 = 技能基础冷却 + 全局修正（如活死人迷惑 +1），最低 1；骷髅王「重生」每实际复活一次再 +2（递增）。
function effSkillCd(id){
  const sk=id&&TIER1[id]&&TIER1[id].skill; if(!sk) return 5;
  let cd=sk.cd+(player.skillCdMod||0);
  if(id==='skeletonking') cd+=2*(player.rebirthSaves||0);
  return Math.max(1, cd);
}
function prophecyLabel(type, en){
  if(type==='coin') return en?'coins':tr('金币','coins');
  if(type==='shield') return en?'shields':tr('盾','shields');
  if(type==='heart') return en?'hearts':tr('心','hearts');
  if(type==='sword') return en?'swords':tr('剑','swords');
  if(type==='enemy') return en?'enemies':tr('怪物','enemies');
  return type||'—';
}
function activateSeerSkill(type, fromReplay, slotKey){
  if(!player) return false;
  player.prophecyPending=type;
  triggerDragonMight();
  if(slotKey){ player.skill2Cd=effSkillCd(player.skill2.id); if(!fromReplay) recAct(['b',slotKey,'seer',type]); }
  else { player.skillCd=effSkillCd(player.tier1); if(!fromReplay) recAct(['k','seer',type]); }
  prophecySlotKey=null;
  log(tr(`🔮 神谕已定：下一次补子将落下${prophecyLabel(type)}` ,`🔮 Prophecy set: the next refill will drop ${prophecyLabel(type,true)}`), 'buff');
  checkLevel(); busy=false; hideOverlay(); updateHUD();
  if(player.t3Pending){ player.t3Pending=false; showTierSelect(3); return true; }
  if(player.t4Pending){ player.t4Pending=false; showSkillSwap(); return true; }
  if(pendingLevels){ if(deferLevelUpAfterActive()) return true; return true; }
  checkDeadlock();
  return true;
}
function showProphecySelect(slotKey){
  prophecySlotKey=slotKey||null;
  busy=true;
  const card=document.getElementById('card');
  card.innerHTML=`<h2>🔮 ${tr('神谕','Prophecy')}</h2><p style="font-size:12px;color:var(--dim);margin-bottom:8px">${tr('选择下一次补子要落下的棋子类型','Choose which tile type the next refill will drop')}</p>`;
  [['coin','💰 '+tr('金币','Coin')],['shield','🔰 '+tr('盾','Shield')],['heart','💗 '+tr('心','Heart')],['sword','⚔️ '+tr('剑','Sword')],['enemy','👹 '+tr('怪物','Enemy')]].forEach(([type,label])=>{
    const b=document.createElement('button'); b.className='choice';
    b.innerHTML=`<b>${label}</b><small>${tr('下一次补子全部变成这种棋子','All newly falling tiles in the next refill become this type')}</small>`;
    b.onclick=()=>activateSeerSkill(type, false, slotKey);
    card.appendChild(b);
  });
  showOverlay();
}
function activateSkill(){
  if(busy||pendingLevels) return;
  prophecySlotKey=null;
  const sk=player&&player.tier1&&TIER1[player.tier1]&&TIER1[player.tier1].skill; if(!sk) return;  // 一阶职业的主动
  if(player.frozen && player.frozen.skill>0) return;   // 雪人冰封了一阶主动
  if(player.skillCd>0) return;
  const r=sk.f(player);
  if(r===false) return;        // 技能判定无效（如锻甲场上没护甲）：不进冷却、不刷日志
  if(r==='__defer__') return;  // 先知：等待弹框选择具体类型，提交后再进冷却/录像
  if(!sk.noCd) player.skillCd=effSkillCd(player.tier1);   // 无冷却技能（收买）不进冷却，有钱即可反复用
  triggerDragonMight();   // 龙威：解锁后使用任意主动，普通怪攻击减半
  recAct(['k']);   // 录制技能发动
  if(r===undefined) log(tr(`✨ 【${L(sk.name)}】发动！`,`✨ ${L(sk.name)} activated!`), 'buff'); // 技能没自带日志才用通用日志
  checkLevel(); updateHUD();
  if(pendingLevels){ if(deferLevelUpAfterActive()) return; return; }
  checkDeadlock();   // 用掉最后的改盘动作后若仍无棋可连 → 判负，不卡死
}
document.getElementById('skillBtn').onclick=()=>{ if(!replaying) activateSkill(); };   // 回放中技能不可点（重放经 dispatchReplayAct 直接调 activateSkill）
attachLongPress(document.getElementById('skillBtn'), 'skill');
