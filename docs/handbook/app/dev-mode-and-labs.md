---
type: reference
title: Developer mode and the labs
description: Developer mode (src/lib/dev.ts, DevPanel) and the lab pages — /lab sprites, /lab/story scenes, /lab/music tracks, /lab/night sandbox jumps — for trying changes without training for real.
tags: [app, dev-mode, lab, testing]
timestamp: 2026-10-27
---

# Developer mode and the labs

## Developer mode

`src/lib/dev.ts` (`useDevMode` and the helpers) and `src/components/DevPanel.tsx`. It is on in
every preview and on localhost. On the live app it is also on while there are no other players
(Edoardo's call, 2026-10-27); it can be turned off from the panel, and seven taps on the FORMA
name turn it back on.

It adds: "Skip the intro" on the title screen; a wrench in the header with fake workouts, class
and skill-tree switches, any story scene on demand, Fog boss clears, a save wipe; and in a Fog
run's pause menu "Skip to the boss", "Win this run" and a Theme button that cycles zone colors.
Helpers are pure functions on `GameState` and tested in `src/lib/dev.test.ts`.

## Labs (`src/app/lab/`)

| Page | What |
|---|---|
| `/lab` | Sprite Lab: every sprite and animation, with class, gear tier, variant and look controls. Check art changes here on a phone |
| `/lab/story` | Story Lab: play any scene with any flame name and letter, every place, every look of the flame. `?play=<scene id>&back` plays one scene and returns |
| `/lab/music` | Music Lab: every theme and sting |
| `/lab/night` | One tap to try each recent change: writes a sandbox save for that moment (see [../architecture/game-state.md](../architecture/game-state.md)) and opens the app with `?sandbox` and `?tab=`, `?run=<zone>&at=mid\|boss\|win`, `?workout` or `?book`. "Exercise library" opens the Skills tab to try the library |

When you build something Edoardo should try, add a jump to `/lab/night` and send the Vercel
preview link (not a standalone mockup).
