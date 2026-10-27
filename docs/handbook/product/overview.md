---
type: conceptual
title: Product overview
description: FORMA is a training app played like a pixel RPG — training earns, the Fog game spends — installable, offline, one save per phone.
tags: [product, overview]
timestamp: 2026-10-27
---

# Product overview

FORMA ("form" in Italian) is a training app played like a pixel-art RPG. It is built for one
player first (Edoardo, coming back to calisthenics after two years off) and is meant to be
super clear, super intuitive and gamified. Live at https://forma-nu-red.vercel.app, installable
to the home screen, works offline at the gym. There is no server and no account: progress lives
on the phone (Hero tab, Backup to save it).

## The rule the game is built on

**Training earns, play spends.** A workout always "wins": it gives XP, raises the next targets,
moves the story on and makes the hero really stronger. The Fog (the Play tab) is a short action
game where you can lose; what you bring into it is what your training gave you. Losing a run
costs nothing.

## The four tabs

| Tab | What it is | Code |
|---|---|---|
| Today | The flame and its line for the day, today's quest (Day A Push + Core, Day B Pull + Core), the rest card on rest days, the Book of Days | `src/components/TodayTab.tsx` |
| Skills | The three skill paths (Push, Pull, Core) and where you are on each | `src/components/SkillsTab.tsx` |
| Play | The Fog: your power from training, the zones, a run | `src/components/PlayTab.tsx`, `FogRun.tsx` |
| Hero | Level, gear, class, look, keepsakes, max test, backup | `src/components/HeroTab.tsx` |

Over the tabs: the opening (first run only), the workout logger, the after-session fight and
loot, story scenes, the class picker. See [../app/screens.md](../app/screens.md).

## The story

Six chapters, about one a month, each with a moral and a Fog zone with its boss. The enemy is
the Hollow, the player's inner critic in their own words. The flame (Ember by default, named by
the player) grows from a spark to a fire fairy as they keep showing up. Sessions move the story,
never strength. See [../game/story.md](../game/story.md).

## Direction

As of 2026-10-27 FORMA is moving from calisthenics-only to general workouts (gym, weights,
cardio), with an exercise library and pixel demos for each exercise. A training coach (adaptive
rest, faster progression when easy) is parked on branch `training-coach`. Wearables (Whoop,
Apple Health) are planned, not built.
