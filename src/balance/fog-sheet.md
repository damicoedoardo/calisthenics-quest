# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 25% | 22% | 18% | 18% | 21% | fair |
| Six workouts later | 68% | 62% | 69% | 68% | 67% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 4% | 0% | 0% | 0% | 1% | on target |
| 1 | +6 workouts | 71% | 73% | 83% | 58% | 71% | on target |
| 2 | opens | 27% | 33% | 23% | 8% | 23% | on target |
| 2 | +6 workouts | 67% | 65% | 65% | 63% | 65% | on target |
| 3 | opens | 29% | 27% | 27% | 19% | 26% | on target |
| 3 | +6 workouts | 67% | 67% | 77% | 77% | 72% | on target |
| 4 | opens | 33% | 38% | 23% | 35% | 32% | on target |
| 4 | +6 workouts | 52% | 46% | 65% | 56% | 55% | on target |
| 5 | opens | 33% | 19% | 19% | 27% | 24% | on target |
| 5 | +18 workouts | 83% | 58% | 46% | 83% | 68% | on target |
| 6 | opens | 21% | 13% | 19% | 17% | 17% | **off** |
| 6 | +18 workouts | 71% | 65% | 79% | 73% | 72% | on target |
