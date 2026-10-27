---
type: reference
title: Story (scenes, chapters, daily lines)
description: The six-month story as data in src/story — scene format, when scenes play, the daily flame lines and Book of Days, rules for the words, and where to edit what.
tags: [game, story, content]
timestamp: 2026-10-27
---
# Story

Code: `src/story/`. File names below without a folder are in it.

The whole story lives here as data: who talks, what they say, where, when, and what the camera
does. Components only play it (`src/components/ScenePlayer.tsx` and `Dialogue.tsx`), so changing the
story never means touching a component. Open **/lab/story** in the app to play any scene with any
flame name and letter, and to see every place and every look of the flame.

```
types.ts              the shapes: Scene, Line, Shot, When, Ask, Chapter, FogZone, Quote
cast.ts               everyone who speaks: name, portrait (sprite), name color
places.ts             where scenes happen: painted backdrops (src/sprites/places.ts draws them)
chapters/1-6          one file per month: the chapter, its Fog zone, its scenes
anytime.ts            scenes that can happen in any chapter (beating last time, coming back)
flame.ts              the flame's stages (spark to fire fairy), the default name, and heroVariant:
                      after the finale the flame has fused with you and your hero burns red
opening.ts            the opening, before the first workout
daily/flame-lines.ts  what the flame says on Today, by kind of day, and its face
daily/quotes.ts       words for the road, by chapter
daily/rest.ts         rest-day truths, and what the flame says after a minute by the fire
daily/index.ts        picks the day's line and quote, and keeps the Book of Days
engine.ts             reads all of it: which chapter you're in, which scenes are due
story.test.ts         checks every reference (speakers, places, songs, {words})
```

## A scene

```ts
{
  id: 'ch1-night-camp',              // saved once seen; never rename a live one
  when: { workouts: 8 },             // every field given must hold (see When in types.ts)
  place: 'ashlands-camp',            // optional: defaults to the chapter's place
  music: 'camp',                     // optional: a track in src/lib/music.ts
  shots: [{ pan: 'up' }, { pan: 'center', seconds: 2.2 }],  // camera beats before the first line
  lines: [
    { who: 'narrator', show: 'flame', text: 'Night. {flame} crackles beside you.' },
    { who: 'flame', mood: 'soft', text: 'You wrote that you started because {why}.', needs: 'why' },
  ],
  ask: { kind: 'choice', id: 'heart1', prompt: '...', choices: [...], after: [...] },
}
```

- **who**: a key in `cast.ts`. **show** puts someone on screen during narration.
- **mood**: the flame's face for that line (happy, bright, soft, sleepy, smoky, scared, dim).
- **{words}**: the player's own words. `{flame}` (its name), `{why}` `{want}` `{forWho}`
  `{remind}` (the letter), `{voice}` (the Hollow's line), `{sessions}`, `{heart1}`…`{heart6}`
  (answers to the heart moments). **needs** drops the line when that word is empty; **missing**
  is the opposite, for the line that stands in when it is (`needs: 'heart1'` and `missing: 'heart1'`
  side by side). Letter parts and written answers can be in the first person ("my kids"), so they
  only ever appear inside quotes of what the player wrote; a test checks it.
- **answer** on a line: only shown when the player gave that answer, e.g. Vela speaks in a scene
  only if you joined her story (`answer: { id: 'vela', is: 'yes' }`). It works in a question's
  answer lines too (`sceneFor` filters both), so a choice can lead into a gathering of whoever you helped.
- **shot** on a line, or **shots** before the first line: `{ title }`, `{ place }` (cut to another
  place), `{ pan }`, `{ zoom }`, `{ fade }`, `{ shake }`, `{ enter }` (how the speaker comes in).
  Each takes `seconds`.
- **Staging** a line, for the moments that need room: `pause` (seconds of held silence before it
  starts), `pace: 'slow'` (slow typing; short lines only), `film` (narration big on the picture with
  no text box) and `music` (switch songs from this line on, or `'none'` to let the music drop out).
  Use them sparingly: a scene with a hold on every line has no holds.
- **ask**: `name` (name the flame), `choice` (saved under its id; `write` adds a free-text box),
  or `class` (opens the class picker).

## When scenes play

- A scene plays once, when its `when` holds; scenes due together play in file order.
- Give every workout-tied scene of a later month `chapter: N` too, so it never plays before its
  month starts. `better: N` waits for N workouts where a set beat last time (see
  [training.md](training.md)); there are no max tests and no skill tree to wait for any more.
- A scene tied only to a workout count stops being due a few workouts (`CATCH_UP`) after its
  moment, so a scene added later doesn't ambush players who already passed it. Scenes that also wait
  for something else (a rest day, a short day, a class pick) never go stale.
- `helped: true/false`: whether the player joined any villager's story (Lia, Sol, Vela). Month five's
  gathering has a scene for each, so exactly one plays.
- Play a whole season in a second with `SIM_OUT=sim-out npx vitest run src/sim`: seven kinds of
  player, a timeline each in sim-out/, and a list of anything that looks wrong.

## How to change things

| I want to... | Edit |
|---|---|
| Change what someone says | the line in its chapter file |
| Move a scene to another workout | its `when` |
| Add a scene | a new entry in the chapter's `scenes` (a new, unique `id`) |
| Add a character | an entry in `cast.ts` (and a sprite in `src/sprites/registry.ts` if it's new art) |
| Change a portrait's size or name color | its entry in `cast.ts` |
| Add or repaint a place | `places.ts` (sky colors, kind of land, props, weather) |
| Change chapter length | `workouts` in the chapter file (they add up to the story's length: `STORY_MONTHS` in `src/balance/training.ts` is the goal, five to six months; `pnpm balance` checks it) |
| Change a Fog boss's words, keepsake or toughness | the chapter's `fog` (toughness: `hp` and `dmg`, set with `pnpm fog:tune` and checked by `pnpm fog:sheet`) |
| Change how a Fog boss fights | its entry in `BOSSES` (`src/game/dungeon/content.ts`) and its branch in `steerBoss` (`engine.ts`) |
| Change when the flame grows, or what it gives | `flame.ts` (its art: `src/sprites/characters/ember.ts`) |
| Add daily lines or quotes | `daily/flame-lines.ts`, `daily/quotes.ts` (keep quote authors real) |
| Change the fire around your hero after the finale | the `kindled` branch of `drawHero` (`src/sprites/characters/hero.ts`); who gets it: `heroVariant` in `flame.ts` |

Held sideways, `Dialogue` puts whoever is on screen on the left and the text box beside them, and
the question card puts the question beside its answers (see
[../app/screens.md](../app/screens.md)); nothing in a scene needs to change for it. The backdrop
is not cropped from the tall upright picture then: `PlaceBackdrop` (`src/components/Place.tsx`),
given a `stage`, measures its box, picks a whole-number scale (about 125 rows of the picture fill
the box's height, row 100, just above the horizon, in the middle) and has `drawPlace` paint the
place that much wider (`PlaceCanvas` in `src/sprites/places.ts`). The land, sky, road, stars and
rocks fill the full width; the props (campfire, towers, moon, dead trees, a sky glow) keep their
upright layout on a 90-pixel stage placed around `stage`, where the person speaking stands
(a quarter of the way across the screen in `Dialogue`). Upright the picture is pixel for pixel
the same 90×160 one. To change the framing, edit `ROWS_SIDEWAYS` and `MIDDLE_ROW` in `Place.tsx`.

Run `pnpm test` after a change: `story.test.ts` catches a misspelled speaker, place, song or word.

## Rules for the words

- General: no sport-specific advice, no numbers about the body, no body talk.
- The player's own words make it personal: the letter, the Hollow's line, the heart moments.
- Nothing is taken away for missing days. Villager stories are opt-in.
- The flame is the part of you that never stopped believing in you (it says so in the opening).
  It grows as you believe in yourself (each growth scene names who it now believes you are), and
  in the finale, after the people you met give back what you taught them, it fuses with you. It
  never turns into a person or a child.
