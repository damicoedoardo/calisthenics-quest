import { describe, expect, it } from 'vitest';
import { finishSession, initialState, todaysQuest, type GameState, type Session } from './game';
import { answer, foeHp, foeLeft, hitFor, isCharged, restDays, setPower, settleFight, starsOf, startFight, strike, undoBlow, vitals, type WorkoutFight } from './fight';
import { roadState } from './road';

const day = (d: number, h = 18) => new Date(2026, 9, d, h);

const sessionOn = (date: Date, i = 0): Session => ({
  id: `s${i}`,
  date: date.toISOString(),
  kind: 'full',
  day: 'A',
  xp: 100,
  breakdown: [],
  entries: [],
  unlocked: [],
});

function begin(state: GameState, now = day(26)): GameState {
  return { ...state, draft: { startedAt: now.toISOString(), checkin: 'normal', sets: {}, fight: startFight(state, now) } };
}

/** Logs every planned set at target, answering each with `grade`. */
function playAll(state: GameState, grade: 'perfect' | 'good' | 'miss'): GameState {
  let s = state;
  const quest = todaysQuest(s);
  const total = quest.reduce((a, q) => a + q.sets, 0);
  let n = 0;
  for (const q of quest)
    for (let i = 0; i < q.sets; i++) {
      n++;
      const f = strike(s, s.draft!.fight!, q, q.reps);
      const sets = { ...s.draft!.sets, [q.id]: [...(s.draft!.sets[q.id] ?? []), { reps: q.reps, rir: '2-3' as const }] };
      s = { ...s, draft: { ...s.draft!, sets, fight: f } };
      if (n < total) s = { ...s, draft: { ...s.draft!, fight: answer(s, s.draft!.fight!, [grade]) } };
    }
  return s;
}

describe('the fight inside a workout', () => {
  it('starts at the next road stop, with a shield for each rest day', () => {
    const fresh = startFight(initialState(), day(26))!;
    expect(fresh.g).toBe(0);
    expect(fresh.shields).toBe(1);
    const trained = { ...initialState(), sessions: [sessionOn(day(19))], road: 1 };
    expect(restDays(trained, day(20))).toBe(0);
    expect(restDays(trained, day(21))).toBe(1);
    expect(restDays(trained, day(26))).toBe(2);
    expect(startFight({ ...trained, scouted: 1 }, day(21))!.shields).toBe(2);
  });

  it('makes the foe exactly your planned workout: it stays up until your last set', () => {
    const s = begin(initialState());
    const quest = todaysQuest(s);
    expect(foeHp(s, quest)).toBe(quest.reduce((a, q) => a + q.sets, 0) * setPower(s));
    // Good guards never charge a hit, so every set at target deals exactly one set's power.
    const done = playAll(s, 'good');
    const f = done.draft!.fight!;
    expect(f.blows.every((b) => b.dmg === setPower(s))).toBe(true);
    expect(foeLeft(done, f, quest, false)).toBe(1);
    expect(foeLeft(done, f, quest, true)).toBe(0);
  });

  it('sizes a hit by your reps against the target, and a perfect guard charges the next one', () => {
    const s = begin(initialState());
    const q = todaysQuest(s)[0];
    expect(hitFor(s, q, q.reps * 2, false)).toBeGreaterThan(hitFor(s, q, q.reps, false));
    expect(hitFor(s, q, q.reps, true)).toBe(Math.round(setPower(s) * 1.5));
    let f = strike(s, s.draft!.fight!, q, q.reps);
    expect(isCharged(s, f)).toBe(false);
    f = answer(s, f, ['perfect']);
    expect(isCharged(s, f)).toBe(true);
    expect(strike(s, f, q, q.reps).blows[1].charged).toBe(true);
  });

  it('lets shields take whole hits, and Ember helps you up when you fall', () => {
    const s = begin(initialState());
    const q = todaysQuest(s)[0];
    let f = answer(s, strike(s, s.draft!.fight!, q, q.reps), ['miss']);
    expect(f.blows[0].shielded).toBe(1);
    expect(vitals(s, f).hp).toBe(vitals(s, f).hpMax);
    const fall: WorkoutFight = { ...f, shields: 0, blows: [{ ...f.blows[0], shielded: 0, taken: 999, down: true }] };
    expect(vitals(s, fall).hp).toBe(Math.ceil(vitals(s, fall).hpMax / 2));
    expect(starsOf(fall)).toBe(1);
    f = undoBlow(f, q.id);
    expect(f.blows).toHaveLength(0);
  });

  it('gives stars for skill: 3 for mostly perfect guards, 2 without falling', () => {
    const s = begin(initialState());
    expect(starsOf(playAll(s, 'perfect').draft!.fight!)).toBe(3);
    expect(starsOf(playAll(s, 'good').draft!.fight!)).toBe(2);
  });

  it('wins the stop when the workout is finished, and moves the road on', () => {
    const s = playAll(begin(initialState()), 'perfect');
    const res = settleFight(finishSession(s, day(26))!, s);
    expect(res.session.fight).toEqual({ g: 0, stars: 3 });
    expect(res.state.road).toBe(1);
    expect(res.state.sessions.at(-1)?.fight?.g).toBe(0);
    expect(roadState(res.state).next?.g).toBe(1);
  });

  it('fights a patrol that keeps the road in place while a final blow waits for its max test', () => {
    const sessions = Array.from({ length: 14 }, (_, i) => sessionOn(day(1 + i), i));
    const waiting = { ...initialState(), sessions, road: 14 };
    expect(startFight(waiting, day(26))?.patrol).toBe(true);
    const s = playAll(begin(waiting), 'good');
    const res = settleFight(finishSession(s, day(26))!, s);
    expect(res.session.fight?.patrol).toBe(true);
    expect(res.state.road).toBe(14);
  });
});
