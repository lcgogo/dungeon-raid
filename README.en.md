# ⚔️ Dungeon Raid

> A single-file HTML match-link Roguelike game. Pure vanilla JavaScript + Canvas — just open it in any mobile/desktop browser, no dependencies.

> 🙏 **A tribute**: This is a fan-made web remake inspired by the classic iOS game **Dungeon Raid** by Fireflame Games (2011). It is an unofficial homage, not affiliated with the original author — made just for learning and fun.

**▶ Release: <https://dungeonraid.win>** ｜ Dev: <https://dungeonraid.win/dungeon-raid-dev.html>

[README Hub](./README.md) · [中文](./README.zh-CN.md)

---

## 🎮 Getting Started

Play online: **<https://dungeonraid.win>** (Dev build: <https://dungeonraid.win/dungeon-raid-dev.html>). Or clone the repo and open `dungeon-raid.html` in a browser. The game auto-fits the screen width and supports both touch and mouse.

**Two builds** (pick on the `index.html` home page, sized to tell them apart):

| Build | File | Notes |
|---|---|---|
| ✅ **Release** | `dungeon-raid.html` | The stable version |
| 🚧 **Dev** | `dungeon-raid-dev.html` | Tracks the latest dev build; new features land here first |

The two builds keep **separate, non-overwriting saves** (Dev uses its own localStorage keys). The start screen and footer both label which build you are in. The home page’s Release / Dev version numbers are **statically injected at deploy time**, so they appear instantly even on weak connections without an extra fetch.

## 🧩 Core Gameplay

- **Drag to connect** 2 or more **adjacent same-type** tiles to clear them (horizontal, vertical, and diagonal — all 8 directions).
- Each tile type does something different:

  | Tile | Effect |
  |---|---|
  | 🔪 Sword | Attack enemies |
  | 🔰 Shield | Gain armor (absorbs damage before health) |
  | 💗 Heart | Restore health |
  | 💰 Coin | Earn gold for the shop |
  | 🐾 Claw | The Mythic Beasts' weapon for attacking foes |
  | 👹 Enemy | A monster |

- A **sword chain can be dragged straight through 👹**. Every enemy on the chain takes the **full** chain damage **independently** — enough damage means an instant kill. The sword is your weapon, so a chain must include **at least one 🔪** to deal damage (chaining only monsters with no sword isn't an attack and costs no turn).
- While dragging, any enemy that **would die** turns into 💀 as a live preview.

## 👹 Enemy Info

Each enemy tile shows three numbers:

- **Big center number** = health
- **Red badge, top-left** = attack power (shown purple for true-damage bosses)
- **Badge, top-right** = countdown (−1 per action; at zero it attacks you for its attack power — armor first, then health, but you always lose at least 1 HP)

## 📈 Progression

- **XP comes only from kills** (+3 per enemy). On level-up, **pick 1 of 3** upgrades. The regen upgrade **Channel Vitality** now scales by repeated picks: the 1st pick gives +1 per turn, the 2nd adds +2 more (total 3), the 3rd adds +3 more (total 6), and so on.
- **Combo bonus**: longer chains pay more — total reward `× (1 + (N − 2) × 15%)` (5-chain ≈ ×1.45, 7-chain ≈ ×1.75).
- **Armor accumulates**: shields do not grant damage reduction directly; they fill the HUD "Armor" bar, and filling it gives +1 damage reduction (costs more each time). Damage reduction soaks each hit, then the rest comes off your HP.
- **Gold shop**: 💊 Heal (restore 10 HP, **+2 healing and +1 gold cost per use**; **unavailable at full HP** to avoid waste) / 💥 Bomb (all foes −5 HP). Each item has its own cooldown.

## 🧬 Races (chosen at start)

Pick a race at the start. Each has a unique **trait** and a matching **weakness**:

| Race | Trait | Weakness |
|---|---|---|
| 🧑 Human | None (all-round baseline, beginner-friendly) | None |
| 🧝 Elf | Combo bonus doubled (+30% per extra tile) | Fortify Body upgrade gives only +3 max HP |
| 🎅 Dwarf | Armor counts double (each point blocks 2) | ×0.85 total sword damage (flat included) |
| 🧌 Orc | Fortify Body upgrade gives double max HP (+12 each) | **No Armor** — can never gain armor (shields removed from the board) |
| 🪦 Undead | **Confusion**: all monsters (incl. bosses) get +1 attack countdown | All healing halved (hearts/potion/drain) + active-skill cooldowns +1 |
| 🐉 Mythic Beasts | **Divine Sense**: gain 2× XP | **Yin-Yang Imbalance**: all foes get −1 attack countdown (minimum 1) |

## 🌟 Progression Path

1. **Start**: choose a race.
2. **Turn-50 boss**: beat it to take a **Class** (active skill), picking one of your race's classes.
3. **Turn-100 boss**: beat it to automatically gain your **class's locked Tier-2 Skill** (passive — **no longer a free pick**; determined by the class you chose at 50, see table below).
4. **Turn-200 boss**: beat it to gain a **Race Skill** — **pick one** of your race's other passives (3-class races choose 1 of 2; 2-class races get the single remaining one).
5. **Turn-350 boss**: beat it to unlock a **Crossover Skill** — pick **any class's active (any race)** and **replace your 💊Heal or 💥Bomb shop slot** (with the skill's cooldown; cross-race builds allowed). Crossover actives resolve from your current stats and acquired passives; they do not require their original class. Permanently invalid picks are hidden (for example, no-armor characters cannot choose Forge Armor), while original-class passives are synergies rather than requirements.
6. **Turn-500 · the Overlord 👑**: the final trial — clear or fall (see below).

> Beating a boss with your weapon chain or a bomb triggers the advance.
> Progression: **Class → Tier-2 Skill → Race Skill → Crossover Skill**.

## ⚔️ Classes · Active Skills

Each race has **several** classes; every skill has a **5-turn cooldown** (except Guild Master's Buyout: **no cooldown**, self-limited by its gold cost):

| Race | Class | Skill | Effect |
|---|---|---|---|
| 🧑 Human | 🛡️ Knight | Aegis | Immune to all damage this turn |
| 🧑 Human | 💗 Priest | Blessing | Clear all hearts on the board; each becomes 3 XP **and also heals you (by your heal-per-heart)** |
| 🧑 Human | 🔥 Fire Mage | Flame Chain | Highlights and enables bosses this turn, including sword-immune bosses as the first target; every enemy hit by your sword chain is ignited and then loses **20% of the ignition-turn flat damage** each turn (minimum 1, stacks, until death) |
| 🧑 Human | ⚔️ Sword Saint | Bladeshift | Turn every heart and coin into swords (its signature passive "Anything a Blade" unlocks at level 100, see below) |
| 🧝 Elf | 🏹 Ranger | Arrow Rain | Deal "sword power ×2" damage to all enemies |
| 🧝 Elf | 💰 Rogue | Empty Pockets | For this turn, each enemy hit by your sword chain drops extra gold equal to 20% of its pre-hit HP (rounded down, minimum 1); the chain turns gold |
| 🧝 Elf | 🌿 Treant | Vine Coil | For the next 3 turns, all enemies/bosses (incl. sword-immune; Overlord excluded) lose 30% of your max HP each turn; cursed foes glow green |
| 🧝 Elf | 🔮 Seer | Prophecy | Opens a modal to choose coin / shield / heart / sword / enemy; during the next refill, all newly falling tiles become that type. If no refill happens this turn, the effect waits until the next refill. Choosing enemy creates only normal enemies, never bosses |
| 🎅 Dwarf | 🔰 Blacksmith | Forge Armor | Absorb all shields on the board into armor progress |
| 🎅 Dwarf | 🔒 Miser | Hoard | Invest **all current gold** into Hoard; after **4 turns**, the remaining invested gold is paid back at **1.2×**. New gold earned during Hoard is banked normally, and shops / other skills remain usable |
| 🎅 Dwarf | 💼 Guild Master | Buyout | **Pay gold equal to the total HP of all enemies** to bribe them all **into coins** (only if you can afford it; **no cooldown** — reuse it as long as you have gold; bosses unaffected; costs half once you have Cheapskate) |
| 🎅 Dwarf | 🔫 Musketeer | Snipe | Prioritizes bosses; if there are multiple bosses, it shoots the one with the **lowest HP**. If there is no boss, it falls back to the current **highest-HP** monster/boss (bomb-type — hits sword-immune & special bosses; not the Overlord) for **2× your Bomb damage**; a kill grants **triple XP + triple gold** (CD 5; scales with Demolitionist) |
| 🧌 Orc | 🔪 Tauren | Frenzy | Halve HP and become **Undying** (**this turn only**: keep ≥1 HP no matter the damage); also **permanently** enables low-HP scaling — lower HP means higher sword damage (up to +60%) |
| 🧌 Orc | 🩸 Fighter | Bloodthirst | **Drain 3 HP per monster / boss hit** by your sword chain this turn, **and your sword can hit sword-immune bosses (Ghost/Clown)** |
| 🧌 Orc | 🧪 Witch Doctor | Hex | **Burns every red heart on the board into a black poison heart 🖤**; linking them heals nothing and poisons **all foes (incl. sword-immune; Overlord excluded)** instead (its signature passive "All is Poison" unlocks at level 100, see below) |
| 🧌 Orc | 🪓 Axe Lord | Taunt | Set all enemies/bosses on the board (excluding the Overlord) to attack on the **next turn** by forcing their countdown to **1**; the skill card short text also notes that during that volley, **10% of the actual damage you take** becomes **permanent max HP** (**minimum +1**) |
| 🪦 Undead | 🪄 Necromancer | Soul Drain | Drain HP from 2 random targets (monsters or bosses — **including sword-immune ones, like the bomb**; Overlord excluded) to heal yourself; per-target drain = your max HP, so any target with HP ≤ your max HP dies |
| 🪦 Undead | 💀 Skeleton King | Rebirth | If slain this turn, cheat death and refill to full HP; afterward Rebirth's own cooldown grows +2 (each actual revive) |
| 🪦 Undead | 🪝 Butcher | Hook | Drags every monster/boss (incl. sword-immune; Overlord excluded) down to the bottom of its column while other tiles float up; then deals damage by **distance from the bottom**: bottom row takes 1× flat damage, second-from-bottom takes 2×, and so on (CD 5) |
| 🪦 Undead | 🧊 Lich | Frost Orb | Deal your **current flat damage** once to all monsters/bosses on the board (excluding the Overlord), then add **+1 to their current attack countdown** so their next attack is delayed by one extra turn |
| 🐉 Mythic Beasts | 🐉 Azure Dragon | Dragon Roar | Deal damage equal to your level to all foes, including normal-attack-immune bosses |
| 🐉 Mythic Beasts | 🐯 White Tiger | Tiger Breaker | Your next Claw chain can hit Claw-immune bosses and deals ×3 damage |
| 🐉 Mythic Beasts | 🐢 Black Tortoise | Tortoise Bastion | Immediately gain +1 damage reduction |
| 🐉 Mythic Beasts | 🐦‍🔥 Vermilion Bird | Nirvana | Cannot die this turn; gain ⌊level/2⌋ max HP and revive at 50% of the new max HP |

## 🎖️ Tier-2 Skill / Race Skill · Passives (locked to class)

At **level 100 (Tier-2 Skill)** you automatically get the passive **locked to your class** (the "Class → Passive" mapping below — not a free pick); at **level 200 (Race Skill)** you **pick one** of your race's remaining passives, with the candidate count naturally following however many class paths that race has.

| Race | Class → Locked passive | Effect |
|---|---|---|
| 🧑 Human | Knight → General | Level-up offers 4 choices instead of 3 |
| 🧑 Human | Priest → Holy Strike | Healing overflow **prioritizes bosses**; with multiple bosses it hits the **lowest-HP** one first, and only falls back to normal enemies when no boss is present (Overlord excluded) |
| 🧑 Human | Fire Mage → Firewall | The bottom 3 rows become a visible firewall; monsters/bosses there (including sword-immune ones, excluding the Overlord) lose **20% of your current flat damage** each turn (minimum 1) |
| 🧑 Human | Sword Saint → Anything a Blade | Each turn after the board settles, turn 3 non-enemy non-sword tiles into swords |
| 🧝 Elf | Ranger → Sharpshooter | +2 extra XP per enemy killed by a sword chain |
| 🧝 Elf | Rogue → All-In | After buying a bomb, also spend 20% of your current gold and add exactly that amount to this bomb’s damage |
| 🧝 Elf | Treant → Thorns | When hit, reflect your current armor (damage-reduction) back to the attacker (more armor → more reflect; DoT/poison-backlash/Statue reflection do NOT trigger it) |
| 🧝 Elf | Seer → Echo of Fate | After Prophecy resolves, 3 additional random non-boss tiles transform into the chosen type; if enemy was chosen, those 3 also become normal enemies |
| 🎅 Dwarf | Blacksmith → Shield Bash | Adds your armor (damage-reduction) value to flat {W} damage — more armor, harder hits |
| 🎅 Dwarf | Musketeer → Demolitionist | Each bomb use: +1 damage and +5 gold cost (stronger but pricier each time) |
| 🎅 Dwarf | Miser → Money Buys Life | While Hoard is active, incoming damage spends **current gold only**; if wallet gold runs out, the remainder spills into HP and **invested Hoard gold is not spent** |
| 🎅 Dwarf | Guild Master → Cheapskate | Gold-spending actives (shop 💊Heal / 💥Bomb, Guild Master’s Buyout) cost half |
| 🧌 Orc | Tauren → Titan | Higher max HP means higher flat sword damage (+1 per 12 max HP) |
| 🧌 Orc | Fighter → Blood Frenzy | When Lifesteal/Bloodthirst healing exceeds max HP, **30%** of the overflow becomes permanent max HP; but at the **end of every turn you lose 5% of max HP** |
| 🧌 Orc | Witch Doctor → All is Poison | Each turn burns 3 non-enemy non-heart tiles into 🖤 **black poison hearts**; linking them **only poisons all foes (no heal)** — red hearts still heal, your choice |
| 🧌 Orc | Axe Lord → Unbroken | Whenever you take damage, gain **+1 permanent max HP**. Scars are a warrior's medals. |
| 🪦 Undead | Necromancer → Wither Aura | Each turn, you first lose HP equal to your regen amount after healing modifiers, then all enemies/bosses lose that same amount; even at full HP, the aura still uses that modified regen value |
| 🪦 Undead | Skeleton King → Splash | Overflow damage splashes to a random remaining foe (**including sword-immune bosses**); triggers from sword chains, Arrow Rain, and Soul Drain overflow |
| 🪦 Undead | Butcher → Carrion Feast | Each enemy/boss killed: +1 permanent max HP (carrion keeps piling up) |
| 🪦 Undead | Lich → Ice Armor | Whenever a monster/boss hits you, deal **50% of your current flat damage** back to that attacker (minimum 1) and add **+1 to its current attack countdown** |
| 🐉 Mythic Beasts | Azure Dragon → Dragon Might | After using any active skill, normal monsters deal half attack damage |
| 🐉 Mythic Beasts | White Tiger → Tiger Fury | +2 flat Claw damage |
| 🐉 Mythic Beasts | Black Tortoise → Heart of Tarrasque | Restore 10% of current HP each turn |
| 🐉 Mythic Beasts | Vermilion Bird → Fire Feather | Any monster that attacks Vermilion Bird is ignited using Flame Chain’s burn logic |

## 👹 Bestiary

Every **10 turns** a random boss is guaranteed to appear; **beating one by any means rewards 💰+20 and +15 XP** (announced in the log). **If you don't clear it in time the next one still comes and stacks** — no camping a weak boss to suppress the rest. Boss strength steps up one tier every **50 turns** (Lv2, Lv3…). **Ghost / Clown / Corruptor / Snowman can only be hit with the 💥 Bomb** (or bomb-like non-weapon damage such as poison/drain); all others can be attacked with sword chains too. **After you beat the turn-350 boss, a warning pops and from then on 2 different bosses descend together every 10 turns** — a ramp toward the turn-500 endgame.

| Boss | How to hit | Gimmick |
|---|---|---|
| 👻 Ghost | Bomb only | Immune to sword chains; **its HP matches same-tier normal enemies (without the extra boss-tier HP multiplier)**; strikes you hard when its timer hits 0 |
| 🤡 Clown | Bomb only | Re-rolls several non-monster tiles into other resources each turn, disrupting your chains; does NOT spawn monsters (that's the Summoner) |
| 🪢 Lashmaster | Bomb only | On spawn, all normal enemies get **-1 attack countdown**, and each turn after that they get **-1 attack countdown** again. It may not be the deadliest foe by itself, but it drags the whole board into a frenzy the longer it lives. |
| ♨️ Magmafiend | Sword / Bomb | **Every turn**, it melts all shields on the board but no longer restores HP from them; it also **feeds on fire** — instead of being ignited or hurt by Firewall, those fire effects heal it. It does not directly strip your current armor, but it makes it much harder to sustain a shield-based defense. |
| 🧛 Vampire | Sword / Bomb | Drains every heart on the board each turn to heal — do not leave hearts out; but **drinking poison hearts (Corruptor green / Witch Doctor black) poisons it instead — it loses HP and can even die** (counter it with Hex) |
| 🥷 Assassin | Sword / Bomb | Stats like a normal enemy, but its hits are **true damage** — ignore armor, straight to HP |
| 🦖 Devourer | Sword / Bomb | When its countdown hits 0, it first strikes for **50% of its current HP**; only after that hit resolves does it drain half the HP from every regular enemy to grow |
| 🧙 Summoner | Sword / Bomb | Turns a non-enemy tile into an enemy each turn — the longer it lives, the more enemies |
| 🦹 Thief | Sword / Bomb | Steals a share of gold on arrival (20% at Lv1, 40% at Lv2…, capped at all you have at high tiers — never goes negative); kill it before its timer to recover, let it flee and the gold is gone forever |
| 🧟 Zombie | Sword / Bomb | Infects you on arrival (HP bar turns green); **after a 1-turn incubation** you lose a % of HP each turn (scaling per tier, capped at 30%/turn, ignoring armor); kill it during incubation to cure |
| 🦅 Birdman | Sword / Bomb | **Every turn** it dives to peck you (half attack) and, at turn end, **swaps places with a random tile (teleport)** — elusive and nagging, so line up your chain where it lands and finish it fast |
| 🗿 Statue | Sword / Bomb (careful!) | **Whatever damage it takes, it reflects back at you as TRUE damage (ignoring armor)** — attacking it hurts you. Make sure you have the HP to survive the kill; don't one-shot yourself (sword/bomb/splash/drain all reflect) |
| 🦠 Corruptor | Bomb only | While it's on the board, **all hearts become poison (green 💚)** — linking them DRAINS that much HP (ignoring armor) instead of healing! Bomb it and the green poison hearts immediately **revert** to normal hearts (low HP, one or two bombs) |
| ⛄ Snowman | Bomb only | On arrival it **freezes random actives** — Lv1: 1 skill for 1 turn; Lv2: 2 for 1 turn; Lv3: 1 for 2 turns; Lv4: 2 for 2 turns; Lv5: 2 skills for 3 turns; Lv6: 3 for 3 turns; Lv7: 3 for 4 turns; Lv8: 3 for 5 turns; Lv9: 3 for 6 turns. Then it **re-freezes every time its countdown hits 0**. It deals **NO damage itself** — bomb it during the thaw window |

> Each boss arrives with a **shockwave ring + flash** effect (crimson for normal bosses, gold for the Overlord), so you never miss one. Every boss and every class active also carries a one-line **quip** in its info popup.

## 👑 Endgame: the Overlord & Clearing

At **turn 500**, the final boss — the **Overlord 👑** — descends. It has **no HP, no attack, and cannot be killed**, but **every turn** it turns several non-enemy tiles into random bosses — **1 on wave 1, 2 on wave 2 … 10 on wave 10** (wave bosses are base-tier and killable).

- Survive all **10 waves** → **CLEARED!** 🏆 (around turn 511)
- Board jammed with monsters, no legal move and no ready skill/bomb to break it → **defeat** (any game, not just the finale — e.g. a Summoner flooding the board)

Clearing shows a story-flavored congratulations screen; the Release build reports clears to the **clear board**, ranked by **lowest clear level** (lower = stronger). Clearing is a rare milestone, so the **clear board shows all builds ever** (unlike the survival board's latest-3-builds window).

## ✨ Other Features

- 📖 **Opening intro / gameplay demo / clear celebration**: the start screen has a fictional backstory + gameplay primer (with a chain-through-monster demo showing all 8 directions, diagonals included) and a tribute note; your **first-ever run** is guaranteed a “sword–monster–sword” combo to learn the core move immediately; surviving all 10 Overlord waves shows a story-flavored congratulations screen.
- 🌈 **Color-coded log**: the boxed game log sits right under the status bar and board, **colored by event type** — heal = green, buff (armor/gold/XP/class actives) = blue, attacking enemies = white, getting hit / a boss appearing = red, debuffs (freeze/poison/theft/scramble) = yellow. **Tap the log** for the full run history.
- 📲 **Add-to-home-screen shortcut**: the entry now lives at the top-left corner of the landing page (the Release / Dev chooser); browsers with an install prompt can launch it directly, while unsupported browsers show a short “Add to Home Screen / Install App” hint. The button hides itself automatically when the game is already running in standalone mode.
- 💾 **Local save**: progress and best record are saved automatically; resume your last run anytime, with the RNG path restored too so refills / spawns / upgrade shuffles stay deterministic instead of quietly desyncing the recording.
- 🔨 **Dwarf minimum damage**: Dwarf weapon damage still applies the `×0.85` penalty and rounds down overall, but any legal hammer-chain attack now deals at least 1 damage so a lone early hammer hit no longer lands for zero.
- 💡 **Tap any tile**: see its description and current live stats (e.g. your current sword power and flat bonus); tap the HUD to view all your stats and class details. **Long-press a shop/skill block** (Heal/Bomb/class active) for a detailed popup (with current values; works even while greyed-out on cooldown). **At the turn-50 class pick, long-press a class card** to preview its locked tier-2 passive before choosing. **Tap the log** for the full run history; the compact bottom strip still shows only the latest two lines, but same-turn hits from multiple normal enemies are now collapsed into one summary (for example, `👹 2 normal enemies attack: 3 + 7 → 10 HP lost!`) so you no longer lose sight of the earlier hits. Longer multi-step chains are still best read from the expanded history. Soul Drain, Vampire heart-drain, and Magmafiend shield-melt turns now leave emptied cells hanging for a brief beat before refill begins, so the drain/melt line effect and the later falling tiles are easier to read separately; Vampire and Devourer drain tethers now also have a compatibility fallback for mobile browsers that do not animate SVG lines, so you no longer get “the target vanished but the tether never appeared.” Zombie plague ticks now also draw a green infection tether from the Zombie’s tile to the HP bar when they actually make you lose HP, making the source of that drain much easier to read; Guild Master Buyout now sends golden tethers from the gold counter to the bribed enemies, so the spend is much easier to read at a glance. Another now-fixed combat edge case: movers such as Birdman no longer shove another same-turn ready foe out of its snapshotted cell and accidentally cause that later attacker to be skipped.
- ⚡ **Double-tap a Shield / Heart / Coin tile**: auto-draws a greedy longest same-type chain through it, no manual dragging (resource tiles only — sword chains and monsters/bosses are left for you to control).
- 🩸 **Low-HP warning**: the screen edges redden as health drops, pulsing when critical, with the HP bar blinking too.
- ☠️ **Death report**: when you fall from damage, it lists each source's share of the killing turn; if you are **overrun with no way out**, the result screen now says so directly instead of pretending a stray 1-damage peck was the true cause.
- 🎬 **Record / replay**: every run is recorded (seed + input sequence — deterministic replay, ~2–4 KB per run). After death you can **replay / copy / export / 🔗 share-link** the recording; the start screen offers **replay last run** or **paste-import** someone else's. During replay, **tap anywhere on the board to pause/resume**; once paused, use **◀ ▶ to step one turn** (stops just **before** that turn's link resolves and draws the link so you can read it; greyed at the first/last turn), plus 1×/2×/4× speed, **jump-to-turn 50/100/200/350 and "−10" (10 turns from the end, to watch the finish)**, and ⏹ exit; replay jumps / exits now clear transient tether effects, so Summoner lines no longer pile onto the current view. The board is non-interactive during replay (strict playback); if the run carries a server-seed token, it remains valid for **72 real-time hours**, and after expiry the replay still works normally but can no longer be resubmitted to the leaderboard. Replay detail popups now also support **🏆 Resubmit**: as long as the token is still valid, you can resubmit that recording directly from its detail view; if the leaderboard service is temporarily unreachable at the original result screen, the game explicitly tells you the recording was preserved for later resubmission.
- 🏆 **Cloud leaderboard + percentile (Release build `dungeonraid.win` only)**: after death, see your rank and percentile on the **overall** and **per-race** boards. Ranked by **turns survived**; the board merges the latest **3 `vMAJOR.MINOR` buckets** (so frequent patches don't fragment it), **shows verified scores only**, and still verifies each run against the exact archived engine snapshot for its own `rec.ver`. That means any change that affects the verify / replay compatibility boundary should bump the **minor** version instead of staying in the same patch line. Release builds now keep at most one recently acquired server seed as a local warm seed: page boot only reads / prunes that cache and never auto-requests more, and the next time you enter race select a still-valid same-version warm seed is preferred for immediate consumption before any new API prefetch happens. That hides even more of the start delay without turning page load into a “stockpile multiple tickets” behavior that amplifies KV writes and wastes issued seeds. If the warm seed expires, the version changes, or the prefetch/live fetch misses or fails, the existing live-fetch + local-random fallback path still applies. At run start, the server now ships a threshold snapshot resolved by a fixed ladder — **same race + current minor → same race + recent 3 minors → all races + current minor → all races + recent 3 minors** — so upload gates are classified by race and version bucket without letting tiny samples blow up. The gate still uses the recent-human `p30`, still excludes **near-finale runs (`turns >= 510`)** from the sample, and still caps the final upload gate at **350 turns**, so a bugged/overpowered version cannot permanently lock future runs out of upload; however, runs that reach the current **same-race + same-agent + same-scope top 10** are now also allowed to upload, for both survival and clear submissions. Top-tier runs only trigger instant verification when the render verifier is already on the exact same release version; otherwise polling / GitHub cron safely catch up. The Dev build does not participate in ranking. Set a **leaderboard name** on the start screen (≤12 CJK, 🎲 to randomize, remembered locally); each row shows "race avatar + name + turns/level"; **tap any row (ⓘ)** for a popup with that run's turns/level, class line & perks, clear status, plus ▶Replay / 🔗Share.
- 🏅 **Human / AI boards**: scores are split by `agent` (human / ai) and never mixed. The in-game "🏆 Leaderboard" panel toggles between **Human / AI** and **Survival / Clears**, and **filters by race** (All / Human / Elf / Dwarf / Orc / Undead), showing the Top 10. Real play reports to the human board; AI/bots self-report `ai` (backend `/top?agent=&race=`, `/clearboard?agent=&race=`, private reclassify endpoint `/classify`). A scheduled GitHub Actions scan now scores the top 200 human-board replays for AI suspicion, and **any recording scoring `25` or above is automatically reclassified to the AI board** through the narrower Worker endpoint (`/classify-auto`) protected by a dedicated automation secret. The `Low / Medium / High / Very High` labels still remain suspicion labels only. The scorer also treats full-run millisecond action intervals / long-run sub-human reaction times as hard evidence, so obviously non-human recordings are not canceled out by softer high-variance timing heuristics. Manual rollback still uses `/classify`. Write endpoints are IP-rate-limited.

## 🛠️ Development / Balance Testing

`test/tools/playtest.js` is a **headless bot** that loads the real game logic from `dungeon-raid.html` (with DOM/Canvas stubbed out), plays automatically with a greedy strategy, and reports survival turns and levels reached per race/class line — handy for balance regression testing.

```bash
node test/tools/playtest.js                  # scan mode: all races × several enemy-stat sets, find the closest to the target turn

# Targeted mode: pin a class line or a single boss, run detailed stats for comparison
node test/tools/playtest.js --race=orc --t1=axelord --t2=unbroken   # test the Axe Lord line
node test/tools/playtest.js --race=human --t1=knight --t2=immortal   # pin tier-1 / tier-2
node test/tools/playtest.js --boss=zombie                       # only spawn the Zombie (isolate one boss)
node test/tools/playtest.js --race=elf --boss=assassin --games=40    # combine + custom game count
node test/tools/playtest.js --race=dwarf --enemy=C2             # pick an enemy-stat candidate (defaults to live file values)
```

Flags: `--race=` (human/elf/dwarf/orc), `--t1=`/`--t2=` (class-line id), `--boss=` (the only boss that spawns), `--enemy=` (enemy-stat candidate, defaults to live file values), `--games=` (games per config), `--report` (full per-race table). The Treant line is now written as `--t1=treant`; for compatibility, older scripts using `--t1=elder` are still normalized back to Treant automatically. Targeted mode also prints: mean/max turns, tier-1/tier-2 reach rate, and the killing turn's main cause-of-death share.

```bash
node test/tools/playtest.js --replay=run.json   # Replay a recording exported from the game (deterministic re-run); prints the outcome / cause of death — handy for analyzing real human play
node test/tools/submit-ai-until-posted.js       # Rotate through strong default builds (Elf Seer / Dwarf Guild Master / Human Knight, etc.) until at least one AI score is submitted, then poll until it appears on the current-version AI board
```

See [`TEST_REPORT.md`](./TEST_REPORT.md) for baseline data (versioned, for regression comparison); for the AI-board auto-classifier, run `npm run score-regression` to ensure known AI samples still trigger and known human samples still stay below the auto-reclassify boundary (also included in `bash deploy/dr.sh test`); see [`CHANGELOG.md`](./CHANGELOG.md) for the change history.

---

## 📄 License

**Dual-licensed.** Copyright © 2026 lcgogo.

This project is **dual-licensed** (see [`LICENSE`](./LICENSE)):

- **Open source — AGPL-3.0**: free to use, modify, and self-host; but if you distribute it or make it available to users over a network (including as a web app), you **must release the complete corresponding source of your version** to those users under AGPL-3.0.
- **Commercial**: to use it in a **closed-source and/or commercial** product without the AGPL obligations, obtain a **commercial license** — contact **lcgogo123@163.com** (or open an issue at <https://github.com/lcgogo/dungeon-raid>).

> ℹ️ Versions previously released under MIT remain available under MIT; this dual license applies to releases from 2026-06-16 onward.

> ⚠️ This is an unofficial web tribute to *Dungeon Raid* by Fireflame Games (2011), unaffiliated with the original. This license covers **only the original code and content in this repository** and grants no rights to the original work.
