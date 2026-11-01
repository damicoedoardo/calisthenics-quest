# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 32% | 28% | 19% | 19% | 25% | fair |
| Six workouts later | 75% | 70% | 68% | 69% | 71% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 0% | 0% | 0% | 8% | 2% | on target |
| 1 | +6 workouts | 54% | 52% | 56% | 60% | 56% | on target |
| 2 | opens | 46% | 38% | 29% | 23% | 34% | on target |
| 2 | +6 workouts | 75% | 71% | 69% | 75% | 72% | on target |
| 3 | opens | 25% | 25% | 23% | 10% | 21% | on target |
| 3 | +6 workouts | 79% | 67% | 77% | 81% | 76% | on target |
| 4 | opens | 42% | 42% | 33% | 52% | 42% | on target |
| 4 | +6 workouts | 56% | 67% | 65% | 75% | 66% | on target |
| 5 | opens | 52% | 38% | 13% | 8% | 28% | on target |
| 5 | +18 workouts | 94% | 92% | 48% | 60% | 73% | on target |
| 6 | opens | 29% | 29% | 15% | 15% | 22% | on target |
| 6 | +18 workouts | 90% | 75% | 94% | 65% | 81% | on target |
