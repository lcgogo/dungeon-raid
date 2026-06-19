# 架构与运维 · Architecture & Ops

《地牢突袭》= 单文件 HTML 游戏 + 一套「云排行榜 + 防作弊重放验证」后端。本文存档整体架构、免费额度、兜底与运维要点。

## 组件总览

| 组件 | 平台 | 作用 | 代码/位置 |
|---|---|---|---|
| 游戏静态页 | **Cloudflare Pages** | `dungeon-raid.html`(正式版)/ `dungeon-raid-dev.html`(开发版)/ `index.html` | 仓库根；`dr.sh deploy/release` 部署 |
| 榜单 API | **Cloudflare Worker** (`api.dungeonraid.win`) | 收成绩、存档、算名次、`/pending`·`/verify`、推送验证 | `worker/src/index.js`；`wrangler deploy` |
| 录像存储 | **Cloudflare KV**(`REC` 命名空间) | key=8位id，value=录像 JSON（种子+操作序列 ≈2–4KB） | — |
| 成绩元数据 | **Cloudflare D1**(`dungeon-raid-scores`) | turns/level/gold/version/verified/source… | `worker/migrations/` |
| 重放验证器 | **render**（藏在 `verify.dungeonraid.win` Cloudflare 橙云后） | 确定性重放录像、比对、回写 verified | `verify-server.js`（常驻）/ `verify.js`（核心） |
| 兜底验证 + 保活 | **GitHub Actions**（公开仓库，免费） | 每 5 分钟跑 `verify.js` 兜底；每 10 分钟 ping render 保活 | `.github/workflows/verify.yml`、`keepalive.yml` |

## 验证链条

```
玩家死亡/破关（录像=种子+操作序列+服务端一次性 token）
  → Worker /score|/clear：校验 token → 录像存 KV、成绩存 D1(verified=0) → 算名次返回
  → 若顶尖(前1%/前10)：90s 去抖后 fetch verify.dungeonraid.win/verify-now?k=SECRET（→ 橙云 → 隐藏的 render）
  → render：加载当前正式版引擎(启动一次) → /pending?version=当前版 → 逐条 /rec/:id 取录像 → 确定性重放(同种子+同操作→同结局) → 比对 → POST /verify
  → Worker /verify：ok→verified=1 并用重放真实结局校正 turns/level/gold；否则 verified=-1
  → /top 只展示 verified=1
```

**三层兜底**：① render 每 7s 轮询 `/pending`；② GitHub cron 每 5 分钟跑 `verify.js`（**完全不依赖 render**）；③ GitHub keepalive 每 10 分钟 ping render 防免费档休眠。

**防作弊根基**：服务端发一次性种子(防离线刷幸运种子)；确定性重放(伪造结局对不上→verified=-1)；按 `rec.ver` 版本分桶(只在对应版本引擎上验)；验证通过也用重放真实值**校正**上报值；榜单严格 `verified=1`。

## 免费额度 / 限额（不超限则永久免费）

| 服务 | 免费额度 | 最先撞的天花板 |
|---|---|---|
| Cloudflare Pages | 请求/带宽无限、500 构建/月 | — |
| Cloudflare Workers | 10 万请求/天 | 小游戏远用不到 |
| Cloudflare D1 | 5GB、读 500 万行/天、写 10 万行/天 | 宽松 |
| Cloudflare KV | 读 10 万/天、**写 1000/天**、1GB | **写 1000/天**（≈每天 1000 局上报）最先到 |
| GitHub Actions（公开仓库） | **分钟数无限** | 不收费（私有库才 2000 分/月） |
| **render（验证器）** | Free：**750 实例小时/月** + 闲置 15 分钟休眠 | ⚠️ 24/7 保活 ≈744 小时**压着 750 线**；free 政策最易变。无忧选 Starter $7/月 |

> **render 是可选的「秒级加速」，不是命根子**：删掉它功能不丢，GitHub cron（免费）每 5 分钟照样验。KV 旧录像由每日 Cron `pruneOld` 自动清理（删「不在最近 5 版」且超 30 天的），不会无限堆积。

## 密钥（三处必须同值，Worker 是真相源，均不进仓库）

| Secret | 存放 | 用途 |
|---|---|---|
| `VERIFY_SECRET` | Cloudflare Worker secret · GitHub Actions secret · render env | `/pending`·`/verify`·`/verify-now` 的访问口令 |
| `VERIFY_PUSH_URL` | Cloudflare Worker secret | 验证器地址(填 `https://verify.dungeonraid.win`)；未设则不推送、靠轮询/cron 兜底 |
| `RENDER_PING_URL` | GitHub Actions secret | keepalive ping 地址(同上) |

> 都是「只写不可读」：Cloudflare/GitHub 都只能覆盖、看不到原值。丢了就轮换一个新值、三处同步填。

## 运维速查

- 发版（游戏）：`bash dr.sh release`（dev→正式版同步 + 提交 + push + 部署 Pages + GitHub Release）；只发 dev：`bash dr.sh deploy`；完整性核对：`bash dr.sh integrity`。
- 部署 Worker：`cd worker && npx wrangler deploy`。
- render：从本仓库部署 `node verify-server.js`（`render.yaml` 蓝图 / `Procfile` 通用）；自定义域 `verify.dungeonraid.win`（Cloudflare 橙云 + SSL 模式 **Full**，非 strict）。
- 看录像：`https://api.dungeonraid.win/rec/<id>`；列 KV：`npx wrangler kv key list --namespace-id <REC_ID>`。
- 验证器状态：`https://verify.dungeonraid.win/`（看 engineVersion / last / lastErr）。
- 手动验证一次：`API_BASE=https://api.dungeonraid.win VERIFY_SECRET=… node verify.js`。

## 数据流向小结

录像 → **KV**；成绩 → **D1**；二者按同一 `id` 关联。render/分享链接/回放都按 id 从 Worker 拉 `/rec/:id`。游戏页与 api 都是 Cloudflare 原生（边缘直出），只有 `verify` 子域回源到外部（render）。
