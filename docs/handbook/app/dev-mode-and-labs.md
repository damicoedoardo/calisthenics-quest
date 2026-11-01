---
type: reference
title: Developer mode and the labs
description: Developer mode (src/lib/dev.ts, DevPanel) and the lab pages — /lab sprites, /lab/story scenes, /lab/sp the sixteen SPs, /lab/music tracks, /lab/night sandbox jumps — for trying changes without training for real.
tags: [app, dev-mode, lab, testing]
timestamp: 2026-11-01
---

# Developer mode and the labs

## Developer mode

`src/lib/dev.ts` (`useDevMode` and the helpers) and `src/components/DevPanel.tsx`. Only the
developer's account has it (Edoardo's call, 2026-10-28), on the live app and on previews alike:
signed in with an email whose SHA-256 (trimmed, lower-cased) is in `DEV_EMAILS` (`isDeveloper`;
the repo is public, so the addresses never are in it), or on localhost. Nobody else sees the
switch or the wrench. To add a developer, add the hash of their email to `DEV_EMAILS`. Besides
Edoardo's own there are two test accounts of his (Gmail "+" addresses that land in his inbox), for
trying friends and parties in two windows.

It is off until switched on in You > Settings ("Developer mode"). On, the app plays a separate
**developer save** (`DEV_SAVE_KEY`, `forma-dev-save-v1`, `switchDevSave` in `src/lib/store.ts`
reloads onto it): the first time it starts as a copy of the real save, then it is kept. The real
save is never read or written while it is on, and the developer save never reaches the cloud,
friends, parties or play stats (`offRecord()`). A blue bar in the header says so, with "Turn off",
which reloads onto the real save as it was. The panel's Save tab can copy the real hero in again
(`resetDevSave`). Signed out with it on, the phone goes back to the real save. The dev tools also
show in a lab sandbox (`?sandbox`) for the developer.

It adds: "Skip the intro" on the title screen; "Play here without installing" on the install screen (see [pwa.md](pwa.md#install-before-playing)); a wrench in the header that opens one panel with tabs (the open tab is remembered on the phone, `forma-dev-tab`):

| Tab | What |
|---|---|
| Go | Open any tab or screen of the app (Play, Friends, Hero's parts, the You page, a workout), and links to every lab page below |
| Wallet | Embers (`giveEmbers`, as if melted down), sweat coins (`giveCoins`: less than nothing spent), each co-op material (`giveMaterials`), "Rich" (plenty of each), "Empty the wallet" |
| Gear | Make an item to order (`makeItem`: slot, rarity, zone, +0 to +15, for your class, wearable now) and wear it (`wearNew`, the old one goes to the vault) or put it in the vault (`toVault`, even past its size); everything worn to any plus; take all off; empty the vault |
| Hero | Class (free, no coins), each of the four SPs awake and worn (`giveSpAwake`), all four, the first one sealed, none; stat points given on top (`giveStatPoints`, saved as `devPoints`), spread evenly, take all back |
| Story | Jump to a chapter's start or past the end (`jumpToChapter`: adds workouts, or takes the newest away and forgets later chapters' scenes), fake workouts (skip the scenes they unlock, or not), any scene, the prologue, the app opening, the flame's name, rest day, 4 days in a row, away 9 days, a new day page |
| Fog | How many bosses are beaten (`setBossesBeaten`), reset the Fog, and a run in any zone on this save at the start, the mid-boss, the boss, the recap, or with the SP's final full (`onRun`, the same spots as `?run=&at=`) |
| Save | Copy or download the save, paste one to load (tap twice), start over as a new player, turn developer mode off (live app only) |

In a Fog run's pause menu: "Skip to the boss", "Next floor", "To the mid-boss", "The stairs card" (the stairs choice, here and now), "Win this run", "Level up now" (the skill cards; `?run=0&at=skills` opens them with five skills already taken, as the `/lab/night` row does), the bot, and a Theme button that cycles zone colors.
Held sideways the panel is a wider sheet with the open tab's sections in two columns. `?dev` on a sandbox jump opens it on top.
Helpers are pure functions on `GameState` and tested in `src/lib/dev.test.ts`.

## Labs (`src/app/lab/`)

| Page | What |
|---|---|
| `/lab` | Sprite Lab: every sprite and animation, with class, gear tier, variant and look controls (head, body, hair, hair color, skin, eyes, face mark); every Fog item kind at every rarity (two seeds), the hero of each class in a whole set of items of each rarity, and "The hand-drawn body": the old block body beside the hero's hand-drawn one, standing and walking. Check art changes here on a phone |
| `/lab/story` | Story Lab: play any scene with any flame name and letter (your hero is your own: the class and gear from this phone's save, read only), every place (held sideways, drawn wide as in a scene), every look of the flame. `?play=<scene id>&back` plays one scene and returns (`/lab/night`'s story panel starts with the letter after the first workout, `first-letter`) |
| `/lab/sp` | The sixteen SPs: each class's four, as a boy and as a girl, with the element's mark, its name, who it is, its weapon and attack clip; filter by element; Idle, Walk or Attack (a tap replays the attack). Linked from the Sprite Lab header and `/lab/night` |
| `/lab/music` | Music Lab: every theme and sting |
| `/lab/worlds` | The Play tab's world picker (`WorldPicker`) on made-up saves: a fresh hero, mid-way (one boss down, two worlds open), waiting on training (the next world opens with a later chapter), all open. Play only shows what it would start; nothing is saved. Linked from the Sprite Lab header |
| `/lab/night` | One tap to try each recent change ("Open the developer menu" opens a veteran sandbox with the panel open; "Design pass" opens Today with a coach set up and a week planned (`withWeek`), to see the quest without signing in (today's workout taken out, `notYetToday`), and "Today, after the workout" opens it with the week's first workout done today (`doneToday`), and "Next week, planned early" opens the Train tab on that save: next week shown at once with its "Week done" card (`withWeek` plans both weeks, `planAhead`); "Install the app" opens each install guide with `?gate=<platform>`, and the installed iPhone app's first screen): writes a sandbox save for that moment (see [../architecture/game-state.md](../architecture/game-state.md)) and opens the app with `?sandbox` and `?tab=`, `?run=<zone>&at=mid\|boss\|win\|sp`, `?workout` or `?book`, plus `&hero=gear\|stats\|class` (the Hero tab's part), `&fog=together` or `?you` (the You page); the "Menus" panel has a jump for each tab's screens. "Exercise library" opens the Train tab to try the library; "The Fog, sideways" starts a zone 1 run; "New monsters: <world>" starts a run in each of zones 2-6 (`run=1` to `run=5`) to meet that world's own monsters; "A party run (practice)" starts one with two bot friends (`&party`; add `&live=ws://localhost:8090/play&pass=<token>` to join a game server on this computer instead, [../backend/live-runs.md](../backend/live-runs.md)); the "Ember Road" jumps open Together before setting out (`geared`), on chapter 2 (`onRoad(beaten, walked)`), or in each chapter's party run (`?run=road1&party`, `road2`, `road3`; win it and Tamsin speaks), and "The Feed" opens the Friends tab's Feed with two sample posts (`&feed`; flames, comments and sharing work there without a server); `/lab/night?go=you` (or `friends`, `feed`) opens that moment at once, for a one-tap link to send (`GO` in the page); "Profiles" opens the Friends tab to tap Ana (sample photo, place and line) or Ben (a place only) for their profile; "The Road Banner" opens the road walked to its end (`onRoad(3, 28)`, Ana and Ben stitched on it); the "Loot" jumps open a geared save (`geared`: a sword and a charm on) on the Play tab or in a zone 2 run; "Mira's forge, +1 to +15" opens `forged(plus)` (the sword at +3 to +15, the vault at +4, +10 and +13, co-op materials and embers to spend) on the Play tab or in a run; "A legendary worn" opens `legendWorn()` (the vault's legendary worn as the sword at +0, wearable now: its fire with no forge shine) on the Play tab or in a run; "A boss with no hearts left" opens a save 15 workouts in with Tomorrow still standing (Play tab, or a run at the boss), "A boss with hearts left" one 8 workouts in; "After the finale" opens a save past the finale (`fused`), with the hero on fire on the Hero tab or in a Summit run "Classes, SP and sweat coins" has the boss room going quiet with HOME stairs, the opening with its class pick, another class's bow (`otherBow`, Hero > Gear), the Wanderer's gift in the Story Lab, the SP waking in the app for each class (`spWaking`: its transformation), the SP sealed or awake in Hero > Class & SP (`withSp`), all four SPs there to scroll (`withSp(true, c, n)`), the Wanderer's later gifts in the Story Lab, a run with each of the sixteen SPs at the mid-boss with its final already full (`at=sp`, `fillFinal`), and a class change that costs coins. "Story so far" opens Today with chapter 2's first scene due (try Later and Skip; `storyWalk(n)`: every scene seen up to n workouts) or the Play tab with two scenes waiting (`storyWaiting`: the flame's name skipped, the last scene put off); "Your coach: the flame" opens the Train tab with no coach set up yet ("Meet your coach") or with a gym week planned ("A week built like a trainer's": warm-up, ramp-up, main, core, cool-down and the time, `withWeek`); "Menus" has "Start over from scratch" (the You page on a veteran sandbox: it wipes only the sandbox save); talking needs a sign-in on that phone, the sandbox only keeps what the coach changes off the real save. |

When you build something Edoardo should try, add a jump to `/lab/night` and send the Vercel
preview link (not a standalone mockup).
