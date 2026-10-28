# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 24% | 31% | 33% | 34% | 30% | fair |
| Six workouts later | 70% | 66% | 66% | 75% | 69% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 2% | 0% | 4% | 0% | 2% | on target |
| 1 | +6 workouts | 73% | 63% | 63% | 73% | 68% | on target |
| 2 | opens | 23% | 52% | 40% | 19% | 33% | on target |
| 2 | +6 workouts | 73% | 75% | 73% | 75% | 74% | on target |
| 3 | opens | 19% | 42% | 35% | 44% | 35% | on target |
| 3 | +6 workouts | 67% | 67% | 73% | 85% | 73% | on target |
| 4 | opens | 44% | 31% | 54% | 56% | 46% | on target |
| 4 | +6 workouts | 52% | 65% | 56% | 67% | 60% | on target |
| 5 | opens | 27% | 33% | 25% | 46% | 33% | on target |
| 5 | +18 workouts | 81% | 63% | 52% | 77% | 68% | on target |
| 6 | opens | 27% | 27% | 42% | 38% | 33% | on target |
| 6 | +18 workouts | 77% | 65% | 77% | 75% | 73% | on target |
