---
type: reference
title: The Fog's dungeon (engine, content, scene)
description: How a Fog run is built — data in content.ts, a pure seeded engine, a bot, and a Phaser scene — and which file to edit for each kind of change.
tags: [game, fog, dungeon, phaser]
timestamp: 2026-10-27
---
# The Fog's dungeon

Code: `src/game/dungeon/`. File names below without a folder are in it. The rules around a run
(zones opening, power from training, records) are in [fog.md](fog.md).

```
items.ts            the things you wear, as data: slots, rarity, bonuses, class weapons and armor,
                    names, requirements, the pure rolls (rollRarity, rollItem), and the forge's
                    plus and reroll (boostOf, nameOf, rerollBonus; see forge.md)
content.ts          what a dungeon is made of, as data: ground, rooms, chest items, monsters and how they
                    shoot, each zone's dungeon and mid-boss, the bosses, the classes' abilities
engine.ts           plays it: a pure step function (60 a second, seeded), no Phaser
bot.ts              a player for balance tests (scripts/fog-sim.mjs) and the autopilot
scene.ts            draws a run with Phaser and turns events into sound and sparks
themes.ts           each zone's colors (floor, stone, torches, water)
props.ts            pillars, barrels, chests, shrine, stairs and torches as text rows
src/game/rules.ts   numbers shared with the hero (attack, HP, reach, from the stat points) and the sprite sheet names
src/game/sheets.ts  which sprite sheets a run draws with
```

## How to change things

| I want to... | Edit |
|---|---|
| Tune a monster (HP, speed, how it shoots) | its entry in `MONSTERS` (`content.ts`) |
| Change who lives in a zone, and how deep they show up | the zone's entry in `ZONE_DUNGEONS` (`content.ts`) |
| Add a monster | `MonsterKind` and `MONSTERS` (and a `MEET` line) in `content.ts`; its sprite in `src/sprites/characters/` and `SPRITES`; a `SheetKey` in `src/game/rules.ts`, its sheet in `src/game/sheets.ts`, and its look in `DUNGEON_LOOKS` (`scene.ts`) |
| Add a chest item | `RelicId`, `RELICS` and `RELIC_BOT` in `content.ts`; what it does where engine.ts reads `relic(run, ...)`; its icon in `RELIC_ICONS` (`src/sprites/characters/icons.ts`) |
| Change a mid-boss | its entry in `MIDS` and its numbers (`DIM`, `CREW`, `SAND`, `SWAP`, `GALE`) in `content.ts`; its rule in `stepMid` (`engine.ts`) |
| Change how a boss fights | its entry in `BOSSES` (`content.ts`) and its branch in `steerBoss` (`engine.ts`) |
| Change a boss's art | `BOSS_ART` in `scene.ts`, and its sheets in `src/game/sheets.ts` |
| Add a zone | the chapter's `fog` in `src/story/chapters/`, then an entry in `ZONE_DUNGEONS` and `MIDS` (`content.ts`), `THEMES` (`themes.ts`) and `ZONE_MUSIC` (`src/lib/music-zones.ts`) |
| Change how much easier a boss gets once its chapter's hearts are gone | `EDGE` in `src/lib/fog.ts` (`edgeFor`); the engine reads `edge` (on `HeroSetup`) in `summonBoss` and `newHero` |
| Balance | the `DIALS` in `src/balance/dungeon.ts` (see [balance.md](balance.md)); measure with `pnpm sim`, then `pnpm fog:sim` |
| Change how fast you cross a cleared room | `CLEAR_RUN` in `content.ts` (the engine multiplies the hero's speed by it once a room has no monsters; the scene quickens the steps and the dust) |
| Change how much of the room the screen shows | `FIT` and `fitScreen` in `scene.ts` |
| Change the run's HUD (HP and XP, floor and depth, bag, pause, ability buttons) | `Vitals`, `DepthMap`, `BagButton`, `AbilityButton` in `src/components/FogRun.tsx`; the safe-area classes `run-t`/`run-b`/`run-l`/`run-r`/`run-x` in `src/app/globals.css` |
| Change what the run shows is at risk if you fall | `atRisk` in `src/lib/fog-gear.ts`; `RiskLine` and `Guarded` (the flame's badge) in `src/components/FogRun.tsx` |
| Change how a floor is laid out (how many rooms, branches, shortcuts) | `LAYOUT` and `ROOM_ODDS` in `content.ts`, `makeFloor` in `engine.ts` |
| Change the minimap | `FloorMap` in `src/components/FogRun.tsx` (it reads `Hud.map`, built by `miniMap` in `scene.ts`) |
| Change what a door says | `doorLook` in `scene.ts` (unknown rooms show `UNKNOWN`) |
| Change crits | `CRIT_HIT` in `src/balance/stats.ts`; the roll is in `damage` (`engine.ts`, its own `run.critRnd`), the gold number in `scene.ts` |
| Change where the bot goes on a floor | `route` in `bot.ts` |
| Tune items (how strong, how much they ask, how rare) | `src/balance/items.ts`: `ITEM_POWER` (all finds next to the starter kit), `ITEM_BASE`, `BONUS_SIZE`, `RARITY_SIZE`, `RARITY_WEIGHTS`, `RARITY_LEAN`, `NEED`; then `pnpm balance` and `pnpm fog:tune` |
| Change how often things drop, or the bag's size | `DROPS`, `DROP_LUCK` and `BAG` in `src/balance/items.ts` (read by `kill`, `openChest` in `engine.ts`) |
| Change how often co-op runs drop forge materials | `MAT_DROPS` in `src/balance/upgrades.ts` (`findMats` in `engine.ts`; see [forge.md](forge.md)) |
| Add an item kind or a class's weapon | `WEAPONS`, `ARMORS`, `ItemIcon` (and `ItemArt`, `looksOf`) in `items.ts`; its art in `ITEM_ROWS` and `LEGEND_ROWS` (`src/sprites/characters/items.ts`), and how the hero wears it in `heroSpec` (`src/sprites/characters/hero.ts`), see [sprites.md](sprites.md) |
| Change how an item looks (its kind, the seed that picks its colors) | `looksOf` and `seedOf` in `items.ts` (the seed comes from the name, so one name always looks the same) |
| Add something each hero has (a cooldown, a count, a buff for the run) | `Hero` in `engine.ts` and its start in `newHero` (see "The hero, and the party") |
| Change the bag panel, the pickup note or the stairs card | `BagPanel` and the `stairs` card in `src/components/FogRun.tsx` |

## The hero, and the party

Everything that belongs to a player lives on a `Hero` (`engine.ts`): where they stand, HP, level
and XP, cooldowns, skills (`ups`), chest items (`relics`), class, stat points (`build`), power with
gear on (`power`; `base` is without), gear, the tapped target (`lock`), the picks waiting for them
(`offer`, `relicOffer`, `free`) and what's pushing them (`wind`, `shove`). What belongs to the room
or the run stays on `Run`: the map, monsters, shots, loot on the floor, stairs, the boss, the clock.
A new field about the player goes on `Hero`; one about the place goes on `Run`.

`run.party` holds every hero, you first; `run.hero` is you (`party[0]`), the one this phone plays
and the camera follows. Solo play is a party of one. Co-op adds `RunSetup.friends` (each a
`HeroSetup`: power, class, worn gear, stat points), and `stepRun` takes one `Input` per hero, in
party order. The rules treat every hero the same:

- Functions that act for a hero take it (`moveHero(run, h, input)`, `attack(run, h)`,
  `hurt(run, h, ...)`); a hit names who struck it (`damage(run, by, f, ...)`, `Shot.by`,
  `burst(run, by, ...)`), and that hero gets the kill and the fang heal.
- Monsters, their shots and homing bullets go for the nearest hero still standing (`prey`); shots,
  touch, bombs, barrels, spikes and the Gale hit whoever they reach (`standing`).
- Light (gems) flies to the hero nearest it, and its XP goes to every hero still standing.
- Drops are personal (`dropEach`): each standing hero gets their own item, rolled for their class
  and tagged with their id (`loot[].for`, set only in a party). Only that hero sees and takes it
  (`mine`, used by the pick-up, the bot and the scene). The boss's drop goes into every bag.
- Co-op materials for Mira's forge (`findMats`): only in a party, each standing hero rolls their
  own on kills, chests, the mid-boss, the boss and a clear with nobody down, counted on
  `Hero.mats` (a `mat` event for you) and handed home in `RunEnd.mats`. A solo run never calls
  the rng for them, so solo replays are unchanged ([forge.md](forge.md)).
- A hero at 0 HP is down (`fall`) and stops acting; the run ends when the whole party is down.
  `RunEnd` is still yours.
- A pick (skill or chest item) by anyone still holds the whole run (`choosing`), and the stairs ask
  once for everyone: changing that is the next co-op step. The Summit's friends walk beside you.

**A practice party run** (until the game server exists): the scene takes `RunSetup.friends`
(name, class and their own hero sheets from `friendSheets` in `src/game/sheets.ts`) and `seed`,
gives each friend your strength in their own class, steps them with `botInput`, takes their picks
for them, and draws them with their name over their head (grey while down). Started from a
party's lobby, or `/lab/night` "A party run (practice)" (`?run=0&party`).

The plan is in the "FORMA co-op Fog" doc (project thread "Explore multiplayer dungeon runs with
friends"). `engine.test.ts` ("a party") plays a two-bot run to the end.

## Floors and the map

Each floor is a map of rooms (`makeFloor` in `engine.ts`, from its own seed, so fights don't change
it): a winding way east from the first room to the last, `LAYOUT.rooms` long, and `LAYOUT.side`
rooms (give or take one) off to the side, where a dead end most often holds a chest or a shrine
(`ROOM_ODDS`). Now and then two rooms side by side share a door, so there's more than one way
round. The last room is the stairs, the mid-boss (`wardenFloor`) or the boss, and has one door, the
way in from the west. `run.map` holds the cells; `cellOf(run)` is the room you're in, and
`isBossRoom`/`isWardenRoom` read its kind. A room deeper in (`Cell.dist`) holds more monsters.

A room's doors are in the middle of its walls, one for each room it joins (`Side`: e, w, n, s, named
for the map; the engine's top wall is east, its left wall north). They're shut while monsters
stand. Walking back into a room you cleared finds it as you left it (`Cell.kept`), doors open and
nothing to fight. Clearing the last room puts the stairs down in it (`run.stairs`); walking onto
them asks (`run.stairsAsk`, the run holds still): go deeper (`downStairs`, HP full), leave with
what you carry (`takeStairs(run, 'leave')` ends the run with `why: 'left'`), or not yet. The bot
always goes deeper. The stairs card shows what a fall on the next floor would cost (see "Items and
the bag"); in developer mode the pause menu's "The stairs card" opens it anywhere (`askStairs`). Cells are `seen` once you've stood next door to them. A door
you haven't been through says nothing about what waits behind it (`doorLook` in `scene.ts`: a
gray "?"), and the minimap draws a seen room you haven't been in as a gray dashed "?" whatever it
is, the stairs and the boss too; you only learn a room by going in. (The bot still reads `kind`
for its route, so the simulators play a player who knows the floor.) The bot explores (`route`): the nearest room it hasn't been in, a shrine when
hurt, and the stairs once it has been in most of the floor.


## Items and the bag

Monsters (elites and golems more often), chests, the mid-boss and the boss drop items (`dropItem`,
odds in `DROPS`, `src/balance/items.ts`): rolled by `newItem` for the zone, the floor and your class, rarer deeper down and
from bigger foes. They lie on the floor (`run.loot`, kept with the room in `Cell.kept`); the scene
draws each with its own art (`itemTexture`: the item's drawing from
`src/sprites/characters/items.ts`, made into a texture once), its name in its rarity's color, and a
beam over rare ones (`syncLoot`). Walking over one puts it in the bag (`run.hero.gear.bag`, `BAG` slots), unless it's full.

You wear three things: a weapon and armor made for your class, and a charm. A run starts in what
the save says you wear (`RunSetup.worn`), the starter kit (`starterKit`) filling an empty weapon or
armor slot. An item asks for stat points (`need`, checked against `RunSetup.build` by `shortOf`):
weapons the class's own stat, armor Armor, charms nothing. `wear`, `takeOff` and `dropFromBag`
change gear mid-run (the page pauses while the bag is open); `applyGear` puts what you wear on top
of your power from training (`run.hero.base`). The run's end (`RunEnd.gear`) lists what you wore and
carried, never the starter kit; `src/lib/fog-gear.ts` settles it into the save
(see [fog.md](fog.md)). The bot wears what it picks up when it's better (`botWear`) and picks up
loot once a room is clear.

What you'd lose is always on show: `atRisk` (`src/lib/fog-gear.ts`, the same rule as
`settleGear`) says which worn item the flame would hold (`held`, the `guard` slot while you've
trained in the last 2 days), which one it would hold if you trained (`cold`), and what the Fog
would take (`lost`; never the starter kit). The bag button in the HUD has a red count of `lost`
and a small flame while one is held; the bag panel and the stairs card show the tiles
(`RiskLine`), with a flame badge (`Guarded`) on the kept one: "Kept by Pip if you fall".

## Sideways on screen

The phone is held sideways in a run, and the room fills the whole screen, no black bands: the
camera zooms until the room covers it both ways and follows you inside it, up and down as well as
along (`fitScreen`). `FIT.see` keeps it readable on a short screen (at least that much of the
room's height shows), and `FIT.hud` leaves a strip above the top wall for the HUD. What's off the
screen gets a mark on its edge (`drawPad`). The HUD over it (`FogRun.tsx`) stays small and in the
corners, clear of the notch: HP and level top left, the floor and its depth row top middle (with
the boss bars under it), bag, pause and minimap top right, Dodge and the class ability under the
right thumb; the left half is free for the move stick.

On a computer the scene reads the keyboard too (`create`): WASD or the arrows feed `stickInput`
like the stick, Q asks for the ability and Space, E or Shift for the dodge, ignored while the run
holds still; `setPaused` lets go of every key so nothing keeps walking after a pause. The other
keys (pause, bag, map, cards) are `FogRun`'s, see [fog.md](fog.md).

The engine plays every room standing up (the way on, east, is
its top wall); the scene shows it on its side, so on screen east is to the right. `P(x, y)` in `scene.ts` turns an engine point into a screen point (the room's height
becomes the screen's width). The floor, walls, water and the effects in engine points (`fade`) are
drawn on layers turned a quarter (`turn`); people, monsters, props, spike tips, shadows and words
stand upright at `P`. The stick is turned back the other way in `stickInput`. The turn lives only in the scene, so a
new drawing in engine points goes on a turned layer (or through `fade`), and anything that must stay
upright goes through `P` (or `fade(..., true)`).

A tap on a monster aims your attacks at it while it's in reach (`Input.lock`, `run.hero.lock`,
`locked` in `engine.ts`); a second tap lets go. The bot never locks.

Effects are capped (`FX_CAP` in `scene.ts`: particles and faded drawings alive at once) so a
pile-up can't stall a slow phone; real fights peak far below the caps.

`pnpm test` replays a whole bot run in every zone (`engine.test.ts`): a refactor keeps those
replays exactly as they were, and a balance change moves them on purpose (`pnpm test -u`).
Hot loops (shots, pillars, barrels) test distance with `closer` / `farther`: a box test, then the
exact `Math.hypot`, so they give the same answers and replays stay put (see `dev/testing.md`).
