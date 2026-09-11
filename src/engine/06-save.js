//==================== 本地存档 ====================
const SAVE_KEY=DEV?'dr_save_dev':'dr_save', BEST_KEY=DEV?'dr_best_dev':'dr_best';   // dev 版独立存档，与正式版互不覆盖
const TUT_KEY=DEV?'dr_tut_dev':'dr_tut';   // 新手第一局标记（置位后不再给教学棋盘）
const NAME_KEY=DEV?'dr_name_dev':'dr_name';   // 排行榜展示名（alias，本机持久，自动填上次的）
function clampName(s){ s=(s||"").trim(); let o="",w=0; for(const ch of s){ const c=ch.codePointAt(0); if(c<32||c===127) continue; const cw=c>0x2e7f?2:1; if(w+cw>24) break; o+=ch; w+=cw; } return o; }   // 最长 12 汉字（宽度24，过滤控制字符）
function getName(){ try{ return localStorage.getItem(NAME_KEY)||''; }catch(e){ return ''; } }
function setName(v){ try{ localStorage.setItem(NAME_KEY, clampName(v)); }catch(e){} }
purgeWarmSeed();   // 页面启动只清理本地过期 / 旧版本 warm seed，不主动申请新 seed
// 随机名：形容词+的+名词（玩家🎲；中英按语言）
const NM_ADJ_ZH=['勇敢','狡猾','无畏','暴躁','沉默','闪光','幸运','落魄','狂热','冷酷','神秘','贪婪','永恒','嗜血','迅捷','孤独'];
const NM_NOUN_ZH=['剑客','游侠','骑士','守卫','屠夫','浪人','行者','亡魂','君王','流寇','影子','猎手','老兵','圣徒','赌徒','莽夫'];
const NM_ADJ_EN=['Brave','Sly','Fearless','Grumpy','Silent','Shining','Lucky','Reckless','Cold','Greedy','Eternal','Swift','Lonely','Savage'];
const NM_NOUN_EN=['Knight','Ranger','Rogue','Warden','Butcher','Wanderer','Hunter','Ghost','King','Veteran','Saint','Gambler','Brute','Outlaw'];
function genName(){ const pick=a=>a[Math.floor(Math.random()*a.length)]; return lang==='en' ? pick(NM_ADJ_EN)+' '+pick(NM_NOUN_EN) : pick(NM_ADJ_ZH)+'的'+pick(NM_NOUN_ZH); }
const REC_KEY=DEV?'dr_rec_dev':'dr_rec', REC_LAST_KEY=DEV?'dr_rec_last_dev':'dr_rec_last';  // 进行中录像 / 上一局完整录像
const SEED_POOL_KEY=DEV?'dr_seed_pool_dev':'dr_seed_pool';   // 预热的服务端种子：本地最多缓存 1 枚，优先给下次正式版开局复用
// 录制一个玩家动作（回放中不录）。动作：['m',cells,baseType] 连线 / ['b',key] 购买 / ['b',key,'seer',type] 换装先知选择 / ['k'] 技能 / ['k','seer',type] 先知选择 / ['a',key,on] 自动释放开关 / ['u',idx] 升级选择 / ['t',tier,id] 转职选择
// 每个动作末尾追加一个时间戳（epoch ms，相对开局可算操作间隔）——仅供离线分析（后续黑盒判定是否 AI 录像），回放/校验按固定下标取值，忽略该尾元素，旧录像无此字段也能正常回放。
function recAct(a){ if(rec && !replaying){ a.push(Date.now()-(rec.t0||0)); rec.acts.push(a); saveRec(); } }
// 本局游玩时长（毫秒）：实时对局取 now−t0；回放取录像最后一步的时间戳（相对开局 ms）
function playMs(){
  if(!replaying && rec && rec.t0) return Math.max(0, Date.now()-rec.t0);
  const src = replayRec || rec;
  if(src && Array.isArray(src.acts) && src.acts.length){ const la=src.acts[src.acts.length-1]; const t=la[la.length-1]; if(typeof t==='number') return t; }
  return 0;
}
function fmtDur(ms){ const s=Math.round(ms/1000); if(s<60) return tr(`${s} 秒`,`${s}s`); const m=Math.floor(s/60); return tr(`${m} 分 ${s%60} 秒`,`${m}m ${s%60}s`); }
function saveRec(){ try{ if(rec) localStorage.setItem(REC_KEY, JSON.stringify(rec)); }catch(e){} }
function loadRec(){ try{ return JSON.parse(localStorage.getItem(REC_KEY)||'null'); }catch(e){ return null; } }
function getLastRec(){ try{ return JSON.parse(localStorage.getItem(REC_LAST_KEY)||'null'); }catch(e){ return null; } }
let ended=false;   // 本局是否已结束（死亡/破关）。结束后绝不再写存档——防「死了之后继续上局又能玩」：gameOver/onClear 清了存档，但若随后还有延迟的 updateHUD（如双击连线的 setTimeout）会把死局重新存回去。
function saveGame(){
  if(replaying || ended) return;   // 回放中 / 本局已结束 → 不写存档
  if(!grid||!player) return;
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      ver: VERSION,   // 存档版本：正式版换版本即判不兼容、从头开始（dev 不受影响）
      pendingLevels,
      rngState: __rngState>>>0,   // 恢复续局时也要续上同一条 RNG 轨迹，否则后续补格/刷怪会让 replay 漂移
      player:{...player},
      grid: grid.map(row=>row.map(t=> t?{type:t.type,hp:t.hp,maxHp:t.maxHp,atk:t.atk,cd:t.cd,baseCd:t.baseCd,bossId:t.bossId,tier:t.tier,stolen:t.stolen,finale:t.finale,incub:t.incub,poison:t.poison,burnTurns:t.burnTurns,burnStacks:t.burnStacks}:null)),
    }));
  }catch(e){}
}
function hasSave(){ try{ const d=JSON.parse(localStorage.getItem(SAVE_KEY)||'null'); return !!d && (DEV || d.ver===VERSION); }catch(e){ return false; } }   // 正式版仅当存档版本与当前一致才算有效存档
function clearSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
function loadGame(){
  try{
    const data=JSON.parse(localStorage.getItem(SAVE_KEY)); if(!data) return false;
    if(!DEV && data.ver!==VERSION){ clearSave(); try{ localStorage.removeItem(REC_KEY); }catch(e){} return false; }   // 正式版：版本变化→存档不兼容，丢弃从头开始
    if(typeof data.rngState==='number') srand(data.rngState>>>0);   // 续局必须接回原 RNG 轨迹，否则后续补格/刷怪会让 replay 漂移
    else { __rng=null; __rngState=0; }   // 旧存档缺少 RNG 快照时，至少别误沿用本页残留状态
    player=normalizePlayerClassIds(data.player);
    if(!player.autoUse) player.autoUse={heal:false,bomb:false};
    ended=false;   // 继续上局 = 恢复进行中的对局，重新允许存档
    pendingLevels=data.pendingLevels||0;
    grid=data.grid.map(row=>row.map(t=> t?{...t}:null));
    rec=loadRec();   // 恢复进行中的录像，继续游戏时录制不断
    if(rec && rec.acts && rec.acts.length){ const la=rec.acts[rec.acts.length-1]; const last=la[la.length-1]; if(typeof last==='number') rec.t0=Date.now()-last; }   // 重设 t0：游玩时长排除「关掉游戏的间隔」（不影响重放，时间戳仅供分析）
    selection=[]; dragging=false; busy=false;
    syncPositions(true); hideOverlay(); logClear();
    log(tr('继续上次的探险…','Continuing your last run…'));
    updateHUD();
    if(pendingLevels) showLevelUp();
    return true;
  }catch(e){ return false; }
}
function getBest(){ try{ return JSON.parse(localStorage.getItem(BEST_KEY)||'null'); }catch(e){ return null; } }
function saveBest(){
  try{ const b=getBest()||{level:0,gold:0};
    if(player.level>b.level || (player.level===b.level && player.gold>b.gold))
      localStorage.setItem(BEST_KEY, JSON.stringify({level:player.level,gold:player.gold}));
  }catch(e){}
}
