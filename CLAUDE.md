# CLAUDE.md — 项目约定（每次 session 自动读取）

> **统一规则源：先读 [`AGENTS.md`](AGENTS.md)**（多 AI 协作 + 硬约束 + 发版闸门，Claude/WorkBuddy 共用）。本文是 Claude 入口，下面是同一套约定的细化，与 AGENTS.md 冲突时以 AGENTS.md 为准。

《地牢突袭 · Dungeon Raid》单文件 HTML 游戏 + Cloudflare Worker 后端。给 Claude 的固定约定如下。

## UI：一屏原则（重要）
- **每个 overlay 卡片页面的内容高度不要超过 iPhone 15 Safari 一屏（约 650–700px 可视高），宁可更短。** 用户在手机上玩，超一屏要滚动、体验差。
- 做法：文案从简（长背景/致敬只留 2–3 行）；次级按钮单行（去掉副标题）；能拆两步就拆（开始页：落地 → START → 选种族）。新增/改动任何弹层都按此自检。

## 版本与构建
- 版本号 `v主.次.修`：**不影响 verify / replay 兼容边界**的小改/修 bug/调参/UI 文案 → 修；任何会影响 **verify / replay / 版本分桶 / release 验证语义** 的改动 → 次（包括新 Boss/职业/机制，以及其他会开启新兼容期的变更）；大重构 → 主（大版本先问用户）。页面 `const VERSION` 与 CHANGELOG 同步。
- 凡是 verify / replay 影响改动，都要在对应 CHANGELOG 版本节正文加入一行 `> Version-Impact: verify`；未标记时默认按 patch 处理，release 脚本会据此拒绝“应升次版本却只升修订号”的发版。
- **两个 HTML，仅 `const DEV` 一行不同**：开发版 `dungeon-raid-dev.html`（DEV=true），正式版 `dungeon-raid.html`（DEV=false）。
- **所有脚本合到 `dr.sh`，用子命令控制**：`bash dr.sh <命令>`——`test`/`deploy`（单独发 dev，正式版不变）/`release`（晋级正式版）/`gh-release [vX.Y.Z]`/`integrity`（核对正式版 sha256）/`backfill-releases`/`bind-domains`。`bash dr.sh help` 看说明。
- **版本标识 = 显式 `const VERSION`（人类标签）+ `engines.json` 里的引擎 sha256（完整性）**：`dr.sh release` 自动把正式版文件的 sha256 写进 `engines.json`；verify.js 读运行时 `VERSION`（不靠正则、minify 无关）并核对 sha256。哈希只用于「校验这份文件是不是该版本」，不用来反推版本。
- **默认只改开发版**；正式版晋级需用户明确指示，用 `bash dr.sh release`（同步 dev→prod + 提交 + push + 部署 Pages + **创建/更新 GitHub Release**，提交说明读 `/tmp/dr_commit_msg.txt`）。
- **发正式版要二次确认**：所有改动先进 dev（可 commit）→ **跑回测、呈回测报告** → **等用户明确确认**后才 `bash dr.sh release`。不要改完就自动推 prod。想让用户先在 dev 站实测，可单独 `bash dr.sh deploy`（不动正式版）。
- **每次发版都更新 GitHub Release**：`dr.sh release` 末尾自动按正式版 `const VERSION` 打 tag、notes 取 CHANGELOG 对应版本节（幂等）。回填历史版本：`bash dr.sh gh-release vX.Y.Z`。
- 固定顺序：**写完 CHANGELOG 新版本节后，紧接着更新 README 两份语言文件（`README.zh-CN.md` / `README.en.md`）**；若入口摘要或导航有变化，再同步更新根 `README.md`。别只写 changelog 漏掉文档。提交免确认、用多段 `-m`。

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
