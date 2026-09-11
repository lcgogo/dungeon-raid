//==================== 炸弹爆炸特效 ====================
// 炸弹命中的每个怪/Boss 格爆一下：橙色闪光 + 扩散环。锚定到格子（命中后棋子常被移除，不跟随重力）。纯帧驱动、可重放无关。
const bombFx=[]; const BOMB_FX_LIFE=26, BOMB_FX_MS=Math.round(BOMB_FX_LIFE/60*1000);   // ~0.43s @60fps
function addBombFx(r,c){ if(headless||jumping) return; bombFx.push({r,c,life:BOMB_FX_LIFE,max:BOMB_FX_LIFE}); }   // 无头/快进不放
const hookFx=[]; const HOOK_FX_LIFE=14;
function addHookFx(lines){ if(headless||jumping||!lines||!lines.length) return; hookFx.push(...lines.map(l=>({...l,life:HOOK_FX_LIFE,max:HOOK_FX_LIFE}))); }   // 屠夫钩子：纯视觉拖拽线，无头/快进不放
function drawHookFx(){
  for(const f of hookFx){
    const p=1-f.life/f.max;
    const sx=cellX(f.c1)+TILE/2, sy=cellY(f.r1)+TILE/2;
    const ex=cellX(f.c2)+TILE/2, ey=cellY(f.r2)+TILE/2;
    const dx=ex-sx, dy=ey-sy, len=Math.hypot(dx,dy)||1;
    const ux=dx/len, uy=dy/len, px=-uy, py=ux;
    const hx=ex-ux*TILE*0.15, hy=ey-uy*TILE*0.15;
    const wing=TILE*0.08;
    ctx.save();
    ctx.lineCap='round';
    ctx.strokeStyle=hexA('#9aa1a8',0.9*(1-p*0.35));
    ctx.lineWidth=Math.max(2,TILE*0.06*(1-p*0.3));
    ctx.shadowColor='#60666d'; ctx.shadowBlur=8*(1-p);
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke();
    ctx.strokeStyle=hexA('#d0d4d9',0.38*(1-p));
    ctx.lineWidth=Math.max(1,TILE*0.025*(1-p*0.4));
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke();
    ctx.fillStyle=hexA('#8b9299',0.88*(1-p*0.3));
    ctx.beginPath();
    ctx.moveTo(ex,ey);
    ctx.lineTo(hx+px*wing, hy+py*wing);
    ctx.lineTo(hx-px*wing, hy-py*wing);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowBlur=0;
}
function drawBombFx(){
  for(const f of bombFx){
    const p=1-f.life/f.max;
    const cx=cellX(f.c)+TILE/2, cy=cellY(f.r)+TILE/2;
    ctx.save();
    if(p<0.4){ ctx.beginPath(); ctx.arc(cx,cy,TILE*0.5*(1-p/0.4),0,7); ctx.fillStyle=hexA('#ffc23a',0.6*(1-p/0.4)); ctx.fill(); }   // 爆闪
    ctx.beginPath(); ctx.arc(cx,cy,TILE*(0.14+p*0.5),0,7);
    ctx.lineWidth=TILE*0.12*(1-p); ctx.strokeStyle=hexA('#ff7a18',0.85*(1-p));
    ctx.shadowColor='#ff7a18'; ctx.shadowBlur=14*(1-p); ctx.stroke();
    ctx.restore();
  }
  ctx.shadowBlur=0;
}
// 通用棋盘连线特效：从一个棋盘位置指向多个棋盘位置（纯视觉）。
function boardTetherFx(src, cells, opt){
  opt=opt||{};
  if(headless || jumping || !src || src.r<0 || !cells || !cells.length) return;
  try{
    if(!document.createElementNS) return;
    const cv0=document.getElementById('board');
    if(!cv0||!cv0.getBoundingClientRect) return;
    const r=cv0.getBoundingClientRect();
    if(!r.width) return;
    const sx=r.width/cv0.width, sy=r.height/cv0.height;
    const x1=r.left+(cellX(src.c)+TILE/2)*sx, y1=r.top+(cellY(src.r)+TILE/2)*sy;
    const NS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(NS,'svg');
    svg.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:45';
    cells.forEach(cell=>{
      const x2=r.left+(cellX(cell.c)+TILE/2)*sx, y2=r.top+(cellY(cell.r)+TILE/2)*sy;
      const ln=document.createElementNS(NS,'line');
      ln.setAttribute('x1',x1); ln.setAttribute('y1',y1); ln.setAttribute('x2',x2); ln.setAttribute('y2',y2);
      const stroke=opt.stroke||'#b78cff', glow=opt.glow||'#f0d3ff';
      ln.setAttribute('stroke',stroke); ln.setAttribute('stroke-width',String(opt.width||3)); ln.setAttribute('stroke-linecap','round');
      ln.style.filter=`drop-shadow(0 0 6px ${glow})`;
      const len=Math.hypot(x2-x1,y2-y1); ln.setAttribute('stroke-dasharray',len); ln.setAttribute('stroke-dashoffset',len);
      svg.appendChild(ln);
      if(ln.animate) ln.animate([{strokeDashoffset:len,opacity:1},{strokeDashoffset:0,opacity:1,offset:.5},{strokeDashoffset:0,opacity:0}],{duration:opt.duration||620,easing:'ease-out',fill:'forwards'});
      else { ln.setAttribute('stroke-dashoffset','0'); ln.style.opacity='0.9'; }
    });
    markTransientFxDom(svg); document.body.appendChild(svg);
    setTimeout(()=>{ try{ svg.remove(); }catch(e){} }, (opt.duration||620)+60);
  }catch(e){}
}
// 鞭笞者：从 Boss 向本次被鞭策的普通怪抽出红色鞭痕。
function lashmasterFx(src, cells){ boardTetherFx(src,cells,{stroke:'#e74c3c',glow:'#ff9a8f',duration:540}); }
function markTransientFxDom(svg){
  try{ if(svg&&svg.classList) svg.classList.add('drFxSvg'); }catch(e){}
}
function clearTransientFxDom(){
  try{ document.querySelectorAll('.drFxSvg').forEach(el=>el.remove()); }catch(e){}
}
// 通用吸取线特效：从棋盘格子画线到某个 UI 目标（纯 UI，不进录像；无头/桩件环境自动跳过）
function absorbLinesFx(cells, opt){
  if(headless || jumping || !cells || !cells.length) return;   // 快进（跳回合/步进）时不放特效，免得一股脑闪一堆线
  try{
    if(!document.createElementNS) return;   // 桩件（verify.js/测试）的 document 无此方法 → 跳过，不报错
    const cv0=document.getElementById('board');
    const target=(opt&&opt.targetEl) || ((opt&&opt.targetId) ? document.getElementById(opt.targetId) : null);
    if(!cv0||!target||!cv0.getBoundingClientRect||!target.getBoundingClientRect) return;
    const r=cv0.getBoundingClientRect(), tr=target.getBoundingClientRect();
    if(!r.width) return;
    const sx=r.width/cv0.width, sy=r.height/cv0.height;
    const tx=tr.left+((tr.width||0)/2), ty=tr.top+((tr.height||0)/2);
    if(!Number.isFinite(tx) || !Number.isFinite(ty)) return;   // 允许吸到“点目标”（如 Boss 自身格心），别把 0×0 目标误判成无效
    const NS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(NS,'svg');
    svg.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:45';
    cells.forEach(cell=>{
      const cr=Array.isArray(cell)?cell[0]:cell.r, cc=Array.isArray(cell)?cell[1]:cell.c, type=Array.isArray(cell)?null:cell.type;
      const def=(type&&DEF[type])||null;
      const stroke=(opt&&opt.stroke) || (def&&def.color) || '#ff2d2d';
      const glow=(opt&&opt.glow) || (def&&def.glow) || '#ff3b3b';
      const x=r.left+(cellX(cc)+TILE/2)*sx, y=r.top+(cellY(cr)+TILE/2)*sy;
      const ln=document.createElementNS(NS,'line');
      ln.setAttribute('x1',x); ln.setAttribute('y1',y); ln.setAttribute('x2',tx); ln.setAttribute('y2',ty);
      ln.setAttribute('stroke',stroke); ln.setAttribute('stroke-width','3'); ln.setAttribute('stroke-linecap','round');
      ln.style.filter=`drop-shadow(0 0 5px ${glow})`;
      const len=Math.hypot(tx-x,ty-y); ln.setAttribute('stroke-dasharray',len); ln.setAttribute('stroke-dashoffset',len);   // 初始隐藏，避免开头闪一下
      svg.appendChild(ln);
      if(ln.animate) ln.animate([{strokeDashoffset:len,opacity:1},{strokeDashoffset:0,opacity:1,offset:.5},{strokeDashoffset:0,opacity:0}],{duration:680,easing:'ease-out',fill:'forwards'});
      else { ln.setAttribute('stroke-dashoffset','0'); ln.style.opacity='0.92'; }   // 某些移动浏览器不支持 SVG 线段动画：至少要直接显示，别整条线隐身
    });
    markTransientFxDom(svg); document.body.appendChild(svg);
    setTimeout(()=>{ try{ svg.remove(); }catch(e){} }, 720);
  }catch(e){}
}
// 吸魂大法特效：从每个被吸目标的格子画一条发光红线指向 ❤️ 血条（纯 UI，不进录像；无头/桩件环境自动跳过）
function soulDrainFx(cells){
  absorbLinesFx((cells||[]).map(([r,c])=>({r,c})), { targetId:'hpBar', stroke:'#ff2d2d', glow:'#ff3b3b' });
}
function zombiePlagueFx(src){
  if(!src) return;
  absorbLinesFx([{r:src.r,c:src.c}], { targetId:'hpBar', stroke:'#27ae60', glow:'#7dff9d' });
}
function buyoutFx(cells){
  if(headless || jumping || !cells || !cells.length) return;
  try{
    if(!document.createElementNS) return;
    const cv0=document.getElementById('board'), src=document.getElementById('goldTxt');
    if(!cv0||!src||!cv0.getBoundingClientRect||!src.getBoundingClientRect) return;
    const r=cv0.getBoundingClientRect(), sr=src.getBoundingClientRect();
    if(!r.width) return;
    const sx=r.width/cv0.width, sy=r.height/cv0.height;
    const x1=sr.left+((sr.width||0)/2), y1=sr.top+((sr.height||0)/2);
    if(!Number.isFinite(x1) || !Number.isFinite(y1)) return;
    const NS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(NS,'svg');
    svg.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:45';
    cells.forEach(cell=>{
      const x2=r.left+(cellX(cell.c)+TILE/2)*sx, y2=r.top+(cellY(cell.r)+TILE/2)*sy;
      const ln=document.createElementNS(NS,'line');
      ln.setAttribute('x1',x1); ln.setAttribute('y1',y1); ln.setAttribute('x2',x2); ln.setAttribute('y2',y2);
      ln.setAttribute('stroke','#f1c40f'); ln.setAttribute('stroke-width','3'); ln.setAttribute('stroke-linecap','round');
      ln.style.filter='drop-shadow(0 0 6px #ffe58f)';
      const len=Math.hypot(x2-x1,y2-y1); ln.setAttribute('stroke-dasharray',len); ln.setAttribute('stroke-dashoffset',len);
      svg.appendChild(ln);
      if(ln.animate) ln.animate([{strokeDashoffset:len,opacity:1},{strokeDashoffset:0,opacity:1,offset:.45},{strokeDashoffset:0,opacity:0}],{duration:620,easing:'ease-out',fill:'forwards'});
      else { ln.setAttribute('stroke-dashoffset','0'); ln.style.opacity='0.92'; }
    });
    markTransientFxDom(svg); document.body.appendChild(svg);
    setTimeout(()=>{ try{ svg.remove(); }catch(e){} }, 680);
  }catch(e){}
}
function boardPointTarget(src){
  if(!src) return null;
  return { getBoundingClientRect(){ const cv0=document.getElementById('board'); if(!cv0||!cv0.getBoundingClientRect) return {left:0,top:0,width:0,height:0}; const r=cv0.getBoundingClientRect(); if(!r.width) return {left:0,top:0,width:0,height:0}; const sx=r.width/cv0.width, sy=r.height/cv0.height; const cx=r.left+(cellX(src.c)+TILE/2)*sx, cy=r.top+(cellY(src.r)+TILE/2)*sy; return {left:cx, top:cy, width:0, height:0}; } };
}
function skillEffectTarget(slotKey){
  if(slotKey==='heal') return 'shHealName';
  if(slotKey==='bomb') return 'shBombName';
  return 'skillBtn';
}
function snipeBeamFx(src, target){
  if(headless || jumping || !src || !target) return;
  try{
    if(!document.createElementNS) return;
    const cv0=document.getElementById('board'), srcEl=(src.targetEl||document.getElementById(src.targetId||'skillBtn'));
    if(!cv0||!srcEl||!cv0.getBoundingClientRect||!srcEl.getBoundingClientRect) return;
    const r=cv0.getBoundingClientRect(), sr=srcEl.getBoundingClientRect();
    if(!r.width) return;
    const sx=r.width/cv0.width, sy=r.height/cv0.height;
    const x1=(src.anchorX!=null?src.anchorX:(sr.left+((sr.width||0)/2))), y1=(src.anchorY!=null?src.anchorY:(sr.top+((sr.height||0)/2)));
    if(!Number.isFinite(x1) || !Number.isFinite(y1)) return;
    const x2=r.left+(cellX(target.c)+TILE/2)*sx, y2=r.top+(cellY(target.r)+TILE/2)*sy;
    const hitRed=(target&&target.killed)?'#ffcf54':'#ff5a48';
    const hitDark=(target&&target.killed)?'#3a2800':'#1a1a1a';
    const NS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(NS,'svg');
    svg.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:45';
    const mk=(stroke,width,glow,delay,dur)=>{
      const ln=document.createElementNS(NS,'line');
      ln.setAttribute('x1',x1); ln.setAttribute('y1',y1); ln.setAttribute('x2',x2); ln.setAttribute('y2',y2);
      ln.setAttribute('stroke',stroke); ln.setAttribute('stroke-width',String(width)); ln.setAttribute('stroke-linecap','round');
      ln.style.filter=`drop-shadow(0 0 6px ${glow})`;
      const len=Math.hypot(x2-x1,y2-y1); ln.setAttribute('stroke-dasharray',len); ln.setAttribute('stroke-dashoffset',len);
      svg.appendChild(ln);
      if(ln.animate) ln.animate([
        {strokeDashoffset:len,opacity:0},
        {strokeDashoffset:len*0.15,opacity:1,offset:0.28},
        {strokeDashoffset:0,opacity:0.95,offset:0.5},
        {strokeDashoffset:0,opacity:0}
      ],{duration:dur,easing:'cubic-bezier(.2,.7,.2,1)',delay,fill:'forwards'});
      else { ln.setAttribute('stroke-dashoffset','0'); ln.style.opacity='0.9'; }
    };
    const ring=(cx,cy,r0,r1,fill,delay,dur,stroke)=>{
      const el=document.createElementNS(NS,'circle');
      el.setAttribute('cx',cx); el.setAttribute('cy',cy); el.setAttribute('r',r0);
      if(stroke){
        el.setAttribute('fill','none'); el.setAttribute('stroke',stroke); el.setAttribute('stroke-width',String(Math.max(1.5,TILE*0.06)));
        el.style.filter='drop-shadow(0 0 6px '+stroke+')';
      } else {
        el.setAttribute('fill',fill);
        if(fill) el.style.filter='drop-shadow(0 0 8px '+fill+')';
      }
      svg.appendChild(el);
      if(el.animate) el.animate([
        {r:r0, opacity:stroke?0.95:0.95},
        {r:r1, opacity:stroke?0.1:0}
      ],{duration:dur,easing:'ease-out',delay,fill:'forwards'});
      else { el.setAttribute('r',r1); el.style.opacity=stroke?'0.1':'0'; }
    };
    const flash=(cx,cy,w0,w1,h0,h1,fill,delay,dur,rot)=>{
      const el=document.createElementNS(NS,'ellipse');
      el.setAttribute('cx',cx); el.setAttribute('cy',cy); el.setAttribute('rx',w0); el.setAttribute('ry',h0);
      el.setAttribute('fill',fill); el.setAttribute('transform',`rotate(${rot||0} ${cx} ${cy})`);
      el.style.filter='drop-shadow(0 0 8px '+fill+')';
      svg.appendChild(el);
      if(el.animate) el.animate([
        {rx:w0, ry:h0, opacity:0.98},
        {rx:w1, ry:h1, opacity:0}
      ],{duration:dur,easing:'ease-out',delay,fill:'forwards'});
      else { el.setAttribute('rx',w1); el.setAttribute('ry',h1); el.style.opacity='0'; }
    };
    const spark=(ang,delay,dur,color,reach)=>{
      const rad=ang*Math.PI/180, ex=x2+Math.cos(rad)*reach, ey=y2+Math.sin(rad)*reach;
      const ln=document.createElementNS(NS,'line');
      ln.setAttribute('x1',x2); ln.setAttribute('y1',y2); ln.setAttribute('x2',ex); ln.setAttribute('y2',ey);
      ln.setAttribute('stroke',color); ln.setAttribute('stroke-width',String(Math.max(1.4,TILE*0.045))); ln.setAttribute('stroke-linecap','round');
      ln.style.filter='drop-shadow(0 0 5px '+color+')';
      svg.appendChild(ln);
      if(ln.animate) ln.animate([
        {x2:x2,y2:y2,opacity:0},
        {x2:ex,y2:ey,opacity:1,offset:0.28},
        {x2:ex,y2:ey,opacity:0}
      ],{duration:dur,easing:'ease-out',delay,fill:'forwards'});
      else { ln.setAttribute('x2',ex); ln.setAttribute('y2',ey); ln.style.opacity='0'; }
    };
    mk('#ff3b30', 4.3, '#ff8a80', 0, 170);
    mk('#161616', 2.2, '#5a5a5a', 95, 210);
    flash(x1,y1,Math.max(4,TILE*0.08),Math.max(11,TILE*0.22),Math.max(1.8,TILE*0.028),Math.max(5,TILE*0.07),'#ffd6a6',0,120,-18);
    flash(x1,y1,Math.max(2.8,TILE*0.05),Math.max(8,TILE*0.14),Math.max(1.6,TILE*0.022),Math.max(4,TILE*0.05),'#ff4a3d',18,100,22);
    ring(x2,y2,Math.max(2,TILE*0.035),Math.max(13,TILE*0.22),null,78,170,hitRed);
    ring(x2,y2,Math.max(1.5,TILE*0.025),Math.max(10,TILE*0.16),null,135,180,hitDark);
    flash(x2,y2,Math.max(2.3,TILE*0.04),Math.max(8,TILE*0.1),Math.max(2.3,TILE*0.04),Math.max(8,TILE*0.1),hitDark,118,120,0);
    spark(-30, 88, 120, hitRed, Math.max(9,TILE*0.18));
    spark(18, 102, 120, '#ffb16d', Math.max(8,TILE*0.14));
    spark(152, 114, 130, hitDark, Math.max(7,TILE*0.12));
    if(target&&target.killed) spark(70, 126, 150, '#ffd966', Math.max(11,TILE*0.2));
    markTransientFxDom(svg); document.body.appendChild(svg);
    setTimeout(()=>{ try{ svg.remove(); }catch(e){} }, 430);
  }catch(e){}
}
function vampireDrainFx(src, normalCells, poisonCells){
  const targetEl=boardPointTarget(src); if(!targetEl) return;
  if(normalCells&&normalCells.length) absorbLinesFx(normalCells.map(([r,c])=>({r,c})), { targetEl, stroke:'#ff4d6d', glow:'#ff99aa' });
  if(poisonCells&&poisonCells.length) absorbLinesFx(poisonCells.map(([r,c])=>({r,c})), { targetEl, stroke:'#66d17a', glow:'#c08bff' });
}
function devourerDrainFx(src, cells){
  if(!cells || !cells.length) return;
  const targetEl=boardPointTarget(src); if(!targetEl) return;
  absorbLinesFx(cells.map(({r,c})=>({r,c})), { targetEl, stroke:'#b8ff5c', glow:'#e6ff8a' });
}
function summonerFx(src, cells){
  boardTetherFx(src,cells,{stroke:'#b78cff',glow:'#f0d3ff'});
}
function magmaShieldFx(src, cells){
  boardTetherFx(src,cells,{stroke:'#ff6b2f',glow:'#ffb347'});
}

function loop(){
  if(!grid){ requestAnimationFrame(loop); return; } // 棋盘未创建（选职业中）
  // 缓动下落
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(!t)continue;
    const ty=cellY(r); if(t.curY===undefined)t.curY=ty;
    if(t.fxHold>0){ t.fxHold--; if(t.fxHold<=0) delete t.fxHold; continue; }
    t.curY += (ty-t.curY)*0.3; if(Math.abs(ty-t.curY)<0.5)t.curY=ty; }
  for(let i=bossFx.length-1;i>=0;i--){ if(--bossFx[i].life<=0) bossFx.splice(i,1); }   // 推进/回收入场特效
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){ const t=grid[r][c]; if(!t) continue; if(t.frostTurns>0) t.frostTurns--; if(t.flashWhite>0) t.flashWhite--; }
  for(let i=bombFx.length-1;i>=0;i--){ if(--bombFx[i].life<=0) bombFx.splice(i,1); }   // 推进/回收炸弹特效
  for(let i=hookFx.length-1;i>=0;i--){ if(--hookFx[i].life<=0) hookFx.splice(i,1); }   // 推进/回收屠夫拖拽线
  draw(); requestAnimationFrame(loop);
}
