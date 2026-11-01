---
type: reference
title: Screens
description: How src/app/page.tsx picks what is on screen (opening, tabs, workout, after-session, scenes, class picker, Fog run) and what every component in src/components does.
tags: [app, components, ui]
timestamp: 2026-11-01
---

# Screens

The whole app is one page, `src/app/page.tsx`. It holds the save (`useGameState`) and a few
pieces of screen state, and decides what is on screen:

1. **Not onboarded** (or replaying the opening): `Prologue` takes the whole screen. It plays in
   the browser, signed out, with nothing to install: hook first, ask later (Edoardo, 2026-10-31).
   An old save paused for the install step (`profile.opening`, `'class'`) opens it again at the
   class pick (it is keyed by `profile.opening`).
   Otherwise, once per app open (`openingDue`, a `sessionStorage` flag; never in the sandbox),
   `Opening` plays over everything for about three seconds, and story scenes wait for it.
   If the workout was left open (`draft.open`, today's), the app opens straight back on `Workout`
   instead, with no `Opening`: a phone that closed the app while locked lands where you were.
2. **Onboarded, not signed in** (and the backend set up, not in the sandbox): right after the
   opening, since the flame plans the first week through the coach api, `SignInGate` takes
   the whole screen until you sign in: no playing on without an account (Edoardo, 2026-10-28), not
   offline and not in developer mode. Email, then the code from the email or its link; Google when
   switched on. Then:
3. **Signed in, on a phone, in a browser tab** (not installed): `InstallGate` takes the whole
   screen until FORMA is opened from the home screen, see [pwa.md](pwa.md#install-before-playing).
   Neither gate covers a workout, the screen after it, its scenes or the share card (`asking` in
   `page.tsx`). See
   [../backend/cloud-sync.md](../backend/cloud-sync.md).
4. **Otherwise** the header (one line: your hero, FORMA, your level small and the workouts done in
   all with the dumbbell icon; the XP bar lives on the Hero tab, Edoardo 2026-10-31), the current tab and the bottom tab bar, with full-screen layers on
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
line (FORMA, level, workouts done; the sandbox or developer save note becomes a small tag at its end), keeps clear of the
notch (`env(safe-area-inset-left/right)`), and makes the tab exactly fill the rest of the screen:
`main` is the one thing that scrolls, and only if a screen can't fit.

Each tab then lays out a screen of its own, built for the width rather than the upright cards split
in two: the tab asks `useLand()` (`src/components/useLand.ts`, the same media query) and returns
its sideways arrangement, reusing the same pieces (most take a `land` prop that only changes
classes). Panels share the height, and what may be long scrolls inside its own panel.

| Tab | Sideways |
|---|---|
| Today | A strip along the top (the install nudge, the flame and its week, a rest day), and under it the quest board: the exercises side by side as tiles with their still (the warm-up and the stretch each a narrow folded tile, tap to open), and at the end of the row a big Start, always in sight, with "Rough day? Do less" under it |
| Train | The flame's card (with what it brings up, and a dot on the tab until you open the chat) beside the week (next week is always drafted ahead: the moment this week's last workout is done it shows, with a "Week done" step, Looks good or Change it with the flame): a chip per day, Monday to Sunday (workouts, rest days, "–" before the plan) and that day's workout cards or rest day; before the first week, only a line that says to talk to the flame ([../game/coach.md](../game/coach.md)) |
| Play (`PlayTab`) | A small Story button at the top right (Story so far, with a count of scenes waiting); under it the world picker filling the screen (each world a wide card with its picture on the left and its words and Play on the right) |
| Friends (`FriendsTab`) | Two columns: the camp and the Ember Road card on the left; the Friends card on the right |
| Hero | The three parts as tabs along the top (Gear, Stats, Class; a dot on Stats when points wait). Gear is `FogGearCard` across the whole width in two columns (worn and the vault on the left, the tapped item's card on the right, or Mira waiting); Forge opens Mira's forge as its own page, two columns too; Stats and Class put you on a stage (class, hero, Change look) beside a panel (`StatPoints` and `FlamePowers`; the class card) |

Upright must look exactly as before: the upright branch keeps its markup, and sideways changes are
`useLand` branches or `land:` classes only. The look editor puts its preview beside the choices.
Try it at 844×390 and 740×360 with the `/lab/night` jumps (`?sandbox&tab=…`, with `&hero=…`, `&fog=together`
or `you`; the "Menus" panel has one per screen) and check 390×844 is unchanged.

## Gym mode: a plain look for training

A switch in You > Settings (Edoardo 2026-10-31: at the gym the app should look less like a game).
On, the workout drops the pixel look for a plain, modern one, but only once it is open: the
overview, the set logger, the big demo, the rest, the run and their sheets. Everything else (Today,
Train, the tabs, the screen after a workout) keeps the game's look (Edoardo: "just when you
actually start the workout"). It is kept on this phone only (`forma-gym-mode` in localStorage, like
the menu music), and off by default.

It is mostly CSS, so the workout keeps one markup:

- `src/components/Gym.tsx`: `useGymMode()` and `setGymMode()`.
- `page.tsx` wraps `Workout` in a `gym` class when it is on. Nothing else gets it.
- `globals.css` (`.gym`): the `ink` and `gold` colors of `tailwind.config.ts` are CSS variables
  (`--ink-950`…, `--gold-400`…, as R G B), and `.gym` swaps them for plain greys and white, so the
  gold buttons turn white and the cards neutral grey. `font-pixel` and `font-mono` become Geist
  (pixel sizes one step up), pixel bevels (`shadow-[…]`) go flat, `pixel-notch` turns round (the
  set boxes are circles), full-screen layers are solid, and `gym-hide` hides the game's characters
  (every `Ember` carries it).
- A friend's cheer during the workout (`CheerToast` with `plain`) is a plain grey card: who, and
  their words, no hero and no orange.
- In `Workout.tsx`: the rest is one ring that fills as it runs out, the clock in its middle
  (`Rest`, `gym`), and "Finish workout" / "Short workout" for "Complete quest" / "Minimum quest".

The exercise demos stay: they show how to do the move. A new piece of the workout gets the look for
free if it uses the `ink` and `gold` colors; mark game art in it with `gym-hide`.

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
| `Prologue` | First run. A brand-new hero starts on the boy or girl pick; while not signed in (backend set up, not in the sandbox; `askLogin`, set in `page.tsx`) it has a small **I already have a hero** under it (`SignInGate` with `welcome`: email, code, and the cloud hero replaces the empty save, so the opening ends; an account with no hero yet goes on to a new game). An opening left half way asks **Continue** or **I already have a hero** first, on every open while signed out. Then (on iPhones with "Bring your hero" under the pick, `BringHero`) the story opens, the voice pick, then the first dungeon (`FogRun` with `tutorial`, three small floors you can't fall on, see [../game/fog.md](../game/fog.md)) and at its bottom the Hollow, who strikes you down; the Hollow talks over you, `RiseUp` (hold to stand), the Wanderer ("I'll help you"), then three quick picks: the class (`ClassPicker`, "Don't worry, you can change it later", free) for a hero with none, the spark's hello and the first quest, gym or home, and the hero's name (`NameIt`, kept in `profile.name`, what friends see). The look editor is on the Hero tab, and the letter comes after the first workout (`LetterForm`, the scene `first-letter`) |
| `InstallGate`, `BringHero` | Right after the sign-in, "Keep your hero" (signed in, the iPhone steps skip copying the hero: the installed app signs in to it): the guide to put FORMA on the home screen; and on an installed iPhone app's first screen, pasting in the hero copied in Safari. See [pwa.md](pwa.md#install-before-playing) |
| `SignInGate` | After the install step, an account, always (no skip); also the opening's "I already have a hero" (`welcome`, `back`): email, then the code from the email (the way in on an installed iPhone app, where the link opens Safari) |
| `PartyInviteCard`, `PartyButton`, `PartyLobby` | A friend's invite (join or not now), the button back to your party's lobby, and the lobby: who's in and ready, the zone (the leader picks), Into the Fog, invite more, leave. See [../backend/friends.md](../backend/friends.md#parties) |
| `TodayTab` | Only what to do today (Edoardo 2026-10-31: less on screen; the chapter's boss is on the Play tab, the keepsakes at its end, the quote and the Book of Days on the You page): the flame card and its line with the week as pips and the streak as a flame, today's workout as `WorkoutList` (the same list as the Train tab; a rough day dims what it leaves out), the rest-day card and `SitByFire`, the install nudge, then Start (no XP and no loot chips on Today: what a workout gives shows after it) and under it one quiet link, "Rough day? Do less" (`RoughDay`: the check-in, main exercise only; normal is the default, the minutes, from `minutesOf`, go in the quest's header); once today's workout is done no quest at all but `DoneToday` ("Done for today", you earned it, workouts in all and this week, one quiet line on the next workout that opens the Train tab, where it shows in full), no quest without a planned workout (`NoPlan`: talk to the flame, or the week's workouts are all done), and before the next workout's day (a planned rest day) the rest card and that workout marked as ahead, its Start locked ("Opens on Sat"). Which of these shows comes from `todayIs` (`src/lib/coach/week.ts`), the same answer the Train tab reads, so the two never disagree |
| `Workout` | First the overview (every exercise with a demo still: move up or down, Easier, Swap, Skip; the list button in the header brings it back). Then the set logger (Edoardo 2026-11-01: players found it unclear, then "less written text, more minimal"): the header has a bar per move with the workout's clock under it (`SessionClock`: from Start on the overview, `draft.clockAt`, to Finish; Edoardo 2026-11-01: the time is saved on the session), **Ask** (a chat icon: the flame's chat, `CoachChat`, with "About <exercise>: " already in the box) and the list button; one exercise at a time, name and demo, small round tools in a column on the demo's right with one word each (`Tool`: How to, the library page with steps, tips and mistakes, `ExerciseSheet`; Easier; Swap), "Round N of M" over the set squares (Edoardo 2026-11-01: so it's clear they are the rounds), the number under "Target reps" (− and + change it to what you did: "You did · target N", the number blue; the labels small capitals like the rest timer's, the − + notched like the set squares, so Gym mode makes them round), "How did it feel?" over three buttons, Easy 4+, Just right 2-3, Very hard 0-1 (reps in reserve; Just right unless tapped, back to it after each set) and one big **✓ Done** that saves the set (Edoardo 2026-11-01: three save buttons were too much), rest timer, Undo; "End here" shows once a set is saved. The warm-up and the stretch show their time with **Start** (counts down, buzzes at the end, Done any time) or "Skip the timer". Closing it after a set asks first: leaving doesn't count and starts over (no pausing). Rests are the coach's per exercise, else by role (`restFor` in `src/lib/coach/time.ts`, the same rule the "about N min" uses). Keeps the screen on while open (Screen Wake Lock); the rest's end time lives in the save (`draft.restUntil`), so it keeps counting while the phone is locked or the app is closed. Exercises whose movement has an anatomy demo (`anatomyFor(demo, name)`: 147 moves (lifts, jumps, Olympic lifts, cardio machines, stretches and mobility drills) plus look-alikes, 879 of 891 exercises, with dumbbell, barbell, kettlebell, incline and goblet variants read from the name) show it instead (`BodyDemo`, drawn by `AnatomyDemo.tsx` from `src/sprites/anatomy/`, see [../game/sprites.md](../game/sprites.md)): a plain body with the worked muscles colored, its gear, and an arrow for the way it moves; a tap shows it side on and from a second view (`viewName`: Front, Back, Above...) with the muscle names (`MuscleKey`). A run gets its own view: the steps as a bar, a big clock per step, a buzz at each change, the distance at the end (`draft.runAt`) |
| `CheerToast` | A friend's cheer at the top of the screen, over anything, the workout too: their hero, "<name> cheers you on" and their line; 6 s or a tap. See [../backend/friends.md](../backend/friends.md#cheers) |
| `AfterSession` | After a workout: a short battle against the chapter enemy, then the loot (XP, then stat points, embers and a sweat coin as pixel chips with the purse's icons, popping in, the time next to the planned minutes, better than last time, a target that steps back, level, gear, the flame's word) and "How did it feel?" for the coach; signed in, **Share with friends** under Continue opens `SharePage` (see [../backend/friends.md](../backend/friends.md#the-feed)) |
| `TrainTab` | The coach (`CoachScreen` in `CoachChat.tsx`: the flame's words with Talk, the week and its days' workout cards), the "Exercise library" button. No built-in plan: before the coach has planned a week there are no workouts |
| `WorkoutList` | One workout, drawn the same on Today and the Train tab (Edoardo 2026-10-31: the two must be one thing): the warm-up and the cool-down folded into one row each ("Warm-up · 4 moves" with a chevron, tap to open, `workoutRows`), every exercise with a still of you (tap for how to do it, `ExerciseSheet`), its dose and rest, the changed tag, and on a day still to do Easier and Swap as two small buttons (`Choices`, `changeItem`); while a workout is under way the sets done show instead of the dose, and skipped ones are dimmed. `tiles` is Today held sideways: the same rows as tiles side by side. Change how a workout looks here, never in a tab |
| `CoachChat` | `CoachScreen` on the Train tab: the flame (your coach) with its last words, Talk and "What I know" (`CoachKnows` in `CoachPanel.tsx`), the week (`WeekBoard`: this week, or next week once this week's workouts are all done (`shownWeek`), with the "Week done" card on top until Looks good or Change it (`weekDoneId` in `coach.heard`); next week's days named "Next Mon"; day chips with date and icon, the chosen day's `WorkoutList`, Start on the next day once its day has come (before it, "Opens on <day>"); tap a card for how to do it); and the chat at the camp fire with tap replies and a text box. See [../game/coach.md](../game/coach.md) |
| `ExerciseLibrary` | The whole exercise library over the Train tab: search, equipment, kind and movement filters, list rows with a demo still, equipment and muscles, and how hard as one to three bars; an exercise shows the boy and girl demo, steps, tips and common mistakes (`ExerciseDetail`, also opened from any workout card on Today and Train by `ExerciseSheet`). Loaded on demand. See [../game/exercise-library.md](../game/exercise-library.md) |
| `WorldPicker` | The road through the Fog as worlds you swipe: one big card in the middle (the chapter's place from `PlaceBackdrop`, its boss in front), neighbours peeking at the sides, arrows and dots; opens on the newest open world. Each card keeps what the old zone row showed (zone icon, name, best run, first-try tip, hint, Play or Again); a shut world is dark and fogged (`fogBank`), its boss a shadow, a big padlock (`worldLock`) and the reason it is shut; a cleared one has a check. Off-centre cards turn and shrink by scroll position and the picture drifts, all off under reduced motion. The open world's card has one line, `Edge`: the boss's hearts left (each workout takes one; "weaker" at zero) and the free skills your runs start with (warmed up, rested and the edge's picks); a cleared world's card shows its keepsake (`Won`: the sprite, its name and words). Props `{ state, onPlay }`; try it at `/lab/worlds` |
| `PlayTab` | The Play tab, your story alone and nothing else (Edoardo 2026-10-31: less on screen): a small STORY button at the top right (`StoryRow`: opens `StorySoFar`; gold with a count when scenes wait), then the `WorldPicker`. What a world gives you today and what you won there are on its card (see `WorldPicker`). Warms up the Fog's code and sprite sheets while idle |
| `FriendsTab` | The Friends tab, everything with other people. At the top a **Friends \| Feed** switch (the Feed: `FeedView`, shared workouts, see [../backend/friends.md](../backend/friends.md#the-feed); an orange dot for new posts). Friends (kept short and in the pixel look, Edoardo 2026-10-31): the camp on top (`Camp`: the night camp from `PlaceBackdrop`, up to four online friends standing round the fire with their bubble and name; tap one for Cheer while they train or Party, or their name for their profile (`ProfilePage`, shown by `ProfileHost` at the top of the tab: stats, Cheer/Party/Gift, latest posts); in front your party on four spots, you on the first and a **+** on each free one; any spot opens the lobby, which says the rules), then `FriendsCard` (its header says how many are online; your name if it is still empty; every friend, training or in the Fog first, then online, each in a framed row (tap the hero or name for their profile) with a pixel name, level badge and a bubble saying what they're doing, and Cheer while they train or Party, see [../backend/friends.md](../backend/friends.md#cheers), and the gift button; your friend code, Invite and adding a friend fold behind an **Add** button, open when you have no friends yet), then `RoadCard` for the Ember Road. The tab button shows how many are online (`useFriends` in `page.tsx`). Runs with friends keep loot and materials but never move the story (`page.tsx`); an Ember Road boss beaten there moves the road on and saves the friends' names, and the walked road shows the Road Banner with them (`RoadBanner`). In the sandbox it shows three sample friends. `?tab=friends` (or the old `?fog=together`) opens it |
| `FogRun` | A run, held sideways: loads the Phaser scene on demand, the HUD in the corners (`Vitals`: HP and level; the floor and its depth row, `DepthMap`; `BagButton` with a red count of what a fall would cost; pause; the floor's minimap, `FloorMap`, tap for it big), the bag (`BagPanel`) and the stairs card (deeper or leave), both showing what a fall would take from the bag (`RiskLine`), the pickup note, pause menu, skill picks (`SkillPick`: three cards side by side, each colored by its skill's kind, with level pips and the skills already taken under them; `?at=skills` in `page.tsx` opens one), the recap with what came home or was lost (`GearRecap`), the "turn your phone" card, and before a live party run "Waiting for your party" (`PartyWait`, [../backend/live-runs.md](../backend/live-runs.md)), in developer mode the live run's ping under the floor bar; it sends the run's start and end play stats ([analytics.md](analytics.md)) |
| `PixelTabs` | The one switch between parts of a screen (Edoardo 2026-10-31: the old ones didn't look like the game): pixel type in one of four looks (`TabLook`: gold block in a slim tray, underline, menu cursor ▶, folder tabs), `TAB_LOOK` the one the app uses; the Lab shows them side by side (`TabLooks`, /lab/night "Tab switch looks"). A small dot for news. Used by Friends \| Feed (`FriendsTab`), Gear \| Stats \| Class (`HeroTab`), Upgrade \| Reroll (`ForgeSheet`), and, `small`, the vault's slot filter (`FogGearCard`). A new switch uses it too |
| `ItemCard` | An item's tile and card, shared by the run's bag and Hero > Gear. `ItemTile`: the item's own art (sprite `item`, drawn a little bigger than the tile, in multiples of 16 px) on a backdrop and edge in its rarity's color (rare gold with a soft glow, legendary orange). `ItemCard`: a stage on top with the art big, a rarity badge and the upgrade, then the name in its rarity's color, where it was found (`item level 20 · zone 2, floor 10`), how much stronger or weaker it is than what you wear as a green or red chip (`than`; the tile shows a ▲ or ▼), what it gives as rows of the bonus's name and its number on the right (base lines first, bonuses in the rarity's color; `splitLine`), and what it needs as chips, green once met and red while short (a hero level, `levelLine`; stat points, `needLine`; another class's item). Rares shine and legendaries sparkle; with reduced motion they hold still (`useReducedMotion`). A forged item wears its band's light and a legendary its fire (`PlusGlow`), and its plus on the tile |
| `Purse`, `LootGuide`, `LootIcon` | What training gives, drawn the same everywhere (`src/lib/loot.ts` reads the numbers): a pixel icon per kind (`uiIcon` `xp`, `point`, `flame`, `coin`, `mat`); the purse on the Hero tab and the guide it opens: you training with the loot thrown up out of you (still under reduced motion), then each kind's road as icons, where it comes from, what it is for, and a button to the Hero part that spends it; materials also show each of the four with its color and count |
| `PlusGlow` | The light on an item, over a tile or card: its plus's shine (a glow from +4, in the rarity's color from +7, rising sparks from +10, light rays on a card from +13, full radiance at +15) and, for a legendary, `LegendFire`, a turning ring of red fire with sparks ([../game/forge.md](../game/forge.md)) |
| `HeroTab` | Your character, and the only home of your gear and stats: you on a stage (class, hero, a small palette button in its corner for the look, your level and its XP bar (`LevelBar`, moved here from the top bar; sideways beside the part tabs), and the purse, `Purse`: stat points, embers, sweat coins, materials, a dot where something waits to be spent; sideways beside the part tabs), then three parts, the same upright and sideways, kept in `page.tsx` (`heroPart`, `?hero=gear|stats|class`) so the loot guide can open a part: **Gear** (`FogGearCard`: the three worn slots, the vault (200 spaces: what you have, rarest first, then the free spaces to the end of the row; a slot filter, All/Weapon/Armor/Charm, and **Melt many**, `VaultMelt`: all common, magic or rare, or all weaker than yours, forged and worn items kept, a second tap), and the tapped item's card with Wear or Take off and **Melt** (its embers, a second tap), and under it (sideways over it) a **Mira's forge** button with her face, what she can do and Open, which opens `ForgeSheet`; see [../game/forge.md](../game/forge.md)), **Stats** (`StatPoints`, `FlamePowers`: the flame's flames and fireballs or fairy), **Class** (the class card with Change class, and the SPs under it, `SpCard`: the first sealed with its trial, then each SP you own, scrolled with arrows, with its moves and the button to wear it; the part is called **Class & SP** once the first SP is given) |
| `ForgeSheet` | Mira's forge for one item, on its own page (`Forge.tsx`, Edoardo 2026-10-31: the old forge card was messy): along the top what you have to spend, always in sight (`Have` chips: embers and the four co-op materials, faded at none); Mira and one line she says (after a try: held, missed, slipped), the item's tile with `+7 ▶ +8` and the plus pips (tall marks are safe), only the lines the next plus changes (name, now ▶ next), then the price as chips (embers and any co-op materials, each as what you have / what it needs, red when short), the chance as a bar with what each way ends in (`Chance`: Works, goes to +N; Fails, may drop a plus or stays), one **Forge +N** button. Under the item, two tabs (Edoardo 2026-10-31: reroll was unclear, and melting moved out to the item's card): **Upgrade** (the above), **Reroll** (each bonus with a Swap button and its price; after a swap the row says what it was; the base lines stay and are named); Mira's line changes with the tab. **How it works** in its header (`HowItWorks`, Edoardo 2026-10-31: say that it can fail) shows five short steps, each with its part of the +1..+15 strip lit: up to +6 always works, from +6 materials, from +7 it can fail, the safe marks, better odds; it opens by itself the first time on a phone (`forma-forge-guide-seen` in localStorage). Sideways: the item on the left, the price and button on the right |
| `YouPage` | What is about you, not the game, over the tabs: tap your hero in the header (or at the top of the rail). Kept short (Edoardo 2026-10-31): your hero and your name at the top (tap the name to change it, what friends see; the look changes on the Hero tab), two counts in pixel type (workouts, chapter), **Your profile** for friends (signed in: a photo, where you live, a few words, all optional, `ProfileEdit`, see [../backend/friends.md](../backend/friends.md#profiles)), the quote of the day with Keep and the Book of Days (`DayQuote`), the letter (tap to open), your workouts (the last five, More for twelve; no XP), **Settings** one row each with a switch (gym mode, see [Gym mode](#gym-mode-a-plain-look-for-training), sound, music in the menus, share play stats once PostHog is set up, developer mode on the developer's account, replay the opening), and **Your save**: the cloud save (`CloudSave`), a backup file and Restore, and **Start over from scratch** (`StartOver`, see [../backend/cloud-sync.md](../backend/cloud-sync.md)). `?you` opens it |
| `StorySoFar` | Every story scene reached, to watch again, over the tabs (opened from the Play tab, kept in `page.tsx` as `storyOpen`): scenes waiting first (put off with Later, or skipped; a gold mark, "Not watched yet", "Skipped" or "Your answer waits"), then the opening (replays the prologue), then each chapter, the scenes that come any time and the Ember Road; each row the scene's place and its title or first line. A scene not reached is never listed. While scenes wait, the Play tab's button has a gold dot. After Later (every time) and the first skip, `StoryNote` in `page.tsx` says where the scene waits. Rules: "Story so far" in [../game/story.md](../game/story.md) |
| `FlamePowers` | What your flame gives you in the Fog (Hero > Stats); the keepsakes (one per Fog boss beaten) are on their cleared worlds' cards in the `WorldPicker` |
| `ScenePlayer`, `Dialogue` | Play a story scene: lines, camera shots, the question, the answer lines |
| `ClassPicker` | Four weapons in the ash: pick the class. Props `cost` and `coins` (sweat coins, `src/lib/sweat.ts`): the button shows the cost and waits while you're short; `note` replaces the line under the classes (the opening's) |
| `SpCard` | The SPs on the Hero tab (`src/lib/sp.ts`): nothing before the Wanderer gives the first; the card's art (`spCard`) beside the rest; sealed, its trial as two ticks; awake, its element's mark by the name (`elementIcon`), its one-line idea (`about`), the class ability, its own move, its final and its passive (a lucide mark, `PASSIVE_MARK`), and a button to wear it into the Fog. With more than one, chevrons scroll the ones you own (`spOwned`), never the ones still to come |
| `SpTransform` | The SP waking, over the whole screen, played by a story line with `art: 'sp-transform'`: the card turns, the SP's element storms in (prop `n`: which SP), a flash, you in the SP's look under its name. A tap skips to the end; reduced motion shows only the end |
| `BookOfDays` | Every day the app was opened, newest first; each page's date with the day's icon |
| `Hero`, `Characters`, `Sprite` | Draw sprites; `Hero` only decides when to attack, `Sprite` renders any sprite id. Screens that show your hero (header, Hero tab, after a workout) pass `variant={heroVariant(state)}`, so once the flame has fused with you in the finale you are drawn on fire |
| `Look`, `LookEditor` | The player's look, shared through `LookProvider`, and its editor: body, hair (nineteen styles), hair color, eyes, skin and a face mark (the clothes come from items). Upright, the preview stays in view while the choices scroll, and the button to close it (Done on the Hero tab, This is me in the opening) stays pinned at the bottom |
| `Place`, `Weather` | A story place's backdrop; rain, ash, snow, embers, fog over the screen |
| `Sound` | `useMusic` (a track while a screen is on), the mute toggle |
| `DevPanel` | Developer mode's wrench and its tabbed panel (Go, Wallet, Gear, Hero, Story, Fog, Save), see [dev-mode-and-labs.md](dev-mode-and-labs.md) |
| `ServiceWorker` | Registers the offline worker, see [pwa.md](pwa.md) |
| `ViewportHeal` | In the installed iPhone app, makes iOS measure the screen again after the keyboard closes, so the tab bar goes back to the bottom, see [pwa.md](pwa.md) |
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
| `Prologue` | Title and boy or girl side by side; the voice pick with the Hollow on the left and the answers in two columns; the gym or home pick with who speaks and the button on the left |
| `LetterForm` | The letter after the first workout: the Wanderer and the button on the left, the prompts in two columns |
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
