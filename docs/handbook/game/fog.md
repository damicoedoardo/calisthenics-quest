---
type: conceptual
title: The Fog (the game between workouts)
description: The rules around a Fog run in src/lib/fog.ts — zones from the story's chapters, when a zone opens, power from real training, run skills, records — and how a run is loaded and drawn.
tags: [game, fog, rules]
timestamp: 2026-10-31
---

# The Fog

The Play tab's game: a short dungeon crawl where class, skills and gear matter and you can lose.
It follows the rule "training earns, play spends" (see [../product/overview.md](../product/overview.md)):
runs are free to replay, gear comes only from the dungeon, and only real training makes you
stronger and lets you wear what you find. Dying costs what you wore and carried, never points,
level or story.

## Rules (`src/lib/fog.ts`)

- **Zones**: `ZONES` is built from each story chapter's `fog` (written in `src/story/chapters/`),
  one zone per chapter, each with its boss (`BOSS_NAME`).
- **Opening**: `zoneStatus` opens a zone as soon as the zone before it is cleared (Edoardo,
  2026-10-29: win a zone and you move on). Each zone is still built for the start of its chapter
  (`zone.workouts`, `zoneDue`): its monsters are tuned for a player at that point
  (`ZONE_WINS.open`), so a strong player can go in early and win sooner, and anyone else finds it
  hard until they have trained more. The season simulator meets each zone when it is due.
- **Power from training**: `powerOf(state, now)` turns the save into a run's power. The stat
  points the player put into the champion give Health, Armor, Damage, Haste (attack speed), Speed
  (walk speed), see `statPower` in `src/lib/stats.ts` (crit comes from what you wear) and
  [training.md](training.md); each class's attack, body and ability numbers are in
  `src/balance/classes.ts`. The flame's fires circle you at `FLAME_AT` workouts (1, 6, 15, 30); a bonfire throws
  fireballs, a fire fairy heals when you're low. Training in the last two days gives a free run
  skill, resting (a day off or a minute by the fire) one more. `nextGrowth` writes the "train to
  grow" hint (points waiting to be spent, or that workouts earn them).
- **A boss with no hearts left**: every workout takes a heart off the chapter's enemy; once the
  chapter's hearts are gone (all its workouts done) and its boss still stands, `edgeFor` gives the
  run an `Edge`: the boss fights with `EDGE.bossHp` of its HP (the Knight with that share of his
  plates), and each workout since starts a run with one more free skill (`'past'` picks, up to
  `EDGE.picks`). Playing well still beats it sooner. The Play tab's ready strip says how many hearts are left,
  or what the edge gives (`BossEdge` in `PlayTab.tsx`).
- The Ember Road's runs (`ROAD_ZONES`, played Together) keep a story zone's `id` (loot, records,
  toughness) with the road's own names and words, and `guide: 'Tamsin'` speaks after a win. A
  chapter with its own `world` (`Zone.world`, read through `worldOf`) fights in a dungeon of its
  own, with its own boss (`fog.boss`: `lull`, `distance`, `alone`); one without borrows the story
  zone's dungeon and boss as they are. Its hp and dmg are the story zone's times `ROAD_TOUGH`. See [story.md](story.md) and "Worlds" in [dungeon.md](dungeon.md).
- **Run skills**: `UPGRADES` and `rollUpgrades` (three random choices per level-up), `xpToNext`.
  Seventeen skills; Wider choice adds a fourth card. Each has a `kind` (attack, magic, guard, craft) that colors its card; their numbers are
  `RUN_SKILL` in `src/balance/skills.ts`. The level-up pick is `SkillPick`
  (`src/components/SkillPick.tsx`): three cards with the kind's band, the icon (`SKILL_ICONS`),
  level pips, and the skills already taken in a row under them.
- **Records**: `recordRun` saves runs, clears and each zone's bests (deepest, most monsters,
  fastest win) and the last run for the flame to talk about. The mid-boss guards floor
  `MID_FLOOR` (5).

- **Gear between runs** (`src/lib/fog-gear.ts`, saved as `state.fogGear`): what you wear
  (`worn`) and the vault at home (`vault`, `vaultSize` grows with workouts). `wornFor` is what you
  walk in with: only what your hero level and points let you wear today (`heroLevel` in
  `src/lib/game.ts`); the rest stays home, safe.
  `settleGear` runs after `recordRun`. What you wear always comes home, so forged gear is never
  lost (see [forge.md](forge.md)). A win or a walk out by the stairs also puts the bag in the vault
  (the best first, the rest left behind if it's full); a fall loses what you found that run and
  still carry in the bag. Anything you brought from home comes back even if you took it off into
  the bag mid-run. Mid-run, `atRisk` lists the same thing ahead of time (what a fall would take),
  for the HUD's bag, the bag panel and the stairs card. In the bag panel each item carries a green
  ▲ or red ▼ against what you wear in its slot (`betterBy`), and its card says by how much. What a full vault can't take
  is melted into embers. `wearFromVault` and `takeOffToVault` are the vault's buttons
  (`FogGearCard`), and "Melt down" is the forge's `salvage`. The items themselves are in
  [dungeon.md](dungeon.md); Mira's forge in [forge.md](forge.md).

Tested in `src/lib/fog.test.ts` and `src/lib/fog-gear.test.ts`.

## The SPs (`src/lib/sp.ts`)

Like NosTale's specialist cards: each class has four SPs (`SP_CARDS` in
`src/game/dungeon/content.ts`), none stronger than another, each fighting its own way. At
`SP_TRIAL.at` workouts (once you have a class) the Wanderer hands over the first in the `sp-gift`
scene (`src/story/anytime.ts`; its ask `sp` calls `giveSp`) and says what they are: forms that
training wakes in you, this the first. It is sealed until its trial is done (`spTrial`, `spOpen`):
`SP_TRIAL.workouts` more workouts, and a run that reaches the mid-boss's floor (`SP_FLOOR`;
`spAfterRun` after each run, in `page.tsx`); then `sp-awake` plays. The story gives the other three
as surprises after chapters are beaten (`SP_GIFTS`: the scenes `sp-second`, `sp-third`,
`sp-fourth`, each with an ask `{ kind: 'sp', n }`), awake and put on at once (`SpState.more`,
`worn`). Nothing shows an SP before it is yours: the Hero tab lists only the ones you own
(`spOwned`), and you scroll them there and pick the one to wear (`SpCard`, `wearSp`), or take it
off (`setSpOff`). The one worn goes into every run (`spWorn`, a number 1 to 4 or 0;
`HeroSetup.sp`).

| Class | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Warrior | Blaze Reaver (fire, great axe) | Sun Bastion (light, hammer and tower shield) | Riptide Lancer (water, lance) | Nightscythe (shadow, scythe) |
| Archer | Rainstalker (water, long bow) | Flintfire (fire, hand cannon and bomb) | Wolfcaller (light, boomerang and a wolf of light) | Silent Fang (shadow, twin daggers) |
| Mage | Ashcaller (fire, flame staff) | Tidesinger (water, water orb) | Dawnbell (light, bell staff, halo) | Hexedge (shadow, shadow sword) |
| Monk | Dragonheart (fire, gauntlets) | White Claw (light, claws) | Stillwater (water, bo staff) | Voidpalm (shadow, ki in the palms) |

An SP turns you into a different job: its own clothes, headgear and weapon, the boy and the girl
each with their own cut. Each class has one SP of each of the four elements (`SpElement`: fire,
water, light, shadow; `SP_ELEMENTS`, `ELEMENT_NAMES`), and each card has a one-line idea of who
it is (`about`). The element only sets colors and the mark on the card for now; how elements beat
each other and monsters with elements come later. Each SP's weapon changes the basic attack (the
axe cuts all round, the lance reaches far, daggers are quick, the cannon's shot bursts, the
boomerang comes back) and its own attack animation, and its own move and final fit the job:

| Class | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Warrior | Leap / Inferno | Shield Wall / Judgment | Harpoon / Tidal Charge | Reap / Soul Harvest |
| Archer | Piercing Shot / Rain of Arrows | Bomb / Barrage | Call / Pack | Vanish / Thousand Cuts |
| Mage | Fire Wall / Meteor | Bubble / Tsunami | Blessing / Radiance | Curse / Void Edge |
| Monk | Rising Dragon / Dragon Roar | Pounce / Hundred Claws | Tide Spin / River Dance | Ki Wave / Spirit Bomb |

The passives still come from the first design and get redone later. `theme` (`SpTheme`) picks how the SP
storms in when it wakes. See all sixteen, boy and girl, at `/lab/sp`.

Each has the class ability, its own move, a final and a passive that is always on (`SP_PASSIVES`:
Embers burns, Bedrock hardens you standing still, Static sparks, Second Wind heals once a floor,
Tailwind, Frostbite slows, Harvest heals on a kill, Focus crits at full health, Split Star, Crystal
Shell blocks a hit after a dodge, Swift Sands fills the final faster, Rebound hits back, Flow heals
on hits, Momentum builds while you move, Quickstep shortens the dodge, Sunburst bursts every few
hits; how they play: [dungeon.md](dungeon.md)). With an SP on you look the SP's way, but your
weapon, its tier and its forge shine stay yours (`heroSpec`). In a run the own move sits left of
the dodge and the final over the ability (`SpButton` in `FogRun.tsx`; R and F on a keyboard); a
final plays its sound and shows a small badge with its name under your HP (`FinalBadge`), nothing
over the fight (its camera flash skips under reduced motion). Numbers: `SP_TRIAL`, `SP_GIFTS`, `SP_SKILL`, `SP_FINAL`, `SURGE`, `SP_PASSIVE`, `SP_WEAPON` in
`src/balance/classes.ts`.

The scenes show the SP rather than explain it: the Wanderer holds up the card (a line with `art:
'sp-sealed'` or `'sp-awake'`, `spn` naming which SP), and when one wakes a line with `art:
'sp-transform'` plays `SpTransform` over the whole screen: the card rises and turns, the SP's
element storms in (rising, sweeping, converging or in rings, `STYLE`), you burn white, a flash, and
you stand in the SP's look under its name. Worn, you wear that look everywhere you are drawn: the
Fog (`src/game/sheets.ts`), the Hero and Play tabs, the header, the story (`sp` on `<Hero>` and on
`Dialogue`). The looks: `SP_LOOKS` in `src/sprites/characters/spLooks.ts` (see
[sprites.md](sprites.md)).

## The run itself

A run is a dungeon of ten floors per zone, each a map of rooms to explore down to the stairs (a
minimap in the corner fills in as you go), played by a pure engine and drawn by Phaser:
[dungeon.md](dungeon.md) has the files and the how-to table. `src/game/rules.ts` holds numbers
shared between the hero and the engine (speed, HP, attacks) and the sprite sheet names;
`src/game/sheets.ts` builds the sheets a run needs (after the story's finale the hero's are drawn
on fire, `heroVariant` in `src/story/flame.ts`; the regular monsters, `DressedKey`, in the zone's dress,
standing and firing, except a story world's own monsters at home, which are drawn as they are
(`NATIVE` in `src/game/rules.ts`); only the run's own boss, `bossJobs`); `src/game/calm.ts` drops shake and flashes for
`prefers-reduced-motion`.

`src/components/FogRun.tsx` loads `src/game/dungeon/scene.ts` with `import()` only when a run
starts (Phaser is big), and sends each run's start and end to the play stats
([../app/analytics.md](../app/analytics.md)); `PlayTab.tsx` warms the code and sheets while the tab sits idle. A run is
played with the phone held sideways: held upright, `FogRun` holds the run behind a "turn your
phone" card (`usePortrait`), and where the browser allows it (Android, installed) it turns the
screen itself for the run (`useSideways`). The rest of the app stays upright. Sideways, the room
fills the whole screen and the camera follows you in it; the HUD is small and kept to the corners
(see "Sideways on screen" in [dungeon.md](dungeon.md)).
The HUD's parts (`Vitals`, `DepthMap`, `BagButton`, `FloorMap`, `BossBar`, `AbilityButton`) are
memoized: the scene sends the HUD up to ten times a second, and only a part whose data changed
redraws (see "What a frame costs" in [dungeon.md](dungeon.md)).

**The first dungeon.** A new player's opening plays one run before anything else: `FogRun` with
`tutorial` (`{ voice, onDone }`) in `FIRST_FOG_ZONE` (`src/lib/fog.ts`: zone 1's look, monsters and
music, gentler, with the Hollow at the bottom). It shows a tip for where you are (`TutorialTip`:
move, the door, the stairs, the dodge, the bottom; words in `FIRST_FOG_TIPS`,
`src/story/opening.ts`), only the Dodge button (no class yet), no bag, no records, no play stats,
and no recap: the fall goes straight back to the opening. "Skip the dungeon" in the pause menu and
on the "turn your phone" card. The engine side is in [dungeon.md](dungeon.md#the-first-dungeon).

On a computer (mouse or trackpad: `useKeyboardPlay` in `src/components/useDesk.ts`) the run is
played with keys and never asks you to turn anything. The scene's own keys: WASD or the arrows
move, Q is the class ability, R and F the SP's move and final, Space (or E, or Shift) dodges, a click on a monster aims at it; they
do nothing while a card or the bag holds the run. `FogRun`'s keys: Esc or P pauses (and closes
whatever is open), B or I the bag, M the map, 1 2 3 pick a skill, chest or stairs choice, Enter
runs again at the end. Each button shows its key (`Key`), the pause menu lists them all
(`KeyList`), the first tip talks keys, and on a big screen (`desk:`) the HUD is zoomed 1.4x.

## Balance

The rule for every balance number, and the changelog, are in [balance.md](balance.md).
`src/game/power.ts` scores a hero's points, class and gear on one scale (`powerScore`, see
[balance.md](balance.md)).
`pnpm sim` writes snapshots of simulated players (see [../dev/testing.md](../dev/testing.md)), then
`pnpm fog:sim` plays hundreds of bot runs on them per zone and class, and prints the hits the
bot takes a minute (the run recap in `FogRun` shows a person's, to check the bot against people;
`HUMAN='{"notice":0.8}'` turns how human it plays). `DIALS` in `src/balance/dungeon.ts` are the
main knobs. The sim starts every run with the snapshot's points
in what a player would keep by then (`seasonedKit` in `src/sim/seasoned.ts`, `SEASONED` in
`src/balance/dungeon.ts`: the best wearable of earlier finds, forged), and the bot searches every
room; it wears what drops, and wears the SP from
`SP_MODEL_AT` workouts on (`NOSP=1` plays without it, to see what it adds). `GEAR=0` plays in the starter kit instead. Zones are tuned for that
player, so a player who keeps and forges their finds meets the targets, not one in the starter kit.
