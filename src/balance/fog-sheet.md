# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 32% | 36% | 29% | 38% | 34% | fair |
| Six workouts later | 79% | 71% | 68% | 76% | 74% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, meant to be lost) | 19% | 13% | 17% | 4% | 13% | on target |
| 1 | +6 workouts | 92% | 79% | 85% | 71% | 82% | on target |
| 2 | opens | 33% | 44% | 23% | 21% | 30% | on target |
| 2 | +6 workouts | 65% | 73% | 50% | 65% | 63% | on target |
| 3 | opens | 33% | 50% | 38% | 52% | 43% | on target |
| 3 | +6 workouts | 83% | 79% | 77% | 88% | 82% | on target |
| 4 | opens | 35% | 44% | 38% | 56% | 43% | on target |
| 4 | +6 workouts | 69% | 44% | 58% | 58% | 57% | on target |
| 5 | opens | 35% | 31% | 25% | 54% | 36% | on target |
| 5 | +18 workouts | 90% | 73% | 58% | 94% | 79% | on target |
| 6 | opens | 35% | 33% | 35% | 38% | 35% | on target |
| 6 | +18 workouts | 77% | 79% | 81% | 83% | 80% | on target |
