---
type: reference
title: Sprites and animation
description: All pixel art is code in src/sprites — the 64x64 figure engine, manga head, text-row art, clips, the registry, PNG sheets, fingerprint tests, and where to edit what.
tags: [game, sprites, pixel-art]
timestamp: 2026-10-27
---
# Sprites

Code: `src/sprites/`. File names below without a folder are in it.

All character art lives here. Components never draw art. They render
`<Sprite id="..." />` (`src/components/Sprite.tsx`) or a thin wrapper like `<Hero />`.
Open **/lab** in the app to see every sprite and animation, with controls for class, gear tier,
variant and look.

```
palette.ts            every color ramp (materials, hair, skin, story looks)
clips.ts              animations as data: frames + timing
registry.ts           every sprite by id, and how to get its sheet
engine/grid.ts        pixel grids and drawing tools (painter, outline, shading, aura, tint)
engine/figure.ts      the base 64x64 humanoid: body, face, hair, arms, layer order
engine/manga.ts       the manga head (the hero's default): face as text art, hair as shapes
parts/weapons.ts      sword, stick, staff, wand, bow
characters/*.ts       one file per character: hero, wanderer, mira, ember, book, vela (old Vela),
                      kindled (a kid made of fire, from the old finale; no scene uses it now), villagers (Lia, Sol, the kid), and the chapter
                      enemies tomorrow, mirror, plateau, summit, and the Fog's wisp, plus the
                      dungeon's monsters: ram, smoke (the Smoker), seeker, splitter (the
                      Splitling, and splitterPop, its one-shot death), shade, and the mid-boss
                      warden (the Warden of the Ashes); the dungeon bosses: glass.ts
                      (mirrorBoss, you in glass, and mirrorBossShatter), knight.ts (knightBoss,
                      stage 0-2), monolith.ts (plateauBoss, stage 0-2), hollowBoss.ts (hollowBoss
                      and hollowBossFade), summitSpirit.ts (summitBoss)
characters/pixel.ts   text-row art: paintRows (one character per pixel) and shifted
characters/icons.ts   app icons as text rows: the six keepsakes (Hero tab, sprite `keepsake`) and
                      what a day held in the Book of Days (sprite `dayIcon`), the dungeon's
                      relics (`relicIcon`), the ability and Dodge buttons (`abilityIcon`), the run's
                      level-up skills (`skillIcon`), the floor track's Warden and boss (`markIcon`), and
                      the Fog's items, by `ItemIcon` (`itemIcon`, also drawn on the floor by the scene)
characters/exercise.ts the workout demos (sprite `exercise`, opts { exercise, gear, look, kit }): you
                      doing each exercise of the program (hand-posed), one rep per loop of the
                      16-frame `rep` clip, or one of the exercise library's movements from moves.ts
characters/moves.ts   the exercise library's 81 movements (lifts, machines, core, cardio, stretches,
                      mobility) and the gear each can hold (`Kit`: barbell, dumbbell, cable, band...)
engine/skeleton.ts    the jointed skeleton both use: IK elbows and knees, props (bench, bar, floor),
                      weights, cables and bands, and how the figure is drawn
characters/worlds.ts  the Play tab's world picker: the big padlock on a shut world (`worldLock`) and the
                      bank of fog that drifts over it (`fogBank`)
characters/install.ts the install guide's pictures (`installStep`, opts { step }): a small phone with
                      the button to tap ringed in gold, drawn on a character grid
characters/zoned.ts   the regular monsters' zone variants ({ zone: 1-5 }): recolored onto the zone's
                      ramp and dressed (lake glass and drips, forge scrap and glowing cracks,
                      plateau sandstone, fog mist, summit ice)
```

## How to change things

| I want to... | Edit |
|---|---|
| Change a color everywhere | `palette.ts` |
| Make an animation faster, slower, longer, or move an arm in it | that clip in `clips.ts` (`ms`, `frames`) |
| Add a new animation | add a clip in `clips.ts`, then point a sprite's `clips` at it in `registry.ts` |
| Change which animation a class attacks with | `heroAttack` in `characters/hero.ts` |
| Reshape the body (legs, torso, head, shoulders) | `BODY` in `engine/figure.ts` |
| Change the hero's face (eyes, chin, mouth) | the `MANGA_FACE.art` text rows in `engine/manga.ts` |
| Change the hero's hair (spikes, bangs, headband) | its entry in `MANGA_HAIR` (`engine/manga.ts`): each lock is a list of points |
| Change the hero's default look | `DEFAULT_LOOK` in `characters/hero.ts` |
| Add a hairstyle | a new entry in `HAIRSTYLES` (`engine/figure.ts`), plus one in `MANGA_HAIR` for the manga head (without it, that style falls back to the classic head) |
| Change the classic face | `EYE_PATTERN` and `FACE` in `engine/figure.ts` |
| Redraw a weapon | `parts/weapons.ts` |
| Change armor tiers, capes, shields | `heroSpec` layers in `characters/hero.ts` |
| Redraw Mira, Ember, the Book or a chapter enemy | its file in `characters/` (`mira.ts`, `ember.ts`, `book.ts`, `tomorrow.ts`, `mirror.ts`, `plateau.ts`, `summit.ts`) |
| Change how Lia, Sol or Vela look once you've helped them | `LIA_AFTER`, `SOL_AFTER` in `characters/villagers.ts`, `VELA_AFTER` in `vela.ts`; drawn with `{ after: true }`, and in the story by the cast ids `lia-after`, `sol-after`, `vela-after` |
| Redraw old Vela (hair, softer eyes, shawl, lamp, cane) | `characters/vela.ts`: her lamp raise is the `raise` clip in `clips.ts` |
| Redraw the fire kid (unused since the finale changed) | the `ROWS` and `TIPS` text art in `characters/kindled.ts` (`LOCKS` is the long hair a long or pony look gets) |
| Change a story backdrop's props (Vela's lamp tower, the road, a campfire) | its function in `places.ts` (`lampTower`, `road`...); which place has which props is in `src/story/places.ts` |
| Change Vela's far tower on the Plateau, or how its lamp flashes | `FAR_TOWER` rows in `places.ts`; a place with it is drawn lit and unlit, and the `beacon` animation in `tailwind.config.ts` flashes the lit copy |
| Change the looks a player starts with (boy, girl) | `STARTER_LOOKS` in `characters/hero.ts`; the editor's options are in `src/components/LookEditor.tsx` |
| Redraw a dungeon monster | the `ROWS` text art in its file (`ram.ts`, `smoke.ts`, `seeker.ts`, `splitter.ts`, `shade.ts`); its palette sits under the rows |
| Change which sprite a dungeon monster uses, or its size | `DUNGEON_LOOKS` in `src/game/dungeon/scene.ts` (a new sheet also needs a `SheetKey` in `src/game/rules.ts` and its sheet in `src/game/sheets.ts`) |
| Redraw the dungeon's pillars, barrels, chests, shrine, stairs, torches | the text rows in `src/game/dungeon/props.ts` (floor, walls, door, water and spikes are drawn in `scene.ts`) |
| Fix an exercise demo's form (depth, lean, where the hands go) | its case in `poseFor` (`characters/exercise.ts`); a new exercise in the plan (`src/lib/program.ts`) needs one too (a test checks every plan exercise has a demo) |
| Fix a library movement's demo, or add one | its case in `frame` (`characters/moves.ts`); a new one also needs an id in `MOVES`, coaching and a classifier rule, see [exercise-library.md](exercise-library.md) |
| Change how a zone dresses its regular monsters | `ZONE_RAMPS` (colors) and the zone's branch of `dress` in `characters/zoned.ts`; the sprites that take `{ zone }` are the `zoned(...)` entries in `registry.ts` |
| Change a zone's dungeon colors (floor, stone, torch fire, water) | its entry in `THEMES` (`src/game/dungeon/themes.ts`); in developer mode the Fog's pause menu has a Theme button that cycles them |
| Add a character | a file in `characters/`, then an entry in `SPRITES` (`registry.ts`) |
| Use art from Aseprite or PixelLab | see below |

Sprites are drawn on a 64x64 grid. The body and hair are designed at 32x32 ("body pixels") and
doubled with Scale2x, so one body pixel is two sprite pixels. The manga head is the exception: it is
drawn straight at 64 so the eyes and hair locks stay sharp. Each layer gets an outline and
light/shadow edges automatically.

### Text-row art

The dungeon's monsters and the fire kid are hand-drawn as text: 32 rows of 32 characters, each character a color
from the sprite's palette (`'.'` is empty). `paintRows` puts them on a 32x32 grid, Scale2x doubles it
to 64x64, then `autoshade` and `outline` run as for every sprite. Eyes, sparks and other fine
details go on top at 64x64 with the painter, and the animation moves whole layers (`shifted`) or
swaps a few rows per frame. To redraw one, edit its rows and open /lab.

## Animations

A clip is `{ frames, ms, loop }`. Each frame says only what differs from rest:

```ts
swing: { ms: 120, loop: false, frames: [{}, { right: 'up' }, { right: 'fwd', fx: 'slash' }, {}] },
```

Any number of frames works: the sheet is as wide as the clip, and the CSS animation's step count
and duration come from the clip. Looping clips (idle) repeat; the others play once and fire
`onEnd`.

The hero's `walk` clip (played in a run while you move, sheet `heroWalk`) lifts one foot, then the
other (`step`: the lifted leg is drawn shorter, its boot higher), with a one-pixel dip between
steps, so the hero walks on the ground instead of floating.

Creatures (Ember, the Book, the enemies) read the same frames their own way: `hover` is an
eight-frame float where `bob` is the breath, and `lunge` is their attack, a wind-up
(`right: 'up'`) and then the hit (`fx: 'impact'`).

The hero is drawn with the player's look (body, hair, hair color, skin), which `<LookProvider>`
hands to every `<Hero />` on screen, so the Echo, the Best Self and the Hollow match the player.
The `kindled` variant is the hero once the flame has fused with them in the finale: a red and
orange fire aura that flickers (it stands in for the top-tier gear glow).

Long lists show stills, not sheets: `stillFor(id, action, opts, frame)` (`registry.ts`) draws a
single frame once and caches it (the exercise library's rows draw one as each row scrolls in).

## Using a PNG sprite sheet

Drop the PNG in `public/sprites/`, one row per action, all frames the same size, then register it:

```ts
hero: {
  kind: 'image',
  label: 'Hero',
  src: '/sprites/hero.png',
  frame: { w: 64, h: 64 },
  columns: 6, // frames in the widest row
  rows: 2,
  clips: {
    idle: { row: 0, frames: 4, ms: 200, loop: true },
    attack: { row: 1, frames: 6, ms: 90, loop: false },
  },
},
```

Nothing else changes: every `<Sprite id="hero" />` picks it up. Keep the code-drawn version around
if gear needs to recolor it, because a PNG can't follow gear tiers on its own.

## Tests

`sprites.test.ts` draws every sprite and action and keeps a fingerprint of the pixels. After an art
change you meant to make, run `pnpm test -- -u` to accept the new fingerprints. If you didn't mean to
change any art, a failing fingerprint means something broke.
