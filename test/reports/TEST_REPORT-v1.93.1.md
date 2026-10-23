# 平衡测试报告 · Balance Test Report

## 1. 基本信息

| 项目 | 内容 |
|---|---|
| 游戏版本 | **v1.93.1** |
| 报告日期 | 2026-10-23 |
| 测试文件 | `dungeon-raid.html`（正式版） |
| 测试工具 | `test/tools/playtest.js` |
| 主报告命令 | `node test/tools/playtest.js --report --games=40` |
| Boss 专项命令 | `node test/tools/playtest.js --report --boss=sponge --games=40` |
| 敌人数值 | 实时文件值，未覆写 |
| 随机性 | 游戏逻辑使用确定性 RNG；机器人选路含运行时随机打散，结论按本轮 40 局记录 |
| 回归套件 | `bash deploy/dr.sh test` → **9/9 PASS** |

> 主表和 Boss 专项分别来自独立的 40 局测试。主表中的“最终致死来源”只表示死亡当回合伤害最高来源，不代表整局累计伤害或 Boss 总威胁。

## 2. 默认职业线主表（每配置 40 局）

| 种族 | 一阶/二阶 | 回合中位 | 回合均值 | 最高回合 | 等级中位 | 达一阶 | 达二阶 | 最终致死来源（死亡当回合） |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 人族 | `knight/general` | **129** | 136 | 271 | 16 | 95% | 70% | 🧟僵尸 35% · 🦖饕餮 25% |
| 精灵 | `ranger/sharpshooter` | **145** | 145 | 253 | 18 | 100% | 88% | 🧟僵尸 28% · 🧽海绵宝宝 25% |
| 矮人 | `blacksmith/shieldbash` | **202** | 202 | 332 | 25 | 98% | 75% | 🧟僵尸 30% · 🦠污染怪 23% |
| 兽人 | `berserker/warlord` | **101** | 101 | 251 | 15 | 93% | 23% | 👹普通怪 50% · 🧟僵尸 13% |
| 亡灵 | `necromancer/witheraura` | **163** | 167 | 386 | 19 | 95% | 90% | 🧟僵尸 35% · 🦖饕餮 23% |
| 神兽 | `azuredragon/dragonmight` | **66** | 68 | 132 | 14 | 50% | 3% | 👹普通怪 53% · 🦖饕餮 13% |

## 3. 生存与职业线解读

### 按存活回合中位数

1. 矮人 `blacksmith/shieldbash` — 202
2. 亡灵 `necromancer/witheraura` — 163
3. 精灵 `ranger/sharpshooter` — 145
4. 人族 `knight/general` — 129
5. 兽人 `berserker/warlord` — 101
6. 神兽 `azuredragon/dragonmight` — 66

矮人的中位数最高，为 202；亡灵的最高回合和二阶到达率更高，说明它的长局上限和稳定成长仍然突出。神兽的二阶到达率最低，本轮主要死因仍是普通怪。

### 按最高回合

1. 亡灵 `necromancer/witheraura` — 386
2. 矮人 `blacksmith/shieldbash` — 332
3. 人族 `knight/general` — 271
4. 精灵 `ranger/sharpshooter` — 253
5. 兽人 `berserker/warlord` — 251
6. 神兽 `azuredragon/dragonmight` — 132

最高回合是极端样本，只用于观察上限，不能替代中位数稳定性。

## 4. Boss 专项：海绵宝宝

测试条件：Boss 池只保留 `sponge`，敌人数值使用正式版实时文件值；每个种族 40 局。

| 种族 | 回合中位 | 回合均值 | 最高回合 | 达一阶 | 达二阶 | 最终致死来源中的海绵宝宝 |
|---|---:|---:|---:|---:|---:|---:|
| 人族 | **118** | 124 | 183 | 100% | 57% | 93% |
| 精灵 | **113** | 115 | 173 | 100% | 50% | 98% |
| 矮人 | **186** | 198 | 314 | 100% | 100% | 95% |
| 兽人 | **75** | 76 | 136 | 83% | 10% | 18% |
| 亡灵 | **138** | 139 | 195 | 100% | 80% | 98% |
| 神兽 | **64** | 67 | 102 | 63% | 0% | 75% |

海绵宝宝会把同一条剑链中普通怪本应承受的伤害全部转移到自己身上，因此在固定 Boss 池专项中，最终致死来源占比很高。它的机制会显著改变剑链的目标价值：同时划过海绵宝宝和普通怪时，普通怪不会显示击杀预览，也不会实际掉血；炸弹、箭雨、毒心等非剑链伤害不触发吸收。

该专项只说明海绵宝宝在“唯一 Boss 池”条件下的压力，不能直接等同于完整 Boss 池中的强度排名。

## 5. 回归

- `finaletest` → PASS
- `milestonetest` → PASS
- `savetest` → PASS
- `sticktest` → PASS
- `fxpointtest` → PASS
- `swtest` → PASS
- `cyclopstest` → PASS
- `thresholdtest` → PASS
- `scorertest` → PASS

专项新增断言：海绵宝宝同链吸收、非剑链不吸收、普通怪不显示骷髅预览。

## 6. 限制

- 主表和海绵宝宝专项各为每种族 40 局，适合回归观察，不足以作为严格平衡结论。
- 机器人使用贪心策略，不代表真人玩家表现。
- `dmgBy` 只记录死亡当回合；累计伤害、棋盘阻塞、资源干扰和海绵宝宝的吸收总量没有统一量化。

报告规范：`test/reports/REPORT_STANDARD.md`
报告模板：`test/reports/TEST_REPORT_TEMPLATE.md`
