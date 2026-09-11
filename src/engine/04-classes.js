//==================== 种族 / 转职职业 ====================
// 开局选种族（特性≠通用升级，且各带削弱）；击败50回合Boss转一阶（主动），击败100回合Boss转二阶（被动）
// 一阶职业：主动技能（f 返回 false 表示无效不发动；返回值表示自带日志）
const LEGACY_CLASS_IDS={elder:'treant'};   // 树人历史内部 id：保留兼容旧存档 / 旧录像 / 工具参数
function normalizeClassId(id){ return LEGACY_CLASS_IDS[id]||id; }
function normalizeReplayAct(a){ if(!a) return a; if(a[0]==='t'&&typeof a[2]==='string') a[2]=normalizeClassId(a[2]); return a; }
function normalizePlayerClassIds(p){ if(!p) return p; p.tier1=normalizeClassId(p.tier1); if(p.skill2&&p.skill2.id) p.skill2.id=normalizeClassId(p.skill2.id); return p; }
const TIER1={
  knight:{n:['骑士','Knight'], quip:['盾举起来，伤害？不存在的。','Shield up. Damage? Never heard of it.'], skill:{name:['圣盾','Aegis'], short:['本回合免伤','No damage this turn'], desc:['本回合受到的所有伤害全部归 0——含 Boss 重击、无视护甲的真实伤害、石像反弹、毒心反噬等。只护本回合，下回合恢复正常。','All damage you take this turn becomes 0 — boss strikes, armor-piercing true damage, statue reflection, poison-heart backlash, everything. This turn only.'], cd:5, f:p=>{ p.shieldTurn=true; log(tr('🛡️ 圣盾：本回合免疫伤害','🛡️ Aegis: immune to damage this turn'), 'buff'); return true; }}},
  priest:{n:['牧师','Priest'], quip:['心给我，经验你拿，公平交易。','Hearts to me, XP to you. Fair deal.'], skill:{name:['祝福','Blessing'], short:['全场❤️转经验+回血','Hearts→XP & heal'], desc:['立即清空棋盘上所有的「心」：每颗转成 3 点经验，同时按每颗心的回复量给你回血。场上没有心时无效、不进冷却。','Instantly clears every heart on the board: each becomes 3 XP and also heals you (by your heal-per-heart). No effect — and no cooldown — if there are no hearts.'], cd:5, f:p=>{ const cells=[]; let n=0; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=grid[r][c]; if(t&&t.type==='heart'){cells.push({r,c,type:'heart'}); grid[r][c]=null;n++;}} if(!n)return false; absorbLinesFx(cells,{targetId:'skillBtn'}); addXp(player,n*3); const h=gainHeal(n*player.healPerHeart); applyGravity(); syncPositions(false); checkLevel(); log(tr(`💗 祝福：${n} 颗心 → ${n*3} 经验，回血 ${h}`,`💗 Blessing: ${n} hearts → ${n*3} XP, +${h} HP`), 'buff'); return n; }}},
  firemage:{n:['火法师','Fire Mage'], quip:['让火先走一步，怪自己会追上结局。','Let the fire go first; the monsters will catch up to the ending themselves.'], skill:{name:['火焰链','Flame Chain'], short:['本回合划过怪物全部点燃','Ignite all foes touched this turn'], desc:['本回合你的剑链划过的每个怪物/Boss（含幽灵等剑免疫目标，终焉之主除外）都会被点燃。被点燃者以后每回合损失「点燃当回合固定伤害的 20%」（最少 1 点），直到死亡。若本回合没有用剑链划过任何怪物，就等于白开。','This turn, every monster/boss your sword chain touches (including sword-immune targets like Ghosts, but not the Overlord) is ignited. An ignited target loses 20% of the flat damage you had on the ignition turn (minimum 1) every turn until it dies. If your chain touches no foe this turn, the cast is wasted.'], cd:5, f:p=>{ p.fireChainTurn=true; log(tr('🔥 火焰链：本回合划过的怪物都会被点燃，持续烧到死亡','🔥 Flame Chain: every foe touched this turn is ignited until it dies'), 'buff'); return true; }}},
  ranger:{n:['游侠','Ranger'], quip:['抬头——那不是雨，是箭。','Heads up — those are not raindrops.'], skill:{name:['箭雨','Arrow Rain'], short:['全场怪受{W}威力×2','×2 {W} power to all'], desc:['对场上每一只可{W}攻击的怪/Boss 各打一发「{W}威力×2」的伤害（每只独立全额，不分摊）。{W}免疫的 Boss（幽灵/小丑等）不受影响——箭属武器攻击。','Hits every {W}-targetable foe for ×2 {W} power (full damage to each, not shared). {W}-immune bosses (Ghost/Clown…) are unaffected — arrows are a weapon attack.'], cd:5, f:p=>{ const titanFlat=(p.titan?Math.floor(p.maxHp/12):0)+shieldBashFlat(p); const pool=Math.floor((p.weaponPower*2 + p.swordFlat + titanFlat)*(p.swordMult||1)); const r=dealDamage(pool,null); const lh=lifestealHeal(r.kills); applyGravity(); syncPositions(false); log(tr(`🏹 箭雨：全场 ${r.dmg} 伤害`+(r.kills?`，击杀 ${r.kills}`:'')+(lh?`，吸血 +${lh}`:''),`🏹 Arrow Rain: ${r.dmg} dmg`+(r.kills?`, ${r.kills} killed`:'')+(lh?`, +${lh} lifesteal`:''))); return true; }}},
  rogue:{n:['盗贼','Rogue'], quip:['剑能砍人，钱要从刀口里拿。','If the blade lands, the purse opens.'], skill:{name:['妙手空空','Empty Pockets'], short:['本回合命中偷金','Hits steal bonus gold'], desc:['本回合你用{WC}攻击到的每个敌人，都会额外掉落它当前血量 20% 的金币（向下取整，至少 1 金）。连线会变成金色；若这回合没用{W}打到敌人，就等于白开。','For this turn, every enemy your {WC} hits drops extra gold equal to 20% of its current HP (rounded down, minimum 1). The chain turns gold; if your {W} fails to hit anything this turn, the buff is wasted.'], cd:5, f:p=>{ p.rogueStealTurn=true; log(tr(`📲 妙手空空：本回合用${wChain()}命中的敌人，会按命中前血量额外掉金币`,`💰 Empty Pockets: enemies hit by your ${wChain()} this turn drop bonus gold from their pre-hit HP`), 'buff'); return true; }}},
  treant:{n:['树人','Treant'], quip:['生命有借有还——敌人先还。','Life is a loan; your enemies pay first.'], skill:{name:['蔓藤缠绕','Vine Coil'], short:['3回合内每回合全场怪 −30%你最大生命','3 turns: all foes −30% your max HP/turn'], desc:['发动后接下来 3 个回合，每回合让场上所有怪/Boss（含剑免疫，终焉之主除外）损失「你最大生命的 30%」。被缠绕期间敌人格变绿。','For the next 3 turns, every turn all enemies/bosses (incl. sword-immune; Overlord excluded) lose 30% of your max HP. Cursed foes glow green.'], cd:5, f:p=>{ p.deathCoil=3; log(tr('🟢 蔓藤缠绕：未来 3 回合，全场怪每回合流失你 30% 最大生命！','🟢 Vine Coil: for 3 turns, all foes lose 30% of your max HP each turn!'), 'buff'); return true; }}},
  seer:{n:['先知','Seer'], quip:['我命由我不由天','My fate is mine, not heaven\'s.'], skill:{name:['神谕','Prophecy'], short:['指定下次落下的棋子','Choose the next falling tiles'], desc:['发动后选择一种棋子：金币、盾、心、剑或怪物。下一次补子时，新落下的所有棋子都会变成该类型。若选择怪物，则只会生成普通怪物，不会生成 Boss。若本回合没有触发补子，则效果会保留到下一次补子发生。','Choose one tile type: coin, shield, heart, sword, or enemy. During the next refill, all newly falling tiles become that type. If enemy is chosen, only normal enemies are created, never bosses. If no refill happens this turn, the effect is kept until the next refill occurs.'], cd:5, f:p=>{ showProphecySelect(prophecySlotKey); return '__defer__'; }}},
  blacksmith:{n:['锻造师','Blacksmith'], quip:['盾别拿手里，焊身上才香。','Do not hold shields — wear them.'], skill:{name:['锻甲','Forge Armor'], short:['收全场盾→护甲','Absorb all shields'], desc:['吞下棋盘上所有的盾，按「每盾护甲进度」一次性转成护甲进度并立刻结算升甲。兽人无甲→无效；场上没盾→无效、不进冷却。','Devours every shield on the board, converting each into Armor XP at your per-shield rate and leveling armor at once. No effect for the armor-less Orc, or when there are no shields (no cooldown then).'], cd:5, f:p=>{ if(p.noArmor) return false; const cells=[]; let n=0; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=grid[r][c]; if(t&&t.type==='shield'){cells.push({r,c,type:'shield'}); grid[r][c]=null;n++;}} if(!n)return false; absorbLinesFx(cells,{targetId:'skillBtn'}); p.shieldXp+=n*p.armorPerShield; while(p.shieldXp>=armorNeeded(p.armor)){p.shieldXp-=armorNeeded(p.armor);p.armor++;} applyGravity(); syncPositions(false); log(tr(`🔰 锻甲：吞下 ${n} 盾（减伤 ${p.armor}）`,`🔰 Forge: ${n} shields (armor ${p.armor})`), 'buff'); return n; }}},
  miser:{n:['守财奴','Miser'], quip:['钱躺一会儿，利滚利。','Let the gold nap — it wakes up bigger.'], skill:{name:['囤金','Hoard'], short:['投入手头金币，4回合后1.2倍返还','Invest current gold; 1.2× in 4 turns'], desc:['把当前手头金币全部投入囤金，4 回合后按剩余投入金币的 1.2 倍返还。期间新获得的金币照常进账，也可以继续使用商店和其它技能；若已有「钱能买命」，受伤只会消耗手头金币，不会动囤金本金。没有金币或正在囤金时无效、不进冷却。','Invest all current gold into Hoard; after 4 turns, the remaining invested gold is paid back at 1.2×. New gold earned during Hoard is banked normally, and shops / other skills remain usable. With Money Buys Life, damage spends only current wallet gold and never touches invested Hoard gold. No effect — and no cooldown — with no gold or while already hoarding.'], cd:5, f:p=>{ if(p.goldLock>0) return false; const stake=p.gold|0; if(stake<=0) return false; p.gold=0; p.goldFrozen=stake; const n=4; p.goldLock=n; log(tr(`🔒 囤金：投入 ${stake} 金币，${n} 回合后按 1.2 倍返还`,`🔒 Hoard: invested ${stake} gold; 1.2× payout in ${n} turns`), 'buff'); return true; }}},
  guildmaster:{n:['会长','Guild Master'], quip:['有钱能使鬼推磨。','Money makes the world go round.'], skill:{name:['收买','Buyout'], short:['花「全怪血量」的金币把全场怪买通成金币','Pay gold = total enemy HP to bribe all enemies into coins'], desc:['花费「场上所有普通怪当前血量之和」那么多金币，把它们全部买通、原地变成金币（不影响 Boss）。金币不够则发动不了。无冷却，钱够就能反复用。学了「小气鬼」后花费减半。发动成功时，还会从金币数位置向被买通的怪拉出金色连线，更直观地看到这笔钱花去了哪里。','Spend gold equal to the total current HP of all regular monsters to bribe them all into coins on the spot (bosses unaffected). Fails if you cannot afford it. No cooldown — reusable while you have the gold. Costs half once you have Cheapskate. On success, golden tethers now also stretch from the gold counter to the bribed enemies so you can immediately see where the money went.'], cd:5, noCd:true, f:p=>{ let hp=0; const cells=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t&&t.type==='enemy'){ hp+=t.hp; cells.push([r,c]); } } const cost=p.cheapskate?Math.ceil(hp/2):hp;   // 小气鬼：买通花费也减半（会长100回合必得小气鬼）
    if(!cells.length || p.gold<cost) return false; p.gold-=cost; buyoutFx(cells.map(([r,c])=>({r,c})));   // 真正花钱：付「全怪血量」金币买通
    for(const [r,c] of cells){ const nt=makeTile('coin'); nt.curY=cellY(r); grid[r][c]=nt; } syncPositions(false); log(tr(`💰 收买：花 ${cost} 金币买通 ${cells.length} 只怪，化为金币！`,`💰 Buyout: paid ${cost} gold to bribe ${cells.length} enemies into coins!`), 'buff'); return cells.length; }}},
  musketeer:{n:['火枪手','Musketeer'], quip:['有人为你出了个好价钱。','Someone put a good price on you.'], skill:{name:['狙击','Snipe'], short:['优先轰 Boss；多 Boss 取血最少','Prioritize bosses; lowest-HP boss first'], desc:['优先狙击场上的 Boss；如果有多个 Boss，则选择【生命最低】的那个。若场上没有 Boss，再狙击当前生命最高的怪/Boss（炸弹式攻击，含{W}免疫与特殊 Boss，终焉之主除外），伤害 = 炸弹伤害 ×2（炸弹被「爆破手」强化时，狙击同步增强）。若这一发把它打死，获得 3 倍经验与 3 倍金币。场上没有目标时无效、不进冷却。','Prioritize bosses on the board; if there are multiple bosses, shoot the one with the **lowest HP**. If there is no boss, fall back to the highest-HP monster/boss (bomb-type — hits {W}-immune & special bosses; not the Overlord) for 2× your Bomb damage (scales with Demolitionist). If the shot kills, gain triple XP and triple gold. No effect — and no cooldown — when there is no target.'], cd:5, f:p=>{
    let bossT=null, bossR=-1, bossC=-1, bossHP=Infinity, t=null, tr_=-1, tc=-1, best=-1;
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const g=grid[r][c]; if(!g || g.finale) continue; if(g.type==='boss'){ if(g.hp<bossHP){ bossT=g; bossHP=g.hp; bossR=r; bossC=c; } }
      else if(g.type==='enemy' && g.hp>best){ t=g; best=g.hp; tr_=r; tc=c; } }
    if(bossT){ t=bossT; tr_=bossR; tc=bossC; } else if(!t){ return false; }
    if(!t) return false;   // 没有可狙击目标
    const D=bombDamage(p)*2, isBoss=t.type==='boss', before=t.hp, dealt=Math.min(D,before);
    snipeBeamFx({targetId:skillEffectTarget(prophecySlotKey)}, {r:tr_, c:tc, killed:D>=before});
    addBombFx(tr_,tc); t.hp-=D; statueReflect(t, dealt);   // 复用炸弹特效；石像会反弹
    let killed=false, lh=0;
    if(t.hp<=0){ killed=true; grid[tr_][tc]=null;
      if(isBoss){ thiefRecover(t); addXp(p,15*3); gainGold(20*3); onBossKilled(); }   // 击杀 3 倍奖励（Boss）
      else { addXp(p,(3+(p.killXp||0))*3); gainGold(1*3); if(p.rotflesh)p.maxHp++; }   // 击杀 3 倍奖励（普通怪）
      lh=lifestealHeal(1); applyGravity(); syncPositions(false);
    }
    log(tr(`🎯 狙击：对最肥目标 −${dealt}`+(killed?`，击杀！3 倍奖励`:'')+(lh?`，吸血 +${lh}`:''),`🎯 Snipe: −${dealt} to the toughest foe`+(killed?`, killed! triple rewards`:'')+(lh?`, +${lh} lifesteal`:''))); return true; }}},
  berserker:{n:['牛头人','Tauren'], quip:['疼？疼说明这刀还能更快。','Pain just means I can swing faster.'], skill:{name:['狂怒','Frenzy'], short:['本回合不死+残血增伤','Undying this turn + low-HP dmg'], desc:['立即把当前生命减半，本回合进入「不屈」：无论受到多少伤害都至少保留 1 血；且本回合血越少{W}伤害越高（最多 +60%）。只持续本回合。','Halves your current HP and grants Undying this turn: you keep ≥1 HP no matter the damage, and the lower your HP the higher your {W} damage (up to +60%). This turn only.'], cd:5, f:p=>{ p.hp=Math.max(1,Math.floor(p.hp/2)); p.lowHpDmg=true; p.undyingTurn=true; log(tr(`${wE()} 狂怒！生命减半并进入不屈（本回合无论受多少伤都保留 1 血），血越少${wN()}伤越高`,`${wE()} Frenzy! HP halved and Undying this turn (keep ≥1 HP no matter the damage); lower HP, higher ${wN()} damage`), 'buff'); return true; }}} ,
  axelord:{n:['斧王','Axe Lord'], quip:['群殴？一起上吧。','All at once? Come on, then.'], skill:{name:['嘲讽','Taunt'], short:['敌人立刻攻击，受伤转生命上限','Foes attack; damage raises max HP'], desc:['使场上所有敌人/Boss（终焉之主除外）的攻击倒计时变为 1，也就是它们会在下回合立刻攻击。接下来这批攻击中，你受到的实际伤害有 10% 会转化为永久最大生命（至少 +1）。','Sets the attack countdown of all enemies/bosses on the board (excluding the Overlord) to 1, so they will attack on the next turn. During those attacks, 10% of the actual damage you take is converted into permanent max HP (minimum +1).'], cd:5, f:p=>{ let hit=0; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t&&(t.type==='enemy'||(t.type==='boss'&&!t.finale))){ t.cd=1; hit++; } } if(!hit) return false; p.tauntWindow=true; log(tr('🪓 嘲讽：全场敌人下回合立刻攻击，你受到的实际伤害有 10% 会转化为永久最大生命（至少 +1）','🪓 Taunt: all foes attack next turn, and 10% of the actual damage you take becomes permanent max HP (minimum +1)'), 'buff'); return true; }}},
  fighter:{n:['斗士','Fighter'], quip:['越打越精神，血是我的能量饮料。','The more I fight, the better I feel.'], skill:{name:['嗜血','Bloodthirst'], short:['每命中吸3血+本回合可攻击{W}免疫怪','+3 HP per hit + pierce {W}-immunity'], desc:['本回合的{W}攻击附带两个效果：① 每命中一只怪/Boss 回复 3 点生命（按命中数算，不是击杀数）；② 可以打到平时{W}免疫的 Boss（幽灵/小丑/雪人/污染怪等，终焉之主除外）。只持续本回合，本回合不出{W}就浪费。','This turn your {W} attack gains two effects: (1) heal 3 HP per foe you hit (by hits, not kills); (2) it can strike normally {W}-immune bosses (Ghost/Clown/Snowman/Corruptor…; not the Overlord). This turn only — wasted if you make no {W} attack.'], cd:5, f:p=>{ p.bloodthirst=1; p.pierceTurn=true; log(tr(`🩸 嗜血：本回合${wChain()}每击中一只怪回 3 血，且可用${wN()}攻击${wN()}免疫的 Boss（幽灵/小丑）`,`🩸 Bloodthirst: heal 3 per enemy hit this turn, and your ${wN()} can hit ${wN()}-immune bosses (Ghost/Clown)`), 'buff'); return true; }}},
  witchdoctor:{n:['巫医','Witch Doctor'], quip:['你的心意我收下，怪替你喝。','Your love? The monsters drink it for you.'], skill:{name:['蛊毒','Hex'], short:['全场心燃成黑毒心','Burn hearts → black poison'], desc:['把棋盘上所有的红心当场燃成黑毒心（🖤）。之后连接黑毒心不回血，而是把这些生命当毒灌给场上所有怪/Boss（含{W}免疫的，终焉之主除外，与炸弹同口径）。毒伤 = 心数 × 每颗心回复量 × 连击。场上没有心时无效、不进冷却。','Burns every red heart on the board into a black poison heart (🖤) on the spot. Linking a black heart heals nothing — it poisons every foe instead (incl. {W}-immune; not the Overlord, same reach as the Bomb). Poison = hearts × heal-per-heart × combo. No effect — and no cooldown — if there are no hearts.'], cd:5, f:p=>{ let n=0; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t&&t.type==='heart'&&!t.poison){ t.poison=true; n++; } } if(!n) return false; syncPositions(false); log(tr(`🧪 蛊毒：${n} 颗心燃成黑毒心（连它们毒灌全场怪、不回血）`,`🧪 Hex: ${n} hearts burned into black poison (link them to poison all foes, no heal)`), 'buff'); return n; }}},
  swordsaint:{n:['剑圣','Sword Saint'], quip:['在我眼里，万物皆可开刃。','In my eyes, anything can be a blade.'], skill:{name:['化剑','Bladeshift'], short:['全场心/金币→剑','Hearts & coins → swords'], desc:['把棋盘上所有的心和金币都变成{W}，便于接出更长的{W}链打出爆发。场上没有心/金币时无效、不进冷却。','Turns every heart and coin on the board into {W}s so you can chain longer for a burst. No effect — and no cooldown — if there are none.'], cd:5, f:p=>{ let n=0; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t&&(t.type==='heart'||t.type==='coin')){ t.type='sword'; n++; } } if(!n) return false; log(tr(`⚔️ 化剑：${n} 个心/金币化为剑`,`⚔️ Bladeshift: ${n} hearts/coins → swords`), 'buff'); return n; }}},
  necromancer:{n:['死灵','Necromancer'], quip:['你的魂，我借来续命。','Your soul keeps me going. Thanks.'], skill:{name:['吸魂大法','Soul Drain'], short:['随机吸 2 个目标的生命补自己','Drain 2 random targets to heal'], desc:['随机选 2 个目标下手——普通怪或 Boss 都行，<b>含 {W} 免疫的特殊 Boss</b>（幽灵/小丑/污染怪/雪人），仅终焉之主除外。<br>对每个目标，吸取「你当前生命上限」与「它当前血量」里<b>较小</b>的那个：所以<b>吸力随你的生命上限成长</b>——上限越高，单发吸得越狠、越容易一发吸死（吸取量 ≥ 它血量即死亡）。<br>吸到的生命总量给你回血，<b>封顶在生命上限</b>（活死人「一切治疗减半」对这部分也生效）。<br>协同：① 学了「溅射」，被吸死目标多出的吸力（你的上限 − 它血量）会溅到剩余的一个敌人；② 击杀同样会触发「汲取生命」（前提是你还有血量空间）。<br>打法：应急回血 + 专治 {W} 免疫 Boss；越堆生命上限（巨力等）越强。','Drains 2 random targets — regular monsters or bosses alike, <b>including {W}-immune special bosses</b> (Ghost/Clown/Corruptor/Snowman); only the Overlord is exempt.<br>From each it takes the <b>lesser</b> of your current max HP and the target’s current HP — so its power <b>scales with YOUR max HP</b>: the higher your cap, the harder each drain hits and the more likely it kills outright (drain ≥ its HP = dead).<br>The total drained heals you, <b>capped at your max HP</b> (Undead’s halved-healing applies here too).<br>Synergy: (1) with Splash, a lethal drain’s leftover power (your max HP − its HP) splashes to one more foe; (2) kills also trigger Drain Life (if you have HP to spare).<br>Play: emergency healing + a hard counter to {W}-immune bosses; scales with max-HP builds (Titan, etc.).'], cd:5, f:p=>{
    const foes=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t&&(t.type==='enemy'||(t.type==='boss'&&!t.finale))) foes.push([r,c]); }
    if(!foes.length) return false;
    for(let i=foes.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [foes[i],foes[j]]=[foes[j],foes[i]]; }
    let healed=0, kills=0; const pick=foes.slice(0,2); const splashes=[];
    for(const [r,c] of pick){ const t=grid[r][c]; const before=t.hp; const drain=Math.min(p.maxHp, before); t.hp-=drain; healed+=drain; statueReflect(t, drain);   // 石像：吸魂的伤害也会反弹
      if(t.hp<=0){ const isB=t.type==='boss'; grid[r][c]=null; kills++; if(isB){thiefRecover(t);addXp(p,15);gainGold(20);onBossKilled();} else {addXp(p,3+(p.killXp||0));gainGold(1);}
        if(p.splash && p.maxHp>before) splashes.push(p.maxHp-before); } }   // 溅射：吸魂的溢出（吸力上限−目标血量）也砸向剩余敌人
    holdNextGravity(); holdVisibleBoard();
    soulDrainFx(pick);   // 特效：从每个被吸目标的格子画一条红线指向血条（纯视觉，不影响逻辑/重放）
    let splashK=0; for(const over of splashes){ splashK+=splashHit(over).kills; }   // 溅射独立结算（含剑免疫 Boss，排除终焉）
    kills+=splashK;
    const h=gainHeal(healed); const lh=lifestealHeal(kills); applyGravity(); syncPositions(false);
    log(tr(`🪄 吸魂大法：吸取 ${pick.length} 个目标 ${healed} 生命，回血 ${h}`+(kills?`，击杀 ${kills} 只`:'')+(lh?`，吸血 +${lh}`:'')+(splashes.length?`，溅射 ${splashes.length} 次`:''),`🪄 Soul Drain: drained ${healed} from ${pick.length}, +${h} HP`+(kills?`, ${kills} killed`:'')+(lh?`, +${lh} lifesteal`:'')+(splashes.length?`, ${splashes.length} splash`:'')), 'heal'); return true; }}},
  skeletonking:{n:['骷髅王','Skeleton King'], quip:['死过一次，再死一次又何妨。','Died once already — what is one more?'], skill:{name:['重生','Rebirth'], short:['本回合致死则满血复活(此后冷却+2)','Cheat death this turn, full heal'], desc:['发动后本回合若受到致命伤害，会立刻满血复活而非死亡。每触发一次，重生的冷却永久 +2。发动即进入冷却（无论本回合是否真的触发）。','Armed this turn: if a lethal blow lands, you revive at full HP instead of dying. Each trigger permanently raises Rebirth’s cooldown by 2. Goes on cooldown when cast, whether or not it triggers.'], cd:5, f:p=>{ p.rebirthTurn=true; log(tr('💀 重生待命：本回合若被击败，将满血复活！','💀 Rebirth armed: if slain this turn, revive at full HP!'), 'buff'); return true; }}},
  lich:{n:['巫妖','Lich'], quip:['感受死亡的寒冷吧。','Feel the cold of death.'], skill:{name:['冰封球','Frost Orb'], short:['全场固定伤害+全体减速','Flat damage + slow all foes'], desc:['对场上所有怪物/Boss（终焉之主除外）造成一次当前固定伤害，并让它们的当前攻击倒计时 +1。也就是说，它们下一次出手会额外慢一回合；被减速的目标会短暂染上冰蓝底色。属于冰霜攻击，可命中剑免疫 Boss。','Deals your current flat damage once to all monsters/bosses on the board (excluding the Overlord), then adds +1 to their current attack countdown. In other words, their next attack is delayed by one extra turn, and slowed targets are briefly tinted icy blue. This is a frost attack and can hit sword-immune bosses.'], cd:5, f:p=>{ addBossFx(Math.floor(ROWS/2), Math.floor(COLS/2), false, '#7fd3ff', true); let hit=0, kills=0, total=0, lh=0; const dmg=frostOrbDamage(); for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(!t||t.finale||!(t.type==='enemy'||t.type==='boss')) continue; const before=t.hp; t.hp-=dmg; t.cd+=1; t.frostTurns=3; hit++; total+=Math.min(dmg, before); if(t.hp<=0){ const isB=t.type==='boss'; grid[r][c]=null; kills++; if(isB){ thiefRecover(t); addXp(player,15); gainGold(20); onBossKilled(); } else { addXp(player,3+(player.killXp||0)); gainGold(1); } } } if(kills) lh=lifestealHeal(kills); applyGravity(); syncPositions(false); log(tr(`🧊 冰封球：全场 ${hit} 个目标共掉 ${total}`+(kills?`，击杀 ${kills}`:'')+(lh?`，吸血 +${lh}`:'')+`，下一次出手更慢`,`🧊 Frost Orb: ${hit} targets lose ${total}`+(kills?`, ${kills} killed`:'')+(lh?`, +${lh} lifesteal`:'')+`, next attacks delayed`), 'buff'); return hit||kills||lh; }}},
  butcher:{n:['屠夫','Butcher'], quip:['钩子一甩，肉就乖乖到底。','One swing of the hook, and the meat comes to me.'], skill:{name:['钩子','Hook'], short:['拉到底排；离底越远伤害越高','Drag down; farther from bottom = more damage'], desc:['一钩把棋盘上所有的怪和 Boss（含{W}免疫，终焉之主除外）顺着各自所在列拉到尽可能底部，其余棋子上浮；随后按【离底线的距离】造成伤害：最底排吃 1× 固定伤害、倒数第二排吃 2×，依此类推。场上没有可拉的敌人时无效、不进冷却。','Hooks every monster & boss (incl. {W}-immune; not the Overlord) down to the bottom of its column while other tiles float up; then deals damage by【distance from the bottom】— bottom row takes 1× flat damage, second-from-bottom 2×, and so on. No effect — and no cooldown — when there is nothing to pull.'], cd:5, f:p=>{
    let moved=0, any=false, dmg=0, kills=0; const isMon=t=>t&&(t.type==='enemy'||t.type==='boss')&&!t.finale; const hookBase=Math.max(1, p.swordFlat||0); const lines=[];
    for(let c=0;c<COLS;c++){
      const col=[]; for(let r=0;r<ROWS;r++) col.push(grid[r][c]); if(!col.some(isMon)) continue; any=true;
      const mons=[]; for(let r=0;r<ROWS;r++){ const t=grid[r][c]; if(isMon(t)) mons.push({tile:t, from:r}); }
      const newCol=col.filter(t=>!isMon(t)).concat(col.filter(isMon));   // 非敌上浮、敌沉底
      const byTile=new Map(); for(let r=0;r<ROWS;r++){ const t=newCol[r]; if(isMon(t)) byTile.set(t,r); }
      for(const m0 of mons){ const to=byTile.get(m0.tile); if(to!=null && to!==m0.from) lines.push({c1:c,r1:m0.from,c2:c,r2:to}); }
      for(let r=0;r<ROWS;r++){ if(grid[r][c]!==newCol[r]) moved++; grid[r][c]=newCol[r]; }
    }
    if(lines.length) addHookFx(lines);
    if(!any) return false;
    for(let r=ROWS-1;r>=0;r--)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(!isMon(t)) continue;
      const hit=Math.min(t.hp, hookBase*(ROWS-r)); t.hp-=hit; dmg+=hit; statueReflect(t, hit);
      if(t.hp<=0){ const isB=t.type==='boss'; grid[r][c]=null; kills++; if(isB){ thiefRecover(t); addXp(player,15); gainGold(20); onBossKilled(); } else { addXp(player,3+(player.killXp||0)); gainGold(1); if(player.rotflesh) player.maxHp++; } } }
    const lh=lifestealHeal(kills); applyGravity(); syncPositions(false);   // 满盘时 applyGravity 为空操作、不消耗 RNG；纯重排，重放确定
    log(tr(`🪝 钩子：把全场怪/Boss 拉到底排，造成 ${dmg} 伤害`+(kills?`，击杀 ${kills}`:'')+(lh?`，吸血 +${lh}`:''),`🪝 Hook: dragged all foes down for ${dmg} damage`+(kills?`, ${kills} killed`:'')+(lh?`, +${lh} lifesteal`:'')), moved?'buff':''); return true; }}},
  azuredragon:{n:['青龙','Azure Dragon'], quip:['接受来自远古的绝对威压吧！','Accept the absolute pressure of the ancients!'], skill:{name:['龙吟','Dragon Roar'], short:['全场造成等级伤害','Deal level damage to all foes'], desc:['对全场所有怪物（包括普攻免疫 Boss）造成等同当前等级的伤害。','Deal damage equal to your current level to every foe, including normal-attack-immune bosses.'], cd:5, f:p=>{ addBossFx(Math.floor(ROWS/2), Math.floor(COLS/2), false, '#f5b041', true); const r=dealDamage(p.level,null,true); applyGravity(); syncPositions(false); log(tr(`🐉 龙吟：全场 ${r.dmg} 伤害`+ (r.kills?`，击杀 ${r.kills}`:''),`🐉 Dragon Roar: ${r.dmg} damage to all foes`+(r.kills?`, ${r.kills} killed`:'')), 'buff'); return true; }}},
  whitetiger:{n:['白虎','White Tiger'], quip:['杀意先到，爪锋随后。','The killing intent arrives before the claw.'], skill:{name:['白虎破军','Tiger Breaker'], short:['下一次爪链可破免疫且伤害×3','Next Claw chain pierces immunity and deals ×3'], desc:['下一次爪链可以攻击平时爪免疫的 Boss，并使该次爪链伤害 ×3；效果会保留到下一次使用爪链。','Your next Claw chain can hit normally Claw-immune bosses and deals ×3 damage; the effect remains until a Claw chain is used.'], cd:5, f:p=>{ p.pierceTurn=1; p.beastDamageMult=3; log(tr('🐾 白虎破军：下一次爪链可破免疫，伤害 ×3','🐾 Tiger Breaker: your next Claw chain pierces immunity for ×3 damage'), 'buff'); return true; }}},
  blackturtle:{n:['玄龟','Black Tortoise'], quip:['山岳不动，风雷自止。','The mountain does not move; storms pass around it.'], skill:{name:['玄甲镇岳','Tortoise Bastion'], short:['3回合所受伤害减半','Halve damage taken for 3 turns'], desc:['发动后 3 回合内，受到的所有伤害减半（向上取整，最低 1 点）。效果结束后恢复原状，冷却 5 回合。','For 3 turns, halve all incoming damage (rounded up, minimum 1). The effect then expires, with a 5-turn cooldown.'], cd:5, f:p=>{ if(p.noArmor) return false; p.tortoiseGuardTurns=3; log(tr('🐢 玄甲镇岳：未来 3 回合所受伤害减半（最低 1）','🐢 Tortoise Bastion: damage taken is halved for the next 3 turns (minimum 1)'), 'buff'); return true; }}},
  vermilion:{n:['朱雀','Vermilion Bird'], quip:['死亡即新生！','Death is new life!'], skill:{name:['涅槃','Phoenix Rebirth'], short:['本回合致死：恢复50%生命并增加生命上限','Lethal this turn: revive at 50% HP and raise max HP'], desc:['本回合被击败不会死亡：生命上限永久增加 ⌊当前等级/2⌋，并恢复到新的生命上限的 50%。','You cannot die this turn: permanently gain ⌊current level/2⌋ max HP, then revive at 50% of your new max HP if dealt lethal damage.'], cd:5, f:p=>{ p.nirvanaTurn=true; log(tr('🔥 涅槃：本回合死亡即新生！','🔥 Phoenix Rebirth: death is new life this turn!'), 'buff'); return true; }}}
};
// 二阶职业：被动
const TIER2={
  holystrike:{n:['神圣打击','Holy Strike'], d:['治疗溢出优先轰 Boss；多 Boss 取血最少','Healing overflow prioritizes bosses; lowest-HP boss first'], f:p=>{ p.holyStrike=true; }},
  general:{n:['将军','General'], d:['升级时四选一','Level-up offers 4 choices'], f:p=>{ p.upgradeChoices=4; }},
  firewall:{n:['火墙','Firewall'], d:['底部 3 行形成火墙；其中怪物每回合掉当前固定伤害 20%（最少 1）','Bottom 3 rows become a firewall; foes there lose 20% of current flat damage each turn (minimum 1)'], f:p=>{ p.firewall=true; }},
  sharpshooter:{n:['神射手','Sharpshooter'], d:['{WC}击杀怪 +2 经验','+2 XP per {W} kill'], f:p=>{ p.killXp=(p.killXp||0)+2; }},
  shadow:{n:['乾坤一掷','All-In'], d:['买炸弹后，再额外扣当前金币的 20%，并把这笔数额加到这次炸弹伤害上','After buying a bomb, also spend 20% of your current gold and add exactly that amount to this bomb’s damage'], f:p=>{ p.shadowBombGold=true; }},
  demolitionist:{n:['爆破手','Demolitionist'], d:['每用一次炸弹：伤害 +1、花费 +5 金（越炸越强、越炸越贵）','Each bomb use: +1 damage and +5 gold cost (stronger but pricier each time)'], f:p=>{ p.bombBoost=true; }},
  shieldbash:{n:['盾击','Shield Bash'], d:['把「护甲减伤量」加到固定{WC}伤害上（护甲越厚、剑伤越高）','Adds your armor (damage-reduction) value to flat {W} damage — more armor, harder hits'], f:p=>{ p.shieldBash=true; }},
  tycoon:{n:['钱能买命','Money Buys Life'], d:['囤金期间，受到的伤害只扣手头金币；手头金币不够时，剩余伤害才继续掉血，不动囤金本金','While Hoard is active, incoming damage spends wallet gold only; any remainder spills into HP and invested Hoard gold is untouched'], f:p=>{ p.tycoonGoldShield=true; }},
  warlord:{n:['巨力','Titan'], d:['最大生命越高，{WC}固定伤害越高（每 12 点最大生命 +1）','Higher max HP = higher flat {W} damage (+1 per 12 max HP)'], f:p=>{ p.titan=true; }},
  thorns:{n:['荆棘','Thorns'], d:['受到攻击时，把「当前护甲减伤量」反弹给攻击者（护甲越高反弹越多）','When hit, reflect your current armor (damage-reduction) back to the attacker — more armor, more reflect'], f:p=>{ p.thorns=true; }},
  bloodfrenzy:{n:['血狂','Blood Frenzy'], d:['吸血/嗜血回血超出生命上限时，溢出的 30% 增为永久生命上限；但每回合结束损失 5% 最大生命','Lifesteal/Bloodthirst healing past max HP: 30% of overflow becomes permanent max HP; but at end of every turn, lose 5% of max HP'], f:p=>{ p.bloodFrenzy=true; }},
  cheapskate:{n:['小气鬼','Cheapskate'], d:['消耗金币的主动（商店治疗/炸弹、会长「收买」）花费减半','Gold-spending actives (shop Heal/Bomb, Guild Master’s Buyout) cost half'], f:p=>{ p.cheapskate=true; }},
  witheraura:{n:['竭心光环','Wither Aura'], d:['按你每回合恢复量（受治疗减半影响）先扣自己同等生命，再让全场敌人/Boss 各掉同等生命','Each turn, lose HP equal to your regen amount after healing modifiers, then deal that same amount to all enemies/bosses'], f:p=>{ p.witherAura=true; }},
  icearmor:{n:['冰甲','Ice Armor'], d:['每次你受到怪物/Boss攻击后，对攻击者造成 50% 当前固定伤害（至少 1），并让它的当前攻击倒计时 +1','Whenever a monster/boss hits you, deal 50% of your current flat damage back to that attacker (minimum 1) and add +1 to its current attack countdown'], f:p=>{ p.iceArmor=true; }},
  unbroken:{n:['越挫越勇','Unbroken'], d:['每次你受到一次伤害时，永久获得 +1 最大生命','Whenever you take damage, gain +1 permanent max HP'], f:p=>{ p.unbroken=true; }},
  splash:{n:['溅射','Splash'], d:['攻击溢出伤害随机溅到剩余敌人（含{W}免疫 Boss）','Overflow damage splashes to a random remaining foe (incl. {W}-immune bosses)'], f:p=>{ p.splash=true; }},
  rotflesh:{n:['积累腐肉','Carrion Feast'], d:['每杀死一个敌人/Boss，生命上限永久 +1（腐肉越积越厚）','Each enemy/boss killed: +1 permanent max HP (carrion keeps piling up)'], f:p=>{ p.rotflesh=true; }},
  bladeall:{n:['皆可为剑','Anything a Blade'], d:['每回合棋盘摆完后，把 3 个非敌/非剑棋子变成剑','Each turn after the board settles, turns 3 non-enemy non-sword tiles into swords'], f:p=>{ p.swordConvert=true; }},
  allpoison:{n:['万物皆毒','All is Poison'], d:['每回合把 3 个非敌/非心棋子燃成黑毒心；连黑毒心只放毒灌全场怪、不回血','Each turn burns 3 non-enemy non-heart tiles into BLACK poison hearts; linking them poisons all foes (no heal)'], f:p=>{ p.poisonConvert=true; }},
  echooffate:{n:['命运回响','Echo of Fate'], d:['每 5 个有效回合自动触发：下一回合补子必定变成触发回合消除的非怪物棋子','Every 5 valid turns: the next refill is guaranteed to match the non-enemy tile cleared on the trigger turn'], f:p=>{ p.echoOfFate=true; }},
  dragonmight:{n:['龙威','Dragon Might'], d:['使用任意主动技能后，普通怪物的攻击减半','After using any active skill, normal monsters deal half attack damage'], f:p=>{ p.dragonMight=true; }},
  tigerfury:{n:['杀伐之心','Tiger Fury'], d:['固定爪伤 +⌊等级/2⌋','+⌊level/2⌋ flat Claw damage'], f:p=>{ p.tigerFury=true; }},
  tortoiseheart:{n:['恐鳌之心','Heart of Tarrasque'], d:['每回合恢复当前生命的 10%','Restore 10% of current HP each turn'], f:p=>{ p.tortoiseRegen=true; }},
  phoenixash:{n:['火羽','Fire Feather'], d:['任何攻击你的怪物都会被点燃','Any monster that attacks you is ignited'], f:p=>{ p.fireFeather=true; }},
};
// 二阶被动锁定到一阶职业（100 回合按此直接授予；200 回合再从同族其余被动里选另一个）
const CLASS_T2={
  knight:'general', priest:'holystrike', firemage:'firewall', swordsaint:'bladeall',
  ranger:'sharpshooter', rogue:'shadow', treant:'thorns', seer:'echooffate',
  blacksmith:'shieldbash', miser:'tycoon', guildmaster:'cheapskate', musketeer:'demolitionist',
  necromancer:'witheraura', skeletonking:'splash', butcher:'rotflesh', lich:'icearmor',
  berserker:'warlord', fighter:'bloodfrenzy', witchdoctor:'allpoison', axelord:'unbroken',
  azuredragon:'dragonmight', whitetiger:'tigerfury', blackturtle:'tortoiseheart', vermilion:'phoenixash',
};
const RACE_PATHS={
  human:{t1:['knight','priest','firemage','swordsaint'], t2:['general','holystrike','firewall','bladeall']},
  elf:  {t1:['ranger','rogue','treant','seer'], t2:['sharpshooter','shadow','thorns','echooffate']},
  dwarf:{t1:['blacksmith','miser','guildmaster','musketeer'], t2:['shieldbash','tycoon','cheapskate','demolitionist']},
  undead:{t1:['necromancer','skeletonking','butcher','lich'], t2:['witheraura','splash','rotflesh','icearmor']},
  orc:  {t1:['berserker','fighter','witchdoctor','axelord'], t2:['warlord','bloodfrenzy','allpoison','unbroken']},
  beast:{t1:['azuredragon','whitetiger','blackturtle','vermilion'], t2:['dragonmight','tigerfury','tortoiseheart','phoenixash']},
};
function raceById(id){ return RACES.find(r=>r.id===id)||RACES[0]; }
let __bootHandled=false;
// 开始页（落地）：标题 + 开篇引言 + START + 继续/回放/导入/排行榜 + 致敬（最下）
function isStandaloneMode(){
  try{
    return !!((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || (typeof navigator!=='undefined' && navigator.standalone));
  }catch(e){ return false; }
}
function isiOS(){
  try{
    const ua=((navigator.userAgent||'')+'').toLowerCase();
    return /iphone|ipad|ipod/.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  }catch(e){ return false; }
}
async function triggerInstall(){
  if(installPromptEvt){
    try{
      const evt=installPromptEvt; installPromptEvt=null;
      evt.prompt();
      await evt.userChoice;
    }catch(e){}
    return;
  }
  const card=document.getElementById('card');
  const body = isiOS()
    ? tr('在 Safari 点右上角/底部的「分享」按钮，再选「添加到主屏幕」。','In Safari, tap Share and then choose “Add to Home Screen”.')
    : tr('当前浏览器没有提供一键安装弹窗；可用系统/浏览器菜单里的“添加到主屏幕”或“安装应用”。','This browser did not expose a one-tap install prompt; use the browser menu’s “Add to Home Screen” or “Install App” option.');
  card.innerHTML=`<h2>📲 ${tr('放到桌面','Add to Home Screen')}</h2>
    <p style="line-height:1.7">${body}</p>
    <button class="btn" id="insClose" style="width:100%">${tr('知道了','Got it')}</button>`;
  document.getElementById('insClose').onclick=()=>showClassSelect();
  showOverlay();
}
function showClassSelect(){
  // 首次进入：若 URL 带 ?rec=<id> → 拉取分享录像并回放（仅 boot 时触发一次）
  if(!__bootHandled){ __bootHandled=true;
    const id = (typeof location!=='undefined') ? new URLSearchParams(location.search).get('rec') : null;
    if(id){ loadSharedReplay(id); return; }
  }
  busy=true;
  const card=document.getElementById('card');
  const verBadge = DEV
    ? `<span style="background:#7d3cad;color:#fff;font-size:12px;font-weight:700;padding:3px 12px;border-radius:12px;letter-spacing:1px">🚧 DEV ${VERSION} · ${tr('开发版','build')}</span>`
    : `<span style="background:#2e7d46;color:#fff;font-size:12px;font-weight:700;padding:3px 12px;border-radius:12px;letter-spacing:1px">✅ ${VERSION} · ${tr('正式版','Release')}</span>`;
  // 版本徽标旁放一个「🏠 首页」按钮，回到版本选择页（index.html）
  const buildBadge = `<div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:8px">${verBadge}<a href="index.html" style="font-size:12px;color:var(--dim);text-decoration:none;border:1px solid #4a3a63;border-radius:12px;padding:3px 11px">🏠 ${tr('首页','Home')}</a></div>`;
  card.innerHTML=`${buildBadge}
    <h2 style="margin:2px 0 6px">⚔️ ${tr('地牢突袭','Dungeon Raid')}</h2>
    <div style="text-align:left;font-size:11.5px;line-height:1.6;background:var(--panel2);border-radius:10px;padding:9px 11px;margin-bottom:10px">
      <span style="color:var(--gold);font-weight:700">🕯️ ${tr('地牢之下','Beneath the Dungeon')}</span>
      <span style="color:var(--dim)"> ${tr('地心封印着「终焉之主」，历代冒险者潜入地牢、无人生还——轮到你了。拖动连接相邻同类符文：🔪斩怪、🔰凝甲、💗回血、💰补给。能走多深，看你自己。','The Overlord lies sealed at the world’s core; none who went in returned — your turn now. Link adjacent runes: 🔪 slay, 🔰 armor, 💗 heal, 💰 supplies. How deep you go is up to you.')}</span>
      <div style="display:flex;justify-content:center;margin:8px 0 3px">
        <div style="display:inline-grid;grid-template-columns:auto auto auto;justify-items:center;align-items:center;font-size:19px;column-gap:3px;row-gap:0">
          <span>🔪</span><span></span><span></span>
          <span style="color:var(--gold);font-size:15px">↘</span><span>👹</span><span><span style="color:var(--gold);font-size:15px">━</span>🔪</span>
        </div></div>
      <div style="color:var(--dim);text-align:center;font-size:10.5px">${tr('🔪剑链可穿过 👹——<b>横竖斜 8 向</b>连成一条线即可攻击，每只怪独立吃满整条伤害。<br>💡 <b>轻点方块</b>看说明；<b>长按商店/技能块</b>看数值。','A 🔪 chain cuts through 👹 — link <b>8 directions</b>; every monster takes the full chain’s damage.<br>💡 <b>Tap a tile</b> for info; <b>long-press a shop/skill block</b> for details.')}</div>
    </div>`;
  // ▶ START（主按钮）→ 选种族页
  const start=document.createElement('button'); start.className='btn';
  start.style.width='100%'; start.style.marginBottom='8px'; start.style.fontSize='17px';
  start.textContent='▶ '+tr('开始游戏','START');
  start.onclick=()=>showRaceSelect();
  card.appendChild(start);
  // 排行榜展示名：自动填上次的，🎲 随机起名（形容词+的+名词）
  const nrow=document.createElement('div');
  nrow.style.cssText='display:flex;gap:6px;margin-bottom:8px;align-items:center';
  nrow.innerHTML=`<input id="nameInput" maxlength="24" placeholder="${tr('排行榜名字（最长12字）','Leaderboard name (≤12 CJK)')}" style="flex:1;min-width:0;background:var(--panel2);border:1px solid #4a3a63;color:var(--txt);border-radius:10px;padding:9px 11px;font-size:13px">
    <button id="nameDice" title="${tr('随机起名','Random')}" style="flex:none;background:var(--panel2);border:1px solid #4a3a63;border-radius:10px;padding:9px 12px;cursor:pointer;font-size:15px">🎲</button>`;
  card.appendChild(nrow);
  const ni=document.getElementById('nameInput'); const nd=document.getElementById('nameDice');
  if(ni){ ni.value=getName(); ni.oninput=()=>{ const c=clampName(ni.value); if(c!==ni.value) ni.value=c; setName(c); }; }
  if(nd) nd.onclick=()=>{ if(ni){ ni.value=genName(); setName(ni.value); } };
  // 紧凑单行次级按钮（省竖向空间，整页控制在一屏内）
  const mk=(border,html,fn)=>{ const b=document.createElement('button'); b.className='choice'; b.style.cssText='padding:9px 12px;margin:0 0 6px;text-align:left;border-color:'+border; b.innerHTML=html; b.onclick=fn; card.appendChild(b); };
  if(hasSave()) mk('#2e7d46', `<b>▶ ${tr('继续上局','Continue last run')}</b>`, ()=>loadGame());
  const lastRec=getLastRec();
  if(lastRec) mk('#6a4fa3', `<b>🎬 ${tr('回放上一局','Replay last run')}</b>`, ()=>startReplay(lastRec));
  mk('#6a4fa3', `<b>📥 ${tr('导入回放','Import replay')}</b>`, ()=>importReplay());
  mk('#a8852c', `<b>🏆 ${tr('排行榜','Leaderboard')}</b>`, ()=>showLeaderboard());
  // 🙏 致敬原作（放最下面）
  const trib=document.createElement('div');
  trib.style.cssText='text-align:left;font-size:10.5px;line-height:1.55;color:var(--dim);margin-top:8px';
  trib.innerHTML=`🙏 ${tr('致敬 2011 年 iOS 经典《Dungeon Raid》(Fireflame Games)，非官方粉丝复刻。联系不上原作者，知情者请到','A tribute to the 2011 iOS classic “Dungeon Raid” (Fireflame Games) — unofficial fan remake. Can’t reach the original author; if you know them, please reach me at')} <a href="https://github.com/lcgogo/dungeon-raid/issues" target="_blank" rel="noopener" style="color:var(--gold)">github.com/lcgogo/dungeon-raid/issues</a>`;
  card.appendChild(trib);
  showOverlay();
}
// 选种族页（点 START 后进入）
function showRaceSelect(){
  busy=true;
  purgeWarmSeed();
  const card=document.getElementById('card');
  const best=getBest();
  const bestLine = best ? `<p>${tr('🏆 最佳纪录：等级','🏆 Best: Level')} ${best.level} · 💰${best.gold}</p>` : '';
  card.innerHTML=`<h2>${tr('选择种族','Choose your race')}</h2>${bestLine}
    <p style="font-size:12px;color:var(--dim);line-height:1.6">${tr('击败第 50 回合的 Boss 即可转职，解锁职业的主动技能；之后随着探险深入，还会解锁更强大的技能……','Beat the turn-50 boss to advance to a class and unlock its active skill; delve deeper to unlock ever more powerful skills…')}</p>`;
  const firstRc=preferredSeedRace();
  if(firstRc) prefetchServerSeed(firstRc);
  RACES.forEach((rc,idx)=>{
    const b=document.createElement('button'); b.className='choice';
    b.innerHTML=`<b>${rc.e} ${L(rc.n)}</b><small style="white-space:pre-line">${L(rc.d)}</small>`;
    b.onclick=()=>freshStart(rc);
    if(idx===0){
      b.onpointerenter=()=>prefetchServerSeed(rc);
      b.onfocus=()=>prefetchServerSeed(rc);
      b.ontouchstart=()=>prefetchServerSeed(rc);
    } else {
      b.onpointerenter=()=>prefetchServerSeed(rc);
      b.onfocus=()=>prefetchServerSeed(rc);
    }
    card.appendChild(b);
  });
  const back=document.createElement('button'); back.className='btn'; back.style.marginTop='4px';
  back.textContent='← '+tr('返回','Back');
  back.onclick=()=>showClassSelect();
  card.appendChild(back);
  showOverlay();
}
function importReplay(){
  const s=prompt(tr('粘贴录像 JSON：','Paste recording JSON:')); if(!s) return;
  let r; try{ r=JSON.parse(s); }catch(e){ alert(tr('解析失败：JSON 格式错误','Parse failed: invalid JSON')); return; }
  if(!r||!Array.isArray(r.acts)||typeof r.seed!=='number'){ alert(tr('录像无效','Invalid recording')); return; }
  startReplay(r);
}
// 打开 ?rec=<id> 的分享链接：从 API 拉取录像并回放
async function loadSharedReplay(id){
  hideOverlay(); logClear(); log(tr('⏳ 正在加载分享录像…','⏳ Loading shared replay…'));
  try{
    const res=await fetch(REC_API+'/rec/'+encodeURIComponent(id));
    if(!res.ok) throw new Error('HTTP '+res.status);
    const r=await res.json();
    if(!r||!Array.isArray(r.acts)||typeof r.seed!=='number') throw new Error('invalid');
    startReplay(r);
  }catch(e){ log(tr('分享录像加载失败：','Failed to load shared replay: ')+e.message); __bootHandled=true; showClassSelect(); }
}

// 转职选择：tier=1 一阶（主动），tier=2 二阶（被动），tier=3 本种族第二个被动（200回合）
// 转职祝福语（层层递进）：一转→二转→三转→四转（语气接近俏皮话）
const TRANSFORM_BLESS={
  1:['🌱 初出茅庐，刀锋初开——好戏才刚开场。','🌱 Fresh off the boat, blade just honed — the show only begins.'],
  2:['🔥 再上一阶，地牢开始记住你的名字。','🔥 One tier higher — the dungeon starts learning your name.'],
  3:['⚡ 三度淬炼，连 Boss 都得掂量掂量。','⚡ Thrice tempered — even bosses think twice now.'],
  4:['🌌 经过漫长的修炼，你已经突破种族的极限！','🌌 Through long training, you have broken past your race’s limits!'],
};
function tierPreviewData(tier, id){
  if(tier!==1) return null;
  const t1=TIER1[id], t2Id=CLASS_T2[id], t2=t2Id&&TIER2[t2Id];
  if(!t1||!t1.skill||!t2) return null;
  return {
    icon:'🌟',
    title:`${L(t1.n)} → ${L(t2.n)}`,
    desc:`${tr('100回合锁定二阶技能','Locked Tier-2 passive at turn 100')}<br><span style="color:#caa6e6">${tr('主动','Active')}：${L(t1.skill.name)} · ${L(t1.skill.short)}</span>`,
    rows:[
      [tr('职业主动','Active'), `${L(t1.skill.name)} · ${L(t1.skill.short)}`],
      [tr('锁定二阶','Locked Tier-2'), `${L(t2.n)}`],
      [tr('效果','Effect'), `${L(t2.d)}`],
    ],
  };
}
function attachTierChoicePreview(el, tier, id){
  if(tier!==1) return;
  let timer=null, fired=false, sx=0, sy=0;
  const clear=()=>{ if(timer){ clearTimeout(timer); timer=null; } };
  el.addEventListener('pointerdown', e=>{ if(replaying) return; fired=false; sx=e.clientX; sy=e.clientY; clear();
    timer=setTimeout(()=>{ timer=null; const info=tierPreviewData(tier,id); if(!info) return; fired=true; busy=true; const rows=info.rows.map(([k,v])=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 2px;border-bottom:1px solid #3a2d4d"><span style="color:var(--dim)">${k}</span><b style="text-align:right">${v}</b></div>`).join(''); const card=document.getElementById('card'); card.innerHTML=`<h2>${info.icon} ${info.title}</h2><p style="font-size:13px;line-height:1.5">${info.desc}</p><div style="text-align:left;font-size:13px;margin:0 0 14px">${rows}</div><button class="btn" id="tierPrevClose" style="width:100%">${tr('关闭','Close')}</button>`; document.getElementById('tierPrevClose').onclick=()=>showTierSelect(tier); showOverlay(); }, 450); });
  el.addEventListener('pointermove', e=>{ if(timer && (Math.abs(e.clientX-sx)>10 || Math.abs(e.clientY-sy)>10)) clear(); });
  el.addEventListener('pointerup', clear);
  el.addEventListener('pointercancel', clear);
  el.addEventListener('pointerleave', clear);
  el.addEventListener('click', e=>{ if(fired){ e.preventDefault(); e.stopImmediatePropagation(); fired=false; } }, true);
}
function showTierSelect(tier){
  if(replaying) return;   // 回放：转职由动作序列驱动，不弹窗
  busy=true; player.awaitingTier=tier;
  const path=RACE_PATHS[player.race];
  // 二阶（100回合）锁定到职业的专属被动（不自由选）；本族技能（200回合）再从同族其余被动里选一个
  const ids = tier===1 ? path.t1 : tier===2 ? [CLASS_T2[normalizeClassId(player.tier1)]] : path.t2.filter(id=>id!==player.tier2);
  const pool = tier===1 ? TIER1 : TIER2;
  const head = tier===1 ? tr('⚔️ 转职','⚔️ Advance: Class')
             : tier===3 ? tr('🌟 本族技能','🌟 Race Skill')
             : tr('🌟 二阶技能','🌟 Tier-2 Skill');
  const sub  = tier===1 ? tr('击败强敌！选择一个职业，解锁主动技能','Boss slain! Pick a class to unlock an active skill')
             : tier===3 ? tr('再获得一项本族技能（本种族的另一项被动）','Gain another Race Skill (your race’s other passive)')
             : tr('你的职业觉醒了专属二阶技能（被动）','Your class awakens its signature Tier-2 Skill (passive)');
  const card=document.getElementById('card');
  card.innerHTML=`<h2>${head}</h2><p>${sub}</p><p style="color:#caa6e6;font-style:italic;font-size:13px;margin:-4px 0 10px">${L(TRANSFORM_BLESS[tier])}</p>`;
  ids.forEach(id=>{
    const def=pool[id];
    const b=document.createElement('button'); b.className='choice';
    const detail = tier===1
      ? `<i style="color:#caa6e6">「${L(def.quip)}」</i>`
        + `<br>${tr('主动','Active')}【${L(def.skill.name)}】${L(def.skill.short)}`
        + (def.passive?`<br>${tr('被动','Passive')}：${L(def.passive)}`:'')
      : L(def.d);
    b.innerHTML=`<b>${L(def.n)}</b><small>${detail}</small>`;
    attachTierChoicePreview(b, tier, id);
    b.onclick=()=>{
      recAct(['t', tier, id]);   // 录制转职选择
      if(tier===1){ player.tier1=normalizeClassId(id); }
      else if(tier===3){ player.tier2b=id; def.f(player); player.hp=Math.min(player.hp,player.maxHp); }
      else { player.tier2=id; def.f(player); player.hp=Math.min(player.hp,player.maxHp); }
      player.awaitingTier=0;
      log(tr(`✨ 获得 ${L(def.n)}！`,`✨ Gained ${L(def.n)}!`), 'buff');
      if(pendingLevels){ showLevelUp(); } else { busy=false; hideOverlay(); }   // 转职同时若有待升级，接着弹升级；否则会卡住不能划
      updateHUD();   // 必须在 busy 复位之后刷新，否则技能/商店按钮停留在禁用态（老问题：转职后技能用不了）
    };
    card.appendChild(b);
  });
  showOverlay();
}
function canChooseSwapSkill(id, p){
  // 只隐藏对当前角色永久无效的跨界主动；其余主动即使少了原职业被动，也按当前角色属性正常结算。
  if(id==='blacksmith' && p && p.noArmor) return false;
  return true;
}
// 350回合：从全种族全职业的主动里选一个，替换掉商店的 治疗 或 炸弹 槽
function showSkillSwap(){
  if(replaying) return;
  busy=true; player.awaitingTier=4;
  const card=document.getElementById('card');
  card.innerHTML=`<h2 style="margin-bottom:4px">🌐 ${tr('跨界技能','Crossover Skill')}</h2>
    <div style="background:#3a1414;border:1px solid #e74c3c;border-radius:8px;padding:6px 9px;margin:4px 0 8px;color:#ff7a6b;font-size:12px;font-weight:700;text-align:center">⚠️ ${tr('地牢震怒！此后每 10 回合将同时降临 2 个不同的 Boss！','⚠️ The dungeon rages! From now on, 2 different bosses descend together every 10 turns!')}</div>
    <p style="color:#caa6e6;font-style:italic;font-size:13px;margin:2px 0 6px">${L(TRANSFORM_BLESS[4])}</p>
    <p style="margin-bottom:8px;font-size:12px">${tr('从其他种族的主动里任选一个，替换 💊治疗 或 💥炸弹 槽（带该技能冷却）','Pick an active skill from another race to replace your 💊Heal or 💥Bomb slot (uses its cooldown)')}</p>`;
  // 排除本种族职业技能，实现真正的"跨界"（用 RACE_PATHS，覆盖全部 6 个种族——旧写死表漏了矮人/活死人，导致他们能选到自己种族技能）
  const myRace=player.race||'human';
  const excludeIds=new Set(((RACE_PATHS[myRace]&&RACE_PATHS[myRace].t1)||[]).map(normalizeClassId));
  Object.keys(TIER1).forEach(id=>{
    if(excludeIds.has(id)) return;   // 排除本种族职业技能
    // 排除对当前玩家永久无效的技能（如兽人无甲→锻甲无效）；其它主动只按当前角色属性结算，不做职业限定。
    const def=TIER1[id], sk=def.skill;
    const b=document.createElement('button'); b.className='choice'; b.style.cssText='padding:8px 12px;margin:0 0 6px';
    b.innerHTML=`<b style="display:inline">✨ ${L(sk.name)}</b> <span style="color:var(--dim);font-size:12px">${L(sk.short)} · ${sk.noCd?tr('无冷却','no CD'):'CD'+sk.cd}</span>`;
    b.onclick=()=>chooseSwapSlot(id);
    card.appendChild(b);
  });
  showOverlay();
}
// 选好主动后，再选替换哪个槽位
function chooseSwapSlot(skillId){
  const sk=TIER1[skillId].skill;
  const card=document.getElementById('card');
  card.innerHTML=`<h2>✨ ${L(sk.name)}</h2>
    <p>${tr('替换掉哪个商店槽？','Replace which shop slot?')}</p>`;
  [['heal','💊 '+tr('治疗','Heal')],['bomb','💥 '+tr('炸弹','Bomb')]].forEach(([slot,lab])=>{
    const b=document.createElement('button'); b.className='choice';
    b.innerHTML=`<b>${lab}</b><small>${tr('用','use')} ${L(sk.name)} ${tr('替换此槽','to replace this slot')}</small>`;
    b.onclick=()=>{
      recAct(['t', 4, skillId, slot]);
      player.skill2={id:skillId, slot}; player.skill2Cd=0;
      if(player.autoUse) player.autoUse[slot]=false;
      player.awaitingTier=0;
      log(tr(`🔁 ${L(sk.name)} 已替换 ${slot==='heal'?'💊治疗':'💥炸弹'}！`,`🔁 ${L(sk.name)} now replaces ${slot==='heal'?'Heal':'Bomb'}!`), 'buff');
      if(pendingLevels){ showLevelUp(); } else { busy=false; hideOverlay(); }   // 同上：避免转职/换装与升级同回合时卡住
      updateHUD();   // 必须在 busy 复位之后刷新，否则技能/商店按钮停留在禁用态
    };
    card.appendChild(b);
  });
  const back=document.createElement('button'); back.className='btn'; back.style.marginTop='4px';
  back.textContent=tr('← 重选主动','← Pick another');
  back.onclick=()=>showSkillSwap();
  card.appendChild(back);
  showOverlay();
}
// Boss 被击败时调用：到点则标记可转职（结算后弹选择）
function onBossKilled(){
  log(tr('🏆 击败 Boss！厚赏 💰+20、经验 +15','🏆 Boss defeated! 💰+20, XP+15'), 'buff');   // 统一奖励日志：所有击杀路径（剑/炸弹/荆棘/吸魂/吸血鬼中毒）都会报
  if(player.rotflesh) player.maxHp++;   // 屠夫·积累腐肉：击败 Boss 也 +1 生命上限
  if(!replaying){ if(rec){ rec.maxHp=player.maxHp; rec.level=player.level; rec.gold=player.gold; rec.turns=player.turns; } saveRec(); }
  if(!player.tier1 && player.turns>=50) player.t1Pending=true;
  else if(player.tier1 && !player.tier2 && player.turns>=100) player.t2Pending=true;
  else if(player.tier2 && !player.tier2b && player.turns>=200) player.t3Pending=true;     // 200回合：本种族第二被动
  else if(player.tier2b && !player.skill2 && player.turns>=350){ player.t4Pending=true; player.doubleBoss=true; }     // 350回合 Boss：主动换装 + 此后每 10 回合同时降临 2 个不同 Boss
}
