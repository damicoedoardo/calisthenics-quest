# Balance sheet

Written by `pnpm balance` from `src/balance/` and the real rules. Do not edit by hand. The rule and the changelog: `docs/handbook/game/balance.md`.

## Goals

Each goal is written next to its numbers in `src/balance/`. The sheet measures it.

| Goal | Measured |  |
| --- | --- | --- |
| How often a steady player levels up (6 months) | 2.9 workouts a level | no goal set yet |
| One item +0 to +5 in about 5 weeks of training | 5.0 weeks | on target |
| 70 points a stat gives about +60% damage, +48% attack speed, +75 HP, 20% blocked, +25% walk speed, 20% crit | +62%, +49%, +76 HP, 21% blocked, +25% walk, 20% crit | on target |
| A comeback after 14 days away earns a bonus | +50 XP | on target |

## Training over time

Played by the season simulator (`src/sim/players.ts`): `steady` trains 3 times a week and spreads points, `twice-a-week` trains twice, `eager` trains every weekday and puts every point in Damage.

| Player | Day | Workouts | Level | Stat points | Damage / HP from points | Embers earned | Vault slots |
| --- | --- | --- | --- | --- | --- | --- | --- |
| steady | 7 | 3 | 1 | 18 | +15% / +4 HP | 30 | 4 |
| steady | 30 | 13 | 4 | 64 | +21% / +14 HP | 130 | 6 |
| steady | 91 | 39 | 14 | 185 | +37% / +37 HP | 390 | 11 |
| steady | 182 | 78 | 28 | 366 | +57% / +68 HP | 780 | 19 |
| twice-a-week | 7 | 2 | 1 | 12 | +14% / +3 HP | 20 | 4 |
| twice-a-week | 30 | 9 | 2 | 40 | +18% / +9 HP | 90 | 5 |
| twice-a-week | 91 | 26 | 6 | 108 | +27% / +23 HP | 260 | 9 |
| twice-a-week | 182 | 52 | 11 | 211 | +39% / +43 HP | 520 | 14 |
| eager | 7 | 5 | 2 | 26 | +36% / +0 HP | 50 | 5 |
| eager | 30 | 22 | 7 | 99 | +80% / +0 HP | 220 | 8 |
| eager | 91 | 65 | 21 | 289 | +153% / +0 HP | 650 | 17 |
| eager | 182 | 130 | 43 | 573 | +218% / +0 HP | 1300 | 20 |

## What stat points give

Every hero starts with 6 points. A stat with this many points (no class lean):

| Stat | 0 pts | 10 pts | 25 pts | 50 pts | 100 pts | 150 pts |
| --- | --- | --- | --- | --- | --- | --- |
| Health | +0 | +13 | +31 | +57 | +102 | +138 |
| Armor | 0% | 3% | 8% | 16% | 28% | 37% |
| Damage | +12% | +20% | +32% | +50% | +79% | +102% |
| Haste | +8% | +15% | +25% | +39% | +63% | +83% |
| Speed | +0% | +4% | +10% | +19% | +34% | +46% |
| Crit | 5% | 8% | 11% | 16% | 25% | 32% |

## Forge and embers

A full workout earns 10 embers, a short one 4; a reroll costs 15. Weeks below are at 3 full workouts a week, no melting.

| Upgrade | Cost | Total so far | Weeks of training |
| --- | --- | --- | --- |
| +0 → +1 | 10 | 10 | 0.3 |
| +1 → +2 | 20 | 30 | 1.0 |
| +2 → +3 | 30 | 60 | 2.0 |
| +3 → +4 | 40 | 100 | 3.3 |
| +4 → +5 | 50 | 150 | 5.0 |

| Melt down | At +0 | At +5 |
| --- | --- | --- |
| common | 3 | 11 |
| magic | 6 | 21 |
| rare | 12 | 42 |
| legendary | 30 | 105 |

## Weapons

The starter weapon gives +5% damage. A weapon with middle rolls, by zone, floor and rarity, the points in the class's stat it asks for, and the workouts until an even build has them:

| Zone | Floor | Rarity | Damage | Bonuses | Needs points | Even build after |
| --- | --- | --- | --- | --- | --- | --- |
| 1 (0 workouts in) | 1 | Magic | +6% | 1 | 1 | 0 |
| 1 (0 workouts in) | 1 | Rare | +7% | 3 | 1 | 0 |
| 1 (0 workouts in) | 1 | Legendary | +9% | 4 | 1 | 0 |
| 1 (0 workouts in) | 10 | Magic | +10% | 1 | 1 | 0 |
| 1 (0 workouts in) | 10 | Rare | +11% | 3 | 1 | 0 |
| 1 (0 workouts in) | 10 | Legendary | +14% | 4 | 1 | 0 |
| 2 (12 workouts in) | 1 | Magic | +10% | 1 | 4 | 5 |
| 2 (12 workouts in) | 1 | Rare | +12% | 3 | 5 | 7 |
| 2 (12 workouts in) | 1 | Legendary | +15% | 4 | 6 | 9 |
| 2 (12 workouts in) | 10 | Magic | +14% | 1 | 9 | 14 |
| 2 (12 workouts in) | 10 | Rare | +15% | 3 | 11 | 17 |
| 2 (12 workouts in) | 10 | Legendary | +20% | 4 | 12 | 18 |
| 3 (24 workouts in) | 1 | Magic | +14% | 1 | 8 | 12 |
| 3 (24 workouts in) | 1 | Rare | +16% | 3 | 9 | 14 |
| 3 (24 workouts in) | 1 | Legendary | +20% | 4 | 11 | 17 |
| 3 (24 workouts in) | 10 | Magic | +17% | 1 | 17 | 27 |
| 3 (24 workouts in) | 10 | Rare | +20% | 3 | 20 | 32 |
| 3 (24 workouts in) | 10 | Legendary | +25% | 4 | 23 | 36 |
| 4 (37 workouts in) | 1 | Magic | +18% | 1 | 12 | 18 |
| 4 (37 workouts in) | 1 | Rare | +20% | 3 | 14 | 22 |
| 4 (37 workouts in) | 1 | Legendary | +26% | 4 | 16 | 25 |
| 4 (37 workouts in) | 10 | Magic | +21% | 1 | 26 | 41 |
| 4 (37 workouts in) | 10 | Rare | +24% | 3 | 30 | 48 |
| 4 (37 workouts in) | 10 | Legendary | +31% | 4 | 35 | 56 |
| 5 (50 workouts in) | 1 | Magic | +22% | 1 | 16 | 25 |
| 5 (50 workouts in) | 1 | Rare | +25% | 3 | 18 | 28 |
| 5 (50 workouts in) | 1 | Legendary | +31% | 4 | 21 | 33 |
| 5 (50 workouts in) | 10 | Magic | +25% | 1 | 35 | 56 |
| 5 (50 workouts in) | 10 | Rare | +28% | 3 | 40 | 64 |
| 5 (50 workouts in) | 10 | Legendary | +36% | 4 | 47 | 76 |
| 6 (64 workouts in) | 1 | Magic | +25% | 1 | 20 | 32 |
| 6 (64 workouts in) | 1 | Rare | +29% | 3 | 23 | 36 |
| 6 (64 workouts in) | 1 | Legendary | +37% | 4 | 27 | 43 |
| 6 (64 workouts in) | 10 | Magic | +29% | 1 | 44 | 71 |
| 6 (64 workouts in) | 10 | Rare | +33% | 3 | 51 | 82 |
| 6 (64 workouts in) | 10 | Legendary | +42% | 4 | 60 | 97 |

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
