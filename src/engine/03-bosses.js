// ===== Boss 池：每 10 回合从中随机挑一个现身。剑链免疫，只能用炸弹炸，奖励丰厚 =====
const BOSSES=[
  { id:'ghost', emoji:'👻', name:['幽灵','Ghost'], quip:['{W}？穿过去了，挠痒痒都算不上。','{W}s? They pass right through me.'], monster:true, noTierScale:true,
    desc:['{WC}对它无效，只能用 💥炸弹 炸。血量与同级普通怪一致；倒计时归零会对你重击！','Immune to {WC} — only the 💥 Bomb hurts it. Its HP matches same-tier normal enemies, and it strikes you hard at 0!'] },
  { id:'clown', emoji:'🤡', name:['小丑','Clown'], quip:['笑一个嘛，反正棋盘已经乱了。','Smile! Your board is a mess anyway.'], perTurn:true,
    special:['每回合重洗几个资源棋子','Re-rolls a few resource tiles each turn'],
    desc:['{WC}对它无效，只能用 💥炸弹 炸。它【每回合】把场上随机几个非怪棋子重洗成别的资源（剑/盾/心/金），搅乱你的连线节奏。它不会变出新怪、也不碰你已有的怪/Boss（出怪是召唤师的活）——纯粹捣乱，趁早炸掉它。','Immune to {WC} — only the 💥 Bomb works. Every turn it re-rolls a few random non-monster tiles into other resources ({WC}/shield/heart/coin), disrupting your chains. It does NOT spawn monsters and never touches your existing foes (summoning is the Summoner’s job) — pure chaos, so bomb it early.'],
    act(t){ const k=scrambleTiles(2+(t.tier||1), ['boss','enemy']); log(tr(`🤡 小丑捣乱，打乱了 ${k} 个棋子！`,`🤡 The Clown scrambles ${k} tiles!`), 'debuff'); } },
  { id:'lashmaster', emoji:'🪢', name:['鞭笞者','Lashmaster'], quip:['小子们，给我燥起来。','Move, you lot — stir up some chaos.'], perTurn:true,
    special:['出场与每回合都让所有普通怪攻击倒计时 -1','On spawn and every turn, all normal enemies get -1 countdown'],
    desc:['{WC}对它无效，只能用 💥炸弹 炸。它一出场就会让场上所有普通怪物的攻击倒计时 -1，之后【每回合】再让所有普通怪物的攻击倒计时 -1。它自己未必最疼，但会把整盘怪一起抽进暴走节奏——拖得越久，怪就越快出手。','Immune to {WC} — only the 💥 Bomb works. On spawn it reduces the attack countdown of all normal enemies on the board by 1, then does so again every turn after that. It may not hit the hardest by itself, but it drives the whole board into a frenzy — the longer it lives, the faster everything else attacks.'],
    onSpawn(t){ let n=0; const cells=[]; let sr=-1, sc=-1; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const x=grid[r][c]; if(x===t){ sr=r; sc=c; } else if(x&&x.type==='enemy'){ x.cd=Math.max(1,x.cd-1); cells.push({r,c}); n++; } } if(n){ lashmasterFx({r:sr,c:sc},cells); log(tr(`🪢 鞭笞者现身，${n} 只怪物立刻被驱赶向前！`,`🪢 Lashmaster arrives — ${n} enemies are driven forward at once!`), 'debuff'); } },
    act(t){ let n=0; const cells=[]; let sr=-1, sc=-1; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const x=grid[r][c]; if(x===t){ sr=r; sc=c; } else if(x&&x.type==='enemy'){ x.cd=Math.max(1,x.cd-1); cells.push({r,c}); n++; } } if(n){ lashmasterFx({r:sr,c:sc},cells); log(tr(`🪢 鞭笞者鞭策全场，${n} 只怪物变得更暴躁！`,`🪢 Lashmaster drives the horde forward — ${n} enemies speed up!`), 'debuff'); } } },
  { id:'magmafiend', emoji:'♨️', name:['岩浆魔','Magmafiend'], quip:['别想用你那纸糊的盾牌保护你。','Do not hide behind those paper shields.'], perTurn:true, swordable:true,
    special:['每回合融化场上所有盾牌；吸收火焰回血','Melts all shields each turn; feeds on fire'],
    desc:['可以用{W}攻击它。但它【每回合】都会融化棋盘上所有的盾牌，但不会因此回血。它不会直接拆掉你已经有的护甲值，却会让你很难继续靠盾链续上防线；此外它【吸收火焰】——不会被点燃，火墙与点燃本应造成的火焰伤害反而会为它回血。','You CAN hit it with a {WC}. But【every turn】it melts all shields on the board without healing from them. It does not directly strip your current armor, but it makes it much harder to sustain a shield-based defense; in addition, it【feeds on fire】— it cannot be ignited, and any damage it would have taken from burn or Firewall instead heals it.'],
    act(t){ const cells=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const x=grid[r][c]; if(x&&x.type==='shield') cells.push({r,c}); }
      if(!cells.length) return; let rr=-1, cc=-1; for(let r=0;r<ROWS&&rr<0;r++)for(let c=0;c<COLS;c++){ if(grid[r][c]===t){ rr=r; cc=c; break; } }
      if(rr>=0) magmaShieldFx({r:rr,c:cc}, cells);
      for(const cell of cells) grid[cell.r][cell.c]=null;
      holdNextGravity(); holdVisibleBoard();
      applyGravity(); syncPositions(false);
      log(tr(`♨️ 岩浆魔融化了 ${cells.length} 面盾（不再回血）`,`♨️ Magmafiend melts ${cells.length} shields (no HP restored)`), 'debuff'); } },
  { id:'vampire', emoji:'🧛', name:['吸血鬼','Vampire'], quip:['你的心留着也浪费，我喝了。','Those hearts are wasted on you. Mine now.'], perTurn:true, swordable:true,
    special:['每回合吸取场上的 ❤️ 回血','Drains ❤️ each turn to heal'],
    desc:['可以用{W}攻击它。但它【每回合】会吸取棋盘上所有的心来回血——别把心留在场上！','You CAN hit it with a {WC}. But every turn it drains all hearts on the board to heal — do not leave hearts on the board!'],
    act(t){ let n=0, pois=0; const normalCells=[], poisonCells=[]; const polluted=pollutionActive(); let rr=-1, cc=-1; for(let r=0;r<ROWS&&rr<0;r++)for(let c=0;c<COLS;c++){ if(grid[r][c]===t){ rr=r; cc=c; break; } }   // 正常心回血；毒心(污染光环 或 巫医黑毒心)反害它
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const x=grid[r][c]; if(x&&x.type==='heart'){ if(polluted||x.poison){ pois++; poisonCells.push([r,c]); } else { n++; normalCells.push([r,c]); } grid[r][c]=null; } }
      const tot=n+pois; if(!tot) return;
      holdNextGravity(); holdVisibleBoard();
      vampireDrainFx(rr>=0?{r:rr,c:cc}:null, normalCells, poisonCells);
      const per=2+(t.tier||1), delta=(n-pois)*per;   // 净效果：正常−毒心
      t.hp += delta;
      if(t.hp<=0){ for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ if(grid[r][c]===t) grid[r][c]=null; } thiefRecover(t); addXp(player,15); gainGold(20); onBossKilled(); applyGravity(); syncPositions(false); log(tr('🧛 吸血鬼吸到毒心，中毒身亡！','🧛 The Vampire drank poison hearts and died!')); }
      else { if(t.hp>t.maxHp) t.hp=t.maxHp; let rr=-1, cc=-1; for(let r=0;r<ROWS&&rr<0;r++)for(let c=0;c<COLS;c++){ if(grid[r][c]===t){ rr=r; cc=c; break; } } if(rr>=0) addBossFx(rr,cc,false,delta<0?'#66d17a':'#ff4d6d'); applyGravity(); syncPositions(false);
        if(delta<0) log(tr(`🧛 吸血鬼吸到毒心，反中毒掉 ${-delta} 血（→${t.hp}）`,`🧛 Vampire drinks poison hearts: −${-delta} HP (→${t.hp})`));
        else log(tr(`🧛 吸血鬼吸取 ${tot} 颗心回血（→${t.hp}）`,`🧛 Vampire drains ${tot} hearts (→${t.hp})`), 'debuff'); } } },
  { id:'assassin', emoji:'🥷', name:['刺客','Assassin'], quip:['护甲？那只是好看的装饰。','Armor? Cute. Purely decorative.'], monster:true, swordable:true, trueDmg:true, noTierScale:true,
    desc:['属性和普通怪差不多，但它的攻击是【真实伤害】——无视护甲和额外减伤，直接掉血！可以用{W}攻击它，趁早解决。','Stats like a normal enemy, but its hits are TRUE damage — they ignore armor and any reduction, straight to your HP! You can take it down with a {WC}, so kill it fast.'] },
  { id:'devourer', emoji:'🦖', name:['饕餮','Devourer'], quip:['吞噬怪物能量，全力一击！','Absorb the monsters’ energy, then unleash a full-power strike!'], monster:true, swordable:true,
    dynAtk:t=>Math.floor(t.hp*0.5),   // 攻击力动态 = 当前血量 50%（倒计时归零放大招），棋盘角标按此显示
    special:['倒计时先强击，再吞怪壮大','Hits first at 0, then devours foes to grow'],
    desc:['倒计时归零时，先按当前生命值的 50% 发动强击；随后吸收每只普通怪一半生命来壮大自己，且自身血量有上限。棋盘上的攻击力就是这次实际伤害，趁它变大前用{W}解决。','At 0 countdown, it first strikes for 50% of its current HP, then absorbs half the HP of every regular enemy to grow, up to its HP cap. The attack value shown is the actual damage of that strike. Take it down with a {WC} before it grows.'],
    everyTurn(t){ const cap=(12+player.level*3)*(t.tier||1); if(t.hp>=cap) return;   // 自身血量封顶（随档位提升），防止无限爆涨
      let g=0; const cells=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const x=grid[r][c]; if(x&&x.type==='enemy'&&x.hp>1){ const take=Math.floor(x.hp/2); x.hp-=take; g+=take; if(take>0) cells.push({r,c}); } }
      if(g){ let rr=-1, cc=-1; for(let r=0;r<ROWS&&rr<0;r++)for(let c=0;c<COLS;c++){ if(grid[r][c]===t){ rr=r; cc=c; break; } } if(rr>=0&&cells.length) devourerDrainFx({r:rr,c:cc}, cells); t.hp=Math.min(cap, t.hp+g); t.maxHp=Math.max(t.maxHp,t.hp); log(tr(`🦖 饕餮吞噬怪物生命 +${g}（→${t.hp}）`,`🦖 Devourer absorbs +${g} HP (→${t.hp})`), 'debuff'); } },
    cdAttack(t){ const raw=Math.floor(t.hp*0.5);
      const dmg=hurtPlayer(raw, 'devourer', false, t);
      t.hp=Math.max(1, t.hp-raw);   // 放大招消耗自身一半生命，下一步再靠吞怪补回来
      log(tr(`🦖 饕餮先释放积蓄之力，造成 ${dmg} 伤害（自损至 ${t.hp}）！`,`🦖 Devourer strikes first for ${dmg} damage (drops to ${t.hp})!`), 'bad'); } },
  { id:'summoner', emoji:'🧙', name:['召唤师','Summoner'], quip:['一个不够热闹，再加几个。','One is lonely — let me add a few.'], monster:true, swordable:true, perTurn:true,
    special:['每回合召唤一只怪','Summons an enemy each turn'],
    desc:['属性和普通怪一样，可被{W}攻击。它【每回合】把场上一个非怪/非Boss的棋子变成一只怪——拖得越久怪越多，速战速决！被它点名变怪的格子现在也会拉出召唤线，方便看清到底是哪里被改写了。','Stats like a normal enemy and {W}-attackable. Every turn it turns one non-enemy tile into an enemy — the longer it lives, the more enemies. End it fast! Converted tiles now also get a summoning tether so you can immediately see what was rewritten.'],
    act(t){ const n=t.tier||1; let made=0; const spawned=[]; let rr=-1, cc=-1;
      for(let r=0;r<ROWS&&rr<0;r++)for(let c=0;c<COLS;c++){ if(grid[r][c]===t){ rr=r; cc=c; break; } }
      for(let i=0;i<n;i++){ const cells=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const x=grid[r][c]; if(x&&x.type!=='enemy'&&x.type!=='boss') cells.push([r,c]); }
        if(!cells.length) break; const [r,c]=cells[Math.floor(rnd()*cells.length)];
        const e=makeTile('enemy'); e.curY=cellY(r); grid[r][c]=e; spawned.push({r,c}); made++; }
      if(made){ if(rr>=0&&spawned.length) summonerFx({r:rr,c:cc}, spawned); syncPositions(false); log(tr(`🧙 召唤师召唤出 ${made} 只怪！`,`🧙 The Summoner conjures ${made} enemies!`), 'debuff'); } } },
  { id:'thief', emoji:'🦹', name:['小偷','Thief'], quip:['你的金币，我先替你保管。','Your gold? I will hold it. Forever.'], monster:true, swordable:true, flee:true,
    special:['现身即偷金币，逃走则永久失去','Steals gold on arrival; flees with it'],
    desc:['一现身就偷走你一定比例的金币（一阶偷 10%、二阶偷 20%，之后每阶 +10%）。在它的倒计时内击败它，就能夺回被偷的金币；一旦让它逃走，这笔金币就永久消失！','The instant it appears it steals a share of your gold (10% at Lv1, 20% at Lv2, then +10% per tier). Beat it before its timer runs out to recover the stolen gold — let it escape and that gold is gone forever!'],
    onSpawn(t){ const pct=0.1*(t.tier||1); const g0=player.gold; const steal=Math.min(g0, Math.floor(g0*pct)); t.stolen=steal;
      if(steal>0){ player.gold-=steal; const shown=Math.min(100,Math.round(pct*100)); log(tr(`🦹 小偷现身，偷走 ${steal} 金币（${shown}%）！倒计时内击败它可夺回。`,`🦹 Thief steals ${steal} gold (${shown}%)! Beat it before the timer to recover it.`), 'debuff'); }
      else log(tr(`🦹 小偷现身，但你身无分文…`,`🦹 The Thief appears, but you have no gold…`), 'debuff'); } },
  { id:'zombie', emoji:'🧟', name:['僵尸','Zombie'], quip:['不急，反正这毒你跑不掉。','No rush — the rot has you already.'], monster:true, swordable:true, perTurn:true,
    special:['尸毒感染：潜伏一回合后每回合掉血（最高30%）','Plague: incubates 1 turn, then drains HP each turn (≤30%)'],
    desc:['它一现身就让你感染尸毒——血条变绿，但【潜伏一回合后才开始发作】；之后每回合按生命百分比流失（随档位递增，单回合最高 30%，无视护甲）。趁潜伏期击败它即可解除感染！','The instant it appears you are infected (HP bar turns green), but it【incubates for one turn before striking】; then each turn you lose a % of HP (scaling per tier, capped at 30%/turn, ignoring armor). Kill it during the incubation to cure!'],
    onSpawn(t){ log(tr('🧟 僵尸抓向你，你感染了尸毒！血条变绿——下回合开始发作，趁现在干掉它！','🧟 The Zombie infects you! HP bar turns green — it strikes next turn, kill it now!'), 'debuff'); },
    act(t){
      if(!t.incub){ t.incub=1; log(tr('🧟 尸毒在体内潜伏，下回合开始发作！','🧟 The plague incubates — it strikes next turn!'), 'debuff'); return; }   // 回合后才生效：首回合只潜伏，不掉血
      const pct=Math.min(0.1*(t.tier||1), 0.3);   // 单回合最高 30%，不再秒杀
      const dmg=hurtPlayer(Math.max(1,Math.ceil(player.maxHp*pct)), 'zombie', true);   // 尸毒=持续中毒，非直接攻击 → 不触发荆棘
      if(dmg>0){
        let rr=-1, cc=-1; for(let r=0;r<ROWS&&rr<0;r++)for(let c=0;c<COLS;c++){ if(grid[r][c]===t){ rr=r; cc=c; break; } }
        if(rr>=0) zombiePlagueFx({r:rr,c:cc});
        log(tr(`🧟 尸毒发作：流失 ${dmg} 生命（${Math.round(pct*100)}%）`,`🧟 Plague: −${dmg} HP (${Math.round(pct*100)}%)`), 'bad'); }
    } },
  { id:'statue', emoji:'🗿', name:['石像','Statue'], quip:['打我？你打的是你自己。','Hit me? You are hitting yourself.'], monster:true, swordable:true, noTierScale:true,
    special:['受到的伤害真实反弹给你','Reflects damage taken as TRUE damage'],
    desc:['可以用{W}攻击它，但它【受到多少伤害，就把等量伤害当作真实伤害（无视护甲）反弹给你】！想杀它得先确保自己血够厚——别一刀连自己也送走。倒计时归零也会重击你。','You CAN hit it with a {WC}, but【whatever damage it takes is reflected back at you as TRUE damage (ignoring armor)】! Make sure you have the HP to survive the kill — do not one-shot yourself. It also strikes you when its timer hits 0.'] },
  { id:'pollution', emoji:'🦠', name:['污染怪','Corruptor'], quip:['你的心，我给染绿了。','I dyed your hearts rotten green.'], monster:true, noTierScale:true,
    special:['在场时全场心变毒心（连之扣血）','While alive, all hearts are poison (linking drains HP)'],
    desc:['{WC}对它无效，只能用 💥炸弹 炸。只要它在场，棋盘上所有的心都变成毒心（绿心 💚）——连毒心不再回血，反而按等量【扣血】（无视护甲）！炸掉它，心就恢复正常。倒计时归零它也会重击你。','Immune to {WC} — only the 💥 Bomb works. While it is on the board, ALL hearts become poison (green 💚) — linking them DRAINS that much HP instead of healing (ignoring armor)! Bomb it and hearts return to normal. It also strikes you when its timer hits 0.'] },
  { id:'snowman', emoji:'⛄', name:['雪人','Snowman'], quip:['冻住，不许走——技能也别想用。','Freeze! No moves, and no skills either.'], monster:true, noTierScale:true,
    special:['现身 + 每隔几回合冰封你的主动（本身不攻击）','Freezes your actives on spawn & periodically (deals no damage)'],
    desc:['{WC}对它无效，只能用 💥炸弹 炸。它一现身就【随机冰封你的主动能力】——1 阶封 1 个技能 1 回合、2 阶封 2 个技能 1 回合、3 阶封 1 个技能 2 回合、4 阶封 2 个技能 2 回合；5 阶封 2 个技能 3 回合、6 阶封 3 个技能 3 回合、7 阶封 3 个技能 4 回合、8 阶封 3 个技能 5 回合、9 阶封 3 个技能 6 回合。之后【每次倒计时归零都会再次冰封】。它**本身不攻击、不掉你血**——趁解冻的空档把它炸掉。','Immune to {WC} — only the 💥 Bomb works. On arrival it【freezes random actives】with tier-based scaling: Lv1 freezes 1 skill for 1 turn, Lv2 freezes 2 for 1 turn, Lv3 freezes 1 for 2 turns, Lv4 freezes 2 for 2 turns; Lv5 freezes 2 skills for 3 turns, Lv6 freezes 3 for 3 turns, Lv7 freezes 3 for 4 turns, Lv8 freezes 3 for 5 turns, and Lv9 freezes 3 for 6 turns. It then【re-freezes every time its countdown hits 0】. It deals NO damage itself — bomb it during the thaw window.'],
    onSpawn(t){ const keys=[]; if(player.tier1) keys.push('skill'); keys.push('heal','bomb');
      for(let i=keys.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [keys[i],keys[j]]=[keys[j],keys[i]]; }
      const tier=t.tier||1;
      const m=Math.min(tier<=4 ? (tier%2===1?1:2) : tier===5 ? 2 : 3, keys.length), K=tier<=4 ? (Math.floor((tier-1)/2)+1) : Math.min(6, tier-2); const froz=keys.slice(0,m);
      player.frozen=player.frozen||{}; froz.forEach(k=>{ player.frozen[k]=K; });
      const nm={skill:tr('职业主动','skill'),heal:'💊',bomb:'💥'};
      log(tr(`⛄ 雪人冰封了你 ${m} 个主动（${froz.map(k=>nm[k]).join('、')}），${K} 回合内不可用！`,`⛄ Snowman freezes ${m} of your actives (${froz.map(k=>nm[k]).join(',')}) for ${K} turns!`), 'debuff');
      t.cd=t.baseCd=Math.max(1,K+2+extraFoeCd()); },   // 再冻间隔 = 冻结时长+2，> 冻结时长 → 必留出可炸窗口（不靠通用 cd）
    cdAttack(t){ this.onSpawn(t); } },   // 倒计时归零 → 再次冰封（不造成伤害；cd 由结算重置回 baseCd）
  { id:'birdman', emoji:'🦅', name:['鸟人','Birdman'], quip:['抓不住我，我会飞（还会瞬移）。','Catch me? I fly — and teleport.'], monster:true, swordable:true, perTurn:true,
    atkLabel:['啄击伤害','Peck damage'], shownAtk:t=>Math.max(1,Math.ceil(t.atk*0.5)),   // 面板/角标展示真实啄击伤害（基础 atk 的 50%，向上取整）
    special:['每回合啄你一下并瞬移换位','Pecks you and teleports each turn'],
    desc:['可以用{W}攻击它。它【每回合】都会俯冲啄你一下，并在回合末和棋盘上任意一个棋子【互换位置】——飘忽难缠，想连它的{WC}得算准它的落点，速战速决！','You CAN hit it with a {WC}. Every turn it dives to peck you, then swaps places with a random tile at turn end — elusive and nagging, so line up your chain where it lands and finish it fast!'],
    act(t){
      const dmg=hurtPlayer(Math.max(1,Math.ceil(t.atk*0.5)), 'birdman', false, t);
      if(dmg>0) log(tr(`🦅 鸟人俯冲啄击，掉 ${dmg} 血！`,`🦅 The Birdman dives and pecks for ${dmg}!`), 'bad');
      const pos=findTilePos(t);
      if(!pos) return;
      const cells=[]; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const x=grid[r][c]; if(x&&x!==t&&!x.finale) cells.push([r,c]); }   // 不和终焉之主换位（否则它被移位、advanceEnemies 快照守卫会跳过其推进，破关被拖到 511 之后）
      if(!cells.length) return;
      const [nr,nc]=cells[Math.floor(rnd()*cells.length)]; const {r,c}=pos; const tmp=grid[nr][nc];
      grid[nr][nc]=t; grid[r][c]=tmp; t.curY=cellY(nr); if(tmp) tmp.curY=cellY(r); syncPositions(false);
      log(tr('🦅 鸟人振翅，和一个棋子换了位置！','🦅 The Birdman flaps to a new spot!'), 'debuff'); } },
  // 终焉之主：第 500 回合出现。无血量、无攻击、不可被打。每回合把若干非怪/非Boss棋子变成随机Boss（第1波1个…第10波10个），撑满10波不死即破关。不进随机池。
  { id:'finale', emoji:'👑', name:['终焉之主','Overlord'], quip:['走到这一步？那就别想走了。','Made it this far? You leave no more.'], noRandom:true, perTurn:true, finale:true,
    special:['每回合召唤渐增的Boss浪潮，撑过10波即破关','Summons growing boss waves; survive 10 to clear'],
    desc:['终局考验：它本身无血、无攻击、打不掉。但【每回合】把若干非怪/非Boss棋子变成随机 Boss——第 1 波 1 个、第 2 波 2 个…第 10 波 10 个。撑满 10 波还活着即【破关】！','The final trial: it has no HP, no attack, and cannot be killed. Each turn it turns several non-enemy tiles into random bosses — 1 on wave 1, 2 on wave 2… 10 on wave 10. Survive all 10 waves to CLEAR the game!'],
    act(t){
      if(player.finaleWave>=10){ onClear(); return; }   // 已撑满10波且仍存活 → 破关
      player.finaleWave++;
      let made=0; for(let i=0;i<player.finaleWave;i++){ if(spawnRandomBossTile()) made++; }
      syncPositions(false);
      log(tr(`👑 终焉第 ${player.finaleWave}/10 波：召唤 ${made} 个 Boss！`,`👑 Wave ${player.finaleWave}/10: ${made} bosses summoned!`), 'bad');
    } },
];
function randomBossDef(){ const pool=BOSSES.filter(b=>!b.noRandom); return pool[Math.floor(rnd()*pool.length)]; }
// 把一个非怪/非Boss棋子变成随机 Boss（终焉浪潮用）；返回是否成功
function spawnRandomBossTile(){
  const cells=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t && t.type!=='enemy' && t.type!=='boss') cells.push([r,c]); }
  if(!cells.length) return false;
  const [r,c]=cells[Math.floor(rnd()*cells.length)];
  const def=randomBossDef(), tier=1;   // 终焉浪潮用基础档：可被清掉，挑战在数量而非单体肉度
  const s=def.monster?enemyStats():bossStats();
  const cdv=Math.max(1,(s.cd!=null?s.cd:s.baseCd)+extraFoeCd());
  grid[r][c]={type:'boss', bossId:def.id, tier, hp:s.hp, maxHp:s.hp, atk:s.atk, cd:cdv, baseCd:cdv};
  if(def.onSpawn) def.onSpawn(grid[r][c]);
  addBossFx(r,c,false);
  return true;
}
function spawnFinale(){
  let cells=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t && t.type!=='enemy' && t.type!=='boss') cells.push([r,c]); }
  if(!cells.length){ for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t && t.type!=='boss') cells.push([r,c]); } }
  if(!cells.length) return;
  const [r,c]=cells[Math.floor(rnd()*cells.length)];
  grid[r][c]={type:'boss', bossId:'finale', tier:bossTier(), hp:0, maxHp:0, atk:0, cd:0, baseCd:0, finale:true};
  syncPositions(false);
  addBossFx(r,c,true);   // 金色入场特效
  log(tr('👑 终焉之主降临！撑过 10 波 Boss 浪潮即可破关！','👑 The Overlord descends! Survive 10 waves of bosses to clear the game!'), 'bad');
}
function bossDef(t){ return BOSSES.find(b=>b.id===(t&&t.bossId)) || BOSSES[0]; }
function findTilePos(tile){
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) if(grid[r][c]===tile) return {r,c};
  return null;
}
function isSwordTarget(t){ return !!t && !t.finale && (t.type==='enemy' || (t.type==='boss' && (bossDef(t).swordable || !!(player&&player.pierceTurn)))); }  // 斗士嗜血：本回合可攻击剑免疫 Boss；终焉之主(finale)永不可攻击
function isFireChainTarget(t){ return !!(player&&player.fireChainTurn) && !!t && !t.finale && (t.type==='enemy' || t.type==='boss'); }   // 火法师：本回合剑链划过的所有怪/Boss（含幽灵等）都会被点燃，且这些 Boss 视为可连目标
function gainGold(g, msgActive){
  g=g|0; if(g<=0) return 0;
  player.gold+=g; if(msgActive) log(msgActive(g), 'buff');
  return g;
}
function currentSwordFlat(){ return player.swordFlat + (player.tigerFury&&player.race==='beast'?Math.floor(player.level/2):0) + (player.titan?Math.floor(player.maxHp/12):0) + shieldBashFlat(player); }
function burnTickDamage(t){ return Math.max(1, Math.floor(currentSwordFlat()*0.2)) * Math.max(1, t.burnStacks||0); }
function firewallTickDamage(){ return Math.max(1, Math.floor(currentSwordFlat()*0.2)); }
function fireWallRows(){ return { start: Math.max(0, ROWS-3), end: ROWS-1 }; }
function frostOrbDamage(){ return Math.max(1, currentSwordFlat()); }
function igniteTarget(t, stacks){
  if(!t || t.finale || !(t.type==='enemy' || t.type==='boss')) return false;
  t.burnStacks=(t.burnStacks||0) + Math.max(1, stacks|0);
  t.burnTurns=1;   // 仅作为可视状态标记；燃烧持续到死亡
  return true;
}
function fireChainIgnite(selection){
  if(!player.fireChainTurn) return 0;
  let n=0;
  for(const s of selection){ const t=grid[s.r][s.c]; if(!t || t.finale) continue; if(t.type==='enemy' || t.type==='boss'){ if(igniteTarget(t, 1)) n++; } }
  player.fireChainTurn=false;
  if(n) log(tr(`🔥 火焰链：点燃 ${n} 个目标（当前固定伤害 20%，可叠加）`,`🔥 Flame Chain: ignited ${n} targets (current flat damage ×20%, stackable)`), 'buff');
  return n;
}
function burnTick(){
  let hit=0, kills=0, normalKills=0, total=0, lh=0, healHit=0, healTotal=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const t=grid[r][c]; if(!t||!t.burnTurns||!(t.burnStacks>0)) continue;
    const dmg=burnTickDamage(t), before=t.hp;
    if(t.type==='boss' && t.bossId==='magmafiend'){ t.hp=Math.min(t.maxHp, t.hp+dmg); hit++; healHit++; healTotal+=dmg; continue; }
    t.hp-=dmg; hit++; total+=Math.min(dmg, before);
    if(t.hp<=0){ const isB=t.type==='boss'; grid[r][c]=null; kills++; if(isB){ thiefRecover(t); addXp(player,15); gainGold(20); onBossKilled(); } else { normalKills++; addXp(player,3+(player.killXp||0)); gainGold(1); } }
  }
  const multiGold=multiKillGold(normalKills); if(kills) lh=lifestealHeal(kills);
  if(hit) log(tr(`🔥 点燃：${hit} 个目标结算`+(total?`，共掉 ${total}`:'')+(healHit?`，岩浆魔回血 ${healTotal}`:'')+(kills?`，击杀 ${kills}`:'')+(multiGold?`，多杀奖励 +${multiGold} 金`:'')+(lh?`，吸血 +${lh}`:''),`🔥 Burn: ${hit} targets resolved`+(total?`, ${total} damage`:'')+(healHit?`, Magmafiend heals ${healTotal}`:'')+(kills?`, ${kills} killed`:'')+(multiGold?`, multi-kill +${multiGold} gold`:'')+(lh?`, +${lh} lifesteal`:'')), 'bad');
}
function firewallTick(){
  if(!player.firewall) return;
  const zone=fireWallRows();
  let hit=0, kills=0, normalKills=0, total=0, lh=0, healHit=0, healTotal=0;
  for(let r=zone.start;r<=zone.end;r++)for(let c=0;c<COLS;c++){
    const t=grid[r][c]; if(!t||t.finale||!(t.type==='enemy'||t.type==='boss')) continue;
    if(!(t.type==='boss' && t.bossId==='magmafiend')) igniteTarget(t, 1);
    const dmg=firewallTickDamage(), before=t.hp;
    if(t.type==='boss' && t.bossId==='magmafiend'){ t.hp=Math.min(t.maxHp, t.hp+dmg); hit++; healHit++; healTotal+=dmg; continue; }
    t.hp-=dmg; hit++; total+=Math.min(dmg, before);
    if(t.hp<=0){ const isB=t.type==='boss'; grid[r][c]=null; kills++; if(isB){ thiefRecover(t); addXp(player,15); gainGold(20); onBossKilled(); } else { normalKills++; addXp(player,3+(player.killXp||0)); gainGold(1); } }
  }
  const multiGold=multiKillGold(normalKills); if(kills) lh=lifestealHeal(kills);
  if(hit) log(tr(`🧱 火墙：底部三行 ${hit} 个目标结算`+(total?`，共掉 ${total}`:'')+(healHit?`，岩浆魔回血 ${healTotal}`:'')+(kills?`，击杀 ${kills}`:'')+(multiGold?`，多杀奖励 +${multiGold} 金`:'')+(lh?`，吸血 +${lh}`:''),`🧱 Firewall: ${hit} targets in the bottom rows resolved`+(total?`, ${total} damage`:'')+(healHit?`, Magmafiend heals ${healTotal}`:'')+(kills?`, ${kills} killed`:'')+(multiGold?`, multi-kill +${multiGold} gold`:'')+(lh?`, +${lh} lifesteal`:'')), 'bad');
}
function loseGoldForShield(g){
  g=g|0; if(g<=0) return 0;
  const fromHand=Math.min(g, player.gold||0);
  player.gold-=fromHand;
  return fromHand;
}
// 击败小偷：夺回它偷走的金币
function thiefRecover(t){ if(t&&t.bossId==='thief'&&t.stolen>0){ gainGold(t.stolen, g=>tr(`🦹 抓住小偷！夺回 ${g} 金币。`,`🦹 Caught the Thief! Recovered ${g} gold.`)); t.stolen=0; } }
// 死亡报告：累计各来源对玩家造成的伤害
function addDmg(key,amt){ if(player){ player.dmgBy=player.dmgBy||{}; player.dmgBy[key]=(player.dmgBy[key]||0)+amt; } }
function dmgSourceLabel(key){
  if(key==='enemy') return {emoji:'👹', name:['普通怪','Enemy']};
  if(key==='bloodfrenzy') return {emoji:'🩸', name:['血狂','Blood Frenzy']};
  const b=BOSSES.find(x=>x.id===key);
  return b?{emoji:b.emoji, name:b.name}:{emoji:'❓', name:['未知','Unknown']};
}
function bossStats(){
  const lv=player.level;
  return { hp: 8 + Math.floor(lv*1.0), atk: 5 + Math.floor(lv*1.8), cd: 6 + Math.floor(rnd()*3) }; // cd 6~8（atk 提斜率：lv5=14/lv10=23/lv20=41，压过后期护甲）
}
function bossTier(){ return 1 + Math.floor(player.turns/50); }  // 每 50 回合 Boss 强度档位 +1
function hasBoss(){ for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) if(grid[r][c]&&grid[r][c].type==='boss') return true; return false; }
function enemyHpSum(){ let h=0; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t&&t.type==='enemy') h+=t.hp; } return h; }   // 会长「收买」花费 = 全场普通怪当前血量之和
function bombDamage(p){ p=p||player; return 5 + (p.bombBoost ? (p.bombUses||0) : 0); }   // 炸弹伤害=基础5+爆破手累计；火枪手「狙击」=本值×2，故炸弹变强狙击同步变强
function bombGoldSacrificeBonus(p){ p=p||player; return p.shadowBombGold ? Math.floor((p.gold||0)*0.2) : 0; }   // 乾坤一掷：买完炸弹后，再额外扣当前金币的 20% 并把同值加到这次炸弹伤害
function bombGoldSacrificePreviewBonus(p){ p=p||player; return p.shadowBombGold ? Math.floor(Math.max(0,(p.gold||0)-shopCost('bomb'))*0.2) : 0; }   // 面板预览：先扣正常炸弹价，再估算乾坤一掷会额外扣多少金币
function shieldBashFlat(p){ p=p||player; return p.shieldBash ? (p.armor*(p.armorMult||1)+(p.toughness||0)) : 0; }   // 盾击：把护甲减伤量加到固定剑伤上
// 是否还有可行连线（同类连接型 ×2，或 「剑」格紧邻可攻击目标 = 真能成剑链）。棋盘塞满怪时用来判负。
function hasAnyMove(){
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(!t) continue;
    for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){ const nr=r+dr,nc=c+dc; if(nr<0||nr>=ROWS||nc<0||nc>=COLS) continue; const u=grid[nr][nc]; if(!u) continue;
      if(t.type===u.type && CONNECTABLE.includes(t.type)) return true;                 // 同类连接
      // 真正可打的剑链必须含一把「剑」格（怪-怪连线无剑会被判空挥取消，见 endDrag）：需「剑」紧邻可攻击目标
      if((t.type==='sword' && (isSwordTarget(u)||isFireChainTarget(u))) || (u.type==='sword' && (isSwordTarget(t)||isFireChainTarget(t)))) return true;
    } }
  return false;
}
// 这些一阶/换装主动会「清/转」棋子，发动后可能打破死局（清掉小怪或造出可连的局）
const ESCAPE_ACTIVES=['priest','ranger','blacksmith','guildmaster','swordsaint','necromancer','butcher'];
// 是否还有「就绪且能改盘」的动作可打破死局——判负前的逃生检查，避免错杀还能救的局
function hasEscapeAction(){
  const fz=player.frozen||{};
  if(player.tier1 && ESCAPE_ACTIVES.includes(player.tier1) && player.skillCd<=0 && !(fz.skill>0)) return true;  // 一阶主动就绪
  if(player.skill2 && player.skill2Cd<=0 && !(fz[player.skill2.slot]>0) && ESCAPE_ACTIVES.includes(player.skill2.id)) return true;  // 换装主动就绪
  if(!(player.skill2 && player.skill2.slot==='bomb')){   // 炸弹槽未被换装占用时：就绪+未冰封+买得起 → 可清怪
    const cd=(player.shopCd&&player.shopCd.bomb)||0;
    if(cd<=0 && !(fz.bomb>0) && player.gold>=shopCost('bomb')) return true;
  }
  return false;
}
// 死局判负：无棋可连且无就绪改盘动作 → 直接判负（不再卡死）。有任一弹层待处理时不调用。返回是否已判负。
function checkDeadlock(){
  if(player.cleared || player.hp<=0) return false;
  if(hasAnyMove() || hasEscapeAction()) return false;
  player.deathMode='deadlock';
  log(player.finaleStarted
    ? tr('👑 被 Boss 淹没，无路可走…','👑 Overrun by bosses — no way out…')
    : tr('🪦 被怪物淹没，无路可走。','🪦 Overrun by monsters — no way out.'));
  gameOver();
  return true;
}
// 感染：场上存在僵尸 Boss 时血条变绿（僵尸死即解除感染）
function isInfected(){ for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t&&t.type==='boss'&&t.bossId==='zombie') return true; } return false; }
// 污染怪在场：全场心变毒心（绿心），连之扣血；炸掉它即恢复正常（光环式，不留持久状态）
function pollutionActive(){ for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t&&t.type==='boss'&&t.bossId==='pollution') return true; } return false; }
// 随机把 n 个棋子重洗成新的随机【资源】棋子（只出剑/盾/心/金，不出怪——出怪是召唤师的活，避免小丑与之重合）
function scrambleTiles(n, excludeTypes){
  const cells=[];
  const excl = excludeTypes||['boss'];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t && !excl.includes(t.type)) cells.push([r,c]); }
  for(let i=cells.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [cells[i],cells[j]]=[cells[j],cells[i]]; }
  const k=Math.min(n,cells.length), pool=connectablePool();
  for(let i=0;i<k;i++){ const [r,c]=cells[i]; const nt=makeTile(pool[Math.floor(rnd()*pool.length)]); nt.curY=cellY(r); grid[r][c]=nt; }   // 指定资源类型→绝不滚出怪
  syncPositions(false);
  return k;
}
// 新职业被动：每回合摆盘后，把至多 n 个 fromTypes 棋子转成 toType（巫医→心、剑圣→剑）。用 rnd 确定性洗牌，回放可复现。
function convertTiles(n, toType, fromTypes, mark){
  const cells=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t && fromTypes.includes(t.type)) cells.push([r,c]); }
  for(let i=cells.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [cells[i],cells[j]]=[cells[j],cells[i]]; }
  const k=Math.min(n,cells.length);
  for(let i=0;i<k;i++){ const [r,c]=cells[i]; const nt=makeTile(toType); nt.curY=cellY(r); if(mark) mark(nt); grid[r][c]=nt; }
  return k;
}
function spawnBoss(force, exclude){
  if(!force && hasBoss()) return null;        // 普通：同时只存在一个 Boss；force=true 时允许多个（350后双 Boss）
  const cells=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(t && t.type!=='boss') cells.push([r,c]); }   // 不覆盖已有 Boss
  if(!cells.length) return null;
  const [r,c]=cells[Math.floor(rnd()*cells.length)];
  let def=randomBossDef();   // 排除终焉之主（noRandom）
  const _ms=[50,100,200,350].includes(player.turns);   // 里程碑回合：排除小偷（跑了学不了技能）
  if(exclude || _ms){ let tries=0; while(((exclude && def.id===exclude)||(_ms&&def.id==='thief'))&& tries<8){ def=randomBossDef(); tries++; } }
  const tier=bossTier();
  const s = def.monster ? enemyStats() : bossStats();   // 怪属性型 Boss 用怪物数值
  const cdv = Math.max(1,(s.cd!=null ? s.cd : s.baseCd) + extraFoeCd());
  const mult = def.noTierScale ? 1 : tier;              // 刺客等：血量/攻击始终同级怪物，不吃档位倍率
  const hp=s.hp*mult, atk=s.atk*mult;
  grid[r][c]={type:'boss', bossId:def.id, tier, hp, maxHp:hp, atk, cd:cdv, baseCd:cdv};
  addBossFx(r,c,false);
  const tlabel = ` Lv${tier}`;   // 始终标注档位（含一阶 Lv1）
  log(tr(`${def.emoji} Boss【${L(def.name)}】${tlabel} 现身！轻点它查看打法。`,`${def.emoji} Boss [${L(def.name)}]${tlabel} appears! Tap it to see how to fight.`), 'bad');
  if(def.onSpawn) def.onSpawn(grid[r][c]);
  return def.id;
}

function makeTile(type){
  if(type===undefined){
    const pool=connectablePool();
    type = rnd()<enemyChance() ? 'enemy'
         : pool[Math.floor(rnd()*pool.length)];
  }
  const t={type};
  if(type==='enemy'){ const s=enemyStats(); t.hp=s.hp; t.maxHp=s.hp; t.atk=s.atk; const bc=Math.max(1,s.baseCd+extraFoeCd()); t.cd=bc; t.baseCd=bc; }
  return t;
}
