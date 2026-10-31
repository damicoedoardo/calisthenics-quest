# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 27% | 23% | 21% | 21% | 23% | fair |
| Six workouts later | 72% | 65% | 70% | 64% | 68% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 0% | 0% | 0% | 2% | 1% | on target |
| 1 | +6 workouts | 65% | 48% | 69% | 56% | 59% | on target |
| 2 | opens | 35% | 44% | 23% | 13% | 29% | on target |
| 2 | +6 workouts | 73% | 75% | 85% | 56% | 72% | on target |
| 3 | opens | 33% | 25% | 33% | 23% | 29% | on target |
| 3 | +6 workouts | 83% | 65% | 75% | 79% | 76% | on target |
| 4 | opens | 46% | 40% | 42% | 40% | 42% | on target |
| 4 | +6 workouts | 63% | 58% | 54% | 52% | 57% | on target |
| 5 | opens | 33% | 21% | 10% | 31% | 24% | on target |
| 5 | +18 workouts | 71% | 75% | 48% | 75% | 67% | on target |
| 6 | opens | 15% | 8% | 19% | 19% | 15% | **off** |
| 6 | +18 workouts | 75% | 71% | 88% | 63% | 74% | on target |
