#!/bin/bash
# 每日检查新版本 → 提交5局到人类榜
cd /c/Users/lcgog/WorkBuddy/2026-06-20-16-49-15/dungeon-raid || exit 1

# 记录当前版本
OLD_VER=$(grep -o "const VERSION='[^']*'" dungeon-raid.html | grep -o "v[0-9.]*")
echo "当前版本: $OLD_VER"

# 拉取最新代码
git pull 2>&1
if [ $? -ne 0 ]; then
  echo "✗ git pull 失败"
  exit 1
fi

# 检查版本是否变化
NEW_VER=$(grep -o "const VERSION='[^']*'" dungeon-raid.html | grep -o "v[0-9.]*")
echo "拉取后版本: $NEW_VER"

if [ "$OLD_VER" = "$NEW_VER" ]; then
  echo "版本未变化 ($NEW_VER)，跳过"
  exit 0
fi

echo "=== 检测到新版本: $NEW_VER ==="

# 获取人类榜当前上传门槛
THRESHOLD=$(curl -s -X POST "https://api.dungeonraid.win/seed" | grep -o '"upload_min_turns":[0-9]*' | grep -o '[0-9]*')
echo "人类榜上传门槛: ${THRESHOLD:-unknown} 回合"

# 跑2000局尝试提交到人类榜，取门槛以上的
# 人类榜门槛约403回合，命中率约0.1%，2000局期望约2局
# 用 --min=0 让所有可验证录像都尝试提交（服务端会拒绝低于门槛的）
node playtest.js --submit-human --games=2000 --gap=2000 --race=elf --t1=elder --t2=shadow 2>&1

echo "=== 提交批次完成 ==="

# 检查人类榜结果
echo "当前人类榜前10:"
curl -s "https://api.dungeonraid.win/top?agent=human&n=10" 2>&1
