---
type: reference
title: Game state (the save)
description: GameState in src/lib/game.ts is the one save; useGameState persists it to localStorage, migrate() upgrades old saves, Backup/Restore exports JSON, ?sandbox uses a separate key.
tags: [architecture, state, storage]
timestamp: 2026-10-27
---

# Game state (the save)

Everything the player has done is one object, `GameState` (`src/lib/game.ts`). Every rule reads
it, every screen gets it as a prop, and nothing else is saved anywhere.

| Field | What |
|---|---|
| `version` | 2. Older saves go through `migrate()` |
| `profile` | `onboarded`, the `letter` (why, want, forWho, remind), the Hollow's `voice`, `classId`, `look`, the flame's name |
| `progress` | Index of the node trained on each path (`push`, `pull`, `core`); equal to the path's length when done |
| `reps` | Current per-set target by skill node id |
| `sessions` | Every finished workout: entries, sets with reps in reserve, XP breakdown, unlocks, raises |
| `tests` | Max tests (push-ups, pull-ups, L-sit seconds) |
| `draft` | The workout in progress, or null. A draft left from an earlier day is closed onto that day (`closeStaleDraft`) |
| `seenScenes`, `sceneMark` | Story scenes already played, and how many played at the last story moment |
| `answers` | What the player chose in the story (heart moments, villager stories) |
| `fog` | Zones cleared, runs, best records per zone, the last run |
| `days` | The Book of Days: one page per day the app was opened |

## Saving

`useGameState()` (`src/lib/store.ts`) loads on the client (`ready` is false during the server
render), and `update(fn)` applies a pure function to the state and writes it to `localStorage`
under `forma-state-v1`. Corrupt or blocked storage falls back to a fresh state instead of
crashing. It asks the browser to persist storage; the Today tab nudges iPhone users to install,
because iOS can clear data of sites not on the home screen.

## Changing the shape

Add new fields as optional (`fog?`, `answers?`, `days?` are examples), or bump `version` and
teach `migrate()` (`src/lib/game.ts`) to upgrade old saves. A save from the live app must always
load. `parseImport` (Hero tab Restore) accepts versions 1 and 2 and runs `migrate` too.

## Sandbox

`?sandbox` in the URL switches the key to `forma-sandbox-v1` (`SANDBOX_KEY`), so the real save is
never touched. `/lab/night` writes a sandbox save for a given moment and opens the app on it. See
[../app/dev-mode-and-labs.md](../app/dev-mode-and-labs.md).
