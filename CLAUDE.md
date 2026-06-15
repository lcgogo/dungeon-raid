# CLAUDE.md — 项目约定（每次 session 自动读取）

《地牢突袭 · Dungeon Raid》单文件 HTML 游戏 + Cloudflare Worker 后端。给 Claude 的固定约定如下。

## UI：一屏原则（重要）
- **每个 overlay 卡片页面的内容高度不要超过 iPhone 15 Safari 一屏（约 650–700px 可视高），宁可更短。** 用户在手机上玩，超一屏要滚动、体验差。
- 做法：文案从简（长背景/致敬只留 2–3 行）；次级按钮单行（去掉副标题）；能拆两步就拆（开始页：落地 → START → 选种族）。新增/改动任何弹层都按此自检。

## 版本与构建
- 版本号 `v主.次.修`：小改/修 bug/调参 → 修；新 Boss/职业/机制 → 次；大重构 → 主（大版本先问用户）。页面 `const VERSION` 与 CHANGELOG 同步。
- **两个 HTML，仅 `const DEV` 一行不同**：开发版 `dungeon-raid-dev.html`（DEV=true），正式版 `dungeon-raid.html`（DEV=false）。
- **所有脚本合到 `dr.sh`，用子命令控制**：`bash dr.sh <命令>`——`test`（跑全部测试）/`deploy`（部署当前文件，dev 站更新、正式版不变 = 单独发 dev）/`release`（晋级正式版）/`gh-release [vX.Y.Z]`/`backfill-releases`/`bind-domains`。`bash dr.sh help` 看说明。
- **默认只改开发版**；正式版晋级需用户明确指示，用 `bash dr.sh release`（同步 dev→prod + 提交 + push + 部署 Pages + **创建/更新 GitHub Release**，提交说明读 `/tmp/dr_commit_msg.txt`）。
- **发正式版要二次确认**：所有改动先进 dev（可 commit）→ **跑回测、呈回测报告** → **等用户明确确认**后才 `bash dr.sh release`。不要改完就自动推 prod。想让用户先在 dev 站实测，可单独 `bash dr.sh deploy`（不动正式版）。
- **每次发版都更新 GitHub Release**：`dr.sh release` 末尾自动按正式版 `const VERSION` 打 tag、notes 取 CHANGELOG 对应版本节（幂等）。回填历史版本：`bash dr.sh gh-release vX.Y.Z`。
- 固定顺序：**写完 CHANGELOG 新版本节后，紧接着更新 README（中英两侧）**，再一起提交——别只写 changelog 漏掉 readme。提交免确认、用多段 `-m`。

## 测试（改完跑）
- `bash dr.sh test` — 一把跑全部（finale/milestone/save/stick）。单独跑见 `test/`：
  - `node test/finaletest.js` — 终局/破关烟测（也验证脚本能解析）。
  - `node test/milestonetest.js` — 50/100/200/350 转职链 + 跨界技能 + 重放一致。
  - `node test/savetest.js` — 存档版本兼容（DEV/正式版）。
- `node playtest.js [--report]` — 无头平衡机器人（读**正式版** html；`--dev` 读开发版）。

## 关键不变量
- **录像确定性重放 = 防作弊根基**：任何新录制的玩家动作都要接进 `dispatchReplayAct`；新动作不能破坏“同种子 + 同操作序列 → 同结局”。榜单按 `rec.ver`（开局版本）分桶，verify.js 用对应引擎重放。
- 正式版存档跨版本不兼容（从头开始）；dev 存档不受版本限制。
- 后端 schema 变更走 D1 迁移框架：`worker/migrations/` + `wrangler d1 migrations apply ... --remote`，勿手敲 SQL。

## 后端
- Worker：`worker/src/index.js`，`wrangler deploy`。排行榜只展示 `verified=1`；`agent`(human/ai) 分人类榜/AI 榜。
- 每小时 GitHub Actions（`.github/workflows/verify.yml`）跑 verify.js 重放校验；密钥 `VERIFY_SECRET` 需在 Cloudflare 与 GitHub repo 两侧一致。
