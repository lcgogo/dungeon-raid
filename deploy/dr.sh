#!/usr/bin/env bash
# 地牢突袭 · 一站式脚本。用法：bash dr.sh <命令> [参数]
#
#   test                跑全部烟测/回归（test/*.js）
#   deploy              部署当前文件到 Cloudflare Pages（dev 站更新、正式版按当前 dungeon-raid.html 不变）= 单独发 dev
#   release             晋级正式版：先过版本闸门，再同步 dev→prod + 提交 + push + 部署 + GitHub Release（提交说明读 /tmp/dr_commit_msg.txt）
#   gh-release [vX.Y.Z] 创建/更新 GitHub Release（默认读正式版 const VERSION；可指定版本回填）
#   integrity           核对正式版引擎 sha256 是否与 engines.json 登记一致（完整性校验）
#   check-version [from to impact]  校验版本闸门（默认读正式版→开发版；impact=patch|verify）
#   embed-changelog     把 CHANGELOG.md 摘要注入页面 CHANGELOG_LINES（deploy/release 自动调用）
#   classify <id> <ai|human>  把某条成绩在 人类榜↔AI榜 之间改判（需 ADMIN_SECRET 环境变量）
#   delete <id>         删除某条成绩（需 ADMIN_SECRET）
#   prune [天数=30] [保留版本数=5]  手动清理旧版本+陈旧录像（worker 也每日自动跑；需 ADMIN_SECRET）
#   wipe                清空整个榜单（删 scores 全表，需 ADMIN_SECRET；危险）
#   seed-debug          申请一枚调试种子（需 DEBUG_SEED_SECRET；可绕过上传门槛）
#   backfill-releases   为 CHANGELOG 里每个版本补打 tag+release（已存在的跳过）
#   bind-domains        把自定义域名绑定到 Pages 项目
#   help                显示本说明
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

PROJ=dungeon-raid
ACCT=5f2bcd334702a2c76245d5832c0cf767

# sha256（macOS shasum / Linux sha256sum 兼容）
sha256_of(){ if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1"|cut -d' ' -f1; else shasum -a 256 "$1"|cut -d' ' -f1; fi; }
ver_of(){ grep -oE "const VERSION='v[0-9.]+'" "$1"|grep -oE 'v[0-9.]+'; }

# ---------- 版本闸门：verify/replay 影响改动必须升次版本 ----------
cmd_check_version(){
  node version-gate.js "$@"
}

# ---------- 完整性：核对正式版文件的 sha256 是否与 engines.json 登记的一致 ----------
cmd_integrity(){
  local ver hash want
  ver=$(ver_of dungeon-raid.html); hash=$(sha256_of dungeon-raid.html)
  want=$(node -e "try{console.log((JSON.parse(require('fs').readFileSync('engines.json','utf8'))['$ver'])||'')}catch(e){console.log('')}")
  echo "正式版 $ver"
  echo "  实际 sha256: $hash"
  echo "  登记 sha256: ${want:-（engines.json 无此版本）}"
  if [ -z "$want" ]; then echo "  ⚠️ 未登记（新版本？发版时会自动写入）"; return 0; fi
  if [ "$hash" = "$want" ]; then echo "  ✅ 一致，文件未被改动"; else echo "  ❌ 不一致！文件与登记版本不符"; return 1; fi
}

# ---------- 黑盒改判：把某条成绩在 人类榜↔AI榜 之间挪（需环境变量 ADMIN_SECRET）----------
cmd_classify(){
  local id="$1" agent="$2"
  [ -n "$id" ] && { [ "$agent" = ai ] || [ "$agent" = human ]; } || { echo "用法: ADMIN_SECRET=… bash deploy/dr.sh classify <id> <ai|human>"; return 1; }
  [ -n "$ADMIN_SECRET" ] || { echo "缺少环境变量 ADMIN_SECRET"; return 1; }
  curl -s -X POST "https://api.dungeonraid.win/classify?k=$ADMIN_SECRET" \
    -H 'Content-Type: application/json' -d "{\"id\":\"$id\",\"agent\":\"$agent\"}"; echo
}

# ---------- 删除单条成绩（需 ADMIN_SECRET）----------
cmd_delete(){
  local id="$1"
  [ -n "$id" ] || { echo "用法: ADMIN_SECRET=… bash dr.sh delete <id>"; return 1; }
  [ -n "$ADMIN_SECRET" ] || { echo "缺少环境变量 ADMIN_SECRET"; return 1; }
  curl -s -X POST "https://api.dungeonraid.win/admin?k=$ADMIN_SECRET" \
    -H 'Content-Type: application/json' -d "{\"op\":\"del\",\"id\":\"$id\"}"; echo
}

# ---------- 手动清理旧版本+陈旧录像（需 ADMIN_SECRET）。用法: prune [天数=30] [保留版本数=5] ----------
cmd_prune(){
  [ -n "$ADMIN_SECRET" ] || { echo "缺少环境变量 ADMIN_SECRET"; return 1; }
  local days="${1:-30}" keep="${2:-5}"
  curl -s -X POST "https://api.dungeonraid.win/admin?k=$ADMIN_SECRET" \
    -H 'Content-Type: application/json' -d "{\"op\":\"prune\",\"days\":$days,\"keep\":$keep}"; echo
}

# ---------- 清空整个榜单（删 scores 全表，需 ADMIN_SECRET；危险）----------
cmd_wipe(){
  [ -n "$ADMIN_SECRET" ] || { echo "缺少环境变量 ADMIN_SECRET"; return 1; }
  printf "⚠️  将删除 scores 表【全部】成绩（人类榜+AI榜+破关榜，不可恢复）。输入 YES 确认: "
  read -r ans; [ "$ans" = YES ] || { echo "已取消"; return 1; }
  curl -s -X POST "https://api.dungeonraid.win/admin?k=$ADMIN_SECRET" \
    -H 'Content-Type: application/json' -d '{"op":"wipe","confirm":"YES"}'; echo
}

# ---------- 申请调试 seed（需 DEBUG_SEED_SECRET；带 debug_bypass）----------
cmd_seed_debug(){
  [ -n "$DEBUG_SEED_SECRET" ] || { echo "缺少环境变量 DEBUG_SEED_SECRET"; return 1; }
  curl -s -X POST "https://api.dungeonraid.win/seed-debug?k=$DEBUG_SEED_SECRET" \
    -H 'Content-Type: application/json'; echo
}

# ---------- 跑测试 ----------
cmd_test(){
  local fail=0
  for t in finaletest milestonetest savetest sticktest fxpointtest; do
    printf "%-14s " "$t"
    if node "test/$t.js" >/dev/null 2>&1; then echo PASS; else echo FAIL; fail=1; fi
  done
  printf "%-14s " "thresholdtest"
  if node "test/worker/threshold-top10-smoketest.js" >/dev/null 2>&1; then echo PASS; else echo FAIL; fail=1; fi
  return $fail
}

# ---------- 把 CHANGELOG.md 的紧凑摘要行注入页面 const CHANGELOG_LINES（嵌入，点版本号即看，无需联网） ----------
cmd_embed_changelog(){
  local files=("$@"); [ ${#files[@]} -eq 0 ] && files=(dungeon-raid-dev.html)
  python3 - "${files[@]}" <<'PY'
import re, json, sys, os
# 新格式：每个版本节取前两条 bullet（默认中文 + English）。旧 [vX]: 一行格式则 zh/en 同文兜底。
entries=[]; cur=None; bullets=[]
for l in open('CHANGELOG.md', encoding='utf-8'):
    h=re.match(r'^##\s*\[(v[\d.]+)\]', l)
    if h:
        if cur and bullets:
            zh=bullets[0].replace('**','')
            en=bullets[1].replace('**','') if len(bullets)>1 else zh
            entries.append({'ver': cur, 'zh': zh, 'en': en})
        cur=h.group(1); bullets=[]; continue
    ref=re.match(r'^\[(v[\d.]+)\]:\s*(.+?)\s*$', l)
    if ref:
        entries.append({'ver': ref.group(1), 'zh': ref.group(2), 'en': ref.group(2)})
        cur=None; bullets=[]; continue
    if cur:
        b=re.match(r'^\s*-\s+(.+?)\s*$', l)
        if b and len(bullets) < 2: bullets.append(b.group(1))
if cur and bullets:
    zh=bullets[0].replace('**','')
    en=bullets[1].replace('**','') if len(bullets)>1 else zh
    entries.append({'ver': cur, 'zh': zh, 'en': en})
entries=entries[:5]
arr='const CHANGELOG_LINES='+json.dumps(entries, ensure_ascii=False)+';   /* auto-injected by dr.sh embed-changelog（勿手改） */'
n=0
for f in sys.argv[1:]:
    if not os.path.exists(f): continue
    s=open(f, encoding='utf-8').read()
    s2=re.sub(r'^const CHANGELOG_LINES=.*$', lambda m: arr, s, count=1, flags=re.M)
    if s2!=s: open(f,'w',encoding='utf-8').write(s2); n+=1
print(f"📝 注入 {len(entries)} 条双语更新摘要 → {n} 个文件")
PY
}

# ---------- 部署 Pages（从干净 public/ 部署，绝不打包仓库根目录里的 SSH 私钥等） ----------
cmd_deploy(){
  cmd_embed_changelog dungeon-raid-dev.html   # dev 站更新前先注入最新更新日志（只动 dev）
  rm -rf public
  mkdir -p public/functions
  local prodVer devVer
  prodVer=$(ver_of dungeon-raid.html)
  devVer=$(ver_of dungeon-raid-dev.html)
  python3 - "$prodVer" "$devVer" <<'PY'
import pathlib, re, sys
prod, dev = sys.argv[1], sys.argv[2]
text = pathlib.Path('index.html').read_text(encoding='utf-8')
text = re.sub(r'<small>Play · Release<span id="prodVer"></span></small>', f'<small>Play · Release · {prod}</small>', text, count=1)
text = re.sub(r'<a class="dev" href="\./dungeon-raid-dev\.html">🚧 开发版 DEV · 最新 / 独立存档<span id="devVer"></span></a>', f'<a class="dev" href="./dungeon-raid-dev.html">🚧 开发版 DEV · 最新 / 独立存档 · {dev}</a>', text, count=1)
if 'fetch(\'versions.json\'' in text or 'id="prodVer"' in text or 'id="devVer"' in text:
    raise SystemExit('homepage version injection failed')
pathlib.Path('public').mkdir(exist_ok=True)
pathlib.Path('public/index.html').write_text(text, encoding='utf-8')
PY
  cp dungeon-raid.html dungeon-raid-dev.html apple-touch-icon.png icon-192.png icon-512.png manifest.webmanifest public/
  cp deploy/pages/functions/_middleware.js public/functions/
  echo "public/ 内容（应只有网页文件，无私钥）："; ls -R public
  npx --yes wrangler pages project create "$PROJ" --production-branch=main 2>/dev/null || true
  npx --yes wrangler pages deploy public --project-name="$PROJ" --branch=main --commit-dirty=true
}

# ---------- 创建/更新 GitHub Release ----------
cmd_gh_release(){
  local VER="${1:-$(grep -oE "const VERSION='v[0-9]+\.[0-9]+\.[0-9]+'" dungeon-raid.html | head -1 | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+')}"
  [ -n "$VER" ] || { echo "⚠️ 无法解析版本号，跳过 GitHub Release"; return 0; }
  local NOTES="/tmp/dr_relnotes_${VER}.md"
  awk -v v="[$VER]" '
    /^## / { if (insec) exit; if (index($0, v)) { insec=1; next } }
    insec { print }
  ' CHANGELOG.md > "$NOTES"
  [ -s "$NOTES" ] || echo "$VER" > "$NOTES"
  if gh release view "$VER" >/dev/null 2>&1; then
    gh release edit "$VER" --title "$VER" --notes-file "$NOTES"; echo "🔖 GitHub Release $VER 已更新"
  else
    gh release create "$VER" --title "$VER" --notes-file "$NOTES" --target main; echo "🔖 GitHub Release $VER 已创建"
  fi
}

# ---------- 晋级正式版 ----------
cmd_release(){
  [ -f /tmp/dr_commit_msg.txt ] || { echo "缺少 /tmp/dr_commit_msg.txt（提交说明）"; exit 1; }
  cmd_check_version
  # 0) 把最新 CHANGELOG 摘要注入 dev（随后同步给正式版）
  cmd_embed_changelog dungeon-raid-dev.html
  # 1) 同步 dev → 正式版（两文件仅 const DEV 一行不同）
  cp dungeon-raid-dev.html dungeon-raid.html
  perl -i -pe 's/^const DEV=true;.*/const DEV=false;   \/\/ release build (DEV=false); dev build is dungeon-raid-dev.html (DEV=true)/' dungeon-raid.html
  echo "两文件差异（应仅 DEV 一行）："; diff dungeon-raid.html dungeon-raid-dev.html || true
  # 2) 登记正式版引擎 sha256（版本号当人类标签，哈希用于完整性校验）
  local ver hash; ver=$(ver_of dungeon-raid.html); hash=$(sha256_of dungeon-raid.html)
  mkdir -p engines
  cp dungeon-raid.html "engines/$ver.html"
  node -e "const fs=require('fs');const f='engines.json';const m=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{};m['$ver']='$hash';fs.writeFileSync(f,JSON.stringify(m,null,2)+'\n');"
  echo "🔏 engines.json 登记 $ver → $hash（快照: engines/$ver.html）"
  # 3) 提交 + 推送
  git add -A; git commit -F /tmp/dr_commit_msg.txt; git push
  # 3) 部署 Pages
  cmd_deploy
  # 4) GitHub Release
  cmd_gh_release
  echo "✅ 发版完成。"
}

# ---------- 回填所有 CHANGELOG 版本的 release ----------
cmd_backfill_releases(){
  git push >/dev/null 2>&1 || true
  local VERSIONS; VERSIONS=$(grep -oE '^## \[v[0-9][0-9.]*\]' CHANGELOG.md | sed -E 's/^## \[(v[0-9.]+)\]$/\1/')
  for V in $VERSIONS; do
    local ESC; ESC=$(printf '%s' "$V" | sed 's/\./\\./g')
    local COMMIT; COMMIT=$(git log --format='%H %s' | grep -E "^[0-9a-f]+ ${ESC}([: ]|$)" | head -1 | cut -d' ' -f1)
    if [ -z "$COMMIT" ]; then echo "⚠️  $V 找不到对应提交，跳过"; continue; fi
    if gh release view "$V" >/dev/null 2>&1; then echo "↩︎  $V 已存在，跳过"; continue; fi
    awk -v hdr="## [$V]" 'index($0,hdr)==1 {grab=1;print;next} /^## \[v/ {if(grab)exit} grab{print}' CHANGELOG.md > /tmp/dr_rel_notes.txt
    [ -s /tmp/dr_rel_notes.txt ] || echo "$V" > /tmp/dr_rel_notes.txt
    gh release create "$V" --target "$COMMIT" --title "$V" --notes-file /tmp/dr_rel_notes.txt
    echo "✓  $V → ${COMMIT:0:8}"
  done
  echo "✅ 完成。"
}

# ---------- 绑定自定义域名 ----------
cmd_bind_domains(){
  local cfg; cfg=$(ls ~/Library/Preferences/.wrangler/config/default.toml ~/.config/.wrangler/config/default.toml 2>/dev/null | head -1)
  local TOKEN; TOKEN=$(grep -E '^oauth_token' "$cfg" | sed -E 's/.*"(.*)".*/\1/')
  [ -z "$TOKEN" ] && { echo "找不到 wrangler oauth_token，先 npx wrangler login"; exit 1; }
  for D in dungeonraid.win dev.dungeonraid.win; do
    echo "绑定 $D ..."
    curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCT/pages/projects/$PROJ/domains" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"$D\"}" \
      | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.success?("  ✓ 已绑定 "+(j.result&&j.result.name)):("  ✗ "+JSON.stringify(j.errors)));}catch(e){console.log("  解析失败:",s.slice(0,200));}})'
  done
  echo "完成。证书签发可能要一两分钟。"
}

case "${1:-help}" in
  test)              cmd_test ;;
  deploy)            cmd_deploy ;;
  release)           cmd_release ;;
  gh-release)        cmd_gh_release "$2" ;;
  integrity)         cmd_integrity ;;
  check-version)     shift; cmd_check_version "$@" ;;
  embed-changelog)   shift; cmd_embed_changelog "$@" ;;
  classify)          cmd_classify "$2" "$3" ;;
  delete)            cmd_delete "$2" ;;
  prune)             cmd_prune "$2" "$3" ;;
  wipe)              cmd_wipe ;;
  seed-debug)        cmd_seed_debug ;;
  backfill-releases) cmd_backfill_releases ;;
  bind-domains)      cmd_bind_domains ;;
  help|--help|-h|*)  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//' ;;
esac
