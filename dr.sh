#!/usr/bin/env bash
# 地牢突袭 · 一站式脚本。用法：bash dr.sh <命令> [参数]
#
#   test                跑全部烟测/回归（test/*.js）
#   deploy              部署当前文件到 Cloudflare Pages（dev 站更新、正式版按当前 dungeon-raid.html 不变）= 单独发 dev
#   release             晋级正式版：同步 dev→prod + 提交 + push + 部署 + GitHub Release（提交说明读 /tmp/dr_commit_msg.txt）
#   gh-release [vX.Y.Z] 创建/更新 GitHub Release（默认读正式版 const VERSION；可指定版本回填）
#   integrity           核对正式版引擎 sha256 是否与 engines.json 登记一致（完整性校验）
#   backfill-releases   为 CHANGELOG 里每个版本补打 tag+release（已存在的跳过）
#   bind-domains        把自定义域名绑定到 Pages 项目
#   help                显示本说明
set -e
cd "$(dirname "$0")"

PROJ=dungeon-raid
ACCT=5f2bcd334702a2c76245d5832c0cf767

# sha256（macOS shasum / Linux sha256sum 兼容）
sha256_of(){ if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1"|cut -d' ' -f1; else shasum -a 256 "$1"|cut -d' ' -f1; fi; }
ver_of(){ grep -oE "const VERSION='v[0-9.]+'" "$1"|grep -oE 'v[0-9.]+'; }

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

# ---------- 跑测试 ----------
cmd_test(){
  local fail=0
  for t in finaletest milestonetest savetest sticktest; do
    printf "%-14s " "$t"
    if node "test/$t.js" >/dev/null 2>&1; then echo PASS; else echo FAIL; fail=1; fi
  done
  return $fail
}

# ---------- 部署 Pages（从干净 public/ 部署，绝不打包仓库根目录里的 SSH 私钥等） ----------
cmd_deploy(){
  rm -rf public
  mkdir -p public/functions
  cp dungeon-raid.html dungeon-raid-dev.html index.html public/
  cp pages/functions/_middleware.js public/functions/
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
  # 1) 同步 dev → 正式版（两文件仅 const DEV 一行不同）
  cp dungeon-raid-dev.html dungeon-raid.html
  perl -i -pe 's/^const DEV=true;.*/const DEV=false;   \/\/ release build (DEV=false); dev build is dungeon-raid-dev.html (DEV=true)/' dungeon-raid.html
  echo "两文件差异（应仅 DEV 一行）："; diff dungeon-raid.html dungeon-raid-dev.html || true
  # 2) 登记正式版引擎 sha256（版本号当人类标签，哈希用于完整性校验）
  local ver hash; ver=$(ver_of dungeon-raid.html); hash=$(sha256_of dungeon-raid.html)
  node -e "const fs=require('fs');const f='engines.json';const m=fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):{};m['$ver']='$hash';fs.writeFileSync(f,JSON.stringify(m,null,2)+'\n');"
  echo "🔏 engines.json 登记 $ver → $hash"
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
  backfill-releases) cmd_backfill_releases ;;
  bind-domains)      cmd_bind_domains ;;
  help|--help|-h|*)  sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//' ;;
esac
