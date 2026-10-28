---
type: reference
title: Training rules
description: The real-world side of FORMA in src/lib — the built-in plan (gym or home), today's quest, logging sets, progression, "better than last time", XP and levels, stat points for the champion, classes and gear.
tags: [game, training, rules, xp, stats]
timestamp: 2026-10-28
---

# Training rules

FORMA trains any kind of workout, not only calisthenics. All of it is pure functions: the plan in
`src/lib/program.ts`, quests, logging and XP in `src/lib/game.ts`, stat points in
`src/lib/stats.ts`, classes and gear in `src/lib/gear.ts`. Tested in `src/lib/game.test.ts` and
`src/lib/stats.test.ts`. The player-facing summary is in the root `README.md` ("How the game
works"); keep the two in step.

## The built-in plan (`program.ts`)

`PLAN[kit][day]`: two full-body days, A and B, that alternate (`dayType`), for a **gym** or for
**home** (no kit). The player picks the kit in the opening and can change it on the Train tab
(`profile.kit`, missing means gym). Every day is a list of `Slot`s, each a library exercise by its
demo id (so it has a pixel demo and coaching), with a role:

- `warmup` and `stretch`: one tap ("Done"), no reps logged, no rest timer. Every day opens with
  the warm-up and ends with the stretch.
- `main` and `core`: sets logged with reps left in the tank.

A slot has a target range (`low`..`high`); `weighted` slots are done with a weight the player
picks. `cueOf(id)` is the exercise's first coaching tip.

Once the coach is set up it plans every workout instead, a week at a time (`state.coach.week`, see
[coach.md](coach.md)); the built-in plan is what plays before setup.

## Today's quest

- `todaysQuest`: the coach's next workout when there is one (the week's first day not done,
  `currentPlan`, skipped items
  left out), else the built-in day's slots; with their current targets (`state.reps[id]`, else
  `low`). A run's length is the coach's, not a target that rises.
- The check-in: **Rough** keeps the warm-up and the stretch around one exercise of at most 3 sets,
  and counts as a minimum session; Normal and Strong are the full day.
- The warm-up alone is not a workout: `finishSession` needs one logged set of real work.
- No pausing: leaving a workout after a set throws it away (`draft: null`), after a warning. The
  rest after a set is the coach's `rest` for that exercise, else 60 s for core, else `REST_SECONDS`.

## Logging and progression

- A set is logged as reps plus reps left in the tank (`Rir`: `4+`, `2-3`, `0-1`), then a
  `REST_SECONDS` (90 s) rest timer.
- `finishSession` turns the draft into a `Session`: full if at least half the sets were done and
  the day wasn't Rough, otherwise mini. Entries keep the exercise's name and family; a coach
  workout also writes its mode, who planned it, what was skipped or changed, then clears the plan
  and moves levels ([coach.md](coach.md)). How it felt is added after, from the after-workout card.
- Every set at target with reps to spare raises that exercise's target by one rep (holds by 5
  seconds, every other time), at most `MAX_RAISES_PER_WEEK` times a week, up to `high`. A
  `weighted` exercise done cleanly at `high` goes back to `low` and is listed in
  `session.heavier`: "add a little weight next time".
- `session.better`: some set beat the best set of the same exercise last time. It earns a stat
  point and drives a few story scenes (`when.better`).

## XP and levels

The numbers are in `src/balance/training.ts` (see [balance.md](balance.md)); `game.ts` keeps the
old names (`XP_FULL_SESSION`, ...). Today: full session 100, minimum 30, perfect week (3 sessions,
`WEEKLY_GOAL`) 100, welcome back after 14+ days 50. Weekly streak +10% per perfect week in a row
(max +50%). A level is 500 XP.

## Stat points (`stats.ts`)

Training earns points; the champion spends them in the Fog. Every workout earns them whatever it
was, so the reward never depends on the plan: `POINTS` per full workout, short workout, week at
the goal, and "better than last time", plus `STARTING_POINTS`. `pointsEarned` derives them from
the sessions; only what was spent is saved (`state.build`). The numbers (points, worth, base,
falloff, armor, class lean) are in `src/balance/stats.ts`.

- Six stats (`STATS`): **Health** (HP), **Armor** (a share of every hit blocked, up to
  `MAX_ARMOR`), **Damage**, **Haste** (attack speed; its id is `speed`), **Speed** (walk speed;
  its id is `move`) and **Crit** (the chance a hit does `CRIT_HIT` times its damage). Reach is gone
  (loot comes to you): `migrate` hands its points back and turns items that asked for it into
  items that ask for Crit (`noReach` in `game.ts`). On the Hero tab the plus spends a point and the
  minus takes back one spent since your last workout, free (`putPoint`, `takeBack` in
  `src/lib/sweat.ts`, which note your points as they stood, `buildAt`). Moving older points is a
  start-over (`respec`) for a sweat coin.
- **Sweat coins** (`src/lib/sweat.ts`, numbers `SWEAT` in `src/balance/economy.ts`): every workout
  earns one (`coins` counts them from the sessions; only `sweat.spent` is saved). Starting your
  points over costs `SWEAT.respec`, changing class `SWEAT.classChange` (`changeClass`,
  `classCost`); the pick in the opening and the first change after it are free.
- Each point in the same stat is worth a little less (`statValue`, `FALLOFF`), so spreading pays.
- `BASE` is what every champion has before any point. What a point is worth is set so points are
  about 40% of a player's power growth (`POWER_SPLIT`, see [balance.md](balance.md)); check with
  `pnpm balance` and the Fog simulator ([../dev/testing.md](../dev/testing.md)) after changing it.
- `statPower(build, classId)` is what the Fog reads (through `powerOf`, see [fog.md](fog.md)).

## Classes and gear (`gear.ts`)

Warrior (sword), Archer (bow), Monk (staff), Mage (wand). A class only changes how you fight in
the Fog: its attack style there, and a small lean to two stats (`CLASS_LEAN` and `SECOND_LEAN` in
`src/balance/classes.ts`, as if it had `CLASS_LEAN_POINTS` and `SECOND_LEAN_POINTS` more there:
warrior Damage and Armor, archer Crit and Speed, monk Health and Armor, mage Haste and Damage). Each has its own ability in a
run; the monk's Stillness fills by fighting, not by time (`CALM` in `src/balance/classes.ts`). Gear has a weapon, armor and shield slot. Mira's forge used to raise one slot a tier
every `GEAR_EVERY` workouts (`tiersAt`, `nextForge`); it doesn't any more. `migrate()` froze what
it had made as the hero's look (`fogGear.kit`), and `gearOf` shows the finer of that and the
item you wear from the Fog. A worn item's slot also carries that item's name and look (`Gear.item`:
kind, rarity, seed, from `looksOf` in `src/game/dungeon/items.ts`), so the hero wears the very
item everywhere the hero is drawn (Hero tab, the Fog tab's ready strip, the header, the Fog run's sheets); without
one, the slot shows the tier look. Workouts now earn embers for Mira's forge on the Hero tab (Gear)
([forge.md](forge.md)). The art for each tier is in [sprites.md](sprites.md).

## How to change things

| I want to... | Edit |
|---|---|
| Change the exercises of a day, or add a kit | `PLAN` in `src/lib/program.ts` (the exercise needs a demo: a test checks) |
| Change XP, levels or the streak bonus | `XP` in `src/balance/training.ts`, then `pnpm balance` |
| Change how fast targets go up | `finishSession` in `src/lib/game.ts`, `PROGRESSION` in `src/balance/training.ts` |
| Change how many points a workout gives | `POINTS`, `STARTING_POINTS` in `src/balance/stats.ts`, then `pnpm balance` |
| Change what a point is worth | `POINT_WORTH`, `STAT_BASE`, `FALLOFF` in `src/balance/stats.ts`, then `pnpm balance`, `pnpm sim` and `pnpm fog:sim` |
| Change embers per workout | `EMBERS` in `src/balance/economy.ts` ([forge.md](forge.md)) |
