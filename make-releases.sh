#!/usr/bin/env bash
# 为 CHANGELOG 里的每个版本补打 GitHub tag + release（已存在的跳过）。
# tag 指向该版本对应的提交；发布说明取自 CHANGELOG 对应段落。
set -e
cd "$(dirname "$0")"

# 确保所有目标提交都已在远端
git push >/dev/null 2>&1 || true

# 从 CHANGELOG 提取版本号列表（## [vX.Y.Z] ...）
VERSIONS=$(grep -oE '^## \[v[0-9][0-9.]*\]' CHANGELOG.md | sed -E 's/^## \[(v[0-9.]+)\]$/\1/')

for V in $VERSIONS; do
  ESC=$(printf '%s' "$V" | sed 's/\./\\./g')
  # 该版本的提交：提交标题以 "vX.Y.Z" 开头，用 [: 空格 行尾] 作边界，避免 v1.1 误匹配 v1.10
  COMMIT=$(git log --format='%H %s' | grep -E "^[0-9a-f]+ ${ESC}([: ]|$)" | head -1 | cut -d' ' -f1)
  if [ -z "$COMMIT" ]; then echo "⚠️  $V 找不到对应提交，跳过"; continue; fi

  if gh release view "$V" >/dev/null 2>&1; then
    echo "↩︎  $V release 已存在，跳过"
    continue
  fi

  # 取 CHANGELOG 该版本段落作为发布说明
  awk -v hdr="## [$V]" '
    index($0,hdr)==1 {grab=1; print; next}
    /^## \[v/ {if(grab){exit}}
    grab {print}
  ' CHANGELOG.md > /tmp/dr_rel_notes.txt
  [ -s /tmp/dr_rel_notes.txt ] || echo "$V" > /tmp/dr_rel_notes.txt

  gh release create "$V" --target "$COMMIT" --title "$V" --notes-file /tmp/dr_rel_notes.txt
  echo "✓  $V → ${COMMIT:0:8}"
done

echo "✅ 完成。查看：gh release list  或 https://github.com/lcgogo/dungeon-raid/releases"
