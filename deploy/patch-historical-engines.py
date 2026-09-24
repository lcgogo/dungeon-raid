import pathlib

PATCH = '''<script id="drHistoricalReplayPatch">(()=>{const m=location.pathname.match(/\\/engines\\/(v[0-9.]+)\\.html/);if(!m)return;const v=m[1];const sync=()=>{const t=document.getElementById('rbTxt');if(t&&!t.textContent.includes(v))t.textContent+=' · '+v;const c=document.getElementById('card');if(c&&!document.getElementById('currentBuildLink')){const a=document.createElement('a');a.id='currentBuildLink';a.href='../index.html';a.textContent='↗ 当前版本 / Current build';a.style.cssText='display:block;text-align:center;color:#f5c451;font-size:12px;margin:6px 0;text-decoration:none';c.insertBefore(a,c.firstChild)}};setInterval(sync,500);sync()})();</script>'''

for path in pathlib.Path('public/engines').glob('v*.html'):
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    if 'drHistoricalReplayPatch' not in text:
        path.write_text(text.replace('</body>', PATCH + '</body>'), encoding='utf-8')
