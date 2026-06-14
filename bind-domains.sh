#!/usr/bin/env bash
# 把自定义域名绑定到 Cloudflare Pages 项目 dungeon-raid。
#   dungeonraid.win      → 正式版
#   dev.dungeonraid.win  → 开发版（由 Pages 中间件按域名分发）
# 用 wrangler 登录态里的 OAuth token 调 Cloudflare API（pages:write 范围足够；DNS+证书自动配）。
set -e
ACCT=5f2bcd334702a2c76245d5832c0cf767
PROJ=dungeon-raid
cfg=$(ls ~/Library/Preferences/.wrangler/config/default.toml ~/.config/.wrangler/config/default.toml 2>/dev/null | head -1)
TOKEN=$(grep -E '^oauth_token' "$cfg" | sed -E 's/.*"(.*)".*/\1/')
[ -z "$TOKEN" ] && { echo "找不到 wrangler oauth_token，先 npx wrangler login"; exit 1; }

for D in dungeonraid.win dev.dungeonraid.win; do
  echo "绑定 $D ..."
  curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCT/pages/projects/$PROJ/domains" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"$D\"}" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.success?("  ✓ 已绑定 "+(j.result&&j.result.name)):("  ✗ "+JSON.stringify(j.errors)));}catch(e){console.log("  解析失败:",s.slice(0,200));}})'
done
echo "完成。证书签发可能要一两分钟。"
