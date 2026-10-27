---
type: conceptual
title: Mira's forge and the flame
description: What you do with Fog gear between runs, on the Play tab's gear card — embers from workouts, Mira's forge (upgrade +1..+5, reroll, melt down), the one item your flame keeps if you fall — rules in src/lib/forge.ts and fog-gear.ts, screen FogGearCard.tsx.
tags: [game, fog, forge, gear]
timestamp: 2026-10-27
---

# Mira's forge and the flame

Between runs your gear lives on the Play tab's gear card (`src/components/FogGearCard.tsx`): the
three slots you wear, the vault, and, for the item you tap, what you can do with it. Held sideways it is the Play tab's Gear view: the three as columns side by side. (A walkable
camp was tried for this and dropped: Edoardo wanted it on the normal screens.)

## Rules

- **Embers** (`src/lib/forge.ts`): each workout earns `EMBERS` (full or minimum quest), counted
  from the sessions (`embersEarned`), so nothing is stored per workout. What you melt down adds to
  `fogGear.embers.found`, what the forge takes to `embers.spent`; `embersOf` is the total you have.
- **Mira's forge** (`forge.ts`): `upgrade` takes an item one step up to `MAX_PLUS` (+5) for
  `upgradeCost` (more each step); each plus makes the item's numbers `PLUS_STEP` bigger
  (`boostOf` in `src/game/dungeon/items.ts`, used by `itemTotals`, `itemScore`, `itemLines`;
  `nameOf` adds the " +N"). The card shows each line before and after the next plus. `reroll`
  rolls one bonus into a different one for `REROLL_COST`, seeded from the item's id and its
  `rerolls`, so the same press gives the same result. `salvage` melts an item down for
  `salvageValue` (rarer and upgraded items give more). The starter kit can't be upgraded or melted.
- **The flame** (`src/lib/fog-gear.ts`): you give one worn slot to your flame (`setGuard`, saved
  as `fogGear.guard`; a flame badge marks it). If you trained in the last 2 days (`flameGuards`)
  and die, `settleGear` keeps that item (`out.held`); the rest is lost as usual. The card says in
  one line what a fall would cost.
- **After a run**: what a full vault can't take, Mira melts into embers (`out.embers`).
  `fogGear.deaths` counts falls; on the first one the results show Mira's line (`GearRecap` in
  `FogRun.tsx`).
- **The old forge is gone**: gear no longer forges itself every few workouts. `migrate()` froze
  what it had made as `fogGear.kit`, and `gearOf` (`src/lib/game.ts`) shows the finer of that
  look and the item you wear (`tierOf`). A worn item also dresses the hero as that very item
  (`Gear.item`, from `looksOf`): its kind, rarity and colors, see [sprites.md](sprites.md).
  See [training.md](training.md).

Tested in `src/lib/forge.test.ts`, `src/lib/fog-gear.test.ts` and `src/lib/game.test.ts`.

## How to change things

| I want to... | Edit |
|---|---|
| Change embers per workout, or forge prices | `EMBERS`, `upgradeCost`, `REROLL_COST` in `src/lib/forge.ts` |
| Change what melting gives | `salvageValue` in `src/lib/fog-gear.ts` |
| Change how strong a plus is, or the top | `PLUS_STEP`, `MAX_PLUS` in `src/game/dungeon/items.ts` |
| Change how long the flame's guard lasts | `flameGuards` in `src/lib/fog-gear.ts` |
| Change the gear card, the forge's buttons or words | `src/components/FogGearCard.tsx` |
