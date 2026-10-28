import { describe, expect, it } from 'vitest';
import { dayNumber } from './days';
import {
  closeStaleDraft,
  gearOf,
  dayType,
  finishSession,
  initialState,
  levelInfo,
  migrate,
  todaysQuest,
  weekKey,
  weekStreak,
  type Checkin,
  type GameState,
  type Rir,
  type Session,
} from './game';
import { equippedGear, nextForge, tiersAt } from './gear';
import { pendingScenes, renderLines, storyState, storyWords } from '@/story/engine';
import { noteFreq, parsePattern } from './music';
import { seeded } from './random';
import { looksOf, nameOf, rollItem, tierOf } from '@/game/dungeon/items';

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
  it('opens with a warm-up, ends with a stretch, and alternates the two days', () => {
    const a = todaysQuest(initialState());
    expect(a.map((q) => [q.role, q.id])).toEqual([
      ['warmup', 'circles'],
      ['main', 'barbell-squat'],
      ['main', 'bench-press'],
      ['main', 'lat-pulldown'],
      ['core', 'plank'],
      ['stretch', 'quad-stretch'],
    ]);
    const b = todaysQuest({ ...initialState(), sessions: fakeSessions(1) });
    expect(b[1].id).toBe('rdl');
    expect(b[b.length - 1].role).toBe('stretch');
  });

  it('trains at home with no kit when the player says so', () => {
    const home = { ...initialState(), profile: { ...initialState().profile, kit: 'home' as const } };
    expect(todaysQuest(home).map((q) => q.id)).toEqual(['circles', 'squat', 'pushup', 'inverted-row', 'plank', 'quad-stretch']);
  });

  it('keeps the warm-up and the stretch on a rough day, around one exercise of 3 sets', () => {
    const q = todaysQuest(initialState(), 'rough');
    expect(q.map((x) => x.role)).toEqual(['warmup', 'main', 'stretch']);
    expect(q[1].sets).toBe(3);
  });
});

describe('finishSession', () => {
  it('awards a full session and raises targets done cleanly', () => {
    const res = finishSession(withSets(initialState(), { circles: all(1, 90), 'barbell-squat': all(3, 8), 'bench-press': all(3, 8) }), monday)!;
    expect(res.session.kind).toBe('full');
    expect(res.session.xp).toBe(100);
    expect(res.state.reps['barbell-squat']).toBe(9);
    expect(res.state.reps.circles).toBeUndefined();
    expect(res.state.draft).toBeNull();
  });

  it('saves a workout left open on an earlier day on that day', () => {
    const open = withSets(initialState(), { 'barbell-squat': all(2, 8) });
    // Same evening, or past midnight in the same workout: left alone.
    expect(closeStaleDraft(open, new Date(2026, 9, 26, 22))).toBe(open);
    expect(closeStaleDraft(open, new Date(2026, 9, 27, 1))).toBe(open);
    const later = closeStaleDraft(open, new Date(2026, 9, 28, 9));
    expect(later.draft).toBeNull();
    expect(later.sessions).toHaveLength(1);
    expect(later.sessions[0].date).toBe(monday.toISOString());
    // An open quest with no sets logged is just dropped.
    const empty = { ...initialState(), draft: { startedAt: monday.toISOString(), checkin: 'normal' as const, sets: {} } };
    expect(closeStaleDraft(empty, new Date(2026, 9, 28, 9))).toEqual({ ...empty, draft: null });
  });

  it('holds the target when a set was very hard', () => {
    const sets = all(2, 8);
    sets.push([8, '0-1']);
    const res = finishSession(withSets(initialState(), { 'bench-press': sets }), monday)!;
    expect(res.state.reps['bench-press']).toBeUndefined();
  });

  it('counts a rough day as a minimum session that still earns XP', () => {
    const res = finishSession(withSets(initialState(), { 'barbell-squat': all(3, 8) }, 'rough'), monday)!;
    expect(res.session.kind).toBe('mini');
    expect(res.session.xp).toBe(30);
  });

  it('is not a workout with only the warm-up done', () => {
    expect(finishSession(withSets(initialState(), { circles: all(1, 90) }), monday)).toBeNull();
  });

  it('raises a goal at most twice a week', () => {
    const day = (d: number) => new Date(2026, 9, 26 + d, 18);
    // Every other session is day A, so the squat comes up on sessions 1, 3 and 5.
    let s = initialState();
    const squat = () => s.reps['barbell-squat'] ?? 8;
    for (const d of [0, 1, 2, 3, 4]) {
      const sets: Record<string, [number, Rir][]> = dayType(s) === 'A' ? { 'barbell-squat': all(3, squat()) } : { rdl: all(3, 8) };
      s = finishSession(withSets(s, sets), day(d))!.state;
    }
    expect(s.reps['barbell-squat']).toBe(10);
  });

  it('raises a hold by 5 seconds every other time', () => {
    const day = (d: number) => new Date(2026, 9, 26 + d, 18);
    let s = initialState();
    const held: number[] = [];
    for (const d of [0, 7, 14, 21]) {
      // keep it on day A, where the plank is
      s = { ...s, sessions: s.sessions.length % 2 ? [...s.sessions, ...fakeSessions(1, day(d - 1))] : s.sessions };
      s = finishSession(withSets(s, { plank: all(3, s.reps.plank ?? 20) }), day(d))!.state;
      held.push(s.reps.plank ?? 20);
    }
    expect(held).toEqual([25, 25, 30, 30]);
  });

  it('asks for a little more weight at the top of the range', () => {
    const state = { ...initialState(), reps: { 'barbell-squat': 12 } };
    const res = finishSession(withSets(state, { 'barbell-squat': all(3, 12) }), monday)!;
    expect(res.session.heavier).toEqual(['barbell-squat']);
    expect(res.state.reps['barbell-squat']).toBe(8);
  });

  it('notes a set that beat the same exercise last time', () => {
    const first = finishSession(withSets(initialState(), { 'barbell-squat': all(3, 8) }), monday)!.state;
    expect(first.sessions[0].better).toBe(false);
    // day B in between, then the squat again with one more rep
    const b = finishSession(withSets(first, { rdl: all(3, 8) }), new Date(2026, 9, 28, 18))!.state;
    const again = finishSession(withSets(b, { 'barbell-squat': all(3, 9) }), new Date(2026, 9, 30, 18))!;
    expect(again.session.better).toBe(true);
  });

  it('adds the perfect week bonus on the third session of a week', () => {
    const state = { ...initialState(), sessions: fakeSessions(2, new Date(2026, 9, 26, 8)).map((s, i) => ({ ...s, date: new Date(2026, 9, 26, 8 + i).toISOString() })) };
    const res = finishSession(withSets(state, { 'barbell-squat': all(2, 8) }), monday)!;
    expect(res.session.breakdown.some((l) => l.label === 'Perfect week')).toBe(true);
  });

  it("no longer forges gear by itself: finer gear comes from the Fog", () => {
    const state = { ...initialState(), sessions: fakeSessions(3) };
    const res = finishSession(withSets(state, { rdl: all(3, 8) }), monday)!;
    expect(res.newGear).toEqual([]);
  });

  it('returns null with nothing logged', () => {
    expect(finishSession(withSets(initialState(), {}), monday)).toBeNull();
  });
});

describe('gear and classes', () => {
  it('starts with a weapon and armor, and forges one slot a tier every 4 workouts', () => {
    expect(tiersAt(0)).toEqual({ weapon: 1, armor: 1, shield: 0 });
    expect(tiersAt(4)).toEqual({ weapon: 1, armor: 1, shield: 1 });
    expect(tiersAt(12)).toEqual({ weapon: 2, armor: 2, shield: 1 });
    expect(tiersAt(1000)).toEqual({ weapon: 6, armor: 6, shield: 6 });
    expect(equippedGear('archer', 8).weapon.name).toBe('Iron bow');
    expect(nextForge(5, 'monk')).toMatchObject({ in: 3, gear: { name: 'Iron staff' } });
    expect(nextForge(1000, 'monk')).toBeNull();
  });
});

describe('story', () => {
  it('opens chapters with workouts', () => {
    expect(storyState({ ...initialState(), sessions: fakeSessions(11) }).index).toBe(0);
    expect(storyState({ ...initialState(), sessions: fakeSessions(12) }).index).toBe(1);
    expect(storyState({ ...initialState(), sessions: fakeSessions(24) }).index).toBe(2);
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
    const state = { ...initialState(), sessions: fakeSessions(50) };
    expect(storyState(state).index).toBe(4);
    expect(storyState(state).chapter?.enemySprite).toBe('hollow');
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

describe('levels, migration', () => {
  it('levels up every 500 XP with spec titles', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, title: 'Rookie' });
    expect(levelInfo(2000)).toMatchObject({ level: 5, title: 'Squire' });
  });

  it('migrates a v1 save', () => {
    const v1 = { version: 1, progress: { push: 2, pull: 1, core: 0 }, reps: {}, sessions: [{ id: 'a', date: monday.toISOString(), kind: 'full', xp: 100, entries: [{ exerciseId: 'pushup', setsDone: 3, reps: 9 }], unlocked: [] }], tests: [] };
    const s = migrate(v1);
    expect(s.version).toBe(3);
    expect(s.profile.onboarded).toBe(false);
    expect(s.sessions[0].entries[0].sets).toHaveLength(3);
    expect(dayType(s)).toBe('B');
    expect(weekStreak(s, monday)).toBe(0);
  });

  it('carries a v2 save over without the skill tree and the max tests', () => {
    const v2 = {
      version: 2,
      profile: { onboarded: true, letter: { why: 'x', want: '', forWho: '', remind: '' }, voice: 'Quit.', classId: 'monk', flame: 'Pip' },
      progress: { push: 3, pull: 2, core: 1 },
      reps: { pushup: 12 },
      sessions: [{ id: 'a', date: monday.toISOString(), kind: 'full', day: 'A', xp: 100, breakdown: [], entries: [], unlocked: ['pushup'] }],
      tests: [{ id: 't', date: monday.toISOString(), pushups: 20, pullups: 3, lsitSec: 5, xp: 200 }],
      draft: null,
      seenScenes: ['first-quest'],
      fog: { cleared: 1, runs: 4, best: {} },
    };
    const s = migrate(v2) as GameState & Record<string, unknown>;
    expect(s.version).toBe(3);
    expect(s.progress).toBeUndefined();
    expect(s.tests).toBeUndefined();
    expect(s.reps).toEqual({});
    expect(s.sessions[0]).not.toHaveProperty('unlocked');
    expect(s.profile).toMatchObject({ onboarded: true, classId: 'monk', flame: 'Pip' });
    expect(s.seenScenes).toEqual(['first-quest']);
    expect(s.fog?.cleared).toBe(1);
  });

  it("keeps the gear the old forge had made as the hero's look", () => {
    const old = { ...initialState(), sessions: fakeSessions(12) };
    const s = migrate(old);
    expect(s.fogGear?.kit).toEqual(tiersAt(12));
    expect(gearOf(s).weapon.tier).toBe(2);
    // once frozen, more workouts don't change it
    expect(migrate({ ...s, sessions: fakeSessions(40) }).fogGear?.kit).toEqual(tiersAt(12));
  });

  it('hands back the points in Reach, and bows that asked for Reach ask for Haste', () => {
    const bow = { ...rollItem(seeded(5), { zone: 1, workouts: 10, floor: 3, cls: 'archer' }, 'magic'), slot: 'weapon' as const },
      old = { ...bow, need: { stat: 'reach', n: 9 } } as unknown as typeof bow;
    const s = migrate({ ...initialState(), build: { damage: 4, reach: 6 }, fogGear: { worn: { weapon: old }, vault: [old], kit: { weapon: 1, armor: 1, shield: 0 } } });
    expect(s.build).toEqual({ damage: 4 });
    expect(s.fogGear?.worn.weapon?.need).toEqual({ stat: 'speed', n: 9 });
    expect(s.fogGear?.vault[0].need).toEqual({ stat: 'speed', n: 9 });
  });

  it('hands back the points in Crit, bows ask for Haste, Pickup bonuses become crit or Evade, armor asks no points', () => {
    const bow = { ...rollItem(seeded(5), { zone: 1, workouts: 10, floor: 3, cls: 'archer' }, 'magic'), slot: 'weapon' as const },
      oldBow = { ...bow, need: { stat: 'crit', n: 9 }, bonuses: [{ id: 'pickup', v: 0.1 }] } as unknown as typeof bow,
      plate = { ...rollItem(seeded(6), { zone: 1, workouts: 10, floor: 3, cls: 'archer' }, 'magic'), slot: 'armor' as const },
      oldPlate = { ...plate, need: { stat: 'armor', n: 5 }, bonuses: [{ id: 'pickup', v: 0.1 }] } as unknown as typeof plate;
    const s = migrate({ ...initialState(), build: { damage: 4, crit: 6 }, fogGear: { worn: { weapon: oldBow }, vault: [oldPlate], kit: { weapon: 1, armor: 1, shield: 0 } } });
    expect(s.build).toEqual({ damage: 4 });
    expect(s.fogGear?.worn.weapon?.need).toEqual({ stat: 'speed', n: 9 });
    expect(s.fogGear?.worn.weapon?.bonuses.map((b) => b.id)).toEqual(['crit']);
    expect(s.fogGear?.vault[0].bonuses.map((b) => b.id)).toEqual(['evade']);
    expect(s.fogGear?.vault[0].bonuses[0].v).toBeGreaterThan(0);
    // Armor asks only for a level now, old armor too.
    expect(s.fogGear?.vault[0].need).toBeNull();
  });

  it('the look follows a finer item you wear into the Fog', () => {
    const blade = rollItem(seeded(3), { zone: 3, workouts: 30, floor: 8, cls: 'warrior' }, 'legendary');
    const s: GameState = { ...initialState(), fogGear: { worn: { [blade.slot]: blade }, vault: [], kit: { weapon: 1, armor: 1, shield: 0 } } };
    const slot = blade.slot === 'charm' ? 'shield' : blade.slot;
    expect(gearOf(s)[slot].tier).toBe(tierOf(blade));
    expect(gearOf(initialState()).weapon.tier).toBe(1);
  });

  it('the hero wears the very item: its look and name, not just its tier', () => {
    const blade = rollItem(seeded(3), { zone: 3, workouts: 30, floor: 8, cls: 'warrior' }, 'legendary');
    const s: GameState = { ...initialState(), fogGear: { worn: { [blade.slot]: blade }, vault: [], kit: { weapon: 1, armor: 1, shield: 0 } } };
    const g = gearOf(s)[blade.slot === 'charm' ? 'shield' : blade.slot];
    expect(g.item).toEqual(looksOf(blade));
    expect(g.name).toBe(nameOf(blade));
    // without a worn item, the old look has no item
    expect(gearOf(initialState()).armor.item).toBeUndefined();
  });
});

describe('dayNumber', () => {
  const page = (day: string) => ({ day, line: '', quote: { text: '', by: '' } });
  const now = new Date(2026, 9, 27, 9);

  it('counts today even before its page is written', () => {
    expect(dayNumber(initialState(), now)).toBe(1);
    expect(dayNumber({ ...initialState(), days: [page('2026-10-25')] }, now)).toBe(2);
  });

  it("doesn't count today twice", () => {
    expect(dayNumber({ ...initialState(), days: [page('2026-10-25'), page('2026-10-27')] }, now)).toBe(2);
  });
});
