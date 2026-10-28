# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 27% | 34% | 30% | 34% | 31% | fair |
| Six workouts later | 63% | 69% | 64% | 76% | 68% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 2% | 0% | 4% | 0% | 2% | on target |
| 1 | +6 workouts | 71% | 77% | 81% | 65% | 73% | on target |
| 2 | opens | 40% | 46% | 25% | 25% | 34% | on target |
| 2 | +6 workouts | 69% | 69% | 60% | 71% | 67% | on target |
| 3 | opens | 38% | 50% | 42% | 42% | 43% | on target |
| 3 | +6 workouts | 60% | 77% | 60% | 75% | 68% | on target |
| 4 | opens | 38% | 42% | 42% | 48% | 42% | on target |
| 4 | +6 workouts | 42% | 52% | 60% | 67% | 55% | on target |
| 5 | opens | 23% | 33% | 33% | 52% | 35% | on target |
| 5 | +18 workouts | 73% | 63% | 52% | 90% | 69% | on target |
| 6 | opens | 25% | 31% | 35% | 40% | 33% | on target |
| 6 | +18 workouts | 65% | 75% | 67% | 88% | 73% | on target |
