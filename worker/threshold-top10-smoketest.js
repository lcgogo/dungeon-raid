'use strict';
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/src/index.js', 'utf8');
function grab(name){
  const sig = `function ${name}`;
  const start = src.indexOf(sig);
  if(start<0) throw new Error('missing '+name);
  let i = src.indexOf('{', start), depth = 0;
  for(; i < src.length; i++){
    const ch = src[i];
    if(ch === '{') depth++;
    else if(ch === '}'){ depth--; if(depth===0) return src.slice(start, i+1); }
  }
  throw new Error('unterminated '+name);
}
const code = [
  grab('passesScoreTop10Gate'),
  grab('passesClearTop10Gate'),
  grab('passesScoreUploadGate'),
  grab('passesClearUploadGate'),
  'return {passesScoreTop10Gate,passesClearTop10Gate,passesScoreUploadGate,passesClearUploadGate};'
].join('\n');
const api = new Function(code)();
let fails=0;
function ok(cond,msg){ console.log((cond?'✓':'✗')+' '+msg); if(!cond) fails++; }
const th={ upload_min_turns:120, score_top10_turns:100, score_top10_level:12, score_top10_gold:50, clear_total:10, clear_top10_level:15, clear_top10_turns:530 };
const thStrict={ upload_min_turns:600, clear_total:10, clear_top10_level:15, clear_top10_turns:530 };
ok(api.passesScoreUploadGate(th,130,10,0)===true,'score 达基础门槛放行');
ok(api.passesScoreUploadGate(th,100,12,50)===true,'score 命中种族前10边界放行');
ok(api.passesScoreUploadGate(th,100,12,49)===false,'score 同回合同等级但金币不够时拦截');
ok(api.passesClearUploadGate(thStrict,520,14)===true,'clear 低等级进入前10放行');
ok(api.passesClearUploadGate(thStrict,531,15)===false,'clear 同等级但回合更差时拦截');
ok(api.passesClearUploadGate({upload_min_turns:0},520,20)===true,'旧快照 upload_min_turns<=0 时保持放行');
console.log(fails?`\n❌ ${fails} 项未通过`:'\n✅ threshold top10 smoke 全部通过');
process.exit(fails?1:0);
