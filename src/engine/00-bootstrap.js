
(()=>{
/* CONTENT_BUNDLE_START */
/* CONTENT_BUNDLE_END */
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
//==================== 配置 ====================
// 版本号 v主.次.修：不影响 verify/replay 兼容边界的小改动改"修"；凡是影响 verify/replay/版本分桶/release 验证语义的改动都改"次"；大版本变更需先确认。页面底部显示。
const VERSION='v1.72.1';
const CHANGELOG_LINES=[{"ver": "v1.71.7", "zh": "修复 iOS Safari 离线导航偶发报错：Service Worker 在网络失败且精确缓存未命中时，现在会使用页面壳兜底或返回明确的离线响应，不再把空值交给 `respondWith()`。", "en": "Fixed an intermittent iOS Safari offline navigation error: when the network fails and the exact cache entry is missing, the Service Worker now falls back to the app shell or returns an explicit offline response instead of passing a null value to `respondWith()`."}, {"ver": "v1.71.6", "zh": "澄清炸弹、蔓藤缠绕与竭心光环的战斗日志：明确显示扣除的是全场怪物/敌人的血量，避免把 `−5` 误读为其他属性变化。", "en": "Clarified Bomb, Vine Coil, and Wither Aura combat logs to explicitly say they reduce all foes' HP, avoiding ambiguity around values such as `−5`."}, {"ver": "v1.71.5", "zh": "调整结算日志：死亡/破关页面直接显示与游戏内相同风格的 3 行日志简报，点击简报区域展开完整日志。", "en": "Refined settlement logs to show a 3-line in-game-style summary directly, with the summary area expanding to the full history."}, {"ver": "v1.71.4", "zh": "修复 iOS Safari 的离线缓存错误：Service Worker 不再返回带重定向的导航响应。", "en": "Fixed the iOS Safari offline-cache error by preventing the Service Worker from returning redirected navigation responses."}, {"ver": "v1.71.3", "zh": "增加 PWA Service Worker 缓存：iOS 先联网打开一次页面后，完全断网时仍可打开游戏并使用本地随机开局。", "en": "Added a PWA Service Worker cache so iOS can reopen the game fully offline after one initial online visit, using the existing local-random fallback."}];   /* auto-injected by dr.sh embed-changelog（勿手改） */
const DEV=true;   // release build (DEV=false); dev build is dungeon-raid-dev.html (DEV=true)
const REC_API='https://api.dungeonraid.win';   // 录像分享 API（Cloudflare Worker + KV）
// 带种子随机数（mulberry32）：游戏全程用 rnd() 取代原生随机，配合录制种子可确定性重放
let __rng=null, __rngState=0;
function srand(s){ __rngState=s>>>0; __rng=()=>{ __rngState|=0; __rngState=__rngState+0x6D2B79F5|0; let t=Math.imul(__rngState^__rngState>>>15,1|__rngState); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function rnd(){ if(!__rng) srand((Date.now()>>>0)^0x9e3779b9); return __rng(); }
const COLS=6, ROWS=6, PAD=8;
let TILE=70;                       // 实际按画布宽度自适应
// 显式 emoji 字体栈：让 canvas 测量宽度与彩色 emoji 实际渲染一致（移动端居中更稳）
// 注：心/盾已改用原生彩色 emoji 💗/🔰（不带 FE0F 变体符），避免老符号在 canvas 里居中偏移
const EMOJI_FONT="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
function weap(){ return WEAPON[player&&player.race] || WEAPON.human; }
function wE(){ return weap().e; }                                       // 武器 emoji（攻击格图标）
function wN(){ return tr(weap().n[0], weap().n[1]); }                   // 武器名（本地化）：剑/箭/锤/斧/骨（用 tr 避免与 L 的 token 替换递归）
function wChain(){ return tr(weap().n[0]+'链', weap().n[1]+' chain'); } // 武器链：剑链/箭链/锤链/斧链/骨链
const CONNECTABLE=['sword','shield','heart','coin'];
// 无甲种族（兽人）盾牌是死格，从生成池里移除
function connectablePool(){ return (player&&player.noArmor) ? ['sword','heart','coin'] : CONNECTABLE; }
