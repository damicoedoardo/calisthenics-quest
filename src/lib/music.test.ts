import { describe, expect, it } from 'vitest';
import { TRACKS, noteFreq, parsePattern } from './music';

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
});
