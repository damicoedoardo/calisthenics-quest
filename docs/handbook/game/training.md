---
type: reference
title: Training rules
description: The real-world side of FORMA in src/lib — skill paths and nodes, today's quest, logging sets, progression and unlocks, XP and levels, streaks, max tests, classes and gear.
tags: [game, training, rules, xp]
timestamp: 2026-10-27
---

# Training rules

All of it is pure functions in `src/lib/game.ts`, with the skill paths in `src/lib/skills.ts` and
classes and gear in `src/lib/gear.ts`. Tested in `src/lib/game.test.ts`. The player-facing
summary is in the root `README.md` ("How the game works"); keep the two in step.

## Skill paths (`skills.ts`)

Three paths, `PATHS`: **Push** (incline push-up up to archer push-up), **Pull** (dead hang up to
L-sit pull-up), **Core** (knee raise up to toes-to-bar). Each `SkillNode` has a form cue, a unit
(reps or seconds), sets, a starting target and the target that beats it. `state.progress[path]`
is the node being trained. `placement()` picks starting nodes from a self-estimate, one step low
on purpose.

## Today's quest

- `dayType`: sessions alternate Day A (Push leads) and Day B (Pull leads); Core is in both.
- `todaysQuest`: the lead path's current node, core's current node, and one support exercise
  (the node below the current one on the other path, never unlockable). A path that is fully
  beaten hands the lead over.
- The check-in: **Rough** is one exercise, at most 3 sets, and counts as a minimum session;
  Normal and Strong are the full quest.

## Logging and progression

- A set is logged as reps plus reps left in the tank (`Rir`: `4+`, `2-3`, `0-1`), then a
  `REST_SECONDS` (90 s) rest timer.
- `finishSession` turns the draft into a `Session`: full if at least half the sets were done and
  the day wasn't Rough, otherwise mini. Sets done at target with reps to spare raise that
  exercise's target by one rep (or 2 seconds), at most `MAX_RAISES_PER_WEEK` times a week.
- Meeting a node's unlock target beats it: the path moves to the next node and the gear tier rises.

## XP and levels

Constants at the top of `game.ts`: full session 100, minimum 30, skill beaten 250, perfect week
(3 sessions, `WEEKLY_GOAL`) 100, welcome back after 14+ days 50, max test 200 (once per 21 days).
Weekly streak +10% per perfect week in a row (max +50%), class +10%. A level is 500 XP.

## Classes and gear (`gear.ts`)

Warrior (Push, sword), Archer (Pull, bow), Monk (Core, staff), Mage (whichever path is behind,
wand). Gear has a weapon, armor and shield slot; each beaten skill is one tier (0 to 6), and the
class's path forges the weapon. The art for each tier is in [sprites.md](sprites.md).

## Max tests

`logMaxTest`: push-ups, pull-ups, L-sit seconds. Chapters 2 and 5 of the story need one; see
[story.md](story.md).

## Coming next

FORMA is moving to general workouts (gym, weights, cardio) with an exercise library. When that
lands, this page and `skills.ts` change together. The exercise demos are in
`src/sprites/characters/exercise.ts`, and a test checks every program exercise has one.
