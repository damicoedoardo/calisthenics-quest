import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type Session } from './game';
import { chapterStops, emberStage, fighterOf, roadState, statusOf, stopAt } from './road';

const sessions = (n: number): Session[] =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i}`, date: new Date(2026, 9, 1 + i).toISOString(), kind: 'full', day: 'A', xp: 100, breakdown: [], entries: [], unlocked: [] }));
const at = (n: number, road: number): GameState => ({ ...initialState(), sessions: sessions(n), road });

describe('road', () => {
  it('lays out chapter 1: a small guardian first, then the boss once per week', () => {
    expect(chapterStops(0).map((s) => s.kind)).toEqual(['guardian', 'fight', 'boss', 'fight', 'elite', 'boss']);
    expect(stopAt(2)?.blow).toEqual({ n: 1, of: 2 });
    expect(stopAt(5)?.blow).toEqual({ n: 2, of: 2 });
  });

  it('sends each workout to the next stop, and lets you scout it once you have trained', () => {
    expect(roadState(at(0, 0)).next?.g).toBe(0);
    expect(roadState(at(0, 0)).canScout).toBe(false);
    const r = roadState(at(2, 2));
    expect(r.next?.g).toBe(2);
    expect(r.canScout).toBe(true);
    expect(roadState({ ...at(2, 2), scouted: 2 }).canScout).toBe(false);
    expect(statusOf(stopAt(1)!, r)).toBe('cleared');
    expect(statusOf(stopAt(2)!, r)).toBe('next');
    expect(statusOf(stopAt(3)!, r)).toBe('fog');
  });

  it('counts every past session as a won stop in saves from before the road', () => {
    expect(roadState({ ...initialState(), sessions: sessions(4) }).cleared).toBe(4);
    // Chapter 2's final blow (stop 14) needs a max test.
    expect(roadState({ ...initialState(), sessions: sessions(17) }).cleared).toBe(14);
  });

  it('holds a final blow that needs a max test', () => {
    // Chapter 2 ends at road stop 15 and needs one test.
    expect(roadState(at(15, 14)).blockedByTest).toBe(true);
    expect(roadState(at(15, 14)).next?.g).toBe(14);
    expect(roadState(at(15, 14)).canScout).toBe(false);
  });

  it('grows Ember with every session and never shrinks it', () => {
    expect(emberStage(0).stage.name).toBe('Spark');
    expect(emberStage(6).stage.name).toBe('Candle');
    expect(emberStage(15).stage.name).toBe('Torch');
    expect(emberStage(50).stage.name).toBe('Beacon');
    expect(emberStage(7).size).toBeGreaterThan(emberStage(6).size);
  });

  it('makes training the only source of power', () => {
    expect(fighterOf(at(10, 0)).hp).toBeGreaterThan(fighterOf(at(0, 0)).hp);
    expect(fighterOf(at(15, 0)).emberStrike).toBe(true);
  });
});
