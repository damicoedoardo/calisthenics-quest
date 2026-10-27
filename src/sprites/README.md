# Sprites

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
                      kindled (the flame's true form), villagers (Lia, Sol, the kid), and the chapter
                      enemies tomorrow, mirror, plateau, summit, and the Fog's wisp, plus the
                      dungeon's monsters: ram, smoke (the Smoker), seeker, splitter (and the
                      Splitling), shade
characters/pixel.ts   text-row art: paintRows (one character per pixel) and shifted
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
| Redraw old Vela (hair, softer eyes, shawl, lamp, cane) | `characters/vela.ts`: her lamp raise is the `raise` clip in `clips.ts` |
| Redraw the flame's true form (the finale's fire kid) | the `ROWS` and `TIPS` text art in `characters/kindled.ts` (`LOCKS` is the long hair a long or pony look gets) |
| Change a story backdrop's props (Vela's lamp tower, the road, a campfire) | its function in `places.ts` (`lampTower`, `road`...); which place has which props is in `src/story/places.ts` |
| Change the looks a player starts with (boy, girl) | `STARTER_LOOKS` in `characters/hero.ts`; the editor's options are in `src/components/LookEditor.tsx` |
| Redraw a dungeon monster | the `ROWS` text art in its file (`ram.ts`, `smoke.ts`, `seeker.ts`, `splitter.ts`, `shade.ts`); its palette sits under the rows |
| Change which sprite a dungeon monster uses, or its size | `DUNGEON_LOOKS` in `src/game/dungeon/scene.ts` (a new sheet also needs a `SheetKey` in `src/game/rules.ts` and a line in `sheets` in `FogRun.tsx`) |
| Redraw the dungeon's pillars, barrels, chests, shrine, torches | the text rows in `src/game/dungeon/props.ts` (floor, walls, door and water are drawn in `scene.ts`) |
| Add a character | a file in `characters/`, then an entry in `SPRITES` (`registry.ts`) |
| Use art from Aseprite or PixelLab | see below |

Sprites are drawn on a 64x64 grid. The body and hair are designed at 32x32 ("body pixels") and
doubled with Scale2x, so one body pixel is two sprite pixels. The manga head is the exception: it is
drawn straight at 64 so the eyes and hair locks stay sharp. Each layer gets an outline and
light/shadow edges automatically.

### Text-row art

The dungeon's monsters and the flame's true form are hand-drawn as text: 32 rows of 32 characters, each character a color
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

Creatures (Ember, the Book, the enemies) read the same frames their own way: `hover` is an
eight-frame float where `bob` is the breath, and `lunge` is their attack, a wind-up
(`right: 'up'`) and then the hit (`fx: 'impact'`).

The hero is drawn with the player's look (body, hair, hair color, skin), which `<LookProvider>`
hands to every `<Hero />` on screen, so the Echo, the Best Self and the Hollow match the player.

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
