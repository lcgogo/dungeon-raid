# AGENTS.md — AI 协作规则（Claude / WorkBuddy 等都读这份）

《地牢突袭 · Dungeon Raid》= 单文件 HTML 游戏 + Cloudflare Worker 后端 + 重放防作弊验证。
**任何 AI 助手在本仓库动手前，先读完这份文件。** 它是双方共同的唯一规则源；`CLAUDE.md` 指向它，架构细节见 `ARCHITECTURE.md`。

---

## 0. 多 AI 协作纪律（本仓库由多个 AI 助手并行维护）

- **动手前、提交前、发布前都先 `git pull --ff-only`**（成员在不同机器/系统，极易各自落后）。
- **小步提交、勤推**；commit 标题带出处前缀（如 `[workbuddy]` / `[claude]`），让 `git log` 一眼看清谁改的。
- **同一时间只让一方碰那两个大 HTML**（`dungeon-raid*.html` 冲突最难解）；要改先在对话里说一声或先推。
- **不重写已推送的历史**（不 force-push、不改已 push 的 commit）。
- **尊重 `.gitignore`**：临时文件（`dr_commit_msg.txt`）、密钥、`public/`、`node_modules/` 一律不提交。曾因 `git add -A` 把 `dr_commit_msg.txt` 误扫进仓库——别再发生。

---

## 1. 不可破的硬约束（谁改都不能违反）

- **录像确定性重放 = 防作弊命根**：任何新录制的玩家动作都必须接进 `dispatchReplayAct`；保证「同种子 + 同操作序列 → 同结局」。gameplay 路径**禁止** `Date.now()` / `Math.random()`，随机必须走种子 PRNG（`srand`/`rnd`）。
- **`verify.js` 判定只能严格相等、且取自重放真实值**：`source='play'` 要 turns/level/gold 三项全等；`cleared` 要真破关且等级吻合。**禁止** “挑最接近声称值的解释”“跑出≈声称就算过”这类 select-to-pass 逻辑（tut 兼容用 OR 语义：任一确定性解释满足严格判定才算过）。重放热路径**禁止**逐回合 `console.log`（调试输出用 `DEBUG` 环境变量门控）。
- **`engines.json` 的 sha256 只由 release 脚本写**，谁都别手敲；它只用来「校验这份文件是不是该版本」，不用来反推版本。
- **正式版 `dungeon-raid.html` 不准手改**：两个 HTML 只许差 `const DEV` 一行；dev→prod 同步只能由 release 脚本做。
- **密钥永不进仓库**：`VERIFY_SECRET` / `VERIFY_PUSH_URL` / `RENDER_PING_URL` / `GH_DISPATCH_TOKEN`、验证器 onrender 原址——只存在于 Cloudflare Worker / GitHub Actions / render 的环境变量里，**别 print、别写进代码或文档**。
- **正式版存档跨版本不兼容**（从头开始）；dev 存档不受版本限制。
- **后端 schema 变更走 D1 迁移框架**：`worker/migrations/` + `wrangler d1 migrations apply ... --remote`，勿手敲 SQL。

---

## 2. 版本与构建

- 版本号 `v主.次.修`：小改 / 修 bug / 调参 → **修**；新 Boss / 职业 / 机制 → **次**；大重构 → **主**（大版本先问用户）。页面 `const VERSION` 与 CHANGELOG 同步。
- **两个 HTML，仅 `const DEV` 一行不同**：开发版 `dungeon-raid-dev.html`（`DEV=true`），正式版 `dungeon-raid.html`（`DEV=false`）。
- **默认只改开发版**。正式版晋级需用户明确指示。
- **两套发布脚本必须行为一致**：`dr.sh`（bash）与 `dr.ps1`/`dr.bat`（Windows）做的事必须等价——只翻 `const DEV` → 把正式版 sha256 写进 `engines.json` → 嵌入 CHANGELOG → 提交/推送/部署 Pages → 打/更新 GitHub Release（tag 取正式版 `const VERSION`，notes 取 CHANGELOG 对应节）。**改了其中一套的 release 逻辑，必须同步改另一套**，否则两边发出来的版本会不一致。
- **commit message 必须在 release 前当场写新**：`dr.sh release` 读 `/tmp/dr_commit_msg.txt`。曾因复用陈旧文件，commit 标题串成上一版本号——发版前务必重写它。

---

## 3. 发版闸门（dev-first，二次确认）

1. 所有改动**先进 dev**（可 commit）。
2. **跑回测、呈回测报告**（见 §4）。
3. **等用户明确确认**（“发”）后才 `bash dr.sh release`。**绝不改完就自动推 prod。**
4. 想让用户先在 dev 站实测：单独 `bash dr.sh deploy`（不动正式版）。
- 固定顺序：**写完 CHANGELOG 新版本节，紧接着更新 README（中英两侧）**，再和代码一起提交——别只写 changelog 漏掉 readme。提交免确认、用多段 `-m`。

---

## 4. 测试（改完必跑）

- `bash dr.sh test` —— 一把跑全部（finale/milestone/save/stick）。**红着不准发**。单独跑见 `test/`：
  - `test/finaletest.js` 终局/破关烟测（也验证脚本能解析）。
  - `test/milestonetest.js` 50/100/200/350 转职链 + 跨界技能 + 重放一致。
  - `test/savetest.js` 存档版本兼容。
- **平衡相关改动**（新职业/数值/机制）还要跑 `node playtest.js [--report]`（读正式版；`--dev` 读开发版；`--clearsweep [--upsweep]` 全职业线扫描），并把报告呈给用户。

---

## 5. UI：一屏原则

- **每个 overlay 卡片页面内容高度别超过 iPhone 15 Safari 一屏（约 650–700px 可视高），宁可更短。** 文案从简、次级按钮单行、能拆两步就拆。新增/改动任何弹层都按此自检。

---

## 6. 后端 / 验证链

- Worker：`worker/src/index.js`，`cd worker && npx wrangler deploy`。排行榜只展示 `verified=1`；`agent`(human/ai) 分人类榜/AI 榜。
- 重放验证器：`verify.js`（核心）/ `verify-server.js`（render 常驻）；GitHub Actions 定时跑 `verify.js` 兜底 + 保活 render。完整架构、免费额度、密钥放哪、运维速查全在 **`ARCHITECTURE.md`**。
