// 回归：击杀 50 回合 Boss 同回合升级时，转职后不能卡死（必须接着弹升级，而非 busy=false+待升级卡住不能划）。
// 运行：node worker/sticktest.js
const fs = require('fs');
const path = require('path');
const file = fs.existsSync('dungeon-raid-dev.html') ? 'dungeon-raid-dev.html' : path.join('..', 'dungeon-raid-dev.html');
const raw = fs.readFileSync(file, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];

const EXPORT = `globalThis.__K={startGame,raceById,showTierSelect,showSkillSwap,
  get player(){return player}, get busy(){return busy}, set busy(v){busy=v},
  get pendingLevels(){return pendingLevels}, set pendingLevels(v){pendingLevels=v}, set replaying(v){replaying=v}};`;
const elH = { get(t,p){ if(p==='style')return t._s||(t._s={}); if(p==='dataset')return t._d||(t._d={}); if(p==='classList')return{add(){},remove(){},toggle(){}}; if(p==='getContext')return()=>new Proxy({},{get:()=>()=>{},set:()=>true}); if(['addEventListener','appendChild','setAttribute','focus','click'].includes(p))return()=>{}; if(p==='querySelector')return()=>new Proxy({},elH); if(p==='querySelectorAll')return()=>[]; if(p==='getBoundingClientRect')return()=>({left:0,top:0,width:420,height:420}); if(['width','height','clientWidth','clientHeight'].includes(p))return 420; return t[p]; }, set(t,p,v){t[p]=v;return true;} };
const mk = () => new Proxy({}, elH);

function makeEngine(){
  const s = raw.replace('resize(); showClassSelect(); loop();', EXPORT);
  const store = {};
  const localStorage = { getItem(k){ return k in store ? store[k] : null; }, setItem(k,v){ store[k]=String(v); }, removeItem(k){ delete store[k]; } };
  const created = [];
  const mkTracked = () => { const p = new Proxy({}, elH); created.push(p); return p; };   // 追踪 createElement 出来的按钮
  const document = { getElementById:mk, createElement:mkTracked, querySelector:mk, querySelectorAll:()=>[], addEventListener(){}, body:mk() };
  new Function('document','window','localStorage','requestAnimationFrame','location','navigator','fetch','URLSearchParams', s)(
    document, {addEventListener(){},requestAnimationFrame:()=>0}, localStorage, ()=>0,
    {search:''},{language:'zh'},()=>{},URLSearchParams);
  return { K: globalThis.__K, created };
}

let fails=0; const ok=(c,m)=>{ console.log((c?'✓':'✗')+' '+m); if(!c) fails++; };

const { K, created } = makeEngine();
K.replaying=false;
K.startGame(K.raceById('human'));
K.pendingLevels=1;          // 模拟：击杀 50 回合 Boss 的 XP 让你同回合升了级
K.busy=true;                // 转职弹窗期间 busy=true
created.length=0;
K.showTierSelect(1);        // 弹一阶转职
const btns=created.filter(b=>typeof b.onclick==='function');
ok(btns.length>=1, '一阶转职页有可点的职业按钮');
btns[0].onclick();          // 选第一个职业
ok(!!K.player.tier1, '已成功转一阶职业');
ok(K.busy===true && K.pendingLevels>0, '转职后仍有待升级→自动接着弹升级（busy 维持 true），没有卡死');

console.log(fails ? `\n❌ ${fails} 项未通过（疑似又会卡住）` : '\n✅ 转职/升级同回合不卡死');
process.exit(fails?1:0);
