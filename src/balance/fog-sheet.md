# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 31% | 24% | 29% | 28% | 28% | fair |
| Six workouts later | 73% | 69% | 68% | 71% | 70% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens | 21% | 4% | 15% | 6% | 11% | **off** |
| 1 | +6 workouts | 77% | 81% | 71% | 67% | 74% | on target |
| 2 | opens | 31% | 27% | 10% | 15% | 21% | on target |
| 2 | +6 workouts | 56% | 56% | 38% | 42% | 48% | **off** |
| 3 | opens | 38% | 33% | 25% | 42% | 34% | on target |
| 3 | +6 workouts | 85% | 67% | 67% | 79% | 74% | on target |
| 4 | opens | 44% | 25% | 58% | 46% | 43% | on target |
| 4 | +6 workouts | 65% | 44% | 69% | 65% | 60% | on target |
| 5 | opens | 25% | 25% | 27% | 27% | 26% | on target |
| 5 | +18 workouts | 83% | 85% | 79% | 90% | 84% | **off** |
| 6 | opens | 25% | 27% | 38% | 35% | 31% | on target |
| 6 | +18 workouts | 71% | 79% | 83% | 85% | 80% | on target |
