//==================== Boss 入场特效 ====================
// Boss 降临时从该格爆出扩散冲击环 + 闪光，让"有 Boss 入场"一眼可辨（区别于普通小怪刷新）。纯帧驱动、可重放无关。
const bossFx=[];           // {tile,c,r,life,max,gold,pulseCol?,boardPulse?}：锚定到 Boss 棋子对象，跟随其下落动画
const FX_LIFE=46;          // 帧数（约 0.75s @60fps）
// 锚定到刚放下的 Boss 棋子本身：之后 applyGravity 会让它沿列下落，特效需跟随，否则会落在掉进原格的别的棋子上。
function addBossFx(r,c,gold,pulseCol,boardPulse){ if(headless||jumping) return; bossFx.push({tile:grid[r][c],c,r,life:FX_LIFE,max:FX_LIFE,gold:!!gold,pulseCol:pulseCol||null,boardPulse:!!boardPulse}); }   // 无头/快进(跳转·步进)不放，否则整局的 Boss 入场闪一股脑堆出来
function drawBossFx(){
  for(const f of bossFx){
    const p=1-f.life/f.max;                          // 0→1 进度
    const t=f.tile;
    const cx=cellX(f.c)+TILE/2;                       // 列在重力下不变
    const cy=((t&&t.curY!==undefined)?t.curY:cellY(f.r))+TILE/2;   // 跟随 Boss 当前（下落中的）y
    const col=f.gold?'#ffd54a':(f.pulseCol||'#ff5252');            // 终焉之主金，普通 Boss 红；可选自定义脉冲色
    ctx.save();
    if(f.boardPulse){
      const boardR=Math.hypot(COLS*TILE, ROWS*TILE)*0.62;
      ctx.beginPath(); ctx.arc(cx,cy,boardR*(0.18+Math.min(1,p*1.15)),0,7);
      ctx.lineWidth=Math.max(6,TILE*0.22*(1-p*0.75)); ctx.strokeStyle=hexA(col,0.26*(1-p*0.4));
      ctx.shadowColor=col; ctx.shadowBlur=34*(1-p*0.35); ctx.stroke();
      if(p<0.24){ ctx.beginPath(); ctx.arc(cx,cy,boardR*(0.42+p*0.38),0,7); ctx.fillStyle=hexA(col,0.12*(1-p/0.24)); ctx.fill(); }
    }
    if(p<0.35){ ctx.beginPath(); ctx.arc(cx,cy,TILE*0.56,0,7); ctx.fillStyle=hexA(col,0.5*(1-p/0.35)); ctx.fill(); }   // 起手闪光
    for(let k=0;k<2;k++){ const pp=p-k*0.22; if(pp<=0||pp>=1) continue;   // 双层扩散环
      ctx.beginPath(); ctx.arc(cx,cy,TILE*(0.18+pp*(f.gold?1.3:1.0)),0,7);
      ctx.lineWidth=TILE*0.13*(1-pp); ctx.strokeStyle=hexA(col,0.75*(1-pp));
      ctx.shadowColor=col; ctx.shadowBlur=16*(1-pp); ctx.stroke(); }
    ctx.restore();
  }
  ctx.shadowBlur=0;
}