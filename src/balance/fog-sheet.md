# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 36% | 33% | 28% | 19% | 29% | fair |
| Six workouts later | 75% | 69% | 69% | 65% | 70% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 2% | 0% | 0% | 6% | 2% | on target |
| 1 | +6 workouts | 88% | 63% | 46% | 46% | 60% | on target |
| 2 | opens | 60% | 48% | 40% | 10% | 40% | on target |
| 2 | +6 workouts | 79% | 83% | 75% | 48% | 71% | on target |
| 3 | opens | 31% | 38% | 54% | 42% | 41% | on target |
| 3 | +6 workouts | 58% | 65% | 77% | 85% | 71% | on target |
| 4 | opens | 19% | 21% | 46% | 42% | 32% | on target |
| 4 | +6 workouts | 46% | 38% | 81% | 67% | 58% | on target |
| 5 | opens | 65% | 52% | 8% | 6% | 33% | on target |
| 5 | +18 workouts | 96% | 85% | 42% | 69% | 73% | on target |
| 6 | opens | 38% | 42% | 23% | 10% | 28% | on target |
| 6 | +18 workouts | 85% | 83% | 92% | 73% | 83% | **off** |
