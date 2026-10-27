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
   Otherwise, once per app open (`openingDue`, a `sessionStorage` flag; never in the sandbox),
   `Opening` plays over everything for about three seconds, and story scenes wait for it.
2. **Onboarded, on a phone, in a browser tab** (not installed): `InstallGate` takes the whole
   screen until FORMA is opened from the home screen, see [pwa.md](pwa.md#install-before-playing).
3. **Otherwise** the header, the current tab and the bottom tab bar, with full-screen layers on
   top when one is open: `Workout` (training), `AfterSession` (right after finishing),
   `ScenePlayer` (a due story scene), `ClassPicker`, `FogRun`, and the `DevPanel`.
4. While a layer is open the tabs underneath are made `inert` (no focus, hidden from screen
   readers). Overlays opened from inside a tab use `useModal` for the same thing.
5. On the tabs (nothing over them) the menus' music plays, unless turned off in Settings (see [../game/sound.md](../game/sound.md)).
6. Back on the tabs, the next due scene from `scenesToPlay` (`src/story/engine.ts`) plays.

## Held sideways: the tabs

The tabs work both ways up. Upright, everything is one `max-w-md` column with the bottom tab bar.
On a phone held sideways (the `land:` variant in `tailwind.config.ts`: landscape and at most
600px tall; tablets and desktops keep the upright layout) `page.tsx` turns the tab bar into a rail
down the left with the hero at its top, shrinks the header to one line (FORMA, level, XP bar),
and lets the column take the full width, clear of the notch (`env(safe-area-inset-left/right)`).
Each tab then splits into two columns of independent cards: Today (story and flame | check-in,
quest, Start), Train (library, kit, embers | the plan, placed by grid so the upright order stays),
Play (the Fog and the worlds | gear and power), Hero (hero and stat points | the rest); the look
editor puts its preview beside the choices. Upright must look exactly as before: add sideways
changes only as `land:` classes.

## Components (`src/components/`)

| Component | Job |
|---|---|
| `Opening` | The splash when the app opens: the small flame (always the spark) catches, FORMA lands one letter per note of the `opening` sting, "Day N · the fire's lit" (`dayNumber`). Sound starts by itself where the browser allows it; where it needs a tap first (iPhones, even installed), the flame waits on a blinking "Tap to start" and that tap plays the jingle with the letters. A tap while it plays skips. Muted means no sound at all; reduced motion shows it still |
| `Prologue` | First run: boy or girl pick (on iPhones with "Bring your hero" under it, `BringHero`), the story opens, the first fight (`FirstFight`) you can't win, `RiseUp` (hold to stand), the letter, gym or home, then the `LookEditor` |
| `InstallGate`, `BringHero` | After the prologue, the guide to put FORMA on the home screen; and on an installed iPhone app's first screen, pasting in the hero copied in Safari. See [pwa.md](pwa.md#install-before-playing) |
| `TodayTab` | The flame card and its line, today's quest list with exercise stills, the rest-day card and `SitByFire`, the quote of the day, the Book of Days, the install nudge |
| `Workout` | The set logger: one exercise at a time, one tap per set (reps in reserve), rest timer, Undo, the exercise demo; the warm-up and the stretch are one "Done" tap |
| `AfterSession` | After a workout: a short battle against the chapter enemy, then the loot (XP, stat points, better than last time, level, gear, the flame's word) |
| `TrainTab` | The "Exercise library" button, gym or home, the plan's two days with today's targets, the embers workouts earn |
| `ExerciseLibrary` | The whole exercise library over the Train tab: search, equipment, kind and movement filters, list rows with a demo still; an exercise shows the boy and girl demo, steps, tips and common mistakes. Loaded on demand. See [../game/exercise-library.md](../game/exercise-library.md) |
| `WorldPicker` | The road through the Fog as worlds you swipe: one big card in the middle (the chapter's place from `PlaceBackdrop`, its boss in front), neighbours peeking at the sides, arrows and dots; opens on the newest open world. Each card keeps what the old zone row showed (zone icon, name, best run, first-try tip, hint, Play or Again); a shut world is dark and fogged (`fogBank`), its boss a shadow, a big padlock (`worldLock`) and the reason it is shut; a cleared one has a check. Off-centre cards turn and shrink by scroll position and the picture drifts, all off under reduced motion. Props `{ state, onPlay }`; try it at `/lab/worlds` |
| `PlayTab` | Power from training, your gear for the Fog (`FogGearCard`: worn gear with the flame's mark, the vault, Mira's forge for the tapped item, see [../game/forge.md](../game/forge.md)), the zones, warms up the Fog's code and sprite sheets while idle |
| `FogRun` | A run, held sideways: loads the Phaser scene on demand, the HUD in the corners (`Vitals`: HP and level; the floor and its depth row, `DepthMap`; `BagButton` with a red count of what a fall would cost; pause; the floor's minimap, `FloorMap`, tap for it big), the bag (`BagPanel`) and the stairs card (deeper or leave), both showing what is at risk and the flame's kept item (`RiskLine`, `Guarded`), the pickup note, pause menu, skill picks (three cards side by side), the recap with what came home or was lost (`GearRecap`), the "turn your phone" card |
| `ItemCard` | An item's tile and card (name in its rarity's color, what it gives, what it needs), shared by the run's bag and the Play tab |
| `HeroTab` | Gear, class, look editor, the champion's stat points (`StatPoints`: spend, take back), keepsakes, quest log, Settings (sound, music in the menus), Backup and Restore, cloud backup sign-in (`CloudSave`), the Friends card (`FriendsCard`, [../backend/friends.md](../backend/friends.md)) |
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

## Held sideways: the overlays

Every full-screen overlay works with the phone held sideways too (a phone is about 844×390 CSS px
then). Portrait keeps its own classes; the sideways layout is added on top with the Tailwind
variant `[@media(orientation:landscape)_and_(max-height:600px)]:` (the same query as the tabs' `land:`, short and wide screens only, so
tablets and desktops keep the portrait layout). The usual trick: the portrait column's groups sit
in wrappers that are `contents` in portrait (no change to the layout) and become the two columns
sideways. `land-safe-x` (in its own block at the end of `src/app/globals.css`) keeps an overlay's
edges clear of the notch, which is on the left or the right then.

| Overlay | Sideways |
|---|---|
| `Workout` | The exercise (name, cue, demo) on the left, its sets, reps and the reps-in-reserve buttons on the right; the big demo stands beside its name and cue; the rest timer has the flame beside the clock |
| `AfterSession` | The battle as in portrait, a bit tighter; the loot card is wide, what you earned on the left, the level, gear, the flame's word and Continue on the right |
| `Dialogue` | Whoever is on screen on the left, the words beside them; narration with nothing to show stays centered |
| `ScenePlayer` | The question card puts the question beside its answers; naming the flame puts the flame beside the name box |
| `Prologue` | Title and boy or girl side by side; the voice pick with the Hollow on the left and the answers in two columns; the letter (two columns of prompts), the gym or home pick and the look editor with who speaks and the button on the left |
| `FirstFight`, `RiseUp`, `SitByFire` | The figures on the left, the words and the button on the right |
| `ClassPicker` | The hero you'd be on the left, the four classes and the button on the right |
| `BookOfDays`, `ExerciseLibrary` | Wider, the pages and the list in two columns; the library's search and filters on one line, an exercise's demos and facts beside its how-to |
| `DevPanel` | A wider sheet with its sections in two columns |
| `InstallGate` | The flame and the why on the left, the steps on the right |
| `Opening` | Fits as it is; the sound toggle keeps clear of the notch |

To change one, look for the variant in that component; try it at 844×390 (the `/lab/night` jumps
and `/lab/story?play=<scene id>&back` reach most of them) and check portrait at 390×844 is unchanged.

## Rules for components

- No rules and no art in components: call `src/lib/` and `src/story/`, draw with `<Sprite>`.
- Every change to the save goes through `update(fn)`.
- Icons are `lucide-react` or the pixel icons in `src/sprites/characters/icons.ts`.
- Colors and fonts come from `tailwind.config.ts` (`ink`, `gold`, Geist, Press Start 2P for pixel text).
- Respect `prefers-reduced-motion` (see `src/game/calm.ts` for the Fog).
- A full-screen overlay works held sideways too: add the landscape variant, never change the
  portrait classes (see above).
