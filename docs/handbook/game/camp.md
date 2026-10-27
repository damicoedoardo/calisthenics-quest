---
type: conceptual
title: The camp (between runs)
description: The walkable camp between Fog runs — the fire and your flame's guard, the vault, Mira's forge (embers, upgrade, reroll, melt down), a gate per zone — its rules in src/lib/forge.ts and fog-gear.ts, its scene in src/game/camp/, its screen Camp.tsx.
tags: [game, fog, camp, forge]
timestamp: 2026-10-27
---

# The camp

The place you stand between runs, held sideways like a run: a strip of ground you walk from the
fire on the left, past the vault and Mira's forge, to a gate for each zone on the right. Reaching
a spot opens its panel over the camp. The Play tab's "To the camp" opens it; a run started from a
gate comes back to that gate.

## Rules

- **Embers** (`src/lib/forge.ts`): each workout earns `EMBERS` (full or minimum quest), counted
  from the sessions (`embersEarned`), so nothing is stored per workout. What you melt down adds to
  `fogGear.embers.found`, what the forge takes to `embers.spent`; `embersOf` is the total you have.
- **Mira's forge** (`forge.ts`): `upgrade` takes an item one step up to `MAX_PLUS` (+5) for
  `upgradeCost` (more each step); each plus makes the item's numbers `PLUS_STEP` bigger
  (`boostOf` in `src/game/dungeon/items.ts`, used by `itemTotals`, `itemScore`, `itemLines`;
  `nameOf` adds the " +N"). `reroll` rolls one bonus into a different one for `REROLL_COST`,
  seeded from the item's id and its `rerolls`, so the same press gives the same result.
  `salvage` melts an item down for `salvageValue` (rarer and upgraded items give more). The
  starter kit can't be upgraded or melted.
- **The fire** (`src/lib/fog-gear.ts`): you choose one worn slot for your flame to hold
  (`setGuard`, saved as `fogGear.guard`). If you trained in the last 2 days (`flameGuards`) and
  die, `settleGear` keeps that item (`out.held`); the rest is lost as usual.
- **After a run**: what a full vault can't take, Mira melts into embers (`out.embers`).
  `fogGear.deaths` counts falls; on the first one the results show Mira's line (`GearRecap` in
  `FogRun.tsx`).
- **The old forge is gone**: gear no longer forges itself every few workouts. `migrate()` froze
  what it had made as `fogGear.kit`, and `gearOf` (`src/lib/game.ts`) shows the finer of that
  look and the item you wear (`tierOf`). See [training.md](training.md).

Tested in `src/lib/forge.test.ts`, `src/lib/fog-gear.test.ts` and `src/lib/game.test.ts`.

## Files

```
src/game/camp/layout.ts   the camp as data: its size, where each spot stands (stations), REACH
src/game/camp/props.ts    the anvil, the gate arch and the fire's logs as text-row props
src/game/camp/scene.ts    the Phaser scene: draws the camp, walks the hero (hold or tap), opens a spot
src/game/sheets.ts        campSheets: the hero, walk, Ember and Mira sheets the camp needs
src/components/Camp.tsx   the screen: top bar with embers, the panels (vault, forge, fire, gate)
```

`scene.ts` is loaded with `import()` like the run's scene. A spot opens only when you walked to
it (a tap on it, or holding until you stop there), not when you pass it on the way elsewhere.
The vault panel is the Play tab's `FogGearCard`.

## How to change things

| I want to... | Edit |
|---|---|
| Change embers per workout, or forge prices | `EMBERS`, `upgradeCost`, `REROLL_COST` in `src/lib/forge.ts` |
| Change what melting gives | `salvageValue` in `src/lib/fog-gear.ts` |
| Change how strong a plus is, or the top | `PLUS_STEP`, `MAX_PLUS` in `src/game/dungeon/items.ts` |
| Change how long the flame's guard lasts | `flameGuards` in `src/lib/fog-gear.ts` |
| Move a spot or make the camp longer | `stations`, `CAMP` in `src/game/camp/layout.ts` |
| Redraw the anvil, gate or logs | `src/game/camp/props.ts` |
| Change a panel's words or buttons | its function in `src/components/Camp.tsx` |
