---
type: conceptual
title: The Fog (the game between workouts)
description: The rules around a Fog run in src/lib/fog.ts — zones from the story's chapters, when a zone opens, power from real training, run skills, records — and how a run is loaded and drawn.
tags: [game, fog, rules]
timestamp: 2026-10-28
---

# The Fog

The Fog tab's game: a short dungeon crawl where class, skills and gear matter and you can lose.
It follows the rule "training earns, play spends" (see [../product/overview.md](../product/overview.md)):
runs are free to replay, gear comes only from the dungeon, and only real training makes you
stronger and lets you wear what you find. Dying costs what you wore and carried, never points,
level or story.

## Rules (`src/lib/fog.ts`)

- **Zones**: `ZONES` is built from each story chapter's `fog` (written in `src/story/chapters/`),
  one zone per chapter, each with its boss (`BOSS_NAME`).
- **Opening**: `zoneStatus` opens a zone when its chapter has started and the zone before it is
  cleared.
- **Power from training**: `powerOf(state, now)` turns the save into a run's power. The stat
  points the player put into the champion give Health, Armor, Damage, Haste (attack speed), Speed
  (walk speed) and Crit, see `statPower` in `src/lib/stats.ts` and
  [training.md](training.md); each class's attack, body and ability numbers are in
  `src/balance/classes.ts`. The flame's fires circle you at `FLAME_AT` workouts (1, 6, 15, 30); a bonfire throws
  fireballs, a fire fairy heals when you're low. Training in the last two days gives a free run
  skill, resting (a day off or a minute by the fire) one more. `nextGrowth` writes the "train to
  grow" hint (points waiting to be spent, or that workouts earn them).
- **A boss with no hearts left**: every workout takes a heart off the chapter's enemy; once the
  chapter's hearts are gone (all its workouts done) and its boss still stands, `edgeFor` gives the
  run an `Edge`: the boss fights with `EDGE.bossHp` of its HP (the Knight with that share of his
  plates), and each workout since starts a run with one more free skill (`'past'` picks, up to
  `EDGE.picks`). Playing well still beats it sooner. The Fog tab's ready strip says how many hearts are left,
  or what the edge gives (`BossEdge` in `PlayTab.tsx`).
- **Run skills**: `UPGRADES` and `rollUpgrades` (three random choices per level-up), `xpToNext`.
- **Records**: `recordRun` saves runs, clears and each zone's bests (deepest, most monsters,
  fastest win) and the last run for the flame to talk about. The mid-boss guards floor
  `MID_FLOOR` (5).

- **Gear between runs** (`src/lib/fog-gear.ts`, saved as `state.fogGear`): what you wear
  (`worn`) and the vault at home (`vault`, `vaultSize` grows with workouts). `wornFor` is what you
  walk in with: only what your points let you wear today; the rest stays home, safe.
  `settleGear` runs after `recordRun`: a win or a walk out by the stairs keeps what you wore and
  puts the bag in the vault (the best first, the rest left behind if it's full); dying loses all
  of it, except the one item your flame holds and gear forged to +10 or more, which comes home a few pluses lower (see [forge.md](forge.md)). Mid-run, `atRisk` says
  the same thing ahead of time (what a fall would take, what the flame would hold, or would hold
  if you trained), for the HUD's bag, the bag panel and the stairs card. In the bag panel each item carries a green
  ▲ or red ▼ against what you wear in its slot (`betterBy`), and its card says by how much. What a full vault can't take
  is melted into embers. `wearFromVault` and `takeOffToVault` are the vault's buttons
  (`FogGearCard`), and "Melt down" is the forge's `salvage`. The items themselves are in
  [dungeon.md](dungeon.md); Mira's forge and the flame in [forge.md](forge.md).

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
it is (`about`). The element only sets colors and the mark on the card for now; the moves and
passives below still come from the first design and get redone to fit each job, and how elements
beat each other and monsters with elements come later. `theme` (`SpTheme`) picks how the SP
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
over the fight. Numbers: `SP_TRIAL`, `SP_GIFTS`, `SP_SKILL`, `SP_FINAL`, `SURGE`, `SP_PASSIVE` in
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
on fire, `heroVariant` in `src/story/flame.ts`); `src/game/calm.ts` drops shake and flashes for
`prefers-reduced-motion`.

`src/components/FogRun.tsx` loads `src/game/dungeon/scene.ts` with `import()` only when a run
starts (Phaser is big); `PlayTab.tsx` warms the code and sheets while the tab sits idle. A run is
played with the phone held sideways: held upright, `FogRun` holds the run behind a "turn your
phone" card (`usePortrait`), and where the browser allows it (Android, installed) it turns the
screen itself for the run (`useSideways`). The rest of the app stays upright. Sideways, the room
fills the whole screen and the camera follows you in it; the HUD is small and kept to the corners
(see "Sideways on screen" in [dungeon.md](dungeon.md)).

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
