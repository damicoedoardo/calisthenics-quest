---
type: conceptual
title: The Fog (the game between workouts)
description: The rules around a Fog run in src/lib/fog.ts — zones from the story's chapters, when a zone opens, power from real training, run skills, records — and how a run is loaded and drawn.
tags: [game, fog, rules]
timestamp: 2026-10-27
---

# The Fog

The Play tab's game: a short dungeon crawl where class, skills and gear matter and you can lose.
It follows the rule "training earns, play spends" (see [../product/overview.md](../product/overview.md)):
losing costs nothing, runs are free to replay, and only real training makes you stronger.

## Rules (`src/lib/fog.ts`)

- **Zones**: `ZONES` is built from each story chapter's `fog` (written in `src/story/chapters/`),
  one zone per chapter, each with its boss (`BOSS_NAME`).
- **Opening**: `zoneStatus` opens a zone when its chapter has started and the zone before it is
  cleared.
- **Power from training**: `powerOf(state, now)` turns the save into a run's power. The stat
  points the player put into the champion give Health (HP, a little armor), Damage, Reach (pickup
  range) and Speed (attack speed), see `statPower` in `src/lib/stats.ts` and
  [training.md](training.md). The flame's fires circle you at `FLAME_AT` workouts (1, 6, 15, 30); a bonfire throws
  fireballs, a fire fairy heals when you're low. Training in the last two days gives a free run
  skill, resting (a day off or a minute by the fire) one more. `nextGrowth` writes the "train to
  grow" hint (points waiting to be spent, or that workouts earn them).
- **Run skills**: `UPGRADES` and `rollUpgrades` (three random choices per level-up), `xpToNext`.
- **Records**: `recordRun` saves runs, clears and each zone's bests (deepest, most monsters,
  fastest win) and the last run for the flame to talk about. The mid-boss guards floor
  `MID_FLOOR` (5).

Tested in `src/lib/fog.test.ts`.

## The run itself

A run is a dungeon of ten floors per zone, each a map of rooms to explore down to the stairs (a
minimap in the corner fills in as you go), played by a pure engine and drawn by Phaser:
[dungeon.md](dungeon.md) has the files and the how-to table. `src/game/rules.ts` holds numbers
shared between the hero and the engine (speed, HP, attacks) and the sprite sheet names;
`src/game/sheets.ts` builds the sheets a run needs; `src/game/calm.ts` drops shake and flashes for
`prefers-reduced-motion`.

`src/components/FogRun.tsx` loads `src/game/dungeon/scene.ts` with `import()` only when a run
starts (Phaser is big); `PlayTab.tsx` warms the code and sheets while the tab sits idle. A run is
played with the phone held sideways: held upright, `FogRun` holds the run behind a "turn your
phone" card (`usePortrait`), and where the browser allows it (Android, installed) it turns the
screen itself for the run (`useSideways`). The rest of the app stays upright.

## Balance

`pnpm sim` writes snapshots of simulated players (see [../dev/testing.md](../dev/testing.md)), then
`pnpm fog:sim` plays hundreds of bot runs on them per zone and class. `DIALS` in
`src/game/dungeon/content.ts` are the main knobs.
