import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { uniformGear, type ClassId, type Tier } from '@/lib/gear';
import { CLIPS, type SpriteAction } from './clips';
import { DEFAULT_LOOK, STARTER_LOOKS, normalizeLook } from './characters/hero';
import { HAIRSTYLES, SIZE, type HairStyle } from './engine/figure';
import { MANGA_HAIR } from './engine/manga';
import { tint, type Grid } from './engine/grid';
import { planExercises } from '@/lib/program';
import { EXERCISES, type ExerciseId } from './characters/exercise';
import { SPRITES, clipFor, framesFor, imageSheet, type SpriteId } from './registry';

const painted = (g: Grid) => g.flat().filter(Boolean).length;
const hash = (frames: Grid[]) => createHash('sha1').update(JSON.stringify(frames)).digest('hex').slice(0, 12);
const ids = Object.keys(SPRITES) as SpriteId[];
const actions: SpriteAction[] = ['idle', 'attack'];
const ZONED = ['slime', 'wisp', 'ram', 'smoke', 'seeker', 'splitter', 'splitling', 'shade'] as const;

describe('clips', () => {
  it('every clip has frames and a positive speed', () => {
    for (const [id, c] of Object.entries(CLIPS)) {
      expect(c.frames.length, id).toBeGreaterThan(0);
      expect(c.ms, id).toBeGreaterThan(0);
    }
  });
});

describe('sprite registry', () => {
  it('every sprite draws every action, one grid per clip frame', () => {
    for (const id of ids)
      for (const action of actions) {
        const frames = framesFor(id, action);
        const clip = CLIPS[clipFor(id, action) ?? 'idle'];
        expect(frames, `${id} ${action}`).toHaveLength(clip.frames.length);
        frames.forEach((g) => expect(painted(g), `${id} ${action}`).toBeGreaterThan(20));
      }
  });

  it('draws every class at every tier, idle and attack, as 64x64 frames', () => {
    for (const classId of [undefined, 'warrior', 'archer', 'monk', 'mage'] as (ClassId | undefined)[])
      for (const t of [0, 3, 6])
        for (const action of actions)
          for (const g of framesFor('hero', action, { gear: uniformGear(classId, t as Tier), classId })) {
            expect(g).toHaveLength(SIZE);
            expect(g.every((row) => row.length === SIZE)).toBe(true);
            expect(painted(g)).toBeGreaterThan(600);
          }
  });

  it('each class attacks with its own clip', () => {
    const gear = (c: ClassId) => uniformGear(c, 2);
    expect(clipFor('hero', 'attack', { gear: gear('warrior'), classId: 'warrior' })).toBe('swing');
    expect(clipFor('hero', 'attack', { gear: gear('archer'), classId: 'archer' })).toBe('shoot');
    expect(clipFor('hero', 'attack', { gear: gear('mage'), classId: 'mage' })).toBe('cast');
    // Chapter enemies lunge; sprites without an attack fall back to their idle clip.
    for (const id of ['slime', 'mirror', 'golem', 'wisp', 'ram', 'smoke', 'seeker', 'splitter', 'splitling', 'shade', 'warden', 'lanternMid', 'foremanMid', 'sandGolemMid', 'sandGolemMidStone', 'whisperMid', 'galeMid'] as const) expect(clipFor(id, 'attack')).toBe('lunge');
    expect(clipFor('ember', 'attack')).toBe(clipFor('ember', 'idle'));
    // Vela raises her lamp.
    expect(clipFor('vela', 'attack')).toBe('raise');
    // The true form waves (the finale's last line).
    expect(clipFor('kindled', 'attack')).toBe('wave');
  });

  it('the idle loop bobs and the attack moves', () => {
    const o = { gear: uniformGear('warrior', 2), classId: 'warrior' as const };
    const idle = framesFor('hero', 'idle', o),
      attack = framesFor('hero', 'attack', o);
    expect(hash([idle[0]])).not.toBe(hash([idle[2]]));
    expect(hash([attack[0]])).not.toBe(hash([attack[1]]));
  });

  it('tint keeps the shape and only uses the ramp', () => {
    const g = framesFor('hero', 'idle')[0];
    const ramp = ['#000001', '#000002', '#000003'];
    const t = tint(g, ramp);
    expect(painted(t)).toBe(painted(g));
    expect(new Set(t.flat().filter(Boolean)).size).toBeLessThanOrEqual(ramp.length);
  });

  it('every hairstyle has a manga version, so no look falls back to the classic head', () => {
    for (const style of Object.keys(HAIRSTYLES) as HairStyle[]) {
      expect(MANGA_HAIR[style], style).toBeDefined();
      const look = { ...DEFAULT_LOOK, style };
      expect(hash(framesFor('hero', 'idle', { look })), style).not.toBe(hash(framesFor('hero', 'idle', { look: { ...look, head: 'classic' } })));
    }
  });

  it('saved looks are made safe to draw', () => {
    expect(normalizeLook()).toEqual(DEFAULT_LOOK);
    expect(normalizeLook({ sex: 'f' })).toEqual(STARTER_LOOKS.f);
    const broken = { sex: 'f', style: 'mohawk', hair: 'green', skin: 'blue' } as unknown as Parameters<typeof normalizeLook>[0];
    expect(normalizeLook(broken)).toEqual(STARTER_LOOKS.f);
    expect(normalizeLook({ ...STARTER_LOOKS.f, hair: 'red', style: 'pony' })).toEqual({ ...STARTER_LOOKS.f, hair: 'red', style: 'pony' });
  });

  it('the regular monsters have a variant for each zone, with the same eyes', () => {
    for (const id of ZONED)
      for (const zone of [1, 2, 3, 4, 5]) {
        const base = framesFor(id, 'idle')[0],
          g = framesFor(id, 'idle', { zone })[0];
        expect(g, `${id} zone ${zone}`).toHaveLength(SIZE);
        expect(hash([g]), `${id} zone ${zone}`).not.toBe(hash([base]));
        expect(painted(g), `${id} zone ${zone}`).toBeGreaterThan(painted(base) / 2);
      }
  });

  it('every exercise in the built-in plan has a demo, and every demo moves', () => {
    for (const { id } of planExercises()) {
      expect(EXERCISES, id).toContain(id);
      const frames = framesFor('exercise', 'idle', { exercise: id as ExerciseId });
      expect(frames, id).toHaveLength(16);
      expect(new Set(frames.map((g) => hash([g]))).size, id).toBeGreaterThan(1);
    }
  });

  it('PNG sheets pick their row and fall back to idle', () => {
    const png = {
      kind: 'image' as const,
      label: 'Test',
      src: '/sprites/test.png',
      frame: { w: 48, h: 64 },
      columns: 6,
      rows: 2,
      clips: { idle: { row: 0, frames: 4, ms: 150, loop: true }, attack: { row: 1, frames: 6, ms: 90, loop: false } },
    };
    expect(imageSheet(png, 'attack')).toMatchObject({ row: 1, frames: 6, w: 48, h: 64, columns: 6, rows: 2, loop: false });
    expect(imageSheet({ ...png, clips: { idle: png.clips.idle } }, 'attack')).toMatchObject({ row: 0, frames: 4, loop: true });
  });

  // A fingerprint of every sprite's pixels. If this fails after an art change you meant to make,
  // update it with `pnpm test -- -u`; if you didn't mean to change any art, something broke.
  it('art fingerprints', () => {
    const prints: Record<string, string> = {};
    for (const id of ids) for (const action of actions) prints[`${id} ${action}`] = hash(framesFor(id, action));
    for (const classId of ['warrior', 'archer', 'monk', 'mage'] as ClassId[])
      for (const t of [1, 4, 6])
        for (const action of actions)
          prints[`hero ${classId} t${t} ${action}`] = hash(framesFor('hero', action, { gear: uniformGear(classId, t as Tier), classId }));
    for (const variant of ['echo', 'best', 'hollow', 'kindled'] as const) prints[`hero ${variant}`] = hash(framesFor('hero', 'idle', { variant }));
    for (const style of Object.keys(HAIRSTYLES) as HairStyle[])
      for (const head of ['classic', 'manga'] as const) prints[`hero ${head} ${style}`] = hash(framesFor('hero', 'idle', { look: { ...DEFAULT_LOOK, style, head } }));
    prints['hero girl'] = hash(framesFor('hero', 'idle', { look: STARTER_LOOKS.f }));
    for (const stage of ['spark', 'candle', 'torch', 'bonfire', 'fairy'] as const)
      for (const mood of ['happy', 'bright', 'soft', 'sleepy', 'smoky', 'scared', 'dim'] as const) prints[`flame ${stage} ${mood}`] = hash(framesFor('ember', 'idle', { stage, mood }));
    for (const id of ['lia', 'sol', 'vela'] as const) prints[`${id} after`] = hash(framesFor(id, 'idle', { after: true }));
    for (const id of ZONED) for (const zone of [1, 2, 3, 4, 5]) prints[`${id} zone ${zone}`] = hash([...framesFor(id, 'idle', { zone }), ...framesFor(id, 'attack', { zone })]);
    for (const exercise of EXERCISES) prints[`exercise ${exercise}`] = hash(framesFor('exercise', 'idle', { exercise }));
    prints['kindled long hair'] = hash(framesFor('kindled', 'idle', { hair: 'long' }));
    expect(prints).toMatchSnapshot();
  });
});
