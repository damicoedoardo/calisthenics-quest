# Balance sheet

Written by `pnpm balance` from `src/balance/` and the real rules. Do not edit by hand. The rule and the changelog: `docs/handbook/game/balance.md`.

## Goals

Each goal is written next to its numbers in `src/balance/`. The sheet measures it.

| Goal | Measured |  |
| --- | --- | --- |
| How often a steady player levels up (6 months) | 2.9 workouts a level | no goal set yet |
| One item +0 to +5 in about 5 weeks of training | 5.0 weeks | on target |
| One item +0 to +15 in about a year of training (embers; materials from co-op) | 62 weeks | on target |
| 100 points a stat gives about +60% damage, +48% attack speed, +75 HP | +62%, +49%, +77 HP | on target |
| A comeback after 14 days away earns a bonus | +50 XP | on target |

## Training over time

Played by the season simulator (`src/sim/players.ts`): `steady` trains 3 times a week and spreads points, `twice-a-week` trains twice, `eager` trains every weekday and puts every point in Damage.

| Player | Day | Workouts | Level | Stat points | Damage / HP from points | Embers earned | Vault slots |
| --- | --- | --- | --- | --- | --- | --- | --- |
| steady | 7 | 3 | 1 | 18 | +15% / +5 HP | 30 | 4 |
| steady | 30 | 13 | 4 | 64 | +22% / +15 HP | 130 | 6 |
| steady | 91 | 39 | 14 | 185 | +38% / +41 HP | 390 | 11 |
| steady | 182 | 78 | 28 | 366 | +59% / +72 HP | 780 | 19 |
| twice-a-week | 7 | 2 | 1 | 12 | +14% / +3 HP | 20 | 4 |
| twice-a-week | 30 | 9 | 2 | 40 | +18% / +10 HP | 90 | 5 |
| twice-a-week | 91 | 26 | 6 | 108 | +28% / +25 HP | 260 | 9 |
| twice-a-week | 182 | 52 | 11 | 211 | +42% / +45 HP | 520 | 14 |
| eager | 7 | 5 | 2 | 26 | +30% / +0 HP | 50 | 5 |
| eager | 30 | 22 | 7 | 99 | +63% / +0 HP | 220 | 8 |
| eager | 91 | 65 | 21 | 289 | +118% / +0 HP | 650 | 17 |
| eager | 182 | 130 | 43 | 573 | +166% / +0 HP | 1300 | 20 |

## What stat points give

Every hero starts with 6 points. A stat with this many points (no class lean):

| Stat | 0 pts | 10 pts | 25 pts | 50 pts | 100 pts | 150 pts |
| --- | --- | --- | --- | --- | --- | --- |
| Health | +0 | +10 | +23 | +43 | +77 | +104 |
| Damage | +12% | +18% | +27% | +40% | +62% | +80% |
| Reach | +15% | +25% | +38% | +58% | +92% | +119% |
| Speed | +8% | +13% | +20% | +31% | +49% | +64% |
| Armor (from Health) | 0% | 3% | 6% | 12% | 21% | 28% |

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

Found by one hero in a co-op run of zone 1 (two bots, 3 runs, on average): 2.7 ember thread, 0.7 bond shard.

## Weapons

The starter weapon gives +5% damage. A weapon with middle rolls, by zone, floor and rarity, the points in the class's stat it asks for, and the workouts until an even build has them:

| Zone | Floor | Rarity | Damage | Bonuses | Needs points | Even build after |
| --- | --- | --- | --- | --- | --- | --- |
| 1 (0 workouts in) | 1 | Magic | +6% | 1 | 1 | 0 |
| 1 (0 workouts in) | 1 | Rare | +7% | 3 | 1 | 0 |
| 1 (0 workouts in) | 1 | Legendary | +9% | 4 | 1 | 0 |
| 1 (0 workouts in) | 10 | Magic | +10% | 1 | 2 | 1 |
| 1 (0 workouts in) | 10 | Rare | +11% | 3 | 2 | 1 |
| 1 (0 workouts in) | 10 | Legendary | +14% | 4 | 2 | 1 |
| 2 (12 workouts in) | 1 | Magic | +10% | 1 | 6 | 5 |
| 2 (12 workouts in) | 1 | Rare | +12% | 3 | 7 | 6 |
| 2 (12 workouts in) | 1 | Legendary | +15% | 4 | 8 | 8 |
| 2 (12 workouts in) | 10 | Magic | +14% | 1 | 14 | 14 |
| 2 (12 workouts in) | 10 | Rare | +15% | 3 | 16 | 16 |
| 2 (12 workouts in) | 10 | Legendary | +20% | 4 | 19 | 20 |
| 3 (24 workouts in) | 1 | Magic | +14% | 1 | 12 | 12 |
| 3 (24 workouts in) | 1 | Rare | +16% | 3 | 14 | 14 |
| 3 (24 workouts in) | 1 | Legendary | +20% | 4 | 16 | 16 |
| 3 (24 workouts in) | 10 | Magic | +17% | 1 | 26 | 27 |
| 3 (24 workouts in) | 10 | Rare | +20% | 3 | 30 | 32 |
| 3 (24 workouts in) | 10 | Legendary | +25% | 4 | 35 | 37 |
| 4 (37 workouts in) | 1 | Magic | +18% | 1 | 18 | 18 |
| 4 (37 workouts in) | 1 | Rare | +20% | 3 | 20 | 21 |
| 4 (37 workouts in) | 1 | Legendary | +26% | 4 | 24 | 25 |
| 4 (37 workouts in) | 10 | Magic | +21% | 1 | 39 | 41 |
| 4 (37 workouts in) | 10 | Rare | +24% | 3 | 45 | 48 |
| 4 (37 workouts in) | 10 | Legendary | +31% | 4 | 53 | 57 |
| 5 (50 workouts in) | 1 | Magic | +22% | 1 | 24 | 25 |
| 5 (50 workouts in) | 1 | Rare | +25% | 3 | 27 | 28 |
| 5 (50 workouts in) | 1 | Legendary | +31% | 4 | 32 | 34 |
| 5 (50 workouts in) | 10 | Magic | +25% | 1 | 52 | 56 |
| 5 (50 workouts in) | 10 | Rare | +28% | 3 | 60 | 64 |
| 5 (50 workouts in) | 10 | Legendary | +36% | 4 | 70 | 75 |
| 6 (64 workouts in) | 1 | Magic | +25% | 1 | 30 | 32 |
| 6 (64 workouts in) | 1 | Rare | +29% | 3 | 35 | 37 |
| 6 (64 workouts in) | 1 | Legendary | +37% | 4 | 41 | 44 |
| 6 (64 workouts in) | 10 | Magic | +29% | 1 | 66 | 71 |
| 6 (64 workouts in) | 10 | Rare | +33% | 3 | 76 | 82 |
| 6 (64 workouts in) | 10 | Legendary | +42% | 4 | 89 | 96 |

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
