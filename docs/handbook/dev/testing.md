---
type: reference
title: Tests and simulators
description: What pnpm test covers (rules, story references, sprite fingerprints, seeded Fog replays), the season simulator, and the Fog bot simulators for balance.
tags: [dev, testing, simulation, balance]
timestamp: 2026-10-27
---

# Tests and simulators

Tests are Vitest, next to the code (`*.test.ts`), with `@/` mapped to `src/` (`vitest.config.ts`).

| Test | Guards |
|---|---|
| `src/lib/game.test.ts`, `fog.test.ts`, `dev.test.ts`, `music.test.ts` | The rules: XP, quests, progression, zones, power, dev helpers, music patterns |
| `src/story/story.test.ts`, `fill.test.ts` | Six chapters and their lengths, unique scene ids, every speaker, place, song, sprite and `{word}` exists, player words only inside quotes, no digits in lines, daily lines don't repeat for three weeks |
| `src/sprites/sprites.test.ts` | Draws every sprite and action and keeps a pixel fingerprint (snapshot). A failing fingerprint after a change you didn't mean to make is a bug |
| `src/game/dungeon/engine.test.ts` | Replays a whole seeded bot run in every zone (snapshot). A refactor keeps them identical; a balance change moves them on purpose |
| `src/exercises/library.test.ts` | Every exercise has a real demo and coaching, every demo moves, the search filters right, and `public/data/exercises.json` is current (`pnpm exercises:db`) |
| `src/sim/season.test.ts` | Plays every kind of player through 200 days with the real rules and fails on anything that looks wrong |

Accept intended snapshot changes with `pnpm test -u`, and say in the PR why they moved.

## Simulators

- **Season** (`src/sim/`): `pnpm sim` plays the kinds of player in `src/sim/players.ts` (add one to
  try a new kind) day by day through the real workouts, story, flame, Fog and Book of Days, and
  writes each timeline and Fog snapshots to `sim-out/` (git-ignored).
- **Fog** (`scripts/fog-sim.mjs`): `pnpm fog:sim steady 100` plays hundreds of bot runs per zone
  and class on those snapshots, on every core, with the game's own engine and bot (Node runs the
  TypeScript through `scripts/ts-hooks.mjs`, which also lets it import JSON the bundler way). `pnpm fog:tune steady 60` finds each zone's HP and damage for the target win rates.
- **In-browser balance** (`scripts/fog-balance.cjs`): the bot plays a production build in a
  browser; needs `pnpm build && pnpm start -p 3124` running.

Pure, seeded code is what makes all this possible: use `seeded()` from `src/lib/random.ts` (or take an `rng`
argument) in anything a replay or simulator runs. `Math.random` is only a default for the live
app's own calls.
