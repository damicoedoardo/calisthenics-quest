# Balance sheet

Written by `pnpm balance` from `src/balance/` and the real rules. Do not edit by hand. The rule and the changelog: `docs/handbook/game/balance.md`.

## Goals

Each goal is written next to its numbers in `src/balance/`. The sheet measures it.

| Goal | Measured |  |
| --- | --- | --- |
| The main story is done in 5 to 6 months at 3 workouts a week | 78 workouts, 6.0 months (the last zone opens at 64, month 4.9) | on target |
| How often a steady player levels up (6 months) | 2.9 workouts a level | no goal set yet |
| One item +0 to +5 in about 5 weeks of training | 5.0 weeks | on target |
| One item +0 to +15 in about a year of training (embers; materials from co-op) | 62 weeks | on target |
| 70 points a stat gives about +80% damage, +65% attack speed, +105 HP, 20% blocked, +25% walk speed, 20% crit | +79%, +64%, +103 HP, 21% blocked, +25% walk, 20% crit | on target |
| A comeback after 14 days away earns a bonus | +50 XP | on target |
| 40% of power growth from training (± 7%) | 39% (38%-41%) | on target |
| 40% of power growth from gear (± 7%) | 41% (38%-51%) | on target |
| 20% of power growth from upgrades (± 7%) | 20% (12%-24%) | on target |

## Power by workouts

One number for how strong a hero is (`powerScore` in `src/game/power.ts`): damage a second times what you can take, square-rooted, with a warrior with no points in the starter kit at 100. It leaves out run skills, chest items, the flame, abilities and hits on many foes.

Model player: 3 full workouts a week, every week at the goal, points spread evenly, embers all spent on upgrades (solo: +1 to +5, the steps with no co-op materials), wearing middle-roll rares from the deepest floor it can wear in the newest open zone. A warrior, with the share of the gain since 0 workouts that comes from each source:

| Workouts | Power | From training | From gear | From upgrades | Gear from |
| --- | --- | --- | --- | --- | --- |
| 0 | 100 | - | - | - | - |
| 6 | 126 | 33% | 61% | 6% | zone 1, floor 10 |
| 12 | 145 | 38% | 51% | 12% | zone 2, floor 6 |
| 18 | 162 | 41% | 46% | 12% | zone 2, floor 10 |
| 24 | 183 | 39% | 44% | 17% | zone 3, floor 6 |
| 30 | 200 | 41% | 42% | 17% | zone 3, floor 9 |
| 37 | 230 | 38% | 40% | 22% | zone 4, floor 6 |
| 43 | 249 | 40% | 38% | 22% | zone 4, floor 8 |
| 50 | 282 | 38% | 38% | 24% | zone 5, floor 6 |
| 56 | 300 | 39% | 38% | 24% | zone 5, floor 8 |
| 64 | 338 | 38% | 38% | 24% | zone 6, floor 6 |
| 70 | 351 | 38% | 38% | 24% | zone 6, floor 7 |
| 100 | 433 | 43% | 34% | 23% | zone 6, floor 10 |

Each class with the same model (and how far above or below the four's average). The simulator's win rates are the real check; this shows the gap before abilities:

| Workouts | Warrior | Archer | Monk | Mage |
| --- | --- | --- | --- | --- |
| 0 | 117 (+15%) | 114 (+11%) | 94 (-8%) | 85 (-17%) |
| 24 | 183 (+15%) | 177 (+11%) | 146 (-8%) | 131 (-18%) |
| 64 | 338 (+16%) | 321 (+10%) | 269 (-8%) | 236 (-19%) |

## Training over time

Played by the season simulator (`src/sim/players.ts`): `steady` trains 3 times a week and spreads points, `twice-a-week` trains twice, `eager` trains every weekday and puts every point in Damage.

| Player | Day | Workouts | Level | Stat points | Damage / HP from points | Embers earned | Vault slots |
| --- | --- | --- | --- | --- | --- | --- | --- |
| steady | 7 | 3 | 1 | 18 | +15% / +5 HP | 30 | 4 |
| steady | 30 | 13 | 4 | 64 | +24% / +19 HP | 130 | 6 |
| steady | 91 | 39 | 14 | 185 | +45% / +51 HP | 390 | 11 |
| steady | 182 | 78 | 28 | 366 | +72% / +92 HP | 780 | 19 |
| twice-a-week | 7 | 2 | 1 | 12 | +14% / +4 HP | 20 | 4 |
| twice-a-week | 30 | 9 | 2 | 40 | +22% / +12 HP | 90 | 5 |
| twice-a-week | 91 | 26 | 6 | 108 | +34% / +31 HP | 260 | 9 |
| twice-a-week | 182 | 52 | 11 | 211 | +51% / +58 HP | 520 | 14 |
| eager | 7 | 5 | 2 | 26 | +44% / +0 HP | 50 | 5 |
| eager | 30 | 22 | 7 | 99 | +104% / +0 HP | 220 | 8 |
| eager | 91 | 65 | 21 | 289 | +202% / +0 HP | 650 | 17 |
| eager | 182 | 130 | 43 | 573 | +289% / +0 HP | 1300 | 20 |

## What stat points give

Every hero starts with 6 points. A stat with this many points (no class lean):

| Stat | 0 pts | 10 pts | 25 pts | 50 pts | 100 pts | 150 pts |
| --- | --- | --- | --- | --- | --- | --- |
| Health | +0 | +17 | +42 | +78 | +138 | +187 |
| Armor | 0% | 3% | 8% | 16% | 28% | 37% |
| Damage | +12% | +23% | +39% | +62% | +102% | +134% |
| Haste | +8% | +17% | +30% | +50% | +82% | +109% |
| Speed | +0% | +4% | +10% | +19% | +34% | +46% |
| Crit | 5% | 8% | 11% | 16% | 25% | 32% |

## Forge and embers

A full workout earns 10 embers, a short one 4; a reroll costs 15. From +6 a step also asks for co-op materials; from +7 it can miss (each miss +5% on the next try, +10% after training in the last 2 days, a miss slips one plus 50% of the time but never under +6, +10, +13). Embers below count the tries on average, at 3 full workouts a week, no melting.

| Upgrade | Embers a try | Materials a try | Holds | Tries | Embers so far | Weeks of training | Item strength |
| --- | --- | --- | --- | --- | --- | --- | --- |
| +0 → +1 | 10 | - | 100% | 1.00 | 10 | 0.3 | x1.10 |
| +1 → +2 | 20 | - | 100% | 1.00 | 30 | 1.0 | x1.20 |
| +2 → +3 | 30 | - | 100% | 1.00 | 60 | 2.0 | x1.30 |
| +3 → +4 | 40 | - | 100% | 1.00 | 100 | 3.3 | x1.40 |
| +4 → +5 | 50 | - | 100% | 1.00 | 150 | 5.0 | x1.50 |
| +5 → +6 | 55 | 2 ember thread | 100% | 1.00 | 205 | 6.8 | x1.58 |
| +6 → +7 | 60 | 3 ember thread | 90% | 1.10 | 271 | 9.0 | x1.66 |
| +7 → +8 | 65 | 5 ember thread | 80% | 1.23 | 351 | 11.7 | x1.74 |
| +8 → +9 | 70 | 8 ember thread | 70% | 1.39 | 449 | 15.0 | x1.82 |
| +9 → +10 | 80 | 10 ember thread, 1 bond shard | 60% | 1.59 | 577 | 19.2 | x1.92 |
| +10 → +11 | 90 | 12 ember thread, 2 bond shard | 50% | 1.86 | 744 | 24.8 | x1.99 |
| +11 → +12 | 100 | 15 ember thread, 3 bond shard | 45% | 2.02 | 946 | 31.5 | x2.06 |
| +12 → +13 | 110 | 15 ember thread, 4 bond shard, 1 warden coal | 40% | 2.21 | 1190 | 39.7 | x2.16 |
| +13 → +14 | 125 | 20 ember thread, 5 bond shard, 2 warden coal | 35% | 2.44 | 1494 | 49.8 | x2.24 |
| +14 → +15 | 140 | 25 ember thread, 6 bond shard, 3 warden coal, 1 heartstone | 30% | 2.71 | 1873 | 62.4 | x2.39 |

| Melt down | At +0 | At +15 |
| --- | --- | --- |
| common | 3 | 26 |
| magic | 6 | 51 |
| rare | 12 | 102 |
| legendary | 30 | 255 |

Co-op materials: the chance each source drops one, for each hero in a party (solo runs drop none):

| Source | Ember thread | Bond shard | Warden coal | Heartstone |
| --- | --- | --- | --- | --- |
| plain | 0.0% | - | - | - |
| elite | 0.6% | 0.1% | - | - |
| chest | 5.0% | 0.8% | - | - |
| warden | 50.0% | 10.0% | 8.0% | - |
| boss | 50.0% | 10.0% | 8.0% | - |
| clear | - | - | - | 3.3% |

Found by one hero in a co-op run of zone 1 (two bots, 3 runs, on average): 2.3 ember thread, 0.7 bond shard.

## Weapons

The starter weapon gives +5% damage. A weapon with middle rolls, by zone, floor and rarity, the points in the class's stat it asks for, and the workouts until an even build has them:

| Zone | Floor | Rarity | Damage | Bonuses | Needs points | Even build after |
| --- | --- | --- | --- | --- | --- | --- |
| 1 (0 workouts in) | 1 | Magic | +5% | 1 | 1 | 0 |
| 1 (0 workouts in) | 1 | Rare | +6% | 3 | 1 | 0 |
| 1 (0 workouts in) | 1 | Legendary | +7% | 4 | 1 | 0 |
| 1 (0 workouts in) | 10 | Magic | +8% | 1 | 1 | 0 |
| 1 (0 workouts in) | 10 | Rare | +9% | 3 | 1 | 0 |
| 1 (0 workouts in) | 10 | Legendary | +11% | 4 | 1 | 0 |
| 2 (12 workouts in) | 1 | Magic | +8% | 1 | 4 | 5 |
| 2 (12 workouts in) | 1 | Rare | +9% | 3 | 5 | 7 |
| 2 (12 workouts in) | 1 | Legendary | +12% | 4 | 6 | 9 |
| 2 (12 workouts in) | 10 | Magic | +11% | 1 | 9 | 14 |
| 2 (12 workouts in) | 10 | Rare | +12% | 3 | 11 | 17 |
| 2 (12 workouts in) | 10 | Legendary | +16% | 4 | 12 | 18 |
| 3 (24 workouts in) | 1 | Magic | +11% | 1 | 8 | 12 |
| 3 (24 workouts in) | 1 | Rare | +13% | 3 | 9 | 14 |
| 3 (24 workouts in) | 1 | Legendary | +16% | 4 | 11 | 17 |
| 3 (24 workouts in) | 10 | Magic | +14% | 1 | 17 | 27 |
| 3 (24 workouts in) | 10 | Rare | +16% | 3 | 20 | 32 |
| 3 (24 workouts in) | 10 | Legendary | +20% | 4 | 23 | 36 |
| 4 (37 workouts in) | 1 | Magic | +14% | 1 | 12 | 18 |
| 4 (37 workouts in) | 1 | Rare | +16% | 3 | 14 | 22 |
| 4 (37 workouts in) | 1 | Legendary | +21% | 4 | 16 | 25 |
| 4 (37 workouts in) | 10 | Magic | +17% | 1 | 26 | 41 |
| 4 (37 workouts in) | 10 | Rare | +19% | 3 | 30 | 48 |
| 4 (37 workouts in) | 10 | Legendary | +25% | 4 | 35 | 56 |
| 5 (50 workouts in) | 1 | Magic | +17% | 1 | 16 | 25 |
| 5 (50 workouts in) | 1 | Rare | +20% | 3 | 18 | 28 |
| 5 (50 workouts in) | 1 | Legendary | +25% | 4 | 21 | 33 |
| 5 (50 workouts in) | 10 | Magic | +20% | 1 | 35 | 56 |
| 5 (50 workouts in) | 10 | Rare | +23% | 3 | 40 | 64 |
| 5 (50 workouts in) | 10 | Legendary | +29% | 4 | 47 | 76 |
| 6 (64 workouts in) | 1 | Magic | +20% | 1 | 20 | 32 |
| 6 (64 workouts in) | 1 | Rare | +23% | 3 | 23 | 36 |
| 6 (64 workouts in) | 1 | Legendary | +30% | 4 | 27 | 43 |
| 6 (64 workouts in) | 10 | Magic | +23% | 1 | 44 | 71 |
| 6 (64 workouts in) | 10 | Rare | +26% | 3 | 51 | 82 |
| 6 (64 workouts in) | 10 | Legendary | +34% | 4 | 60 | 97 |

## Drops and rarity

How often each source drops an item, and the rarity it rolls (20000 rolls each):

| Source | Floor | Drop chance | Common | Magic | Rare | Legendary |
| --- | --- | --- | --- | --- | --- | --- |
| Monster | 1 | 0.6% | 60% | 28% | 10% | 2% |
| Monster | 10 | 0.6% | 41% | 42% | 15% | 3% |
| Elite or golem | 1 | 15% / 30% | 44% | 39% | 14% | 3% |
| Elite or golem | 10 | 15% / 30% | 30% | 49% | 18% | 3% |
| Chest | 1 | 50% | 32% | 47% | 17% | 3% |
| Chest | 10 | 50% | 23% | 54% | 20% | 4% |
| Mid-boss, boss | 1 | 100% | 19% | 57% | 21% | 4% |
| Mid-boss, boss | 10 | 100% | 14% | 60% | 22% | 4% |

## Run levels

Light to reach a level inside a run:

| Level | 2 | 5 | 10 | 15 | 20 |
| --- | --- | --- | --- | --- | --- |
| Light | 9 | 67 | 295 | 742 | 1470 |
