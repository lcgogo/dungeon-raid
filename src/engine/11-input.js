//==================== 输入 ====================
let lastPointer=null, dragExtended=false, dragStartX=0, dragStartY=0;   // dragStartX/Y：pointerdown 时的屏幕坐标，用于区分轻触和拖拽
let tapInfoTimer=null, tapInfoCell=null;   // 盾/心/金 轻触延迟弹信息，留出双击窗口（双击=贪心连线）
function cellFromEvent(e){
  const rect=cv.getBoundingClientRect();
  const sx=cv.width/rect.width, sy=cv.height/rect.height;
  const px=(e.clientX-rect.left)*sx, py=(e.clientY-rect.top)*sy;
  lastPointer={x:px,y:py};
  const c=Math.floor((px-PAD)/TILE), r=Math.floor((py-PAD)/TILE);
  if(r<0||r>=ROWS||c<0||c>=COLS) return null;
  return {r,c};
}
// 贪心连线：从 (r0,c0) 沿 8 向同类棋子两头延伸成一条尽量长的链（双击 盾/心/金 触发）。实际格子由 resolve 录制，回放无关。
function greedyChain(r0,c0,type){
  const inB=(r,c)=>r>=0&&r<ROWS&&c>=0&&c<COLS;
  const nbrs=(r,c,vis)=>{ const o=[]; for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){ if(!dr&&!dc) continue; const nr=r+dr,nc=c+dc; if(!inB(nr,nc)) continue; const t=grid[nr][nc]; if(t&&t.type===type){ const k=nr*COLS+nc; if(!vis.has(k)) o.push([nr,nc,k]); } } return o; };   // 8 向（含斜线）同类未访邻居
  // 穷举「过起点」最长简单路径：前臂(frontDFS 走起点一侧)×后臂(backDFS 走另一侧)的所有组合都试，取最长。
  // 比「先贪心吃最长一臂」更优——后者会把另一侧本该留的格子占掉（漏掉起点旁那个）。预算封顶防卡顿（最坏 ~40ms，实战单类型块小、<5ms）。
  let best=[[r0,c0]], budget=400000;
  const vis=new Set([r0*COLS+c0]); const front=[[r0,c0]];
  function backDFS(r,c,back){
    if(--budget<0) return;
    if(front.length+back.length-1>best.length) best=front.slice(1).reverse().concat([[r0,c0]], back.slice(1));
    for(const [nr,nc,k] of nbrs(r,c,vis)){ vis.add(k); back.push([nr,nc]); backDFS(nr,nc,back); back.pop(); vis.delete(k); }
  }
  function frontDFS(r,c){
    if(budget<0) return;
    backDFS(r0,c0,[[r0,c0]]);   // 固定当前前臂，从起点向另一侧穷举后臂
    for(const [nr,nc,k] of nbrs(r,c,vis)){ vis.add(k); front.push([nr,nc]); frontDFS(nr,nc); front.pop(); vis.delete(k); }
  }
  frontDFS(r0,c0);
  return best;
}
function autoGreedyChain(r0,c0,type){
  const chain=greedyChain(r0,c0,type);
  if(chain.length<2){ const t=grid[r0][c0]; if(t) showTileInfo(t); return; }   // 没有可连同类邻居 → 退化为看信息
  selection=chain.map(([r,c])=>({r,c,type}));
  lastPointer=null; busy=true;   // 先把连线亮出来一拍再结算（busy 只锁输入、不挡渲染；draw 见 selection 即画线）
  setTimeout(()=>{ busy=false; if(selection.length){ resolve(); selection=[]; } updateHUD(); }, 260);
}
function startDrag(e){
  if(replaying){ e.preventDefault(); togglePauseReplay(); return; }   // 回放中：棋盘不可操作；点棋盘=暂停/继续
  if(busy||pendingLevels) return;
  const cell=cellFromEvent(e); if(!cell) return;
  const t=grid[cell.r][cell.c]; if(!t) return;
  // 双击 盾/心/金 → 贪心连线（双击窗口内、同一格的第二次 pointerdown）
  if(tapInfoTimer && tapInfoCell && tapInfoCell.r===cell.r && tapInfoCell.c===cell.c){
    clearTimeout(tapInfoTimer); tapInfoTimer=null; tapInfoCell=null;
    if(t.type==='shield'||t.type==='heart'||t.type==='coin'){ e.preventDefault(); autoGreedyChain(cell.r,cell.c,t.type); return; }
  }
  if(tapInfoTimer){ clearTimeout(tapInfoTimer); tapInfoTimer=null; tapInfoCell=null; }   // 点了别处 → 取消上一个待弹信息
  // 从怪物 / 火焰链可划过的 Boss 起手 → 视为剑攻击链
  const base = (isSwordTarget(t) || isFireChainTarget(t)) ? 'sword' : t.type;   // 怪 / 可攻击Boss / 火焰链可点燃Boss 起手 → 剑链
  // 不可连的 Boss 仍允许轻触查看信息（连线不会扩展，松手即弹说明）
  if(t.type!=='boss' && !CONNECTABLE.includes(base)) return;
  dragging=true; dragExtended=false; selection=[{r:cell.r,c:cell.c,type:base}];
  dragStartX=e.clientX; dragStartY=e.clientY;
  e.preventDefault();
}
function moveDrag(e){
  if(!dragging) return; e.preventDefault();
  const cell=cellFromEvent(e); if(!cell) return;
  const t=grid[cell.r][cell.c]; if(!t) return;
  const last=selection[selection.length-1];
  // 回退
  if(selection.length>=2){
    const prev=selection[selection.length-2];
    if(prev.r===cell.r&&prev.c===cell.c){ selection.pop(); return; }
  }
  if(selection.some(s=>s.r===cell.r&&s.c===cell.c)) return; // 已选
  const base=selection[0].type;
  if(base!=='sword' && !CONNECTABLE.includes(base)) return;   // 'boss' 等不可成链的起手仅用于轻触查看信息，不可拖成多格
  const ok = t.type===base || (base==='sword' && (isSwordTarget(t) || isFireChainTarget(t))); // 剑链可穿怪/可攻击Boss；火焰链开启时也可从剑免疫 Boss 起手并划过点燃
  if(!ok) return;
  if(Math.abs(cell.r-last.r)<=1 && Math.abs(cell.c-last.c)<=1){ // 相邻8向
    selection.push({r:cell.r,c:cell.c,type:t.type}); dragExtended=true; }
}
function endDrag(e){
  if(!dragging) return; dragging=false;
  if(selection.length>=2){
    // 剑链必须含至少一把剑（剑是武器）：从怪起手却没把任何剑连进来 → 不算攻击，取消且不消耗回合
    if(selection[0].type==='sword' && !selection.some(s=>{ const t=grid[s.r][s.c]; return t&&t.type==='sword'; })){
      log(tr(`⚔️ 没把${wN()}连进来，无法攻击——${wN()}才是你的武器！`,`⚔️ No ${wN()} in the chain — link a ${wE()} to attack!`));
    } else resolve();
  }
  if(selection.length===1){
    const dx=e.clientX-dragStartX, dy=e.clientY-dragStartY;
    if(Math.abs(dx)<10 && Math.abs(dy)<10){ const s=selection[0], t=grid[s.r][s.c];
      if(t){
        if(t.type==='shield'||t.type==='heart'||t.type==='coin'){   // 可双击贪心连线的类型 → 延迟弹信息，留出双击窗口
          if(tapInfoTimer) clearTimeout(tapInfoTimer);
          tapInfoCell={r:s.r,c:s.c}; const tt=t;
          tapInfoTimer=setTimeout(()=>{ tapInfoTimer=null; tapInfoCell=null; showTileInfo(tt); }, 280);
        } else showTileInfo(t);   // 怪/Boss/剑：即时弹信息（无双击连线）
      }
    }
  }
  selection=[]; lastPointer=null;
}
cv.addEventListener('pointerdown',startDrag);
cv.addEventListener('pointermove',moveDrag);
window.addEventListener('pointerup',endDrag);
cv.addEventListener('pointercancel',endDrag);
