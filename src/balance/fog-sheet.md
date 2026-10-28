# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 30% | 24% | 33% | 36% | 31% | fair |
| Six workouts later | 62% | 64% | 67% | 76% | 67% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 2% | 0% | 4% | 0% | 2% | on target |
| 1 | +6 workouts | 69% | 56% | 85% | 73% | 71% | on target |
| 2 | opens | 35% | 33% | 40% | 21% | 32% | on target |
| 2 | +6 workouts | 52% | 71% | 77% | 67% | 67% | on target |
| 3 | opens | 31% | 27% | 38% | 46% | 35% | on target |
| 3 | +6 workouts | 65% | 71% | 65% | 94% | 73% | on target |
| 4 | opens | 46% | 35% | 56% | 56% | 48% | **off** |
| 4 | +6 workouts | 46% | 50% | 58% | 65% | 55% | on target |
| 5 | opens | 42% | 25% | 21% | 50% | 34% | on target |
| 5 | +18 workouts | 67% | 65% | 50% | 79% | 65% | on target |
| 6 | opens | 23% | 25% | 42% | 44% | 33% | on target |
| 6 | +18 workouts | 75% | 73% | 67% | 79% | 73% | on target |
