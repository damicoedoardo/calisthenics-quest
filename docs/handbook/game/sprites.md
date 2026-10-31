---
type: reference
title: Sprites and animation
description: All pixel art is code in src/sprites — the 64x64 figure engine, manga head, text-row art, clips, the registry, PNG sheets, fingerprint tests, and where to edit what.
tags: [game, sprites, pixel-art]
timestamp: 2026-10-31
---
# Sprites

Code: `src/sprites/`. File names below without a folder are in it.

All character art lives here. Components never draw art. They render
`<Sprite id="..." />` (`src/components/Sprite.tsx`) or a thin wrapper like `<Hero />`.
Open **/lab** in the app to see every sprite and animation, with controls for class, gear tier,
variant and look.

```
palette.ts            every color ramp (materials, hair, skin, eye colors, story looks)
clips.ts              animations as data: frames + timing
registry.ts           every sprite by id, and how to get its sheet
engine/grid.ts        pixel grids and drawing tools (painter, outline, shading, aura, tint)
engine/figure.ts      the base 64x64 humanoid: body, face, hair, arms, layer order
engine/manga.ts       the manga head (the hero's default): face as text art, hair as shapes
engine/drawn.ts       the hero's hand-drawn body (`body: 'block'` gives the old block body)
parts/weapons.ts      sword, stick, staff, wand, bow
parts/spWeapons.ts    the SPs' own weapons, one entry each in `SP_WEAPON_ART` keyed by the SP card's `weapon`
                      (`{ draw, hands, clip, stance }`: its drawing, what it puts on the hands, its attack
                      clip, its stance); `held` paints one along the hand's aim, `along` finds a point on it,
                      `trail`, `burst`, `ring` draw a weapon's own attack marks from the frame's `fx`
parts/spColors.ts     the colors the SP looks and weapons share
characters/*.ts       one file per character: hero, wanderer, mira, ember, book, vela (old Vela),
                      kindled (a kid made of fire, from the old finale; no scene uses it now), villagers (Lia, Sol, the kid, and Tamsin of the Ember Road), and the chapter
                      enemies tomorrow, mirror, plateau, summit, and the Fog's wisp, plus the
                      dungeon's monsters: lancer (the Lancer Husk, kind `ram`), clock (the Snooze
                      Clock, kind `book`), jar.ts (the Excuse Jar, kind `splitter`, its Jar Imps
                      `imp`, kind `splitling`, and jarPop, its one-shot death), smoke (the Smoker,
                      a soot imp), seeker, shade, ashGolem (the big
                      one at the end of each floor; the story's `golem` stays the Plateau), and the mid-boss
                      warden (the Warden of the Ashes); the dungeon bosses: tomorrow.ts
                      (tomorrowBoss, under its quilt with its alarm clock), glass.ts
                      (mirrorBoss, you in glass, and mirrorBossShatter), knight.ts (knightBoss,
                      stage 0-2), monolith.ts (plateauBoss, stage 0-2), hollowBoss.ts (hollowBoss
                      and hollowBossFade), summitSpirit.ts (summitBoss)
characters/pixel.ts   text-row art: paintRows (one character per pixel) and shifted
characters/icons.ts   app icons as text rows: the six keepsakes (on each cleared world in the Play tab, sprite `keepsake`) and
                      what a day held in the Book of Days (sprite `dayIcon`), the dungeon's
                      relics (`relicIcon`), the ability and Dodge buttons (`abilityIcon`), the four elements' marks (`elementIcon`, `ELEMENT_ICONS`), the SP's moves and finals (`spIcon`, `SP_ICONS`: a drawing of its own in `SP_ROWS`, else its kind of move in `SHAPED`, in the colors of its SP's element, `ELEMENT`), the run's
                      level-up skills (`skillIcon`), the floor track's Warden and boss (`markIcon`), and the screens' small marks with the tab bar's five (`uiIcon`, `UI_ICONS`: Today, Train, Play, Friends, Hero, and the Friends tab's `gift`, `cheer`, `addFriend`) and the loot icons (`xp`, `point`, `coin`, `mat`, with `flame` for embers)
characters/items.ts   the Fog's items (sprite `item`, opts `ItemLook` { art, rarity, seed }): one 24x24
                      text-row drawing per kind (`ITEM_ROWS`: sword, bow, staff, wand, heavy, light, robe,
                      ring, amulet, token, band) and one of its own for each kind's legendary
                      (`LEGEND_ROWS`), on a 32x32 frame; `itemColors` picks the colors from rarity
                      and seed (also drawn on the floor by the scene, and worn by the hero)
characters/spLooks.ts  each SP's look, four per class (`SP_LOOKS`, `spLook(classId, n)`): the dress it wears (plate, jerkin or robe) in its
                      colors, its own headgear (a horned helm, a fin crest, hoods, goggles, a straw
                      hat, a halo) and a `pet` (the Wolfcaller's wolf). Its weapon is not part of the
                      look: `spWeapon(classId, n)` finds it in `SP_WEAPON_ART` (parts/spWeapons.ts)
                      through the card's `weapon`; with it, no shield, quiver or orb. A girl gets her own cut where it matters (braids, a ponytail, a circlet
                      instead of a helm; a short skirt where the look sets `skirt`, `spGirlCut`).
                      Colors follow the element: fire red and orange, water blue, light white and
                      gold, shadow black and violet. The hero wears it with `sp: n` (`true` is the
                      first); all sixteen, boy and girl: `/lab/sp`
characters/spCard.ts  the SP card (sprite `spCard`, opts { classId, n, awake, gear, look }): a 48x64 card, you in
                      the SP's look from the chest up in its window; sealed it is ash with a crack of light
characters/exercise.ts the workout demos (sprite `exercise`, opts { exercise, gear, look, kit }): you
                      doing each exercise of the program (hand-posed), one rep per loop of the
                      16-frame `rep` clip, or one of the exercise library's movements from moves.ts
characters/moves.ts   the exercise library's 81 movements (lifts, machines, core, cardio, stretches,
                      mobility) and the gear each can hold (`Kit`: barbell, dumbbell, cable, band...)
engine/skeleton.ts    the jointed skeleton both use: IK elbows and knees, props (bench, bar, floor),
                      weights, cables and bands, and how the figure is drawn
characters/worlds.ts  the Play tab's world picker: the big padlock on a shut world (`worldLock`) and the
                      bank of fog that drifts over it (`fogBank`)
characters/zoneFoes.ts the story worlds' own monsters, five per world (zones 2-6), painted by pose
                      like lancer.ts: Mirror Lake's lakeEcho, swan, frog, eel, lily; the Cold
                      Forges' measure, squire, rat, bat, kiln; the Plateau's mole, devil, scarab,
                      cactus, lizard; the Fog's maybe, undertow, moth, hound, shroom; the Summit's
                      hawk, cairn, yeti, frost, boulder. Drawn in their own world's colors; dressed
                      (zoned.ts) only when they turn up in another world (`NATIVE` in
                      `src/game/rules.ts`)
characters/install.ts the install guide's pictures (`installStep`, opts { step }): a small phone with
                      the button to tap ringed in gold, drawn on a character grid
characters/zoned.ts   the regular monsters' zone variants ({ zone: 1-6, a world }): recolored onto the
                      zone's ramp and dressed (lake glass and drips, forge scrap and glowing cracks,
                      plateau sandstone, fog mist, summit ice, the Whetstone Pass's slate with a
                      honed steel edge and sparks, the Quiet Miles' night mist with a lantern glint,
                      the Long Bridge's plank wood with a rope lashing)
characters/whetstone.ts  the Ember Road's first world: the Grinder (`grinder`, a runaway whetstone),
                      the Bellows mid-boss (`bellowsMid`) and the Lull (`lullBoss`), a mossy giant
                      who sings
characters/quietmiles.ts  the second: the Unsent (`unsent`, a letter never sent), the Silent Bell
                      (`bellMid`) and the Distance (`distanceBoss`, fog with a lantern-glass face)
characters/longbridge.ts  the third: the Loner (`loner`, behind a round shield), the Tollkeeper
                      (`tollMid`), the One Who Walks Alone (`aloneBoss`, opts { stage: 0-2 }, plates
                      falling, then the helm off) and the Road Banner (`roadBanner`)
```

## How to change things

| I want to... | Edit |
|---|---|
| Change a color everywhere | `palette.ts` |
| Make an animation faster, slower, longer, or move an arm in it | that clip in `clips.ts` (`ms`, `frames`) |
| Add a new animation | add a clip in `clips.ts`, then point a sprite's `clips` at it in `registry.ts` |
| Change which animation a class attacks with | `heroAttack` in `characters/hero.ts` (with an SP on, its weapon's `clip` wins) |
| Change an SP weapon's attack animation | its clip in `clips.ts` ("the SP weapons' attacks"), or point `clip` in its `SP_WEAPON_ART` entry at another; check `/lab/sp` on Attack |
| Reshape the body (legs, torso, head, shoulders) | `BODY` in `engine/figure.ts` |
| Change the hero's face (eyes, chin, mouth) | the `MANGA_FACE.art` text rows in `engine/manga.ts` |
| Change the hero's hair (spikes, bangs, headband) | its entry in `MANGA_HAIR` (`engine/manga.ts`): each lock is a list of points |
| Change the hero's default look | `DEFAULT_LOOK` in `characters/hero.ts` |
| Add a hairstyle | a new entry in `HAIRSTYLES` (`engine/figure.ts`, the classic head; a new style may borrow a near one's rows), plus one in `MANGA_HAIR` for the manga head (`mirror` and `both` copy a lock to the other side, `oval` and `ring` make round puffs), plus its label in `STYLES` (`src/components/LookEditor.tsx`). There are nineteen: spiky, swept, headband (`short`), buzz, wild, messy, mohawk, slick, side sweep (`sidepart`), curly, afro, bob, hime, long, ponytail, twin tails, braids, bun, top knot. A test checks the editor offers every one |
| Add a hair color, skin tone or eye color | a new ramp in `HAIR`, `SKIN` or `EYE_COLORS` (`palette.ts`); the editor shows them in that order. Brown eyes are each head's own brown |
| Add or redraw a face mark (freckles, blush, scar, plaster, mole) | its id in `FACE_MARKS` (`engine/figure.ts`), its drawing in `MARKS` (`engine/manga.ts`, painted over the manga face), and its label in `MARKS` (`src/components/LookEditor.tsx`) |
| Change the classic face | `EYE_PATTERN` and `FACE` in `engine/figure.ts` |
| Redraw a weapon | `parts/weapons.ts` |
| Redraw an SP's look | its entry in `characters/spLooks.ts`; check `/lab/sp` |
| Redraw an SP's weapon, or what it does on the hands | its entry in `SP_WEAPON_ART` (`parts/spWeapons.ts`); check `/lab/sp` |
| Change armor tiers, capes, shields | `heroSpec` layers in `characters/hero.ts` |
| Redraw a Fog item, or a legendary | its rows in `ITEM_ROWS` or `LEGEND_ROWS` (`characters/items.ts`); the letters are listed at the top of the file |
| Change an item rarity's colors, the dyes and gems a seed picks, or the legendaries' looks | `METAL`, `LEATHER`, `CLOTH`, `GEMS`, `TRIM`, `ACCENTS`, `THEMES` and `itemColors` in `characters/items.ts` |
| Change a rare's shine or a legendary's glow and sparkles | `drawItem` in `characters/items.ts` (the `hover` clip, 8 frames; frame 0 is the still) |
| Change the hero's clothes under any item (the shirt's cel shading and folds, the starter's wrapped top and red sash, wrist wraps, trousers and boots) | `tailor`, `trousers` and the sleeve loop in `characters/hero.ts`; the colors are `WRAP` and `SASH` there |
| Change the hero's hand-drawn body (torso shape, the hanging arm, the legs and boots) | `TORSO`, `ARM_DOWN` and `LEGS` text rows in `engine/drawn.ts`; other arm poses are two bones (`limbs`, `bone`). The hero uses it unless `body: 'block'` (the Lab panel "The hand-drawn body" shows both) |
| Change how the manga hair is shaded (dark far side, dark lock tips, lines between locks) | `shadeHair` and each style's `strands` in `engine/manga.ts` |
| Change how the hero wears an item (plate and its tabard, jerkin, robe and its folds, the charm, a legendary's mantle) | `itemOutfit` and `heroSpec` in `characters/hero.ts`; the weapon's trim, gem and legendary light are the `WeaponLook` in `parts/weapons.ts` |
| Redraw Mira, Ember, the Book or a chapter enemy | its file in `characters/` (`mira.ts`, `ember.ts`, `book.ts`, `tomorrow.ts`, `mirror.ts`, `plateau.ts`, `summit.ts`) |
| Change how Lia, Sol or Vela look once you've helped them | `LIA_AFTER`, `SOL_AFTER` in `characters/villagers.ts`, `VELA_AFTER` in `vela.ts`; drawn with `{ after: true }`, and in the story by the cast ids `lia-after`, `sol-after`, `vela-after` |
| Redraw old Vela (hair, softer eyes, shawl, lamp, cane) | `characters/vela.ts`: her lamp raise is the `raise` clip in `clips.ts` |
| Redraw the fire kid (unused since the finale changed) | the `ROWS` and `TIPS` text art in `characters/kindled.ts` (`LOCKS` is the long hair a long or pony look gets) |
| Change a story backdrop's props (Vela's lamp tower, the road, a campfire) | its function in `places.ts` (`lampTower`, `road`...); which place has which props is in `src/story/places.ts` |
| Change how a backdrop widens held sideways (what spreads across, what stays on the stage) | `drawPlace` and its `PlaceCanvas` (`w`, `st`) in `places.ts`: props add `st` to their x; see [story.md](story.md) |
| Change Vela's far tower on the Plateau, or how its lamp flashes | `FAR_TOWER` rows in `places.ts`; a place with it is drawn lit and unlit, and the `beacon` animation in `tailwind.config.ts` flashes the lit copy |
| Change the looks a player starts with (boy, girl) | `STARTER_LOOKS` in `characters/hero.ts`; the editor's options are in `src/components/LookEditor.tsx`. A saved look goes through `normalizeLook` before it is drawn (here, in the Fog's sheets and on friends' cards), so an unknown or missing hair, skin, eye color or mark falls back to the starter look's |
| Redraw a dungeon monster | the `ROWS` text art in its file (`smoke.ts`, `seeker.ts`, `shade.ts`, `ashGolem.ts`; `lancer.ts`, `clock.ts`, `jar.ts` are painted by pose); which sprite a monster wears is its `FOE_FX` entry in `src/game/dungeon/foeFx.ts`. The old `ram.ts` and `splitter.ts` art stays in the registry for /lab only |
| Redraw one of the story worlds' own monsters (zones 2-6) | its `draw...` function in `characters/zoneFoes.ts` |
| Change which sprite a dungeon monster uses, or its size | its `look` in `FOE_FX` (`src/game/dungeon/foeFx.ts`; a new sheet also needs a `SheetKey` in `src/game/rules.ts` and its sheet in `src/game/sheets.ts`) |
| Redraw the dungeon's pillars, barrels, chests, shrine, stairs, torches | the text rows in `src/game/dungeon/props.ts` (floor, walls, door, water and spikes are drawn in `scene.ts`) |
| Fix an exercise demo's form (depth, lean, where the hands go) | its case in `poseFor` (`characters/exercise.ts`); a new exercise in the plan (`src/lib/program.ts`) needs one too (a test checks every plan exercise has a demo) |
| Fix a library movement's demo, or add one | its case in `frame` (`characters/moves.ts`); a new one also needs an id in `MOVES`, coaching and a classifier rule, see [exercise-library.md](exercise-library.md) |
| Change how a zone dresses its regular monsters | `ZONE_RAMPS` (colors) and the zone's branch of `dress` in `characters/zoned.ts`; the sprites that take `{ zone }` are the `zoned(...)` entries in `registry.ts` |
| Change a zone's dungeon colors (floor, stone, torch fire, water) | its entry in `THEMES` (`src/game/dungeon/themes.ts`); in developer mode the Fog's pause menu has a Theme button that cycles them |
| Change how a class looks in its SP (crest, hat, scarf, colors) | its entry in `SP_LOOKS` (`characters/spLooks.ts`) |
| Change the SP card (frame, window, the seal's crack, the sparks) | `drawSpCard` in `characters/spCard.ts` |
| Add a character | a file in `characters/`, then an entry in `SPRITES` (`registry.ts`) |
| Use art from Aseprite or PixelLab | see below |

`<Sprite size>` is the width in CSS pixels, any number. Inside `<PixelSnap>`
(`src/components/sideways.ts`, used by the story's overlays) and with the phone held sideways, it
is rounded to the nearest whole multiple of the frame (64, 128, 192), so the pixels stay square.

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

The SP weapons each attack with their own clip (`chop` the great axe, `smash` the hammer, `thrust`
the lance, `reap` the scythe, `longdraw` the long bow, `blast` the cannon, `throw` the boomerang,
`stab` the daggers, `flare` the flame staff, `pulse` the water orb, `ring` the bell staff,
`hexslash` the shadow sword, `combo` the gauntlets, `swipe` the claws, `spin` the bo, `palms` the
ki). For them a frame can also set `aim` / `aimL` (where a held weapon points), `grip` (how far
the hand slides up it) and `fly` (how far a thrown one has flown), and the arms have two more
poses: right `tuck` (hand at the ribs) and left `fwd` (reaching across the chest).

Creatures (Ember, the Book, the enemies) read the same frames their own way: `hover` is an
eight-frame float where `bob` is the breath, and `lunge` is their attack, a wind-up
(`right: 'up'`) and then the hit (`fx: 'impact'`).

`Ember` (`Characters.tsx`) always carries the `gym-hide` class, so in gym mode the flame steps out
of the training screens ([../app/screens.md](../app/screens.md#gym-mode-a-plain-look-for-training)).

### Fog items

Each item kind is one hand-drawn text-row drawing; the letters are roles, not colors (`D M L W` the
material, `h H j` the grip, `t T U` trim, `g G E` gem, `a A B` accent, `f F X` glow, `k` dark).
`itemColors` turns an `ItemLook` into colors: common is plain iron, wood and bronze with a grey
stone; magic is blue steel and a sapphire; rare is bright steel and gold, with a gem, a dye (leather
and cloth) and an accent picked by the seed; a legendary has its own drawing and one of five
looks (`THEMES`: sunfire, frost, void, ember, verdant). The seed also picks a plate's chest emblem.
Rares shine (a band of light sweeps across), legendaries glow, shine and sparkle. The seed is
`seedOf(name)` (`src/game/dungeon/items.ts`, `looksOf`), so every item with one name looks the same.

The hero wears them: a worn item's `Gear.item` (set by `gearOf`) makes `heroSpec` draw that
item instead of the slot's tier look. Plate gets a breastplate, pauldrons, tassets and the emblem;
a jerkin is laced with a strap and buckle; a robe has a cowl, a sash and a skirt to the ankles. Rare
and legendary add trim; a legendary armor adds a mantle (a plate's pauldrons rise to points, a
robe has twinkling stars), a legendary weapon burns along the blade (the bow's string, the staff's
orb, the wand's star). The hero's aura comes from forging, not rarity: the best-forged worn item's
band (`BANDS[...].aura` in `src/balance/upgrades.ts`) lights it from +4, in a warm gold, the
item's rarity glow from +7, and a white-gold radiance at +15. The charm hangs on a cord
at the chest and colors the shield's or orb's gem. Slots without an item draw as before, so the
tier fingerprints don't move.

The hero is drawn with the player's look (body, hair, hair color, skin), which `<LookProvider>`
hands to every `<Hero />` on screen, so the Echo, the Best Self and the Hollow match the player.
The `kindled` variant is the hero once the flame has fused with them in the finale: a red and
orange fire aura that flickers (it stands in for the top-tier gear glow).
The forge's bands are in [forge.md](forge.md).

Long lists show stills, not sheets: `stillFor(id, action, opts, frame)` (`registry.ts`) draws a
single frame once and caches it (the exercise library's rows draw one as each row scrolls in).

`toSheet` (`engine/grid.ts`) turns frames into a PNG data URL on a canvas kept in memory
(`willReadFrequently`): reading back a canvas on the graphics chip waits for the chip, and during a
Fog run that froze the game for a moment each time a new icon first showed. `paintFrames` is its painting step,
for a canvas you already have (the Fog's items on the floor).

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
change any art, a failing fingerprint means something broke. A second snapshot, "SP look fingerprints", keeps every SP, boy and girl, at rest, walking and
attacking, with and without a class weapon, so a weapon or look refactor can prove it moved no pixel.
