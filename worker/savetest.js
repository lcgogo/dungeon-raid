// 存档版本兼容性烟测：正式版换版本→存档判不兼容、从头开始；dev 版不受影响。
// 运行：node worker/savetest.js
const fs = require('fs');
const path = require('path');
const file = fs.existsSync('dungeon-raid-dev.html') ? 'dungeon-raid-dev.html' : path.join('..', 'dungeon-raid-dev.html');
const raw = fs.readFileSync(file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];

const EXPORT = `globalThis.__S={startGame,raceById,saveGame,loadGame,hasSave,VERSION,SAVE_KEY,
  get player(){return player}, set busy(v){busy=v}};`;
const elH = { get(t,p){ if(p==='style')return t._s||(t._s={}); if(p==='dataset')return t._d||(t._d={}); if(p==='classList')return{add(){},remove(){},toggle(){}}; if(p==='getContext')return()=>new Proxy({},{get:()=>()=>{},set:()=>true}); if(['addEventListener','appendChild','setAttribute','focus','click'].includes(p))return()=>{}; if(p==='querySelector')return()=>new Proxy({},elH); if(p==='querySelectorAll')return()=>[]; if(p==='getBoundingClientRect')return()=>({left:0,top:0,width:420,height:420}); if(['width','height','clientWidth','clientHeight'].includes(p))return 420; return t[p]; }, set(t,p,v){t[p]=v;return true;} };
const mk = () => new Proxy({}, elH);

function makeEngine(devFlag){
  let s = raw.replace('resize(); showClassSelect(); loop();', EXPORT);
  if(!devFlag) s = s.replace('const DEV=true;', 'const DEV=false;');
  const store = {};
  const localStorage = { getItem(k){ return k in store ? store[k] : null; }, setItem(k,v){ store[k]=String(v); }, removeItem(k){ delete store[k]; } };
  new Function('document','window','localStorage','requestAnimationFrame','location','navigator','fetch','URLSearchParams', s)(
    {getElementById:mk,createElement:mk,querySelector:mk,querySelectorAll:()=>[],addEventListener(){},body:mk()},
    {addEventListener(){},requestAnimationFrame:()=>0}, localStorage, ()=>0,
    {search:''},{language:'zh'},()=>{},URLSearchParams);
  return { S: globalThis.__S, store };
}

let fails=0; const ok=(c,m)=>{ console.log((c?'✓':'✗')+' '+m); if(!c) fails++; };

function run(devFlag,label){
  const { S, store } = makeEngine(devFlag);
  S.busy=false;
  S.startGame(S.raceById('human'));   // 建立真实 player+grid
  S.saveGame();                       // 写入存档（ver=当前版本）
  ok(S.hasSave(), `${label} 同版本存档有效`);
  ok(S.loadGame()===true, `${label} 同版本可继续`);
  // 篡改存档版本号 → 模拟“版本发生变化”
  const d = JSON.parse(store[S.SAVE_KEY]); d.ver='v0.0.0-old'; store[S.SAVE_KEY]=JSON.stringify(d);
  if(devFlag){
    ok(S.hasSave()===true, `${label} 旧版本存档仍有效（dev 不受影响）`);
    ok(S.loadGame()===true, `${label} 旧版本仍可继续（dev）`);
  } else {
    ok(S.hasSave()===false, `${label} 旧版本判不兼容`);
    ok(S.loadGame()===false, `${label} 旧版本拒绝继续`);
    ok(!(S.SAVE_KEY in store), `${label} 不兼容存档已清除`);
  }
}

run(true, '[DEV]');
run(false, '[正式版]');
console.log(fails ? `\n❌ ${fails} 项未通过` : '\n✅ 存档版本兼容性全部通过');
process.exit(fails?1:0);
