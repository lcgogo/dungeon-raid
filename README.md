# ⚔️ 地牢突袭 · Dungeon Raid

> 一个单文件 HTML 的「连线消除 + Roguelike 成长」小游戏，纯原生 JavaScript + Canvas，手机/桌面浏览器打开即玩，无需任何依赖。
>
> A single-file HTML match-link Roguelike game. Pure vanilla JavaScript + Canvas — just open it in any mobile/desktop browser, no dependencies.

> 🙏 **致敬经典**：本项目是向 Fireflame Games 于 2011 年推出的 iOS 经典游戏 **《Dungeon Raid》** 致敬的网页复刻版，玩法深受其启发。本作为非官方的粉丝习作，与原作者无任何关联，仅供学习与娱乐。
>
> 🙏 **A tribute**: This is a fan-made web remake inspired by the classic iOS game **Dungeon Raid** by Fireflame Games (2011). It is an unofficial homage, not affiliated with the original author — made just for learning and fun.

[中文](#中文) · [English](#english)

---

## 中文

### 🎮 开始游戏

直接用浏览器打开 `dungeon-raid.html` 即可。游戏自动适配屏幕宽度，支持触摸和鼠标。

### 🧩 核心玩法

- **拖动连接** 2 个及以上**相邻同类**图块来消除（横、竖、斜 8 个方向都行）。
- 不同图块效果不同：

  | 图块 | 作用 |
  |---|---|
  | ⚔️ 剑 | 攻击怪物 |
  | 🛡️ 盾 | 增加护甲（先于生命承受伤害）|
  | ❤️ 心 | 回复生命 |
  | 💰 金币 | 赚取金币，用于商店 |
  | 👹 怪 | 敌人 |

- **剑链可以直接拖过 👹**，串到的怪会被攻击；每只串到的怪**独立吃满**整条剑链的伤害，伤害够高就能点杀。
- 拖动时，会被这一刀杀死的怪会**实时变成 💀** 预览。

### 👹 怪物信息

每只怪格子上有三个数字：

- **中间大数字** = 血量
- **左上红色角标** = 攻击力
- **右上角标** = 倒计时（每行动一次 −1，归零就按攻击力攻击你；先扣护甲再扣生命）

### 📈 成长系统

- **经验**只来自**击杀怪物**（每杀一只 +3），升级时**技能三选一**。
- **连击加成**：一次连得越多收益越高，整体收益 `× (1 + (个数−2) × 15%)`（连 5 ≈ ×1.45，连 7 ≈ ×1.75）。
- **金币商店**：💊 治疗 / 🛡️ 修甲 / 💥 灭怪（全场怪 −6 血）。

### 🧙 职业（开局四选一）

| 职业 | 技能 |
|---|---|
| 🛡️ 骑士 | 每回合自动 +2 护甲，护甲上限 +4 |
| ⚔️ 狂战士 | 生命低于 50% 时剑伤 +50%，但最大生命 −4 |
| 💰 盗贼 | 用剑每串到一只怪，额外 +1 金币 |
| ❤️ 牧师 | 治疗超出生命上限的部分转化为护甲 |

### ✨ 其他特性

- 💾 **本地存档**：自动保存进度与最佳纪录，可「继续上局」。
- 💡 **轻点任意方块**：查看说明与当前实时数值（如剑的当前威力与固定剑伤）。
- 🩸 **低血预警**：生命越低，屏幕边缘越红；危急时呼吸闪烁。

### 🛠️ 开发 / 平衡测试

`playtest.js` 是一个**无头玩法机器人**：它加载 `dungeon-raid.html` 里的真实游戏逻辑（用桩件顶替 DOM/Canvas），用贪心策略自动游玩，统计各种族/职业线的存活回合与到达等级，用于数值平衡回归测试。

```bash
node playtest.js                  # 扫描模式：四族 × 多套敌人数值，找最接近目标回合的一套

# 定向模式：固定某条职业线或某个 Boss，跑详细统计，便于和历史对比
node playtest.js --race=orc                          # 只测兽人
node playtest.js --race=human --t1=knight --t2=immortal   # 指定一阶/二阶
node playtest.js --boss=spider                       # 只刷蜘蛛（隔离单个 Boss 的影响）
node playtest.js --race=elf --boss=assassin --games=40    # 组合 + 自定局数
node playtest.js --race=dwarf --enemy=C2             # 指定敌人数值候选（默认用文件实时值）
```

参数：`--race=`（human/elf/dwarf/orc）、`--t1=`/`--t2=`（转职线 id）、`--boss=`（固定唯一会刷的 Boss）、`--enemy=`（敌人数值候选名，默认实时文件值）、`--games=`（每配置局数）、`--report`（全种族详细表）。定向模式额外输出：回合均值/最高、达一阶/二阶比例、致命回合主要死因占比。

平衡基准数据见 [`TEST_REPORT.md`](TEST_REPORT.md)（带版本号，可作回归对比）；版本改动历史见 [`CHANGELOG.md`](CHANGELOG.md)。

---

## English

### 🎮 Getting Started

Just open `dungeon-raid.html` in a browser. The game auto-fits the screen width and supports both touch and mouse.

### 🧩 Core Gameplay

- **Drag to connect** 2 or more **adjacent same-type** tiles to clear them (horizontal, vertical, and diagonal — all 8 directions).
- Each tile type does something different:

  | Tile | Effect |
  |---|---|
  | ⚔️ Sword | Attack enemies |
  | 🛡️ Shield | Gain armor (absorbs damage before health) |
  | ❤️ Heart | Restore health |
  | 💰 Coin | Earn gold for the shop |
  | 👹 Enemy | A monster |

- A **sword chain can be dragged straight through 👹**. Every enemy on the chain takes the **full** chain damage **independently** — enough damage means an instant kill.
- While dragging, any enemy that **would die** turns into 💀 as a live preview.

### 👹 Enemy Info

Each enemy tile shows three numbers:

- **Big center number** = health
- **Red badge, top-left** = attack power
- **Badge, top-right** = countdown (−1 per action; at zero it attacks you for its attack power — armor first, then health)

### 📈 Progression

- **XP comes only from kills** (+3 per enemy). On level-up, **pick 1 of 3** upgrades.
- **Combo bonus**: longer chains pay more — total reward `× (1 + (N − 2) × 15%)` (5-chain ≈ ×1.45, 7-chain ≈ ×1.75).
- **Gold shop**: 💊 Heal / 🛡️ Repair Armor / 💥 Bomb (−6 HP to all enemies).

### 🧙 Classes (choose 1 at start)

| Class | Skill |
|---|---|
| 🛡️ Knight | +2 armor each turn, +4 armor cap |
| ⚔️ Berserker | +50% sword damage when below 50% HP, but −4 max HP |
| 💰 Rogue | +1 gold for each enemy your sword chain hits |
| ❤️ Priest | Overhealing beyond max HP converts into armor |

### ✨ Other Features

- 💾 **Local save**: progress and best record are saved automatically; resume your last run anytime.
- 💡 **Tap any tile**: see its description and current live stats (e.g. your current sword power and flat bonus).
- 🩸 **Low-HP warning**: the screen edges redden as health drops, pulsing when critical.

### 🛠️ Development / Balance Testing

`playtest.js` is a **headless bot** that loads the real game logic from `dungeon-raid.html` (with DOM/Canvas stubbed out), plays automatically with a greedy strategy, and reports survival turns and levels reached per class — handy for balance regression testing.

```bash
node playtest.js
```

---

## 📄 License

MIT
