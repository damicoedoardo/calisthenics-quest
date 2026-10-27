---
type: reference
title: Screens
description: How src/app/page.tsx picks what is on screen (opening, tabs, workout, after-session, scenes, class picker, Fog run) and what every component in src/components does.
tags: [app, components, ui]
timestamp: 2026-10-27
---

# Screens

The whole app is one page, `src/app/page.tsx`. It holds the save (`useGameState`) and a few
pieces of screen state, and decides what is on screen:

1. **Not onboarded** (or replaying the opening): `Prologue` takes the whole screen.
2. **Otherwise** the header, the current tab and the bottom tab bar, with full-screen layers on
   top when one is open: `Workout` (training), `AfterSession` (right after finishing),
   `ScenePlayer` (a due story scene), `ClassPicker`, `FogRun`, and the `DevPanel`.
3. While a layer is open the tabs underneath are made `inert` (no focus, hidden from screen
   readers). Overlays opened from inside a tab use `useModal` for the same thing.
4. Back on the tabs, the next due scene from `scenesToPlay` (`src/story/engine.ts`) plays.

## Components (`src/components/`)

| Component | Job |
|---|---|
| `Prologue` | First run: boy or girl pick, the story opens, the first fight (`FirstFight`) you can't win, `RiseUp` (hold to stand), the letter, gym or home, then the `LookEditor` |
| `TodayTab` | The flame card and its line, today's quest list with exercise stills, the rest-day card and `SitByFire`, the quote of the day, the Book of Days, the install nudge |
| `Workout` | The set logger: one exercise at a time, one tap per set (reps in reserve), rest timer, Undo, the exercise demo; the warm-up and the stretch are one "Done" tap |
| `AfterSession` | After a workout: a short battle against the chapter enemy, then the loot (XP, stat points, better than last time, level, gear, the flame's word) |
| `TrainTab` | The "Exercise library" button, gym or home, the plan's two days with today's targets, the embers workouts earn |
| `ExerciseLibrary` | The whole exercise library over the Train tab: search, equipment, kind and movement filters, list rows with a demo still; an exercise shows the boy and girl demo, steps, tips and common mistakes. Loaded on demand. See [../game/exercise-library.md](../game/exercise-library.md) |
| `Camp` | The camp between runs, held sideways: the Phaser camp scene and its panels (vault, Mira's forge, the fire, a gate), see [../game/camp.md](../game/camp.md) |
| `PlayTab` | Power from training, "To the camp", what you take into the Fog (`FogGearCard`: worn gear and the vault), the zones, warms up the Fog's code and sprite sheets while idle |
| `FogRun` | A run, held sideways: loads the Phaser scene on demand, the HUD, the depth ladder and the floor's minimap (`FloorMap`, tap for it big), the bag (`BagPanel`), the pickup note, the stairs card (deeper or leave), pause menu, skill picks, the recap with what came home or was lost (`GearRecap`), the "turn your phone" card |
| `ItemCard` | An item's tile and card (name in its rarity's color, what it gives, what it needs), shared by the run's bag and the Play tab |
| `HeroTab` | Gear, class, look editor, the champion's stat points (`StatPoints`: spend, take back), keepsakes, quest log, Backup and Restore, cloud backup sign-in (`CloudSave`) |
| `ScenePlayer`, `Dialogue` | Play a story scene: lines, camera shots, the question, the answer lines |
| `ClassPicker` | Four weapons in the ash: pick the class |
| `BookOfDays` | Every day the app was opened, newest first |
| `Hero`, `Characters`, `Sprite` | Draw sprites; `Hero` only decides when to attack, `Sprite` renders any sprite id |
| `Look`, `LookEditor` | The player's look, shared through `LookProvider`, and its editor |
| `Place`, `Weather` | A story place's backdrop; rain, ash, snow, embers, fog over the screen |
| `Sound` | `useMusic` (a track while a screen is on), the mute toggle |
| `DevPanel` | Developer mode's wrench and panel, see [dev-mode-and-labs.md](dev-mode-and-labs.md) |
| `ServiceWorker` | Registers the offline worker, see [pwa.md](pwa.md) |
| `useModal` | Focus trap and inert background for overlays inside a tab |

## Rules for components

- No rules and no art in components: call `src/lib/` and `src/story/`, draw with `<Sprite>`.
- Every change to the save goes through `update(fn)`.
- Icons are `lucide-react` or the pixel icons in `src/sprites/characters/icons.ts`.
- Colors and fonts come from `tailwind.config.ts` (`ink`, `gold`, Geist, Press Start 2P for pixel text).
- Respect `prefers-reduced-motion` (see `src/game/calm.ts` for the Fog).
