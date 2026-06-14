#!/usr/bin/env bash
# 把游戏部署到 Cloudflare Pages（项目 dungeon-raid）。
# 关键：从一个【只含网页文件】的干净目录 public/ 部署，绝不打包仓库根目录里的 SSH 私钥等。
set -e
cd "$(dirname "$0")"

rm -rf public
mkdir -p public/functions
cp dungeon-raid.html dungeon-raid-dev.html index.html public/
cp pages/functions/_middleware.js public/functions/

echo "public/ 内容（应只有网页文件，无私钥）："
ls -R public

npx --yes wrangler pages deploy public --project-name=dungeon-raid --branch=main --commit-dirty=true
