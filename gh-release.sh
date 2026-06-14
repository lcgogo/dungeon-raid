#!/usr/bin/env bash
# 创建/更新 GitHub Release：按版本打 tag 并发布，release notes 取 CHANGELOG 对应版本节。
# 用法：
#   bash gh-release.sh            # 读正式版 dungeon-raid.html 的 const VERSION
#   bash gh-release.sh v1.16.0    # 指定版本（回填历史版本用）
# 由 release.sh 在 push+部署之后自动调用；幂等（已存在则更新 notes/title）。
set -e
cd "$(dirname "$0")"

VER="${1:-$(grep -oE "const VERSION='v[0-9]+\.[0-9]+\.[0-9]+'" dungeon-raid.html | head -1 | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+')}"
[ -n "$VER" ] || { echo "⚠️ 无法解析版本号，跳过 GitHub Release"; exit 0; }

# 从 CHANGELOG.md 抽出 "## [vX.Y.Z] …" 到下一个 "## " 之间的正文作为 release notes
NOTES="/tmp/dr_relnotes_${VER}.md"
awk -v v="[$VER]" '
  /^## / { if (insec) exit; if (index($0, v)) { insec=1; next } }
  insec { print }
' CHANGELOG.md > "$NOTES"
[ -s "$NOTES" ] || echo "$VER" > "$NOTES"

if gh release view "$VER" >/dev/null 2>&1; then
  gh release edit "$VER" --title "$VER" --notes-file "$NOTES"
  echo "🔖 GitHub Release $VER 已更新"
else
  gh release create "$VER" --title "$VER" --notes-file "$NOTES" --target main
  echo "🔖 GitHub Release $VER 已创建"
fi
