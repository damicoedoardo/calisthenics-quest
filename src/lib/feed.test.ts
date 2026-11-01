import { describe, expect, it } from 'vitest';
import { cleanLine, fromFrontCamera, newPosts, workoutCard, workoutLine } from './feed';
import type { Session } from './game';

const session = (p: Partial<Session> = {}): Session => ({
  id: 's',
  date: '2026-10-29T18:40:00Z',
  kind: 'full',
  day: 'A',
  xp: 100,
  breakdown: [],
  entries: [
    { exerciseId: 'warm', target: 1, sets: [{ reps: 1, rir: '4+' }], name: 'Joint circles' },
    { exerciseId: 'push', target: 10, sets: [{ reps: 10, rir: '2-3' }, { reps: 9, rir: '2-3' }], name: 'Push-up' },
    { exerciseId: 'dip', target: 8, sets: [{ reps: 8, rir: '0-1' }], name: 'Dip' },
  ],
  ...p,
});

describe('feed', () => {
  it('sums a workout up for a post', () => {
    const w = workoutCard(session(), { title: 'Push day', startedAt: '2026-10-29T18:02:00Z', taps: new Set(['warm']) });
    expect(w).toEqual({ title: 'Push day', minutes: 38, sets: 3, exercises: ['Push-up', 'Dip'], mini: false, started_at: '2026-10-29T18:02:00Z' });
    expect(workoutLine(w)).toBe('38 min · 3 sets');
    expect(workoutLine({ ...w, minutes: 0, sets: 1, mini: true })).toBe('Minimum quest · 1 set');
  });

  it('works without a start time', () => {
    expect(workoutCard(session(), { title: 'x' }).minutes).toBe(0);
  });

  it('tidies text', () => {
    expect(cleanLine('  felt\n great  ', 280)).toBe('felt great');
    expect(cleanLine('x'.repeat(300), 280)).toHaveLength(280);
  });

  it('counts friends’ posts since you last looked', () => {
    const posts = [
      { at: '2026-10-29T18:00:00Z', mine: false },
      { at: '2026-10-29T17:00:00Z', mine: false },
      { at: '2026-10-29T18:30:00Z', mine: true },
    ];
    expect(newPosts(posts, '2026-10-29T17:30:00Z')).toBe(1);
    expect(newPosts(posts, null)).toBe(2);
  });
});

describe('fromFrontCamera', () => {
  // A JPEG head with an EXIF block naming the lens, in either byte order.
  const jpeg = (lens: string | null, le = false): Uint8Array => {
    const t: number[] = [];
    const u16 = (v: number) => (le ? [v & 255, v >> 8] : [v >> 8, v & 255]);
    const u32 = (v: number) => (le ? [v & 255, (v >> 8) & 255, (v >> 16) & 255, v >>> 24] : [v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255]);
    const text = lens === null ? [] : [...lens].map((c) => c.charCodeAt(0)).concat(0);
    t.push(...(le ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8));
    // IFD0 at 8: one entry, the Exif IFD pointer.
    t.push(...u16(1), ...u16(0x8769), ...u16(4), ...u32(1), ...u32(26), ...u32(0));
    // Exif IFD at 26: the lens name (ASCII), its text after the IFD.
    if (lens === null) t.push(...u16(0), ...u32(0));
    else t.push(...u16(1), ...u16(0xa434), ...u16(2), ...u32(text.length), ...u32(44), ...u32(0), ...text);
    const app1 = [...'Exif'].map((c) => c.charCodeAt(0)).concat(0, 0, ...t);
    return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, (app1.length + 2) >> 8, (app1.length + 2) & 255, ...app1, 0xff, 0xda, 0, 2]);
  };

  it('knows a selfie by its lens', () => {
    expect(fromFrontCamera(jpeg('iPhone 15 front camera 2.69mm f/1.9'))).toBe(true);
    expect(fromFrontCamera(jpeg('iPhone 15 front camera 2.69mm f/1.9', true))).toBe(true);
    expect(fromFrontCamera(jpeg('iPhone 15 back dual wide camera 6.86mm f/1.6'))).toBe(false);
  });

  it('counts anything else as not a selfie', () => {
    expect(fromFrontCamera(jpeg(null))).toBe(false);
    expect(fromFrontCamera(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(fromFrontCamera(jpeg('iPhone front camera').subarray(0, 30))).toBe(false);
  });
});
