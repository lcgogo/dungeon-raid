# 平衡测试报告 · Balance Test Report

## 1. 基本信息

| 项目 | 内容 |
|---|---|
| 游戏版本 | `vX.Y.Z` |
| 报告日期 | YYYY-MM-DD |
| 测试文件 | `dungeon-raid.html` / `dungeon-raid-dev.html` |
| 测试工具 | `test/tools/playtest.js` |
| 主报告命令 | `node test/tools/playtest.js --report --games=N` |
| 敌人数值 | 实时文件值 / 候选值：`...` |
| 随机性 | 固定种子 / 确定性 RNG / 其他：`...` |
| 回归套件 | `bash deploy/dr.sh test` → `.../N PASS` |

> 主表必须来自同一条命令、同一组输入。专项结果另列，不与主表混合。

## 2. 默认职业线主表（每配置 N 局）

| 种族 | 一阶/二阶 | 回合中位 | 回合均值 | 最高回合 | 等级中位 | 达一阶 | 达二阶 | 最终致死来源（死亡当回合） |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 人族 | `.../...` |  |  |  |  |  |  |  |
| 精灵 | `.../...` |  |  |  |  |  |  |  |
| 矮人 | `.../...` |  |  |  |  |  |  |  |
| 兽人 | `.../...` |  |  |  |  |  |  |  |
| 亡灵 | `.../...` |  |  |  |  |  |  |  |
| 神兽 | `.../...` |  |  |  |  |  |  |  |

说明：`最终致死来源` 只统计死亡当回合 `dmgBy` 中的最高来源，不代表整个 run 的累计伤害或 Boss 总威胁。

## 3. 生存与职业线解读

### 按存活回合中位数

1. `...`
2. `...`

### 按最高回合

1. `...`
2. `...`

结论必须写明样本量，并区分“最稳”和“最高上限”。

## 4. Boss 专项

专项命令：

```bash
node test/tools/playtest.js --report --boss=<id> --games=N
```

| Boss | 条件 | 种族 | 回合中位 | 回合均值 | 达一阶 | 达二阶 | 最终致死来源 |
|---|---|---|---:|---:|---:|---:|---|
| `<id>` | 仅该 Boss，实时敌人数值 |  |  |  |  |  |  |

专项结论：

- 隔离测试说明：`...`
- 与完整 Boss 池的差异：`...`
- 间接效果或多回合压力是否会被最终致死统计低估：`...`

## 5. 回归

- `finaletest` → PASS/FAIL
- `milestonetest` → PASS/FAIL
- `savetest` → PASS/FAIL
- `sticktest` → PASS/FAIL
- `fxpointtest` → PASS/FAIL
- `swtest` → PASS/FAIL
- `thresholdtest` → PASS/FAIL
- `scorertest` → PASS/FAIL

## 6. 限制

- 样本量：`...`
- AI 策略：`...`
- 不代表真人玩家表现：是/否
- 其他限制：`...`

