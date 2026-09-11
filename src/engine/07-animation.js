//==================== 坐标/动画 ====================
function cellX(c){ return PAD + c*TILE; }
function cellY(r){ return PAD + r*TILE; }

function syncPositions(snap){
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const t=grid[r][c]; if(!t) continue;
    t.r=r; t.c=c;
    if(snap || t.curY===undefined) t.curY=cellY(r);
  }
}
function holdVisibleBoard(){
  if(!grid) return;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const t=grid[r][c]; if(!t) continue;
    t.curY=cellY(r);
    if(gravityFxHold>0) t.fxHold=gravityFxHold;
    else delete t.fxHold;
  }
}
