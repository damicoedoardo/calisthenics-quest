---
type: reference
title: Tests and simulators
description: What pnpm test covers (rules, story references, sprite fingerprints, seeded Fog replays), the season simulator, and the Fog bot simulators for balance.
tags: [dev, testing, simulation, balance]
timestamp: 2026-10-29
---

# Tests and simulators

Tests are Vitest, next to the code (`*.test.ts`), with `@/` mapped to `src/` (`vitest.config.ts`).

| Test | Guards |
|---|---|
| `src/lib/game.test.ts`, `stats.test.ts`, `fog.test.ts`, `dev.test.ts`, `music.test.ts` | The rules: XP, the plan and quests, progression, saves from older versions, stat points, gear, zones, power, dev helpers, music patterns |
| `src/story/story.test.ts`, `fill.test.ts` | Six chapters and their lengths, unique scene ids, every speaker, place, song, sprite and `{word}` exists, player words only inside quotes, no digits in lines, daily lines don't repeat for three weeks |
| `src/sprites/sprites.test.ts` | Draws every sprite and action and keeps a pixel fingerprint (snapshot). A failing fingerprint after a change you didn't mean to make is a bug |
| `src/game/dungeon/engine.test.ts` | Replays a whole seeded bot run in every zone (snapshot). A refactor keeps them identical; a balance change moves them on purpose |
| `src/exercises/library.test.ts` | Every exercise has a real demo and coaching, every demo moves, the search filters right, and `public/data/exercises.json` is current (`pnpm exercises:db`) |
| `src/balance/sheet.test.ts` | The balance sheet `src/balance/sheet.md` is up to date with `src/balance/` (`pnpm balance` rewrites it; see [../game/balance.md](../game/balance.md)) |
| `src/sim/season.test.ts` | Plays every kind of player through 200 days with the real rules and fails on anything that looks wrong (every kind walks into the Fog deep enough for the SP's trial once it's given) |

Accept intended snapshot changes with `pnpm test -u`, and say in the PR why they moved.

## Simulators

- **Season** (`src/sim/`): `pnpm sim` plays the kinds of player in `src/sim/players.ts` (add one to
  try a new kind; each also spends stat points their way: spread, all on Damage, or never) day by day through the real workouts, story, flame, Fog and Book of Days, and
  writes each timeline and Fog snapshots to `sim-out/` (git-ignored).
- **Fog** (`scripts/fog-sim.mjs`): `pnpm fog:sim steady 100` plays hundreds of bot runs per zone
  and class on those snapshots, on every core, with the game's own engine and bot (Node runs the
  TypeScript through `scripts/ts-hooks.mjs`, which also lets it import JSON the bundler way). Runs use the snapshot's real boss edge (`edgeFor`, see [../game/fog.md](../game/fog.md)); `EDGE='{"bossHp":0.7,"picks":3}'` plays every run as if the chapter's hearts were gone. Each run starts in what a player keeps (`src/sim/seasoned.ts`; `GEAR=0` for the starter kit). Each line also prints the hits the bot takes a minute; `HUMAN='{"notice":0.8}'` changes how human the bot plays (`HUMAN` in `src/balance/dungeon.ts`). `pnpm fog:sheet` plays `steady` 48 times per class and writes `src/balance/fog-sheet.md` (class fairness and zone win rates against `ZONE_WINS`, zone 1's first run only checked for not being too easy; see [../game/balance.md](../game/balance.md)). `pnpm fog:tune steady 60` finds each zone's HP and damage for the target win rates (`ZONE_WINS` in `src/balance/dungeon.ts`; `TARGET=0.33,0.67` overrides). It fits
  the S curve of win rate against the zone's scale (a straight line in logit of the rate against
  ln of the scale) and usually lands in two or three measurements per zone, with all zones
  searched at once. Every measurement plays the same seeds, so two scales compare fairly. Each run
  starts with the snapshot's points (`build`) in what a player keeps by then (`seasonedKit`), so items the bot finds can be worn,
  and from `SP_MODEL_AT` workouts on with the SP (`NOSP=1` plays without it, `SP=2` to `4` wears that SP instead of the first). `WEAPON='{"hammer":{"cut":0}}'` tries other numbers for an SP weapon, and `OUT=file.json` writes every run (won, seconds, hits taken) per snapshot and class, to compare SPs in a script. `PARTY=2` (to 4) plays every run as a party of bots (the class named, then the next ones along, each geared and as strong; `playRun` in `bot.ts` steps a bot per hero), as party runs and the Ember Road are played. `ROAD=1` plays the Ember Road's chapter 1 (its own world) in place of the story zone it stands in for (with `ONLY=zone0-later,zone0-open`). `BUILDS=even,glass,tank,quick` plays each way of spending points instead (`BUILD_PROFILES` in `src/balance/dungeon.ts`, spent by `buildFor` in `src/sim/builds.ts`), the classes averaged, and says whether a build is more than `BUILD_FAIR` off the others.
- **Keeping the sims fast**: a run is ~20 game minutes at 60 steps a second, so the engine's
  per-step loops are the cost. Distance checks go through `closer` / `farther` in `engine.ts`
  (a box test, then the exact `Math.hypot`), and lists are only rebuilt when something leaves
  (the shots move in place, `moveBullets`; `standing` hands back the party itself when solo).
  The sims use every core (`availableParallelism`): on a laptop with more cores they run faster
  than in the cloud's four.
  A speed-up must not move a single replay: `pnpm test` must pass with no snapshot change.
- **In-browser balance** (`scripts/fog-balance.cjs`): the bot plays a production build in a
  browser; needs `pnpm build && pnpm start -p 3124` running.

Pure, seeded code is what makes all this possible: use `seeded()` from `src/lib/random.ts` (or take an `rng`
argument) in anything a replay or simulator runs. `Math.random` is only a default for the live
app's own calls.
