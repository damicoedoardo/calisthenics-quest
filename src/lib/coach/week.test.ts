import { beforeAll, describe, expect, it } from 'vitest';
import { loadLibrary, type LibraryExercise } from '@/exercises/library';
import { seeded } from '@/lib/random';
import { finishSession, initialState, migrate, todaysQuest, type GameState } from '@/lib/game';
import { applySetup, type SetupAnswers } from './setup';
import { runTool, resolveDay, type ToolContext } from './tools';
import { buildWeek, currentPlan, daysIn, needsPlan, planAhead, shownWeek, weekDoneId, dayLabel, fromLegacy, markDone, nextDay, isRestToday, restKept, restToday, setDay, startsToday, todayIs, weekDates, weekOver, weekSlots, weekText } from './week';
import { coachNudge, freshNudge, hearNudge } from './nudge';
import { coachBrief } from './brief';
import { changeItem } from './plan';
import { REST } from '@/balance';
import type { CoachPlan } from './types';

let all: LibraryExercise[];
beforeAll(async () => {
  all = await loadLibrary();
});

// A Wednesday, at noon local time.
const NOW = new Date(2026, 9, 28, 12);
const ids = () => {
  let n = 0;
  return () => `n${++n}`;
};
const answers = (over: Partial<SetupAnswers> = {}): SetupAnswers => ({ modes: ['gym'], goal: 'muscle', days: 3, minutes: 40, gear: ['gym'], experience: 'returning', pushups: 2, pullups: 1, lifts: 1, run: 1, avoid: [], ...over });
const withSetup = (a: SetupAnswers = answers()): GameState => ({ ...initialState(), coach: applySetup(undefined, a, NOW, ids()) });
const withWeek = (a?: SetupAnswers): GameState => {
  const s = withSetup(a);
  return { ...s, coach: { ...s.coach!, week: buildWeek({ all, coach: s.coach!, sessions: [], now: NOW, rng: seeded(1) }) } };
};
const ctx = (now = NOW): ToolContext => ({ all, now, id: ids(), rng: seeded(1) });
const run = (s: GameState, name: string, args: unknown, now = NOW) => runTool(s, name, JSON.stringify(args), ctx(now));
const trainAll = (s: GameState, now: Date) => {
  const sets = Object.fromEntries(todaysQuest(s).map((q) => [q.id, [{ reps: q.reps, rir: '2-3' as const }]]));
  return finishSession({ ...s, draft: { startedAt: now.toISOString(), checkin: 'normal', sets } }, now, () => `s${now.getTime()}`)!.state;
};

describe('the week', () => {
  it('spreads the workout days over seven days', () => {
    expect(weekDates(NOW, 3)).toEqual(['2026-10-28', '2026-10-30', '2026-11-01']);
    expect(weekDates(NOW, 2)).toEqual(['2026-10-28', '2026-10-31']);
    expect(dayLabel('2026-10-28', NOW)).toBe('Today');
    expect(dayLabel('2026-10-29', NOW)).toBe('Tomorrow');
    expect(dayLabel('2026-10-30', NOW)).toBe('Fri');
  });

  it('runs Monday to Sunday: late in the week fewer workouts fit, and Monday starts a new one', () => {
    expect(weekDates(new Date(2026, 9, 26, 12), 3)).toEqual(['2026-10-26', '2026-10-28', '2026-10-30']);
    expect(weekDates(new Date(2026, 9, 30, 12), 3)).toEqual(['2026-10-30', '2026-11-01']);
    expect(weekDates(new Date(2026, 10, 1, 12), 4)).toEqual(['2026-11-01']);
    const s = withWeek();
    expect(weekOver(s.coach!.week, new Date(2026, 10, 1, 23))).toBe(false);
    expect(weekOver(s.coach!.week, new Date(2026, 10, 2, 8))).toBe(true);
  });

  it('is built with one workout a day, modes taking turns', () => {
    const s = withWeek(answers({ modes: ['gym', 'running'] }));
    const week = s.coach!.week!;
    expect(week.days).toHaveLength(3);
    expect(new Set(week.days.map((d) => d.plan.mode)).size).toBe(2);
    expect(currentPlan(s.coach)).toBe(week.days[0].plan);
  });

  it('Today and the workout read the next day; finishing marks it done and the next one is up', () => {
    let s = withWeek();
    const [first, second] = s.coach!.week!.days;
    expect(todaysQuest(s).map((q) => q.id)).toEqual(first.plan.items.filter((i) => !i.skipped).map((i) => i.id));
    s = trainAll(s, NOW);
    expect(s.coach!.week!.days[0].done).toBe(NOW.toISOString());
    expect(currentPlan(s.coach)).toEqual(second.plan);
    expect(weekOver(s.coach!.week, NOW)).toBe(false);
  });

  it('a missed day moves along, and the week runs its seven days even with every workout done', () => {
    const s = withWeek();
    const later = new Date(2026, 9, 31, 12);
    expect(nextDay(s.coach!.week)!.date).toBe('2026-10-28');
    expect(weekOver(s.coach!.week, later)).toBe(false);
    expect(weekOver(s.coach!.week, new Date(2026, 10, 4, 12))).toBe(true);
    let c = s.coach!;
    for (let i = 0; i < 3; i++) c = markDone(c, NOW.toISOString());
    expect(currentPlan(c)).toBeUndefined();
    expect(weekOver(c.week, NOW)).toBe(false);
    expect(markDone(c, NOW.toISOString())).toBe(c);
  });

  it('a workout starts on its day or after it (catching up), never ahead of it', () => {
    const s = withWeek();
    // Planned Wed, Fri, Sun; Wednesday done, so Friday is next.
    const c = markDone(s.coach!, NOW.toISOString());
    const at = (coach: typeof c) => ({ coach, sessions: [] });
    expect(startsToday(at(s.coach!), NOW)).toBe(true);
    expect(startsToday(at(c), NOW)).toBe(false);
    expect(startsToday(at(c), new Date(2026, 9, 29, 12))).toBe(false);
    expect(startsToday(at(c), new Date(2026, 9, 30, 12))).toBe(true);
    expect(startsToday(at(c), new Date(2026, 9, 31, 12))).toBe(true);
    expect(startsToday({ coach: undefined, sessions: [] }, NOW)).toBe(true);
  });

  it('Today and Train read one answer for what today is', () => {
    const s = withWeek();
    const thu = new Date(2026, 9, 29, 12);
    const fri = new Date(2026, 9, 30, 12);
    // Wednesday: a workout day.
    expect(todayIs(s, NOW)).toMatchObject({ kind: 'workout', next: { date: '2026-10-28' } });
    // Done on Wednesday: done for the day, Friday next, and nothing more starts today.
    const done = trainAll(s, NOW);
    expect(todayIs(done, NOW)).toMatchObject({ kind: 'done', next: { date: '2026-10-30' } });
    expect(startsToday(done, NOW)).toBe(false);
    // Thursday: a rest day, Friday ahead; never a workout to start.
    expect(todayIs(done, thu)).toMatchObject({ kind: 'rest', next: { date: '2026-10-30' } });
    expect(isRestToday(done, thu)).toBe(true);
    // The bug: a day or two after a workout used to count as rest even with a workout planned.
    // Friday has a workout, so it is a workout day, not a rest day.
    expect(todayIs(done, fri).kind).toBe('workout');
    expect(isRestToday(done, fri)).toBe(false);
    // A missed day is caught up: Wednesday skipped, Thursday it is still the workout to do.
    expect(todayIs(s, thu)).toMatchObject({ kind: 'workout', next: { date: '2026-10-28' } });
    // Caught up on Friday, Friday's own workout is next and dated today, but today is done:
    // Train locks it just like Today (one workout a day), and Saturday it opens.
    const late = trainAll(s, fri);
    expect(todayIs(late, fri)).toMatchObject({ kind: 'done', next: { date: '2026-10-30' } });
    expect(startsToday(late, fri)).toBe(false);
    expect(todayIs(late, new Date(2026, 9, 31, 12)).kind).toBe('workout');
    // No week yet: nothing planned.
    expect(todayIs({ coach: undefined, sessions: [] }, NOW).kind).toBe('none');
  });

  it('every other day of the week is a rest day, kept by sitting by the fire', () => {
    const s = withWeek();
    const slots = weekSlots(s.coach!.week!);
    // Monday to Sunday: planned on a Wednesday, Monday and Tuesday come before the plan.
    expect(slots.map((x) => (x.day ? 'W' : x.before ? '-' : 'r')).join('')).toBe('--WrWrW');
    const thu = new Date(2026, 9, 29, 12);
    expect(restToday(s.coach, NOW)).toBe(false);
    expect(restToday(s.coach, thu)).toBe(true);
    expect(restKept(s, '2026-10-29')).toBe(false);
    const kept = { ...s, days: [{ day: '2026-10-29', line: '', quote: { text: '', by: '' }, fire: true }] };
    expect(restKept(kept, '2026-10-29')).toBe(true);
    const text = weekText(kept.coach!.week, thu, (d) => restKept(kept, d));
    expect(text).toHaveLength(7);
    expect(text[0]).toBe('- Mon 2026-10-26 (Mon): before this plan');
    expect(text[3]).toBe('- Thu 2026-10-29 (Today): rest day, KEPT');
    expect(text[5]).toBe('- Sat 2026-10-31 (Sat): rest day');
  });

  it('setDay writes the day asked for, never a done one', () => {
    let s = withWeek();
    const plan: CoachPlan = { ...s.coach!.week!.days[2].plan, title: 'Changed' };
    s = setDay(s, '2026-11-01', plan, NOW);
    expect(s.coach!.week!.days[2].plan.title).toBe('Changed');
    s = { ...s, coach: markDone(s.coach!, NOW.toISOString()) };
    s = setDay(s, '2026-10-28', { ...plan, title: 'Again' }, NOW);
    expect(s.coach!.week!.days[0].plan.title).not.toBe('Again');
    expect(s.coach!.week!.days[1].plan.title).toBe('Again');
  });

  it('easier on a later day changes that day only', () => {
    const s = withWeek();
    const day = s.coach!.week!.days[2];
    const item = day.plan.items.find((i) => i.easier.length)!;
    const next = changeItem(s, item.id, item.easier[0], 'easier', day.date);
    expect(next.coach!.week!.days[2].plan.items.some((i) => i.id === item.easier[0].id)).toBe(true);
    expect(next.coach!.week!.days[0]).toEqual(s.coach!.week!.days[0]);
  });

  it('an old save with one plan loads as a week of one day', () => {
    const s = withWeek();
    const plan = s.coach!.week!.days[0].plan;
    const { week: _, ...old } = s.coach!;
    const legacy = { ...old, plan };
    expect(fromLegacy(legacy)!.week!.days).toEqual([{ date: plan.at.slice(0, 10), plan }]);
    expect(fromLegacy({ ...old, plan: null })).toEqual(old);
    const loaded = migrate(JSON.parse(JSON.stringify({ ...s, coach: legacy })));
    expect(currentPlan(loaded.coach)).toEqual(plan);
    expect('plan' in loaded.coach!).toBe(false);
  });
});

describe('the coach plans the week', () => {
  it('resolveDay takes weekdays, today, tomorrow and dates from today to next week\'s Sunday', () => {
    expect(resolveDay('today', NOW)).toBe('2026-10-28');
    expect(resolveDay('Tomorrow', NOW)).toBe('2026-10-29');
    expect(resolveDay('Friday', NOW)).toBe('2026-10-30');
    expect(resolveDay('tue', NOW)).toBe('2026-11-03');
    expect(resolveDay('tue', NOW, 0)).toBeUndefined();
    expect(resolveDay('sun', NOW)).toBe('2026-11-01');
    expect(resolveDay('next fri', NOW)).toBe('2026-11-06');
    expect(resolveDay('fri', NOW, 1)).toBe('2026-11-06');
    expect(resolveDay('2026-11-01', NOW)).toBe('2026-11-01');
    expect(resolveDay('2026-11-08', NOW)).toBe('2026-11-08');
    expect(resolveDay('2026-11-09', NOW)).toBeUndefined();
    expect(resolveDay('2026-12-01', NOW)).toBeUndefined();
    expect(resolveDay('someday', NOW)).toBeUndefined();
  });

  it('set_week saves the days it can, with rests clamped, and says what it left out', () => {
    const s = withSetup();
    const r = run(s, 'set_week', {
      days: [
        { day: 'fri', mode: 'gym', title: 'Pull', items: [{ id: 'Pullups', role: 'main', rest: 9999 }] },
        { day: 'today', mode: 'gym', title: 'Push', items: [{ id: 'Pushups', role: 'main', rest: 120 }] },
        { day: 'next year', title: 'Nope', items: [{ id: 'Pushups' }] },
      ],
    });
    const week = r.state.coach!.week!;
    expect(week.by).toBe('coach');
    expect(week.days.map((d) => [d.date, d.plan.title])).toEqual([
      ['2026-10-28', 'Push'],
      ['2026-10-30', 'Pull'],
    ]);
    expect(week.days[0].plan.items.find((i) => i.id === 'Pushups')!.rest).toBe(120);
    expect(week.days[1].plan.items.find((i) => i.id === 'Pullups')!.rest).toBe(REST.max);
    expect(r.result).toMatch(/next year/);
  });

  it('set_week keeps a day already done today', () => {
    let s = withWeek();
    s = trainAll(s, NOW);
    const r = run(s, 'set_week', { days: [{ day: 'today', title: 'Again', items: [{ id: 'Pushups' }] }, { day: 'sat', title: 'Sat', items: [{ id: 'Pushups' }] }] });
    const days = r.state.coach!.week!.days;
    expect(days[0].done).toBeDefined();
    expect(days.map((d) => d.plan.title)).toEqual([s.coach!.week!.days[0].plan.title, 'Sat']);
  });

  it('set_workout with a day changes that day', () => {
    const s = withWeek();
    const r = run(s, 'set_workout', { day: 'sun', title: 'Sunday legs', items: [{ id: 'Barbell_Squat', role: 'main' }] });
    expect(r.state.coach!.week!.days[2].plan.title).toBe('Sunday legs');
    expect(r.state.coach!.week!.days[0]).toEqual(s.coach!.week!.days[0]);
  });

  it('move_workout moves onto a rest day or swaps two days, never a done one or a past day', () => {
    const s = withWeek();
    const [wed, fri] = s.coach!.week!.days;
    const moved = run(s, 'move_workout', { from: 'today', to: 'tomorrow' });
    expect(moved.state.coach!.week!.days.map((d) => d.date)).toEqual(['2026-10-29', '2026-10-30', '2026-11-01']);
    expect(moved.state.coach!.week!.days[0].plan).toBe(wed.plan);
    const swapped = run(s, 'move_workout', { from: 'wed', to: 'fri' });
    expect(swapped.state.coach!.week!.days[0].plan).toBe(fri.plan);
    expect(swapped.state.coach!.week!.days[1].plan).toBe(wed.plan);
    expect(run(s, 'move_workout', { from: 'thu', to: 'sat' }).result).toMatch(/no workout to move/);
    expect(run(s, 'move_workout', { from: 'wed', to: 'mon' }).state).toBe(s);
    const done = trainAll(s, NOW);
    expect(run(done, 'move_workout', { from: 'wed', to: 'thu' }).result).toMatch(/done already/);
  });

  it('the same family two days running is against the law: not saved, and why', () => {
    const s = withWeek();
    const push = { mode: 'gym', title: 'Push', items: [{ id: 'Pushups', role: 'main' }] };
    const r = run(s, 'set_week', { days: [{ day: 'wed', ...push }, { day: 'thu', ...push }] });
    expect(r.result).toMatch(/^Not saved[\s\S]*both train push-horizontal \(law 6\)/);
    expect(r.state).toBe(s);
    expect(run(s, 'set_week', { days: [{ day: 'wed', ...push }, { day: 'fri', ...push }] }).result).not.toMatch(/Not saved|Heads-up/);
  });

  it('the same pattern on days in a row, other families: allowed, with a heads-up', () => {
    const s = withWeek();
    const r = run(s, 'set_week', { days: [{ day: 'wed', mode: 'gym', title: 'Push', items: [{ id: 'Pushups', role: 'main' }] }, { day: 'thu', mode: 'gym', title: 'Press', items: [{ id: 'Bench_Dips', role: 'main' }] }] });
    expect(r.result).toMatch(/Heads-up.*Wed and Thu are back to back and both train push/);
  });

  it('rest_day takes a workout off, and set_workout on a rest day adds one', () => {
    const s = withWeek();
    const r = run(s, 'rest_day', { day: 'fri' });
    expect(r.state.coach!.week!.days.map((d) => d.date)).toEqual(['2026-10-28', '2026-11-01']);
    expect(r.result).toMatch(/2 workouts this week, fewer than their 3/);
    const added = run(s, 'set_workout', { day: 'sat', title: 'Extra', items: [{ id: 'Plank', role: 'core' }] });
    expect(added.state.coach!.week!.days.map((d) => d.date)).toEqual(['2026-10-28', '2026-10-30', '2026-10-31', '2026-11-01']);
    expect(added.state.coach!.week!.days[0]).toEqual(s.coach!.week!.days[0]);
  });

  it('the brief shows the week, the flame form and the story', () => {
    const brief = coachBrief(withWeek(), NOW);
    expect(brief).toMatch(/Wed 2026-10-28 \(Today\)/);
    expect(brief).toMatch(/Your form now: Spark/);
    expect(brief).toMatch(/chapter 1 of \d+, The Ashlands/);
  });
});

describe('the flame speaks first', () => {
  it('says a new week, today, then a workout done, then a missed day, each once', () => {
    let s = withWeek();
    expect(coachNudge(s, NOW)!.id).toBe('week:2026-10-28');
    s = hearNudge(s, coachNudge(s, NOW)!, false);
    expect(s.coach!.chat).toBeUndefined();
    s = { ...s, coach: { ...s.coach!, week: { ...s.coach!.week!, start: '2026-10-27' } } };
    expect(coachNudge(s, NOW)!.id).toBe('today:2026-10-28');
    s = hearNudge(s, coachNudge(s, NOW)!, true);
    expect(freshNudge(s, NOW)).toBeUndefined();
    expect(s.coach!.chat!.at(-1)).toEqual({ role: 'assistant', content: coachNudge(s, NOW)!.text });
    s = trainAll(s, NOW);
    expect(freshNudge(s, NOW)!.id).toBe('done:2026-10-28');
    // Friday's workout not done by Saturday.
    expect(coachNudge(s, new Date(2026, 9, 31, 12))!.id).toBe('missed:2026-10-30');
  });

  it('asks to keep a planned rest day, once', () => {
    let s = withWeek();
    s = { ...s, coach: { ...s.coach!, week: { ...s.coach!.week!, start: '2026-10-27' } } };
    const thu = new Date(2026, 9, 29, 12);
    // Wednesday's workout done, so nothing is missed on Thursday.
    s = { ...s, coach: markDone(s.coach!, NOW.toISOString()) };
    expect(coachNudge(s, thu)!.id).toBe('rest:2026-10-29');
    const kept = { ...s, days: [{ day: '2026-10-29', line: '', quote: { text: '', by: '' }, fire: true }] };
    expect(coachNudge(kept, thu)?.id).not.toBe('rest:2026-10-29');
  });

  it('no profile, nothing', () => {
    expect(coachNudge(initialState(), NOW)).toBeUndefined();
  });
});

describe('two weeks ahead', () => {
  const ahead = (s: GameState, now = NOW): GameState => ({ ...s, coach: { ...s.coach!, week: planAhead({ all, coach: s.coach!, sessions: s.sessions, now, rng: seeded(1) }) } });
  const SAT = new Date(2026, 9, 31, 12);
  const MON = new Date(2026, 10, 2, 9);

  it('plans next week too, so it is there before this week ends', () => {
    const s = ahead(withSetup());
    const week = s.coach!.week!;
    expect(week.ahead).toBe(true);
    expect(daysIn(week, 0).map((d) => d.date)).toEqual(['2026-10-28', '2026-10-30', '2026-11-01']);
    expect(daysIn(week, 1).map((d) => d.date)).toEqual(['2026-11-02', '2026-11-04', '2026-11-06']);
    expect(needsPlan(week, SAT)).toBe(false);
    expect(weekSlots(week, 1)[0].date).toBe('2026-11-02');
    expect(weekText(week, SAT, undefined, 1).join('\n')).toMatch(/Mon 2026-11-02 \(Mon\): gym/);
  });

  it('once this week is done, next week\'s first workout is the next one', () => {
    let s = ahead(withSetup());
    for (const d of [NOW, new Date(2026, 9, 30, 12), new Date(2026, 10, 1, 12)]) s = trainAll(s, d);
    expect(todayIs(s, new Date(2026, 10, 1, 20))).toMatchObject({ kind: 'done', next: { date: '2026-11-02' } });
    expect(todayIs(s, MON)).toMatchObject({ kind: 'workout', next: { date: '2026-11-02' } });
  });

  it('the moment this week\'s last workout is done, next week shows and the flame says it is ready', () => {
    let s = ahead(withSetup());
    for (const d of [NOW, new Date(2026, 9, 30, 12)]) s = trainAll(s, d);
    expect(shownWeek(s.coach!.week, new Date(2026, 9, 30, 20))).toBe(0);
    const sun = new Date(2026, 10, 1, 12);
    s = trainAll(s, sun);
    expect(shownWeek(s.coach!.week, sun)).toBe(1);
    const nudge = coachNudge(s, sun)!;
    expect(nudge.id).toBe(weekDoneId(s.coach!.week!));
    expect(nudge.text).toMatch(/Next week is ready: workouts on Mon, Wed, Fri/);
    // On Monday it is simply this week, and the flame doesn't say "new week" again.
    const mon = { ...s, coach: { ...hearNudge(s, nudge, false).coach!, week: planAhead({ all, coach: s.coach!, sessions: s.sessions, now: MON, rng: seeded(1) }) } };
    expect(shownWeek(mon.coach!.week, MON)).toBe(0);
    expect(coachNudge(mon, MON)?.id).not.toMatch(/^week:/);
  });

  it('on Monday next week becomes this week as planned, and a new next week comes behind it', () => {
    const s = ahead(withSetup());
    const mine = run(s, 'set_week', { week: 'next', days: [{ day: 'tue', mode: 'gym', title: 'Mine', items: [{ id: 'Pushups', role: 'main' }] }] }, SAT);
    expect(mine.result).toMatch(/Next week is saved/);
    const week = mine.state.coach!.week!;
    expect(daysIn(week, 0)).toHaveLength(3);
    expect(daysIn(week, 1).map((d) => [d.date, d.plan.title])).toEqual([['2026-11-03', 'Mine']]);
    expect(needsPlan(week, MON)).toBe(true);
    const rolled = ahead(mine.state, MON).coach!.week!;
    expect(rolled.start).toBe('2026-11-02');
    expect(daysIn(rolled, 0).map((d) => d.plan.title)).toEqual(['Mine']);
    expect(daysIn(rolled, 1).map((d) => d.date)).toEqual(['2026-11-09', '2026-11-11', '2026-11-13']);
  });

  it('on Monday a built-in next week stays exactly as it was shown', () => {
    const s = ahead(withSetup());
    const shown = daysIn(s.coach!.week!, 1);
    const rolled = ahead(s, MON).coach!.week!;
    expect(rolled.start).toBe('2026-11-02');
    expect(rolled.ahead).toBe(true);
    expect(daysIn(rolled, 0)).toEqual(shown);
    expect(daysIn(rolled, 1).map((d) => d.date)).toEqual(['2026-11-09', '2026-11-11', '2026-11-13']);
  });

  it('after a week or more away, the plan starts fresh from today', () => {
    const s = ahead(withSetup());
    const later = new Date(2026, 10, 11, 9);
    const fresh = ahead(s, later).coach!.week!;
    expect(fresh.start).toBe('2026-11-11');
    expect(fresh.days[0].date).toBe('2026-11-11');
    expect(fresh.ahead).toBe(true);
  });

  it('the coach can change and move next week\'s days, and the laws check Sunday to Monday', () => {
    const s = ahead(withSetup());
    const push = { mode: 'gym', title: 'Push', items: [{ id: 'Pushups', role: 'main' }] };
    expect(run(s, 'set_workout', { day: 'next wed', ...push }, SAT).state.coach!.week!.days.find((d) => d.date === '2026-11-04')!.plan.title).toBe('Push');
    const moved = run(s, 'move_workout', { from: 'mon', to: 'tue' }, SAT);
    expect(moved.result).toMatch(/^Moved/);
    expect(daysIn(moved.state.coach!.week!, 1)[0].date).toBe('2026-11-03');
    const join = run(s, 'set_week', { days: [{ day: 'sun', ...push }] }, SAT);
    const both = run(join.state, 'set_week', { week: 'next', days: [{ day: 'mon', ...push }] }, SAT);
    expect(both.result).toMatch(/Not saved.*2026-11-01 and 2026-11-02/s);
  });
});
