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
runs are free to replay, gear comes only from the dungeon, and only real training makes you
stronger and lets you wear what you find. Dying costs what you wore and carried, never points,
level or story.

## Rules (`src/lib/fog.ts`)

- **Zones**: `ZONES` is built from each story chapter's `fog` (written in `src/story/chapters/`),
  one zone per chapter, each with its boss (`BOSS_NAME`).
- **Opening**: `zoneStatus` opens a zone when its chapter has started and the zone before it is
  cleared.
- **Power from training**: `powerOf(state, now)` turns the save into a run's power. The stat
  points the player put into the champion give Health, Armor, Damage, Haste (attack speed), Speed
  (walk speed) and Crit, see `statPower` in `src/lib/stats.ts` and
  [training.md](training.md); each class's attack, body and ability numbers are in
  `src/balance/classes.ts`. The flame's fires circle you at `FLAME_AT` workouts (1, 6, 15, 30); a bonfire throws
  fireballs, a fire fairy heals when you're low. Training in the last two days gives a free run
  skill, resting (a day off or a minute by the fire) one more. `nextGrowth` writes the "train to
  grow" hint (points waiting to be spent, or that workouts earn them).
- **A boss with no hearts left**: every workout takes a heart off the chapter's enemy; once the
  chapter's hearts are gone (all its workouts done) and its boss still stands, `edgeFor` gives the
  run an `Edge`: the boss fights with `EDGE.bossHp` of its HP (the Knight with that share of his
  plates), and each workout since starts a run with one more free skill (`'past'` picks, up to
  `EDGE.picks`). Playing well still beats it sooner. The Play tab says how many hearts are left,
  or what the edge gives (`BossEdge` in `PlayTab.tsx`).
- **Run skills**: `UPGRADES` and `rollUpgrades` (three random choices per level-up), `xpToNext`.
- **Records**: `recordRun` saves runs, clears and each zone's bests (deepest, most monsters,
  fastest win) and the last run for the flame to talk about. The mid-boss guards floor
  `MID_FLOOR` (5).

- **Gear between runs** (`src/lib/fog-gear.ts`, saved as `state.fogGear`): what you wear
  (`worn`) and the vault at home (`vault`, `vaultSize` grows with workouts). `wornFor` is what you
  walk in with: only what your points let you wear today; the rest stays home, safe.
  `settleGear` runs after `recordRun`: a win or a walk out by the stairs keeps what you wore and
  puts the bag in the vault (the best first, the rest left behind if it's full); dying loses all
  of it, except the one item your flame holds and gear forged to +10 or more, which comes home a few pluses lower (see [forge.md](forge.md)). Mid-run, `atRisk` says
  the same thing ahead of time (what a fall would take, what the flame would hold, or would hold
  if you trained), for the HUD's bag, the bag panel and the stairs card. In the bag panel each item carries a green
  ▲ or red ▼ against what you wear in its slot (`betterBy`), and its card says by how much. What a full vault can't take
  is melted into embers. `wearFromVault` and `takeOffToVault` are the vault's buttons
  (`FogGearCard`), and "Melt down" is the forge's `salvage`. The items themselves are in
  [dungeon.md](dungeon.md); Mira's forge and the flame in [forge.md](forge.md).

Tested in `src/lib/fog.test.ts` and `src/lib/fog-gear.test.ts`.

## The run itself

A run is a dungeon of ten floors per zone, each a map of rooms to explore down to the stairs (a
minimap in the corner fills in as you go), played by a pure engine and drawn by Phaser:
[dungeon.md](dungeon.md) has the files and the how-to table. `src/game/rules.ts` holds numbers
shared between the hero and the engine (speed, HP, attacks) and the sprite sheet names;
`src/game/sheets.ts` builds the sheets a run needs (after the story's finale the hero's are drawn
on fire, `heroVariant` in `src/story/flame.ts`); `src/game/calm.ts` drops shake and flashes for
`prefers-reduced-motion`.

`src/components/FogRun.tsx` loads `src/game/dungeon/scene.ts` with `import()` only when a run
starts (Phaser is big); `PlayTab.tsx` warms the code and sheets while the tab sits idle. A run is
played with the phone held sideways: held upright, `FogRun` holds the run behind a "turn your
phone" card (`usePortrait`), and where the browser allows it (Android, installed) it turns the
screen itself for the run (`useSideways`). The rest of the app stays upright. Sideways, the room
fills the whole screen and the camera follows you in it; the HUD is small and kept to the corners
(see "Sideways on screen" in [dungeon.md](dungeon.md)).

On a computer (mouse or trackpad: `useKeyboardPlay` in `src/components/useDesk.ts`) the run is
played with keys and never asks you to turn anything. The scene's own keys: WASD or the arrows
move, Q is the class ability, Space (or E, or Shift) dodges, a click on a monster aims at it; they
do nothing while a card or the bag holds the run. `FogRun`'s keys: Esc or P pauses (and closes
whatever is open), B or I the bag, M the map, 1 2 3 pick a skill, chest or stairs choice, Enter
runs again at the end. Each button shows its key (`Key`), the pause menu lists them all
(`KeyList`), the first tip talks keys, and on a big screen (`desk:`) the HUD is zoomed 1.4x.

## Balance

The rule for every balance number, and the changelog, are in [balance.md](balance.md).
`src/game/power.ts` scores a hero's points, class and gear on one scale (`powerScore`, see
[balance.md](balance.md)).
`pnpm sim` writes snapshots of simulated players (see [../dev/testing.md](../dev/testing.md)), then
`pnpm fog:sim` plays hundreds of bot runs on them per zone and class. `DIALS` in
`src/balance/dungeon.ts` are the main knobs. The sim starts every run in the starter kit with
the snapshot's points (as after a death); the bot wears what drops. Zones are tuned so that run
is about where the game was before items, so the gear you keep is strength on top.
