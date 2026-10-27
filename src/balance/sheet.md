# Balance sheet

Written by `pnpm balance` from `src/balance/` and the real rules. Do not edit by hand. The rule and the changelog: `docs/handbook/game/balance.md`.

## Goals

Each goal is written next to its numbers in `src/balance/`. The sheet measures it.

| Goal | Measured |  |
| --- | --- | --- |
| How often a steady player levels up (6 months) | 2.9 workouts a level | no goal set yet |
| One item +0 to +5 in about 5 weeks of training | 5.0 weeks | on target |
| 100 points a stat gives about +60% damage, +48% attack speed, +75 HP | +62%, +49%, +77 HP | on target |
| A comeback after 14 days away earns a bonus | +50 XP | on target |

## Power by workouts

One number for how strong a hero is (`powerScore` in `src/game/power.ts`): damage a second times what you can take, square-rooted, with a warrior with no points in the starter kit at 100. It leaves out run skills, chest items, the flame, abilities and hits on many foes.

Model player: 3 full workouts a week, every week at the goal, points spread evenly, embers all spent on upgrades, wearing middle-roll rares from the deepest floor it can wear in the newest open zone. A warrior, with the share of the gain since 0 workouts that comes from each source:

| Workouts | Power | From training | From gear | From upgrades | Gear from |
| --- | --- | --- | --- | --- | --- |
| 0 | 117 | 7% | 93% | 0% | zone 1, floor 6 |
| 6 | 132 | 25% | 68% | 7% | zone 1, floor 10 |
| 12 | 152 | 27% | 60% | 13% | zone 2, floor 6 |
| 18 | 169 | 30% | 55% | 15% | zone 2, floor 10 |
| 24 | 194 | 28% | 51% | 21% | zone 3, floor 6 |
| 30 | 211 | 30% | 49% | 21% | zone 3, floor 9 |
| 37 | 246 | 27% | 47% | 26% | zone 4, floor 6 |
| 43 | 263 | 28% | 45% | 27% | zone 4, floor 8 |
| 50 | 304 | 26% | 44% | 29% | zone 5, floor 6 |
| 56 | 317 | 27% | 44% | 29% | zone 5, floor 7 |
| 64 | 366 | 26% | 44% | 31% | zone 6, floor 6 |
| 70 | 378 | 26% | 44% | 30% | zone 6, floor 7 |
| 100 | 420 | 33% | 46% | 22% | zone 6, floor 10 |

Each class with the same model (and how far above or below the four's average). The simulator's win rates are the real check; this shows the gap before abilities:

| Workouts | Warrior | Archer | Monk | Mage |
| --- | --- | --- | --- | --- |
| 0 | 117 (+26%) | 97 (+5%) | 83 (-11%) | 74 (-20%) |
| 24 | 194 (+27%) | 158 (+4%) | 136 (-11%) | 121 (-21%) |
| 64 | 366 (+31%) | 284 (+2%) | 251 (-10%) | 216 (-23%) |

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
