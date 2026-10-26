import { describe, expect, it } from 'vitest';
import { BODY } from './body';
import { COLORS, DEFAULT_AVATAR, PRESETS, SLOTS, drawAvatar, normalizeAvatar, type Slot } from './avatar';
import type { Part } from './types';

const painted = (g: (string | null)[][]) => g.flat().filter(Boolean).length;
const key = (g: (string | null)[][]) => JSON.stringify(g);

const allParts = (): [string, Part][] => [
  ['body', BODY],
  ...(Object.keys(SLOTS) as Slot[]).flatMap((s) => Object.entries(SLOTS[s].parts as Record<string, Part>).map(([id, p]) => [`${s}.${id}`, p] as [string, Part])),
];

describe('avatar parts', () => {
  it('every layer is 32 wide and fits the 64-pixel frame', () => {
    for (const [name, part] of allParts())
      for (const [layer, art] of Object.entries(part.layers)) {
        art.rows.forEach((r, j) => expect(r, `${name} ${layer} row ${j}`).toHaveLength(32));
        expect(art.y, name).toBeGreaterThanOrEqual(0);
        expect(art.y + art.rows.length, name).toBeLessThanOrEqual(64);
      }
  });

  it('every option draws and changes the picture', () => {
    // A short-haired base, so nothing hides the brows or eyes.
    const bare = { ...DEFAULT_AVATAR, hair: 'buzz', extra: 'none' } as const,
      base = key(drawAvatar(bare));
    for (const slot of Object.keys(SLOTS) as Slot[])
      for (const id of Object.keys(SLOTS[slot].parts)) {
        const g = drawAvatar({ ...bare, [slot]: id });
        expect(painted(g), `${slot}.${id}`).toBeGreaterThan(400);
        if (id !== bare[slot]) expect(key(g), `${slot}.${id}`).not.toBe(base);
      }
  });

  it('colors recolor', () => {
    for (const c of Object.keys(COLORS) as (keyof typeof COLORS)[]) {
      const ids = Object.keys(COLORS[c]);
      const other = ids.find((i) => i !== DEFAULT_AVATAR[c])!;
      const a = { ...PRESETS.hunter, [c]: other };
      if (a[c] !== PRESETS.hunter[c]) expect(key(drawAvatar(a)), c).not.toBe(key(drawAvatar(PRESETS.hunter)));
    }
  });

  it('the idle breath moves the upper body and keeps the feet planted', () => {
    const still = drawAvatar(DEFAULT_AVATAR),
      breath = drawAvatar(DEFAULT_AVATAR, { bob: 1 });
    expect(key(breath)).not.toBe(key(still));
    expect(JSON.stringify(breath.slice(56))).toBe(JSON.stringify(still.slice(56)));
  });

  it('saved avatars are made safe to draw', () => {
    expect(normalizeAvatar()).toEqual(DEFAULT_AVATAR);
    expect(normalizeAvatar({ ...PRESETS.lean, hair: 'mohawk', topColor: 'rainbow' })).toEqual({ ...PRESETS.lean, hair: DEFAULT_AVATAR.hair, topColor: DEFAULT_AVATAR.topColor });
    expect(normalizeAvatar(PRESETS.gothic)).toEqual(PRESETS.gothic);
  });
});
