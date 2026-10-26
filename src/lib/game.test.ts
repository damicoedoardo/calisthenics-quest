import { describe, expect, it } from 'vitest';
import {
  dayType,
  finishSession,
  initialState,
  levelInfo,
  logMaxTest,
  migrate,
  placement,
  todaysQuest,
  weekKey,
  weekStreak,
  type Checkin,
  type GameState,
  type Rir,
  type Session,
} from './game';
import { equippedGear, rewardFor } from './gear';
import { pendingScenes, renderLines, storyState, storyWords } from '@/story/engine';
import { noteFreq, parsePattern } from './music';

const monday = new Date(2026, 9, 26, 18);

function withSets(state: GameState, sets: Record<string, [number, Rir][]>, checkin: Checkin = 'normal'): GameState {
  const mapped = Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.map(([reps, rir]) => ({ reps, rir }))]));
  return { ...state, draft: { startedAt: monday.toISOString(), checkin, sets: mapped } };
}

function fakeSessions(n: number, start = new Date(2026, 8, 1)): Session[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    date: new Date(start.getTime() + i * 2 * 86_400_000).toISOString(),
    kind: 'full',
    day: 'A',
    xp: 100,
    breakdown: [],
    entries: [],
    unlocked: [],
  }));
}

const all = (n: number, reps: number, rir: Rir = '2-3'): [number, Rir][] => Array.from({ length: n }, () => [reps, rir]);

describe('weekKey', () => {
  it('maps every day to its Monday', () => {
    expect(weekKey(new Date(2026, 9, 26))).toBe('2026-10-26');
    expect(weekKey(new Date(2026, 10, 1))).toBe('2026-10-26');
    expect(weekKey(new Date(2026, 10, 2))).toBe('2026-11-02');
  });
});

describe('todaysQuest', () => {
  it('leads with Push on day A and Pull on day B, with core and support', () => {
    const a = todaysQuest(initialState());
    expect(a.map((q) => [q.role, q.path])).toEqual([
      ['main', 'push'],
      ['core', 'core'],
      ['support', 'pull'],
    ]);
    const b = todaysQuest({ ...initialState(), sessions: fakeSessions(1) });
    expect(b[0].path).toBe('pull');
  });

  it('shrinks to the main exercise on a rough day', () => {
    const q = todaysQuest(initialState(), 'rough');
    expect(q).toHaveLength(1);
    expect(q[0].sets).toBe(3);
  });
});

describe('finishSession', () => {
  it('awards a full session and raises targets done cleanly', () => {
    const res = finishSession(withSets(initialState(), { pushup: all(5, 8), 'knee-raise': all(3, 8) }), monday)!;
    expect(res.session.kind).toBe('full');
    expect(res.session.xp).toBe(100);
    expect(res.state.reps.pushup).toBe(9);
    expect(res.state.draft).toBeNull();
  });

  it('holds the target when a set was very hard', () => {
    const sets = all(4, 8);
    sets.push([8, '0-1']);
    const res = finishSession(withSets(initialState(), { pushup: sets }), monday)!;
    expect(res.state.reps.pushup).toBeUndefined();
  });

  it('counts a rough day as a minimum session that still earns XP', () => {
    const res = finishSession(withSets(initialState(), { pushup: all(3, 8) }, 'rough'), monday)!;
    expect(res.session.kind).toBe('mini');
    expect(res.session.xp).toBe(30);
  });

  it('beats the node and forges gear when the unlock target is hit', () => {
    const res = finishSession(withSets(initialState(), { pushup: all(3, 20) }), monday)!;
    expect(res.state.progress.push).toBe(2);
    expect(res.newGear.map((g) => g.name)).toEqual(['Iron sword']);
    expect(res.session.breakdown.find((l) => l.label === 'Push-up beaten')?.xp).toBe(250);
  });

  it('never unlocks from the support block', () => {
    const state = { ...initialState(), progress: { push: 1, pull: 2, core: 0 } };
    const res = finishSession(withSets(state, { 'assisted-pullup': all(4, 12) }), monday)!;
    expect(res.state.progress.pull).toBe(2);
  });

  it('adds the perfect week bonus on the third session of a week', () => {
    const state = { ...initialState(), sessions: fakeSessions(2, new Date(2026, 9, 26, 8)).map((s, i) => ({ ...s, date: new Date(2026, 9, 26, 8 + i).toISOString() })) };
    const res = finishSession(withSets(state, { pushup: all(2, 8) }), monday)!;
    expect(res.session.breakdown.some((l) => l.label === 'Perfect week')).toBe(true);
  });

  it('gives the class bonus when the lead exercise is on the class path', () => {
    const state = { ...initialState(), profile: { ...initialState().profile, classId: 'warrior' as const } };
    const res = finishSession(withSets(state, { pushup: all(2, 8) }), monday)!;
    expect(res.session.breakdown.some((l) => l.label === 'Class bonus')).toBe(true);
  });

  it('returns null with nothing logged', () => {
    expect(finishSession(withSets(initialState(), {}), monday)).toBeNull();
  });
});

describe('gear and classes', () => {
  it('forges the weapon from the class path', () => {
    const progress = { push: 1, pull: 3, core: 0 };
    expect(equippedGear('warrior', progress).weapon.name).toBe('Wooden sword');
    expect(equippedGear('archer', progress).weapon.name).toBe('Steel bow');
    expect(equippedGear('archer', progress).armor.name).toBe('Leather armor');
    expect(rewardFor('monk', progress, 'core', 0).name).toBe('Wooden staff');
  });
});

describe('story', () => {
  it('opens chapters with sessions and waits for the max test where needed', () => {
    expect(storyState({ ...initialState(), sessions: fakeSessions(11) }).index).toBe(0);
    expect(storyState({ ...initialState(), sessions: fakeSessions(12) }).index).toBe(1);
    expect(storyState({ ...initialState(), sessions: fakeSessions(15) }).awaitingTest).toBe(false);
    const waiting = storyState({ ...initialState(), sessions: fakeSessions(24) });
    expect(waiting.index).toBe(1);
    expect(waiting.awaitingTest).toBe(true);
    const tested = logMaxTest({ ...initialState(), sessions: fakeSessions(24) }, { pushups: 20, pullups: 4, lsitSec: 5 }, monday).state;
    expect(storyState(tested).index).toBe(2);
  });

  it('asks for the flame name first, then the class after the third session', () => {
    const state = { ...initialState(), sessions: fakeSessions(3), seenScenes: ['first-quest'] };
    expect(pendingScenes(state, new Date(2026, 8, 6)).map((s) => s.id).slice(0, 2)).toEqual(['flame-name', 'class-choice']);
    const named = { ...state, seenScenes: ['first-quest', 'flame-name'] };
    expect(pendingScenes(named, new Date(2026, 8, 6))[0].id).toBe('class-choice');
  });

  it('fills the letter into lines and drops empty parts', () => {
    const lines = renderLines(
      [
        { who: 'bestself', text: 'You wrote "{why}."', needs: 'why' },
        { who: 'bestself', text: 'And "{remind}."', needs: 'remind' },
      ],
      { ...storyWords(initialState()), why: 'I miss being strong.' },
    );
    expect(lines).toEqual([{ who: 'bestself', text: 'You wrote "I miss being strong."', needs: 'why' }]);
  });

  it("lets the Hollow speak the player's own line and real numbers", () => {
    const state = { ...initialState(), sessions: fakeSessions(27) };
    state.profile = { ...state.profile, voice: 'You always quit.' };
    const lines = renderLines(
      [
        { who: 'hollow', text: '{voice}', needs: 'voice' },
        { who: 'hollow', text: '{sessions} sessions. Cute.' },
      ],
      storyWords(state),
    );
    expect(lines.map((l) => l.text)).toEqual(['You always quit.', '27 sessions. Cute.']);
  });

  it('makes the Hollow the enemy of chapter 5', () => {
    const test = { id: 't1', date: monday.toISOString(), pushups: 20, pullups: 3, lsitSec: 5, xp: 200 };
    const tested = { ...initialState(), sessions: fakeSessions(50), tests: [test, { ...test, id: 't2' }] };
    expect(storyState(tested).index).toBe(4);
    expect(storyState(tested).chapter?.enemySprite).toBe('hollow');
  });
});

describe('music', () => {
  it('tunes notes to A440', () => {
    expect(noteFreq('A4')).toBe(440);
    expect(noteFreq('A3')).toBe(220);
    expect(Math.round(noteFreq('C4'))).toBe(262);
  });

  it('reads holds and rests in a pattern', () => {
    expect(parsePattern('C4 - - . E4 -')).toEqual({
      events: [
        { step: 0, steps: 3, note: 'C4' },
        { step: 4, steps: 2, note: 'E4' },
      ],
      length: 6,
    });
  });
});

describe('placement, levels, migration', () => {
  it('places a returning athlete one step low', () => {
    expect(placement(18, 3, 10)).toEqual({ push: 1, pull: 1, core: 0 });
  });

  it('levels up every 500 XP with spec titles', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, title: 'Rookie' });
    expect(levelInfo(2000)).toMatchObject({ level: 5, title: 'Squire' });
  });

  it('migrates a v1 save', () => {
    const v1 = { version: 1, progress: { push: 2, pull: 1, core: 0 }, reps: {}, sessions: [{ id: 'a', date: monday.toISOString(), kind: 'full', xp: 100, entries: [{ exerciseId: 'pushup', setsDone: 3, reps: 9 }], unlocked: [] }], tests: [] };
    const s = migrate(v1);
    expect(s.version).toBe(2);
    expect(s.profile.onboarded).toBe(false);
    expect(s.sessions[0].entries[0].sets).toHaveLength(3);
    expect(dayType(s)).toBe('B');
    expect(weekStreak(s, monday)).toBe(0);
  });
});
