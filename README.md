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

**两个版本**（首页 `index.html` 可选择，按大小区分）：

| 版本 | 文件 | 说明 |
|---|---|---|
| ✅ **正式版** | `dungeon-raid.html` | 稳定版本 |
| 🚧 **开发版 DEV** | `dungeon-raid-dev.html` | 指向最新开发版本，新功能先在这里试 |

两个版本**存档相互独立、互不覆盖**（DEV 用单独的 localStorage 键）。开始界面与底部都会标明当前是「正式版」还是「DEV 开发版」。

### 🧩 核心玩法

- **拖动连接** 2 个及以上**相邻同类**图块来消除（横、竖、斜 8 个方向都行）。
- 不同图块效果不同：

  | 图块 | 作用 |
  |---|---|
  | 🔪 剑 | 攻击怪物 |
  | 🔰 盾 | 增加护甲（先于生命承受伤害）|
  | 💗 心 | 回复生命 |
  | 💰 金币 | 赚取金币，用于商店 |
  | 👹 怪 | 敌人 |

- **剑链可以直接拖过 👹**，串到的怪会被攻击；每只串到的怪**独立吃满**整条剑链的伤害，伤害够高就能点杀。剑是武器，**剑链里至少要连进一把剑**才能造成伤害（只连怪、不连剑不算攻击，也不消耗回合）。
- 拖动时，会被这一刀杀死的怪会**实时变成 💀** 预览。

### 👹 怪物信息

每只怪格子上有三个数字：

- **中间大数字** = 血量
- **左上红色角标** = 攻击力（真实伤害的 Boss 显示为紫色）
- **右上角标** = 倒计时（每行动一次 −1，归零就按攻击力攻击你；先扣护甲再扣生命，但每次至少掉 1 滴）

### 📈 成长系统

- **经验**只来自**击杀怪物**（每杀一只 +3），升级时**技能三选一**。
- **连击加成**：一次连得越多收益越高，整体收益 `× (1 + (个数−2) × 15%)`（连 5 ≈ ×1.45，连 7 ≈ ×1.75）。
- **护甲累积**：盾不直接给护甲，而是累积「护甲进度」，攒满 +1 护甲（越往后越贵）。受击时护甲先减伤，剩下的才掉血。
- **金币商店**：💊 治疗（回复 10 生命）/ 💥 炸弹（全场怪 −6 血）。每件商品有独立冷却。

### 🧬 种族（开局选择）

开局先选一个种族。每个种族都有独特**特性**和对应的**削弱**：

| 种族 | 特性 | 削弱 |
|---|---|---|
| 🧑 人族 Human | 无（全能基准，适合新手） | 无 |
| 🧝 精灵 Elf | 连击加成翻倍（每多连 1 个 +30%） | 「强健体魄」升级只 +3 生命上限 |
| 🧔 矮人 Dwarf | 护甲减伤翻倍（每点护甲抵 2 点） | 剑威力 −0.3 |
| 🧌 兽人 Orc | 「强健体魄」升级时生命上限翻倍（每次 +12） | **无甲**——永远无法获得护甲（盾牌从棋盘移除） |

### 🌟 成长路线

1. **开局**：选一个种族。
2. **第 50 回合 Boss**：击败它可转入**一阶职业**（主动技能），从本种族专属的 2 个里二选一。
3. **第 100 回合 Boss**：击败它可转入**二阶职业**（被动），同样从本种族的 2 个里二选一。
4. **第 200 回合 Boss**：击败它可再获得**本种族另一项被动**（至此集齐本种族两个被动）。
5. **第 350 回合 Boss**：击败它可从**全种族全职业的主动技能**里任选一个，**替换掉商店的 💊治疗 或 💥炸弹 槽**——该槽位变成施放此主动（带技能冷却，可跨种族搭配）。
6. **第 500 回合 · 终焉之主 👑**：终局降临，是否破关在此一举（见下）。

> 用剑或炸弹击败 Boss 都能触发转职。

### ⚔️ 一阶职业 · 主动技能

每个种族对应 2 个一阶职业，技能冷却均为 **5 回合**：

| 种族 | 职业 | 技能 | 效果 |
|---|---|---|---|
| 🧑 人族 | 🛡️ 骑士 Knight | 圣盾 Aegis | 本回合免疫所有伤害 |
| 🧑 人族 | 💗 牧师 Priest | 祝福 Blessing | 清掉全场的心，每颗转 3 点经验 |
| 🧝 精灵 | 🏹 游侠 Ranger | 箭雨 Arrow Rain | 对全场怪造成「剑威力 ×2」的伤害 |
| 🧝 精灵 | 💰 盗贼 Rogue | 点金 Gold Touch | 把场上所有的剑变成金币 |
| 🧔 矮人 | 🔰 锻造师 Blacksmith | 锻甲 Forge Armor | 吞下全场的盾，全部转为护甲进度 |
| 🧔 矮人 | 🔒 守财奴 Miser | 囤金 Hoard | 锁金 3~10 回合（期间不产/不花金币，到期返还**双倍**）|
| 🧌 兽人 | 🔪 狂战士 Berserker | 狂怒 Frenzy | 生命减半并进入**不屈**（仅**本回合**：无论受多少伤都保留 1 血）；并**永久**开启残血增伤——血越少剑伤越高（最高 +60%）|
| 🧌 兽人 | 🩸 斗士 Fighter | 嗜血 Bloodthirst | 本回合剑链每击中一只怪回 3 血，**且可用剑攻击剑免疫的 Boss（幽灵/小丑）** |

### 🎖️ 二阶职业 · 被动

每个种族对应 2 个二阶职业，转职后永久生效：

| 种族 | 职业 | 效果 |
|---|---|---|
| 🧑 人族 | 不朽 Immortal | 治疗溢出的部分转为永久生命上限 |
| 🧑 人族 | 将军 General | 升级时改为**四选一** |
| 🧝 精灵 | 神射手 Sharpshooter | 剑链每击杀一只怪额外 +2 经验 |
| 🧝 精灵 | 影袭 Shadow | 炸弹冷却永久缩为 2 回合 |
| 🧔 矮人 | 爆破手 Demolitionist | 炸弹伤害更高，但花费金币更多 |
| 🧔 矮人 | 财阀 Tycoon | 获得金币时额外按一半转为经验 |
| 🧌 兽人 | 巨力 Titan | 最大生命越高，剑链固定伤害越高（每 12 点最大生命 +1，与兽人 HP×2 特性联动）|
| 🧌 兽人 | 荆棘 Thorns | 受到伤害的一半反弹给攻击者 |

### 👹 Boss 图鉴

每约 **10 回合**会随机出现一个 Boss，击败奖励 💰+20、经验 +15。Boss 强度每 **50 回合**提升一档（Lv2、Lv3…）。其中 **幽灵、小丑只能用 💥 炸弹** 打，其余都可以用剑链攻击（也能炸）。

| Boss | 攻击方式 | 招数 |
|---|---|---|
| 👻 幽灵 Ghost | 仅炸弹 | 剑链对它无效；倒计时归零会对你重击 |
| 🤡 小丑 Clown | 仅炸弹 | 每回合随机打乱棋盘上若干棋子，制造持续混乱 |
| 🧛 吸血鬼 Vampire | 剑 / 炸弹 | 每回合吸取场上所有的心来回血——别把心留在场上 |
| 🥷 刺客 Assassin | 剑 / 炸弹 | 属性同普通怪，但攻击是**真实伤害**，无视护甲直接掉血 |
| 🦖 饕餮 Devourer | 剑 / 炸弹 | 每回合吸取场上每只怪一半生命壮大；倒计时归零放出等于自身 50% 血量的强击 |
| 🧙 召唤师 Summoner | 剑 / 炸弹 | 每回合把一个非怪棋子变成一只怪，拖得越久怪越多 |
| 🦹 小偷 Thief | 剑 / 炸弹 | 现身即偷走一定比例金币（一阶 20%、二阶 40%…）；倒计时内击败夺回，让它逃走则永久失去 |
| 🧟 僵尸 Zombie | 剑 / 炸弹 | 现身即让你感染尸毒（血条变绿），每回合按生命百分比掉血（一阶 10%、二阶 20%…，无视护甲）；击败即解除感染 |

> Boss 入场时会有**扩散冲击环 + 闪光**特效（普通 Boss 红、终焉之主金），一眼可辨。

### 👑 终局：终焉之主 与 破关

到 **第 500 回合**，终局 Boss **终焉之主 👑** 降临。它**本身无血、无攻击、打不掉**，但**每回合**会把若干非怪/非 Boss 棋子变成随机 Boss——**第 1 波 1 个、第 2 波 2 个……第 10 波 10 个**（浪潮 Boss 为基础档、可清）。

- 撑满 **10 波**还活着 → **破关！** 🏆（约第 511 回合）
- 棋盘被 Boss 淹没、再无可行连线 → **判负**

破关后有故事化祝贺页；正式版会把破关上报**破关榜**（按**最低破关等级**排名，越低越强）。

### ✨ 其他特性

- 📖 **开篇引言 / 玩法演示 / 破关祝贺**：开始界面有虚构背景 + 玩法速览（含 `🔪━👹━🔪` 穿怪剑链演示）与致敬原作的说明；**新手第一局**棋盘必有「剑-怪-剑」可连组合，便于立刻上手；撑过终焉之主 10 波破关后，有故事化的祝贺结算页。
- 🔴 **Boss 红字日志**：游戏日志位于状态栏与棋盘正下方；**场上有 Boss 时日志变红**警示。
- 💾 **本地存档**：自动保存进度与最佳纪录，可「继续上局」。
- 💡 **轻点任意方块**：查看说明与当前实时数值（如剑的当前威力与固定剑伤）；轻点 HUD 查看角色全部属性与职业详情。
- 🩸 **低血预警**：生命越低，屏幕边缘越红；危急时呼吸闪烁，生命条同步闪烁。
- ☠️ **死亡报告**：倒下时列出致命回合各伤害来源的占比。
- 🎬 **操作录制 / 回放**：自动记录每一局（种子 + 操作序列，确定性重放，一局约 2–4 KB）。死亡后可 **回放本局 / 复制 / 导出 / 🔗分享链接**；开始界面可 **回放上一局** 或 **粘贴导入** 别人的录像。回放支持暂停与 1×/2×/4× 调速。
- 🏆 **云排行榜 + 百分位（仅正式版 `dungeonraid.win`）**：死亡后显示你在**总榜**和**本种族榜**的名次与百分位。按**坚持回合**排名、**按版本分桶**统计；录像可确定性重放，榜单**只展示已重放验证的成绩**，前列每小时自动重放校验防作弊。开发版不参与排名。
- 🏅 **人类榜 / AI 榜**：成绩按 `agent`(human / ai)分流、互不混排。游戏内「🏆 排行榜」面板可在 **人类 / AI**、**闯关榜 / 破关榜** 间切换，并**按种族筛选**（全部 / 人族 / 精灵 / 矮人 / 兽人）查看 Top 10。真人对局上报人类榜，AI/机器人自报 `ai` 进 AI 榜（后端 `/top?agent=&race=`、`/clearboard?agent=&race=`，私有改判接口 `/classify`）。写入端点按 IP 限流防刷。

### 🛠️ 开发 / 平衡测试

`playtest.js` 是一个**无头玩法机器人**：它加载 `dungeon-raid.html` 里的真实游戏逻辑（用桩件顶替 DOM/Canvas），用贪心策略自动游玩，统计各种族/职业线的存活回合与到达等级，用于数值平衡回归测试。

```bash
node playtest.js                  # 扫描模式：四族 × 多套敌人数值，找最接近目标回合的一套

# 定向模式：固定某条职业线或某个 Boss，跑详细统计，便于和历史对比
node playtest.js --race=orc                          # 只测兽人
node playtest.js --race=human --t1=knight --t2=immortal   # 指定一阶/二阶
node playtest.js --boss=zombie                       # 只刷僵尸（隔离单个 Boss 的影响）
node playtest.js --race=elf --boss=assassin --games=40    # 组合 + 自定局数
node playtest.js --race=dwarf --enemy=C2             # 指定敌人数值候选（默认用文件实时值）
```

参数：`--race=`（human/elf/dwarf/orc）、`--t1=`/`--t2=`（转职线 id）、`--boss=`（固定唯一会刷的 Boss）、`--enemy=`（敌人数值候选名，默认实时文件值）、`--games=`（每配置局数）、`--report`（全种族详细表）。定向模式额外输出：回合均值/最高、达一阶/二阶比例、致命回合主要死因占比。

```bash
node playtest.js --replay=run.json   # 回放一份游戏导出的录像（确定性重演），输出结局/死因，便于分析真实人类玩法
```

平衡基准数据见 [`TEST_REPORT.md`](TEST_REPORT.md)（带版本号，可作回归对比）；版本改动历史见 [`CHANGELOG.md`](CHANGELOG.md)。

**正式版 / 开发版的维护**：两个文件仅有一行不同——文件顶部的 `const DEV`（正式版 `false`，开发版 `true`），存档键、版本标识、开始界面徽标都由它派生。改动流程：先改 `dungeon-raid-dev.html` 验证，稳定后 `cp dungeon-raid-dev.html dungeon-raid.html` 再把那行改回 `const DEV=false` 即可同步到正式版。

---

## English

### 🎮 Getting Started

Just open `dungeon-raid.html` in a browser. The game auto-fits the screen width and supports both touch and mouse.

**Two builds** (pick on the `index.html` home page, sized to tell them apart):

| Build | File | Notes |
|---|---|---|
| ✅ **Release** | `dungeon-raid.html` | The stable version |
| 🚧 **Dev** | `dungeon-raid-dev.html` | Tracks the latest dev build; new features land here first |

The two builds keep **separate, non-overwriting saves** (Dev uses its own localStorage keys). The start screen and footer both label which build you are in.

### 🧩 Core Gameplay

- **Drag to connect** 2 or more **adjacent same-type** tiles to clear them (horizontal, vertical, and diagonal — all 8 directions).
- Each tile type does something different:

  | Tile | Effect |
  |---|---|
  | 🔪 Sword | Attack enemies |
  | 🔰 Shield | Gain armor (absorbs damage before health) |
  | 💗 Heart | Restore health |
  | 💰 Coin | Earn gold for the shop |
  | 👹 Enemy | A monster |

- A **sword chain can be dragged straight through 👹**. Every enemy on the chain takes the **full** chain damage **independently** — enough damage means an instant kill. The sword is your weapon, so a chain must include **at least one 🔪** to deal damage (chaining only monsters with no sword isn't an attack and costs no turn).
- While dragging, any enemy that **would die** turns into 💀 as a live preview.

### 👹 Enemy Info

Each enemy tile shows three numbers:

- **Big center number** = health
- **Red badge, top-left** = attack power (shown purple for true-damage bosses)
- **Badge, top-right** = countdown (−1 per action; at zero it attacks you for its attack power — armor first, then health, but you always lose at least 1 HP)

### 📈 Progression

- **XP comes only from kills** (+3 per enemy). On level-up, **pick 1 of 3** upgrades.
- **Combo bonus**: longer chains pay more — total reward `× (1 + (N − 2) × 15%)` (5-chain ≈ ×1.45, 7-chain ≈ ×1.75).
- **Armor accumulates**: shields do not grant armor directly; they fill "armor progress," and filling it gives +1 armor (costs more each time). Armor soaks each hit, then the rest comes off your HP.
- **Gold shop**: 💊 Heal (restore 10 HP) / 💥 Bomb (all foes −6 HP). Each item has its own cooldown.

### 🧬 Races (chosen at start)

Pick a race at the start. Each has a unique **trait** and a matching **weakness**:

| Race | Trait | Weakness |
|---|---|---|
| 🧑 Human | None (all-round baseline, beginner-friendly) | None |
| 🧝 Elf | Combo bonus doubled (+30% per extra tile) | Tough Body upgrade gives only +3 max HP |
| 🧔 Dwarf | Armor counts double (each point blocks 2) | Sword power −0.3 |
| 🧌 Orc | Tough Body upgrade gives double max HP (+12 each) | **No Armor** — can never gain armor (shields removed from the board) |

### 🌟 Progression Path

1. **Start**: choose a race.
2. **Turn-50 boss**: beat it to advance to a **Tier-1 class** (active skill), picking 1 of your race's 2 options.
3. **Turn-100 boss**: beat it to advance to a **Tier-2 class** (passive), again 1 of your race's 2 options.
4. **Turn-200 boss**: beat it to gain **your race's other passive** (now you have both of your race's passives).
5. **Turn-350 boss**: beat it to pick **any active skill from any race/class** and **replace your 💊Heal or 💥Bomb shop slot** — that slot now casts the active (with the skill's cooldown; cross-race builds allowed).
6. **Turn-500 · the Overlord 👑**: the final trial — clear or fall (see below).

> Beating a boss with either a sword chain or a bomb triggers the advance.

### ⚔️ Tier-1 Classes · Active Skills

Each race has 2 Tier-1 classes; every skill has a **5-turn cooldown**:

| Race | Class | Skill | Effect |
|---|---|---|---|
| 🧑 Human | 🛡️ Knight | Aegis | Immune to all damage this turn |
| 🧑 Human | 💗 Priest | Blessing | Clear all hearts on the board; each becomes 3 XP |
| 🧝 Elf | 🏹 Ranger | Arrow Rain | Deal "sword power ×2" damage to all enemies |
| 🧝 Elf | 💰 Rogue | Gold Touch | Turn every sword on the board into a coin |
| 🧔 Dwarf | 🔰 Blacksmith | Forge Armor | Absorb all shields on the board into armor progress |
| 🧔 Dwarf | 🔒 Miser | Hoard | Lock gold for 3–10 turns (no gold in/out; **double** payout at the end) |
| 🧌 Orc | 🔪 Berserker | Frenzy | Halve HP and become **Undying** (**this turn only**: keep ≥1 HP no matter the damage); also **permanently** enables low-HP scaling — lower HP means higher sword damage (up to +60%) |
| 🧌 Orc | 🩸 Fighter | Bloodthirst | Heal 3 HP per enemy your sword chain hits this turn, **and your sword can hit sword-immune bosses (Ghost/Clown)** |

### 🎖️ Tier-2 Classes · Passives

Each race has 2 Tier-2 classes; once chosen they apply permanently:

| Race | Class | Effect |
|---|---|---|
| 🧑 Human | Immortal | Overheal raises your max HP permanently |
| 🧑 Human | General | Level-up offers 4 choices instead of 3 |
| 🧝 Elf | Sharpshooter | +2 extra XP per enemy killed by a sword chain |
| 🧝 Elf | Shadow | Bomb cooldown becomes 2 turns permanently |
| 🧔 Dwarf | Demolitionist | Bomb hits harder but costs more gold |
| 🧔 Dwarf | Tycoon | Gold gained also grants half as much XP |
| 🧌 Orc | Titan | Higher max HP means higher flat sword damage (+1 per 12 max HP; synergizes with the Orc's HP×2 trait) |
| 🧌 Orc | Thorns | Reflect half of damage taken back to the attacker |

### 👹 Bestiary

About every **10 turns** a random boss appears; beating one rewards 💰+20 and +15 XP. Boss strength steps up one tier every **50 turns** (Lv2, Lv3…). **Ghost and Clown can only be hit with the 💥 Bomb**; all others can be attacked with sword chains too (bombs also work).

| Boss | How to hit | Gimmick |
|---|---|---|
| 👻 Ghost | Bomb only | Immune to sword chains; strikes you hard when its timer hits 0 |
| 🤡 Clown | Bomb only | Scrambles several random tiles every turn, causing constant chaos |
| 🧛 Vampire | Sword / Bomb | Drains every heart on the board each turn to heal — do not leave hearts out |
| 🥷 Assassin | Sword / Bomb | Stats like a normal enemy, but its hits are **true damage** — ignore armor, straight to HP |
| 🦖 Devourer | Sword / Bomb | Drains half the HP from every enemy each turn to grow; at 0 unleashes a hit worth 50% of its HP |
| 🧙 Summoner | Sword / Bomb | Turns a non-enemy tile into an enemy each turn — the longer it lives, the more enemies |
| 🦹 Thief | Sword / Bomb | Steals a share of gold on arrival (20% at Lv1, 40% at Lv2…); kill it before its timer to recover, let it flee and the gold is gone forever |
| 🧟 Zombie | Sword / Bomb | Infects you on arrival (HP bar turns green); each turn you lose a % of HP (10% at Lv1, 20% at Lv2…, ignoring armor); kill it to cure |

> Each boss arrives with a **shockwave ring + flash** effect (crimson for normal bosses, gold for the Overlord), so you never miss one.

### 👑 Endgame: the Overlord & Clearing

At **turn 500**, the final boss — the **Overlord 👑** — descends. It has **no HP, no attack, and cannot be killed**, but **every turn** it turns several non-enemy tiles into random bosses — **1 on wave 1, 2 on wave 2 … 10 on wave 10** (wave bosses are base-tier and killable).

- Survive all **10 waves** → **CLEARED!** 🏆 (around turn 511)
- Overrun by bosses with no legal move left → **defeat**

Clearing shows a story-flavored congratulations screen; the Release build reports clears to the **clear board**, ranked by **lowest clear level** (lower = stronger).

### ✨ Other Features

- 📖 **Opening intro / gameplay demo / clear celebration**: the start screen has a fictional backstory + gameplay primer (with a `🔪━👹━🔪` chain-through-monster demo) and a tribute note; your **first-ever run** is guaranteed a “sword–monster–sword” combo to learn the core move immediately; surviving all 10 Overlord waves shows a story-flavored congratulations screen.
- 🔴 **Red log for bosses**: the game log sits right under the status bar and board; **it turns red while a boss is on the board** as a warning.
- 💾 **Local save**: progress and best record are saved automatically; resume your last run anytime.
- 💡 **Tap any tile**: see its description and current live stats (e.g. your current sword power and flat bonus); tap the HUD to view all your stats and class details.
- 🩸 **Low-HP warning**: the screen edges redden as health drops, pulsing when critical, with the HP bar blinking too.
- ☠️ **Death report**: when you fall, it lists each damage source's share of the killing turn.
- 🎬 **Record / replay**: every run is recorded (seed + input sequence — deterministic replay, ~2–4 KB per run). After death you can **replay / copy / export / 🔗 share-link** the recording; the start screen offers **replay last run** or **paste-import** someone else's. Replay supports pause and 1×/2×/4× speed.
- 🏆 **Cloud leaderboard + percentile (Release build `dungeonraid.win` only)**: after death, see your rank and percentile on the **overall** and **per-race** boards. Ranked by **turns survived**, **bucketed by version**; recordings are deterministically replayed, the board **shows verified scores only**, and the top is re-verified hourly to block cheats. The Dev build does not participate in ranking.
- 🏅 **Human / AI boards**: scores are split by `agent` (human / ai) and never mixed. The in-game "🏆 Leaderboard" panel toggles between **Human / AI** and **Survival / Clears**, and **filters by race** (All / Human / Elf / Dwarf / Orc), showing the Top 10. Real play reports to the human board; AI/bots self-report `ai` (backend `/top?agent=&race=`, `/clearboard?agent=&race=`, private reclassify endpoint `/classify`). Write endpoints are IP-rate-limited.

### 🛠️ Development / Balance Testing

`playtest.js` is a **headless bot** that loads the real game logic from `dungeon-raid.html` (with DOM/Canvas stubbed out), plays automatically with a greedy strategy, and reports survival turns and levels reached per race/class line — handy for balance regression testing.

```bash
node playtest.js                  # scan mode: 4 races × several enemy-stat sets, find the closest to the target turn

# Targeted mode: pin a class line or a single boss, run detailed stats for comparison
node playtest.js --race=orc                          # test Orc only
node playtest.js --race=human --t1=knight --t2=immortal   # pin tier-1 / tier-2
node playtest.js --boss=zombie                       # only spawn the Zombie (isolate one boss)
node playtest.js --race=elf --boss=assassin --games=40    # combine + custom game count
node playtest.js --race=dwarf --enemy=C2             # pick an enemy-stat candidate (defaults to live file values)
```

Flags: `--race=` (human/elf/dwarf/orc), `--t1=`/`--t2=` (class-line id), `--boss=` (the only boss that spawns), `--enemy=` (enemy-stat candidate, defaults to live file values), `--games=` (games per config), `--report` (full per-race table). Targeted mode also prints: mean/max turns, tier-1/tier-2 reach rate, and the killing turn's main cause-of-death share.

```bash
node playtest.js --replay=run.json   # Replay a recording exported from the game (deterministic re-run); prints the outcome / cause of death — handy for analyzing real human play
```

See [`TEST_REPORT.md`](TEST_REPORT.md) for baseline data (versioned, for regression comparison) and [`CHANGELOG.md`](CHANGELOG.md) for the change history.

---

## 📄 License

MIT
