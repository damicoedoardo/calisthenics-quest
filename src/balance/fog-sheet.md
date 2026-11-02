# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 38% | 35% | 25% | 19% | 29% | **off** |
| Six workouts later | 84% | 77% | 71% | 73% | 76% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 2% | 0% | 0% | 4% | 2% | on target |
| 1 | +6 workouts | 77% | 69% | 67% | 67% | 70% | on target |
| 2 | opens | 48% | 56% | 35% | 25% | 41% | on target |
| 2 | +6 workouts | 83% | 88% | 71% | 65% | 77% | on target |
| 3 | opens | 25% | 23% | 35% | 17% | 25% | on target |
| 3 | +6 workouts | 81% | 75% | 79% | 79% | 79% | on target |
| 4 | opens | 50% | 38% | 48% | 52% | 47% | on target |
| 4 | +6 workouts | 79% | 60% | 77% | 83% | 75% | on target |
| 5 | opens | 65% | 52% | 8% | 6% | 33% | on target |
| 5 | +18 workouts | 96% | 85% | 42% | 69% | 73% | on target |
| 6 | opens | 38% | 42% | 23% | 10% | 28% | on target |
| 6 | +18 workouts | 85% | 83% | 92% | 73% | 83% | **off** |
