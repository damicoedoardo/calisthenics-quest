import { describe, expect, it } from 'vitest';
import { finishSession, initialState, levelInfo, logMaxTest, todaysQuest, weekKey, weekStreak, type GameState } from './game';

const monday = new Date(2026, 9, 26, 18);

function withDraft(state: GameState, done: Record<string, number>): GameState {
  return { ...state, draft: { startedAt: monday.toISOString(), done } };
}

describe('weekKey', () => {
  it('maps every day to its Monday', () => {
    expect(weekKey(new Date(2026, 9, 26))).toBe('2026-10-26');
    expect(weekKey(new Date(2026, 10, 1))).toBe('2026-10-26');
    expect(weekKey(new Date(2026, 10, 2))).toBe('2026-11-02');
  });
});

describe('finishSession', () => {
  it('awards a full session when at least half the sets are done', () => {
    const quest = todaysQuest(initialState());
    const done = Object.fromEntries(quest.map((q) => [q.id, q.sets]));
    const res = finishSession(withDraft(initialState(), done), monday)!;
    expect(res.session.kind).toBe('full');
    expect(res.session.xp).toBe(100);
    expect(res.state.draft).toBeNull();
  });

  it('counts a single exercise as a mini session that still earns XP', () => {
    const res = finishSession(withDraft(initialState(), { pushup: 2 }), monday)!;
    expect(res.session.kind).toBe('mini');
    expect(res.session.xp).toBe(30);
  });

  it('adds one rep at most once a week for fully done exercises', () => {
    let state = withDraft(initialState(), { pushup: 5 });
    state = finishSession(state, monday)!.state;
    expect(state.reps.pushup).toBe(9);
    state = finishSession(withDraft(state, { pushup: 5 }), new Date(2026, 9, 28))!.state;
    expect(state.reps.pushup).toBe(9);
  });

  it('unlocks the next node and its gear when the target is hit', () => {
    const state = withDraft({ ...initialState(), reps: { pushup: 20 } }, { pushup: 3 });
    const res = finishSession(state, monday)!;
    expect(res.state.progress.push).toBe(2);
    expect(res.newGear.map((g) => g.name)).toEqual(['Iron sword']);
    expect(res.session.xp).toBe(30 + 150);
  });

  it('returns null with nothing done', () => {
    expect(finishSession(withDraft(initialState(), {}), monday)).toBeNull();
  });
});

describe('weekStreak', () => {
  it('counts consecutive weeks hitting three sessions', () => {
    const s = initialState();
    const dates = [
      new Date(2026, 9, 12), new Date(2026, 9, 14), new Date(2026, 9, 16),
      new Date(2026, 9, 19), new Date(2026, 9, 21), new Date(2026, 9, 23),
    ];
    s.sessions = dates.map((d, i) => ({ id: String(i), date: d.toISOString(), kind: 'full', xp: 100, entries: [], unlocked: [] }));
    expect(weekStreak(s, monday)).toBe(2);
  });
});

describe('levels and tests', () => {
  it('levels up every 500 XP', () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(500).level).toBe(2);
  });

  it('gives test XP only after the cooldown', () => {
    let state = logMaxTest(initialState(), { pushups: 18, pullups: 3, lsitSec: 0 }, monday).state;
    expect(state.tests[0].xp).toBe(200);
    state = logMaxTest(state, { pushups: 19, pullups: 3, lsitSec: 0 }, new Date(2026, 10, 2)).state;
    expect(state.tests[1].xp).toBe(0);
  });
});
