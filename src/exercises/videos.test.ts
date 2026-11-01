import { describe, expect, it } from 'vitest';
import { loadLibrary } from './library';
import { VIDEOS, videoSearchUrl } from './videos';
import { STAPLES, STRETCHES, WARMUP_MOVES } from '@/lib/coach/staples';

describe('exercise videos', () => {
  it('each pick is a real library exercise with a well-formed YouTube id', async () => {
    const ids = new Set((await loadLibrary()).map((x) => x.id));
    for (const [id, v] of Object.entries(VIDEOS)) {
      expect(ids.has(id), id).toBe(true);
      expect(v.id, id).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(v.title, id).toBeTruthy();
    }
  });

  it('every exercise the coach plans with has a pick, but for the known gaps', async () => {
    const gaps = new Set(['All_Fours_Quad_Stretch']); // no video of this exact stretch found yet
    const planned = new Set([...Object.values(STAPLES).flat(), ...Object.values(WARMUP_MOVES).flat(), ...Object.values(STRETCHES).flat()]);
    for (const x of await loadLibrary()) if (x.source === 'forma') planned.add(x.id);
    for (const id of planned) if (!gaps.has(id)) expect(VIDEOS[id], id).toBeTruthy();
  });

  it('searches YouTube by name for the rest', () => {
    expect(videoSearchUrl('Barbell Full Squat')).toBe('https://www.youtube.com/results?search_query=how%20to%20do%20Barbell%20Full%20Squat%20exercise');
  });
});
