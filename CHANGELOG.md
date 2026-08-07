## [v1.62.0]

> Version-Impact: verify

- 朱雀主动改为「涅槃 Nirvana」：俏皮话为“死亡即新生！”。本回合被击败不会死亡，生命上限永久增加 ⌊当前等级/2⌋，并恢复到新生命上限的 50%。
- Vermilion Bird’s active is now **Nirvana** with the quip “Death is new life!”. Lethal damage this turn no longer kills the player; max HP permanently increases by ⌊current level/2⌋ and HP is restored to 50% of the new max HP.

## [v1.61.1]

- 玄龟二阶被动中文名改为「恐鳌之心」，英文名改为 **Heart of Tarrasque**；内部技能 ID 保持不变，不影响录像兼容。
- Renamed the Black Tortoise tier-two passive to **Heart of Tarrasque** (恐鳌之心); the internal skill ID is unchanged, so replay compatibility is unaffected.

## [v1.61.0]

> Version-Impact: verify

- 玄龟二阶被动「厚土玄甲 Tortoise Heart」改为每回合恢复当前生命的 10%，不再填充护甲进度。
- Black Tortoise’s tier-two passive **Tortoise Heart** now restores 10% of current HP each turn instead of filling Armor progress.

## [v1.60.0]

> Version-Impact: verify

- 岩浆魔现在每回合仍会融化棋盘上的全部盾牌，但不再把盾牌转化为自身生命；其原有的吸收火焰机制保持不变。该 Boss 机制变化会影响战斗结果与录像验证。
- Magmafiend still melts every shield on the board each turn, but no longer converts those shields into HP. Its existing fire-absorption behavior is unchanged. This boss-mechanic change affects combat outcomes and replay verification.

## [v1.59.0]

> Version-Impact: verify

- 新增第六种族「神兽 Mythic Beasts」及 `🐾 爪 / Claw` 武器。共享特性「神识」使获得经验 ×2，弱点「阴阳失衡」使敌人攻击倒计时 -1（最低 1）；新增青龙「龙吟」（全场造成等同等级的伤害，100 级被动「龙威」使使用任意主动后普通怪攻击减半）、白虎「白虎破军」、玄龟「玄甲镇岳」（立即 +1 减伤）、朱雀「涅槃天火 Phoenixfire」四条职业线及对应二阶被动。白虎可让爪链命中爪免疫 Boss，朱雀具备群体伤害与复生能力；所有新动作均接入确定性录像回放路径。
- Added the sixth race, **Mythic Beasts**, with the `🐾 Claw` weapon, **Divine Sense** (2× XP), and the Yin-Yang Imbalance countdown weakness. Added Azure Dragon (**Dragon Roar**, dealing level-based damage to all foes, with level-100 **Dragon Might** halving normal-monster attack after any active skill), White Tiger, Black Tortoise (**immediately gain +1 damage reduction**), and Vermilion Bird class paths with their tier-two passives; White Tiger can pierce Claw immunity, while Vermilion Bird has area damage and rebirth tools. All new actions are wired into deterministic replay.

## [v1.58.0]

> Version-Impact: verify

- 下调守财奴「囤金 Hoard」新版本金投资的收益：4 回合后返还倍率从 **2.5 倍** 降到 **1.2 倍**，保留“投入当前手头金币、期间新金币照常进账、商店/其它技能可用”的机制，但显著压低滚雪球速度。同时调整「钱能买命 Money Buys Life」为更简单的口径：囤金期间受伤时只扣**手头金币**，手头金币不够时剩余伤害才掉血，**不消耗囤金本金**；囤金到期结算也放到敌人行动之后，让最后一回合的伤害仍会先触发钱能买命，再结算返还。由于这会改变金币路径、受伤结果与后续决策，本次按 replay / verify 影响处理。
- Reduced Miser **Hoard**’s new principal-investment payout from **2.5×** to **1.2×** after 4 turns. It still invests current gold while newly earned gold, shops, and other skills remain available, but the snowball is much smaller. **Money Buys Life** now uses the simpler rule while Hoard is active: incoming damage spends **wallet gold only**; if wallet gold runs out, the remainder spills into HP and invested Hoard gold is never spent. Hoard also matures after enemy actions, so damage on the last locked turn is still checked before the payout resolves. Because this changes gold paths, damage outcomes, and downstream decisions, this release is treated as replay / verify impacting.

## [v1.57.1]

- 精简人物栏文案：HUD 里的「护甲进度」改为「护甲」，「等级经验」改为「经验」，角色属性弹框里的对应行也同步收短；同时把说明里的“攒满 +1 护甲”统一改成更准确的“攒满 +1 减伤”。英文对应从 “Armor XP / Level XP” 改为 “Armor / XP”，并用 “damage reduction” 解释实际效果。这是纯 UI 文案调整，不改数值、录像或 verify 兼容。
- Simplified the character HUD labels: “Armor XP” is now “Armor”, “Level XP” is now “XP”, and the matching player-detail rows use the shorter labels too. The wording now says the bar grants “+1 damage reduction” instead of “+1 armor” to better describe the actual effect. This is UI text only; no numbers, replay, or verify behavior changed.

## [v1.57.0]

> Version-Impact: verify

- 重做了守财奴「囤金 Hoard」的主动机制：现在发动时会把**当前手头金币**一次性投入囤金，4 回合后按**剩余投入金币的 2.5 倍**返还；期间新获得的金币会照常进账，也可以继续使用商店和其它技能。这样它作为 350 级跨界主动时也能直接吃到你已有的本金，不再只是被动等待未来 4 回合碰巧赚到的钱。「钱能买命」也同步改为受伤时先扣囤金本金、不够再扣手头金币，最后才掉血；若本金被打掉，到期返还自然按剩余投入计算。同时审查了 350 级跨界主动限制：跨界主动默认按当前角色属性和已获得被动结算，不额外要求原职业；只隐藏永久无效选择（目前主要是无甲角色不能选锻甲），其它原职业被动只算协同加成。另补充了斧王「嘲讽 Taunt」短描述里的“受伤转生命上限”。由于金币路径、商店可用性和后续决策会改变，这次按 replay / verify 影响处理。
- Reworked Miser’s **Hoard** active: it now invests your **current gold** immediately, then pays back **2.5× the remaining invested gold** after 4 turns. New gold earned during Hoard is banked normally, and shops / other skills remain usable, making Hoard useful as a 350-turn crossover active with the gold you already have. **Money Buys Life** now spends invested Hoard gold first, then current gold, and only spills into HP after both run out; if invested gold is spent this way, Hoard’s final payout naturally uses the remaining amount. Crossover actives were also audited: they resolve from current stats and acquired passives without requiring their original class, and only permanently invalid picks are hidden (currently, no-armor characters cannot choose Forge Armor); original-class passives remain synergies, not requirements. Axe Lord’s **Taunt** short description now also mentions that incoming damage raises max HP. Because this changes gold paths, shop availability, and downstream decisions, this release is treated as replay / verify impacting.
- 补强人类榜自动改判的 AI 可疑度模型：新增“整局毫秒级操作间隔 / 长局超人类速度”的硬信号，并避免这类硬证据被 `cv` 波动或后期变慢等真人样软特征抵消；曾漏判的 `uplb2zcs`（350 回合、medianDt=1ms、p90=4ms）现在会打到 Very High。可疑度报告表格也新增 median / p90 / ≤20ms 比例，`dr.sh test` 与 Windows 脚本同步纳入 scorer 回归，避免自动改判工具再静默退化。该调整只影响榜单运营分类工具，不改游戏引擎、录像重放或 verify 结局。
- Hardened the human-board auto-reclassification scorer with explicit impossible-timing signals: full-run millisecond action intervals and long-run sub-human reaction times now count as hard evidence, and those cases are no longer offset by high `cv` or late-run slowdown heuristics. The previously missed `uplb2zcs` run (350 turns, medianDt=1ms, p90=4ms) now scores Very High. Suspicion reports also show median / p90 / ≤20ms rate, and both `dr.sh test` and the Windows script include the scorer regression suite so the classifier cannot silently regress again. This only affects leaderboard operations tooling, not the game engine, replay, or verify outcomes.

## [v1.56.4]

- 修正了回放跳转 / 步进时可能残留召唤师召唤线特效的问题：召唤师的纯视觉 SVG 连线现在和其它拉线特效一样，会在无头与回放快进阶段被抑制，并在退出回放或跳转回合时统一清理临时特效层，避免之前一路快进过的紫色召唤线堆在当前画面上。该修复只影响视觉特效，不改召唤结果、回合顺序、数值，也不影响录像 / verify 兼容。
- Fixed a replay visual cleanup issue where Summoner summoning tethers could linger after replay jumps or step navigation. The Summoner’s SVG-only tether effect is now suppressed during headless / replay fast-forward paths like other tether effects, and transient effect layers are cleared when leaving replay or jumping turns, so purple lines from fast-forwarded turns no longer pile onto the current view. This only affects visuals, not spawn results, turn order, numbers, replay, or verify compatibility.

## [v1.56.3]

- 下调了人类榜自动改判到 AI 榜的门槛：GitHub Actions 现在会把**前 200 条人类榜录像里所有 `score >= 25` 的条目**都自动改判到 AI 榜，而不再只处理 `Very High / score >= 65`。`Low / Medium / High / Very High` 这四档仍然保留为“可疑度标签”，不再等同于是否会自动改判；因此新策略会更激进，一部分 `Medium` / `High` 风险录像也会直接移到 AI 榜。此改动属于榜单运营策略调整，不改录像回放、战斗数值或 verify 语义。
- Lowered the automatic human→AI leaderboard reclassification line: GitHub Actions now auto-reclassifies **every top-200 human-board replay with `score >= 25`** to the AI board, instead of only handling `Very High / score >= 65`. The existing `Low / Medium / High / Very High` buckets are still kept as suspicion labels only, so they no longer match the final reclassification boundary one-to-one; under this more aggressive policy, some `Medium` / `High` recordings will also move straight to the AI board. This is a leaderboard-operations policy change only — no replay engine, combat math, or verify semantics are altered.

## [v1.56.2]

- 修正了 350 级跨界主动的一个纯视觉问题：当你把狙击这类带“从技能按钮发出连线”特效的主动换到 💊 治疗槽或 💥 炸弹槽后，连线现在会从**实际占用的那个槽位**发出，而不再错误地总是从左侧的一阶主动技能按钮发出。该修复只影响特效起点，不改技能效果、数值、顺序，也不影响录像 / verify 兼容。
- Fixed a visual-origin bug for 350-level crossover actives: if you swap a beam/tether-style active such as Snipe into the 💊 Heal slot or 💥 Bomb slot, the effect now starts from the **actual occupied slot** instead of incorrectly always firing from the left-side tier-1 active button. This only changes the effect origin, not the skill’s behavior, numbers, turn order, or replay / verify compatibility.

## [v1.56.1]

- 调整了火枪手（Musketeer）的俏皮话文案：把那句台词收紧为「有人为你出了个好价钱。」/ “Someone put a good price on you.”，去掉前缀式的“狙击—— / Snipe —”，让口吻更自然一点。这是纯文本润色，不改数值、顺序，也不影响录像 / verify 兼容。
- Tightened the Musketeer quip text to “有人为你出了个好价钱。” / “Someone put a good price on you.”, removing the prefixed “狙击—— / Snipe —” so the line reads more naturally. This is text-only polish — no stat, turn-order, replay, or verify behavior changes.

## [v1.56.0]

> Version-Impact: verify

- 下调了斧王（Axe Lord）主动「嘲讽 Taunt」在承受集火时的滚雪球强度：现在在那一轮被你主动拉来的攻击中，只有**实际伤害的 10%** 会转化为**永久最大生命**，并保留**至少 +1** 的下限；原先是 50%。这样它仍然保留“挨打换成长”的职业身份，但不会再那么容易靠一轮集火把生命上限抬得过快。由于这个数值会改变同种子 + 同操作序列下的实际结局，这次按 verify / replay 影响处理，升 minor 并开启新的版本桶。
- Nerfed Axe Lord’s active **Taunt** so its taunt-window snowball is much smaller: during the forced enemy volley, only **10% of the actual damage you take** is now converted into **permanent max HP**, while still keeping the **minimum +1** floor; previously it was 50%. That preserves the skill’s “get hit to grow” identity without letting a single focus-fire turn inflate max HP so aggressively. Because this value can change the real outcome of the same seed + action sequence, this release is treated as verify / replay impacting and therefore bumps the minor version bucket.

## [v1.55.3]

- 正式版现在会把最近成功拿到的 1 枚服务端 seed 作为本地 warm seed 暂存起来：页面启动时只读取/清理本地缓存、不主动申请；当你下一次进入「选择种族」页时，若这枚 seed 仍未过期且版本匹配，就会优先把它留给下次开局直接消费，只有本地没有可用 warm seed 时才会再向 API 预取新的那 1 枚。这样既能把等待进一步藏到上一局之后或上一次访问期间，又不会像“首页一打开就囤 3–5 枚”那样平白放大 KV 写入与在线领票成本。若本地 warm seed 失效、版本变更、请求仍在路上或最终失败，依旧保留原来的现拉 + 本地随机兜底逻辑，因此不影响离线可玩性，也不改录像 / verify 兼容。
- Release builds now keep at most one recently acquired server seed as a local warm seed. Page boot only reads / prunes that cache and never auto-requests more; the next time you enter race select, a still-valid same-version warm seed is held back for immediate consumption on the next run start, and only when no usable local warm seed exists do we prefetch a fresh replacement from the API. That hides even more of the wait in the time after the previous run or between visits, without turning page load into “stockpile 3–5 tickets” and needlessly amplifying KV writes or seed issuance. If the warm seed has expired, the version changed, the request is still in flight, or the fetch ultimately fails, the existing live-fetch + local-random fallback path still applies, so offline playability and replay / verify compatibility remain unchanged.

## [v1.55.2]

- 正式版现在会在你进入「选择种族」页后先预取 1 枚服务端 seed，并在你真正点下种族时优先复用同 race + version 的那枚结果；这样大多数等待都会被藏在你浏览 / 犹豫选种族的那段时间里，不再把整段 seed 请求都暴露在「点种族后卡一下」这一步。若预取没命中、还在请求中或最终失败，仍保留原来的补拉与本地随机兜底逻辑，因此不影响离线可玩性，也不改录像 / verify 兼容。
- Release builds now prefetch one server seed as soon as you enter the race-select screen, then try to reuse the matching race + version result when you actually tap a race. In practice that hides most of the wait inside the time you spend browsing / hesitating on the race picker instead of exposing the whole seed fetch right after the tap. If the prefetch misses, is still in flight, or ultimately fails, the old fallback path still applies (retry live, then fall back to a local random non-ranked run), so offline playability and replay / verify compatibility stay unchanged.

## [v1.55.1]

- 普通怪同回合连续出手时，底部小日志现在会自动汇总成一条摘要，例如 `👹 2 只普通怪攻击：3 + 7 → 共掉 10 血！`。这样即使底部日志条仍然只显示最近两行，你也不会再只看到最后一只怪的攻击；想看更完整的逐步过程，仍可点开日志历史。此改动只调整日志呈现，不改战斗数值、顺序，也不影响录像 / verify 兼容。
- Same-turn hits from multiple normal enemies are now collapsed into a single compact summary line in the bottom log, for example `👹 2 normal enemies attack: 3 + 7 → 10 HP lost!`. That means the two-line mini log no longer makes it look like only the last normal enemy attacked; if you want the full step-by-step history, you can still expand the log. This change is presentation-only: no combat math, turn order, replay, or verify behavior changed.

## [v1.55.0]

> Version-Impact: verify

- 修正了一个会让“多只怪同回合应同时出手”却被漏算的敌方回合 bug：像鸟人（Birdman）这类会在自己行动中换位的怪/Boss，之前可能把后面排队、同样已到出手时机的另一只怪从快照里的原格子挪走，导致 `advanceEnemies()` 误以为它已被移除而直接跳过，所以你会看到“棋盘上明明有多只怪该打你，结果只记了一条攻击、也只掉了一只怪的血”。现在如果行动者只是被同回合内的其它效果换位，系统会继续按它当前所在格让它完成这一次应有的出手；只有真的离场/被替换时才跳过。同时补了两条回归测试：一条覆盖“两只鸟人同回合同时行动”场景，另一条把多只普通怪的连续出手汇总成一条摘要日志（例如 `👹 2 只普通怪攻击：3 + 7 → 共掉 10 血！`），避免底部小日志条只显示最后一只怪的攻击。完整日志历史仍可点开查看。
- Fixed an enemy-phase bug that could drop one of several ready attackers from the same turn. Movers such as Birdman can swap positions during their own action; previously that could pull another already-ready monster/boss out of its snapshotted cell, causing `advanceEnemies()` to mistake it for a removed actor and skip its attack entirely. The turn loop now follows actors that were merely relocated within the same turn and only skips ones that were actually removed or replaced. Two regression tests now cover both the “two Birdmen act in the same turn” case and the new normal-enemy summary log behavior. Regular enemy hits in the same enemy phase are now collapsed into one compact line (for example, `👹 2 normal enemies attack: 3 + 7 → 10 HP lost!`), so the bottom log no longer hides earlier hits just because it only shows the latest two lines. Full log history is still available on tap.

## [v1.54.4]

- 会长（Guild Master）的「收买 Buyout」现在新增更直观的花钱反馈：当你成功花金币把全场普通怪买通成金币时，会从 HUD 上显示金币数量的位置向每只被买通的怪拉出金色连线，更容易看清这次钱是花到哪些怪身上了。这是纯视觉增强，不改数值、目标、顺序，也不影响录像 / verify 兼容。
- Guild Master’s Buyout now has clearer spend feedback: when you successfully pay gold to bribe all regular enemies into coins, golden tethers stretch from the HUD gold counter to each bribed enemy so it is much easier to see where that money went. This is visual-only polish — no stat, targeting, turn-order, replay, or verify behavior changes.

## [v1.54.3]

- 给僵尸（Zombie）的尸毒发作补上了更直观的绿线提示：当潜伏结束后它真的让你掉血时，现在会从僵尸所在格向 HP 条拉一条绿色感染线。这样你不仅能看见血条继续保持感染态的绿色，也能一眼看清这一下掉血就是哪只僵尸引发的。这是纯视觉增强，不改数值、顺序，也不影响录像 / verify 兼容。
- Added clearer visual feedback to Zombie plague ticks: once incubation ends and the Zombie actually makes you lose HP, it now draws a green infection tether from the Zombie’s tile to the HP bar. That way you not only see the bar staying infected-green, but can also immediately tell which Zombie caused that HP loss. This is visual-only polish — no stat, turn-order, replay, or verify behavior changes.

## [v1.54.2]

- 修正吸血鬼吸心与饕餮吞怪吸取线在部分移动浏览器上的显示回归：此前即使目标坐标已恢复为有效点位，若浏览器本身不支持 SVG 线段的 `element.animate()`，吸取线仍会因初始 `stroke-dashoffset=len` 而一直保持全隐藏，直到整层 SVG 被移除。现在这类浏览器会回退为“直接显示一小拍”的兼容路径，因此吸血鬼吸心、饕餮吞怪，以及共用这套吸取线 helper 的相关吸取特效都会重新可见。这仍是纯视觉修复，不改数值、顺序，也不影响录像 / verify 兼容。
- Fixed a mobile-browser regression affecting Vampire heart-drains and Devourer growth tethers: even after point targets were accepted again, browsers that do not support `element.animate()` on SVG lines still kept the tether fully hidden because it started at `stroke-dashoffset=len` and never advanced before the whole SVG layer was removed. Those browsers now fall back to showing the line directly for a brief beat, so Vampire drains, Devourer siphons, and the related shared drain-line effects are visible again. This remains a visual-only fix — no stat, turn-order, replay, or verify behavior changes.

## [v1.54.1]

- 修正饕餮（Devourer）吞怪涨血特效的回归问题：此前共用吸取线函数把「宽高为 0、但 left/top 有效」的点目标也误判成无效，结果拉线终点若是饕餮本体格心，整条吸取线就会直接不画。现在恢复为：饕餮每次从普通怪身上吸血时，都会继续把吸取线拉回自身，方便看清它这回合到底吃了谁。这是纯视觉修复，不改数值、顺序，也不影响录像 / verify 兼容。
- Fixed a Devourer growth-line regression: the shared drain-line helper was still rejecting valid point targets whose width/height were 0 even when their left/top coordinates were real, so if the tether was meant to end at the Devourer’s own board-center point the whole line was skipped. Devourer drains now correctly draw back into the boss again whenever it siphons regular enemies, making it clear what it fed on that turn. This is a visual-only fix — no stat, turn-order, replay, or verify behavior changes.

## [v1.54.0]

> Version-Impact: verify

- 树人职业的当前内部 canonical id 由 `elder` 迁到 `treant`，并补上旧 id `elder → treant` 的兼容归一化：旧录像里的转职动作、旧存档里的 `player.tier1`、以及开发工具传入的 `--t1=elder` 仍然会被自动解析到树人，不会因为这次内部更名而失效。对玩家可见的职业显示仍然继续是「树人 Treant」，只是代码和工具入口终于与当前名称一致。
- Migrated the Treant class’s active canonical internal id from `elder` to `treant`, while adding legacy normalization for `elder → treant`. Old replay tier-choice actions, old saves containing `player.tier1`, and developer tooling inputs such as `--t1=elder` still resolve to Treant automatically, so the internal cleanup does not strand existing data. Player-facing naming remains “Treant” — the code and tooling now finally match it.

## [v1.53.1]

- 给饕餮（Devourer）的“吞怪涨血”补上了更直观的吸取线特效：每当它从普通怪身上吸血时，会从被吸的怪格子拉线回到饕餮本体，方便一眼看清它这回合到底吃了谁。这是纯视觉增强，不改数值、不改顺序，也不影响录像 / verify 兼容。
- Added clearer siphon-line feedback to the Devourer growth step: whenever it drains HP from regular enemies, animated tethers now pull from those enemies back into the Devourer so you can immediately see what it fed on that turn. This is visual-only polish — no stat, turn-order, replay, or verify behavior changes.

## [v1.53.0]

> Version-Impact: verify

- 调整饕餮（Devourer）的结算顺序：当它倒计时归零时，现在会先按【当前血量的 50%】释放强击，再在这一下结算完后吞场上普通怪涨血。这样玩家眼前看到的“当前攻击”就是它马上要打出来的数值，不会再出现“上一拍看到 52，真正出手前又被抬高到 58”这种不直观体验；同时同步更新了饕餮的游戏内说明与文档描述。
- Fixed a readability problem in the Devourer turn order: when its countdown hits 0, it now attacks first for【50% of its current HP】and only then devours regular enemies to grow. That makes the on-screen “Attack now” value match the hit the player is actually about to take, instead of jumping upward right before impact; the in-game tooltip and docs now describe that sequence explicitly.

## [v1.52.1]

- 修正吸血鬼每回合吸心的回归问题：上一版把“先消失一拍再落子”的判定抽到通用吸取线函数后，把“宽高为 0 的点目标”也误判成无效目标，导致吸血鬼本体作为吸取终点时整条吸取线直接不画。现在恢复为：吸血鬼吸心时，普通心 / 毒心都会继续分别拉向吸血鬼本体，同时仍保留“先消失一拍、再开始落子”的节奏。
- Fixed a Vampire heart-drain regression: when the vanish-before-fall pacing check was generalized in the shared drain-line helper, it also rejected valid point targets with zero width/height, so the Vampire itself stopped qualifying as a drain destination and the tether never rendered. Vampire drains now correctly draw back into the boss again for both normal and poison hearts, while keeping the brief vanish-before-refill beat.

## [v1.52.0]

> Version-Impact: verify

- 亡灵新增第 4 职业「巫妖 Lich」：主动「冰封球 Frost Orb」会对全场怪物/Boss（终焉之主除外）造成一次当前固定伤害，并让它们的当前攻击倒计时 +1；锁定二阶被动为「冰甲 Ice Armor」，每次你受到怪物/Boss 攻击后会对攻击者反弹 50% 当前固定伤害（至少 1），并让它当前攻击倒计时 +1。与此同时，吸魂、吸血鬼吸心、岩浆魔融盾这几类“棋子先消失再补位”的特效，现在会让空格先短暂停留一拍，再开始落子，手机上更容易看清哪些棋子先被吸走或融掉。
- Added a fourth Undead class, **Lich**. Its active **Frost Orb** deals your current flat damage once to all monsters/bosses on the board (excluding the Overlord) and adds +1 to their current attack countdown, while its locked tier-2 passive **Ice Armor** reflects 50% of your current flat damage back to attackers (minimum 1) and slows their next attack by +1 countdown. At the same time, Soul Drain, Vampire heart-drain, and Magmafiend shield-melt turns now briefly hold emptied cells before refill begins, making it much easier on mobile to read which pieces vanished before the falling tiles start.

## [v1.51.1]

- 吸血鬼每回合吸心现在新增更清楚的视觉反馈：普通心与毒心会分别用不同颜色的吸取线拉向血条，吸血鬼本体也会在吸血/反噬时给出对应颜色的短脉冲，更容易一眼分辨这次吸心是回血还是中毒。
- Vampire heart-drain turns now have clearer visuals: normal hearts and poison hearts use different-colored drain lines toward the HP bar, and the Vampire itself emits a matching short pulse on successful drain vs poisonous backlash, making the result of each drain much easier to read at a glance.

## [v1.51.0]

> Version-Impact: verify

- 新增功能性 Boss「岩浆魔 Magmafiend」：它每回合都会从自己身上向场上所有盾牌发出熔热线，把这些盾牌全部融掉，并按当前“每盾护甲进度”把每面盾转成自己的回血；同时它还会吸收火焰，点燃与火墙本应造成的火伤都会改为为它回血。这样它不仅克制护甲/盾流，也会对火法师的持续灼烧形成针对。
- Added a new functional boss, **Magmafiend**. Each turn it sends molten tethers from itself to every shield on the board, melts them all away, and converts each shield into HP using the current “armor XP per shield” value; on top of that, it feeds on fire, so burn and Firewall damage heal it instead. This makes it a clear counter not only to shield/armor lines, but also to Fire Mage’s sustained fire damage.

## [v1.50.1]

- 种族显示名由「活死人 Undead」统一收紧为「亡灵 Undead」，用于贴合当前种族下死灵 / 骷髅王 / 屠夫等整条职业生态；内部种族 id `undead` 保持不变，因此不影响存档、回放与测试兼容。
- Tightened the race display name from “活死人 Undead” to “亡灵 Undead” to better match the current class ecosystem under that race (Necromancer / Skeleton King / Butcher); the internal race id `undead` stays unchanged, so save/replay/test compatibility is unaffected.

## [v1.50.0]

> Version-Impact: verify

- 新增功能性 Boss「鞭笞者 Lashmaster」：它和小丑一样属于每回合生效型 Boss，本体只吃炸弹；出场时会先让场上所有普通怪物的攻击倒计时 -1，之后每回合再让所有普通怪物的攻击倒计时 -1。它自己未必最疼，但会把整盘普通怪一起抽进暴走节奏，尤其会对冲活死人的“迷惑 +1 倒计时”缓冲。
- Added a new functional boss, **Lashmaster**. Like the Clown, it is a per-turn utility boss and is bomb-only itself; on spawn it immediately gives all normal enemies -1 attack countdown, then repeats that -1 countdown push every turn after that. It is not necessarily the hardest hitter on its own, but it whips the whole board into a much faster rhythm and partially cancels out the Undead race’s “+1 enemy countdown” buffer.

## [v1.49.0]

> Version-Impact: verify

- 修正幽灵 Ghost 的实际血量成长：实现上它之前虽然吃的是普通怪模板，却仍额外乘上了 Boss 档位倍率，和“血量与同级普通怪一致”的文案不符。现在给幽灵补上 `noTierScale`，让它终于真正按同级普通怪血量生成；仍保留剑免疫、仅能被炸弹/非武器手段处理、倒计时重击等定位。
- Fixed Ghost’s actual HP scaling: although it already used the normal-enemy HP template, the runtime was still multiplying that HP by the boss tier, which contradicted the “same HP as same-tier normal enemies” wording. Ghost now has `noTierScale`, so it truly spawns with normal-enemy HP while keeping its sword immunity, bomb/non-weapon weakness, and countdown heavy strike identity.

## [v1.48.0]

> Version-Impact: verify

- 兽人新增第 4 职业「斧王 Axe Lord」：主动「嘲讽 Taunt」会把场上所有敌人/Boss（终焉之主除外）的攻击倒计时压到 1，也就是让它们在下回合立刻出手；而在这批攻击中，你受到的**实际伤害的 50%** 会转化为**永久最大生命**。
- 斧王锁定二阶被动为「越挫越勇 Unbroken」：每次你受到一次伤害时，永久获得 **+1 最大生命**。这条路线把兽人的“无甲高血”思路进一步推成“主动开团、挨打一轮、把伤害转成成长”的坦克型玩法。
- Added a fourth Orc class, **Axe Lord**. Its active **Taunt** forces all enemies/bosses on the board (excluding the Overlord) to attack on the next turn by setting their countdown to 1, and during that volley **50% of the actual damage you take** becomes **permanent max HP**.
- Axe Lord’s locked tier-2 passive is **Unbroken**: whenever you take damage, gain **+1 permanent max HP**. This pushes Orc further toward a proactive “start the brawl, eat a round, and turn that pain into growth” tank line.

## [v1.47.0]

> Version-Impact: verify

- 活死人死灵的锁定二阶被动由「回春 Rejuvenation」重做为「竭心光环 Wither Aura」：不再提供主动技能冷却 -1，而是改为按你每回合恢复量（受治疗减半影响）先扣自己同等生命，再让全场敌人/Boss 各损失同等生命。也就是说，活死人会先把 regen 按减疗折算，再用这个折算后的数值同时结算自损与光环伤害；即使满血导致本回合实际没回上来，光环也仍按这档恢复量工作。顺手修正了录像在击败里程碑 Boss 后的状态快照：现在会在 `onBossKilled()` 后立刻更新并保存 `rec.maxHp/level/gold/turns`，避免像竭心光环这类“击败 Boss 才获得的新被动”被结算页继续沿用旧录像快照、导致提交时少算新效果。
- Reworked the Undead Necromancer’s locked tier-2 passive from **Rejuvenation** into **Wither Aura**: instead of reducing active-skill cooldowns by 1, it now first drains the player for the regen amount after healing modifiers, then deals that same amount to all enemies/bosses. In practice, Undead first applies its healing penalty to regen, then uses that reduced value for both self-drain and aura damage; even when you were already full and healed 0 in practice, the aura still uses that modified regen value. Also fixed the recording snapshot after milestone-boss kills: `onBossKilled()` now immediately refreshes and saves `rec.maxHp/level/gold/turns`, preventing newly unlocked effects such as Wither Aura from being evaluated against a stale run snapshot on the result screen.

## [v1.46.0]

> Version-Impact: verify

- 重做升级项「凝聚生机 Channel Vitality」的成长方式：不再是每次固定 +1 回血，而是按选择次数递增——第 1 次选择后每回合回 1，第 2 次再额外 +2（合计 3），第 3 次再额外 +3（合计 6），依此类推。这样它终于会随着投入次数显著变强，而不是一直停留在后期几乎没人会点的平缓档。
- 活死人种族说明文案收紧：把「攻击倒计时 +1（更慢出手）」精简成「攻击倒计时 +1」，并删去治疗减半里的「重生满血不受影响」补充说明，避免和技能自身描述重复。
- Reworked the upgrade **Channel Vitality** so it no longer gives a flat +1 regen every time. Instead it now scales by pick count: the 1st pick grants +1 per turn, the 2nd adds +2 more (total 3), the 3rd adds +3 more (total 6), and so on. This makes repeated investment meaningfully stronger instead of staying in the late-game “almost never worth taking” zone.
- Tightened the Undead race wording: “attack countdown +1” now stands on its own without the extra “attack 1 turn slower” gloss, and the healing penalty no longer repeats the separate Rebirth exception that is already explained on the skill itself.

## [v1.45.3]

- 清理误提交到仓库的本地回归报告 `.reports-local-scorer-regression.json`，并把 `.reports-local-*.json` 加入 `.gitignore`，避免这类本地产物再次随正式版一起进仓。
- Cleaned up the accidentally committed local regression report `.reports-local-scorer-regression.json` and added `.reports-local-*.json` to `.gitignore`, so local report artifacts do not ride along with future releases.

## [v1.45.2]

- 兽人职业 `berserker` 的显示名调整为「牛头人 / Tauren」，用于统一当前游戏与文档中的称呼；内部职业 id `berserker`、种族 id `orc` 保持不变，因此不影响存档、回放与测试兼容。
- 兽人斗士锁定被动「血狂 Blood Frenzy」的说明去掉“无视护甲”字样：兽人本身无甲，这里直接写成每回合结束损失 5% 最大生命，避免重复强调不会实际生效的护甲交互。
- Renamed the display name of the Orc class `berserker` to “牛头人 / Tauren” across the current game/docs; the internal class id `berserker` and race id `orc` stay unchanged, so save/replay/test compatibility is unaffected.
- Removed the “ignores armor” wording from the Orc Fighter passive **Blood Frenzy** in game/docs: Orcs are already armorless, so the description now simply says it loses 5% max HP each turn instead of restating a non-interaction.

## [v1.45.1]

- 回放/分享录像详情弹框新增「🏆 补交排行榜」按钮：只要录像仍带有效服务端种子 token，就能直接按原始成绩补交闯关榜或破关榜；若是离线录像，则仍只支持回放/分享、不支持上榜。
- 游戏结束时会额外探测一次排行榜服务连通性；若当前无法连接 API，会明确提示“本局录像已保留，可稍后从回放详情里补交”，避免误以为过门槛却没自动上榜。
- Replay/share detail popups now include a “🏆 Resubmit” button: if the recording still has a valid server-seed token, you can resubmit it directly to the survival or clear board using its original result; offline recordings remain replay/share only.
- End-of-run result screens now probe leaderboard connectivity once; if the API is currently unreachable, the game explicitly tells you the recording was preserved and can be resubmitted later from replay details, instead of silently seeming to miss auto-upload.

## [v1.45.0]

> Version-Impact: verify

- 上传门槛新增“种族前 10 放行”例外：除了原有 `upload_min_turns` 外，只要成绩进入同种族、同 agent、同当前 minor 版本口径下的前 10 名，也允许正式上传。该规则同时适用于闯关榜与破关榜。
- `/seed` 下发的门槛快照新增了 score / clear 两套种族前 10 cutoff，前端结算页的本地预判与 Worker 最终裁决已同步；旧快照缺少这些字段时，会自动回退到原先只看 `upload_min_turns` 的逻辑。
- Upload gates now allow a second path besides `upload_min_turns`: runs that reach the current race top 10 (same race, same agent, same current-minor bucket semantics) may also upload. This applies to both survival and clear submissions.
- `/seed` threshold snapshots now include separate race-top10 cutoffs for score and clear submissions, and the result screen’s local pre-check now matches the Worker’s final gate; older snapshots without the new fields automatically fall back to the legacy `upload_min_turns`-only behavior.

## [v1.44.0]

> Version-Impact: verify

- 精灵新增第 4 职业「先知 Seer」：主动「神谕 Prophecy」可弹框选择 金币 / 盾 / 心 / 剑 / 怪物，令下一次补子时新落下的所有棋子都变成所选类型；若本回合没有触发补子，则效果会保留到下一次补子发生。若选择怪物，则只生成普通怪物，不会生成 Boss。
- 先知锁定二阶被动为「命运回响 Echo of Fate」：当神谕真正生效并完成该次补子后，再额外把 3 个随机非 Boss 棋子改成所选类型（若选择怪物，则这 3 个也会变成普通怪物）。
- Elf gains a new fourth class: **Seer**. Its active **Prophecy** lets you choose coin / shield / heart / sword / enemy in a modal, and the next refill makes every newly falling tile become that chosen type; if no refill happens this turn, the effect waits until the next refill. Choosing enemy creates only normal enemies, never bosses.
- Seer’s locked tier-2 passive is **Echo of Fate**: after Prophecy actually resolves on a refill, 3 additional random non-boss tiles also transform into the chosen type (and if enemy was chosen, those 3 become normal enemies too).

## [v1.43.3]

- 修正火法师锁定被动「火墙 Firewall」的说明文案：实际效果一直是底部 3 行目标每回合掉“当前固定伤害的 20%”（最少 1 点），README 与游戏内被动描述之前误写成了 10%，现已统一更正。
- Fixed the wording for Fire Mage’s locked passive **Firewall**: its actual effect has been 20% of your current flat damage per turn (minimum 1) on foes in the bottom 3 rows; the README and in-game passive text had incorrectly said 10%, and are now corrected.

## [v1.43.2]

- 精灵职业显示名由「森林长老 Forest Elder」更名为「树人 Treant」，用于统一当前游戏与文档中的职业称呼；内部职业 id `elder` 保持不变，因此不影响存档、回放与测试兼容。
- Renamed the Elf class display name from “Forest Elder” to “Treant” across the current game/docs for naming consistency; the internal class id `elder` stays unchanged, so save/replay/test compatibility is unaffected.

## [v1.43.1]

- 火法师「火焰链 Flame Chain」补齐点燃说明：点开被点燃目标时，现在会直接显示火焰层数、单层每回合掉血，以及当前总掉血（单层 × 层数）。
- 修正火焰链对剑免疫 Boss 的表现：点燃后恢复原本的 Boss 底色，不再误显示成可被普通剑攻击的底色；但仍保留燃烧角标与光效提示。
- 修正火焰链选链手感：开启后，剑免疫 Boss 现在可像狂怒/嗜血那样直接作为第一个连线目标，用于本回合点燃。
- Fire Mage’s Flame Chain now shows complete burn details when you inspect an ignited target: burn stacks, burn per stack, and the current total burn per turn (per-stack × stacks).
- Fixed Flame Chain visuals on sword-immune bosses: once ignited, they return to their original boss base color instead of looking normally sword-hittable, while still keeping burn badge/glow feedback.
- Fixed Flame Chain targeting flow so sword-immune bosses can again serve as the first link target for the turn, matching Frenzy/Bloodthirst-style temporary targeting.

## [v1.41.2]

- 战斗日志新增每回合自动回血提示：恢复量会显示为「💚 恢复 +N（每回合）」，方便追踪 regen 来源的持续回血。
- Combat log now shows per-turn regen ticks: each regen heal is logged as "💚 恢复 +N（每回合）" so ongoing life recovery is visible in the log.

## [v1.43.0]

> Version-Impact: verify

- 人类新增第 4 职业「火法师 Fire Mage」：一阶主动「火焰链 Flame Chain」开启后，会像狂怒那样让本回合可划过的 Boss 变成火红色并视为可连；本回合剑链划过的怪物 / Boss（含幽灵等剑免疫目标，终焉之主除外）都会被点燃；被点燃目标之后每回合掉“点燃当回合固定伤害的 20%”（最少 1 点），直到死亡。
- 火法师锁定二阶被动为「火墙 Firewall」：棋盘最下方 3 行形成火墙红框；其中的怪物 / Boss（含幽灵等剑免疫目标，终焉之主除外）每回合掉“当前固定伤害的 10%”（最少 1 点）。
- Human gains a new fourth class: **Fire Mage**. Its tier-1 active **Flame Chain** first makes eligible bosses glow fiery red and become chainable for the turn (like Frenzy’s temporary targeting override), then ignites every monster / boss your sword chain touches (including sword-immune targets such as Ghosts, excluding the Overlord); ignited targets lose **20% of the flat damage from the ignition turn** every turn (minimum 1) until they die.
- Fire Mage’s locked tier-2 passive is **Firewall**: the bottom 3 rows become a visible red firewall, and monsters / bosses inside it (including sword-immune targets, excluding the Overlord) lose **10% of your current flat damage** every turn (minimum 1).

## [v1.41.1]

- 死局判负时，死亡结算不再误把本回合零星伤害来源当成“致命回合伤害来源”；现在会直接显示「被怪物淹没，无路可走」或终局态的「被 Boss 淹没，无路可走」，更符合真实死因。
- Deadlock losses no longer mislabel incidental damage from that turn as the “killing blow”; the result screen now explicitly says you were overrun with no way out (or overrun by bosses in the finale), which matches the actual cause of defeat.

## [v1.41.0]

> Version-Impact: verify

- 上传门槛快照改为按**种族 + minor 版本桶**分类，并加上固定回退链：同种族+当前 minor → 同种族+最近 3 个 minor → 全种族+当前 minor → 全种族+最近 3 个 minor。这样不同种族 / 版本不再被一条全局门槛粗暴混算，但样本过少时仍能自动回退到更稳定的范围。
- 正式版开局改成在**选完种族后**再向 `/seed` 申请服务端种子，因此服务器可以把与该种族 / 版本桶匹配的上传门槛快照直接固化进 token 与录像；上传时若 token 里的门槛和当前录像不匹配，也会按同一套回退链重新解析。
- The upload-threshold snapshot is now classified by **race + minor version bucket** with a fixed fallback ladder: same race + current minor → same race + recent 3 minors → all races + current minor → all races + recent 3 minors. This stops one global gate from crudely mixing unlike races/versions while still falling back to stable samples when a bucket is sparse.
- Release runs now request `/seed` **after race selection**, letting the server freeze the correct race/version-aware upload-threshold snapshot directly into the seed token and recording; if the token’s stored gate no longer matches the submitted recording, the server re-resolves it through the same fallback ladder.

## [v1.40.0]

> Version-Impact: verify

- 把「钱能买命 Money Buys Life」再收紧成更纯粹的囤金联动：囤金期间，受到的伤害现在**只会优先扣冻结金币**，不再动手头现金；只有冻结金币不够时，剩余部分才继续掉血。这样更符合“囤起来的钱替你挡刀”的直觉，也避免把平时钱包一起卷进去。
- Tighten “Money Buys Life” into a purer Hoard-only shield: while Hoard is active, incoming damage is now paid from **frozen gold only** and no longer drains wallet gold; only any remainder spills into HP once the stockpile is exhausted. This better matches the fantasy that only the hoarded stash buys survival, without dipping into your normal wallet.

## [v1.39.0]

> Version-Impact: verify

- 重做矮人守财奴的锁定二阶被动：财阀 Tycoon 改名为「钱能买命 Money Buys Life」，不再是“金币转经验”。新效果是：只要囤金 Hoard 还在生效，受到的伤害会优先扣**冻结金币**，不够再扣手头金币，金币仍不够时才继续掉血。这样守财奴的二阶被动终于和囤金本体直接联动，形成“用囤起来的钱挡刀”的明确流派。
- Redesign the Dwarf Miser’s locked tier-2 passive: Tycoon is renamed to “Money Buys Life” and no longer converts gold into XP. Its new effect is: while Hoard is active, incoming damage is paid from **frozen gold first**, then wallet gold, and only any remainder spills into HP. This gives Miser a direct, coherent tier-2 synergy — stockpiled money now literally buys survival.

## [v1.38.0]

> Version-Impact: verify

- 下调幽灵 Ghost 的血量模板：它现在不再吃通用 Boss 的高血成长，而是改为与同级普通怪同血量；保留「剑链无效、只能炸、倒计时重击」的定位，避免后期出现几百血却只能用 5 点炸弹慢慢磨的失衡体验。
- Lower Ghost’s HP template: it no longer uses the generic high-HP boss scaling and instead matches same-tier normal-enemy HP, while keeping its identity as a bomb-only countdown threat. This avoids the late-game case where a Ghost can reach absurd HP totals even though the player is forced to chip it down with tiny bomb damage.

## [v1.36.1]

- 把选种族页的文案收紧成两行：尽量一行只写「特性：…」，另一行只写「削弱：…」，并去掉句号收尾，让手机上一屏更好扫、重点更明确。
- Tighten the race-selection copy into two short lines: one for “Trait: …” and one for “Weakness: …”, while removing sentence-ending periods so the mobile screen scans more cleanly and the key info stands out faster.

## [v1.37.0]

> Version-Impact: verify

- 补齐财阀 Tycoon 的经验触发口径：之前「获得金币时额外按一半转为经验」主要只覆盖了金币链，击杀赏金/抓小偷/盗贼额外掉金等来源不一定加经验。现在统一成**所有金币收入**都按一半转经验，而且守财奴囤金期间即使金币先进冻结池，这部分经验也会照常拿到。
- Complete Tycoon’s XP trigger coverage: previously “gold gained also grants half as XP” mostly applied to coin chains, while kill rewards / thief recovery / Rogue bonus gold did not consistently grant XP. It now applies to **all gold income** uniformly, and the XP still arrives normally even when Miser’s Hoard stockpiles the gold instead of adding it to your wallet immediately.

## [v1.36.0]

> Version-Impact: verify

- 修复守财奴「囤金 Hoard」只冻结金币链收入、却放跑击杀赏金/偷回金币/盗贼额外掉金的问题。现在囤金期间的**所有金币收入**（连金币、击杀普通怪/Boss、抓小偷、妙手空空等）都会先转入冻结池，锁定结束后再统一按 2.5 倍返还，终于和技能描述一致。
- Fix Miser’s “Hoard” so it no longer freezes only coin-chain income while letting kill rewards / recovered thief gold / Rogue bonus drops bypass the lock. During Hoard, **all gold income** (coin chains, normal/boss kill rewards, thief recovery, Empty Pockets bonus gold, etc.) is now routed into the frozen pool first and then returned at 2.5× when the lock ends, matching the skill description at last.

## [v1.35.0]

> Version-Impact: verify

- 牧师二阶被动「神圣打击 Holy Strike」不再随机乱打：现在会像火枪手的「狙击」一样**优先攻击 Boss**，若场上有多个 Boss，则命中**生命最低**的那个；没有 Boss 时才回退到普通怪。并补了单点命中特效与更明确的日志，能直接看出这次神圣打击打到了谁、造成了多少伤害、有没有击杀。
- Priest’s tier-2 passive “Holy Strike” no longer picks a random victim: it now **prioritizes bosses** like Musketeer’s Snipe, choosing the **lowest-HP boss** when multiple bosses are present and only falling back to normal enemies when no boss exists. It also now shows a single-target hit effect and clearer log text so you can tell exactly what was struck, how much damage landed, and whether it killed.

## [v1.34.3]

- 澄清污染怪的毒心说明：不是“以后不再产生新毒心”，而是**炸掉污染怪后，场上的绿毒心会立刻复原成普通红心**。同步修正游戏内毒心说明卡与 README 中英描述，避免把光环复原机制理解成“只停产、不回红”。
- Clarify the Corruptor poison-heart wording: it is not merely that “no new poison hearts are created” — **once the Corruptor is bombed away, the existing green poison hearts immediately revert to normal hearts**. Updated both the in-game poison-heart tooltip and the Chinese/English README text so the aura-reset behavior is no longer mistaken for “stop creating new ones only.”

## [v1.34.2]

- 把「📲 放到桌面」按钮挪到首页左上角（正式版 / DEV 选择页），不再放在游戏页内部；支持安装弹窗的浏览器可直接拉起安装，不支持时仍会给出简短的“添加到主屏幕 / 安装应用”指引。主屏模式启动时继续自动隐藏。
- Move the “📲 Add to Home Screen” button to the top-left corner of the landing page (the Release / Dev chooser) instead of showing it inside the game page; browsers with an install prompt can launch it directly, while unsupported browsers still get a short “Add to Home Screen / Install App” hint. The button still hides itself automatically when already running in standalone mode.

## [v1.34.1]

- 50 回合选职业时，长按职业卡现在会弹出预览，直接告诉你这个职业在 100 回合锁定拿到的二阶被动是什么、效果如何；这样不用背表，也不用等升到 100 才知道自己后面会拿到什么。
- At the turn-50 class selection, long-pressing a class card now opens a preview that shows which locked tier-2 passive the class will gain at turn 100 and what it does, so you no longer have to memorize the table or wait until turn 100 to see the payoff.

## [v1.34.0]

> Version-Impact: verify

- 重做盗贼 Rogue：主动技能改为「妙手空空 Empty Pockets」——本回合用剑链攻击到的每个敌人，都会额外掉落其命中前血量 20% 的金币（向下取整，至少 1 金），连线会变金色；若这回合没用剑打到敌人，则白开。盗贼的锁定二阶被动改为「乾坤一掷 All-In」——买完炸弹后，再额外扣当前金币的 20%，并把这笔数额加到这次炸弹伤害上。
- Redesign Rogue: its active skill becomes “Empty Pockets” — for this turn, every enemy hit by your sword chain drops extra gold equal to 20% of its pre-hit HP (rounded down, minimum 1), and the chain turns gold; if the turn ends without hitting anything, the buff is wasted. Rogue’s locked tier-2 passive becomes “All-In” — after buying a bomb, also spend 20% of your current gold and add exactly that amount to this bomb’s damage.

## [v1.33.4]

- 澄清中文里治疗涨价的描述：把容易误读成“获得 1 金”的「耗金 +1 / +1 金」统一改成「下次多花 1 金」，明确表达是下次购买更贵，而不是返还金币。
- Clarify the Chinese wording for potion price scaling: phrases that could be misread as “gain 1 gold” are now rewritten as “the next use costs 1 more gold,” making it explicit that the potion gets more expensive instead of refunding gold.

## [v1.33.3]

- 修复矮人「一锤打出 0 伤」的违和边界：保留武器总伤 ×0.85 并继续向下取整，但只要这次连线是一次合法的武器攻击，就至少保底造成 1 点伤害，避免前期单锤命中怪物却完全不掉血。
- Fix the awkward Dwarf “single hammer deals 0 damage” edge case: weapon damage still uses the ×0.85 penalty and still rounds down overall, but any legal weapon attack now deals at least 1 damage so an early one-hammer hit no longer lands for zero.

## [v1.33.2]

- 把「📲 放到桌面」从开始页入口改成左上角小按钮，位置与右上角语言切换呼应；支持安装弹窗的浏览器可直接触发安装，iPhone / iPad Safari 与不支持一键安装的浏览器仍弹出简短指引。若已经从主屏模式启动，按钮会自动隐藏。
- Move “📲 Add to Home Screen” from the start-screen entry into a small top-left button that mirrors the language toggle on the right; browsers with an install prompt can launch it directly, while iPhone / iPad Safari and unsupported browsers still show a short instruction sheet. The button hides itself automatically when the game is already running in standalone mode.

## [v1.33.1]

- 开始页新增「📲 放到桌面」入口：支持安装弹窗的浏览器可直接触发安装；iPhone / iPad Safari 或不支持一键安装的浏览器则弹出简短指引，告诉你去点分享菜单里的「添加到主屏幕 / 安装应用」。入口只显示在未以主屏模式运行时，不占对局中的 HUD 空间。
- Add a new “📲 Add to Home Screen” entry on the start screen: browsers that expose an install prompt can launch it directly, while iPhone / iPad Safari and unsupported browsers show a short instruction sheet pointing to “Add to Home Screen” / “Install App” in the browser share/menu UI. The entry only appears when the game is not already running in standalone mode, so it does not consume in-run HUD space.

## [v1.33.0]

> Version-Impact: verify

- 修复「继续上局」后录像会悄悄漂移：本地存档现在会连同 RNG 内部状态一起保存/恢复，续局后的补格、刷怪、Boss 落点与升级洗牌都会沿着原来的随机轨迹继续，不再出现实玩能打到高回合、导出/上传后 replay 却从中途开始对不上棋盘的问题。
- Fix replay drift after using Continue Last Run: local saves now persist and restore the RNG internal state together with the board, so refills, enemy spawns, boss placement, and upgrade shuffles resume on the original random path instead of desyncing mid-run when the recording is exported or verified.

## [v1.32.1]

- 给屠夫的「钩子 Hook」补了一条短暂的铁灰色拖拽线特效，并在末端加了更清晰的钩尖，让怪物被拉到底排时的方向感更直观；纯视觉，不改变技能结算与 replay 逻辑。
- Add a short iron-gray drag line to Butcher’s Hook, with a clearer hook-head at the pulled end so the downward drag reads more clearly; this is purely visual and does not change skill resolution or replay behavior.

## [v1.32.0]

> Version-Impact: verify

- 下调小偷 Boss 的偷金比例：从原先的一阶 20%、二阶 40% 系列，改为 **一阶 10%、二阶 20%，之后每阶 +10%**，减轻高金币局被瞬间掏空的惩罚。
- 重做雪人 Boss 的冻结阶梯：1 阶封 1 个技能 1 回合、2 阶封 2 个技能 1 回合、3 阶封 1 个技能 2 回合、4 阶封 2 个技能 2 回合、5 阶封 2 个技能 3 回合、6 阶封 3 个技能 3 回合、7 阶封 3 个技能 4 回合、8 阶封 3 个技能 5 回合、9 阶封 3 个技能 6 回合。
- 这两项都属于会改变同种子同操作结局的平衡调整，因此按当前版本规则改用 **minor** 发版，而不是继续走 patch。
- Nerf the Thief boss’s gold-steal scaling: instead of the old 20% at Lv1 / 40% at Lv2 progression, it now steals **10% at Lv1, 20% at Lv2, then +10% per tier**, softening the punishment on high-gold runs.
- Rework the Snowman boss’s freeze ladder: Lv1 freezes 1 skill for 1 turn, Lv2 freezes 2 for 1 turn, Lv3 freezes 1 for 2 turns, Lv4 freezes 2 for 2 turns, Lv5 freezes 2 skills for 3 turns, Lv6 freezes 3 for 3 turns, Lv7 freezes 3 for 4 turns, Lv8 freezes 3 for 5 turns, and Lv9 freezes 3 for 6 turns.
- Because both changes alter outcomes for the same seed + action sequence, they now ship as a **minor** release rather than a patch under the current replay/versioning policy.

## [v1.31.7]

- 排行榜上传失败现在会弹更明确的提示：区分服务端种子过期、种子已用、seed 不匹配、未达上传门槛，以及通用网络/服务异常，不再只显示一句模糊的“上传失败”。
- Ranking upload failures now show specific toast reasons: expired server seed, already-used seed, seed mismatch, below-threshold runs, and generic network/service issues instead of one vague failure message.

## [v1.31.6]

- 服务端种子 token 的有效期从 2 小时延长到 **72 小时（现实时间）**，高回合/破关后有更宽松的补交窗口；token 仍然是一次性使用，消费后继续短 TTL 保留防复用。
- Extend server-seed token validity from 2 hours to **72 real-time hours**, giving high-turn / clear runs a much wider resubmission window; tokens remain one-shot and still collapse to a short TTL after use to prevent reuse.
- 录像详情与结算页现在会明确提示：服务端种子是**现实时间 72 小时**有效，过期后旧录像即使可 replay，也不能再补交排行榜。
- Record details and end screens now explicitly say that server-seed tokens are valid for **72 real-time hours** and that old recordings may remain replayable after expiry but can no longer be resubmitted to the leaderboard.

## [v1.31.5]

- 为 Android / Chrome 安装图标补上标准 PNG 尺寸：新增 `icon-192.png` 与 `icon-512.png`，并写入 `manifest.webmanifest` 的 `icons` 列表，避免主屏图标继续回退到浏览器自行猜测。
- Add standard Android / Chrome install icon sizes by introducing `icon-192.png` and `icon-512.png` and wiring them into the `icons` array in `manifest.webmanifest`, so home-screen installs no longer rely on browser fallbacks.
- `dr.sh` / `dr.ps1` 的 deploy 流程现在会把这两个 PNG 一并复制到 `public/`，确保发布后的 manifest 不会引用缺失文件。
- `dr.sh` / `dr.ps1` now copy both PNG icon files into `public/`, ensuring the released manifest never points at missing assets.

## [v1.31.4]

- 新增 `manifest.webmanifest`，并让首页、正式版、开发版三个入口页都显式声明 `<link rel="manifest">`，让 Android / Chrome 添加到主屏时的名称、主题色与图标来源更稳定。
- Add `manifest.webmanifest` and link it from the landing page plus both game entry pages, giving Android / Chrome a stable source of install metadata (name, theme color, and icon) instead of relying on browser fallbacks.
- `dr.sh` / `dr.ps1` 的 deploy 流程现在会把 manifest 一起复制到 `public/`，避免每次部署后静态安装元数据丢失。
- `dr.sh` / `dr.ps1` now copy the manifest into `public/` during deploy so install metadata survives every dev/prod deployment.

## [v1.31.3]

- 修复 replay / verify 在升级三选一上的随机漂移：升级池原先用 `sort(() => rnd() - 0.5)` 洗牌，不同 JS 引擎/实现下会以不同顺序和次数调用比较器，导致相同 seed 的 live 对局与 replay/verify 在升级点后消耗 RNG 不一致。现改为确定性的 Fisher-Yates 洗牌，避免录像明明打到高回合、回放却在升级后提前跑偏。
- Fix replay / verify RNG drift in the upgrade-choice pool: upgrade shuffling previously used `sort(() => rnd() - 0.5)`, whose comparator order/count can vary across JS engines, causing the same seed to consume RNG differently after level-up in live play versus replay/verification. It now uses a deterministic Fisher-Yates shuffle so long runs no longer desync and die early after upgrade points.

## [v1.31.2]

- 强化 `playtest.js` 的竞技型 AI：提交模式现在会优先走更强的 build（如精灵长老线、矮人会长线），并改进升级、技能、商店与连线选择逻辑，目标是稳定冲过 live 上传门槛，而不再只是普通贪心乱跑。
- Strengthen the competitive AI in `playtest.js`: submit mode now prioritizes stronger builds (such as Elf Elder and Dwarf Guild Master lines) and uses improved upgrade, skill, shop, and chain-selection logic so it can consistently challenge the live upload threshold instead of acting like a generic greedy bot.
- 新增 `submit-ai-until-posted.js` 轮询器：会按强势组合依次尝试真实 AI 提交，并在打出可上传成绩后轮询当前版本 AI 榜，方便直接验证 live 提交流程。
- Add `submit-ai-until-posted.js`, a strong-build portfolio runner that cycles through real AI submissions and then polls the current-version AI leaderboard once a score clears the upload gate.

## [v1.31.1]

- 修复 AI / 无头提交在结算时丢失服务端 seed token：录像原本在开局已拿到 `rec.token`，但死亡结算会被 `player.token||''` 覆盖成空串，导致 `/score` / `/clear` 误报 `ranked play requires a server seed`。现在结算会保留已有 `rec.token`，自动提交流程可正常进入验证链。
- Fix server-seed token loss at the end of AI / headless runs: recordings already had `rec.token` at game start, but death cleanup overwrote it with `player.token||''`, causing `/score` / `/clear` to fail with `ranked play requires a server seed`. The end-of-run snapshot now preserves an existing `rec.token`, so automated submissions can enter the verification pipeline correctly.

## [v1.31.0]

> Version-Impact: verify

- 明确发版版本号新规则：凡是影响 **verify / replay / 版本分桶 / release 验证语义** 的改动，都必须升 **次版本**，而不是继续只升 patch。
- Clarify the release-versioning rule: any change that affects **verify / replay / version bucketing / release verification semantics** must bump the **minor** version instead of staying on a patch release.
- `dr.sh` / `dr.ps1` 新增 **check-version** 版本闸门；`release` 会先执行该校验，若 CHANGELOG 版本节标记 `Version-Impact: verify` 却只升了 patch，会直接拒绝发版。
- `dr.sh` / `dr.ps1` now include a **check-version** release gate; `release` runs it first and refuses to ship a patch-only bump when the changelog marks the release with `Version-Impact: verify`.

## [v1.30.23]

- 游戏内内嵌 changelog 现缩减为最近 **5** 条，并支持按当前语言显示中英文摘要：中文界面看中文，英文界面看英文；若某条缺失英文，则自动回退到中文。
- The in-game embedded changelog is now trimmed to the latest **5** entries and supports bilingual summaries: Chinese UI shows Chinese text, English UI shows English text, and missing EN summaries gracefully fall back to Chinese.

## [v1.30.22]

- 修复排行榜上传门槛提示偶尔误判：结算页现在会先把最终回合/等级/金币写回录像，再缓存 `REC_LAST_KEY` 并做门槛判断，不再出现“实际 216 回合却被当成低于 169 门槛”的串值问题。
- Fix intermittent leaderboard-threshold misclassification on the result screen: the final turns/level/gold are now written back into the recording before `REC_LAST_KEY` is cached and checked, so a 216-turn run is no longer mistaken as being below a 169-turn gate.

## [v1.30.21]

- 血狂 Blood Frenzy 新增负面效果：每回合结束损失 5% 最大生命（无视护甲，至少 1 点）。保留现有效果——吸血/嗜血溢出生命上限时，仍把其中的 30% 转为永久最大生命。
- Blood Frenzy now has a downside: at the end of every turn, lose 5% of max HP (ignores armor, minimum 1). Its existing upside remains unchanged: 30% of Lifesteal/Bloodthirst overflow still becomes permanent max HP.

## [v1.30.20]

- 排行榜验证链升级为“**按版本快照选引擎**”：release 会把正式版自动归档到 `engines/<version>.html`，验证器优先按录像自己的 `rec.ver` 选精确引擎，不再只能拿当前正式版硬验旧录像。
- Upgrade the leaderboard verifier to **select engines by archived release snapshot**: every release now stores the formal build as `engines/<version>.html`, and replay verification prefers the exact engine matching `rec.ver` instead of forcing old recordings through the current build.
- 顶尖成绩的**即时验证 push 加上版本同步闸门**：只有当 render 验证器健康端点报告的 `engineVersion` 与本次成绩版本完全一致时，Worker 才触发 `/verify-now`；否则保留 `verified=0`，交给轮询 / GitHub cron 安全兜底，避免发版窗口里旧引擎误杀新成绩。
- Add a version-sync gate to **instant verification pushes**: Worker only calls `/verify-now` when the render verifier reports the exact same `engineVersion` as the submitted run; otherwise the score stays `verified=0` and safely falls back to polling / GitHub cron, avoiding release-window false negatives.

## [v1.30.19]

- 修复偶发棋盘缺块：商店治疗触发「神圣打击」击杀敌人后，若盘面留下空洞，会立刻补格，不再把空白格留在实战棋盘上。
- Fix intermittent missing board tiles: when shop Heal triggers Holy Strike and kills something, any hole left on the board is now refilled immediately instead of lingering as an empty cell.
- 修复看完回放后技能槽串台：退出 replay 现在会恢复进入回放前的 live 状态，不再把录像里的跨界技能（如把治疗变成「点金」）泄漏回实战。
- Fix replay state leakage: exiting replay now restores the pre-replay live state, so replayed crossover skills (for example replacing Heal with Gold Touch) no longer bleed back into real play.

## [v1.30.18]

- 火枪手的「狙击 Snipe」现在**优先攻击 Boss**；若场上有多个 Boss，则命中**生命最低**的那个，场上没有 Boss 时才回退到原先的最高血量目标。
- Musketeer's **Snipe** now prioritizes bosses; when multiple bosses are present, it targets the one with the **lowest HP**, and only falls back to the old highest-HP target rule when there is no boss on the board.

## [v1.30.17]

- 屠夫 Butcher 的「钩子 Hook」现在在把怪/Boss 拉到底排后，会按**离底线的距离**追加伤害：最底排吃 1× 固定伤害、倒数第二排吃 2×，依此类推；无目标时仍无效、不进冷却。
- 火枪手的「狙击 Snipe」现在**优先攻击 Boss**；若场上有多个 Boss，则命中**生命最低**的那个，场上没有 Boss 时才回退到原先的最高血量目标。

## [v1.30.16]

- 首页版本号改为**构建期静态注入**：不再在 `index.html` 里运行时请求 `versions.json`，而是在部署脚本里直接把正式版/开发版版本号写进首页 HTML；弱网/离线缓存下也能立刻看到版本号。并同步删掉 `public/versions.json` 的生成，Windows 的 `dr.ps1` / `dr.bat` 与 Bash 脚本保持同一行为。
- 鸟人 Boss 的信息面板与棋盘左上角现在会明确显示**实际啄击伤害**（= 基础攻击力的一半，向上取整），不再只写「每回合啄你一下」却不给数值，方便判断能不能硬吃。
- 分享录像自动入待验证的门槛不再被榜首抬到不可达：原先按 `max(榜首×1.5, 榜首+30)`，当榜首接近 511/512 回合上限时门槛会涨到 768、永远触发不了。现加上终局可达范围封顶，高回合分享录像仍能进入验证队列。

## [v1.30.15]

- 切换语言时日志不再残留旧语言：日志条目是翻译好的定文（含「−5」等动态值，无法逐条回译），切语言会清空日志，后续事件按新语言记。开局/继续本就会清并重记，所以开局前切语言完全正常；这里修的是对局中途切换会中英混排的问题。

## [v1.30.14]

- 顶部标题不再中英都印：原 h1 中文模式下同时显示「地牢突袭·网页版」+ 英文副标「Dungeon Raid」。现按语言只显示一个——中文「🏰 地牢突袭·网页版」/ 英文「🏰 Dungeon Raid · Web」。

## [v1.30.13]

- 修复游戏内「更新日志」久不更新（一直停在 v1.27.4）：dr.sh 的注入脚本只认旧的 `[vX]: 描述` 引用格式，而 CHANGELOG 早已改用 `## [vX]` 标题 + 要点格式，导致新版本全被漏掉。现解析器两种格式都认（新格式取每版第一条要点），点版本号即可看到最新更新。

## [v1.30.12]

- 修复「死了之后『继续上局』又能玩」：gameOver/onClear 已清存档，但结束后若还有延迟的 updateHUD（如双击连线的 setTimeout）会把死局重新存回去。新增 ended 标记，本局结束后 saveGame 直接拒绝写入；开新局/继续上局时重置。

## [v1.30.11]

- 排行榜详情里 ▶回放 / 🔗分享 两个按钮改为 flex 同一行、等宽居中（原来因 .choice 默认 block 各占一行、左对齐显得没对齐）。

## [v1.30.10]

- 排行榜详情弹框重做：去掉常显 `--` / `0` 的「最终血量/金币」（旧录像没存这俩），改为显示**回合 + 等级**（取自已验证的榜单条目，永远可靠）+ **职业线**（从录像 acts 解析一阶/二阶/跨界，id 取值跨版本稳定，旧录像也认）+ 技能(升级 perks，新录像有)+ 是否破关 + ▶回放/🔗分享。

## [v1.30.9]

- 破关榜改为「历代全部」：不再只看最近 3 个版本——破关是稀有里程碑成就，频繁发版会把老版本的真破关挤出窗口。现展示所有版本的已验证破关（每行带版本标签），副标题相应改为「历代全部」。（修复：有玩家 v1.27.4 的破关因版本窗口被埋。）

## [v1.30.8]

- 破关榜空状态改为说明性文案：「🏆 还没有人破关 · 撑过第 500 回合的终局 10 波即可登顶」，不再只是干巴巴的「暂无记录」（破关榜只收已验证的真破关，目前确实还没人到 510 回合）。
- 没拿到服务端种子时给出醒目提示：顶部 toast + 日志，讲清「本局用本地随机开局，照常可玩，只是不计排行榜」（原来只有一条容易被忽略的日志）。

## [v1.30.7]

- 修复 350 跨界技能列表 / 技能详情里「收买」重复显示两次「无冷却」：其短描述里自带的「（无冷却）」与统一追加的冷却标记重复，已从短描述去掉，冷却由统一标记显示。

## [v1.30.6]

- 小丑不再冒新怪：它的「重洗」原本把资源格换成随机新格、会按正常概率滚出怪，与召唤师职能重合。现强制只重洗成资源（剑/盾/心/金），纯搅乱连线、绝不出怪。Boss 描述同步更新。

## [v1.30.5]

- 充实「吸魂大法」技能详情：分点讲清——可吸 {W} 免疫特殊 Boss、吸力随你的生命上限成长（越高越能一发吸死）、回血封顶在上限（活死人治疗减半也生效）、与溅射/汲取生命的协同、以及打法定位。长按技能块查看。

## [v1.30.4]

- 修复 iOS「添加到主屏幕」图标显示成「地」字：原 apple-touch-icon 用的是 SVG（iOS 主屏不认），换成真实的 180×180 PNG 城堡 logo（`apple-touch-icon.png`，随 Pages 部署），并加短标题「地牢突袭」。游戏页与首页都接上。

## [v1.30.3]

- 双击贪心连线不再漏掉起点旁的格子：上一版「先吃最长一臂、再补另一臂」会把另一侧本该留的格子占掉。改为穷举「过起点」的最长简单路径（前臂×后臂所有组合），起点两侧联合最优。6×6 实测连满整个同类连通块 59%→69%；实战单类型块小、单次 <5ms（最坏约 40ms 封顶）。

## [v1.30.2]

- 双击贪心连线少漏格：原 Warnsdorff 单路径常把分叉/斜线另一侧的同类格落下。改为带预算的 DFS 最长路径、从起点向两侧各伸一条臂——起点两边都抓。6×6 随机测试平均连 7.9→10.0 格、59% 直接连满整个同类连通块，单次约 1.6ms 仍瞬时。

## [v1.30.1]

- 双击贪心连线现在**会先把连线亮出来一拍（约 0.26s）再结算**，能看到划出的那条线（原先同拍结算、线没机会渲染就被清掉了）。

## [v1.30.0]

- 新增快捷操作 **双击 盾/心/金 棋子 → 自动贪心连线**：从该棋子沿 8 向两头延伸出一条尽量长的同类连线并直接结算，省去手动长拖。仅限资源棋子（剑链与怪/Boss 不触发，攻击仍由玩家自己控制）。
- 实现：双击检测靠「轻触延迟弹信息 280ms 留窗口 + 同格二次 pointerdown」；连线走 Warnsdorff 式贪心；最终格子由 resolve 录制，回放无关、防作弊不受影响。

## [v1.29.1]

- 修复排行榜点不开详情：原先只有玩家名那一小段可点（窄、且内联 onclick 在 iOS 偶发不触发）。改为**整行可点**、JS 绑定事件、行尾加 ⓘ 提示，点哪都能弹出详情框。

## [v1.29.0]

- 锻造师二阶锁定被动改为 **盾击 Shield Bash**：把「护甲减伤量」加到固定剑伤上（护甲越厚剑伤越高），与「锻甲」吸盾成甲形成攻坦一体。原「爆破手」移交新职业火枪手。
- 新增矮人第四职业 **火枪手 Musketeer**：
  - 一阶主动 **狙击 Snipe**（CD 5）：对场上生命最高的怪/Boss（炸弹式攻击，含剑免疫与特殊 Boss，终焉之主除外）打一发 = 炸弹伤害 ×2；击杀则得 3 倍经验 + 3 倍金币。
  - 二阶锁定被动 **爆破手 Demolitionist**（沿用）。炸弹伤害提取为统一 `bombDamage()`，爆破手强化炸弹时狙击同步增强。
- 矮人职业线扩为 4 条（锻造师/守财奴/会长/火枪手）。

## [v1.28.2]

- 修复「收买」学了小气鬼后花费没减半：收买花费在自己的技能里算、绕过了只作用于商店治疗/炸弹的小气鬼减半。现改为小气鬼也让收买花费减半（会长 100 回合必得小气鬼，本是配套）。技能按钮显示的 💰花费、扣款、日志全部按减半计；小气鬼/收买说明同步。

## [v1.28.1]

- 弹层卡片内容超一屏时可在卡片内上下滑动（`.card` 加 max-height:88vh + overflow，兜底所有长列表）——修复 350 回合「跨界技能」列表过长顶出屏外、底部选项/返回点不到。
- 修复 350 跨界技能排除本种族技能的写死表漏了矮人/活死人：改用 RACE_PATHS，矮人/活死人不再把自己种族的主动列进「跨界」列表，列表回到应有长度。

## [v1.28.0]

- 新增活死人第三职业 **屠夫 Butcher**（活死人原本只有两条职业线，补齐到三条）。
  - 一阶主动 **钩子 Hook**（CD 5）：把场上所有怪/Boss（含剑免疫，终焉之主除外）顺着各自所在列拉到最底排，其余棋子上浮——把敌人聚到底排，便于一条剑链穿杀或集中处理；场上无可拉敌人时无效、不进冷却。纯重排、不消耗随机数，重放确定。
  - 二阶锁定被动 **积累腐肉 Carrion Feast**：每杀死一个敌人/Boss，生命上限永久 +1（剑/炸弹/溅射/Boss 击杀均触发）。
- 屠夫的「钩子」计入逃生判定（ESCAPE_ACTIVES），死局前可用它改盘自救。

## [v1.27.11]

- 会长「收买」按钮现在显示当前花费（💰=全场怪总血量），当金币 < 总血量（或场上无怪）时按钮置灰，一眼可知能不能发动。

## [v1.27.10]

- 弱网下选完种族不再卡顿：进选种族页就**后台预取**服务端种子，把网络耗时藏在挑种族的时间里，点种族通常瞬开。
- 明确离线（navigator.onLine=false）直接秒开本地局；服务端种子等待超时 4s→2.5s。
- 行为不变：拿到服务端种子才计排名，拿不到则本地随机（可玩不计名），DEV 版照旧不取种子。

## [v1.27.9]

- 排行榜瘦身：榜单行不再显示金币，只保留回合与等级。
- 记录详情改为弹框：点击玩家名弹出详情框（技能列表 / 最终血量 / 金币 / 破关·可验证标记 / ▶回放 / 🔗分享），取代原先点整行的行内展开。
- 顺带修复详情里回放/分享按钮引用全局 rec 的隐患（改为闭包绑定本条记录）。

## [v1.27.8]

- 修复 Boss 投放漏洞：场上已有 Boss 时，到下一个 10 回合节点不再「跳过」新 Boss，而是必降临（强制叠加）。此前可囤一只早期弱 Boss 压制后续强 Boss，在 50/100/200/350 里程碑轻松击杀晋级——已堵死。
- 炸弹基础伤害 6→5。
- 爆破手（矮人二阶）重做：从「固定 +2 伤害 / ×2 花费」改为「每用一次炸弹：伤害 +1、花费 +5 金」（累计递增，越炸越强也越贵）——早期更弱、中后期反超旧版固定值。

## [v1.27.7]

- 恢复单格轻触弹棋子信息（位移<10px判定为轻触，拖拽后松手不弹）
- 新增 dragStartX/dragStartY 记录 pointerdown 坐标区分轻触/拖拽

## [v1.27.6]

- 小偷不再出现在里程碑Boss关（50/100/200/350），回归普通每10回合Boss池
- 小丑Boss混乱不再影响怪物格子（scrambleTiles增加excludeTypes参数）
- 收买技能冷却显示修正（350回合选择界面+装备详情均显示无冷却而非CD5）
- 350回合技能选择过滤本种族职业技能及对玩家无效的技能（兽人过滤锻甲）
- 精灵长老蔓藤缠绕削弱：持续3回合、伤害30%最大生命（原5回合/10%）
- 去掉单个棋子轻点弹窗提示

# 更新日志 · Changelog

本文件记录《地牢突袭》各版本的改动。版本号遵循 `v主.次.修`：

- **修订号**：不影响 verify / replay 兼容边界的小改动 / 修 bug / 调参 / UI 文案
- **次版本**：任何会影响 verify / replay / 版本分桶 / release 验证语义的改动（包括新 Boss / 新职业 / 新机制，以及其他会开启新兼容期的变更）
- **主版本**：大版本重构

若某个版本节属于 verify / replay 影响改动，需在该版本节正文加入单独一行：`> Version-Impact: verify`。未标记时默认按 patch 处理；release 脚本会据此拒绝“应升次版本却只升修订号”的发版。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。日期为本地时间。

---

## [v1.27.4] — 2026-06-19

### 修复
- **回放跳转/步进后固定有几格闪爆炸特效**：`addBossFx`（Boss 入场闪光）漏了「无头/快进」守卫——跳转/步进会从种子重跑整局、把途中每次 Boss 入场的闪光**一股脑堆出来**，在跳转后的棋盘上同时乱闪（数量≈到该回合为止刷过的 Boss 数）。现在 `addBossFx` 也在快进时跳过；跳转/退出回放时一并清空 `bossFx`（此前只清了 `bombFx`）。

## [v1.27.3] — 2026-06-19

### 平衡
- **血狂 Blood Frenzy 增强**：吸血/嗜血溢出生命上限的部分，转为永久生命上限的比例由 **50% → 100%**（溢出全部转化）。强化兽人斗士的后期续航/滚雪球。

## [v1.27.2] — 2026-06-19

### 变更
- **精灵新职业改名**：长老 → **森林长老 Forest Elder**；其主动 死亡缠绕 → **蔓藤缠绕 Vine Coil**（机制不变；内部 id 不变）。游戏 + README 中英同步。

## [v1.27.1] — 2026-06-19

### 机制
- **击败第 350 回合 Boss 后：终局前压力升级**。打掉那只 Boss（触发跨界换装）时，弹出**红色警告**；此后**每 10 回合同时降临 2 个不同的 Boss**（强制刷新、不再「场上有 Boss 就不刷」，尽量两种不同；棋盘塞满则少刷）。为第 500 回合终焉之主的浪潮做铺垫。

## [v1.27.0] — 2026-06-19

### 新职业 / 平衡
- **新增精灵职业「长老 Elder」**，主动技能 **死亡缠绕 Death Coil**：发动后 **5 个回合内每回合**让场上所有怪/Boss（含剑免疫，终焉之主除外）损失「**你最大生命的 10%**」；**被缠绕期间敌人格变绿**。可击杀并给奖励/吸血。（精灵由 2 个职业增至 3 个。）
- **荆棘 Thorns 移到精灵「长老」的锁定二阶被动**，且**反弹量改为 =「当前护甲减伤量」**（护甲越高反弹越多——契合有甲的精灵；兽人无甲故移走）。仍只对「真·攻击」生效。
- **兽人斗士二阶被动改为「血狂 Blood Frenzy」**：吸血（汲取生命）/嗜血回血**超出生命上限时，把溢出的一半增为永久生命上限**。

## [v1.26.1] — 2026-06-19

### 变更（外观）
- **黑毒心🖤 / 绿毒心💚 的底色改回与普通心一致**：之前它们用暗紫/绿底，和普通心差别大。现在三种心**底色、高亮都一样**，只靠 emoji（💗/💚/🖤）区分，棋盘更统一。
- （普通心仍用 💗：试过换 ❤️ 但它带 FE0F 变体符，在 iOS canvas 里居中会偏移，故保留单码位的 💗。）

## [v1.26.0] — 2026-06-19

### 平衡 / 机制
- **牧师二阶被动「不朽」→ 改为「神圣打击」**：原「不朽」把治疗溢出转为**永久生命上限**，越滚越肥、过于超模。改为 **神圣打击**：治疗溢出的部分**随机砸向一个敌人/Boss**（排除终焉之主）——溢出不再白白浪费，但也不再无限堆血。
- **牧师主动「祝福」现在也回血**：清掉全场的心，每颗仍转 3 点经验，**同时按每颗心的回复量给你回血**（之前只转经验、不回血）。与「神圣打击」联动：满血时祝福的回血溢出会自动转成对敌人的攻击。

## [v1.25.30] — 2026-06-19

### 变更
- **「汲取生命」吸血覆盖所有击杀手段**：继 v1.25.29（剑/炸弹）之后，把吸血接进**全部**击杀路径——剑链、炸弹、蛊毒/黑毒心、箭雨、溅射、吸魂大法、荆棘反杀，凡是你击杀怪/Boss 都按「每杀 ×吸血值」回血，并在各自日志里显示「吸血 +N」。统一走 `lifestealHeal()` 助手，口径一致。

## [v1.25.29] — 2026-06-19

### 修复
- **「汲取生命」吸血像没效果**：吸血其实在生效，但①只在**剑链击杀**时回血、**炸弹击杀不回**；②回血是**悄悄**加的、没有日志，量又小（每杀 +1），很容易以为没用。现在**炸弹击杀也吸血**了，并且剑链/炸弹击杀的吸血量都会**在日志里显示「吸血 +N」**（满血时不显示）。

## [v1.25.28] — 2026-06-19

### 变更
- **去掉「万物皆毒」描述里的污染怪交互说明**：黑毒心在污染怪在场时仍被绿毒心盖过（行为保持不变），但描述里的「（污染怪变化之后）/(after the Corruptor)」这层细节去掉，文案更简洁。README 中英两侧同步删除。

## [v1.25.27] — 2026-06-18

### 修复
- **回放按 ◀▶ 步进：没连线、还冒出一堆炸弹特效**：①跳转/步进会从种子重跑，但没清掉上一段残留的爆炸特效（`bombFx`），它们就画在了跳转后的新棋盘上——看着「全是炸弹特效」。现在跳转/退出回放都**先清空残留特效**。②步进/跳转改为**停在目标回合的连线「结算之前」并把这条连线画出来**（线压在正确的棋子上），暂停等你继续——所以按 ◀▶ 能看到那一回合到底连了什么；按 ▶ 或再点棋盘才结算。顶栏回合数随预显示的连线显示「即将完成的那一回合」。

## [v1.25.26] — 2026-06-18

### 变更
- **满血时治疗不可用**：生命已满时再喝药水是纯浪费金币。现在满血时**治疗按钮置灰**（显示「已满血」）、点了也不会购买；描述补一句「满血时不可用（避免浪费）」。换装主动占用治疗槽时不受影响（照常施放）。

## [v1.25.25] — 2026-06-18

### 修复
- **击败 Boss 没有奖励日志**：之前只有炸弹击败 Boss 时才提示奖励，用**剑/荆棘/吸魂/吸血鬼中毒**等方式击败 Boss 时，+20💰、+15经验是悄悄给的、没有日志。现在把奖励提示统一放进 `onBossKilled()`——**任何方式击败 Boss 都会报「🏆 击败 Boss！厚赏 💰+20、经验 +15」**（蓝色增益）。炸弹日志里去掉重复的奖励文案、改为只报击败数量。

## [v1.25.24] — 2026-06-18

### 修复
- **荆棘反弹打错目标（像「没生效」）**：荆棘其实一直在触发，但反弹的伤害是**随机砸向一个敌人**，而说明写的是「反弹给**攻击者**」。同场有 Boss + 小怪时，伤害常落在别的小怪身上，于是「打你的那只怪不掉血」，看着像没效果。现在**优先反弹给攻击者本人**（按身份在棋盘上定位它），攻击者已不在场（如自身被打死）才退回随机。
- **荆棘只对「真·攻击」反弹**：普通怪/Boss 重击、鸟人啄击、饕餮强击会反弹给攻击者；而**僵尸尸毒（持续中毒）、毒心反噬、石像反弹**这类「非直接攻击」的掉血**不再触发荆棘**——符合直觉（中毒不该被反弹）。

## [v1.25.23] — 2026-06-17

### 变更
- **吸血鬼吸到黑毒心会中毒/被毒死**：之前吸血鬼只认污染怪的绿心光环判毒，无视棋子自身的黑毒心标记——巫医把心燃黑后它照样回血。现在它逐颗判定：**正常心回血、毒心（污染光环 或 巫医「蛊毒/万物皆毒」黑毒心）反害它**，按净效果回血或中毒掉血，毒心够多直接毒死。巫医由此能用蛊毒**反制吸血鬼**，符合「黑=毒」的直觉。

## [v1.25.22] — 2026-06-17

### 变更
- **日志按事件类型上色（不再像“随机”）**：之前是「场上有 Boss → 该段所有日志都红」，无关消息也跟着红、观感很乱。改为**按事件本身**上色：**回血=绿、增益=蓝（护甲/金币/经验/各职业主动）、攻击敌人=白（默认）、被敌人攻击/Boss 出场=红、负面效果=黄（冰封/感染/偷金/打乱/敌人壮大等无掉血的负面）**。主栏与展开历史栏共用同一规则。
- **回放跳转节点固定为 50/100/200/350**（只显示录像够长的那几个），并新增 **「−10」**按钮：一键跳到**倒数第 10 回合**看结局。

## [v1.25.21] — 2026-06-17

### 修复 / 变更
- **巫医「蛊毒」发动后心不变黑**：之前蛊毒只设了个玩家标记 `heartPoison`（本回合连心改判为毒），**并没有把心格本身变黑**——黑心 🖤 的渲染看的是棋子的 `poison` 标记（和万物皆毒同一套）。现在蛊毒**当场把全场红心燃成黑毒心**（设 `poison=true`，立刻显示 🖤），连它们即按黑毒心规则毒灌全场怪（含剑免疫，终焉除外）、不回血。顺带：场上没有心时无效、不进冷却；返回燃烧的颗数。

## [v1.25.20] — 2026-06-17

### 修复
- **炸弹说明里的 `{W}` 没被解析**：炸弹详情用了 `tr(...)` 直出，而武器 token（`{W}`=按种族的武器名）只有走 `L(...)` 才会替换，于是「能炸{W}免疫的 Boss」里 `{W}` 原样显示。改用 `L([...])`，现在按种族正确渲染（剑/箭/斧/锤/骨）。全文件已无其它「tr() 内含未解析 {W}」的残留。

## [v1.25.19] — 2026-06-17

### 变更（英文文案）
- **「减伤」英文由 "Cut" 改为 "DR"**：HUD 护甲条上的 `减伤` 之前译成 "Cut"（像动词、不达意）。改为玩家熟悉的 **DR**（Damage Reduction），锻甲日志里的 `(reduce N)` 也一并改 `(DR N)`。
- **「护甲进度」英文统一为 "Armor XP"**：HUD 行标、盾说明、强化盾术升级、锻甲/盾详情里的 `armor progress / Armor progress` 全部统一成 **Armor XP**（护甲像经验一样攒满升一级，更直观）。仅英文调整，中文不变。

## [v1.25.18] — 2026-06-17

### 变更
- **每个职业主动技能都补上「详细说明」**：之前只有死灵「吸魂大法」点开有完整规则，其余 12 个技能点开只显示一行简述（如兽人斗士「嗜血」过于简单）。现在 13 个一阶主动全部带 `desc`，长按技能块/点开角色面板都能看到完整规则与数值口径——例如嗜血写明「每命中一只回 3 血（按命中数非击杀数）+ 本回合可打{W}免疫 Boss（终焉除外）」，蛊毒/箭雨/圣盾/囤金/收买/狂怒/重生等亦各自写清边界与无效条件。

## [v1.25.17] — 2026-06-17

### 修复
- **回放退出后「继续上局」能接着玩回放的残局**：回放期间 `startGame/updateHUD` 仍在调 `saveGame()`，把**回放的临时局面**写进了存档。退出回放回到首页，「继续上局」便出现并加载这份回放残局，还能继续玩。现在 **`saveGame` 在回放中直接跳过**，回放绝不写存档。
- **（连带修复）回放跳转按钮回合数错乱（如 74 回合的局却有「跳到 100」按钮）**：同一根因——退出回放后用「继续上局」加载的是回放局面（玩家在某回合），而 `rec` 仍是上一把真实对局的录像，两者错位，导致录像动作数与实际回合数对不上。堵掉回放写存档后，这条错位链路一并消失。也顺手保护了真实进行中的存档不被回放覆盖。

## [v1.25.16] — 2026-06-17

### 修复
- **巫医「蛊毒/黑毒心」对剑免疫 Boss 没效果**：蛊毒（Hex）和万物皆毒的黑毒心说明都写「毒**全场怪**」，但实际走的 `dealDamage(…, null)` 只命中**可剑攻击**目标——面对小丑/幽灵/雪人/污染怪/石像这些**剑免疫 Boss** 时毒伤直接打空，于是「发动没效果」。现在改为像**炸弹/吸魂大法**一样**命中全场怪含剑免疫 Boss**（仅排除终焉之主），与描述一致。

## [v1.25.15] — 2026-06-17

### 新增
- **网页图标 (favicon)**：标签页/书签/手机加到主屏现在有图标了——金色城堡 + 小红旗（呼应 🏰 品牌标），深紫圆角底。用**内联 SVG data-URI** 实现，零外部文件、不破单文件原则。同时加 `theme-color`（移动端浏览器顶栏配深色主题）。游戏页与首页 `index.html` 都加上了。

## [v1.25.14] — 2026-06-17

### 修复
- **炸弹炸怪触发升级时看不到爆炸特效**：买炸弹后若同回合升级/转职，升级框是在同一 tick **同步弹出**的，直接盖住了刚加进队列、还没来得及播一帧的爆炸特效。改为：实玩中炸弹有爆炸特效且要弹框时，**先等特效播完（~0.43s）再弹**框（其间 busy/pendingLevels 已挡输入）。回放/无头/快进本就无特效，仍立即弹，不影响确定性重放。

## [v1.25.13] — 2026-06-17

### 变更
- **精简落地页玩法说明、保留神秘感**：去掉「每 50 回合 Boss 强一档」「撑到第 500 回合破关」这类剧透，只留核心（连同类符文：斩怪/凝甲/回血/补给）+ 一句「能走多深，看你自己」。中英文都压缩，落地页更易控制在 iPhone 15 一屏内。（终焉之主自身的 Boss 说明不变——那是点开才看的，不算剧透。）

## [v1.25.12] — 2026-06-17

### 修复
- **回放仍有「连线不对」**：之前连线是在 `resolve()` **结算之后**画的，那时被连的棋子已消除/重排，线就压在了一堆不相干的新棋子上。改成**两拍**：第一拍只在「**结算前**」的棋盘上把本步连线画出来（停顿半拍，线和棋子对得上），第二拍才结算并立刻清掉连线。绝不再把线画在已重排的棋盘上。
- **回放进度条被步进键挤走 / 回合数重复**：①进度条移到**独占一行**，永不被 ◀▶ 按钮挤压；②步进键非暂停时用 `visibility` 隐藏但**保留占位**，出现/消失不再挤动其它按钮；③顶栏文字从「`回合 5 · 5/29`」(回合数与动作序号重复) 简化为 **`回合 5/27`**(当前回合/总回合)，进度条也按回合计。

## [v1.25.11] — 2026-06-17

### 修复
- **主栏红字与展开栏不一致**：主栏只给**最新一行**按当前是否有 Boss 上色，旧行一律白——一旦来了新日志，原本红的那行在主栏变白，但展开栏按各自存的 `red` 标记仍是红；反过来也对不上。现在主栏也**逐行按各自 `red` 标记上色**（取 `logHistory` 末两条渲染），与展开栏完全同一规则（共用 `logColor`）。

## [v1.25.10] — 2026-06-17

### 修复
- **回放完全不显示连线了**：v1.25.6 修「残留旧连线」时，在 `'m'` 结算后**同一 tick 立刻清空 `selection`**——`draw()` 永远拿不到「有连线」的那一帧，于是回放里一条线都看不到。改成：自动播放时**保留连线**（让两步之间约 600ms 的帧画出本步连线），只在**暂停 / 跳转 / 结束**时才清（静止帧上才会清，旧的「连了没连的」问题仍不会复现）。
- **主界面日志框左右没和棋盘对齐**：日志框 `margin:6px 4px` 比棋盘（`width:100%`，无左右边距）两侧各窄 4px。改成 `margin:6px 0`，左右与棋盘对齐。

## [v1.25.9] — 2026-06-16

### 修复 / 变更
- **日志历史里丢了红字**：日志条对「有 Boss 在场时的事件」标红，但点开完整日志后全变普通色——因为 `logHistory` 只存了文字、没存颜色。现在每条历史**带 `red` 标记**（记录当时是否有 Boss），完整日志里这些事件照样显示红色。
- **主界面日志加框**：给日志条加了边框 + 底色 + 圆角 + 内边距（与面板风格一致），更像个可点的「框」，hover 高亮提示可点开看历史。

## [v1.25.8] — 2026-06-16

### 修复
- **吸魂红线闪 2 次**：吸魂特效的线用 Web Animations 但没设 `fill`——动画(680ms)淡出到透明后，元素**回到基础属性**(整条线、不透明)又亮一下，直到 720ms 移除，于是看着闪两次。现在加 `fill:'forwards'`(保持末帧透明)+ 初始 `stroke-dashoffset` 设为隐藏，只剩一次干净的「抽向血条→淡出」。

## [v1.25.7] — 2026-06-16

### 新增
- **炸弹爆炸特效**：用 💥 炸弹时，每个被炸到的怪/Boss 格都爆一下（橙色闪光 + 扩散环，约 0.43s），一眼看清炸到了哪些目标。纯帧驱动 canvas 特效（同 Boss 入场特效那套），不进录像、不影响逻辑/重放；无头机器人与快进（跳回合/步进）时自动跳过。

## [v1.25.6] — 2026-06-16

### 修复
- **回放/跳转后出现「我没连过的」乱连线**：回放路径 `dispatchReplayAct` 结算完一步移动后**没清空 `selection`**（实时游戏在 `endDrag` 里会清）。于是暂停、跳回合或 ◀▶ 步进后，棋盘已重排，但上一步那条旧连线坐标还在，被画在了现在不同类型的格子上——看着就像把 💰/🔨/❤️ 乱连成一条线。现在回放每步结算后、以及 `jumpToTurn` 结束时都清空 `selection`，不再有残留连线。
- **吸魂特效在快进时刷屏**：`jumpToTurn`（跳回合/步进）从种子瞬间重跑会把途中每次吸魂的红线一股脑闪出来；现在快进期间不放特效。

## [v1.25.5] — 2026-06-16

### 新增
- **吸魂大法吸血特效**：死灵「吸魂大法」发动时，从**每个被吸取目标的格子**画一条发光红线「抽」向 ❤️ 血条，再淡出，直观看出「吸了谁的血、补给了自己」。纯 UI（SVG 覆盖层，约 0.7s）——不进录像、不影响逻辑与确定性重放；无头机器人/校验桩件环境自动跳过、不报错。

## [v1.25.4] — 2026-06-16

### 变更
- **矮人↔兽人武器对调**：兽人由「🔨 狼牙棒」改为「🪓 斧」，矮人由「🪓 斧」改为「🔨 锤」。纯显示（攻击格图标 + 全文案随武器 token 自动改名为 斧链/锤链），不改任何数值与逻辑，重放/榜单不受影响。
- **README 加在线试玩链接**：顶部新增「🎮 在线试玩」区——正式版 <https://dungeonraid.win>、开发版 <https://dungeonraid.win/dungeon-raid-dev.html>。

## [v1.25.3] — 2026-06-16

### 变更
- **饕餮 🦖 也显示攻击力角标**：饕餮原本因是「大招型 Boss」不显示左上攻击角标，容易漏看它倒计时归零的强力一击。现在按其**动态攻击 = 当前血量的 50%** 显示角标（吃怪壮大后数字也随之变大），轻点信息也加「当前攻击（=血量50%）」一行。
- **会长「收买」改为花钱买通 + 无冷却**：原本「收买」只把「金币 > 全怪血量」当**门槛**、并不真扣金币；现在**真正花掉「全场怪总血量」那么多金币**把它们买通成金币（付得起才可发动，否则无效）。同时**移除该技能冷却**——有钱就能反复用。这样更贴合「有钱能使鬼推磨」，且花钱本身就是自限平衡（不会无脑刷）。回测（矮人会长 20 局）中位 76，未失衡。详情面板/长按显示「无冷却（有钱即可用）」。

## [v1.25.2] — 2026-06-16

### 修复
- **回放时还能操作棋盘 → 导致回放与真实棋盘不符**：回放过程中玩家仍能点棋子（弹说明）、拖动连线、点商店/技能——这些操作会**真的改动棋盘并打乱 RNG 序列**，使后续回放与录像彻底错位。现在**回放中棋盘/商店/技能/角色面板一律不可操作**（重放自身经 `dispatchReplayAct` 直接驱动，不走这些点击入口，故不受影响），回放严格按录像还原。

### 变更（回放控制）
- **回放控制改版**：移除 ⏸ 暂停键，改为**点击棋盘任意位置暂停 / 再点继续**。
- **暂停后出现 ◀ ▶ 单回合步进**：◀ 回退一回合、▶ 前进一回合（确定性从种子重跑到目标回合）。**回退到第一回合 ◀ 变灰、前进到最后一回合 ▶ 变灰**。调速 1×/2×/4× 与 ⏹ 退出保留。

## [v1.25.1] — 2026-06-16

### 修复
- **转职后技能/商店按钮停留在禁用态（老问题，偶尔发生）**：转职/换装选择的 onclick 在 `busy` 还为 true 时就调用了 `updateHUD()`（把技能/商店按钮置为禁用），随后才把 `busy` 复位为 false——但没有再刷新一次 HUD。于是转职后（若同回合没顺带升级）技能按钮一直显示禁用、点不动，直到下一步操作才恢复。现把 `updateHUD()` 移到 `busy` 复位之后，转职完成立刻可用。两处（一阶/二阶/本族 转职 + 350 换装）都修。纯 UI、不影响重放。

## [v1.25.0] — 2026-06-16

### 重构（职业进阶链）
- **二阶被动拆分独立 + 锁定到职业**：原本剑圣/巫医把「主动 + 被动」捆在一个职业里（50 级一次给两个），不合理。现拆开：
  - **50 级**：选职业，只解锁**主动**。
  - **100 级**：自动获得**该职业锁定的专属二阶被动**（不再自由选）。锁定映射：
    - 人族 骑士→将军、牧师→不朽、剑圣→**皆可为剑**(新)
    - 精灵 游侠→神射手、盗贼→影袭
    - 矮人 锻造师→爆破手、守财奴→财阀、会长→小气鬼
    - 活死人 死灵→回春、骷髅王→溅射
    - 兽人 狂战士→巨力、斗士→荆棘、巫医→**万物皆毒**(新)
  - **200 级（本族技能）**：从同族其余被动里**玩家选一个**（三职业种族二选一，两职业种族即那唯一一个）。
  - **350 级（跨界技能）**：不变；祝贺词改为「经过漫长的修炼，你已经突破种族的极限！」。
- **新二阶被动「皆可为剑」**（人族·剑圣）：每回合棋盘摆完后，把 3 个非敌/非剑棋子变成剑（即原剑圣捆绑的被动，现独立成 100 级解锁）。
- **新二阶被动「万物皆毒」+ 黑毒心**（兽人·巫医）：每回合（**污染怪变化之后**）把 3 个非敌/非心棋子**燃成黑毒心**（🖤）。**连黑毒心只放毒、不回血**——把这些生命当毒灌给全场怪（同主动蛊毒口径）；红心照常回血，玩家自取舍连红还是连黑。黑色区别于污染怪的绿毒心；轻点黑毒心有说明；污染光环在场时黑毒心也随之扣血（光环优先）。
  - 全职业回测（每族 40 局）整体均衡未破坏（中位 59–92）；剑圣/巫医定向测试均正常跑完。确定性（转化用 rnd），存档/回放保留黑毒心状态。按版本分桶，旧录像在旧引擎重放不受影响。

## [v1.24.3] — 2026-06-16

### 平衡
- **调高怪物/Boss 攻击力，避免后期护甲碾压攻击**：原本护甲是「平直扣减」且永久累积，中后期减伤长期高于攻击力 → 几乎每次只吃保底 1 点伤害，威胁全无。本想给护甲减伤加「按攻击比例保底」，但那样玩家不好心算；改为**直接提高怪物攻击斜率**（伤害仍是直观的「攻击 − 护甲」）：普通怪 `2+lv×0.7 → 2+lv×1.1`、Boss `5+lv×1.2 → 5+lv×1.8`。开局基本不变（低等级），中后期明显更狠——到 20 级普通怪 16→24、Boss 29→41，护甲想压成 1 点伤害需要堆得多得多。
  - 全职业回测（每族 40 局，真实文件数值）：生存中位普遍下降约 16–20%（人族 84→68、精灵 101→81、兽人 86→72、活死人 91→76；矮人方差大约持平）。死因仍以普通怪为主、强度更高，整体更有压力但仍能正常推进。

## [v1.24.2] — 2026-06-16

### 修复
- **点版本号一直「加载中」**：v1.24.1 的「更新日志」是实时从 `raw.githubusercontent.com` 拉 CHANGELOG.md——该域名国内常被墙/极慢，请求既不返回也不报错，就卡在「加载中」（且当时没设超时、没本地兜底）。改为**把更新摘要直接嵌进页面**（`const CHANGELOG_LINES`，零网络、秒开），由 `dr.sh embed-changelog` 在 deploy/release 时从 CHANGELOG.md 自动注入（最近 40 条），无需手动同步。

## [v1.24.1] — 2026-06-16

### 新增 / 变更（UI）
- **日志栏可点开看完整历史**：点击棋盘上方的日志条 → 弹出本局完整日志（保留最近 ~80 条，最新在上），看清来龙去脉；日志条仍只显示最近 2 行。纯 UI，不进录像。
- **点击版本号查看更新日志**：点页面底部版本号（带 📝）→ 弹出最近版本的更新摘要（实时从 GitHub 的 CHANGELOG 拉取，失败回退到链接）。
- **底部加方块提示**：版本号上一行新增「💡：点开任意方块查看更多」，提示可轻点棋子/Boss/商店查看说明。
- **吸魂大法简要描述精简**：short 从「随机吸 2 个目标补自己，每个最多吸你的生命上限（含 Boss）」简化为「随机吸 2 个目标的生命补自己」，完整吸取规则仍在长按详情里。

### 修复
- **角色详情面板技能冷却显示错误**：面板里「职业主动 / 跨界技能」的冷却原本显示**基础冷却**、没算「迷惑 +1 / 回春 −1」等修正——例如活死人没学回春时面板写「每 5 回合」但实际是 6。现改为显示**有效冷却** `effSkillCd`（活死人无回春→6、有回春→5），与长按详情、实战冷却一致。（注：活死人学回春后吸魂 cd=5 是「回春正好抵消迷惑」的设计，非 bug。）

## [v1.24.0] — 2026-06-16

### 变更（机制）
- **雪人重做：移除攻击，改为「倒计时归零再次冰封」**：雪人原本除现身冰封外，倒计时归零还会重击你掉血；现在**本身不再造成任何伤害**，改为**每次倒计时归零就再次随机冰封**你的主动（按档位 1~3 个）。它的再冻间隔固定为「冻结时长+2」（>冻结时长），保证**总有一个解冻空档**能炸掉它——避免高档位把炸弹永久冻住的软锁。雪人从「冰封+磨血」变成纯粹的「持续封技能」骚扰型 Boss，靠抓解冻窗口炸杀。
- **每回合行动的 Boss 也标注倒计时**：小丑/吸血鬼/召唤师/僵尸/鸟人等「每回合出手」型 Boss，棋盘角标原本不显示倒计时；现在统一显示红色「1」（每回合都出手），轻点信息里也写明「倒计时：每回合出手」。终焉之主除外。

### 测试
- 桩件验证：雪人 onSpawn 设 cd=6（>冻结4）、cdAttack 再冻且玩家 HP 不变（零伤害）；雪人唯一 Boss 回测 20 局正常跑完、死因均为普通怪（雪人不再致死）。回归 4/4 PASS。确定性（再冻洗牌用 rnd），版本分桶不影响旧录像。

## [v1.23.1] — 2026-06-16

### 变更（文案）
- **吸魂大法描述：武器免疫按种族渲染 + 写清吸取规则**：
  - 原描述硬编码「剑免疫」，但吸魂能经跨界技能被任意种族装备——改用 `{W}` token，按**当前玩家武器**渲染（活死人→「骨免疫」、人族跨界→「剑免疫」…），与全局武器文案口径一致。
  - **写清吸取规则**：给技能加完整说明（长按技能块详情里显示）——「随机选 2 个目标（怪或 Boss，含{W}免疫的，终焉除外）；每个吸取 min(你的生命上限, 它当前血量)，即单个最多吸等于你生命上限的血，吸取量≥它血量就吸死它；吸到的总量回血（受治疗减半影响）；吸死的溢出还会触发溅射」。
  - 顺带把长按炸弹详情里的「剑免疫」也改为 `{W}` 渲染。纯文案，不改逻辑。

## [v1.23.0] — 2026-06-16

### 变更（机制）
- **吸魂大法的溢出也触发「溅射」**：活死人二阶被动「溅射」原本只在剑链/箭雨的溢出（击杀目标后多出的伤害）时砸向剩余敌人；现在**死灵「吸魂大法」的溢出也会触发**——当吸力上限（玩家生命上限）大于目标血量、把目标吸死时，多出的部分（上限 − 目标血量）作为溅射随机砸到剩余的一个敌人/Boss（含剑免疫，排除终焉之主），可连锁击杀。
  - 回测（死灵+溅射 25 局）中位 82 回合，与死灵+回春（86）基本持平、并未失衡——是个有针对性的协同小强化，不是霸榜级。
  - 确定性（溅射落点用 `rnd`，回放可复现）；按版本分桶，旧录像在旧引擎重放不受影响。

## [v1.22.8] — 2026-06-15

### 变更
- **吸魂大法描述写明对 Boss 有效（含剑免疫的）**：死灵「吸魂大法」实际上对所有非终焉 Boss 都生效——**和炸弹一样，连剑免疫的 Boss（幽灵/小丑/污染怪/雪人）也能吸**（终焉之主除外），是活死人对付剑免疫 Boss 的一个手段。原描述只写「吸 2 只怪」，容易让人以为对 Boss 无效。现描述改为「随机吸 2 个目标（含 Boss，连剑免疫的）的命补自己」。纯文案，效果本就如此、未改逻辑。

## [v1.22.7] — 2026-06-15

### 变更
- **角色详情面板 + 长按技能块弹窗：俏皮话也紧跟职业名**（与 v1.22.6 转职选择页一致）。两处原本都把俏皮话排在技能描述之后，现统一为「职业名 →「俏皮话」→ 主动技能描述/被动」。纯文案排序，不改逻辑。

## [v1.22.6] — 2026-06-15

### 变更
- **转职选择页：俏皮话紧跟职业名，技能描述另起一行**（原来顺序反了）。每个职业选项原本是「职业名 → 主动技能描述/被动 → 俏皮话」，现改为「职业名 →「俏皮话」→ 主动技能描述/被动」，俏皮话紧跟在名字下，技能说明单独成行，更顺眼。纯文案排序，不改逻辑。

## [v1.22.5] — 2026-06-15

### 平衡
- **升级「强化体魄」不再回满血，改为回等量血**：原本每次选「强化体魄」都**立即回满**（白嫖一次满血复原），后期相当于无限免费全恢复，太强、不合理。现改为**只回复本次提升的生命上限那么多**（人族 +6 上限 / 回 6；兽人 ×2 = +12/回12；精灵 ×0.5 = +3/回3）——升级仍给一小笔回血，但不再是满血重置。**活死人的「治疗减半」也作用于此**（原本回满直接赋值、绕过了减半）：活死人 +6 上限 / **回 3**，与其天赋一致。回测（每档 40 局）显示各档生存中位数下降约 7–14%，整体仍能正常推进、够到里程碑。（确定性，重放/榜单按版本分桶不受影响。）

## [v1.22.4] — 2026-06-15

### 新增
- **长按商店/技能块看详细说明**：长按（≈450ms）💊治疗 / 💥炸弹 / ✨职业主动 任一块 → 弹出详细说明卡（机制 + 当前数值：恢复量/伤害/花费/冷却/状态等），松手即可关闭。短按仍是原来的买/放技能，长按已触发则吞掉随后的点击（不会误买/误放）。换装主动占用槽时显示该跨界技能的说明。
  - **置灰也能看**：把这 3 个块从 `disabled` 属性改为视觉 `.off` 类（点击仍由 buyItem/activateSkill 自行拦截，行为不变），所以即使「冷却中 / 买不起」也能长按读说明——正是最想了解它的时候。
  - 纯 UI：不进录像、不影响对局与确定性重放（机器人/校验无关）。开始页提示补一句「长按商店/技能块看详细数值」。

## [v1.22.3] — 2026-06-15

### 修复
- **召唤师把棋盘塞满怪后卡死、不判负**：召唤师每回合刷怪，棋盘可能被怪填满到「无棋可连、技能也清不掉怪」，但游戏既不让你动也不判负，彻底卡死。根因有二：① `hasAnyMove` 把「相邻两只怪」误判成可走的剑链——但**怪-怪连线不含「剑」格会被判空挥取消**（见 v1.13.3），所以那并不是真能走的一步，导致死局被误判成「还有路」；② 无路可走的判负**只在终局（500 回合后）生效**，普通对局不检查。
  - 现在：`hasAnyMove` 改为**只认真正可成的剑链**（必须有「剑」格紧邻可攻击目标），不再把怪-怪误判成可走；判负检查**对所有对局生效**（不再限终局）。
  - 加了**逃生判定**避免误杀还能救的局：仅当「无棋可连」**且**「没有任何就绪的改盘动作」（清/转棋子的主动如箭雨/吸魂/化剑/收买等就绪，或炸弹就绪且买得起）时才判负；用掉最后的改盘动作后仍无路，也会即时判负、不再卡死。
  - 构造死局验证：全盘填怪+技能冷却+无金 → 正确判负；放入「剑紧邻怪」或留有就绪箭雨/可买炸弹 → 正确识别仍有出路、不判负。回归 4/4 PASS。

## [v1.22.2] — 2026-06-15

### 变更
- **攻击日志加高到完整 2 行**：日志框原 `height:24px`（字号 11px、行高 1.4 → 单行 15.4px），只够显示 **1.56 行**，在 iPhone 上长消息总是露半行。改为 `height:31px`（正好容纳 2 整行），日志看得更全。

### 修复
- **小偷把金币偷成负数**：小偷偷取比例 `pct = 0.2 × Boss 档位`，到**第 5 档（约第 250 回合）就达 100%、第 6 档起超过 100%**（120%、140%…），`steal = floor(金币 × pct)` 会大于你的金币，扣完直接变**负金币**。现在**偷取量封顶为当前金币**（`min(金币, floor(金币×pct))`）——高档位顶多偷光、绝不为负；夺回逻辑随之一致（击败小偷返还的正是被偷走的数额）。提示里的百分比也封顶显示 ≤100%，不再出现「偷走 X 金币（120%）」的怪异文案。

## [v1.22.1] — 2026-06-15

### 修复
- **无头机器人在正式版引擎上会自动以「人类」上报、并抢用种子 token**：bot（`headless`）跑正式版引擎时，游戏自身的死亡/破关自动上报（`submitScore`/`submitClear`，agent=human，Node 全局 `fetch` 真发请求）会先触发、**消耗掉服务端种子 token**；导致随后 playtest 的 `agent=ai` 提交拿到 `422 invalid seed token: used`（看着像限流，其实是 token 被自己抢用了）。现在自动上报加 `!headless` 门槛——无头机器人不再自动上报（由 playtest 自己以 `agent=ai` 提交），既修了 AI 榜上传 422、也避免 bot 误把成绩塞进人类榜。
- **playtest `--submit-ai` 接入服务端种子**：每局先取 `/seed`、用其种子开局、录像带 token 提交（配合 v1.22.0 的强制 token；`--gap` 同时给 /seed 与提交限流间隔）。

## [v1.22.0] — 2026-06-15

### 新增（反作弊）
- **服务端发种子，防离线刷幸运种子**：正式版开新局先向后端 `POST /seed` 要一个**一次性种子 + token**（按 IP 限流发放），用它的种子开局、token 随录像一起提交；worker 校验 token（存在 / 未用过 / 种子吻合）才接收为**可上榜**成绩。这样把"离线免费刷百万种子挑运气最好的"变成"在线按 IP 限流刷"——想大规模刷就得买大量代理 IP，成本上去了。
  - **离线/取不到种子 → 回退本地随机**：本局照常能玩，但**不计排名**（死亡/破关页提示）。
  - **dev 永远本地随机**（离线可玩、本就不参与排名）。
  - **重放/确定性不受影响**：种子只是换了来源，token 仅用于提交校验、不进重放逻辑（重放 15/15 一致）。
  - **已开启强制**：v1.22.0 正式版上线后，worker 已切到 `REQUIRE_TOKEN=true`——**无 token 的提交一律拒收**（实测无 token → 422，有效 token → 接受）。缓存的旧客户端需刷新页面才能继续上榜。

## [v1.21.5] — 2026-06-15

### 新增
- **死亡/破关报告显示游玩时长**：结算页在「等级·金币·回合」下新增「⏱ 用时 X 分 Y 秒」。由录像计时得出（实时对局 `now − t0`，回放取原局时长）。「继续上局」时会**重设计时基准、排除关掉游戏的间隔**，让时长贴近真实游玩时间（仅显示用，不影响重放/确定性）。

## [v1.21.4] — 2026-06-15

### 变更
- **职业进阶文案改版（保持神秘感 + 改名）**：移除「一阶职业 / 二阶职业」等说法，进阶链统一改名——**职业**（第 50 回合转职 + 主动技能）→ **二阶技能**（被动）→ **本族技能**（本种族第二被动）→ **跨界技能**（任选职业主动换进商店槽）。开始页只点明「第 50 回合击败 Boss 转职、解锁主动技能」，之后不再剧透具体回合，改为「随着探险深入，解锁更强大的技能……」。转职选择页、角色详情面板、雪人冰封提示等同步改名。

## [v1.21.3] — 2026-06-15

### 变更
- **开始页加「🏠 首页」按钮**：开始界面顶部版本徽标旁新增「🏠 首页」按钮，点击回到 `index.html`（正式版/开发版选择页），方便切换版本。紧贴徽标单行排布，不占额外竖向空间。

## [v1.21.2] — 2026-06-15

### 修复
- **回放「跳回合」一跳就到结束画面**：当录像与当前引擎不完全一致（如跨版本的旧录像）时，跳转的快进过程中玩家会提前「死亡」→ 触发 `gameOver` 弹出结束画面，且 `stopReplay` 清空 `replayRec` 导致后续 `replayRec.acts` 崩溃。现在快进期间**抑制 gameOver/onClear**、本地持有录像引用，跳转**绝不会弹结束画面或崩溃**：一致的录像照常精确跳到目标回合；不一致的录像则停在其实际结束点并提示「该录像在第 N 回合就结束了」。（用桩件 + 篡改种子的不一致录像复现并验证修复）

## [v1.21.1] — 2026-06-15

### 变更
- **各种族专属武器图标 + 全量文案随武器改名**：攻击格图标按种族变化——人族 🔪 剑、精灵 🏹 箭、矮人 🪓 斧、兽人 🔨 狼牙棒、活死人 🦴 骨。**所有相关描述都按当前武器动态改名**（剑链 → 箭链/斧链/狼牙棒链/骨链）：攻击格说明、攻击日志、HUD、轻点 Boss/怪的说明（含「XX链对它无效」「攻击方式」）、技能与被动描述（箭雨/嗜血/狂怒/巨力/神射手/溅射）、升级卡（磨利刀刃/淬炼锋芒）、种族削弱（矮人）等。换装主动按**当前角色**的武器显示。「剑圣/化剑」为人族专有名词保留。实现：数据描述用 `{W}/{WC}` token 经 `L()` 统一替换，运行时按种族解析。纯显示/文案，不改数值与逻辑，重放一致。（注：狼牙棒暂用 🔨，emoji 无专用图标）

## [v1.21.0] — 2026-06-15

### 新增
- **矮人新增一阶职业 💼 会长 Guild Master**：主动【收买】——当**金币 > 棋盘上所有怪的总血量**时方可发动，把全部怪物**变成金币**（有钱能使鬼推磨；对 Boss 无效）。
- **矮人新增二阶职业 小气鬼 Cheapskate**：消耗金币的主动（商店 💊治疗 / 💥炸弹）花费减半（与爆破手叠加正好抵消其 ×2 涨价）。
- **转职祝福语（层层递进）**：一转/二转/三转/四转的转职选择页各加一句俏皮风祝福语，从「初出茅庐」到「传说的草稿」逐级递进。

### 修复
- **精灵「箭雨」对僵尸等怪型 Boss 无效**：箭雨（及巫医「蛊毒」）原本只命中 `type==='enemy'`，漏掉了所有 Boss——包括本可被剑攻击的怪型 Boss（僵尸/刺客/饕餮/召唤师/小偷/鸟人/吸血鬼/石像）。现改为命中**所有可剑攻击的目标**（仍排除剑免疫的幽灵/小丑/污染怪/雪人与终焉之主），与剑链口径一致。

### 文案
- **去掉冗余的「也能用炸弹」**：可被剑攻击的 Boss 必然也能炸，描述里不再赘述（吸血鬼/小偷/僵尸/鸟人/石像等）。
- **不再写死炸弹伤害**：幽灵描述删掉「每次 −6 血」、商店炸弹按钮改为**动态显示当前伤害**（基础 6 / 爆破手 8），因为炸弹伤害会随被动变化。

## [v1.20.0] — 2026-06-14

### 新增
- **新 Boss ⛄ 雪人 Snowman**：剑链对它无效（**只能用 💥炸弹**）。一现身就【随机冰封你的主动能力】——**一阶冻 1 个、二阶冻 2 个、三阶冻 3 个**（在「一阶主动 / 💊治疗 / 💥炸弹」里随机），被冻的按钮显示 ❄️、**4 回合内不可用**（限时解冻，即使炸弹被冻也能等解冻再炸，不会卡死）。倒计时归零也会重击你。低血量，解冻后一两发炸弹即可清掉。新机制确定性，重放校验 20/20 一致；正常池均衡不受扰。

## [v1.19.0] — 2026-06-14

### 新增
- **新 Boss 🦠 污染怪 Corruptor**：剑链对它无效（**只能用 💥炸弹**）。只要它在场，棋盘上**所有的心都变成毒心（绿心 💚）**——连毒心不再回血，反而按等量【**扣血**（无视护甲）】！炸掉它，心立刻恢复正常（光环式，不留持久毒心、不会堵盘）。低血量（不吃档位倍率），一两发炸弹即可清掉；倒计时归零也会重击你。轻点毒心有专门说明。
  - **光环式**：毒心不是持久状态，污染怪一死，心立刻变回正常（不会在棋盘上长期堆积）。
  - **与吸血鬼同场**（仅终焉浪潮可能同时出现）：吸血鬼吸到的是毒心，会**反被毒、掉血而非回血**，吸太多甚至中毒身亡。
  - 机器人也学会**躲毒心**（playtest：污染怪在场不连心、改靠炸弹清场），回测正常池均衡基本回到基准。新机制确定性，重放校验 20/20 一致。

## [v1.18.0] — 2026-06-14

### 新增
- **新 Boss 🗿 石像 Statue**：可用剑 / 炸弹攻击，但它【受到多少伤害，就把等量伤害当作**真实伤害（无视护甲）反弹给你**】——想杀它得先确保自己血够厚，别一刀连自己也送走（剑链、炸弹、溅射、吸魂的伤害都会反弹）。倒计时归零也会重击你。属性不吃档位倍率（反弹量始终可控），但「攻击它=伤害自己」很容易让莽撞的玩家/机器人被弹死。新机制确定性，重放校验可复现（20/20 一致）。

## [v1.17.3] — 2026-06-14

### 平衡
- **商店「治疗」改为随使用递增**：原固定回复 10 生命、15 金，后期面对高额掉血越来越鸡肋。改为**每使用一次：恢复量 +2、下次多花 1 金**（回复 10→12→14…，花费 15→16→17…），后期也能跟上。商店按钮实时显示当前恢复量。确定性（次数由购买序列重建），重放校验不受影响。

## [v1.17.2] — 2026-06-14

### 平衡
- **守财奴「囤金」缩短锁定**：原锁定 `金币/10`（3–10 回合）——最长 10 回合期间商店全禁用（治疗/炸弹都买不了），且**越有钱锁越久**（方向反了，危险期想买东西反被锁更久）。改为**固定锁 4 回合**，到期返还由 ×2 提升到 **×2.5**（顺带小补强最弱的守财奴线）。

## [v1.17.1] — 2026-06-14

### 平衡
- **活死人削弱（治疗 −50%）**：全面回测显示活死人 4 条线全部霸榜（中位 120–134 vs 全场 76–110）——迷惑天赋独大，而唯一代价（技能冷却 +1）被回春白嫖抵消，缺一个补不回来的硬削弱（其它种族都有）。新增硬削弱：**一切治疗效果减半**（心 / 药水 / 吸魂大法；骷髅王「重生」满血复活走直接赋值、不受影响）。回测后活死人回落到中位 96–108，与全场顶档（骑士 102 / 游侠 119）持平，不再独大。

## [v1.17.0] — 2026-06-14

### 新增
- **新种族 🪦 活死人 Undead**：
  - **天赋·迷惑**：所有怪物（含 Boss）攻击倒计时 **+1**（更慢出手，更耐磨）；**代价**：所有主动技能冷却 **+1**。
  - **一阶职业（主动）**：
    - 🪄 **死灵 Necromancer · 吸魂大法**：随机吸取 2 只怪的生命补给自己，单只吸取量 = 玩家生命上限；吸取量 ≥ 怪生命则该怪死亡。
    - 💀 **骷髅王 Skeleton King · 重生**：本回合若被击败则不死、生命回满；此后「重生」自身冷却 **+2**（每次真正复活递增）。
  - **二阶职业（被动）**：
    - **回春 Rejuvenation**：所有主动技能冷却 **−1**（正好抵消迷惑的 +1）。
    - **溅射 Splash**：攻击的溢出伤害随机砸到棋盘上剩余的一个敌人（**含不可被剑攻击的 Boss**）。
  - 排行榜种族筛选自动新增 🪦；新机制均确定性（溅射/吸魂用 `rnd`，重生无随机），回放/榜单校验可复现（已验证 4/4 重放一致）。

## [v1.16.2] — 2026-06-14

### 修复
- **鸟人瞬移拖慢终局破关**：v1.16.0 新加的 🦅鸟人若在终焉浪潮里和「终焉之主」互换位置，`advanceEnemies` 的「行动者已移位 → 跳过」守卫会连终焉之主这一回合的浪潮推进也一起跳过，导致浪潮停滞、破关被拖到第 511 回合之后（出现 516 等异常回合数）。改为鸟人**不与终焉之主换位**，浪潮稳定每回合推进，破关回到第 511 回合。

## [v1.16.1] — 2026-06-14

### 平衡
- **爆破手（Demolitionist）削弱**：增伤炸弹 **10→8**、成本 **×1.6→×2.0**。回测显示原爆破手是矮人明显最强二阶（中位 82 vs 财阀 63）、且常单独撑到 511 通关；先单独提成本（×2）回测几乎无效（机器人不缺金，中位 88），真正拉回平衡的是降伤（10→8）。削弱后矮人爆破手（中位 71/均值 103）与财阀（~64/106）基本持平，并明确低于精灵游侠「箭雨」（95/114）。
  - 顺带澄清定位：**箭雨** 随武器威力缩放（×2+固伤）、后期更强，但**只清小怪、打不到 Boss**；**炸弹** 是定值但**通杀含剑免疫 Boss（幽灵/小丑）**——两者各有用途，不是同一把尺子。

## [v1.16.0] — 2026-06-14

### 新增
- **两个新职业（一阶·主动+被动双修）**：
  - 🧌 兽人 **巫医 Witch Doctor**：主动【蛊毒】——本回合连「心」不再回血，而是把这些生命当毒，灌给全场怪；被动——每回合棋盘摆完后，把 3 个非敌人/非心的棋子变成心。
  - 🧑 人族 **剑圣 Sword Saint**：主动【化剑】——把全场的心和金币都变成剑；被动——每回合棋盘摆完后，把 3 个非敌人/非剑的棋子变成剑。
  - 兽人 / 人族的一阶职业可选项各从 2 个增加到 3 个。新职业被动用确定性 `rnd` 洗牌，回放/榜单校验可复现（已验证 3/3 重放一致）。
- **新 Boss 🦅 鸟人 Birdman**：可用剑 / 炸弹攻击；它【每回合】俯冲啄你一下（半攻击力），并在回合末和棋盘上任意一个棋子【互换位置】（瞬移）——飘忽难缠，想连它的剑链得算准它的落点，速战速决。
- **技能 / Boss 俏皮话**：每个一阶主动技能、每个 Boss 除技能/招式描述外，新增一句 ≤32 字的双语俏皮话，显示在轻点信息弹窗、角色详情、转职选择里。

## [v1.15.2] — 2026-06-14

### 修复
- **棋盘不显示（关键回归）**：v1.15.0 加的 `clampName` 正则里混入了**原始控制字节（含 NUL）**——Node 能容忍，但浏览器解析内联 `<script>` 时会被 NUL 破坏，导致脚本不能完整执行、渲染循环不启动、棋盘空白。改为按字符码过滤（不再用含控制字节的正则），并清除全文件所有原始控制字节，彻底修复。worker 的 `cleanName` 同样清理。

## [v1.15.1] — 2026-06-14

### 修复
- **棋盘不渲染的隐患**：开始页名字输入若取不到元素，会中断 `showClassSelect`、导致 `loop()` 不启动、棋盘不显示——加防御性判空，保证初始化与渲染循环不被名字输入打断。
- **僵尸高档位秒杀**：尸毒原 `0.1×档位`，到 5 阶=50%、10 阶=100%（直接秒杀）。改为**感染后潜伏一回合才发作**（趁机可击杀解毒）+ **单回合最高 30%**，不再秒杀。

## [v1.15.0] — 2026-06-14

### 新增
- **排行榜展示名（alias）**：开始页可输入「排行榜名字」，**最长 12 个汉字**（或等宽字母，按显示宽度 24 计），本机持久、**自动填上次的名字**；🎲 一键随机起名（形容词+的+名词）。**AI/机器人无名时服务端自动随机起名**。排行榜每行改为显示「**种族头像 + 名字**」（不再显示种族名）。
- 后端：scores 加 `name` 列（迁移 0004），`/score`、`/clear` 收 `name`（清洗+限宽，AI 空名则随机），`/top`、`/clearboard` 返回 `name`。名字只是展示别名，与服务端生成的录像 id 无关。

## [v1.14.6] — 2026-06-14

### 变更
- **日志条移到状态栏与棋盘之间**（原在棋盘下方）。
- **排行榜合并最近 3 个版本**：频繁打补丁会把按版本分桶的榜单切碎；现在榜单显示**最近 3 个版本**的成绩（后端按 semver 取最近 3 版，`/top?recent=3`、`/clearboard?recent=3`），非本版的成绩行标出版本号。

## [v1.14.5] — 2026-06-14

### 修复
- **兽人「无甲」仍被提供护甲升级**：v1.14.3 改升级名后，`rollUpgradePool` 的无甲过滤仍用旧名（重型护甲/坚盾强化），导致兽人升级三选一里出现无效的护甲项。现改用新名（加固护甲/强化盾术）正确剔除。

### 内部
- 新增 `headless` 标志（仅供无头机器人）：抑制升级弹窗在 `resolve` 内抽池，使机器人录像可确定性重放、能被验证。配合 `playtest.js`：机器人改为录制升级/转职选择、用游戏真实升级池；新增 `--submit-ai`（跑局→本地重放校验→以 agent=ai 提交可验证录像到 AI 榜）、`--dev`（用开发版跑）。对真人玩家无影响。

## [v1.14.4] — 2026-06-14

### 修复
- **无剑的连线仍显示骷髅预览**：只串怪、不连剑的连线本就不会攻击（与 v1.13.3 一致），但若固定伤害够高，怪仍会被错误标成 💀 预览。现在无剑连线不再显示击杀预览。

### 变更
- **矮人削弱改为「剑链总伤 ×0.85」（含固定伤害一起算）**：原「剑威力 −0.3」只削减每把剑的伤害、对固定伤害无效，与精灵「连击加成」（作用于剑+固伤整体）不一致；现统一为对 (剑×系数 + 固定伤害) 的整体乘算，固定伤害堆叠流也会被正确削弱。精灵保持不变（连击本就乘算整体）。
- `playtest.js` 新增 `--dev`：用开发版跑平衡测试，便于验证未发布的数值改动。

## [v1.14.3] — 2026-06-14

### 变更
- **升级能力改名（统一动词+名词）**：「吸血鬼」→**汲取生命**（避免与吸血鬼 Boss 重名）；并优化其余名称：强健体魄→**强化体魄**、狂战之力→**淬炼锋芒**、重型护甲→**加固护甲**、坚盾强化→**强化盾术**、神圣治疗→**精研医术**、贪婪之心→**搜刮财富**、生命恢复→**凝聚生机**（磨利刀刃保留）。仅改名、不改效果与顺序，录像按索引应用、重放不受影响。精灵/兽人削弱描述里的「强健体魄」同步改「强化体魄」。

## [v1.14.2] — 2026-06-14

### 变更
- **矮人头像 🧔 → 🎅**：原 🧔 与人族 🧑 太相像，换成圣诞老人 🎅，选种族/排行榜里一眼可分。

## [v1.14.1] — 2026-06-14

### 修复
- **转职与升级同回合卡死**：击杀第 50 回合 Boss（或 100/200/350）若**同回合还升了级**，转职选完后待升级弹窗不会出现，棋盘解锁不了、不能划，游戏卡死。现在转职/换装选完后若仍有待升级，会**自动接着弹升级**，不再卡住。新增 `worker/sticktest.js` 回归。

## [v1.14.0] — 2026-06-14

### 新增
- **新手第一局教学棋盘**：第一次游玩时，棋盘保证有一只弱怪、左右各一把剑（剑-怪-剑），可连成「穿怪剑链」一击带走，帮新手立刻理解核心玩法。确定性生成（录像标记 `tut`），回放/榜单校验可复现。
- **开始页玩法演示**：落地页加「剑→斜穿怪→横出剑」小图 + 说明，讲清「剑链可穿过怪物攻击、**横竖斜 8 向**都能连、每只怪独立吃满整条伤害」。

### 变更
- **主游戏页移除底部玩法提示**，只保留版本号（玩法介绍已移到开始页）。
- **日志位置 + Boss 红字警示**：日志移到状态栏与棋盘正下方；**场上有 Boss 时日志用红字显示**，更醒目。

## [v1.13.6] — 2026-06-14

### 变更
- **种族「人类」改名「人族」**：避免与排行榜的「人类（玩家）/ AI」重名混淆。人族=种族，人类=真人玩家榜。
- **排行榜可按种族筛选**：「🏆 排行榜」面板新增种族筛选行（全部 / 🧑 / 🧝 / 🧔 / 🧌），与 人类/AI、闯关/破关 自由组合（后端 `/top`、`/clearboard` 已支持 `race=`）。

## [v1.13.5] — 2026-06-14

### 变更
- **弹层页按一屏原则精简**：①「换装主动」选择页 8 个职业主动改为紧凑单行，不再超屏；② 死亡页伤害来源只列前 3 大、数据压成一行；③ 破关页祝贺/致谢合并、数据压成一行。死亡/破关/换装等弹层均控制在 iPhone 一屏内。

## [v1.13.4] — 2026-06-14

### 变更
- **开始页改为两步落地**：第一页是标题 + 简短开篇引言（背景/玩法），底下一个 **▶ START** 主按钮，再下面是「继续上局/回放上一局/导入回放/排行榜」，最下方是精简版「🙏 致敬原作」(指向 issues)。点 START 才进**选种族页**（含 50/100/200/350/500 里程碑说明）；重开一局直接回选种族页。
- **每页控制在一屏内**：落地页与选种族页都精简到 iPhone 一屏内（短引言、单行次级按钮），不再需要滚动。

## [v1.13.3] — 2026-06-14

### 修复
- **游侠「箭雨」漏算固定伤害**：箭雨原本只按 `剑威力×2` 计算，漏掉了固定剑伤（狂战之力/磨利刀刃的 `swordFlat`）和巨力的 `titanFlat`。现改为 `(剑威力×2 + 固定剑伤 + 巨力加成) × 剑倍率`，与正常剑链的伤害构成一致。
- **划过怪物但没连剑 = 空挥还白扣一回合**：从怪物起手却没把任何 🔪 连进来时，原会判定为「剑链」但因没有剑而 0 伤害，还照样推进一回合、让敌人行动。现在直接判为无效攻击——**取消、不消耗回合**，并提示「把剑连进来」。

## [v1.13.2] — 2026-06-14

### 变更
- **正式版存档按版本兼容**：正式版的本地存档记录其版本号；版本一旦变化即判**不兼容、自动从头开始**（避免旧存档在新版本里出错）。**开发版存档不受此限制**（照常继续）。上传战绩仍按对局所在版本分桶——因正式版存档不跨版本续玩，对局版本即上传版本，二者天然一致。
- 开篇「致敬原作」联系方式改为指向 **github.com/lcgogo/dungeon-raid/issues**（提 issue 更方便转达）。

## [v1.13.1] — 2026-06-14

### 新增
- **开篇引言**：开始界面顶部新增两段引言——「🕯️ 地牢之下」虚构背景 + 玩法速览，「🙏 致敬原作」说明本作致敬 2011 年 iOS 经典《Dungeon Raid》、始终未能联系上原作者，并留下作者 GitHub（github.com/lcgogo）以便知情者转达。
- **破关祝贺页**：撑过终焉之主 10 波破关后，结算页改为故事化祝贺——呼应开篇「再无人生还」，你成为第一个活着走出地牢的人，并致谢原作。

## [v1.13.0] — 2026-06-14

### 新增
- **第 200 回合 Boss → 第二被动**：击败第 200 回合 Boss 后，可再获得**本种族另一项被动**（每族 2 个被动，至此集齐），与一阶/二阶同样确定性录制重放。
- **第 350 回合 Boss → 换装主动**：击败第 350 回合 Boss 后，可从**全种族全职业的 8 个主动技能**里任选一个，**替换掉商店的 💊治疗 或 💥炸弹 槽**——该槽位变为施放此主动（带技能自身冷却、独立于一阶主动冷却）。可跨种族搭配。角色详情面板新增「被动②/换装」两行。

## [v1.12.3] — 2026-06-14

### 修复
- **Boss 入场特效有时落在别的棋子上**：特效原锚定在固定格子，而 Boss 入场后会被重力沿列下落到玩家刚清出的空位，特效便留在了原格（掉进来的别的棋子上）。改为锚定到 Boss 棋子本身、跟随其下落位置。

## [v1.12.2] — 2026-06-14

### 变更
- **一阶 Boss 标注 Lv1**：Boss 档位标签改为始终显示（含 tier 1），现身日志与轻点信息弹窗里一阶 Boss 也标 `Lv1`（原来只在 Lv2 及以上显示）。

## [v1.12.1] — 2026-06-14

### 修复
- **拖动连线退回第一格被误判为轻触**：拖出连线后又退回到起手格再松手，原会弹出该格的说明弹窗;现在区分"真·轻触"(从未连出)与"拖出又退回",后者只取消、不弹说明。

## [v1.12.0] — 2026-06-14

### 新增
- **AI 排行榜**：成绩按 `agent`(human / ai)分流,人类榜与 AI 榜互不混排。游戏内新增「🏆 排行榜」面板(开始页 + 死亡/破关页),可在 **人类 / AI** 与 **闯关榜 / 破关榜** 间切换查看本版 Top 10。提交时自报 agent(真人对局上报 human,AI/机器人自报 `ai`);后端 `/top?agent=`、`/clearboard?agent=` 分流,新增私有黑盒改判接口 `POST /classify`(密钥),日后可把伪装成 human 的 AI 改判到 AI 榜。

### 变更
- **榜单只显示已验证成绩**:`/top` 列表改为只展示 `verified=1`(伪造在重放验证前不可见,验证失败转 -1 永不上榜);百分位仍按 `verified>=0` 给即时近似排名。
- 后端启用 **D1 迁移框架**(`worker/migrations/`),schema 变更走 `wrangler d1 migrations apply`,不再手动 SQL。

### 安全
- **写入端点限流**:`/rec`、`/score`、`/clear` 按来源 IP 限速(Cloudflare 原生 ratelimit,20 次/60s),挡刷榜/批量伪造。

## [v1.11.0] — 2026-06-14

### 新增
- **终局 Boss「终焉之主」👑 + 破关**：第 **500 回合**降临,本身无血、无攻击、打不掉,但**每回合**把若干非怪/非Boss棋子变成随机 Boss(第 1 波 1 个…第 10 波 10 个,浪潮 Boss 为基础档、可清)。撑满 **10 波**还活着即**破关**!棋盘被 Boss 淹没、无路可走则判负。
- **破关榜(仅正式版)**:破关后上报,死亡报告显示总榜/种族榜名次,**按最低破关等级排名**(越低越强),可按种族/版本筛选。后端 `POST /clear`、`GET /clearboard`,沿用确定性重放防作弊(验证录像确实破关)。
- **Boss 入场特效**:任何 Boss 降临时从其格爆出扩散冲击环 + 闪光(普通 Boss 红、终焉之主金),一眼可辨"有 Boss 入场",不再和普通小怪刷新混淆。
- **录像每步时间戳**:录制的每个动作末尾追加相对开局的 epoch ms 时间戳(操作间隔),供后续离线分析;回放/校验按固定下标取值忽略该字段,旧录像照常兼容。

### 变更
- **🕷️ 蜘蛛 → 🧟 僵尸**:原蜘蛛 Boss 换成拟人的僵尸,机制不变(现身即感染、每回合按生命百分比掉血、血条变绿、击败解除)。

### 修复
- **终焉之主免疫剑链**:斗士「嗜血」穿透不再能 0 血秒掉打不掉的终焉之主(否则浪潮中断、永不破关);连带堵死"拖选多个 Boss 免费消除"的漏洞。
- **终局判负误判**:`hasAnyMove` 现正确识别"相邻两个剑目标即可成剑链",不再把可走的局误判为无路可走。
- **终焉浪潮二次行动**:同回合新召唤的 Boss 不再在本回合立即额外行动一次(改为快照本回合行动者)。
- **破关瞬间收尾**:破关后立即停止其余 Boss 行动,不再在胜利覆盖层后继续刷伤害/日志。
- **破关榜防作弊**:破关榜与名次只计已重放验证的真破关,伪造的待验证记录不再短暂占据榜首。
- 终焉之主棋子显示 ∞ 而非 0 血;回放接近尾声的自动暂停文案改为中性(破关回放不再误报"临近死亡");`newPlayer` 初始化终局字段消除潜在 NaN;`gameOver` 复用 `wireEndButtons` 去重。

## [v1.10.1] — 2026-06-14

### 变更
- 回放体验：**临近死亡(倒数 10 回合)自动暂停一次**,方便看清怎么死的;新增**回合节点跳转**(50/100/150…,从种子瞬间快进到目标回合)。

## [v1.10.0] — 2026-06-14

### 新增
- **云端排行榜 + 百分位（仅正式版）**：
  - 正式版死亡后上报成绩（`POST /score`，Cloudflare Worker + D1），死亡报告显示**总榜**与**本种族榜**的名次和百分位。**开发版不参与排名**。
  - 排名指标：**坚持回合 ↓ → 等级 ↓ → 金币 ↓**。
  - **按版本分桶**：录像/分数带 `version`，不同版本不混排（避免平衡差异污染统计）。
  - **防作弊**：录像可确定性重放，GitHub Actions **每小时**重放校验榜单前列（`verify.js`），结局对不上即剔除；分享回合数远超榜首的录像也会被拉去验证。
- **正式版上线录制 / 回放 / 分享**：v1.8.0 的录制回放、v1.9.0 的云分享同步进入正式版（此前仅开发版）。

## [v1.9.0] — 2026-06-14（开发版先行）

### 新增
- **云端录像分享**（先在开发版）：
  - 新增 Cloudflare Worker + KV 的录像 API（`api.dungeonraid.win`）：`POST /rec` 存录像返回短 id，`GET /rec/:id` 取回，带 CORS。
  - 死亡报告新增 **🔗 分享链接**：上传本局录像→生成 `?rec=<id>` 链接并复制；打开该链接即自动回放。
  - **上传门槛**：少于 30 回合的录像不接收（客户端 + 服务端双重校验，挡垃圾录像）。
  - 单份录像上限 200KB。

## [v1.8.0] — 2026-06-14

### 新增
- **操作录制 + 回放（确定性重放）**：
  - 全程随机数改为带种子的 PRNG（mulberry32），只需记录「种子 + 玩家操作序列」即可完整还原一局，一局约 2–4 KB。
  - 死亡报告新增 **🎬 回放本局 / 📋 复制录像 / ⏬ 导出**；开始界面新增 **🎬 回放上一局** 与 **📥 导入回放**（粘贴 JSON）。
  - 回放为自动播放，带控制条：进度、⏸暂停/继续、1×/2×/4× 调速、⏹退出。
  - 录像随存档持久化，「继续上局」不中断录制。dev / 正式版各自独立的录像槽。

### 内部
- 抽出 `rollUpgradePool()` / `applyUpgrade()` 供 UI 与回放共用，保证升级洗牌消耗相同 RNG；回放时抑制升级/转职弹窗，由动作序列驱动。
- 确定性已用桩件测试验证（同种子同操作→终局完全一致；不同种子→不同）。

## [v1.7.1] — 2026-06-13

### 修复
- 升级卡「强健体魄」描述固定写 +6，没反映种族修正（兽人应 +12、精灵应 +3）——效果本身是对的，只是文案写死。改为按 `maxHpUpMult` 动态生成描述（升级三选一的渲染支持函数型描述）。

## [v1.7.0] — 2026-06-13

### 新增
- **开发版 / 正式版双版本**：
  - 新增 `dungeon-raid-dev.html`（开发版，指向最新开发版本），与 `dungeon-raid.html`（正式版）并存。
  - 两版**存档相互独立**（DEV 用 `dr_save_dev`/`dr_best_dev`，正式版仍用 `dr_save`/`dr_best`），互不覆盖。
  - 首页 `index.html` 改为选择页，按**大小区分**：正式版大按钮、开发版小入口。
  - 游戏内开始界面徽标 + 底部版本号都标明当前是「✅ 正式版」还是「🚧 DEV 开发版」。
  - 两个 HTML 仅相差一行 `const DEV`（顶部），存档键/标识/徽标均由它派生，便于 dev→正式版 同步。

## [v1.6.4] — 2026-06-13

### 修复
- 升级选完强化、关闭弹窗后，技能/商店按钮一直点不了、要再走一回合才恢复：`showLevelUp` 在 `busy` 还为 true 时就调用了 `updateHUD`（把按钮禁用），之后才把 `busy` 置回 false 却没再刷新。改为在 `busy=false`、`hideOverlay()` 之后再 `updateHUD()`。

## [v1.6.3] — 2026-06-13

### 修复
- 守财奴 **囤金**「点不动」：囤金锁定可达 10 回合，而技能冷却仅 5 回合，冷却结束后按钮显示「可发动」但点击无效（锁定期间 `goldLock>0` 会拒绝再次发动）。现改为囤金期间按钮显示「🔒剩余回合」并禁用，到期才恢复，消除假“可发动”死按钮。

## [v1.6.2] — 2026-06-13

### 变更
- HUD 护甲条标签由「护甲」改为「护甲进度」，更准确反映它显示的是「攒满 +1 护甲」的进度而非当前护甲值。

## [v1.6.1] — 2026-06-13

### 变更
- 兽人二阶 **嗜杀 → 巨力 Titan**：原「剩余血量越高剑伤越高(+50%)」与一阶狂怒「残血增伤」方向相反、概念重复（同为按当前血量百分比缩放剑伤），改为**「最大生命越高，剑链固定伤害越高」（每 12 点最大生命 +1）**，与兽人 HP×2 特性联动，且不再与狂怒撞车。移除已无人使用的 `highHpDmg`。
- 机器人 `swordEval` 伤害模型修正：原引用不存在的 `p.berserk`，改为与游戏一致的狂怒残血增伤 + 巨力固定加成 + 连击/剑伤倍率。

## [v1.6.0] — 2026-06-13

### 变更
- **兽人重做**：
  - 特性由「蛮力·剑伤 ×1.25」改为**「强健体魄」升级时生命上限翻倍（每次 +12）**；削弱仍为无甲。兽人改走「无甲高血量」路线。
  - 一阶 **狂战士·狂怒**：新增**不屈**——开启的当回合无论受到多高伤害都保留 1 血（搭配残血增伤）。
  - 一阶 **斗士·嗜血**：开启时除回血外，**本回合还能用剑攻击剑免疫的 Boss（幽灵/小丑）**，给兽人一个应对剑免疫 Boss 的手段。

### 文档
- README 按当前版本整体重写（4 种族 / 8 一阶 / 8 二阶 / 8 Boss 全量对齐，移除旧开局职业表）。

## [v1.5.0] — 2026-06-13

### 新增
- 新 Boss **蜘蛛 🕷️**：现身即给玩家上毒——血条变绿，每回合按玩家最大生命的百分比掉血（一阶 10%、二阶 20%，按 Boss 档位递增），无视护甲。用剑或炸弹击败它即可解毒。

### 工具
- `playtest.js` 新增**定向测试模式**：`--race` / `--t1` / `--t2` 固定种族与转职线，`--boss` 把某 Boss 设为唯一会刷的，`--enemy` 选敌人数值候选，`--games` 改局数，`--report` 输出全种族详细表。可与历史结果同条件对比。

## [v1.4.0] — 2026-06-13

### 新增
- 新 Boss **小偷 🦹**：现身即偷取玩家一定比例的金币（一阶 20%、二阶 40%，按档位递增）。在其逃走倒计时内用剑或炸弹击败它可夺回金币；让它逃走则金币永久消失。

### 变更
- 死亡报告改为**只统计致命那一回合的伤害来源**，更准确地反映真正的死因（不再被全程累计的磨血来源误导）。

## [v1.3.2] — 2026-06-13

### 变更
- 兽人「无甲」体验优化：棋盘**不再生成盾牌格**（剑/心/金三类），升级三选一也**剔除护甲相关项**（重型护甲、坚盾强化），不再出现死格与死选项。

## [v1.3.1] — 2026-06-13

### 平衡
- 软化敌人数值以适配种族系统的「裸开局」（转一阶前没有职业主动技能）：攻击 `lv×1.0→×0.7`、生命 `lv×0.85→×0.7`、出手冷却 `2~3→3~4`、刷怪率 `0.34→0.30`。

## [v1.3.0] — 2026-06-13

### 重构
- 职业系统重做为 **种族 → 一阶 → 二阶** 成长线：
  - 开局四选一**种族**（各带独特特性与不可被升级弥补的削弱）：人类（全能基准）、精灵（连击翻倍 / 生命上限升级减半）、矮人（护甲减伤翻倍 / 剑威力 −0.3）、兽人（剑伤 ×1.25 / 永久无甲）。
  - 击败第 50 回合 Boss → 转**一阶**（种族专属的主动技能二选一）。
  - 击败第 100 回合 Boss → 转**二阶**（被动强化二选一）。

## [v1.2.1] — 2026-06-13

### 新增
- 加入 MIT `LICENSE`；标题加「网页版 / Web」。
- README 增加致敬 2011 年 iOS 原版《Dungeon Raid》(Fireflame Games) 的双语声明。

## [v1.2.0] — 2026-06-13

### 变更
- 版本号改为三段式 `v主.次.修`，页面底部更清晰显示。

## [v1.2] — 2026-06-13

### 平衡
- 刺客 Boss 的生命/攻击恒定与同级普通怪一致（不吃 Boss 档位倍率）。

## [v1.1] — 2026-06-13

### 新增
- Boss 每 50 回合**升级档位**：血量、攻击、特效随档位增强。

## [v1.0] — 2026-06-13

首个带版本号的版本。此前的 0.x 开发已具备完整核心玩法，主要内容：

### 核心玩法
- 单文件 HTML5 Canvas 连线消除 + Roguelike：拖动连接相邻同类图块（剑/盾/心/金/怪，8 方向）。
- 剑链可拖过怪，每只串到的怪独立吃满整条链伤害；会被杀死的怪实时显示 💀 预览。
- 连击加成 `×(1+(N−2)×15%)`；经验只来自击杀。
- 护甲为「连盾累积、攒满 +1」的常驻减伤机制。
- 金币商店：治疗 / 修甲 / 炸弹（各自独立冷却）。
- 职业主动技能（5 回合冷却）。

### Boss 池（每 10 回合随机现身）
- 幽灵 👻（剑链免疫，只能炸弹）、小丑 🤡（每回合打乱棋盘）、吸血鬼 🧛（每回合吸心回血，可被剑砍）、刺客 🥷（无视护甲的真实伤害）、饕餮 🦖（吞噬怪物壮大，倒计时放大招）、召唤师 🧙（每回合召唤怪）。

### 其他
- 中英双语，全 UI 可切换，首次访问跟随浏览器语言。
- 死亡报告（伤害来源占比）、低血红色警示、HUD 可点开查看角色详情、轻点方块看说明与实时数值。
- 本地存档与最佳纪录；移动端 emoji 居中适配；`playtest.js` 无头平衡机器人。

[v1.27.4]: 修复回放跳转/步进后固定几格闪爆炸特效（addBossFx 补快进守卫 + 跳转清 bossFx）
[v1.27.3]: 血狂溢出转永久生命上限比例 50%→100%（兽人斗士后期增强）
[v1.27.2]: 精灵新职业改名 长老→森林长老、死亡缠绕→蔓藤缠绕（机制/id 不变）
[v1.27.1]: 击败350回合Boss后弹警告 + 此后每10回合同时降临2个不同Boss（终局前压力升级）
[v1.27.0]: 新精灵职业 长老(死亡缠绕：5回合每回合全场怪-10%你最大生命、敌人变绿) + 荆棘移精灵且反弹=护甲减伤量 + 兽人斗士改 血狂(吸血溢出半数升上限)
[v1.26.1]: 黑毒心/绿毒心底色改回与普通心一致（只靠 emoji 区分；普通心保留 💗，❤️ 在 iOS canvas 会偏移）
[v1.26.0]: 牧师二阶被动「不朽」改为「神圣打击」（治疗溢出随机攻击敌人，去超模）+ 主动「祝福」改为转经验同时回血
[v1.25.30]: 汲取生命吸血覆盖所有击杀手段（剑/炸弹/毒/箭雨/溅射/吸魂/荆棘反杀，统一 lifestealHeal + 日志显示）
[v1.25.29]: 修复汲取生命吸血像没效果（炸弹击杀也吸血 + 日志显示「吸血 +N」，原来只剑杀且无日志）
[v1.25.28]: 去掉万物皆毒描述里的「污染怪变化之后」交互说明（行为不变，文案精简；README 中英同步）
[v1.25.27]: 修复回放步进没连线/冒一堆炸弹特效（跳转清残留 bombFx + 停在连线结算前预显示该连线）
[v1.25.26]: 满血时治疗不可用（按钮置灰显示「已满血」、点击不购买）+ 更新描述
[v1.25.25]: 修复击败 Boss 没有奖励日志（奖励提示统一进 onBossKilled，剑/炸弹/荆棘/吸魂等都报「🏆击败Boss 💰+20 经验+15」）
[v1.25.24]: 修复荆棘反弹打成随机目标（说明是「反弹给攻击者」）——改为优先反弹给攻击者本人，攻击者离场才退回随机
[v1.25.23]: 吸血鬼吸到黑毒心会中毒/被毒死（正常心回血、毒心反害，净效果结算）——巫医蛊毒可反制吸血鬼
[v1.25.22]: 日志按事件类型上色（回血绿/增益蓝/攻击白/受击·Boss出场红/负面黄）+ 回放跳转固定 50/100/200/350 加「−10」看结局
[v1.25.21]: 修复巫医蛊毒发动后心不变黑（改为当场把全场红心燃成黑毒心 poison=true，立显🖤、连之毒全场）
[v1.25.20]: 修复炸弹说明里 {W} 未解析（tr→L，按种族渲染武器名）
[v1.25.19]: 英文文案——减伤 Cut→DR，护甲进度统一为 Armor XP（仅英文，中文不变）
[v1.25.18]: 13 个职业主动技能全部补上详细说明 desc（嗜血/蛊毒/箭雨/圣盾/囤金/收买/狂怒/重生等点开都有完整规则）
[v1.25.17]: 修复回放期间误写存档（退出后「继续上局」会接着玩回放残局；连带修复回放跳转按钮回合数错乱）——saveGame 回放中跳过
[v1.25.16]: 修复巫医蛊毒/黑毒心对剑免疫 Boss 没效果（毒伤改为命中全场怪含剑免疫，排除终焉，与炸弹/吸魂一致）
[v1.25.15]: 新增网页图标 favicon（内联 SVG 金色城堡+小旗，零外部文件）+ theme-color；游戏页与首页都加
[v1.25.14]: 修复炸弹炸怪同回合升级时升级框盖住爆炸特效（实玩等特效播完~0.43s再弹框；回放不受影响）
[v1.25.13]: 精简落地页玩法说明（去掉每50回合Boss强档/500回合破关剧透，保留神秘感，中英压缩一屏内）
[v1.25.12]: 修复回放「连线不对」（改两拍：结算前先画线再结算）+ 进度条独占一行/步进键保留占位/顶栏文字简化为「回合 X/总」
[v1.25.11]: 修复主栏红字与展开栏不一致（主栏也逐行按各自 red 标记上色，共用 logColor）
[v1.25.10]: 修复回放完全不显示连线（保留连线、只在暂停/跳转/结束清）+ 日志框左右与棋盘对齐
[v1.25.9]: 修复完整日志里红字丢失（历史记录带 red 标记）+ 主界面日志加框
[v1.25.8]: 修复吸魂红线闪 2 次（动画加 fill:forwards + 初始隐藏，去掉结束回弹）
[v1.25.7]: 炸弹爆炸特效（每个命中怪/Boss 格爆橙色闪光+扩散环；纯 UI）
[v1.25.6]: 修复回放/跳转后残留旧连线（画在重排棋盘上像“连了没连的”）+ 快进时不放吸魂特效
[v1.25.5]: 吸魂大法吸血特效（从被吸目标格画红线指向血条；纯 UI）
[v1.25.4]: 矮人↔兽人武器对调（兽人🪓斧、矮人🔨锤，纯显示）+ README 加在线试玩链接
[v1.25.3]: 会长「收买」改为真花「全怪血量」金币买通 + 移除冷却；饕餮显示动态攻击角标（=血量50%）
[v1.25.2]: 修复回放中可操作棋盘致回放与真实不符；回放控制改版（点棋盘暂停 + ◀▶单回合步进，边界变灰）
[v1.25.1]: 修复转职后技能/商店按钮停留在禁用态（老问题）——updateHUD 移到 busy 复位之后
[v1.25.0]: 职业进阶链重构（50主动→100锁定专属被动→200同族另一被动）+ 拆出皆可为剑/万物皆毒(黑毒心)
[v1.24.3]: 调高怪物/Boss 攻击力（怪 lv×0.7→1.1、Boss lv×1.2→1.8），避免后期护甲碾压攻击只吃 1 点
[v1.24.2]: 修复点版本号一直「加载中」（更新日志改为嵌入页面、零网络，dr.sh 自动从 CHANGELOG 注入）
[v1.24.1]: 日志栏可点开看历史 + 点版本号看更新日志 + 底部方块提示 + 修角色面板技能冷却显示（用有效冷却）
[v1.24.0]: 雪人重做（移除攻击→倒计时归零再次冰封，留可炸窗口）+ 每回合行动 Boss 标注倒计时
[v1.23.1]: 吸魂大法描述按种族渲染武器免疫（骨/剑）+ 写清吸取规则（每个最多吸你的生命上限）
[v1.23.0]: 吸魂大法的溢出也触发「溅射」（吸死目标后多出的吸力砸向剩余敌人，含剑免疫）
[v1.22.8]: 吸魂大法描述写明对 Boss 有效（和炸弹一样含剑免疫的；终焉除外）
[v1.22.7]: 角色详情面板 + 长按技能块弹窗的俏皮话也紧跟职业名（与转职选择页一致）
[v1.22.6]: 转职选择页俏皮话紧跟职业名、技能描述另起一行（原顺序反了）
[v1.22.5]: 升级「强化体魄」不再回满血，改为回等量血（去掉升级白嫖满血；人族+6/回6）
[v1.22.4]: 长按商店/技能块（治疗/炸弹/职业主动）弹出详细说明（含当前数值；置灰也能看；纯 UI）
[v1.22.3]: 修复召唤师塞满棋盘后卡死不判负（hasAnyMove 只认真剑链 + 判负扩展到全对局 + 逃生判定）
[v1.22.2]: 修复小偷高档位（≥第5档/100%）把金币偷成负数（偷取量封顶为当前金币）+ 攻击日志加高到完整 2 行
[v1.22.1]: 修复无头机器人在正式版引擎上自动以人类上报、抢用种子 token（AI 榜上传 422）
[v1.22.0]: 反作弊·服务端发种子（一次性种子+token，防离线刷幸运种子；离线可玩不计排名）
[v1.21.5]: 死亡/破关报告显示游玩时长（⏱ 用时；继续上局排除关游戏的间隔）
[v1.21.4]: 职业进阶文案改版（职业→二阶技能→本族技能→跨界技能，只剧透50回合、保持神秘）
[v1.21.3]: 开始页版本徽标旁加「🏠 首页」按钮（回到 index.html 切换版本）
[v1.21.2]: 修复回放「跳回合」一跳就到结束画面（快进期间抑制 gameOver、防崩溃）
[v1.21.1]: 各种族专属武器图标（精灵箭/矮人斧/兽人狼牙棒/活死人骨）+ 核心文案随之改名
[v1.21.0]: 矮人新职业 会长(收买)/小气鬼(主动花费减半) + 转职祝福语 + 修复箭雨对僵尸无效
[v1.20.0]: 新 Boss 雪人（只能炸弹；现身随机冰封 1/2/3 个主动 4 回合，按档位）
[v1.19.0]: 新 Boss 污染怪（在场时全场心变毒心，连之扣血；只能炸弹清掉）
[v1.18.0]: 新 Boss 石像（受到的伤害真实反弹给玩家，攻击它=伤害自己）
[v1.17.3]: 商店治疗改为随使用递增（每次恢复 +2、耗金 +1），后期不再鸡肋
[v1.17.2]: 守财奴囤金缩短为固定 4 回合、返还 ×2→×2.5（去掉越有钱锁越久）
[v1.17.1]: 活死人削弱（治疗 −50% 硬削弱；回测回落到全场顶档持平、不再霸榜）
[v1.17.0]: 新种族 活死人（迷惑天赋 + 死灵/骷髅王 + 回春/溅射），第 5 个种族
[v1.16.2]: 修复鸟人与终焉之主换位导致浪潮停滞、破关被拖到 511 回合之后
[v1.16.1]: 爆破手削弱（增伤炸弹 10→8、成本 ×1.6→×2.0；回测拉回与财阀持平、低于箭雨）
[v1.16.0]: 新职业 巫医(兽人)/剑圣(人族)（主动+被动）+ 新 Boss 鸟人(瞬移) + 技能/Boss 俏皮话
[v1.15.2]: 修复棋盘空白（clampName 正则混入原始 NUL 控制字节破坏内联脚本）
[v1.15.1]: 修复棋盘不渲染隐患 + 僵尸尸毒改为潜伏一回合后发作、单回合≤30%（不再秒杀）
[v1.41.2]: 战斗日志新增每回合自动回血提示（💚 恢复 +N（每回合））
[v1.15.0]: 排行榜展示名（玩家可输入/🎲随机，最长12汉字，AI自动起名）
[v1.14.6]: 日志条移到状态栏与棋盘间 + 排行榜合并最近 3 个版本
[v1.14.5]: 修复兽人无甲仍被给护甲升级 + 机器人可验证录像（--submit-ai 提交 AI 榜）
[v1.14.4]: 修复无剑连线显示骷髅 + 矮人削弱改为总伤×0.85（含固伤，与精灵口径一致）
[v1.14.3]: 升级能力改名（动词+名词；吸血鬼→汲取生命，避免与 Boss 重名）
[v1.14.2]: 矮人头像 🧔 → 🎅（与人族 🧑 区分）
[v1.14.1]: 修复转职与升级同回合导致游戏卡死（不能划）
[v1.14.0]: 新手教学棋盘 + 开始页玩法演示 + 日志移到棋盘下方（Boss 红字）+ 主页底部仅留版本号
[v1.13.6]: 种族「人类」→「人族」（避免与人类玩家榜重名）+ 排行榜按种族筛选
[v1.13.5]: 死亡/破关/换装主动等弹层按一屏原则精简
[v1.13.4]: 开始页两步落地（START 按钮 + 选种族页）+ 每页精简到一屏内
[v1.13.3]: 修复箭雨漏算固定剑伤 + 无剑的怪物连线判无效（不再空挥白扣回合）
[v1.13.2]: 正式版存档按版本兼容（变版本即从头开始，dev 不受影响）+ 致敬联系改指 issues
[v1.13.1]: 开篇引言（背景/玩法 + 致敬原作与作者 GitHub）+ 破关故事化祝贺页
[v1.13.0]: 200回合第二被动 + 350回合换装主动（任选职业主动替换治疗/炸弹槽）
[v1.12.3]: 修复 Boss 入场特效随重力下落、不再落到别的棋子上
[v1.12.2]: 一阶 Boss 也标注 Lv1（档位标签始终显示）
[v1.12.1]: 修复拖动连线退回第一格被误判为轻触弹说明
[v1.12.0]: AI 排行榜（human/ai 分流 + 游戏内切换）+ 榜单只显示已验证 + 写入限流 + D1 迁移框架
[v1.11.0]: 终局Boss终焉之主👑（500回合）+ 破关 + 破关榜（按最低等级）
[v1.10.1]: 回放临近死亡自动暂停 + 回合节点跳转（50/100/150…）
[v1.10.0]: 云排行榜 + 百分位（D1，按版本分桶，每小时重放防作弊）+ 录制/回放/分享上线正式版
[v1.9.0]: 云端录像分享（Worker+KV，分享链接/?rec= 回放，≥30 回合才可上传）— 开发版先行
[v1.8.0]: 操作录制 + 回放（种子确定性重放，导出/导入，调速）
[v1.7.1]: 修复「强健体魄」升级描述写死 +6（兽人应 +12、精灵 +3）
[v1.7.0]: 双版本（正式版 + 开发版 dungeon-raid-dev.html，存档独立，首页选择）
[v1.6.4]: 修复升级后技能/商店按钮要等下一回合才可点
[v1.6.3]: 修复守财奴囤金「点不动」（锁定期按钮假可发动）
[v1.6.2]: HUD「护甲」标签改为「护甲进度」
[v1.6.1]: 兽人二阶 嗜杀→巨力（去掉与狂怒重复的血量增伤）
[v1.6.0]: 兽人重做（HP×2 特性 + 狂怒不屈 + 嗜血穿透）
[v1.5.0]: 新 Boss 蜘蛛
[v1.4.0]: 新 Boss 小偷 + 死亡报告修正
[v1.3.2]: 兽人无甲棋盘
[v1.3.1]: 敌人数值软化
[v1.3.0]: 种族→转职系统重构
[v1.2.1]: LICENSE + 致敬声明
[v1.2.0]: 三段式版本号
[v1.2]: 刺客平衡
[v1.1]: Boss 档位升级
[v1.0]: 首个版本
