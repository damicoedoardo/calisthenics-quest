# Balance sheet

Written by `pnpm balance` from `src/balance/` and the real rules. Do not edit by hand. The rule and the changelog: `docs/handbook/game/balance.md`.

## Goals

Each goal is written next to its numbers in `src/balance/`. The sheet measures it.

| Goal | Measured |  |
| --- | --- | --- |
| The main story is done in 5 to 6 months at 3 workouts a week | 78 workouts, 6.0 months (the last zone opens at 64, month 4.9) | on target |
| The Ember Road (with friends) lasts 2 to 2.5 months at 3 workouts a week | the finale 27 workouts after setting out, 2.1 months (a chapter every 9) | on target |
| A zone's best item (a floor 10 legendary) is wearable before the next zone opens | 11 workouts after a zone opens; the next opens 1 to 3 workouts after that | on target |
| How often a steady player levels up (6 months) | 2.9 workouts a level | no goal set yet |
| An item's level need is met by a steady player when its points are (`LEVEL_NEED`) | 0 to 0 levels to spare | on target |
| One item +0 to +5 in about 5 weeks of training | 5.0 weeks | on target |
| One item +0 to +15 in about a year of training (embers; materials from co-op) | 62 weeks | on target |
| 84 points a stat (six months, spread over five) gives about +87% damage, +70% attack speed, +115 HP, 23% blocked, +28% walk speed | +87%, +71%, +116 HP, 23% blocked, +28% walk | on target |
| A comeback after 14 days away earns a bonus | +50 XP | on target |
| 40% of power growth from training (± 7%) | 40% (38%-41%) | on target |
| 40% of power growth from gear (± 7%) | 37% (35%-44%) | on target |
| 20% of power growth from upgrades (± 7%) | 23% (15%-27%) | on target |

## Power by workouts

One number for how strong a hero is (`powerScore` in `src/game/power.ts`): damage a second times what you can take, square-rooted, with a warrior with no points in the starter kit at 100. It leaves out run skills, chest items, the flame, abilities and hits on many foes.

Model player: 3 full workouts a week, every week at the goal, points spread evenly, embers all spent on upgrades (solo: +1 to +5, the steps with no co-op materials), wearing middle-roll rares from the deepest floor it can wear in the newest open zone. A warrior, with the share of the gain since 0 workouts that comes from each source:

| Workouts | Power | From training | From gear | From upgrades | Gear from |
| --- | --- | --- | --- | --- | --- |
| 0 | 100 | - | - | - | - |
| 6 | 129 | 33% | 55% | 12% | zone 1, floor 7 |
| 12 | 147 | 41% | 44% | 15% | zone 2, floor 1 |
| 18 | 166 | 41% | 42% | 17% | zone 2, floor 7 |
| 24 | 185 | 41% | 39% | 20% | zone 3, floor 1 |
| 30 | 209 | 41% | 38% | 21% | zone 3, floor 7 |
| 37 | 234 | 41% | 36% | 23% | zone 4, floor 1 |
| 43 | 259 | 39% | 36% | 25% | zone 4, floor 7 |
| 50 | 285 | 39% | 35% | 26% | zone 5, floor 1 |
| 56 | 314 | 39% | 35% | 26% | zone 5, floor 7 |
| 64 | 343 | 39% | 35% | 26% | zone 6, floor 1 |
| 70 | 372 | 38% | 36% | 27% | zone 6, floor 7 |
| 100 | 453 | 42% | 33% | 25% | zone 6, floor 10 |

Each class with the same model (and how far above or below the four's average). The simulator's win rates are the real check; this shows the gap before abilities:

| Workouts | Warrior | Archer | Monk | Mage |
| --- | --- | --- | --- | --- |
| 0 | 112 (+0%) | 140 (+26%) | 91 (-19%) | 103 (-7%) |
| 24 | 185 (+0%) | 235 (+27%) | 149 (-20%) | 172 (-7%) |
| 64 | 343 (+0%) | 434 (+27%) | 274 (-20%) | 316 (-7%) |

## Training over time

Played by the season simulator (`src/sim/players.ts`): `steady` trains 3 times a week and spreads points, `twice-a-week` trains twice, `eager` trains every weekday and puts every point in Damage.

| Player | Day | Workouts | Level | Stat points | Damage / HP from points | Embers earned |
| --- | --- | --- | --- | --- | --- | --- |
| steady | 7 | 3 | 1 | 18 | +16% / +7 HP | 30 |
| steady | 30 | 13 | 4 | 64 | +26% / +22 HP | 130 |
| steady | 91 | 39 | 14 | 185 | +49% / +57 HP | 390 |
| steady | 182 | 78 | 28 | 366 | +79% / +104 HP | 780 |
| twice-a-week | 7 | 2 | 1 | 12 | +14% / +5 HP | 20 |
| twice-a-week | 30 | 9 | 2 | 40 | +23% / +14 HP | 90 |
| twice-a-week | 91 | 26 | 6 | 108 | +37% / +36 HP | 260 |
| twice-a-week | 182 | 52 | 11 | 211 | +56% / +66 HP | 520 |
| eager | 7 | 5 | 2 | 26 | +43% / +0 HP | 50 |
| eager | 30 | 22 | 7 | 99 | +100% / +0 HP | 220 |
| eager | 91 | 65 | 21 | 289 | +195% / +0 HP | 650 |
| eager | 182 | 130 | 43 | 573 | +279% / +0 HP | 1300 |

## What stat points give

Every hero starts with 6 points. A stat with this many points (no class lean):

| Stat | 0 pts | 10 pts | 25 pts | 50 pts | 100 pts | 150 pts |
| --- | --- | --- | --- | --- | --- | --- |
| Health | +0 | +17 | +40 | +75 | +133 | +180 |
| Armor | 0% | 3% | 8% | 15% | 27% | 36% |
| Damage | +12% | +23% | +38% | +61% | +98% | +129% |
| Haste | +8% | +17% | +30% | +48% | +80% | +105% |
| Speed | +0% | +4% | +10% | +18% | +32% | +44% |

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

Found by one hero in a co-op run of zone 1 (two bots, 3 runs, on average): 2.7 ember thread, 1 bond shard.

## Weapons

The starter weapon gives +5% damage. A warrior's weapon with middle rolls, by zone, floor and rarity: its own crit (chance / crit damage, `WEAPON_CRIT`), the hero level and the points in the class's stat it asks for, and the workouts until an even build has those points:

| Zone | Floor | Rarity | Damage | Crit | Bonuses | Needs level | Needs points | Even build after |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 (0 workouts in) | 1 | Magic | +5% | +3.9% / +19% | 1 | 1 | 1 | 0 |
| 1 (0 workouts in) | 1 | Rare | +6% | +4.4% / +22% | 3 | 1 | 3 | 2 |
| 1 (0 workouts in) | 1 | Legendary | +7% | +5.6% / +28% | 4 | 2 | 4 | 4 |
| 1 (0 workouts in) | 10 | Magic | +7% | +3.9% / +19% | 1 | 2 | 4 | 4 |
| 1 (0 workouts in) | 10 | Rare | +8% | +4.4% / +22% | 3 | 2 | 6 | 6 |
| 1 (0 workouts in) | 10 | Legendary | +11% | +5.6% / +28% | 4 | 4 | 9 | 10 |
| 2 (12 workouts in) | 1 | Magic | +8% | +3.9% / +19% | 1 | 4 | 10 | 12 |
| 2 (12 workouts in) | 1 | Rare | +9% | +4.4% / +22% | 3 | 5 | 11 | 13 |
| 2 (12 workouts in) | 1 | Legendary | +11% | +5.6% / +28% | 4 | 5 | 13 | 16 |
| 2 (12 workouts in) | 10 | Magic | +10% | +3.9% / +19% | 1 | 5 | 13 | 16 |
| 2 (12 workouts in) | 10 | Rare | +12% | +4.4% / +22% | 3 | 7 | 15 | 19 |
| 2 (12 workouts in) | 10 | Legendary | +15% | +5.6% / +28% | 4 | 8 | 18 | 23 |
| 3 (24 workouts in) | 1 | Magic | +11% | +3.9% / +19% | 1 | 8 | 19 | 24 |
| 3 (24 workouts in) | 1 | Rare | +12% | +4.4% / +22% | 3 | 9 | 20 | 25 |
| 3 (24 workouts in) | 1 | Legendary | +16% | +5.6% / +28% | 4 | 10 | 22 | 28 |
| 3 (24 workouts in) | 10 | Magic | +13% | +3.9% / +19% | 1 | 10 | 22 | 28 |
| 3 (24 workouts in) | 10 | Rare | +15% | +4.4% / +22% | 3 | 11 | 24 | 31 |
| 3 (24 workouts in) | 10 | Legendary | +19% | +5.6% / +28% | 4 | 12 | 27 | 35 |
| 4 (37 workouts in) | 1 | Magic | +14% | +3.9% / +19% | 1 | 13 | 28 | 36 |
| 4 (37 workouts in) | 1 | Rare | +15% | +4.4% / +22% | 3 | 14 | 30 | 39 |
| 4 (37 workouts in) | 1 | Legendary | +20% | +5.6% / +28% | 4 | 15 | 31 | 40 |
| 4 (37 workouts in) | 10 | Magic | +16% | +3.9% / +19% | 1 | 15 | 31 | 40 |
| 4 (37 workouts in) | 10 | Rare | +18% | +4.4% / +22% | 3 | 16 | 33 | 43 |
| 4 (37 workouts in) | 10 | Legendary | +24% | +5.6% / +28% | 4 | 17 | 36 | 47 |
| 5 (50 workouts in) | 1 | Magic | +16% | +3.9% / +19% | 1 | 18 | 38 | 50 |
| 5 (50 workouts in) | 1 | Rare | +19% | +4.4% / +22% | 3 | 19 | 39 | 51 |
| 5 (50 workouts in) | 1 | Legendary | +24% | +5.6% / +28% | 4 | 19 | 41 | 54 |
| 5 (50 workouts in) | 10 | Magic | +19% | +3.9% / +19% | 1 | 19 | 41 | 54 |
| 5 (50 workouts in) | 10 | Rare | +22% | +4.4% / +22% | 3 | 21 | 43 | 57 |
| 5 (50 workouts in) | 10 | Legendary | +28% | +5.6% / +28% | 4 | 22 | 46 | 61 |
| 6 (64 workouts in) | 1 | Magic | +19% | +3.9% / +19% | 1 | 23 | 48 | 64 |
| 6 (64 workouts in) | 1 | Rare | +22% | +4.4% / +22% | 3 | 24 | 50 | 66 |
| 6 (64 workouts in) | 1 | Legendary | +28% | +5.6% / +28% | 4 | 24 | 51 | 68 |
| 6 (64 workouts in) | 10 | Magic | +22% | +3.9% / +19% | 1 | 24 | 51 | 68 |
| 6 (64 workouts in) | 10 | Rare | +25% | +4.4% / +22% | 3 | 26 | 53 | 70 |
| 6 (64 workouts in) | 10 | Legendary | +32% | +5.6% / +28% | 4 | 27 | 56 | 75 |

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
| Light | 7 | 53 | 241 | 623 | 1261 |
