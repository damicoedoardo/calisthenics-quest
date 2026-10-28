---
type: conceptual
title: Product overview
description: FORMA is a training app played like a pixel RPG — training earns, the Fog game spends — installable, offline, one save per phone.
tags: [product, overview]
timestamp: 2026-10-28
---

# Product overview

FORMA ("form" in Italian) is a training app played like a pixel-art RPG. It is built for one
player first (Edoardo, coming back to calisthenics after two years off) and is meant to be
super clear, super intuitive and gamified. Live at https://formaquest.app (also https://forma-nu-red.vercel.app), installable
to the home screen (on phones it must be installed after the opening before the game goes on), works offline at the gym. Progress lives on the phone (You page: tap your hero at the top, Backup to save it). After the opening it asks once for
an account (email), which keeps a cloud copy and is who you are to friends; the game still plays offline.

## The rule the game is built on

**Training earns, play spends.** A workout always "wins": it gives XP, raises the next targets,
moves the story on and makes the hero really stronger. The Fog (its own tab, Story alone or Together with friends) is a short action
game where you can lose, played with the phone held sideways, exploring a dungeon floor by floor; what you bring into it is what your
training gave you. Gear comes from the dungeon, each item with its own art (legendaries burn), shows on your hero as you wear it, and needs a hero level and stat points to wear (crit comes from weapons and item bonuses, not points); dying in a run loses what you wore and carried, never points, level or story, and a vault at home keeps items safe. Between runs, on the Play tab, your flame keeps one item through a fall if you trained lately, and Mira's forge spends embers from workouts to upgrade (+1 to +15, a new shine every few pluses, full at +15; from +6 it also needs materials that only drop when you play with friends, who can also give them to you) and reroll what you found.

## The four tabs

| Tab | What it is | Code |
|---|---|---|
| Today | The flame and its line for the day, today's quest (the plan's Day A or B: warm-up, main lifts, core, stretch), the rest card on rest days, the Book of Days | `src/components/TodayTab.tsx` |
| Train | The coach: your flame, which you chat with (it asks where you start, builds every workout and changes it when you say), today's workout as cards with demos, easier and swap; the exercise library (891 exercises, pixel demos, tips and mistakes); before setup, gym or home and the built-in plan | `src/components/TrainTab.tsx`, `CoachChat.tsx` |
| Play | The Fog: your power from training, the zones, a run | `src/components/PlayTab.tsx`, `FogRun.tsx` |
| Hero | Gear, class, look, the champion's stat points, keepsakes, friends (who is online, in the Fog, trained today), settings (sound, music in the menus), backup | `src/components/HeroTab.tsx` |

Every time the app opens, a three-second splash: the flame catches, FORMA lands one letter per note, and the day's number in the Book of Days (`Opening`; on an iPhone it starts with "Tap to start", since sound needs a tap). Over the tabs: the opening story (first run only), the workout logger, the after-session fight and
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
