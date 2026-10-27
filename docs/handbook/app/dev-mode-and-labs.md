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

It adds: "Skip the intro" on the title screen; "Play here without installing" on the install screen (see [pwa.md](pwa.md#install-before-playing)); a wrench in the header with fake workouts, class
and stat-point buttons (spread them evenly, take all back), any story scene on demand, the app opening again, Fog boss clears, a save wipe; and in a Fog
run's pause menu "Skip to the boss", "Next floor", "To the mid-boss", "The stairs card" (the stairs choice, here and now), "Win this run", the bot, and a Theme button that cycles zone colors.
Held sideways the panel is a wider sheet with its sections in two columns.
Helpers are pure functions on `GameState` and tested in `src/lib/dev.test.ts`.

## Labs (`src/app/lab/`)

| Page | What |
|---|---|
| `/lab` | Sprite Lab: every sprite and animation, with class, gear tier, variant and look controls; every Fog item kind at every rarity (two seeds), the hero of each class in a whole set of items of each rarity, and "The hand-drawn body": the old block body beside the hero's hand-drawn one, standing and walking. Check art changes here on a phone |
| `/lab/story` | Story Lab: play any scene with any flame name and letter (your hero is your own: the class and gear from this phone's save, read only), every place (held sideways, drawn wide as in a scene), every look of the flame. `?play=<scene id>&back` plays one scene and returns |
| `/lab/music` | Music Lab: every theme and sting |
| `/lab/worlds` | The Play tab's world picker (`WorldPicker`) on made-up saves: a fresh hero, mid-way (one boss down, two worlds open), waiting on training (the next world opens with a later chapter), all open. Play only shows what it would start; nothing is saved. Linked from the Sprite Lab header |
| `/lab/night` | One tap to try each recent change ("Install the app" opens each install guide with `?gate=<platform>`, and the installed iPhone app's first screen): writes a sandbox save for that moment (see [../architecture/game-state.md](../architecture/game-state.md)) and opens the app with `?sandbox` and `?tab=`, `?run=<zone>&at=mid\|boss\|win`, `?workout` or `?book`. "Exercise library" opens the Train tab to try the library; "The Fog, sideways" starts a zone 1 run; "A party run (practice)" starts one with two bot friends (`&party`); the "Loot" jumps open a geared save (`geared`: a sword the flame guards and a charm on) on the Play tab or in a zone 2 run, and in a run with the flame gone cold (`geared(4)`, no workout in 4 days); "Mira's forge, +1 to +15" opens `forged(plus)` (the sword at +3 to +15, the vault at +4, +10 and +13, co-op materials and embers to spend) on the Play tab or in a run; "A boss with no hearts left" opens a save 15 workouts in with Tomorrow still standing (Play tab, or a run at the boss), "A boss with hearts left" one 8 workouts in; "After the finale" opens a save past the finale (`fused`), with the hero on fire on the Hero tab or in a Summit run |

When you build something Edoardo should try, add a jump to `/lab/night` and send the Vercel
preview link (not a standalone mockup).
