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
