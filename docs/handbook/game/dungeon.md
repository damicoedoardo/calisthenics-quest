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
| Balance | the `DIALS` in `content.ts`; measure with `pnpm sim`, then `pnpm fog:sim` |
| Change how much of the room the screen shows | `fitScreen` in `scene.ts` |
| Change how a floor is laid out (how many rooms, branches, shortcuts) | `LAYOUT` and `ROOM_ODDS` in `content.ts`, `makeFloor` in `engine.ts` |
| Change the minimap | `FloorMap` in `src/components/FogRun.tsx` (it reads `Hud.map`, built by `miniMap` in `scene.ts`) |
| Change where the bot goes on a floor | `route` in `bot.ts` |

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
them goes down (`downStairs`). Cells are `seen` once you've stood next door to them, which is what
the minimap shows. The bot explores (`route`): the nearest room it hasn't been in, a shrine when
hurt, and the stairs once it has been in most of the floor.


## Sideways on screen

The phone is held sideways in a run. The engine plays every room standing up (the way on, east, is
its top wall); the scene shows it on its side, so on screen east is to the right. `P(x, y)` in `scene.ts` turns an engine point into a screen point (the room's height
becomes the screen's width). The floor, walls, water and the effects in engine points (`fade`) are
drawn on layers turned a quarter (`turn`); people, monsters, props, spike tips, shadows and words
stand upright at `P`. The stick is turned back the other way in `stickInput`. The turn lives only in the scene, so a
new drawing in engine points goes on a turned layer (or through `fade`), and anything that must stay
upright goes through `P` (or `fade(..., true)`).

A tap on a monster aims your attacks at it while it's in reach (`Input.lock`, `run.lock`,
`locked` in `engine.ts`); a second tap lets go. The bot never locks.

Effects are capped (`FX_CAP` in `scene.ts`: particles and faded drawings alive at once) so a
pile-up can't stall a slow phone; real fights peak far below the caps.

`pnpm test` replays a whole bot run in every zone (`engine.test.ts`): a refactor keeps those
replays exactly as they were, and a balance change moves them on purpose (`pnpm test -u`).
Hot loops (shots, pillars, barrels) test distance with `closer` / `farther`: a box test, then the
exact `Math.hypot`, so they give the same answers and replays stay put (see `dev/testing.md`).
