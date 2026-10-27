# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 32% | 26% | 29% | 30% | 29% | fair |
| Six workouts later | 76% | 71% | 72% | 75% | 74% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, meant to be lost) | 21% | 4% | 15% | 6% | 11% | on target |
| 1 | +6 workouts | 77% | 81% | 71% | 67% | 74% | on target |
| 2 | opens | 42% | 40% | 13% | 23% | 29% | on target |
| 2 | +6 workouts | 77% | 71% | 65% | 67% | 70% | on target |
| 3 | opens | 38% | 33% | 25% | 42% | 34% | on target |
| 3 | +6 workouts | 85% | 67% | 67% | 79% | 74% | on target |
| 4 | opens | 44% | 25% | 58% | 46% | 43% | on target |
| 4 | +6 workouts | 65% | 44% | 69% | 65% | 60% | on target |
| 5 | opens | 25% | 25% | 27% | 27% | 26% | on target |
| 5 | +18 workouts | 83% | 85% | 79% | 90% | 84% | **off** |
| 6 | opens | 25% | 27% | 38% | 35% | 31% | on target |
| 6 | +18 workouts | 71% | 79% | 83% | 85% | 80% | on target |
