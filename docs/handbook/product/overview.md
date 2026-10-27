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
to the home screen, works offline at the gym. Progress lives on the phone (Hero tab, Backup to save it). Signing in to keep a cloud copy is
optional and shows only once FORMA's own server is set up.

## The rule the game is built on

**Training earns, play spends.** A workout always "wins": it gives XP, raises the next targets,
moves the story on and makes the hero really stronger. The Fog (the Play tab) is a short action
game where you can lose, played with the phone held sideways, exploring a dungeon floor by floor; what you bring into it is what your
training gave you. Gear comes from the dungeon and needs stat points to wear; dying in a run loses what you wore and carried, never points, level or story, and a vault at home keeps items safe. Between runs you walk the camp: the vault, your flame's fire (it holds one item through a fall if you trained lately), and Mira's forge, where embers from workouts upgrade and reroll what you found.

## The four tabs

| Tab | What it is | Code |
|---|---|---|
| Today | The flame and its line for the day, today's quest (the plan's Day A or B: warm-up, main lifts, core, stretch), the rest card on rest days, the Book of Days | `src/components/TodayTab.tsx` |
| Train | The exercise library (887 exercises, pixel demos, tips and mistakes), gym or home, the plan | `src/components/TrainTab.tsx` |
| Play | The Fog: your power from training, the zones, a run | `src/components/PlayTab.tsx`, `FogRun.tsx` |
| Hero | Gear, class, look, the champion's stat points, keepsakes, backup | `src/components/HeroTab.tsx` |

Over the tabs: the opening (first run only), the workout logger, the after-session fight and
loot, story scenes, the class picker. See [../app/screens.md](../app/screens.md).

## The story

Six chapters, about one a month, each with a moral and a Fog zone with its boss. The enemy is
the Hollow, the player's inner critic in their own words. The flame (Ember by default, named by
the player) grows from a spark to a fire fairy as they keep showing up. Sessions move the story,
never strength. See [../game/story.md](../game/story.md).

## Direction

As of 2026-10-27 FORMA is moving from calisthenics-only to general workouts (gym, weights,
cardio). The exercise library is the first step: every exercise has a boy and girl pixel demo,
tips and common mistakes, and it is a searchable database a future coach (an LLM) can build
workouts from ([../game/exercise-library.md](../game/exercise-library.md)). A training coach (adaptive
rest, faster progression when easy) is parked on branch `training-coach`. Wearables (Whoop,
Apple Health) are planned, not built.
