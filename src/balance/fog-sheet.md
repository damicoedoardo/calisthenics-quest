# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 29% | 27% | 22% | 23% | 25% | fair |
| Six workouts later | 70% | 64% | 71% | 70% | 69% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 4% | 0% | 2% | 0% | 2% | on target |
| 1 | +6 workouts | 71% | 73% | 83% | 58% | 71% | on target |
| 2 | opens | 35% | 33% | 19% | 15% | 26% | on target |
| 2 | +6 workouts | 75% | 69% | 73% | 60% | 69% | on target |
| 3 | opens | 33% | 40% | 27% | 19% | 30% | on target |
| 3 | +6 workouts | 67% | 67% | 77% | 77% | 72% | on target |
| 4 | opens | 27% | 44% | 48% | 52% | 43% | on target |
| 4 | +6 workouts | 56% | 54% | 69% | 69% | 62% | on target |
| 5 | opens | 42% | 23% | 15% | 31% | 28% | on target |
| 5 | +18 workouts | 83% | 58% | 46% | 83% | 68% | on target |
| 6 | opens | 33% | 21% | 23% | 21% | 24% | on target |
| 6 | +18 workouts | 71% | 65% | 79% | 73% | 72% | on target |
