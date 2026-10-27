---
type: conceptual
title: Mira's forge and the flame
description: What you do with Fog gear between runs, on the Play tab's gear card — embers from workouts, Mira's forge (upgrade +1..+15 with co-op materials from +6, misses from +7, safe marks, a new look every few pluses), reroll, melt down, the one item your flame keeps if you fall — rules in src/lib/forge.ts and fog-gear.ts, numbers in src/balance/upgrades.ts, screen FogGearCard.tsx.
tags: [game, fog, forge, gear, co-op]
timestamp: 2026-10-27
---

# Mira's forge and the flame

Between runs your gear lives on the Play tab's gear card (`src/components/FogGearCard.tsx`): the
three slots you wear, the vault, and, for the item you tap, what you can do with it. Each vault
item carries a green ▲ or red ▼ against what you wear in its slot, and its card says by how much. (A walkable
camp was tried for this and dropped: Edoardo wanted it on the normal screens.)

## Rules

- **Embers** (`src/lib/forge.ts`): each workout earns `EMBERS` (full or minimum quest), counted
  from the sessions (`embersEarned`), so nothing is stored per workout. What you melt down adds to
  `fogGear.embers.found`, what the forge takes to `embers.spent`; `embersOf` is the total you have.
- **Mira's forge, +1 to +15** (Edoardo's call, like NosTale's SP upgrades). Every step's price,
  odds and strength is one row of `STEPS` in `src/balance/upgrades.ts`:
  - **+1 to +5** cost embers only and always hold: training alone gets you there.
  - **From +6** a step also asks for **co-op materials** (`upgradeMats`, `matsShort`), which only
    drop when you play with friends (see below) or a friend gives you. Rarest last: Ember thread
    (+6 on), Bond shard (+10 on), Warden coal (+13 on), Heartstone (+15). Embers are still part
    of every step, so training pays for all of it.
  - **From +7 a step can miss** (`tryUpgrade` → `'held' | 'missed' | 'slipped'`; `upgrade` is the
    same without the result). The embers and materials are spent either way. A miss may slip the
    item one plus (`FORGE_RISK.drop`), but never under a **safe mark** it has reached
    (`SAFE_POINTS` +6, +10, +13; `safeFloor` in `items.ts`); nothing ever breaks.
  - **The chance** (`upgradeOdds`): the step's own, plus `FORGE_RISK.pity` for each miss since the
    last upgrade that held (`item.misses`), plus `FORGE_RISK.rested` if you trained in the last
    `restedDays` days (`rested`). Each try is seeded from the item's id and `item.tries`, so a
    press always gives the same result (no reload trick) and replays stay exact.
  - Each plus makes the item's numbers bigger by its step's `boost` (`boostAt`/`boostOf` in
    `src/game/dungeon/items.ts`, used by `itemTotals`, `itemScore`, `itemLines`; `nameOf` adds
    " +N"). The card shows each line before and after the next plus.
- **A new look every few pluses** (`BANDS`, `bandOf`, `glowOf`): the shine comes from forging,
  growing to full at +15 (Edoardo's call): +4 a warm glow, +7 the item's rarity color, +10 sparks,
  +13 light rays on its card, +15 "Radiant". Each band also sets how far the light runs around the
  hero wearing it (`aura`, drawn in the hero sprite by `drawHero` from the best-forged thing worn,
  `Gear.plus` from `gearOf`). A legendary instead burns, whatever its plus: a turning ring of red
  fire with red sparks (`LegendFire`). `src/components/PlusGlow.tsx` draws both on item tiles and
  cards; `wearLook` in `scene.ts` draws them in a run (a glow and sparks under the hero for the
  plus, a red glow, red sparks and rising flames for a worn legendary). Still with reduced motion.
- **Reroll and melt**: `reroll` rolls one bonus into a different one for `REROLL_COST`, seeded
  from the item's id and its `rerolls`. `salvage` melts an item down for `salvageValue` (rarer
  and upgraded items give more). The starter kit can't be upgraded or melted.
- **Co-op materials** (`fogGear.mats`): a party run rolls them for each standing hero on kills,
  chests, the mid-boss, the boss and a clear with nobody down (`findMats` in `engine.ts`, odds
  `MAT_DROPS`); a solo run rolls none, so solo runs play exactly as before. They come home in
  `RunEnd.mats` and `settleGear` keeps them however the run ends. Friends can give them to each
  other (`giveMats`, `takeGifts`; the server side is in
  [../backend/friends.md](../backend/friends.md)).
- **The flame** (`src/lib/fog-gear.ts`): you give one worn slot to your flame (`setGuard`, saved
  as `fogGear.guard`; a flame badge marks it). If you trained in the last 2 days (`flameGuards`)
  and die, `settleGear` keeps that item (`out.held`); the rest is lost as usual.
- **Forged too well to lose**: an item at `FALL_KEEP.from` (+10) or more isn't lost in a fall. It
  comes home slipped to the safe mark under it (`afterFall`: +10 to +6, +12 to +10, +15 to +13),
  worn ones on the hero and carried ones into the vault (`out.slipped`). `atRisk` lists them as
  `slip`, and the run's bag says so.
- **After a run**: what a full vault can't take, Mira melts into embers (`out.embers`).
  `fogGear.deaths` counts falls; on the first one the results show Mira's line (`GearRecap` in
  `FogRun.tsx`), which also lists materials found and gear that slipped home.
- **The old forge is gone**: gear no longer forges itself every few workouts. `migrate()` froze
  what it had made as `fogGear.kit`, and `gearOf` (`src/lib/game.ts`) shows the finer of that
  look and the item you wear (`tierOf`). See [training.md](training.md).

Tested in `src/lib/forge.test.ts`, `src/lib/fog-gear.test.ts`, `src/lib/game.test.ts` and the
co-op tests in `src/game/dungeon/engine.test.ts`. What the numbers add up to (embers and weeks
per step, tries, materials per co-op run) is on the balance sheet ([balance.md](balance.md)).

## How to change things

| I want to... | Edit |
|---|---|
| Change a step's embers, materials, odds or strength | `STEPS` in `src/balance/upgrades.ts`, then `pnpm balance` |
| Change how harsh a miss is, pity, the training bonus | `FORGE_RISK` in `src/balance/upgrades.ts` |
| Change the safe marks, or what a fall does to forged gear | `SAFE_POINTS`, `FALL_KEEP` in `src/balance/upgrades.ts` |
| Change how often co-op runs drop materials | `MAT_DROPS` in `src/balance/upgrades.ts` (rolled by `findMats` in `engine.ts`) |
| Change the materials' names, colors, where they come from | `MATS` in `src/balance/upgrades.ts` |
| Change the look of each band | `BANDS` in `src/balance/upgrades.ts`; how it's drawn in `PlusGlow.tsx` and `wearLook` in `scene.ts` |
| Change embers per workout, reroll price | `EMBERS`, `FORGE` in `src/balance/economy.ts` |
| Change what melting gives | `MELT` in `src/balance/economy.ts` (`salvageValue` in `fog-gear.ts`) |
| Change how long the flame's guard lasts | `FLAME_GUARD_DAYS` in `src/balance/economy.ts` |
| Change the gear card, the forge's buttons or words | `src/components/FogGearCard.tsx` (`Forge`, `Mats`, Mira's lines in `SAID`) |
