# Fog sheet

Written by `pnpm fog:sheet` (the Fog bot, 48 runs per class per point, player `steady`, walking in with what a player keeps (`SEASONED`) and searching every room). Do not edit by hand. The goals: `src/balance/classes.ts` and `src/balance/dungeon.ts`; the rule: `docs/handbook/game/balance.md`.

## Classes

Each class's win rate, averaged over the zones, against the four's average (fair: within 10 points).

| When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- |
| The day a zone opens | 20% | 19% | 21% | 19% | 20% | fair |
| Six workouts later | 74% | 59% | 64% | 68% | 66% | fair |

## Zones

Win rate by zone and class, against `ZONE_WINS`: 33% the day a zone opens, 67% later on (each within 15 points).

| Zone | When | archer | mage | warrior | monk | All four |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | opens (the first run, 0 workouts: at most 5%) | 0% | 0% | 0% | 0% | 0% | on target |
| 1 | +6 workouts | 79% | 54% | 81% | 56% | 68% | on target |
| 2 | opens | 25% | 33% | 31% | 8% | 24% | on target |
| 2 | +6 workouts | 69% | 60% | 67% | 48% | 61% | on target |
| 3 | opens | 23% | 17% | 25% | 19% | 21% | on target |
| 3 | +6 workouts | 77% | 56% | 67% | 85% | 71% | on target |
| 4 | opens | 35% | 31% | 44% | 35% | 36% | on target |
| 4 | +6 workouts | 50% | 52% | 50% | 58% | 53% | on target |
| 5 | opens | 27% | 29% | 10% | 33% | 25% | on target |
| 5 | +18 workouts | 81% | 73% | 33% | 79% | 67% | on target |
| 6 | opens | 8% | 6% | 15% | 19% | 12% | **off** |
| 6 | +18 workouts | 85% | 60% | 83% | 79% | 77% | on target |
