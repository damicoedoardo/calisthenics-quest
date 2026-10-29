---
type: reference
title: Music and sound
description: All music and sound effects are synthesized on Web Audio from note patterns in src/lib/music.ts and src/lib/music-zones.ts — no audio files; how tracks, stings and SFX are written and played.
tags: [game, music, audio]
timestamp: 2026-10-29
---

# Music and sound

There are no audio files in the app. `src/lib/music.ts` is a tiny chiptune engine on Web Audio
(`music`, a singleton), and every track is written as note patterns, so music costs no download
and works offline.

- **Pattern syntax**: one token per step. `A4` plays a note, `-` holds it, `.` is silence, `x` a
  drum hit or heartbeat thump. Every voice of a track has the same length.
- **Tracks**: `TRACKS` in `music.ts` (the opening's memory, the Hollow, camp, the menus, the Fog and its boss, and the level-up, defeat, victory and app-opening sting `opening`) and `ZONE_TRACKS` in
  `music-zones.ts` (each Fog world's run theme and boss theme, the Warden's theme, the zone-end
  stings). `ZONE_MUSIC` / `zoneMusic` pick a world's tracks, by `worldOf(zone)`: the six story
  zones, then the Ember Road's own worlds (the Whetstone Pass: `pass`, and the Lull's lullaby
  `passBoss`; the Quiet Miles: `miles`, a call answered from far off, and `milesBoss`, two voices
  drifting apart; the Long Bridge: `bridge`, a rope-hauling song, and `bridgeBoss`, a march that
  gains a voice every four bars).
- **Sound effects**: `SfxId` and `SFX_IDS` in `music.ts`; the Fog scene turns game events into them.
- **Playing**: `useMusic(id)` in `src/components/Sound.tsx` plays a track while a screen is on and
  fades it when it leaves; `SoundToggle` mutes. **Menu music**: `useMenuTrack(on)` (in `page.tsx`, on the tabs only) sets the `menu` track as the engine's base (`music.setBase`): it plays whenever no screen asks for a song, and comes back when a screen with its own song (a scene, sitting by the fire) closes. `useMenuMusic` / `music.setMenuMusic` is its own on/off, saved in `localStorage` and shown in the Hero tab's Settings. `music.tryStart()` wakes the sound without a tap where the browser allows it and says if it did (the app opening uses it; iPhones always need a tap). Story scenes name their song in `music` (see
  [story.md](story.md)).
- **Checking a pile-up**: `renderSfxMix(ids)` renders several effects starting together, to
  check they don't clip (browser only, like `renderSfx`).
- **Trying it**: `/lab/music` plays every theme and sting.

Tested in `src/lib/music.test.ts` (real notes only, voices loop together, every zone has its themes). The project files hold WAV
renders of the zone themes for listening outside the app; they are not used by the code.
