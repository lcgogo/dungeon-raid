//==================== 状态 ====================
let grid, player, selection, dragging, anim, busy=false, pendingLevels=0;
let rec=null, replaying=false;   // rec=本局录像{v,seed,race,acts}；replaying=回放中（回放时不录、抑制弹窗）
let replayResumeState=null;   // 进入回放前的 live 快照：退出回放时恢复，避免技能槽/职业/棋盘状态泄漏回实玩
let headless=false;   // 无头机器人模式：抑制升级弹窗(及其抽池消耗RNG)，由机器人自行抽池+录制，保证录像可确定性重放
let prophecySlotKey=null;   // 先知：当前弹框是来自一阶主动还是换装槽（heal/bomb），用于录制/进冷却
const FX_FALL_HOLD=11;   // 特殊吸取/融化类效果：棋子先消失一小拍，再开始下落，避免和特效同时发生显得太突兀
const ACTIVE_POPUP_WAIT=720;   // 主动技能结算后留出一拍，再显示升级/转职弹框
let gravityFxHold=0;     // 下一次 applyGravity 要给下落棋子的起落前停顿（按帧计，纯视觉，不进录像）
function holdNextGravity(frames=FX_FALL_HOLD){ if(headless||jumping) return; gravityFxHold=Math.max(gravityFxHold, frames|0); }

function newPlayer(){
  return {hp:20,maxHp:20, armor:0, shieldXp:0, toughness:0, shopCd:{}, skillCd:0, dmgBy:{}, deathMode:'damage', bossDue:false, gold:0, xp:0, level:1,
    weaponPower:1, swordFlat:0, armorPerShield:1, healPerHeart:1, goldPerCoin:1,
    lifesteal:0, regen:0, coinXp:0, turns:0,
    race:null, tier1:null, tier2:null, t1Pending:false, t2Pending:false,   // 种族/转职
    tier2b:null, t3Pending:false,                                          // 200回合：本种族第二个被动
    skill2:null, skill2Cd:0, t4Pending:false, autoUse:{heal:false,bomb:false}, // 350回合：任选主动替换治疗/炸弹槽；商店主动自动释放
    comboMult:1, swordMult:1, armorMult:1, maxHpUpMult:1, noArmor:false,
    chosenPerks:[],                                                      // 本局已选技能名（按选择顺序，供录像/展示用）
    prophecyPending:null, echoPendingType:null,                           // 先知 / 命运回响：下一次补子强制落下的类型
    heartPoison:false, rogueStealTurn:false, fireChainTurn:false, firewall:false, echoOfFate:false, tauntWindow:false, frostPulse:0, flashWhite:0,   // 巫医蛊毒：本回合连心改为毒怪；盗贼：本回合命中偷金；火法师：火焰链 / 火墙；先知：命运回响；斧王：下一轮受伤转上限；巫妖：冰封脉冲/冰甲白闪
    foeCdBonus:0, skillCdMod:0, splash:false, rebirthTurn:false, nirvanaTurn:false, rebirthSaves:0, healMult:1, witherAura:false, unbroken:false, iceArmor:false, beastDamageMult:1, beastPhoenix:false, fireFeather:false, dragonMight:false, dragonMightActive:false, tortoiseRegen:false, tortoiseGuardTurns:0,  // 神兽：神识经验/龙威/玄龟回生/玄龟临时半伤/朱雀火羽/朱雀涅槃
    upgradeChoices:3, bombCd:3, goldLock:0, goldFrozen:0, healUses:0, bombUses:0, shadowBombGold:false, tycoonGoldShield:false, frozen:{},  // 转职被动相关；healUses：治疗递增；bombUses：爆破手炸弹递增；shadowBombGold：乾坤一掷；tycoonGoldShield：钱能买命；frozen：雪人冰封的主动剩余回合（skill/heal/bomb）
    finaleStarted:false, finaleWave:0, cleared:false};                      // 终局：终焉之主浪潮 / 破关
}
function addXp(p,n){ p.xp += n * (p.race==='beast' ? 2 : 1); }
function xpNeeded(lv){ return 10 + lv*6; }
function armorNeeded(a){ return 3 + a*3; }   // 护甲像经验一样累积：每升 1 点护甲所需的盾进度递增（越往后越贵）

function enemyStats(){
  const lv=player.level;
  return {
    hp: 3 + Math.floor(rnd()*3) + Math.floor(lv*0.7),   // lv1≈3~5, lv10≈10~12, lv20≈17~19
    atk: 2 + Math.floor(lv*1.1),                                // lv1=2, lv5=7, lv10=13, lv20=24（提斜率，避免后期护甲碾压攻击）
    baseCd: 3 + Math.floor(rnd()*2),                    // 3~4（裸种族开局期更宽容）
  };
}
function enemyChance(){ return Math.min(0.30, 0.10 + player.level*0.014); }
function extraFoeCd(){ return (player&&player.foeCdBonus)||0; }   // 亡灵「迷惑」+1；神兽「失衡」-1（生成时统一最低 1）
