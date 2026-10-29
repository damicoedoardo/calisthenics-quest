import { describe, expect, it } from 'vitest';
import { TRACKS, noteFreq, parsePattern } from './music';
import { ZONE_MUSIC, transpose, later } from './music-zones';

describe('music tracks', () => {
  it('play only real notes, and every voice of a track loops together', () => {
    for (const [id, track] of Object.entries(TRACKS)) {
      const lengths = new Set(track.voices.map((v) => parsePattern(v.pattern).length));
      expect(lengths.size, `${id} voices have different lengths`).toBe(1);
      for (const v of track.voices) {
        if (v.wave === 'thump' || v.wave === 'hat' || v.wave === 'snare') continue;
        for (const e of parsePattern(v.pattern).events) expect(() => noteFreq(e.note), `${id}: ${e.note}`).not.toThrow();
      }
    }
  });

  it('every Fog world has a run and a boss theme, and its win sting exists', () => {
    // the six story zones, then the Ember Road's own worlds
    expect(ZONE_MUSIC).toHaveLength(9);
    for (const z of ZONE_MUSIC) {
      expect(TRACKS[z.run]).toBeDefined();
      expect(TRACKS[z.boss]).toBeDefined();
      if (z.win) expect(TRACKS[z.win]).toBeDefined();
    }
    expect(TRACKS.warden).toBeDefined();
  });

  it('transposes and delays patterns', () => {
    expect(transpose('A4 - . B4 C5', 3)).toBe('C5 - . D5 D#5');
    expect(transpose('C4', -1)).toBe('B3');
    expect(later('A4 B4 C5 D5', 2)).toBe('. . A4 B4');
  });
});
