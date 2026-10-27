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

Plain data, no imports, no logic (`items.ts` and `dungeon.ts` hold the Fog's numbers); code reads it from `@/balance`. The rules that use the numbers
stay in `src/lib/` and `src/game/` (older names such as `XP_FULL_SESSION`, `EMBERS`, `DIALS` or `BAG` are
kept there as aliases, so callers didn't change).

| File | Holds | Used by |
|---|---|---|
| `src/balance/training.ts` | XP per workout, perfect week, comeback, XP per level, streak bonus, `WEEKLY_GOAL`, how often goals rise | `src/lib/game.ts` |
| `src/balance/stats.ts` | stat points per workout, starting points, what a point is worth, base stats, falloff, armor from Health, class lean | `src/lib/stats.ts` |
| `src/balance/economy.ts` | embers per workout, forge prices, melt values, vault size, how long the flame guards | `src/lib/forge.ts`, `src/lib/fog-gear.ts` |
| `src/balance/items.ts` | item power, base damage/HP/armor per level, bonus sizes, rarity sizes and weights, how luck and depth lean rarer, requirements, the starter kit, drop chances and luck, the bag | `src/game/dungeon/items.ts`, `src/game/dungeon/engine.ts` |
| `src/balance/power.ts` | the target split of power growth (training / gear / upgrades) and its slack | the balance sheet |
| `src/balance/dungeon.ts` | `DIALS`, elites, run levels | `src/game/dungeon/content.ts`, `src/lib/fog.ts` |
| `src/balance/index.ts` | exports them all | |

The move is staged so it doesn't collide with work in flight. **Not moved yet** (find them here
until they are):

| Area | Where it lives now | Hidden in formulas |
|---|---|---|
| Classes | `CLASS_BODY`, `ABILITIES`, `DODGE` in `content.ts`; `ATTACK`, `HERO_HP`, `HERO_SPEED` in `src/game/rules.ts` | |
| Run skills | `UPGRADES` in `src/lib/fog.ts` (names); what each does, in `engine.ts` | each skill's size per level |
| Boss edge (boss weaker, free skills after a chapter's hearts are gone) | `EDGE` in `src/lib/fog.ts` | |
| The flame's helpers | `FLAME_AT` in `fog.ts`; `FLAME`, `FIREBALL`, `FAIRY` in `rules.ts` | |
| Floor layout, cleared-room speed | `LAYOUT`, `ROOM_ODDS`, `CLEAR_RUN` in `content.ts` | |
| Forge plus | `MAX_PLUS`, `PLUS_STEP` in `items.ts` (the +15 forge work is moving them) | |
| Item comparison weights (which item the bot and the bag call better) | `WORTH` in `items.ts` | |
| Zone toughness (monster HP and damage per zone) | each chapter's `fog` block in `src/story/chapters/`; `pnpm fog:tune` prints new values | |
| Co-op | `src/game/dungeon/engine.ts` (XP to every standing hero, drops each their own) | no scaling yet: a party meets one hero's monsters |

## Power: one scale for everything

Classes, gear, rarity and upgrades all add strength in different ways, so they are compared on
one number: `powerScore(cls, build, worn)` in `src/game/power.ts`. It uses the engine's own
formulas: damage a second against one foe times what you can take (HP over the share of damage
that gets through), square-rooted, with a warrior with no points in the starter kit at 100.
Doubling both halves doubles it. It leaves out what only happens inside a run (run skills,
chest items, the flame's fire, class abilities, the dodge, hitting many foes), so it compares
builds and gear; the Fog simulator's win rates compare whole classes.

The sheet's "Power by workouts" plays a model player (3 full workouts a week, points spread,
embers spent on upgrades, middle-roll rares from the deepest floor it can wear) and splits the
gain into training, gear and upgrades, then puts the four classes side by side. This is the
curve to tune against: decide how strong a player should be after N workouts and how much of it
comes from each source, then set the numbers to match, instead of tuning each one alone.

**The target** (`POWER_SPLIT` in `src/balance/power.ts`, Edoardo's pick): 40% of the growth from
training (stat points), 40% from gear, 20% from upgrades, each within `POWER_SPLIT_SLACK`. The
sheet's Goals table averages the split over each zone's opening and six workouts later and flags
it when it drifts. The levers: `POINT_WORTH` (training), `ITEM_POWER` (gear), `PLUS_STEP` and the
forge prices (upgrades). Move one, run `pnpm balance`, and keep total power about where it was
(the "Power" column) so the zones don't need retuning.

## The balance sheet

`src/balance/sheet.md` shows what the numbers add up to, played through the real rules (the
season simulator's players, `statPower`, the forge's prices): the goals and whether each is on
target, level, points, embers and vault over six months for three kinds of player, what points in
a stat give, the forge's costs in weeks of training, weapons by zone, floor and rarity with what
they ask and when an even build can wear them, drop chances and rarity by source and depth, and
run levels. `src/balance/sheet.test.ts` writes it.

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
| Change how strong, rare or demanding items are, or how often they drop | `src/balance/items.ts`, then `pnpm balance` and `pnpm fog:tune` |
| Change the dungeon's dials, elites, run levels | `src/balance/dungeon.ts`, then `pnpm sim` and `pnpm fog:sim` |
| Add a feature with numbers | a file (or entry) in `src/balance/`, export it from `index.ts`, a goal row in `sheet.test.ts` |
| Change something not moved yet | where the table above says, and move it into `src/balance/` if you're there anyway |
| See how strong a player is at N workouts, and from what | "Power by workouts" in `src/balance/sheet.md`; the formula in `src/game/power.ts` |
| See what changed and why | the changelog below, then `git log -- src/balance` |

## Changelog

Newest first. One row per balance change: what, why, and what the sheet (or `fog:sim`) said
before and after.

| Date | Change | Why | Before → after | PR |
|---|---|---|---|---|
| 2026-10-27 | Target split 40/40/20 set; `POINT_WORTH` x1.35, `ITEM_POWER` 2.2 → 1.76 | Training should earn more of a player's power (Edoardo's pick) | Split 28/48/24 → 39/41/20; power at 37 workouts 246 → 235, at 64 366 → 345; `fog:sim steady 24` zone win rates (open / later) 20/78, 26/51, 32/55, 50/51, 32/93, 32/85 → 20/81, 25/43, 21/70, 51/55, 40/98, 33/91 | #42 |
| 2026-10-27 | `powerScore` and "Power by workouts" on the sheet (no number changed) | One scale to compare training, gear, upgrades and classes | Training ~27%, gear ~45-60%, upgrades up to ~30% of the gain; warrior +27%, mage -21% before abilities | #42 |
| 2026-10-27 | Item, rarity, requirement, drop, bag, dungeon dial, elite and run-level numbers moved into `src/balance/`; weapons, drops and run levels added to the sheet | Every number findable; hidden numbers in `rollItem`, `rollRarity` and `kill` named | No change in play: replays identical | #39 |
| 2026-10-27 | Training, stat points and economy numbers moved into `src/balance/`; balance sheet added | Make every number findable and every change visible | No change in play: replays and the sheet's numbers are the same | #39 |
