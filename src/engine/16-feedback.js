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
    list.innerHTML=rows.length?rows.map(x=>`<article class="feedbackRow" data-feedback-id="${feedbackText(x.id)}" style="padding:7px 4px;border-bottom:1px solid #3a2d4d;cursor:pointer"><div style="display:flex;justify-content:space-between;color:var(--gold);font-size:11px"><b>${feedbackText(x.nickname||tr('匿名','Anonymous'))}</b><span>${feedbackText(x.category)} · ${new Date(x.created*1000).toLocaleDateString()}</span></div><div style="white-space:pre-wrap;word-break:break-word;margin-top:4px;font-size:12px;line-height:1.45">${feedbackText(x.body)}</div><small style="color:var(--dim)">${feedbackText(x.version)} · ${x.reply_count||0} ${tr('条回复','replies')} · ${tr('点开回复','open to reply')}</small></article>`).join(''):`<div style="text-align:center;color:var(--dim);padding:20px">${tr('还没有留言','No feedback yet')}</div>`;
    list.querySelectorAll('.feedbackRow').forEach(row=>row.onclick=()=>showFeedbackDetail(row.dataset.feedbackId));
  }catch(e){ list.innerHTML=`<div style="text-align:center;color:var(--dim);padding:20px">${tr('反馈板暂时不可用','Feedback board unavailable')}</div>`; }
}
async function showFeedbackDetail(id){
  busy=true;
  const card=document.getElementById('card');
  card.innerHTML=`<h2 style="color:var(--gold)">💬 ${tr('留言详情','Feedback')}</h2><div id="feedbackDetail" style="text-align:left;max-height:45vh;overflow:auto;background:var(--panel2);border-radius:8px;padding:8px;margin-bottom:8px">${tr('加载中…','Loading…')}</div><input id="replyName" maxlength="24" placeholder="${tr('昵称（可选）','Nickname (optional)')}" style="box-sizing:border-box;width:100%;background:var(--panel2);border:1px solid #4a3a63;color:var(--txt);border-radius:8px;padding:8px;font-size:12px;margin-bottom:6px"><textarea id="replyBody" maxlength="1000" placeholder="${tr('写下回复…','Write a reply…')}" style="box-sizing:border-box;width:100%;height:68px;resize:vertical;background:var(--panel2);border:1px solid #4a3a63;color:var(--txt);border-radius:8px;padding:8px;font-size:12px;margin-bottom:6px"></textarea><div style="display:flex;gap:6px"><button class="btn" id="replySend" style="flex:1">${tr('回复','Reply')}</button><button class="btn" id="replyBack" style="flex:1">${tr('返回','Back')}</button></div>`;
  document.getElementById('replyBack').onclick=()=>{ busy=false; renderFeedback(); };
  document.getElementById('replySend').onclick=()=>submitFeedbackReply(id);
  showOverlay();
  try{
    const r=await fetch(REC_API+'/feedback/'+encodeURIComponent(id)); const j=await r.json(); if(!r.ok) throw new Error();
    const f=j.feedback, replies=j.replies||[];
    document.getElementById('feedbackDetail').innerHTML=`<article style="padding-bottom:8px;border-bottom:1px solid #4a3d63"><b style="color:var(--gold)">${feedbackText(f.nickname||tr('匿名','Anonymous'))}</b><small style="color:var(--dim);margin-left:8px">${feedbackText(f.category)} · ${new Date(f.created*1000).toLocaleDateString()}</small><div style="white-space:pre-wrap;word-break:break-word;margin-top:5px;line-height:1.5">${feedbackText(f.body)}</div></article>`+(replies.length?replies.map(x=>`<article style="padding:7px 0 3px 14px;border-bottom:1px solid #3a2d4d"><b style="color:var(--gold);font-size:12px">↳ ${feedbackText(x.nickname||tr('匿名','Anonymous'))}</b><small style="color:var(--dim);margin-left:8px">${new Date(x.created*1000).toLocaleDateString()}</small><div style="white-space:pre-wrap;word-break:break-word;margin-top:3px;line-height:1.45">${feedbackText(x.body)}</div></article>`).join(''):'<div style="color:var(--dim);padding-top:8px">'+tr('还没有回复','No replies yet')+'</div>');
  }catch(e){ document.getElementById('feedbackDetail').textContent=tr('留言加载失败','Failed to load feedback'); }
}
async function submitFeedbackReply(id){
  const body=document.getElementById('replyBody').value.trim(), btn=document.getElementById('replySend');
  if(!body){ toast(tr('请先写点回复','Please write a reply first')); return; }
  btn.disabled=true;
  try{ const r=await fetch(REC_API+'/feedback/'+encodeURIComponent(id)+'/reply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:document.getElementById('replyName').value,body,version:VERSION})}); if(!r.ok) throw new Error(); toast(tr('回复已发布','Reply posted')); await showFeedbackDetail(id); }
  catch(e){ toast(tr('回复失败，请稍后再试','Reply failed, please try again')); }
  finally{ btn.disabled=false; }
}
async function submitFeedback(){
  const body=document.getElementById('feedbackBody').value.trim(), btn=document.getElementById('feedbackSend');
  if(!body){ toast(tr('请先写点内容','Please write something first')); return; }
  btn.disabled=true;
  try{ const r=await fetch(REC_API+'/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:document.getElementById('feedbackName').value,category:document.getElementById('feedbackCategory').value,body,version:VERSION})}); if(!r.ok) throw new Error(); document.getElementById('feedbackBody').value=''; toast(tr('留言已发布','Feedback posted')); await loadFeedback(); }
  catch(e){ toast(tr('发布失败，请稍后再试','Post failed, please try again')); }
  finally{ btn.disabled=false; }
}
