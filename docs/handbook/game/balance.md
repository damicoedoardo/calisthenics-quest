---
type: conceptual
title: Balance (design for balance)
description: The rule every feature follows so FORMA stays tunable — every balance number named in src/balance/ with its goal, the balance sheet (pnpm balance) that shows what they add up to, the map of numbers not moved yet, and the balance changelog.
tags: [game, balance, rules, changelog]
timestamp: 2026-10-27
---

# Balance

Balance is how strong, how fast, how rare and how costly things are: XP, stat points, items,
drops, the forge, monsters, bosses. FORMA is built so anyone (Edoardo, an agent) can find any
of these numbers, change it, see what it does, and later see when and why it changed.

## The rule (design for balance)

Every feature follows this. The short form is in [`AGENTS.md`](../../../AGENTS.md).

1. **Every balance number has a name and a home.** A number that sets how strong, fast, rare or
   costly something is lives in `src/balance/`, never inline in a formula. Layout, art and
   animation timing are not balance. (Monsters, bosses and their shot patterns are content as
   much as numbers and stay as data in `src/game/dungeon/content.ts`.)
2. **Every number says what it does**: one `/** */` line, what it controls, which way is harder,
   and its goal when it has one.
3. **Every feature names its goal** as something measurable ("a rare takes about two weeks of
   training to wear") and adds a line for it to the balance sheet.
4. **Measure before and after.** `pnpm balance` for the sheet, and `pnpm sim` then
   `pnpm fog:sim` for anything in a run. The sheet's diff goes in the pull request.
5. **Write it down.** A change to a balance number adds a row to the changelog below, and its
   commit message starts with `Balance:`.
6. **Rules stay pure and seeded** (see [`AGENTS.md`](../../../AGENTS.md)): that is what lets the
   simulators play the same game the phone does.

## Where the numbers are (`src/balance/`)

Plain data, no imports, no logic; code reads it from `@/balance`. The rules that use the numbers
stay in `src/lib/` and `src/game/` (older names such as `XP_FULL_SESSION` or `EMBERS` are kept
there as aliases, so callers didn't change).

| File | Holds | Used by |
|---|---|---|
| `src/balance/training.ts` | XP per workout, perfect week, comeback, XP per level, streak bonus, `WEEKLY_GOAL`, how often goals rise | `src/lib/game.ts` |
| `src/balance/stats.ts` | stat points per workout, starting points, what a point is worth, base stats, falloff, armor from Health, class lean | `src/lib/stats.ts` |
| `src/balance/economy.ts` | embers per workout, forge prices, melt values, vault size, how long the flame guards | `src/lib/forge.ts`, `src/lib/fog-gear.ts` |
| `src/balance/index.ts` | exports them all | |

The move is staged so it doesn't collide with work in flight. **Not moved yet** (find them here
until they are):

| Area | Where it lives now | Hidden in formulas |
|---|---|---|
| Items: base damage and HP per level, bonus sizes, item power | `ITEM_POWER`, `BONUSES`, `rollItem` in `src/game/dungeon/items.ts` | weapon and armor base per level, slot odds, the 75-100% roll |
| Rarity: odds, bonus count, power, how much it asks | `RARITY`, `RARITY_ODDS`, `rollRarity` in `items.ts` | how much depth and bosses lean rarer |
| Requirements | `rollItem`, `evenPoints` in `items.ts` | the even-build curve and the floor curve |
| Forge plus | `MAX_PLUS`, `PLUS_STEP` in `items.ts` | |
| Drops and bag | `DROPS`, `BAG` in `src/game/dungeon/engine.ts` | elite luck in `kill` |
| Classes | `CLASS_BODY`, `ABILITIES`, `DODGE` in `content.ts`; `ATTACK`, `HERO_HP`, `HERO_SPEED` in `src/game/rules.ts` | |
| Run skills and run levels | `UPGRADES`, `xpToNext` in `src/lib/fog.ts` | the run-level curve |
| Boss edge (boss weaker, free skills after a chapter's hearts are gone) | `EDGE` in `src/lib/fog.ts` | |
| The flame's helpers | `FLAME_AT` in `fog.ts`; `FLAME`, `FIREBALL`, `FAIRY` in `rules.ts` | |
| Dungeon dials and elites | `DIALS`, `ELITE`, `LAYOUT` in `content.ts` | |
| Zone toughness (monster HP and damage per zone) | each chapter's `fog` block in `src/story/chapters/`; `pnpm fog:tune` prints new values | |
| Co-op | `src/game/dungeon/engine.ts` (XP to every standing hero, drops each their own) | no scaling yet: a party meets one hero's monsters |

## The balance sheet

`src/balance/sheet.md` shows what the numbers add up to, played through the real rules (the
season simulator's players, `statPower`, the forge's prices): the goals and whether each is on
target, level, points, embers and vault over six months for three kinds of player, what points in
a stat give, and the forge's costs in weeks of training. `src/balance/sheet.test.ts` writes it.

- `pnpm balance` rewrites the sheet. Commit it with the change.
- `pnpm test` fails while the sheet is out of date, so a pull request that changes a number shows
  the sheet's before and after in its diff.
- A new feature with a goal adds its section or goal row in `sheet.test.ts`.

The Fog's win rates are measured by `pnpm fog:sim` and tuned by `pnpm fog:tune`
([../dev/testing.md](../dev/testing.md)); they are not on the sheet yet (a run takes seconds,
not milliseconds).

## How to change things

| I want to... | Edit, then |
|---|---|
| Change XP, levels, the streak | `src/balance/training.ts`, then `pnpm balance` |
| Change stat points or what a point is worth | `src/balance/stats.ts`, then `pnpm balance`, `pnpm sim`, `pnpm fog:sim` |
| Change embers, forge prices, melt values, the vault | `src/balance/economy.ts`, then `pnpm balance` |
| Add a feature with numbers | a file (or entry) in `src/balance/`, export it from `index.ts`, a goal row in `sheet.test.ts` |
| Change something not moved yet | where the table above says, and move it into `src/balance/` if you're there anyway |
| See what changed and why | the changelog below, then `git log -- src/balance` |

## Changelog

Newest first. One row per balance change: what, why, and what the sheet (or `fog:sim`) said
before and after.

| Date | Change | Why | Before → after | PR |
|---|---|---|---|---|
| 2026-10-27 | Training, stat points and economy numbers moved into `src/balance/`; balance sheet added | Make every number findable and every change visible | No change in play: replays and the sheet's numbers are the same | this branch |
