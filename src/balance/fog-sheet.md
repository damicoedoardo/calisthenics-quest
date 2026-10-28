# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 32% | 39% | 34% | 23% | 32% | fair |
| Six workouts later | 74% | 69% | 68% | 72% | 71% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, meant to be lost) | 19% | 15% | 21% | 4% | 15% | on target |
| 1 | +6 workouts | 77% | 65% | 85% | 73% | 75% | on target |
| 2 | opens | 38% | 52% | 31% | 25% | 36% | on target |
| 2 | +6 workouts | 73% | 65% | 63% | 58% | 65% | on target |
| 3 | opens | 33% | 44% | 42% | 27% | 36% | on target |
| 3 | +6 workouts | 79% | 65% | 73% | 73% | 72% | on target |
| 4 | opens | 44% | 52% | 48% | 33% | 44% | on target |
| 4 | +6 workouts | 58% | 63% | 52% | 63% | 59% | on target |
| 5 | opens | 33% | 33% | 33% | 29% | 32% | on target |
| 5 | +18 workouts | 75% | 75% | 65% | 83% | 74% | on target |
| 6 | opens | 27% | 38% | 29% | 19% | 28% | on target |
| 6 | +18 workouts | 83% | 83% | 69% | 79% | 79% | on target |
