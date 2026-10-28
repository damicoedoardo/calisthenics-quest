# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 27% | 35% | 36% | 38% | 34% | fair |
| Six workouts later | 59% | 67% | 68% | 77% | 68% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 4% | 0% | 4% | 0% | 2% | on target |
| 1 | +6 workouts | 46% | 67% | 75% | 50% | 59% | on target |
| 2 | opens | 31% | 67% | 42% | 27% | 42% | on target |
| 2 | +6 workouts | 63% | 85% | 79% | 85% | 78% | on target |
| 3 | opens | 23% | 27% | 40% | 48% | 34% | on target |
| 3 | +6 workouts | 60% | 67% | 56% | 79% | 66% | on target |
| 4 | opens | 29% | 46% | 48% | 54% | 44% | on target |
| 4 | +6 workouts | 44% | 54% | 60% | 67% | 56% | on target |
| 5 | opens | 42% | 31% | 38% | 52% | 41% | on target |
| 5 | +18 workouts | 83% | 67% | 63% | 96% | 77% | on target |
| 6 | opens | 31% | 38% | 44% | 44% | 39% | on target |
| 6 | +18 workouts | 60% | 65% | 75% | 88% | 72% | on target |
