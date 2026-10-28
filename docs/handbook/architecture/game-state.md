---
type: reference
title: Game state (the save)
description: GameState in src/lib/game.ts is the one save; useGameState persists it to localStorage, migrate() upgrades old saves, Backup/Restore exports JSON, ?sandbox uses a separate key.
tags: [architecture, state, storage]
timestamp: 2026-10-28
---

# Game state (the save)

Everything the player has done is one object, `GameState` (`src/lib/game.ts`). Every rule reads
it, every screen gets it as a prop, and nothing else is saved anywhere.

| Field | What |
|---|---|
| `version` | 3. Older saves go through `migrate()`; version 3 dropped the calisthenics skill tree and max tests (a v2 save keeps its sessions, story, Fog and Book of Days) |
| `profile` | `onboarded`, the `letter` (why, want, forWho, remind), the Hollow's `voice`, `classId`, `look`, the flame's name, `kit` (gym or home), the hero's `name` (asked after the look; what friends see) |
| `reps` | Current per-set target by exercise id |
| `sessions` | Every finished workout: entries (with name and family), sets with reps in reserve (optional kg, km), XP breakdown, raises, `heavier`, `better`; from a coach workout also `mode`, `plannedBy`, `skipped`, `changed`, and `felt` and `comment` |
| `build` | Stat points spent on the champion, per stat (earned points are counted from `sessions`) |
| `devPoints` | Optional. Stat points given in developer mode's Hero tab, counted on top of the earned ones (`pointsEarned`) |
| `buildAt`, `sweat` | Optional. Points as they stood at the last workout (what the free take-back is measured from), and sweat coins spent plus class changes made (`src/lib/sweat.ts`, see [../game/training.md](../game/training.md)) |
| `sp` | Optional. The SPs: the workout count when the Wanderer gave the first, whether its trial's floor was reached, the later ones the story gave (`more`), the one picked to wear (`worn`), and `off` when taken off (`src/lib/sp.ts`, see [../game/fog.md](../game/fog.md)) |
| `fogGear` | Optional. What you wear into the Fog and the vault at home (`src/lib/fog-gear.ts`, see [../game/fog.md](../game/fog.md)); embers found and spent, co-op materials for the forge (`mats`), the slot the flame holds (`guard`), `deaths`, and the starter kit's look (`kit`, set by `migrate()` from the old forge) ([../game/forge.md](../game/forge.md)) |
| `draft` | The workout in progress, or null (`runAt`: when the run on screen started). A draft left from an earlier day is closed onto that day (`closeStaleDraft`). `open` marks the workout screen as open (the app reopens on it) and `restUntil` is when the running rest ends (ms), both optional |
| `seenScenes`, `sceneMark` | Story scenes already played, and how many played at the last story moment |
| `answers` | What the player chose in the story (heart moments, villager stories, the Ember Road's three questions `road1`-`road3`) |
| `road` | Optional. The Ember Road, the story walked with friends: `from` (workouts done when you set out) and `beaten` (its bosses your party beat) (`src/lib/road.ts`, see [../game/story.md](../game/story.md)) |
| `fog` | Zones cleared, runs, best records per zone, the last run |
| `days` | The Book of Days: one page per day the app was opened (`dayNumber` in `src/lib/days.ts` counts them, today included) |
| `coach` | Optional. The coach's memory: `profile` (setup answers, levels, history), `notes`, `plan` (the next workout it built), `chat` (the recent chat, as the LLM reads it) and `replies` (taps it offered) ([../game/coach.md](../game/coach.md)) |

## Saving

`useGameState()` (`src/lib/store.ts`) loads on the client (`ready` is false during the server
render), and `update(fn)` applies a pure function to the state and writes it to `localStorage`
under `forma-state-v1`. Corrupt or blocked storage falls back to a fresh state instead of
crashing. It asks the browser to persist storage; the Today tab nudges iPhone users to install,
because iOS can clear data of sites not on the home screen.

When the player is signed in, a copy also goes to the server a few seconds after each change
([../backend/cloud-sync.md](../backend/cloud-sync.md)). The phone's save stays the real one.

## Changing the shape

Add new fields as optional (`fog?`, `answers?`, `days?` are examples), or bump `version` and
teach `migrate()` (`src/lib/game.ts`) to upgrade old saves. A save from the live app must always
load. `parseImport` (You page Restore) accepts versions 1 to 3 and runs `migrate` too.

## Sandbox

`?sandbox` in the URL switches the key to `forma-sandbox-v1` (`SANDBOX_KEY`), so the real save is
never touched. `/lab/night` writes a sandbox save for a given moment and opens the app on it. See
[../app/dev-mode-and-labs.md](../app/dev-mode-and-labs.md).
