// ==================== 公开反馈板 ====================
let feedbackCategory='suggestion';
function feedbackText(v){ return String(v||'').replace(/[<>]/g, ch=>ch==='<'?'&lt;':'&gt;'); }
function showFeedback(){ busy=true; renderFeedback(); }
async function renderFeedback(){
  const card=document.getElementById('card');
  card.innerHTML=`<h2 style="color:var(--gold)">💬 ${tr('反馈板','Feedback')}</h2>
    <div id="feedbackList" style="text-align:left;min-height:80px;max-height:42vh;overflow:auto;background:var(--panel2);border-radius:10px;padding:6px 7px;margin-bottom:9px">${tr('加载中…','Loading…')}</div>
    <div style="display:flex;gap:6px;margin-bottom:6px">
      <input id="feedbackName" maxlength="24" placeholder="${tr('昵称（可选）','Nickname (optional)')}" style="flex:1;min-width:0;background:var(--panel2);border:1px solid #4a3a63;color:var(--txt);border-radius:8px;padding:8px;font-size:12px">
      <select id="feedbackCategory" style="width:92px;background:var(--panel2);border:1px solid #4a3a63;color:var(--txt);border-radius:8px;padding:8px;font-size:12px"><option value="suggestion">${tr('建议','Idea')}</option><option value="bug">${tr('Bug','Bug')}</option><option value="balance">${tr('平衡','Balance')}</option><option value="copy">${tr('文案','Copy')}</option></select>
    </div>
    <textarea id="feedbackBody" maxlength="1000" placeholder="${tr('写下你的想法…','Write your feedback…')}" style="box-sizing:border-box;width:100%;height:72px;resize:vertical;background:var(--panel2);border:1px solid #4a3a63;color:var(--txt);border-radius:8px;padding:8px;font-size:12px;margin-bottom:6px"></textarea>
    <div style="display:flex;gap:6px"><button class="btn" id="feedbackSend" style="flex:1">${tr('发布留言','Post')}</button><button class="btn" id="feedbackBack" style="flex:1">${tr('返回','Back')}</button></div>`;
  document.getElementById('feedbackBack').onclick=showClassSelect;
  document.getElementById('feedbackSend').onclick=submitFeedback;
  loadFeedback(); showOverlay();
}
async function loadFeedback(){
  const list=document.getElementById('feedbackList'); if(!list) return;
  try{ const r=await fetch(REC_API+'/feedback?limit=30'); const j=await r.json(); const rows=j.feedback||[];
    list.innerHTML=rows.length?rows.map(x=>`<article style="padding:7px 4px;border-bottom:1px solid #3a2d4d"><div style="display:flex;justify-content:space-between;color:var(--gold);font-size:11px"><b>${feedbackText(x.nickname||tr('匿名','Anonymous'))}</b><span>${feedbackText(x.category)} · ${new Date(x.created*1000).toLocaleDateString()}</span></div><div style="white-space:pre-wrap;word-break:break-word;margin-top:4px;font-size:12px;line-height:1.45">${feedbackText(x.body)}</div><small style="color:var(--dim)">${feedbackText(x.version)}</small></article>`).join(''):`<div style="text-align:center;color:var(--dim);padding:20px">${tr('还没有留言','No feedback yet')}</div>`;
  }catch(e){ list.innerHTML=`<div style="text-align:center;color:var(--dim);padding:20px">${tr('反馈板暂时不可用','Feedback board unavailable')}</div>`; }
}
async function submitFeedback(){
  const body=document.getElementById('feedbackBody').value.trim(), btn=document.getElementById('feedbackSend');
  if(!body){ toast(tr('请先写点内容','Please write something first')); return; }
  btn.disabled=true;
  try{ const r=await fetch(REC_API+'/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:document.getElementById('feedbackName').value,category:document.getElementById('feedbackCategory').value,body,version:VERSION})}); if(!r.ok) throw new Error(); document.getElementById('feedbackBody').value=''; toast(tr('留言已发布','Feedback posted')); await loadFeedback(); }
  catch(e){ toast(tr('发布失败，请稍后再试','Post failed, please try again')); }
  finally{ btn.disabled=false; }
}
