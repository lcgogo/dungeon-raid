// 回归：吸取线允许吸到 0×0 的点目标（如吸血鬼/饕餮本体格心），不能因 width/height 为 0 而整条线不画。
// 运行：node test/fxpointtest.js
const fs = require('fs');
const path = require('path');
const file = fs.existsSync('dungeon-raid-dev.html') ? 'dungeon-raid-dev.html' : path.join('..', 'dungeon-raid-dev.html');
let s = fs.readFileSync(file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const EXPORT = `globalThis.__FX={absorbLinesFx,boardPointTarget,vampireDrainFx,devourerDrainFx,cellX,cellY,TILE,setHeadless(v){headless=v},setJumping(v){jumping=v}};`;
s = s.replace('resize(); showClassSelect(); loop();', EXPORT);

let lineSupportsAnimate=true;
function makeLine(){
  const line={
    attrs:{},
    style:{},
    setAttribute(k,v){ this.attrs[k]=String(v); },
  };
  if(lineSupportsAnimate) line.animate=function(){ this.animated=true; };
  return line;
}
function makeSvg(){
  return {
    tag:'svg',
    style:{},
    children:[],
    appendChild(node){ this.children.push(node); node.parent=this; },
    remove(){ this.removed=true; },
  };
}

const appended=[];
const board={
  width:420,
  height:420,
  clientWidth:420,
  clientHeight:420,
  style:{},
  addEventListener(){},
  removeEventListener(){},
  appendChild(){},
  setAttribute(){},
  focus(){},
  click(){},
  getContext(){ return new Proxy({}, { get:()=>()=>{}, set:()=>true }); },
  getBoundingClientRect(){ return { left:10, top:20, width:420, height:420 }; },
};
const body={ appendChild(node){ appended.push(node); node.parent=this; } };
const genericEl={
  style:{},
  width:30,
  height:30,
  clientWidth:30,
  clientHeight:30,
  addEventListener(){},
  removeEventListener(){},
  appendChild(){},
  setAttribute(){},
  focus(){},
  click(){},
  querySelector(){ return genericEl; },
  querySelectorAll(){ return []; },
  getContext(){ return new Proxy({}, { get:()=>()=>{}, set:()=>true }); },
  getBoundingClientRect(){ return { left:0, top:0, width:30, height:30 }; },
};
const byId={ board, hpBar:genericEl, skillBtn:genericEl };
const document={
  body,
  addEventListener(){},
  getElementById(id){ return byId[id] || genericEl; },
  querySelector(){ return genericEl; },
  querySelectorAll(){ return []; },
  createElement(){ return { ...genericEl, style:{} }; },
  createElementNS(ns, tag){
    if(tag==='svg') return makeSvg();
    if(tag==='line') return makeLine();
    return { tag, style:{}, attrs:{}, setAttribute(k,v){ this.attrs[k]=String(v); }, appendChild(){}, remove(){}, animate(){} };
  },
};
const localStorage={ getItem(){ return null; }, setItem(){}, removeItem(){} };
const windowObj={ addEventListener(){}, requestAnimationFrame:()=>0 };
const noop=()=>{};
new Function('document','window','localStorage','requestAnimationFrame','location','navigator','fetch','URLSearchParams','setTimeout',s)(
  document, windowObj, localStorage, ()=>0, {search:''}, {language:'zh'}, noop, URLSearchParams, ()=>0
);
const FX=globalThis.__FX;
FX.setHeadless(false);
FX.setJumping(false);

let fails=0;
function ok(cond,msg){ console.log((cond?'✓':'✗')+' '+msg); if(!cond) fails++; }
function lastSvg(){ return appended[appended.length-1]; }
function reset(){ appended.length=0; }

reset();
FX.absorbLinesFx([{r:1,c:2}], { targetEl:{ getBoundingClientRect(){ return { left:150, top:160, width:0, height:0 }; } }, stroke:'#abc' });
let svg=lastSvg();
ok(!!svg, '通用吸取线：0×0 点目标仍会创建 SVG');
ok(svg && svg.children.length===1, '通用吸取线：为点目标画出 1 条线');
if(svg && svg.children[0]){
  ok(svg.children[0].attrs.x2==='150', '通用吸取线：终点 x2 使用点目标 left');
  ok(svg.children[0].attrs.y2==='160', '通用吸取线：终点 y2 使用点目标 top');
}

reset();
lineSupportsAnimate=false;
FX.absorbLinesFx([{r:0,c:1}], { targetEl:{ getBoundingClientRect(){ return { left:180, top:190, width:0, height:0 }; } }, stroke:'#def' });
svg=lastSvg();
ok(!!svg, '通用吸取线：无 animate 时仍会创建 SVG');
if(svg && svg.children[0]){
  ok(svg.children[0].attrs['stroke-dashoffset']==='0', '通用吸取线：无 animate 时直接显示整条线');
  ok(svg.children[0].style.opacity==='0.92', '通用吸取线：无 animate 时使用兼容透明度回退');
}
lineSupportsAnimate=true;

const pointTarget=FX.boardPointTarget({r:2,c:3});
ok(!!pointTarget, '棋盘点目标 helper：能为格心生成 targetEl');
if(pointTarget){
  const rect=pointTarget.getBoundingClientRect();
  ok(rect.width===0 && rect.height===0, '棋盘点目标 helper：返回 0×0 点目标');
  ok(Number.isFinite(rect.left) && Number.isFinite(rect.top), '棋盘点目标 helper：返回有效屏幕坐标');
}

reset();
FX.vampireDrainFx({r:2,c:3}, [[0,0],[1,1]], [[4,4]]);
const vampSvgs=appended.slice();
ok(vampSvgs.length===2, '吸血鬼吸心：普通心/毒心各自创建一层 SVG');
ok(vampSvgs.reduce((n,node)=>n+((node&&node.children&&node.children.length)||0),0)===3, '吸血鬼吸心：普通心/毒心共画出 3 条线');

reset();
FX.devourerDrainFx({r:4,c:1}, [{r:0,c:0},{r:3,c:3}]);
svg=lastSvg();
ok(!!svg, '饕餮吞怪：回到自身格心时仍会创建 SVG');
ok(svg && svg.children.length===2, '饕餮吞怪：每个被吸目标各画 1 条线');

console.log(fails ? `\n❌ ${fails} 项未通过（点目标吸取线疑似又回归）` : '\n✅ 点目标吸取线回归测试通过');
process.exit(fails?1:0);
