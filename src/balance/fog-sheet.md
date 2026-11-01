# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 37% | 35% | 23% | 22% | 29% | fair |
| Six workouts later | 78% | 76% | 63% | 74% | 73% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 4% | 0% | 0% | 10% | 4% | on target |
| 1 | +6 workouts | 77% | 67% | 58% | 65% | 67% | on target |
| 2 | opens | 46% | 44% | 29% | 17% | 34% | on target |
| 2 | +6 workouts | 79% | 73% | 71% | 75% | 74% | on target |
| 3 | opens | 35% | 35% | 33% | 25% | 32% | on target |
| 3 | +6 workouts | 77% | 73% | 73% | 75% | 74% | on target |
| 4 | opens | 46% | 38% | 38% | 50% | 43% | on target |
| 4 | +6 workouts | 63% | 67% | 58% | 71% | 65% | on target |
| 5 | opens | 52% | 56% | 15% | 15% | 34% | on target |
| 5 | +18 workouts | 94% | 88% | 46% | 85% | 78% | on target |
| 6 | opens | 40% | 35% | 23% | 15% | 28% | on target |
| 6 | +18 workouts | 81% | 88% | 71% | 71% | 78% | on target |
