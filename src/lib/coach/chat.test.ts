import { beforeAll, describe, expect, it } from 'vitest';
import { loadLibrary, type LibraryExercise } from '@/exercises/library';
import { seeded } from '@/lib/random';
import { initialState, type GameState } from '@/lib/game';
import { applySetup, type SetupAnswers } from './setup';
import { searchExercises } from './search';
import { runTool, type ToolContext } from './tools';
import { CHAT_KEEP, coachTurn, MAX_ROUNDS, OPENER, shownChat, STEP_LABEL, trimChat, type Answer, type Ask } from './chat';
import type { ChatMessage, ToolCall } from './types';
import { currentPlan } from './week';

let all: LibraryExercise[];
beforeAll(async () => {
  all = await loadLibrary();
});

const NOW = new Date('2026-10-28T10:00:00Z');
const ids = () => {
  let n = 0;
  return () => `n${++n}`;
};
const answers = (over: Partial<SetupAnswers> = {}): SetupAnswers => ({
  modes: ['gym'],
  goal: 'muscle',
  days: 3,
  minutes: 40,
  gear: ['gym'],
  experience: 'returning',
  pushups: 2,
  pullups: 1,
  lifts: 1,
  run: 1,
  avoid: [],
  ...over,
});
const withSetup = (a: SetupAnswers = answers()): GameState => ({ ...initialState(), coach: applySetup(undefined, a, NOW, ids()) });
const ctx = (): ToolContext => ({ all, now: NOW, id: ids(), rng: seeded(1) });
const run = (s: GameState, name: string, args: unknown) => runTool(s, name, typeof args === 'string' ? args : JSON.stringify(args), ctx());

/** Everything in the save but the coach. */
const rest = (s: GameState) => ({ ...s, coach: undefined });

describe('searchExercises', () => {
  const top = (q: string, limit = 5) => searchExercises(all, q, { limit }).map((x) => x.id);

  it('forgives plurals, spaces and typos', () => {
    expect(top('pushups')[0]).toBe('Pushups');
    expect(top('push ups')[0]).toBe('Pushups');
    expect(top('push-up')[0]).toBe('Pushups');
    expect(top('dumbell row')[0]).toBe('One-Arm_Dumbbell_Row');
    expect(top('squats')).toContain('Barbell_Squat');
    expect(top('pullups')).toContain('Pullups');
  });

  it('maps everyday words: "abs" finds core moves', () => {
    const found = searchExercises(all, 'abs', { limit: 5 });
    expect(found.length).toBe(5);
    expect(found.every((x) => x.family === 'core')).toBe(true);
  });

  it('keeps to the family asked for', () => {
    const found = searchExercises(all, 'push', { family: 'push-vertical' });
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((x) => x.family === 'push-vertical')).toBe(true);
  });

  it('finds nothing for nonsense, and keeps to the limit', () => {
    expect(searchExercises(all, 'xqzzv blorf')).toEqual([]);
    expect(searchExercises(all, 'squat', { limit: 3 })).toHaveLength(3);
    expect(searchExercises(all, 'squat').length).toBeLessThanOrEqual(10);
  });
});

describe('runTool', () => {
  it('find_exercises gives one line per exercise, with its id, for your gear only', () => {
    const s = withSetup(answers({ modes: ['calisthenics'], gear: ['none'] }));
    const byId = new Map(all.map((x) => [x.id, x]));
    for (const query of ['squat', 'bench press', 'row']) {
      const r = run(s, 'find_exercises', { query });
      expect(r.state).toBe(s);
      const lines = r.result.split('\n');
      for (const l of lines) {
        const x = byId.get(l.split(' | ')[0]);
        expect(x, l).toBeDefined();
        expect(x!.equipment).not.toBe('barbell');
      }
    }
    // The same search with a gym does find barbell moves.
    const gym = run(withSetup(), 'find_exercises', { query: 'barbell squat' });
    expect(gym.result).toContain('Barbell_Squat');
    expect(run(s, 'find_exercises', { query: 'xqzzv blorf' }).result).toMatch(/Nothing found/);
  });

  it('save_profile with no profile makes one, and no workout yet', () => {
    const s = initialState();
    const r = run(s, 'save_profile', { goal: 'strength', days: 4, gear: ['dumbbells', 'nonsense'] });
    const p = r.state.coach!.profile!;
    expect(p.goal).toBe('strength');
    expect(p.days).toBe(4);
    expect(p.gear).toEqual(['dumbbells']);
    expect(p.history).toEqual([]);
    expect(p.setupAt).toBe(NOW.toISOString());
    expect(currentPlan(r.state.coach)).toBeUndefined();
    expect(rest(r.state)).toEqual(rest(s));
  });

  it('save_profile on a profile writes history for what changed, and drops bad values', () => {
    const s = withSetup();
    const r = run(s, 'save_profile', { goal: 'strength', experience: 'wizard', why: 'wants to lift heavy' });
    const p = r.state.coach!.profile!;
    expect(p.goal).toBe('strength');
    expect(p.experience).toBe('returning');
    expect(p.history).toEqual([{ field: 'goal', from: 'muscle', to: 'strength', why: 'wants to lift heavy', at: NOW.toISOString() }]);
    expect(rest(r.state)).toEqual(rest(s));
    // Only bad values: nothing changes.
    const bad = run(s, 'save_profile', { goal: 'fly', minutes: 17 });
    expect(bad.state).toBe(s);
    expect(bad.result).toBe('Nothing to change.');
    // The same value again: saved, but no history.
    expect(run(s, 'save_profile', { goal: 'muscle' }).state.coach!.profile!.history).toEqual([]);
  });

  it('set_workout saves a checked plan with choices, and says what it skipped', () => {
    const s = withSetup();
    const r = run(s, 'set_workout', {
      mode: 'gym',
      title: 'Legs and push',
      items: [
        { id: 'Barbell_Squat', role: 'main', sets: 3, low: 6, high: 8 },
        { id: 'Pushups', role: 'main' },
        { id: 'Not_A_Real_Move', role: 'main' },
        { id: '90_90_Hamstring', role: 'stretch', low: 45 },
      ],
    });
    const plan = currentPlan(r.state.coach)!;
    expect(plan.by).toBe('coach');
    expect(plan.title).toBe('Legs and push');
    expect(plan.items[0].role).toBe('warmup');
    expect(plan.items.at(-1)!.role).toBe('stretch');
    expect(plan.items.at(-1)!.id).toBe('90_90_Hamstring');
    const main = plan.items.filter((i) => i.role === 'main');
    expect(main.map((i) => i.id)).toEqual(['Barbell_Squat', 'Pushups']);
    expect(main[0]).toMatchObject({ sets: 3, low: 6, high: 8 });
    for (const it of main) expect(it.easier.length + it.swaps.length).toBeGreaterThan(0);
    expect(r.result).toContain('Not_A_Real_Move');
    expect(r.result).toContain('Barbell_Squat');
    expect(rest(r.state)).toEqual(rest(s));
  });

  it('set_workout needs a profile first', () => {
    const s = initialState();
    const r = run(s, 'set_workout', { items: [{ id: 'Pushups' }] });
    expect(r.state).toBe(s);
    expect(r.result).toMatch(/save_profile/);
  });

  it('a run gets steps that add up to its minutes', () => {
    const s = withSetup(answers({ modes: ['running'], run: 0 }));
    const r = run(s, 'set_workout', { mode: 'running', items: [{ id: 'forma:run-walk', minutes: 20 }] });
    const item = currentPlan(r.state.coach)!.items.find((i) => i.id === 'forma:run-walk')!;
    expect(item.run).toBeDefined();
    const total = item.run!.reduce((a, x) => a + x.sec, 0);
    expect(total).toBe(20 * 60);
    expect(item.low).toBe(total);
    expect(item.run!.some((x) => x.effort === 'walk')).toBe(true);
  });

  it('add_note and remove_note', () => {
    const s = withSetup();
    const before = s.coach!.notes.length;
    const added = run(s, 'add_note', { type: 'dislike', text: 'hates burpees' });
    const notes = added.state.coach!.notes;
    expect(notes).toHaveLength(before + 1);
    const note = notes.at(-1)!;
    expect(note).toMatchObject({ type: 'dislike', text: 'hates burpees', by: 'coach' });
    expect(rest(added.state)).toEqual(rest(s));

    const timed = run(s, 'add_note', { type: 'pain', text: 'sore knee', days: 3 }).state.coach!.notes.at(-1)!;
    expect(timed.until).toBe(new Date(NOW.getTime() + 3 * 86_400_000).toISOString());
    expect(run(s, 'add_note', { text: '   ' }).state).toBe(s);
    expect(run(s, 'add_note', { type: 'bogus', text: 'x' }).state.coach!.notes.at(-1)!.type).toBe('other');

    const removed = run(added.state, 'remove_note', { id: note.id });
    expect(removed.state.coach!.notes.some((n) => n.id === note.id)).toBe(false);
    const missing = run(added.state, 'remove_note', { id: 'nope' });
    expect(missing.state).toBe(added.state);
    expect(missing.result).toContain('nope');
  });

  it('suggest_replies sets the replies and ends the turn', () => {
    const s = withSetup();
    const r = run(s, 'suggest_replies', { replies: ['Yes', '', 'No', 'Later', 'Maybe', 'Never'] });
    expect(r.waits).toBe(true);
    expect(r.state.coach!.replies).toEqual(['Yes', 'No', 'Later', 'Maybe']);
    expect(rest(r.state)).toEqual(rest(s));
  });

  it('bad JSON and unknown tools leave the save alone', () => {
    const s = withSetup();
    for (const [name, args] of [
      ['add_note', '{not json'],
      ['add_note', '[1, 2]'],
      ['add_note', '"text"'],
      ['launch_rocket', '{}'],
    ]) {
      const r = runTool(s, name, args, ctx());
      expect(r.state).toBe(s);
      expect(typeof r.result).toBe('string');
      expect(r.result.length).toBeGreaterThan(0);
    }
    expect(runTool(s, 'launch_rocket', '{}', ctx()).result).toContain('launch_rocket');
  });
});

describe('coachTurn', () => {
  const call = (id: string, name: string, args: unknown): ToolCall => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } });
  const say = (content: string, tool_calls?: ToolCall[]): Answer => ({ message: { role: 'assistant', content, ...(tool_calls ? { tool_calls } : {}) }, finish_reason: tool_calls ? 'tool_calls' : 'stop' });

  /** A fake model: plays the answers in order, the last one forever; keeps what it was sent. */
  function fake(answers: Answer[]) {
    const sent: ChatMessage[][] = [];
    const ask: Ask = async (brief, messages) => {
      expect(typeof brief).toBe('string');
      sent.push(messages.map((m) => ({ ...m })));
      return answers[Math.min(sent.length - 1, answers.length - 1)];
    };
    return { ask, sent };
  }
  function save(start: GameState) {
    let state = start;
    return { get: () => state, set: (fn: (s: GameState) => GameState) => void (state = fn(state)), now: () => state };
  }

  it('a plain answer: the player and the coach are added, one ask', async () => {
    const s = save(withSetup());
    const { ask, sent } = fake([say('Hi! Ready?')]);
    await coachTurn({ text: '  hello  ', get: s.get, set: s.set, ask, ctx });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual([{ role: 'user', content: 'hello' }]);
    expect(s.now().coach!.chat).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'Hi! Ready?' },
    ]);
  });

  it('a tool call runs here, its result goes back, and the model is asked again', async () => {
    const start = withSetup();
    const s = save(start);
    const { ask, sent } = fake([say('', [call('c1', 'add_note', { type: 'like', text: 'likes mornings' })]), say('Got it.')]);
    await coachTurn({ text: 'I train in the morning', get: s.get, set: s.set, ask, ctx });
    expect(sent).toHaveLength(2);
    const chat = s.now().coach!.chat!;
    expect(chat.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant']);
    expect(chat[2]).toEqual({ role: 'tool', tool_call_id: 'c1', content: 'Noted.' });
    expect(sent[1]).toEqual(chat.slice(0, 3));
    expect(s.now().coach!.notes.some((n) => n.text === 'likes mornings')).toBe(true);
    expect(rest(s.now())).toEqual(rest(start));
  });

  it('says each step while it works, and nothing for the replies it offers', async () => {
    const s = save(withSetup());
    const steps: string[] = [];
    const { ask } = fake([say('', [call('c1', 'training_guide', {}), call('c2', 'add_note', { type: 'like', text: 'x' })]), say('Done.', [call('c3', 'suggest_replies', { replies: ['Ok'] })])]);
    await coachTurn({ text: 'plan me', get: s.get, set: s.set, ask, ctx, onStep: (l) => steps.push(l) });
    expect(steps).toEqual([STEP_LABEL.training_guide, STEP_LABEL.add_note]);
  });

  it('suggest_replies alone ends the turn without asking again', async () => {
    const s = save(withSetup());
    const { ask, sent } = fake([say('How did it feel?', [call('c1', 'suggest_replies', { replies: ['Easy', 'Hard'] })]), say('should not be asked')]);
    await coachTurn({ text: 'done', get: s.get, set: s.set, ask, ctx });
    expect(sent).toHaveLength(1);
    expect(s.now().coach!.replies).toEqual(['Easy', 'Hard']);
    expect(s.now().coach!.chat!.map((m) => m.role)).toEqual(['user', 'assistant', 'tool']);
    // The player's next words clear the offered replies.
    const next = fake([say('Nice.')]);
    await coachTurn({ text: 'Easy', get: s.get, set: s.set, ask: next.ask, ctx });
    expect(s.now().coach!.replies).toEqual([]);
  });

  it('a model that always calls tools stops after MAX_ROUNDS', async () => {
    const s = save(withSetup());
    let n = 0;
    const ask: Ask = async () => say('', [call(`c${++n}`, 'find_exercises', { query: 'squat' })]);
    await coachTurn({ text: 'go', get: s.get, set: s.set, ask, ctx });
    expect(n).toBe(MAX_ROUNDS);
  });

  // Past CHAT_KEEP messages in one turn, the chat still starts at what the player said.
  it('a long turn of many tool calls never loses what the player asked', async () => {
    const s = save(withSetup());
    let n = 0;
    const calls = () => Array.from({ length: 8 }, () => call(`c${++n}`, 'find_exercises', { query: 'squat' }));
    const sent: ChatMessage[][] = [];
    const ask: Ask = async (_brief, messages) => {
      sent.push(messages);
      return sent.length < MAX_ROUNDS ? say('', calls()) : say('Here is your plan.');
    };
    await coachTurn({ text: 'build me a leg day', get: s.get, set: s.set, ask, ctx });
    for (const m of sent) expect(m.some((x) => x.role === 'user' && x.content === 'build me a leg day')).toBe(true);
    expect(s.now().coach!.chat!.length).toBeGreaterThan(0);
  });

  it('an empty chat opens with OPENER, which the screen never shows', async () => {
    const s = save(withSetup());
    const { ask, sent } = fake([say('Welcome back.')]);
    await coachTurn({ get: s.get, set: s.set, ask, ctx });
    expect(sent[0]).toEqual([{ role: 'user', content: OPENER }]);
    const chat = s.now().coach!.chat!;
    expect(chat[0]).toEqual({ role: 'user', content: OPENER });
    expect(shownChat(chat)).toEqual([{ who: 'coach', text: 'Welcome back.', key: 'a1' }]);
  });

  it('shownChat shows a workout card for set_workout, and hides tool results', () => {
    const chat: ChatMessage[] = [
      { role: 'user', content: 'plan me' },
      { role: 'assistant', content: '', tool_calls: [call('c1', 'set_workout', {})] },
      { role: 'tool', tool_call_id: 'c1', content: 'Saved' },
      { role: 'assistant', content: ' Here it is. ' },
    ];
    expect(shownChat(chat)).toEqual([
      { who: 'you', text: 'plan me', key: 'u0' },
      { who: 'workout', key: 'w1' },
      { who: 'coach', text: 'Here it is.', key: 'a3' },
    ]);
    expect(shownChat(undefined)).toEqual([]);
  });
});

describe('trimChat', () => {
  const pair = (k: number): ChatMessage[] => [
    { role: 'user', content: `q${k}` },
    { role: 'assistant', content: '', tool_calls: [{ id: `c${k}`, type: 'function', function: { name: 'add_note', arguments: '{}' } }] },
    { role: 'tool', tool_call_id: `c${k}`, content: 'Noted.' },
  ];

  it('keeps at most CHAT_KEEP, starting at something the player said', () => {
    const chat = Array.from({ length: 30 }, (_, k) => pair(k)).flat();
    const out = trimChat(chat);
    expect(out.length).toBeLessThanOrEqual(CHAT_KEEP);
    expect(out[0].role).toBe('user');
    expect(out.at(-1)).toEqual(chat.at(-1));
    // A short chat is kept whole.
    expect(trimChat(pair(1))).toEqual(pair(1));
    // A chat with no player words left is dropped.
    expect(trimChat([{ role: 'assistant', content: 'hi' }])).toEqual([]);
  });
});
