//==================== 多语言 ====================
let lang = (()=>{ try{
    const saved=localStorage.getItem('dr_lang');
    if(saved==='en'||saved==='zh') return saved;          // 用过就记住选择
    const nav=((navigator.language||navigator.userLanguage||'')+'').toLowerCase();
    return nav.indexOf('zh')===0 ? 'zh' : 'en';            // 首次访问跟随浏览器语言
  }catch(e){ return 'zh'; } })();
const tr = (zh,en)=> lang==='en' ? en : zh;            // 行内双语：渲染时取值
const L  = (x)=>{ let s = Array.isArray(x) ? tr(x[0],x[1]) : x;        // 数据字段：[中文, English]
  return (typeof s==='string' && s.indexOf('{W')>=0) ? s.replace(/\{WC\}/g, wChain()).replace(/\{W\}/g, wN()) : s; };  // 武器 token：{W}=武器名、{WC}=武器链（按种族）
let installPromptEvt=null;
function setLang(l){
  lang = l==='en'?'en':'zh';
  try{ localStorage.setItem('dr_lang',lang); }catch(e){}
  const lb=document.getElementById('langBtn'); if(lb) lb.textContent = lang==='en'?'中文':'EN';
  applyStaticLang();
  logClear();   // 日志条目已是翻译好的定文（含 −5 等动态值），切语言无法逐条回译——清空，后续事件按新语言记
  if(player) updateHUD();
  // 选职业界面正开着 → 用新语言重绘
  if(!grid && document.getElementById('overlay').classList.contains('show')) showClassSelect();
}
// 更新 HTML 里的静态文字（标签/底部说明/商店按钮基础文案）
function applyStaticLang(){
  const set=(id,txt)=>{ const el=document.getElementById(id); if(el) el.textContent=txt; };
  if(document.documentElement) document.documentElement.lang = lang==='en'?'en':'zh-CN';
  const tt=document.getElementById('title');
  if(tt) tt.innerHTML = tr('　　🏰 地牢突袭·网页版','　　🏰 Dungeon Raid · Web');
  set('lblHp', tr('生命','HP'));
  set('lblAr', tr('护甲','Armor'));
  set('lblXp', tr('经验','XP'));
  set('lblLv', tr('等级','Lv'));
  set('lblTurn', tr('回合','Turn'));
  set('hudHint', tr('ⓘ 点击查看属性 / 职业详情','ⓘ Tap for stats / class details'));
  set('shHealName', tr('💊 治疗','💊 Heal'));
  set('shHealDesc', tr('回复10生命','Restore 10 HP'));
  set('shBombName', tr('💥 炸弹','💥 Bomb'));
  set('shBombDesc', tr('全场怪-5血','All foes -5 HP'));
  set('tapHint', tr('💡：点开任意方块查看更多','💡: Tap any tile for more'));
  set('ver', VERSION+(DEV?tr(' · 🚧 DEV 开发版',' · 🚧 DEV build'):tr(' · 正式版',' · Release'))+' 📝');
}
