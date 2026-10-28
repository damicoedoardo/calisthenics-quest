# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 22% | 33% | 28% | 27% | 28% | fair |
| Six workouts later | 59% | 61% | 73% | 64% | 64% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 4% | 0% | 4% | 0% | 2% | on target |
| 1 | +6 workouts | 50% | 46% | 77% | 42% | 54% | on target |
| 2 | opens | 38% | 42% | 25% | 17% | 30% | on target |
| 2 | +6 workouts | 67% | 73% | 75% | 60% | 69% | on target |
| 3 | opens | 15% | 40% | 35% | 31% | 30% | on target |
| 3 | +6 workouts | 67% | 63% | 73% | 65% | 67% | on target |
| 4 | opens | 35% | 56% | 54% | 46% | 48% | on target |
| 4 | +6 workouts | 48% | 65% | 69% | 50% | 58% | on target |
| 5 | opens | 21% | 29% | 23% | 40% | 28% | on target |
| 5 | +18 workouts | 67% | 73% | 69% | 85% | 73% | on target |
| 6 | opens | 21% | 33% | 27% | 29% | 28% | on target |
| 6 | +18 workouts | 56% | 50% | 75% | 83% | 66% | on target |
