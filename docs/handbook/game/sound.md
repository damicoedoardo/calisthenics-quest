---
type: reference
title: Music and sound
description: All music and sound effects are synthesized on Web Audio from note patterns in src/lib/music.ts and src/lib/music-zones.ts — no audio files; how tracks, stings and SFX are written and played.
tags: [game, music, audio]
timestamp: 2026-10-27
---

# Music and sound

There are no audio files in the app. `src/lib/music.ts` is a tiny chiptune engine on Web Audio
(`music`, a singleton), and every track is written as note patterns, so music costs no download
and works offline.

- **Pattern syntax**: one token per step. `A4` plays a note, `-` holds it, `.` is silence, `x` a
  drum hit or heartbeat thump. Every voice of a track has the same length.
- **Tracks**: `TRACKS` in `music.ts` (the opening's memory, the Hollow, camp, the Fog and its boss, and the level-up, defeat and victory stings) and `ZONE_TRACKS` in
  `music-zones.ts` (each Fog zone's run theme and boss theme, the Warden's theme, the zone-end
  stings). `ZONE_MUSIC` / `zoneMusic` pick a zone's tracks.
- **Sound effects**: `SfxId` and `SFX_IDS` in `music.ts`; the Fog scene turns game events into them.
- **Playing**: `useMusic(id)` in `src/components/Sound.tsx` plays a track while a screen is on and
  fades it when it leaves; `SoundToggle` mutes. Story scenes name their song in `music` (see
  [story.md](story.md)).
- **Checking a pile-up**: `renderSfxMix(ids)` renders several effects starting together, to
  check they don't clip (browser only, like `renderSfx`).
- **Trying it**: `/lab/music` plays every theme and sting.

Tested in `src/lib/music.test.ts` (real notes only, voices loop together, every zone has its themes). The project files hold WAV
renders of the zone themes for listening outside the app; they are not used by the code.
