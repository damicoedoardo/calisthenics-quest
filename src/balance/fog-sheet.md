# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 32% | 28% | 21% | 18% | 25% | fair |
| Six workouts later | 77% | 68% | 67% | 64% | 69% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 0% | 0% | 0% | 2% | 1% | on target |
| 1 | +6 workouts | 65% | 48% | 69% | 56% | 59% | on target |
| 2 | opens | 40% | 31% | 33% | 21% | 31% | on target |
| 2 | +6 workouts | 79% | 71% | 75% | 65% | 72% | on target |
| 3 | opens | 25% | 21% | 29% | 13% | 22% | on target |
| 3 | +6 workouts | 83% | 73% | 75% | 73% | 76% | on target |
| 4 | opens | 35% | 44% | 33% | 46% | 40% | on target |
| 4 | +6 workouts | 63% | 58% | 71% | 65% | 64% | on target |
| 5 | opens | 56% | 44% | 17% | 4% | 30% | on target |
| 5 | +18 workouts | 90% | 79% | 31% | 56% | 64% | on target |
| 6 | opens | 33% | 31% | 15% | 21% | 25% | on target |
| 6 | +18 workouts | 83% | 79% | 81% | 71% | 79% | on target |
