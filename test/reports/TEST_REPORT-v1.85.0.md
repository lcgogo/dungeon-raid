# 平衡测试报告 · Balance Test Report

| | |
|---|---|
| **游戏版本** | **v1.85.0** |
| 报告日期 | 2026-10-09 |
| 测试工具 | `playtest.js`（无头贪心机器人，加载真实游戏逻辑 + 确定性 RNG） |
| 报告命令 | `node test/tools/playtest.js --report --games=40` |
| 敌人数值 | **实时文件值**（未覆写） |
| 回归套件 | `bash deploy/dr.sh test` → **8/8 PASS** |

> 这份报告对应一轮一致的测试输入：当前 `v1.85.0` 正式逻辑、`--report` 默认职业线、每配置 40 局。下面所有数字都来自同一条命令。

---

## 一、全种族默认职业线报告（每配置 40 局）

| 种族 | 一阶/二阶 | 回合中位 | 回合均值 | 最高回合 | 等级中位 | 达一阶 | 达二阶 | 主要死因 |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 人族 | `knight/general` | **120** | 124 | 218 | 15 | 98% | 57% | 🧟僵尸 38% · 🦖饕餮 25% |
| 精灵 | `ranger/sharpshooter` | **130** | 134 | 251 | 18 | 95% | 57% | 🦖饕餮 38% · 🧟僵尸 23% |
| 矮人 | `blacksmith/shieldbash` | **115** | 168 | **347** | 16 | 98% | 55% | 🦖饕餮 23% · 🧟僵尸 23% |
| 兽人 | `berserker/warlord` | **94** | 94 | 196 | 14 | 80% | 33% | 👹普通怪 73% · 🦖饕餮 8% |
| 亡灵 | `necromancer/witheraura` | **138** | 144 | 323 | 17 | 95% | 78% | 🧟僵尸 43% · 🦖饕餮 23% |
| 神兽 | `azuredragon/dragonmight` | **64** | 66 | 133 | 14 | 45% | 8% | 👹普通怪 60% · 🦖饕餮 23% |

---

## 二、这一轮里谁最强、谁最弱

### 按回合中位数看

1. **亡灵 `necromancer/witheraura`** — 中位 **138**
2. **精灵 `ranger/sharpshooter`** — 中位 **130**
3. **人族 `knight/general`** — 中位 **120**
4. **矮人 `blacksmith/shieldbash`** — 中位 **115**
5. **兽人 `berserker/warlord`** — 中位 **94**
6. **神兽 `azuredragon/dragonmight`** — 中位 **64**

### 按最高回合看

1. **矮人 `blacksmith/shieldbash`** — 最高 **347**
2. **亡灵 `necromancer/witheraura`** — 最高 **323**
3. **精灵 `ranger/sharpshooter`** — 最高 **251**
4. **人族 `knight/general`** — 最高 **218**
5. **兽人 `berserker/warlord`** — 最高 **196**
6. **神兽 `azuredragon/dragonmight`** — 最高 **133**

### 简短解读

- **这一轮默认职业线里，最稳的是亡灵死灵线**，回合中位数和二阶达成率最高。
- **最能冲高的是矮人锻造师线**，最高回合达到 347。
- **最弱的是神兽默认线**；兽人线的生存表现也明显低于人族、精灵、矮人和亡灵。

---

## 三、哪个 Boss 威胁最大

从“主要死因”看：

- **🧟 僵尸**：亡灵、人族的头号威胁，也是精灵、矮人的主要威胁之一。
- **🦖 饕餮**：精灵的头号威胁，并在其余多个种族中排名靠前。
- **👹 普通怪**：兽人和神兽的主要死因，占比分别为 73% 和 60%。

### 如果只看 Boss

这轮报告里最常见的 Boss 威胁是 **🧟 僵尸** 与 **🦖 饕餮**；二者覆盖了六个种族主要死因的绝大多数位置。

---

## 四、回归

- `finaletest` → PASS
- `milestonetest` → PASS
- `savetest` → PASS
- `sticktest` → PASS
- `fxpointtest` → PASS
- `swtest` → PASS
- `thresholdtest` → PASS
- `scorertest` → PASS

本报告生成命令：

```bash
node test/tools/playtest.js --report --games=40
```
