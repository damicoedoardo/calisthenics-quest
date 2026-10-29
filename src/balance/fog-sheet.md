# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 27% | 25% | 20% | 21% | 23% | fair |
| Six workouts later | 73% | 67% | 60% | 68% | 67% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 0% | 0% | 0% | 0% | 0% | on target |
| 1 | +6 workouts | 83% | 67% | 81% | 69% | 75% | on target |
| 2 | opens | 42% | 38% | 27% | 10% | 29% | on target |
| 2 | +6 workouts | 69% | 63% | 63% | 56% | 63% | on target |
| 3 | opens | 31% | 40% | 33% | 25% | 32% | on target |
| 3 | +6 workouts | 69% | 69% | 65% | 71% | 68% | on target |
| 4 | opens | 33% | 40% | 27% | 35% | 34% | on target |
| 4 | +6 workouts | 56% | 54% | 40% | 50% | 50% | **off** |
| 5 | opens | 33% | 19% | 10% | 33% | 24% | on target |
| 5 | +18 workouts | 83% | 77% | 35% | 90% | 71% | on target |
| 6 | opens | 21% | 17% | 23% | 23% | 21% | on target |
| 6 | +18 workouts | 75% | 73% | 79% | 75% | 76% | on target |
