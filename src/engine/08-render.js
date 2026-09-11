//==================== 渲染 ====================
const cv=document.getElementById('board'), ctx=cv.getContext('2d');
function resize(){
  const w=document.getElementById('wrap').clientWidth;
  const size=Math.min(w, 440);
  TILE=Math.floor((size-2*PAD)/COLS);
  const px=COLS*TILE+2*PAD;
  cv.width=px; cv.height=ROWS*TILE+2*PAD;
  cv.style.width=px+'px'; cv.style.height=cv.height+'px';
  if(grid) syncPositions(true);
}
window.addEventListener('resize',resize);

function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

// 预览：当前剑链会杀死哪些怪（与 dealDamage 逻辑保持一致）
function previewKills(){
  // 剑链且已构成可消除的连线（长度≥2，怪起手时怪自身也占一格）
  if(!dragging || selection.length<2 || selection[0].type!=='sword') return null;
  const targets=selection.filter(s=>isSwordTarget(grid[s.r][s.c]));
  if(!targets.length) return null; // 没串到怪 → 不造成伤害，无击杀预览
  const nS=selection.filter(s=>{const t=grid[s.r][s.c]; return t&&t.type==='sword';}).length;
  if(nS<1) return null;   // 没连进任何剑 → 不算攻击（与 endDrag 一致），不显示骷髅预览
  const combo=1+Math.max(0,nS-2)*0.15*(player.comboMult||1);
  const titanFlat=(player.titan?Math.floor(player.maxHp/12):0)+shieldBashFlat(player);   // 巨力 + 盾击(护甲减伤量→固定剑伤)
  let pool=(nS*player.weaponPower+player.swordFlat+titanFlat)*combo*(player.swordMult||1);
  if(player.lowHpDmg) pool*=1+(1-player.hp/player.maxHp)*0.6;
  pool=Math.floor(pool);
  // 与结算一致：每只怪独立吃满 pool，pool≥血量即死
  const dead=new Set();
  targets.forEach(s=>{const t=grid[s.r][s.c]; if(isSwordTarget(t) && pool>=t.hp) dead.add(s.r+','+s.c);});
  return dead;
}

function draw(){
  ctx.clearRect(0,0,cv.width,cv.height);
  // 选中集合（快速查找）
  const sel=new Set(selection.map(s=>s.r+','+s.c));
  const chainType=selection.length?selection[0].type:null;
  const killSet=previewKills();
  const poisoned=pollutionActive();   // 污染怪在场时全场心显示为毒心（绿心）
  const firewallZone = player && player.firewall ? fireWallRows() : null;
  if(firewallZone){
    ctx.save();
    ctx.strokeStyle=hexA('#ff5a36', .75); ctx.lineWidth=3; ctx.shadowColor='#ff5a36'; ctx.shadowBlur=12;
    ctx.strokeRect(PAD+2, cellY(firewallZone.start)+2, COLS*TILE-4, TILE*3-4);
    ctx.restore(); ctx.shadowBlur=0;
  }
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const t=grid[r][c]; if(!t) continue;
    const isPoisonHeart = t.type==='heart' && poisoned;
    const isBlackHeart = t.type==='heart' && !poisoned && t.poison;   // 万物皆毒：黑毒心（污染绿心优先）
    const x=cellX(c), y=(t.curY!==undefined?t.curY:cellY(r));
    const d=DEF[t.type], g=TILE-8;
    const picked=sel.has(t.r+','+t.c);
    const coiled = player && player.deathCoil>0 && (t.type==='enemy'||(t.type==='boss'&&!t.finale));   // 蔓藤缠绕中：敌人格变绿
    const burning = !!(t.burnTurns && t.burnStacks>0);
    const fireLinked = !!(player && player.fireChainTurn && t.type==='boss' && !t.finale);
    const immuneBossBurning = !!(burning && t.type==='boss' && !t.finale && !bossDef(t).swordable);   // 剑免疫 Boss 被点燃后，底色恢复成原 Boss 色，只保留燃烧光效/角标
    const frosted = !!(t.frostTurns>0);
    const flashedWhite = !!(t.flashWhite>0);
    const frostedBase = t.type==='boss' ? '#4d94d8' : '#5aa9f8';
    const frostedGlow = t.type==='boss' ? '#d9f3ff' : '#c8ecff';
    // 能被剑攻击的（怪 / 可剑连的Boss，以及剑本身）统一红底，一眼看出可攻击；蔓藤缠绕中的怪改绿底；燃烧中的怪改橙红底；火焰链激活时的 Boss 改火红底
    const baseCol = flashedWhite ? '#eef7ff' : frosted ? frostedBase : immuneBossBurning ? d.color : burning ? '#ff6b2f' : fireLinked ? '#ff5336' : coiled ? '#27ae60' : (isSwordTarget(t) || t.type==='sword') ? DEF.sword.color : d.color;   // 黑毒心/绿毒心底色与普通心一致，只换 emoji（💚/🖤）
    // 被剑链穿过的怪/可攻击Boss → 红色高亮（表示正被攻击）；燃烧目标走橙色光晕；火焰链激活的 Boss 走更亮的火色
    const gl = flashedWhite ? '#ffffff' : frosted ? frostedGlow : (picked && chainType==='sword' && (isSwordTarget(t) || isFireChainTarget(t))) ? '#ff8a3c' : burning ? '#ff9a52' : fireLinked ? '#ff7043' : coiled ? '#2ecc71' : d.glow;
    // 背景
    ctx.save();
    roundRect(x+4,y+4,g,g,12);
    if(!picked){ ctx.fillStyle=hexA(baseCol,.16); }
    else { ctx.fillStyle=hexA(gl,.30); ctx.shadowColor=gl; ctx.shadowBlur=14; }
    ctx.fill();
    ctx.shadowBlur=0;
    ctx.lineWidth=picked?3:1.5;
    ctx.strokeStyle=picked?gl:hexA(baseCol,.5);
    ctx.stroke();
    ctx.restore();

    const cx=x+TILE/2, cy=y+TILE/2;
    if(t.type==='enemy'||t.type==='boss'){
      const isBoss=t.type==='boss';
      const bdef = isBoss?bossDef(t):null;
      const doomed = killSet && killSet.has(t.r+','+t.c) && (!isBoss || bdef.swordable || player.pierceTurn); // 会被这条线杀死 → 骷髅
      ctx.font=Math.floor(TILE*0.30)+'px '+EMOJI_FONT;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(doomed?'💀':(isBoss?bdef.emoji:'👹'), cx, y+TILE*0.30);
      // 血量（终焉之主无血、打不掉 → 显示 ∞ 而非 0）
      ctx.fillStyle='#fff'; ctx.font='700 '+Math.floor(TILE*0.34)+'px system-ui';
      if(!t.finale) ctx.fillText(t.hp, cx, cy+TILE*0.10);
      else { ctx.fillStyle='#ffd54a'; ctx.fillText('∞', cx, cy+TILE*0.10); }
      if(t.burnStacks>0){
        const bx=x+g-4, by=y+g-4, br=TILE*0.16;
        ctx.beginPath(); ctx.arc(bx,by,br,0,7);
        ctx.fillStyle='#ff5a36'; ctx.fill(); ctx.strokeStyle='#000'; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle='#fff'; ctx.font='700 '+Math.floor(TILE*0.20)+'px system-ui';
        ctx.fillText(t.burnStacks, bx, by+1);
      }
      // 攻击力角标（左上）——没有攻击行为的小偷不显示；特效/大招型 Boss（攻击力无意义）也不显示
      if(t.bossId!=='thief' && (!isBoss || (!bdef.act && !bdef.cdAttack) || bdef.shownAtk || bdef.dynAtk)){
        const av=(isBoss && (bdef.shownAtk||bdef.dynAtk)) ? (bdef.shownAtk?bdef.shownAtk(t):bdef.dynAtk(t)) : (isBoss?t.atk:normalEnemyAttack(t));
        const ax=x+10, ay=y+10, ar=TILE*0.16;
        ctx.beginPath(); ctx.arc(ax,ay,ar,0,7);
        ctx.fillStyle=(isBoss&&bdef.trueDmg)?'#8e44ad':'#c0392b'; ctx.fill(); ctx.strokeStyle='#000'; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle='#fff'; ctx.font='700 '+Math.floor(TILE*0.20)+'px system-ui';
        ctx.fillText(av, ax, ay+1);
      }
      // 倒计时角标（右上）：普通 Boss=倒计时；每回合行动型=恒「1」（每回合都出手）；终焉之主不显示
      if(!isBoss || !bdef.finale){
        const perT = isBoss && bdef.perTurn, cv = perT ? 1 : t.cd;
        const bx=x+g-4, by=y+10, br=TILE*0.16;
        ctx.beginPath(); ctx.arc(bx,by,br,0,7);
        ctx.fillStyle = cv<=1? '#e74c3c' : cv<=2? '#e67e22' : '#2c3e50';
        ctx.fill(); ctx.strokeStyle='#000'; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle='#fff'; ctx.font='700 '+Math.floor(TILE*0.20)+'px system-ui';
        ctx.fillText(perT ? '1' : t.cd, bx, by+1);
      }
    } else {
      ctx.font=Math.floor(TILE*0.46)+'px '+EMOJI_FONT;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(t.type==='sword'?wE():(isPoisonHeart?'💚':isBlackHeart?'🖤':d.emoji), cx, cy);   // 攻击格按种族武器；绿毒心/黑毒心
    }
  }
  drawBossFx();   // Boss 入场冲击环（叠在棋子之上）
  drawBombFx();   // 炸弹爆炸特效
  drawHookFx();   // 屠夫钩子拖拽线
  // 连接线
  if(selection.length){
    const d=DEF[selection[0].type];
    const lineGlow=(selection[0].type==='sword' && player && player.rogueStealTurn) ? DEF.coin.glow
      : (selection[0].type==='sword' && player && player.fireChainTurn) ? '#ff5a36'
      : d.glow;
    ctx.lineWidth=TILE*0.16; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.strokeStyle=hexA(lineGlow,.9); ctx.shadowColor=lineGlow; ctx.shadowBlur=12;
    ctx.beginPath();
    selection.forEach((s,i)=>{ const px=cellX(s.c)+TILE/2, py=cellY(s.r)+TILE/2;
      i?ctx.lineTo(px,py):ctx.moveTo(px,py); });
    if(dragging && lastPointer) ctx.lineTo(lastPointer.x,lastPointer.y);
    ctx.stroke(); ctx.shadowBlur=0;
  }
}
function hexA(hex,a){ const n=parseInt(hex.slice(1),16);
  return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; }
