# Balance sheet

Written by `pnpm balance` from `src/balance/` and the real rules. Do not edit by hand. The rule and the changelog: `docs/handbook/game/balance.md`.

## Goals

Each goal is written next to its numbers in `src/balance/`. The sheet measures it.

| Goal | Measured |  |
| --- | --- | --- |
| How often a steady player levels up (6 months) | 2.9 workouts a level | no goal set yet |
| One item +0 to +5 in about 5 weeks of training | 5.0 weeks | on target |
| 100 points a stat gives about +80% damage, +65% attack speed, +105 HP | +79%, +64%, +103 HP | on target |
| A comeback after 14 days away earns a bonus | +50 XP | on target |
| 40% of power growth from training (± 7%) | 39% (37%-42%) | on target |
| 40% of power growth from gear (± 7%) | 41% (37%-50%) | on target |
| 20% of power growth from upgrades (± 7%) | 20% (12%-25%) | on target |

## Power by workouts

One number for how strong a hero is (`powerScore` in `src/game/power.ts`): damage a second times what you can take, square-rooted, with a warrior with no points in the starter kit at 100. It leaves out run skills, chest items, the flame, abilities and hits on many foes.

Model player: 3 full workouts a week, every week at the goal, points spread evenly, embers all spent on upgrades, wearing middle-roll rares from the deepest floor it can wear in the newest open zone. A warrior, with the share of the gain since 0 workouts that comes from each source:

| Workouts | Power | From training | From gear | From upgrades | Gear from |
| --- | --- | --- | --- | --- | --- |
| 0 | 100 | - | - | - | - |
| 6 | 128 | 37% | 57% | 6% | zone 1, floor 10 |
| 12 | 147 | 38% | 50% | 12% | zone 2, floor 6 |
| 18 | 164 | 42% | 46% | 12% | zone 2, floor 10 |
| 24 | 187 | 40% | 43% | 17% | zone 3, floor 6 |
| 30 | 204 | 42% | 41% | 17% | zone 3, floor 9 |
| 37 | 235 | 39% | 40% | 22% | zone 4, floor 6 |
| 43 | 252 | 39% | 38% | 23% | zone 4, floor 8 |
| 50 | 288 | 37% | 38% | 24% | zone 5, floor 6 |
| 56 | 302 | 39% | 37% | 24% | zone 5, floor 7 |
| 64 | 345 | 37% | 38% | 25% | zone 6, floor 6 |
| 70 | 360 | 37% | 38% | 25% | zone 6, floor 7 |
| 100 | 435 | 42% | 35% | 23% | zone 6, floor 10 |

Each class with the same model (and how far above or below the four's average). The simulator's win rates are the real check; this shows the gap before abilities:

| Workouts | Warrior | Archer | Monk | Mage |
| --- | --- | --- | --- | --- |
| 0 | 113 (+26%) | 94 (+5%) | 80 (-10%) | 72 (-20%) |
| 24 | 187 (+27%) | 153 (+4%) | 131 (-11%) | 117 (-20%) |
| 64 | 345 (+30%) | 272 (+2%) | 238 (-10%) | 207 (-22%) |

## Training over time

Played by the season simulator (`src/sim/players.ts`): `steady` trains 3 times a week and spreads points, `twice-a-week` trains twice, `eager` trains every weekday and puts every point in Damage.

| Player | Day | Workouts | Level | Stat points | Damage / HP from points | Embers earned | Vault slots |
| --- | --- | --- | --- | --- | --- | --- | --- |
| steady | 7 | 3 | 1 | 18 | +16% / +7 HP | 30 | 4 |
| steady | 30 | 13 | 4 | 64 | +25% / +21 HP | 130 | 6 |
| steady | 91 | 39 | 14 | 185 | +47% / +55 HP | 390 | 11 |
| steady | 182 | 78 | 28 | 366 | +75% / +97 HP | 780 | 19 |
| twice-a-week | 7 | 2 | 1 | 12 | +15% / +4 HP | 20 | 4 |
| twice-a-week | 30 | 9 | 2 | 40 | +20% / +13 HP | 90 | 5 |
| twice-a-week | 91 | 26 | 6 | 108 | +34% / +34 HP | 260 | 9 |
| twice-a-week | 182 | 52 | 11 | 211 | +52% / +61 HP | 520 | 14 |
| eager | 7 | 5 | 2 | 26 | +36% / +0 HP | 50 | 5 |
| eager | 30 | 22 | 7 | 99 | +81% / +0 HP | 220 | 8 |
| eager | 91 | 65 | 21 | 289 | +155% / +0 HP | 650 | 17 |
| eager | 182 | 130 | 43 | 573 | +220% / +0 HP | 1300 | 20 |

## What stat points give

Every hero starts with 6 points. A stat with this many points (no class lean):

| Stat | 0 pts | 10 pts | 25 pts | 50 pts | 100 pts | 150 pts |
| --- | --- | --- | --- | --- | --- | --- |
| Health | +0 | +13 | +31 | +58 | +103 | +140 |
| Damage | +12% | +20% | +32% | +50% | +79% | +103% |
| Reach | +15% | +28% | +46% | +73% | +118% | +155% |
| Speed | +8% | +15% | +25% | +39% | +64% | +84% |
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
| 1 (0 workouts in) | 1 | Magic | +5% | 1 | 1 | 0 |
| 1 (0 workouts in) | 1 | Rare | +6% | 3 | 1 | 0 |
| 1 (0 workouts in) | 1 | Legendary | +7% | 4 | 1 | 0 |
| 1 (0 workouts in) | 10 | Magic | +8% | 1 | 2 | 1 |
| 1 (0 workouts in) | 10 | Rare | +9% | 3 | 2 | 1 |
| 1 (0 workouts in) | 10 | Legendary | +11% | 4 | 2 | 1 |
| 2 (12 workouts in) | 1 | Magic | +8% | 1 | 6 | 5 |
| 2 (12 workouts in) | 1 | Rare | +9% | 3 | 7 | 6 |
| 2 (12 workouts in) | 1 | Legendary | +12% | 4 | 8 | 8 |
| 2 (12 workouts in) | 10 | Magic | +11% | 1 | 14 | 14 |
| 2 (12 workouts in) | 10 | Rare | +12% | 3 | 16 | 16 |
| 2 (12 workouts in) | 10 | Legendary | +16% | 4 | 19 | 20 |
| 3 (24 workouts in) | 1 | Magic | +11% | 1 | 12 | 12 |
| 3 (24 workouts in) | 1 | Rare | +13% | 3 | 14 | 14 |
| 3 (24 workouts in) | 1 | Legendary | +16% | 4 | 16 | 16 |
| 3 (24 workouts in) | 10 | Magic | +14% | 1 | 26 | 27 |
| 3 (24 workouts in) | 10 | Rare | +16% | 3 | 30 | 32 |
| 3 (24 workouts in) | 10 | Legendary | +20% | 4 | 35 | 37 |
| 4 (37 workouts in) | 1 | Magic | +14% | 1 | 18 | 18 |
| 4 (37 workouts in) | 1 | Rare | +16% | 3 | 20 | 21 |
| 4 (37 workouts in) | 1 | Legendary | +21% | 4 | 24 | 25 |
| 4 (37 workouts in) | 10 | Magic | +17% | 1 | 39 | 41 |
| 4 (37 workouts in) | 10 | Rare | +19% | 3 | 45 | 48 |
| 4 (37 workouts in) | 10 | Legendary | +25% | 4 | 53 | 57 |
| 5 (50 workouts in) | 1 | Magic | +17% | 1 | 24 | 25 |
| 5 (50 workouts in) | 1 | Rare | +20% | 3 | 27 | 28 |
| 5 (50 workouts in) | 1 | Legendary | +25% | 4 | 32 | 34 |
| 5 (50 workouts in) | 10 | Magic | +20% | 1 | 52 | 56 |
| 5 (50 workouts in) | 10 | Rare | +23% | 3 | 60 | 64 |
| 5 (50 workouts in) | 10 | Legendary | +29% | 4 | 70 | 75 |
| 6 (64 workouts in) | 1 | Magic | +20% | 1 | 30 | 32 |
| 6 (64 workouts in) | 1 | Rare | +23% | 3 | 35 | 37 |
| 6 (64 workouts in) | 1 | Legendary | +30% | 4 | 41 | 44 |
| 6 (64 workouts in) | 10 | Magic | +23% | 1 | 66 | 71 |
| 6 (64 workouts in) | 10 | Rare | +26% | 3 | 76 | 82 |
| 6 (64 workouts in) | 10 | Legendary | +34% | 4 | 89 | 96 |

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
