---
name: designing-for-balance
description: Use WHENEVER a change adds or changes a number that sets how strong, fast, rare, costly or rewarding something is in FORMA — a new item, stat, class, ability, monster, boss, drop, upgrade, reward, currency, co-op rule, or a tweak to any of them. Keeps every balance number in src/balance/, on the one power curve, measured by the balance sheet and logged in the changelog.
---

# Designing for balance

FORMA is tuned from one place. Every balance number lives in `src/balance/`, every source of
strength is measured on one scale (`powerScore`), and the game is held to one target curve
(`POWER_SPLIT`). This skill keeps it that way for everything new. The full rule and the
changelog are in `docs/handbook/game/balance.md`; read it first.

## When this applies

Any number that changes how strong, fast, rare, costly or rewarding something is: XP, stat
points, item stats, rarity, requirements, drops, forge steps and materials, monsters and bosses,
class bodies and abilities, run skills, co-op scaling, timers that change difficulty. Not: layout,
art, animation timing, sound, story words.

## Steps

1. **Put the number in `src/balance/`.** Use the area's file (`training`, `stats`, `economy`,
   `items`, `upgrades`, `dungeon`, `power`), or a new file exported from `src/balance/index.ts`.
   Plain data, no imports, no logic. Code reads it from `@/balance`; never write a balance number
   inline in a formula. Moving an old inline number you touch is part of the job.
2. **Write one line per number**: what it controls, which way is harder, and its goal ("Goal: a
   rare takes about 2 weeks of training to wear").
3. **Put it on the power scale.** If it makes a hero stronger (a stat, an item bonus, an upgrade,
   a class trait, something the hero wears or keeps), make `powerScore` in `src/game/power.ts`
   count it, or say in its comment why it can't (run-only things such as skills or abilities are
   measured by the Fog simulator instead).
4. **Keep the curve.** Run `pnpm balance`. The Goals table must stay on target, in particular the
   three "power growth" rows (`POWER_SPLIT`: 40% training, 40% gear, 20% upgrades). If your
   change pushes a share off target, rebalance with the levers (`POINT_WORTH` for training,
   `ITEM_POWER` for gear, `STEPS` for upgrades) and keep the "Power" column about where it was,
   so zones don't need retuning. Never just widen the slack.
5. **Add its goal to the sheet.** A new feature with a goal adds a row to the Goals table or a
   section in `src/balance/sheet.test.ts`, so the sheet measures it from now on.
6. **Check the fights** when the change touches a run: `pnpm sim`, then `pnpm fog:sim steady 24`
   before and after. If replays move (`pnpm test`), accept them with `pnpm test -u` only when the
   move is the one you meant.
7. **Log it.** Add a row at the top of the changelog in `docs/handbook/game/balance.md`: date,
   what changed, why, the sheet (and `fog:sim`) before → after, the PR. Start the commit message
   with `Balance:`.
8. **Commit the sheet** (`src/balance/sheet.md`). `pnpm test` fails while it is stale.
9. **Let the coach explain it.** If players meet the number (a cost, a reward, a requirement), check
   that a topic of the coach's game guide (`src/lib/coach/guide.ts`) reads it from `@/balance`
   and says it in plain words; a new mechanic gets a topic (with `opens` when it's a surprise). A
   new balance file needs a topic or a line in `BEHIND_THE_SCENES` (`guide.test.ts` checks).

## Coordinating

Several threads change balance at once. Before changing a lever (`POINT_WORTH`, `ITEM_POWER`,
`STEPS`, `DIALS`), pull `main`, run `pnpm balance`, and work from what the sheet says now, not
from a number you remember. Don't stack a multiplier on top of someone else's without
re-checking the split.
