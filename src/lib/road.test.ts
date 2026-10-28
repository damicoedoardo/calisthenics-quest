import { describe, expect, it } from 'vitest';
import { ROAD } from '@/balance';
import { initialState, type GameState } from './game';
import { addFakeWorkouts } from './dev';
import { ROAD_LENGTH, roadAt, roadHolds, roadNoteAt, startRoad, wonRoad } from './road';
import { pendingScenes } from '@/story/engine';
import { ROAD_CHAPTERS, ROAD_SCENES } from '@/story/road';
import { ROAD_CODE, ROAD_ZONES, ZONES, partyCode, zoneByCode } from './fog';

const train = (s: GameState, n: number) => addFakeWorkouts(s, n, new Date(2026, 9, 1), false);
const at = (s: GameState) => roadAt(s);

describe('the Ember Road', () => {
  it('has not started until you set out', () => {
    const s = train(initialState(), 5);
    expect(at(s).started).toBe(false);
    expect(roadHolds({ open: 1 }, s)).toBe(false);
    expect(at(startRoad(s))).toMatchObject({ started: true, open: 1, beaten: 0, walked: 0 });
  });

  it('opens a chapter only once its boss fell and enough workouts passed', () => {
    let s = startRoad(train(initialState(), 3));
    s = train(s, ROAD.gap);
    expect(at(s).open).toBe(1); // the Lull still stands
    s = wonRoad(s, 1);
    expect(at(s)).toMatchObject({ open: 2, beaten: 1 });
    // A fast party can't rush the next one: the workouts still have to come.
    s = wonRoad(s, 2);
    expect(at(s)).toMatchObject({ open: 2, beaten: 2, nextIn: ROAD.gap });
    s = wonRoad(s, 3); // not open yet: doesn't count
    expect(at(s).beaten).toBe(2);
    s = train(s, ROAD.gap);
    expect(at(s).open).toBe(3);
    s = wonRoad(s, 3);
    expect(at(s).finale).toBe(false);
    s = train(s, ROAD.gap);
    expect(at(s).finale).toBe(true);
  });

  it('a win out of order changes nothing, and a friend brought along sets out', () => {
    const s = train(initialState(), 4);
    expect(wonRoad(s, 2).road).toEqual({ from: 4, beaten: 0 });
    expect(wonRoad(s, 1).road).toEqual({ from: 4, beaten: 1 });
  });

  it('lasts at least a couple of months at the weekly goal', () => {
    // three workouts a week: the finale can't come sooner than about two months after setting out
    expect(ROAD.gap * ROAD_LENGTH).toBeGreaterThanOrEqual(26);
  });

  it('plays its scenes in order as you walk it', () => {
    const ids = (s: GameState) => pendingScenes(s, new Date(2026, 9, 2)).map((x) => x.id).filter((id) => id.startsWith('road'));
    const seen = (s: GameState) => ({ ...s, seenScenes: [...s.seenScenes, ...ids(s)] });
    let s = train(initialState(), 2);
    expect(ids(s)).toEqual([]);
    s = startRoad(s);
    expect(ids(s)).toEqual(['road-1-open']);
    s = seen(train(seen(s), roadNoteAt(1)));
    s = seen(wonRoad(s, 1));
    expect(s.seenScenes).toEqual(expect.arrayContaining(['road-1-note', 'road-1-won']));
    s = train(s, ROAD.gap - roadNoteAt(1));
    expect(ids(s)).toEqual(['road-2-open']);
    s = { ...s, road: { from: s.road!.from - 100, beaten: 3 }, seenScenes: [...s.seenScenes, ...ROAD_SCENES.filter((x) => x.id !== 'road-end').map((x) => x.id)] };
    expect(ids(s)).toEqual(['road-end']);
    expect(roadAt(seen(s)).done).toBe(true);
  });

  it('runs on a story zone, with its own names, and goes to the server as its own code', () => {
    ROAD_ZONES.forEach((z, i) => {
      expect(z.id).toBe(ZONES[ROAD_CHAPTERS[i].base].id);
      expect(z.bossName).toBe(ROAD_CHAPTERS[i].fog.bossName);
      expect(partyCode(z)).toBe(ROAD_CODE + i + 1);
      expect(zoneByCode(partyCode(z))).toBe(z);
    });
    ZONES.forEach((z) => expect(zoneByCode(partyCode(z))).toBe(z));
  });
});
