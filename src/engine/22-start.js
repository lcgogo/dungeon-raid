//==================== 启动 ====================
document.getElementById('langBtn').onclick=()=>setLang(lang==='en'?'zh':'en');
document.getElementById('langBtn').textContent = lang==='en'?'中文':'EN';
if(typeof window!=='undefined'){
  window.addEventListener('beforeinstallprompt', e=>{
    e.preventDefault();
    installPromptEvt=e;
  });
  window.addEventListener('appinstalled', ()=>{ installPromptEvt=null; });
}
applyStaticLang();
{ const ve=document.getElementById('ver'); if(ve) ve.onclick=showChangelog; }
resize(); showClassSelect(); loop();
})();
