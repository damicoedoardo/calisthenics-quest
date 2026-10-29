# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 25% | 21% | 17% | 22% | 21% | fair |
| Six workouts later | 70% | 64% | 60% | 65% | 65% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 4% | 0% | 2% | 0% | 2% | on target |
| 1 | +6 workouts | 79% | 67% | 73% | 56% | 69% | on target |
| 2 | opens | 38% | 33% | 21% | 15% | 27% | on target |
| 2 | +6 workouts | 63% | 65% | 56% | 42% | 56% | on target |
| 3 | opens | 27% | 17% | 13% | 19% | 19% | on target |
| 3 | +6 workouts | 63% | 63% | 56% | 75% | 64% | on target |
| 4 | opens | 40% | 38% | 38% | 42% | 39% | on target |
| 4 | +6 workouts | 60% | 52% | 44% | 52% | 52% | on target |
| 5 | opens | 29% | 27% | 10% | 35% | 26% | on target |
| 5 | +18 workouts | 79% | 69% | 54% | 85% | 72% | on target |
| 6 | opens | 15% | 10% | 17% | 21% | 16% | **off** |
| 6 | +18 workouts | 77% | 69% | 77% | 77% | 75% | on target |
