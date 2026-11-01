import { describe, expect, it } from 'vitest';
import { ROOM_SHAPES } from '@/balance';
import { seeded } from '@/lib/random';
import { allJoined, buildShape, inBlock, outOfBlocks, wayTo, type ShapeId } from './shapes';

const SHAPES = Object.keys(ROOM_SHAPES.weights) as ShapeId[];
const M = 22;
/** Room sizes as the engine makes them: 420-520 wide, 760 to about 1200 tall. */
const SIZES: [number, number][] = [
  [420, 760],
  [460, 910],
  [520, 1210],
];

describe('room shapes', () => {
  it('keep every door, the way in from it, and the stairs open, and shut no pocket off', () => {
    const rnd = seeded(11);
    for (const id of SHAPES)
      for (const [w, h] of SIZES)
        for (let k = 0; k < 40; k++) {
          const bs = buildShape(id, w, h, M, rnd);
          // Where you walk in from each door, and where the stairs go.
          const spots: [number, number][] = [
            [w / 2, 70],
            [w / 2, h - 70],
            [70, h / 2],
            [w - 70, h / 2],
            [w / 2, 110],
            [w / 2, h - 110],
          ];
          for (const [x, y] of spots) expect(inBlock(bs, x, y, 24), `${id} ${w}x${h} at ${x},${y}`).toBe(false);
          expect(allJoined(bs, w, h, M, w / 2, h - 70), `${id} ${w}x${h}`).toBe(true);
        }
  });

  it('push a body out by a face that opens on the room, never into the room wall', () => {
    const w = 440,
      h = 910,
      bs = [{ x: 310, y: 22, w: 108, h: 248 }];
    // Pressed into a corner block flush with the room's wall (a bot once got stuck in there).
    const o = { x: 408, y: 97 };
    outOfBlocks(bs, o, 10, w, h, M);
    expect(inBlock(bs, o.x, o.y, 9)).toBe(false);
    expect(o.x).toBeLessThanOrEqual(w - M - 10);
  });

  it('lead a walker round the walls to the far side', () => {
    const rnd = seeded(5);
    for (const id of SHAPES) {
      const w = 460,
        h = 910,
        bs = buildShape(id, w, h, M, rnd);
      // From where you walk in to the far door, at walking pace, sliding along walls as the game does.
      const o = { x: w / 2, y: h - 70 },
        to = { x: w / 2, y: 70 };
      let steps = 0;
      while (Math.hypot(to.x - o.x, to.y - o.y) > 20 && steps < 3000) {
        const way = wayTo(bs, w, h, M, o.x, o.y, to.x, to.y, 12),
          d = Math.hypot(to.x - o.x, to.y - o.y),
          [dx, dy] = way ?? [(to.x - o.x) / d, (to.y - o.y) / d];
        o.x += dx * 2.5;
        o.y += dy * 2.5;
        outOfBlocks(bs, o, 10, w, h, M);
        steps++;
      }
      expect(steps, id).toBeLessThan(3000);
    }
  });
});
