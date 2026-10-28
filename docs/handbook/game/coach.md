---
type: reference
title: The coach (workout planner)
description: The coach in src/lib/coach — setup questions, the three-layer memory (profile, training log, notes), the built-in coach that builds workouts from the library for gym, calisthenics, running or a mix, easier and swap choices, the guardrails every workout passes, the coach brief an LLM will read, and the screens that play it.
tags: [game, training, coach, planner, memory, llm]
timestamp: 2026-10-28
---

# The coach

The coach builds your next workout. Version 0.1 is all code (the **built-in coach**); an LLM
planner on the server comes next and plugs into the same pieces: it reads the coach brief, picks
exercises from the library, and its workout passes the same checks. The rule for both: **the coach
chooses, the code keeps the facts and the numbers.** XP, stat points and story never depend on
what the coach planned.

Code: `src/lib/coach/` (pure, tested in `coach.test.ts`). Numbers: `src/balance/coach.ts`.
Screens: `CoachSetup`, `CoachPanel`, the workout's overview and choices in `Workout.tsx`,
`useCoach.ts` (keeps a workout ready).

## Memory: three layers

All of it lives in the save (`state.coach`, optional: saves without it play the built-in plan).

| Layer | Where | Who writes it |
|---|---|---|
| **Profile**: modes, goal, days, minutes, gear, experience, a level 1-5 per pattern (push, pull, squat, hinge, core, run), what to spare, and `history` of every change | `coach.profile` (`CoachProfile` in `types.ts`) | setup; levels move with your workouts (`levels.ts`); later the LLM may *propose* a change to a named field |
| **Training log**: sessions with sets (reps or seconds, reps in the tank, optional kg and km), each entry's name and family, the mode, who planned it, what you skipped or changed, how it felt | `state.sessions` | only the app |
| **Notes**: short typed sentences (`like`, `dislike`, `pain`, `life`, `goal`, `other`), dated, optionally until a date, at most `MAX_NOTES` (a pain note is never dropped for room) | `coach.notes` (`notes.ts`) | you at setup; later the LLM |

Plus `coach.plan`: the next workout (`CoachPlan`). Today's quest (`todaysQuest` in `game.ts`)
plays it when there is one, else the built-in plan. `finishSession` writes the plan's mode, changes
and skips on the session, clears the plan, and moves levels (`shiftLevels`).

**Levels**: setup sets them from tap answers ("I don't know" starts low, `setup.ts`); after
`LEVEL_SHIFT.window` workouts of a pattern since it last moved, most sets easy (4+ left) moves it
up one, most very hard (0-1) down one. A level from your workouts shows a ✓ on the Train tab.

**The coach brief** (`brief.ts`): one plain-text page built from the save on every call — profile,
notes with ids, the last 10 workouts in a line each, days since each pattern, this week's count.
This is what an LLM will read; it never reads or writes the save itself.

## Building a workout (`generate.ts`)

`buildWorkout({ all, coach, sessions, now, rng })`, seeded, same input same workout.

- **Mode**: the one asked for, else of your modes the one done longest ago (`nextMode`): a mix
  takes turns.
- **Gym and calisthenics**: warm-up, the day's movement families (`DAYS`, days A and B alternate
  per mode, `MAIN_MOVES[minutes]` of them), one core move, a stretch for what was trained most.
  Calisthenics uses body weight and bands only; no bar turns pull-ups into rows.
- **Picking an exercise**: from the library, in the family, with your gear (`usable`), at most the
  library level your pattern level reaches (`maxLevelFor`), not on a sore spot (`spares`) or a
  dislike note's words, and hard body-weight moves only from their level (`NEEDS_LEVEL`). Then it
  prefers the **staples** (`staples.ts`: the well-known moves of each family; the catalog is full
  of odd variations), what you did lately (so targets keep rising), compound moves, and weights in
  gym mode.
- **Dose**: weights by goal (`DOSE`), body weight by level (`BODY_REPS`, `FEW_REPS_RANGE` for
  pull-ups and dips), holds in seconds (`HOLD_SEC`).
- **Running**: easy, intervals, easy, long in turn; minutes and intervals by run level (`RUN`),
  run-walk below `RUN.walkBreakBelow`; a week's running grows at most `RUN.weeklyGrowth` over the
  last. A run is one item with `run` steps (walk, easy, steady, fast + seconds); the library has
  four run entries (`forma:easy-run`, `run-walk`, `interval-run`, `long-run`).

## Easier and swap (`options.ts`)

Every main and core item carries up to `CHOICES.easier` easier moves (the hand-made `LADDER` by
demo first, e.g. pull-up → negatives → band pull-up → table row, then the same family a level
down) and `CHOICES.swaps` swaps (same family and region, no harder, one per demo). Found by code,
so each is a real exercise with a demo and with your gear. `plan.ts` applies a change
(`changeItem`, `moveItem`, `skipItem`): logged sets move with a swapped exercise, the item keeps
`changed` (what it was), a swap keeps the old one as a choice. The built-in plan becomes a plan
too when a workout opens (`planFromQuest`), so it can be changed the same way.

## The guardrails (`validate.ts`)

Every workout, whoever built it: only library exercises (or the built-in warm-ups and stretches),
only your gear, nothing a sore spot spares, a warm-up first and a stretch last (added if missing),
at most `MAX_SETS_PER_FAMILY` sets of a family and `MAX_SETS` in all, and about your minutes (a
quarter over at most, trimmed a set at a time). It returns the fixed plan and the `problems`, which
an LLM gets back to do better.

## Screens

- **Setup** (`CoachSetup.tsx`): eight tap screens (modes, goal, days and minutes, gear,
  experience, where you start, what to spare, anything else). From the Train tab's "New: your
  coach" card, and "Redo setup" (keeps the log and notes).
- **Train tab** (`CoachPanel.tsx`): once set up, the next workout with its minutes, "Another one",
  "<mode> instead" for a mix, and "What your coach knows": profile, levels, notes (each can be
  forgotten). Before setup the built-in plan shows as before.
- **Workout** (`Workout.tsx`): an overview before the first set (move up and down, Easier, Swap,
  Skip; the list button brings it back), "Too hard? Easier" and "Swap" under the demo, and a run
  view: a bar of the steps, a big clock for the step you're on, a buzz at each change, distance at
  the end. The run's start is saved (`draft.runAt`), so the clock keeps going through a phone lock.
- **After a workout** (`AfterSession.tsx`): "How did it feel?" (easy, just right, hard) and a word
  for the coach, saved on the session.

## How to change things

| I want to... | Edit |
|---|---|
| Change sets, reps, run minutes, caps | `src/balance/coach.ts` |
| Change which families a day trains | `DAYS` in `src/lib/coach/generate.ts` |
| Prefer other exercises | `STAPLES` in `src/lib/coach/staples.ts` |
| Change an easier ladder | `LADDER` in `src/lib/coach/options.ts` |
| Change what a sore spot spares | `SPARE` in `src/lib/coach/options.ts` |
| Add a setup question | `SetupAnswers` and `profileFrom` (`setup.ts`), a step in `CoachSetup.tsx` |
| Add a guardrail | `validate.ts`, with a test |
