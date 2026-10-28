---
type: reference
title: Screens
description: How src/app/page.tsx picks what is on screen (opening, tabs, workout, after-session, scenes, class picker, Fog run) and what every component in src/components does.
tags: [app, components, ui]
timestamp: 2026-10-28
---

# Screens

The whole app is one page, `src/app/page.tsx`. It holds the save (`useGameState`) and a few
pieces of screen state, and decides what is on screen:

1. **Not onboarded** (or replaying the opening): `Prologue` takes the whole screen. A new
   player's opening pauses after the first dungeon and the Wanderer (`profile.opening`, `'class'`)
   for the install step on a phone in a browser (`InstallGate` with `midway`); the installed app
   opens the `Prologue` again at the class pick (it is keyed by `profile.opening`).
   Otherwise, once per app open (`openingDue`, a `sessionStorage` flag; never in the sandbox),
   `Opening` plays over everything for about three seconds, and story scenes wait for it.
   If the workout was left open (`draft.open`, today's), the app opens straight back on `Workout`
   instead, with no `Opening`: a phone that closed the app while locked lands where you were.
2. **Onboarded, on a phone, in a browser tab** (not installed): `InstallGate` takes the whole
   screen until FORMA is opened from the home screen, see [pwa.md](pwa.md#install-before-playing).
3. **Onboarded, not signed in** (and the backend set up, not in the sandbox): `SignInGate` takes
   the whole screen until you sign in: no playing on without an account (Edoardo, 2026-10-28), not
   offline and not in developer mode. Email, then the code from the email or its link; Google when
   switched on. See
   [../backend/cloud-sync.md](../backend/cloud-sync.md).
4. **Otherwise** the header, the current tab and the bottom tab bar, with full-screen layers on
   top when one is open: `Workout` (training), `AfterSession` (right after finishing),
   `ScenePlayer` (a due story scene), `ClassPicker`, `FogRun`, `YouPage`, and the `DevPanel`.
   The tabs are Today, Train, Play and Hero, one job each: every thing has one home (gear, vault,
   forge and stats only on Hero; the Fog only plays), and your hero at the top opens the You page.
5. While a layer is open the tabs underneath are made `inert` (no focus, hidden from screen
   readers). Overlays opened from inside a tab use `useModal` for the same thing.
5. On the tabs (nothing over them) the menus' music plays, unless turned off in Settings (see [../game/sound.md](../game/sound.md)).
6. Back on the tabs, the next due scene from `scenesToPlay` (`src/story/engine.ts`) plays.

## Held sideways: the tabs

The tabs work both ways up. Upright, everything is one `max-w-md` column with the bottom tab bar.
On a phone held sideways (the `land:` variant in `tailwind.config.ts`: landscape and at most
600px tall; tablets and desktops keep the upright layout) `page.tsx` turns the tab bar into a rail
down the left with the hero at its top (the open tab on a lit tile), shrinks the header to one
line (FORMA, level, XP bar; the sandbox or developer save note becomes a small tag at its end), keeps clear of the
notch (`env(safe-area-inset-left/right)`), and makes the tab exactly fill the rest of the screen:
`main` is the one thing that scrolls, and only if a screen can't fit.

Each tab then lays out a screen of its own, built for the width rather than the upright cards split
in two: the tab asks `useLand()` (`src/components/useLand.ts`, the same media query) and returns
its sideways arrangement, reusing the same pieces (most take a `land` prop that only changes
classes). Panels share the height, and what may be long scrolls inside its own panel.

| Tab | Sideways |
|---|---|
| Today | A strip along the top (the chapter's enemy and hearts, the flame and its week, a rest day, the quote with Keep and the Book of Days, and at its end the keepsakes as a small card; it scrolls sideways when it can't fit), and under it the quest board: the exercises side by side as tiles with their still, and at the end of the row the check-in and a big Start, always in sight |
| Train | The flame's card (with what it brings up, and a dot on the tab until you open the chat) beside the week: a chip per day, Monday to Sunday (workouts, rest days, "–" before the plan) and that day's workout cards or rest day; before the first week, only a line that says to talk to the flame ([../game/coach.md](../game/coach.md)) |
| Fog (`PlayTab`) | A bar with the two doors (Story, Together) and, in Story, the ready strip (what you wear, warmed up, rested; tap the items for Hero > Gear); under it the world picker filling the screen (each world a wide card with its picture on the left and its words and Play on the right) or Together's columns (play with friends, the Ember Road card, the Friends card) |
| Hero | The three parts as tabs along the top (Gear, Stats, Class; a dot on Stats when points wait). Gear is `FogGearCard` across the whole width as three columns (worn with a line on what a fall takes, the vault, the tapped item and Mira's forge, or Mira waiting); Stats and Class put you on a stage (class, hero, Change look) beside a panel (`StatPoints` and `FlamePowers`; the class card) |

Upright must look exactly as before: the upright branch keeps its markup, and sideways changes are
`useLand` branches or `land:` classes only. The look editor puts its preview beside the choices.
Try it at 844×390 and 740×360 with the `/lab/night` jumps (`?sandbox&tab=…`, with `&hero=…`, `&fog=together`
or `you`; the "Menus" panel has one per screen) and check 390×844 is unchanged.

## On a computer: the tabs

On a laptop or desktop window (the `desk:` variant in `tailwind.config.ts`: a mouse or trackpad,
at least 1024px wide and over 600px tall, so never together with `land:`) `page.tsx` turns the tab
bar into a wider rail down the left, with the hero big at its top and each tab's name beside its
icon, and centers the header and the column (`max-w-2xl`) in the rest. The tabs keep their
upright layout inside it. Add computer changes only as `desk:` classes. The Fog's keys are in
[../game/fog.md](../game/fog.md).

## Components (`src/components/`)

| Component | Job |
|---|---|
| `Opening` | The splash when the app opens: the small flame (always the spark) catches, FORMA lands one letter per note of the `opening` sting, "Day N · the fire's lit" (`dayNumber`). Sound starts by itself where the browser allows it; where it needs a tap first (iPhones, even installed), the flame waits on a blinking "Tap to start" and that tap plays the jingle with the letters. A tap while it plays skips. Muted means no sound at all; reduced motion shows it still |
| `Prologue` | First run: boy or girl pick (on iPhones with "Bring your hero" under it, `BringHero`), the story opens, the voice pick, then the first dungeon (`FogRun` with `tutorial`, three small floors you can't fall on, see [../game/fog.md](../game/fog.md)) and at its bottom the Hollow, who strikes you down; the Hollow talks over you, `RiseUp` (hold to stand), the Wanderer ("I'll help you"), then, for a hero with no class yet, the install step (`onPause` saves `profile.opening`; on a phone in a browser `page.tsx` shows `InstallGate`) and the class (`ClassPicker`, "Don't worry, you can change it later", free), then the letter, gym or home, the `LookEditor`, and the hero's name (`NameIt`, kept in `profile.name`, what friends see) |
| `InstallGate`, `BringHero` | In the opening after the Wanderer (`midway`: the Wanderer asks, "Keep me close"), or after it for older saves, the guide to put FORMA on the home screen; and on an installed iPhone app's first screen, pasting in the hero copied in Safari. See [pwa.md](pwa.md#install-before-playing) |
| `SignInGate` | After the install step, an account, always (no skip): email, then the code from the email (the way in on an installed iPhone app, where the link opens Safari) |
| `PartyInviteCard`, `PartyButton`, `PartyLobby` | A friend's invite (join or not now), the button back to your party's lobby, and the lobby: who's in and ready, the zone (the leader picks), Into the Fog, invite more, leave. See [../backend/friends.md](../backend/friends.md#parties) |
| `TodayTab` | The flame card and its line, today's quest list with exercise stills (tap one for how to do it, `ExerciseSheet`), the rest-day card and `SitByFire`, the quote of the day, the Book of Days, the install nudge, and at the end the keepsakes (`Keepsakes`) as a reminder of the story so far; no quest without a planned workout (`NoPlan`: talk to the flame, or the week's workouts are all done), and on a planned rest day the rest card and the next workout marked as ahead |
| `Workout` | First the overview (every exercise with a demo still: move up or down, Easier, Swap, Skip; the list button in the header brings it back). Then the set logger: one exercise at a time, "Too hard? Easier" and "Swap" under the demo (a sheet of choices), one tap per set (reps in reserve), rest timer, Undo, the exercise demo; the warm-up and the stretch are one "Done" tap. Closing it after a set asks first: leaving doesn't count and starts over (no pausing). Rests are the coach's per exercise. Keeps the screen on while open (Screen Wake Lock); the rest's end time lives in the save (`draft.restUntil`), so it keeps counting while the phone is locked or the app is closed. A run gets its own view: the steps as a bar, a big clock per step, a buzz at each change, the distance at the end (`draft.runAt`) |
| `AfterSession` | After a workout: a short battle against the chapter enemy, then the loot (XP, stat points, better than last time, level, gear, the flame's word) and "How did it feel?" for the coach |
| `TrainTab` | The coach (`CoachScreen` in `CoachChat.tsx`: the flame's words with Talk, the week and its days' workout cards), the "Exercise library" button. No built-in plan: before the coach has planned a week there are no workouts |
| `CoachChat` | `CoachScreen` on the Train tab: the flame (your coach) with its last words, Talk and "What I know" (`CoachKnows` in `CoachPanel.tsx`), the week (`WeekBoard`: day chips, the chosen day's cards with demos, Easier, Swap, Start on the next day; tap a card for how to do it); and the chat at the camp fire with tap replies and a text box. See [../game/coach.md](../game/coach.md) |
| `ExerciseLibrary` | The whole exercise library over the Train tab: search, equipment, kind and movement filters, list rows with a demo still; an exercise shows the boy and girl demo, steps, tips and common mistakes (`ExerciseDetail`, also opened from any workout card on Today and Train by `ExerciseSheet`). Loaded on demand. See [../game/exercise-library.md](../game/exercise-library.md) |
| `WorldPicker` | The road through the Fog as worlds you swipe: one big card in the middle (the chapter's place from `PlaceBackdrop`, its boss in front), neighbours peeking at the sides, arrows and dots; opens on the newest open world. Each card keeps what the old zone row showed (zone icon, name, best run, first-try tip, hint, Play or Again); a shut world is dark and fogged (`fogBank`), its boss a shadow, a big padlock (`worldLock`) and the reason it is shut; a cleared one has a check. Off-centre cards turn and shrink by scroll position and the picture drifts, all off under reduced motion. Props `{ state, onPlay }`; try it at `/lab/worlds` |
| `PlayTab` | The Play tab, which only plays: two doors, **Story** (the `WorldPicker`, then the ready strip: your three worn items, tap for Hero > Gear; warmed up and rested; the boss's hearts) and **Together** (online with friends: the rules, Back to your party, `RoadCard` for the Ember Road, `FriendsCard`). Runs Together keep loot and materials but never move the story (`page.tsx`); an Ember Road boss beaten there moves the road on. Warms up the Fog's code and sprite sheets while idle. `?fog=together` opens Together |
| `FogRun` | A run, held sideways: loads the Phaser scene on demand, the HUD in the corners (`Vitals`: HP and level; the floor and its depth row, `DepthMap`; `BagButton` with a red count of what a fall would cost; pause; the floor's minimap, `FloorMap`, tap for it big), the bag (`BagPanel`) and the stairs card (deeper or leave), both showing what a fall would take from the bag (`RiskLine`), the pickup note, pause menu, skill picks (three cards side by side), the recap with what came home or was lost (`GearRecap`), the "turn your phone" card, and before a live party run "Waiting for your party" (`PartyWait`, [../backend/live-runs.md](../backend/live-runs.md)); it sends the run's start and end play stats ([analytics.md](analytics.md)) |
| `ItemCard` | An item's tile and card, shared by the run's bag and Hero > Gear. `ItemTile`: the item's own art (sprite `item`, drawn a little bigger than the tile, in multiples of 16 px) on a backdrop and edge in its rarity's color (rare gold with a soft glow, legendary orange). `ItemCard`: a stage on top with the art big, a rarity badge and the upgrade, then the name in its rarity's color, where it was found (`item level 20 · zone 2, floor 10`), how much stronger or weaker it is than what you wear (`than`; the tile shows a ▲ or ▼), what it gives, what it needs (a hero level, `levelLine`, and stat points, `needLine`). Rares shine and legendaries sparkle; with reduced motion they hold still (`useReducedMotion`). A forged item wears its band's light and a legendary its fire (`PlusGlow`), and its plus on the tile |
| `PlusGlow` | The light on an item, over a tile or card: its plus's shine (a glow from +4, in the rarity's color from +7, rising sparks from +10, light rays on a card from +13, full radiance at +15) and, for a legendary, `LegendFire`, a turning ring of red fire with sparks ([../game/forge.md](../game/forge.md)) |
| `HeroTab` | Your character, and the only home of your gear and stats: you on a stage (class, hero, Change look), then three parts, the same upright and sideways, kept in `page.tsx` (`heroPart`, `?hero=gear|stats|class`) so the Fog's ready strip can open Gear: **Gear** (`FogGearCard`: worn, vault, Mira's forge, see [../game/forge.md](../game/forge.md)), **Stats** (`StatPoints`, `FlamePowers`: the flame's flames and fireballs or fairy), **Class** (the class card with Change class, and the SPs under it, `SpCard`: the first sealed with its trial, then each SP you own, scrolled with arrows, with its moves and the button to wear it; the part is called **Class & SP** once the first SP is given) |
| `YouPage` | What is about you, not the game, over the tabs: tap your hero in the header (or at the top of the rail). The three counts, the letter, the quest log, Settings (sound, music in the menus, share play stats once PostHog is set up, replay the opening), Backup and Restore, the cloud save (`CloudSave`). `?you` opens it |
| `Keepsakes`, `FlamePowers` | One keepsake per Fog boss beaten (end of Today; `land`: a small card in Today's top strip); what your flame gives you in the Fog (Hero > Stats) |
| `ScenePlayer`, `Dialogue` | Play a story scene: lines, camera shots, the question, the answer lines |
| `ClassPicker` | Four weapons in the ash: pick the class. Props `cost` and `coins` (sweat coins, `src/lib/sweat.ts`): the button shows the cost and waits while you're short; `note` replaces the line under the classes (the opening's) |
| `SpCard` | The SPs on the Hero tab (`src/lib/sp.ts`): nothing before the Wanderer gives the first; the card's art (`spCard`) beside the rest; sealed, its trial as two ticks; awake, its element's mark by the name (`elementIcon`), its one-line idea (`about`), the class ability, its own move, its final and its passive (a lucide mark, `PASSIVE_MARK`), and a button to wear it into the Fog. With more than one, chevrons scroll the ones you own (`spOwned`), never the ones still to come |
| `SpTransform` | The SP waking, over the whole screen, played by a story line with `art: 'sp-transform'`: the card turns, the SP's element storms in (prop `n`: which SP), a flash, you in the SP's look under its name. A tap skips to the end; reduced motion shows only the end |
| `BookOfDays` | Every day the app was opened, newest first |
| `Hero`, `Characters`, `Sprite` | Draw sprites; `Hero` only decides when to attack, `Sprite` renders any sprite id. Screens that show your hero (header, Hero tab, after a workout) pass `variant={heroVariant(state)}`, so once the flame has fused with you in the finale you are drawn on fire |
| `Look`, `LookEditor` | The player's look, shared through `LookProvider`, and its editor |
| `Place`, `Weather` | A story place's backdrop; rain, ash, snow, embers, fog over the screen |
| `Sound` | `useMusic` (a track while a screen is on), the mute toggle |
| `DevPanel` | Developer mode's wrench and its tabbed panel (Go, Wallet, Gear, Hero, Story, Fog, Save), see [dev-mode-and-labs.md](dev-mode-and-labs.md) |
| `ServiceWorker` | Registers the offline worker, see [pwa.md](pwa.md) |
| `useModal` | Focus trap and inert background for overlays inside a tab |
| `useDesk` | `useKeyboardPlay`: true on a computer (mouse or trackpad), so the Fog shows its keys |
| `useLand` | True while the phone is held sideways (the `land:` query); the tabs use it to pick their sideways screen |

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
| `Dialogue` | Whoever is on screen on the left, the words beside them; narration with nothing to show stays centered. The backdrop is drawn wide for the screen at a whole-number scale (sky, horizon and ground all show) and the shade at the bottom is shorter |
| `ScenePlayer` | The question card puts the question beside its answers; naming the flame puts the flame beside the name box |
| `Prologue` | Title and boy or girl side by side; the voice pick with the Hollow on the left and the answers in two columns; the letter (two columns of prompts), the gym or home pick and the look editor with who speaks and the button on the left |
| `RiseUp`, `SitByFire` | The figures on the left, the words and the button on the right; `SitByFire`'s camp is drawn wide like `Dialogue`'s |
| `ClassPicker` | The hero you'd be on the left, the four classes and the button on the right |
| `BookOfDays`, `ExerciseLibrary` | Wider, the pages and the list in two columns; the library's search and filters on one line, an exercise's demos and facts beside its how-to |
| `DevPanel` | A wider sheet, the open tab's sections in two columns |
| `InstallGate` | The flame and the why on the left, the steps on the right |
| `Opening` | Fits as it is; the sound toggle keeps clear of the notch |

Pixel art stays crisp sideways: the story's overlays (`Dialogue`, the question card, `SitByFire`,
the whole `Prologue` with `RiseUp`) sit inside `<PixelSnap>`
(`src/components/sideways.ts`), so every `<Sprite>` in them is drawn at a whole multiple of its
64-pixel frame (140 becomes 128, 170 becomes 192), and a `PlaceBackdrop` given a `stage` is
redrawn wider for the box instead of cropped from the tall upright picture (see
[../game/story.md](../game/story.md)). Upright nothing changes: sizes stay as given and the
backdrop is the same picture as before. `useSideways()` in the same file is the query as a hook.

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
