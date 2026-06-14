#!/usr/bin/env bash
# 一键发版：同步 dev→正式版、提交、推送、部署 Pages。
# 提交说明从 /tmp/dr_commit_msg.txt 读取（发版前先写好它）。
set -e
cd "$(dirname "$0")"

[ -f /tmp/dr_commit_msg.txt ] || { echo "缺少 /tmp/dr_commit_msg.txt（提交说明）"; exit 1; }

# 1) 同步 dev → 正式版（两文件仅 const DEV 一行不同）
cp dungeon-raid-dev.html dungeon-raid.html
perl -CSD -i -pe 's/^const DEV=true;.*/const DEV=false;   \/\/ 正式版（DEV=false）；开发版在 dungeon-raid-dev.html（DEV=true）/' dungeon-raid.html
echo "两文件差异（应仅 DEV 一行）："
diff dungeon-raid.html dungeon-raid-dev.html || true

# 2) 提交 + 推送
git add -A
git commit -F /tmp/dr_commit_msg.txt
git push

# 3) 部署 Pages（正式版 + 开发版同一项目，按域名分发）
bash deploy-pages.sh

echo "✅ 发版完成。"
