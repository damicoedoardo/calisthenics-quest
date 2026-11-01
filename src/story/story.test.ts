import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type Session } from '@/lib/game';
import { TRACKS } from '@/lib/music';
import { SPRITES } from '@/sprites/registry';
import { CAST } from './cast';
import { recordRun } from '@/lib/fog';
import { FIRST_CLEAR, RUN_LINES } from './daily/fog-lines';
import { CHAPTERS } from './chapters';
import { ALL_SCENES, MAX_SCENES_AT_ONCE, VILLAGERS, answeredLines, asksAgain, chapterStart, endedScene, fill, pendingScenes, putOff, renderLines, sawScene, sceneMoment, scenesToPlay, storySoFar, storyState, storyWords, waitingCount } from './engine';
import { FLAME_STAGES } from './flame';
import { PLACES } from './places';
import { CALLBACKS, FLAME_LINES } from './daily/flame-lines';
import { AFTER_LINES, MARGIN_NOTES } from './daily/after';
import { QUOTES } from './daily/quotes';
import { FIRE_LINES, REST_TRUTHS } from './daily/rest';
import { afterWorkoutLine, runKind, runLine, dayQuote, flameLine, flameMood, todayMoment, withTodayPage } from './daily';
import type { Line, WordKey } from './types';

/* Checks every reference in the story files, so a typo in a speaker, a place, a song or a {word}
   fails here instead of in a scene. */

const WORDS: WordKey[] = Object.keys(storyWords(initialState())) as WordKey[];

/** Every line in a scene: its own, and the ones played after its question. */
function linesOf(scene: (typeof ALL_SCENES)[number]['scene']): Line[] {
  const ask = scene.ask;
  const after = ask && ask.kind !== 'class' && ask.kind !== 'sp' ? [...(ask.after ?? []), ...(ask.kind === 'choice' ? ask.choices.flatMap((c) => c.after ?? []) : [])] : [];
  return [...scene.lines, ...after];
}

const tokens = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

describe('the story files', () => {
  it('has six chapters and 78 workouts', () => {
    expect(CHAPTERS.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(CHAPTERS.reduce((a, c) => a + c.workouts, 0)).toBe(78);
    expect(CHAPTERS.map((c) => chapterStart(c.n))).toEqual([0, 12, 24, 37, 50, 64]);
  });

  it('gives every scene a unique id', () => {
    const ids = ALL_SCENES.map((p) => p.scene.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only names cast members, places, songs and sprites that exist', () => {
    for (const { scene } of ALL_SCENES) {
      for (const l of linesOf(scene)) {
        expect(CAST, scene.id).toHaveProperty(l.who);
        if (l.show) expect(CAST, scene.id).toHaveProperty(l.show);
        if (l.shot && 'place' in l.shot) expect(PLACES, scene.id).toHaveProperty(l.shot.place);
        if (l.music && l.music !== 'none') expect(TRACKS, scene.id).toHaveProperty(l.music);
        if (l.film) expect(l.who, `${scene.id}: only narration plays as film`).toBe('narrator');
      }
      if (scene.place) expect(PLACES, scene.id).toHaveProperty(scene.place);
      if (scene.music) expect(TRACKS, scene.id).toHaveProperty(scene.music);
      for (const shot of scene.shots ?? []) if ('place' in shot) expect(PLACES, scene.id).toHaveProperty(shot.place);
    }
    for (const c of CHAPTERS) {
      expect(PLACES).toHaveProperty(c.place);
      expect(SPRITES).toHaveProperty(c.enemySprite === 'hollow' ? 'hero' : c.enemySprite);
    }
    for (const m of Object.values(CAST)) if (m.portrait.kind === 'sprite') expect(SPRITES).toHaveProperty(m.portrait.sprite);
  });

  it('only fills in words the player can give', () => {
    const check = (text: string, where: string) => tokens(text).forEach((t) => expect(WORDS, `${where}: {${t}}`).toContain(t));
    for (const { scene } of ALL_SCENES) {
      for (const l of linesOf(scene)) {
        check(l.text, scene.id);
        if (l.needs) expect(WORDS, scene.id).toContain(l.needs);
        if (l.missing) expect(WORDS, scene.id).toContain(l.missing);
      }
      if (scene.when.needs) expect(WORDS, scene.id).toContain(scene.when.needs);
    }
    for (const lines of Object.values(FLAME_LINES)) for (const l of lines) check(l.text, 'flame line');
    for (const q of QUOTES) check(q.by, 'quote');
    for (const l of FIRE_LINES) check(l.text, 'fire line');
  });

  it('has enough daily lines and quotes not to repeat within three weeks', () => {
    expect(Object.values(FLAME_LINES).flat().length).toBeGreaterThanOrEqual(60);
    for (const [moment, lines] of Object.entries(FLAME_LINES)) expect(lines.length, moment).toBeGreaterThanOrEqual(4);
    expect(REST_TRUTHS.length).toBeGreaterThanOrEqual(6);
    for (const n of [1, 2, 3, 4, 5, 6]) expect(QUOTES.filter((q) => q.fits === n || q.fits === 'any').length, `chapter ${n}`).toBeGreaterThanOrEqual(2);
  });

  it("quotes the player's own words, so any answer reads right in anyone's mouth", () => {
    // Letter parts and written answers can be in the first person ("my kids"): only ever inside quotes.
    const own = ['why', 'want', 'forWho', 'remind', 'heart3', 'heart4', 'heart5', 'heart6'];
    const quoted = (text: string, where: string) => {
      for (const m of text.matchAll(/\{(\w+)\}/g)) {
        if (!own.includes(m[1])) continue;
        const before = text.slice(0, m.index).split('"').length - 1;
        expect(before % 2, `${where}: {${m[1]}} outside quotes in "${text}"`).toBe(1);
      }
    };
    for (const { scene } of ALL_SCENES) for (const l of linesOf(scene)) quoted(l.text, scene.id);
    for (const lines of Object.values(FLAME_LINES)) for (const l of lines) quoted(l.text, 'flame line');
  });

  it('types slowly only short lines, so a slow line never drags', () => {
    const long = ALL_SCENES.flatMap(({ scene }) => linesOf(scene).filter((l) => l.pace === 'slow' && l.text.length > 90).map((l) => `${scene.id}: ${l.text}`));
    expect(long).toEqual([]);
  });

  it('keeps the script general: no digits in any line', () => {
    for (const { scene } of ALL_SCENES) for (const l of linesOf(scene)) expect(l.text.replace(/\{\w+\}/g, ''), scene.id).not.toMatch(/\d/);
  });

  it('asks each heart question once, in its own month, and brings the answer back later', () => {
    const order = ALL_SCENES.map((p) => p.scene.id);
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const id = `heart${n}` as WordKey;
      const asked = ALL_SCENES.filter((p) => p.scene.ask?.kind === 'choice' && p.scene.ask.id === id);
      expect(asked.map((p) => p.chapter), id).toEqual([n]);
      const at = order.indexOf(asked[0].scene.id);
      const later = ALL_SCENES.filter((p, i) => i > at && p.scene.lines.some((l) => l.needs === id || l.text.includes(`{${id}}`)));
      expect(later.length, `${id} comes back after it is asked`).toBeGreaterThan(0);
    }
  });

  it('shows every growth of the flame in a scene on the workout it happens', () => {
    for (const stage of FLAME_STAGES.slice(1)) expect(ALL_SCENES.some((p) => p.scene.when.grown === stage.id), stage.id).toBe(true);
  });

  it('lets the player join every villager story, and only answers that exist gate lines', () => {
    for (const v of VILLAGERS) expect(ALL_SCENES.some((p) => p.scene.ask?.kind === 'choice' && p.scene.ask.id === v), v).toBe(true);
    for (const { scene } of ALL_SCENES) for (const l of scene.lines) if (l.answer) expect(VILLAGERS, scene.id).toContain(l.answer.id);
  });

  it('fills letter words mid-sentence and capitalizes the start', () => {
    const words = { ...storyWords(initialState()), want: 'Ten pull-ups.', flame: 'pip' };
    expect(fill('{flame} wants {want}.', words)).toBe('Pip wants Ten pull-ups.');
  });
});

/** A player who beat each Fog boss right when its zone was built for: the planned pace. */
function atPlannedPace(state: GameState): GameState {
  const beaten = CHAPTERS.filter((c) => chapterStart(c.n + 1) <= state.sessions.length).length;
  return { ...state, fog: { cleared: beaten, runs: beaten, best: {}, clearedAt: Array.from({ length: beaten }, (_, i) => chapterStart(i + 2)) } };
}

const workout = (date: Date, kind: Session['kind'] = 'full', better = false): Session => ({
  id: date.toISOString(),
  date: date.toISOString(),
  kind,
  day: 'A',
  xp: 100,
  breakdown: [],
  entries: [],
  better,
});

describe('every day', () => {
  const tue = (d: number, h = 10) => new Date(2026, 9, d, h);
  const trained = (...days: number[]): GameState => ({ ...initialState(), sessions: days.map((d) => workout(tue(d, 8))) });

  it('reads the kind of day from your workouts and the clock', () => {
    expect(todayMoment(initialState(), tue(27))).toBe('first');
    expect(todayMoment(trained(27), tue(27))).toBe('trained');
    expect(todayMoment(trained(26), tue(27))).toBe('rest');
    expect(todayMoment(trained(25), tue(27))).toBe('rested');
    expect(todayMoment(trained(22), tue(27))).toBe('missed');
    // A weekend gap is a normal week, not a missed one.
    expect(todayMoment(trained(24), tue(27))).toBe('training');
    expect(todayMoment(trained(10), tue(27))).toBe('back');
    expect(todayMoment(trained(24, 25, 26, 27), tue(27))).toBe('smoky');
    expect(todayMoment(trained(23, 24, 25, 26), tue(27))).toBe('smoky');
    expect(todayMoment(trained(23), tue(27, 23))).toBe('late');
    // Late at night, a workout or a rest day still comes first.
    expect(todayMoment(trained(27), tue(27, 23))).toBe('trained');
    expect(todayMoment(trained(26), tue(27, 23))).toBe('rest');
    expect(todayMoment({ ...initialState(), sessions: [workout(tue(26), 'mini')] }, tue(27))).toBe('rough');
    expect(todayMoment({ ...initialState(), sessions: [workout(tue(26), 'full', true)] }, tue(27))).toBe('best');
    expect(flameMood(trained(10), tue(27))).toBe('dim');
    expect(flameMood(trained(24, 25, 26, 27), tue(27))).toBe('smoky');
  });

  it('keeps the same line and quote all day, and does not repeat them for three weeks', () => {
    let s = trained(1);
    const lines = new Set<string>(),
      quotes = new Set<string>();
    for (let d = 5; d < 5 + 3; d++) {
      // "missed" days: 6 lines, so three days in a row never repeat
      const now = tue(d + 1);
      s = withTodayPage(s, now);
      expect(withTodayPage(s, now)).toBe(s);
      expect(flameLine(s, now)).toBe(s.days![s.days!.length - 1].line);
      lines.add(flameLine(s, now));
      quotes.add(dayQuote(s, now).text);
    }
    expect(lines.size).toBe(3);
    expect(quotes.size).toBe(3);
  });

  it('never counts "1 pages" after the first workout', () => {
    for (let d = 1; d <= 28; d++) expect(flameLine(trained(d), tue(d, 20))).not.toMatch(/\b1 pages\b/);
  });

  it('updates the page line after a workout but keeps the quote', () => {
    const morning = withTodayPage(trained(26), tue(27, 9));
    const after = withTodayPage({ ...morning, sessions: [...morning.sessions, workout(tue(27, 11))] }, tue(27, 12));
    expect(after.days).toHaveLength(1);
    expect(after.days![0].quote).toEqual(morning.days![0].quote);
    expect(FLAME_LINES.trained.map((l) => fill(l.text, storyWords(after)))).toContain(after.days![0].line);
  });
});

describe('the months 4 to 6 rules', () => {
  const day = (i: number) => new Date(2026, 0, 1 + i, 18);
  /** A player after `n` workouts (month five starts at 50). */
  const inTheFog = (n: number, answers: GameState['answers'] = {}): GameState => {
    const sessions = Array.from({ length: n }, (_, i) => workout(day(i)));
    return atPlannedPace({ ...initialState(), sessions, answers });
  };
  const now = day(70);

  it('brings the villagers you helped out of the fog, or Mira and the Echo when you helped none', () => {
    for (let mask = 0; mask < 8; mask++) {
      const helped = VILLAGERS.filter((_, i) => mask & (1 << i));
      const answers = Object.fromEntries(VILLAGERS.map((v) => [v, helped.includes(v) ? 'yes' : 'no']));
      const due = pendingScenes(inTheFog(63, answers), now).filter((s) => s.id.startsWith('ch5-gathering'));
      expect(due, `helped ${helped.join(', ') || 'nobody'}`).toHaveLength(1);
      // Who arrives comes after the call-out choice, whichever way it goes.
      const ask = due[0].ask,
        arrive = ask?.kind === 'choice' ? ask.choices.flatMap((c) => c.after ?? []) : [];
      const lines = renderLines([...due[0].lines, ...arrive], storyWords(inTheFog(63, answers)));
      // A villager you helped may appear in their after look (`lia-after`).
      const speakers = new Set(lines.flatMap((l) => [l.who, l.show ?? l.who]).map((id) => id.replace(/-after$/, '')));
      for (const v of VILLAGERS) expect(speakers.has(v as keyof typeof CAST), `${v} when helped ${helped.join(', ') || 'nobody'}`).toBe(helped.includes(v));
      expect(speakers.has('mira')).toBe(helped.length === 0);
      expect(speakers.has('echo')).toBe(helped.length === 0);
    }
  });

  it('treats skipped villager questions as not helped', () => {
    expect(pendingScenes(inTheFog(63), now).map((s) => s.id)).toContain('ch5-gathering-alone');
  });

  it("does not play a month's scenes before the month starts", () => {
    expect(pendingScenes(inTheFog(49), now).filter((s) => s.id.startsWith('ch5-'))).toEqual([]);
    expect(pendingScenes(inTheFog(50), now).some((s) => s.id.startsWith('ch5-'))).toBe(true);
  });

  it('skips a story beat whose moment is long gone, but never a scene that waits for something else', () => {
    const state = { ...initialState(), sessions: Array.from({ length: 10 }, (_, i) => workout(day(i))) };
    const ids = pendingScenes(state, day(10)).map((s) => s.id);
    expect(ids).not.toContain('ch1-kept');
    expect(ids).toContain('class-choice');
    expect(ids).toContain('ch1-tomorrow-begs');
  });

  it('notices a run of Rough days, and only a run', () => {
    const rough = (kinds: Session['kind'][]) => ({ ...initialState(), sessions: kinds.map((k, i) => workout(day(i), k)) });
    const due = (s: GameState) => pendingScenes(s, day(10)).map((x) => x.id);
    expect(due(rough(['full', 'full', 'full', 'full', 'mini', 'mini', 'mini']))).toContain('heavy-days');
    expect(due(rough(['full', 'mini', 'mini', 'mini']))).not.toContain('heavy-days');
    expect(due(rough(['mini', 'mini', 'full', 'mini']))).not.toContain('heavy-days');
  });

  it('reads a stand-in line when the heart answer is missing, and the answer when it is there', () => {
    const scene = ALL_SCENES.find((p) => p.scene.id === 'ch6-remembering')!.scene;
    const flame = (heart1: string) => renderLines(scene.lines, { ...storyWords(initialState()), heart1 }).filter((l) => l.text.startsWith('It used to be like that'));
    expect(flame('').map((l) => l.text)).toEqual(['It used to be like that all the time, when you were small. Nobody had to tell you that you could.']);
    expect(flame('feeling free').map((l) => l.text)).toEqual(['It used to be like that all the time. When you were small and loved feeling free, nobody had to tell you that you could.']);
  });
});

describe('the daily follow-ups', () => {
  const day = (i: number) => new Date(2026, 0, 1 + i * 2, 18);
  const lia = CALLBACKS.find((c) => c.after === 'ch2-lia-dance')!;
  const helped = (n: number, seen: string[]): GameState =>
    atPlannedPace({
      ...initialState(),
      sessions: Array.from({ length: n }, (_, i) => workout(day(i))),
      seenScenes: seen,
      answers: { lia: 'yes' },
    });

  it('follow up on real scenes, with no digits', () => {
    for (const c of CALLBACKS) {
      expect(ALL_SCENES.some((p) => p.scene.id === c.after), c.after).toBe(true);
      expect(c.text).not.toMatch(/\d/);
    }
    for (const l of [...Object.values(AFTER_LINES).flat(), ...Object.values(FLAME_LINES).flat()]) expect(l.text.replace(/\{\w+\}/g, '')).not.toMatch(/\d/);
    for (const n of Object.values(MARGIN_NOTES).flat()) expect(n).not.toMatch(/\d/);
  });

  it('says the Lia follow-up once, the day after her scene, and only if it played', () => {
    const next = new Date(day(21).getTime() + 86400000);
    expect(flameLine(helped(22, ['ch2-lia-dance']), next)).toBe(lia.text);
    expect(flameLine(helped(22, []), next)).not.toBe(lia.text);
    // Not on the day of the workout itself.
    expect(flameLine(helped(22, ['ch2-lia-dance']), new Date(day(21).getTime() + 3600000))).not.toBe(lia.text);
    // Said once: a later day doesn't repeat it.
    const said = withTodayPage(helped(22, ['ch2-lia-dance']), next);
    expect(flameLine(said, new Date(next.getTime() + 86400000))).not.toBe(lia.text);
  });

  it("doesn't repeat an after-workout line within a few workouts", () => {
    const n = 40;
    const picks = Array.from({ length: n }, (_, i) => afterWorkoutLine({ ...initialState(), sessions: Array.from({ length: i + 1 }, (_, k) => workout(day(k))) }));
    for (let i = 1; i < n; i++) expect(picks.slice(Math.max(1, i - 4), i), `workout ${i + 1}`).not.toContain(picks[i]);
  });
});

describe('scenes at one moment', () => {
  const day = (i: number) => new Date(2026, 0, 1 + i, 18);
  it(`never plays more than ${MAX_SCENES_AT_ONCE} at once, and the rest wait for the next workout`, () => {
    let state: GameState = { ...initialState(), sessions: Array.from({ length: 10 }, (_, i) => workout(day(i))) };
    const now = day(9);
    expect(pendingScenes(state, now).length).toBeGreaterThan(MAX_SCENES_AT_ONCE);
    for (let i = 0; i < MAX_SCENES_AT_ONCE; i++) state = sawScene(state, scenesToPlay(state, now)[0].id, now);
    expect(scenesToPlay(state, now)).toEqual([]);
    const later = { ...state, sessions: [...state.sessions, workout(day(10))] };
    expect(scenesToPlay(later, day(10)).length).toBeGreaterThan(0);
  });
});

describe('Story so far', () => {
  const day = (i: number) => new Date(2026, 0, 1 + i, 18);
  const after = (n: number): GameState => ({ ...initialState(), sessions: Array.from({ length: n }, (_, i) => workout(day(i))) });
  const ids = (s: GameState) => storySoFar(s).flatMap((g) => g.entries.map((e) => e.id));

  it('lists only scenes already reached, so nothing is spoiled', () => {
    const state = after(10);
    expect(ids(state)).toEqual([]);
    const first = scenesToPlay(state, day(9))[0];
    const seen = endedScene(state, first.id, 'due', {}, day(9));
    expect(ids(seen)).toEqual([first.id]);
    expect(waitingCount(seen)).toBe(0);
  });

  it('keeps a scene put off with Later out of the way until it is played from the list', () => {
    const state = after(10);
    const now = day(9);
    const due = scenesToPlay(state, now).map((s) => s.id);
    const off = putOff(state, due, now);
    // Nothing else plays at this moment, and the put-off scenes never come back on their own.
    expect(scenesToPlay(off, now)).toEqual([]);
    expect(pendingScenes(off, now).map((s) => s.id)).not.toContain(due[0]);
    expect(storySoFar(off).flatMap((g) => g.entries).find((e) => e.id === due[0])?.waits).toBe('later');
    expect(waitingCount(off)).toBe(due.length);
    const played = endedScene(off, due[0], 'later', {}, now);
    expect(played.seenScenes).toContain(due[0]);
    expect(played.laterScenes).not.toContain(due[0]);
  });

  it('marks a skipped scene until it is watched to the end', () => {
    const state = after(10);
    const now = day(9);
    const id = scenesToPlay(state, now)[0].id;
    const skipped = endedScene(state, id, 'due', { skipped: true }, now);
    expect(waitingCount(skipped)).toBe(1);
    expect(endedScene(skipped, id, 'again', { skipped: true }, now).skippedScenes).toEqual([id]);
    const watched = endedScene(skipped, id, 'again', {}, now);
    expect(watched.skippedScenes).toEqual([]);
    expect(watched.seenScenes.filter((x) => x === id)).toHaveLength(1);
  });

  it('asks a question again only when it was never answered, and never gives a gift twice', () => {
    const naming = ALL_SCENES.find((p) => p.scene.ask?.kind === 'name')!.scene;
    const state = after(1);
    expect(asksAgain(naming, { ...state, seenScenes: [naming.id] })).toBe(false);
    expect(asksAgain(naming, { ...state, seenScenes: [naming.id], skippedScenes: [naming.id] })).toBe(true);
    const choice = ALL_SCENES.find((p) => p.scene.ask?.kind === 'choice')!.scene;
    const ask = choice.ask as Extract<typeof choice.ask, { kind: 'choice' }>;
    expect(asksAgain(choice, state)).toBe(true);
    const answered = { ...state, answers: { [ask.id]: ask.choices[0].value } };
    expect(asksAgain(choice, answered)).toBe(false);
    expect(answeredLines(choice, answered)).toEqual(ask.choices[0].after ?? ask.after ?? []);
    for (const { scene } of ALL_SCENES.filter((p) => p.scene.ask?.kind === 'sp' || p.scene.ask?.kind === 'class')) expect(asksAgain(scene, state)).toBe(false);
  });
});

describe('the Fog bosses', () => {
  it('give every zone a voice: an entrance, a line per stage, an end, and three or four short taunts', () => {
    for (const c of CHAPTERS) {
      const l = c.fog.lines;
      const all = [l.enter, ...l.stages, l.end, ...l.taunts];
      expect(l.stages.length, c.fog.name).toBeGreaterThan(0);
      expect(l.taunts.length, c.fog.name).toBeGreaterThanOrEqual(3);
      expect(l.taunts.length, c.fog.name).toBeLessThanOrEqual(4);
      // Shown over gameplay: short, general, and only words every player has or can skip.
      for (const t of all) {
        expect(t.trim(), c.fog.name).not.toBe('');
        expect(t.length, t).toBeLessThanOrEqual(44);
        expect(t.replace(/\{\w+\}/g, ''), t).not.toMatch(/\d/);
        for (const w of tokens(t)) expect(['voice', 'flame'], t).toContain(w);
      }
      // A taunt may be the player's own line, but the ones always said must be enough.
      expect(l.taunts.filter((t) => !tokens(t).length).length, c.fog.name).toBeGreaterThanOrEqual(3);
      expect(tokens(l.enter).length + tokens(l.end).length, c.fog.name).toBe(0);
    }
  });
});

describe('chapters end on Fog bosses', () => {
  const day = (i: number) => new Date(2026, 0, 1 + i * 2, 18);
  const at = day(9);
  const trained = (n: number): GameState => ({ ...initialState(), sessions: Array.from({ length: n }, (_, i) => workout(day(i))) });
  const won = (s: GameState) => recordRun(s, { zone: s.fog?.cleared ?? 0, won: true, seconds: 200, kills: 50, level: 5, floor: 10, room: 2 }, at);
  const ids = (s: GameState) => pendingScenes(s, at).map((x) => x.id);
  // Everything due up to now already watched.
  const caughtUp = (s: GameState) => ({ ...s, seenScenes: [...s.seenScenes, ...ids(s)] });

  it('ends a chapter when its boss falls, however few workouts in, and opens the next', () => {
    let s = caughtUp(trained(4));
    expect(storyState(s).index).toBe(0);
    s = won(s);
    expect(storyState(s).index).toBe(1);
    // The ending, then the heart moment the chapter had not reached yet, then the next chapter.
    expect(ids(s)).toEqual(['ch1-victory', 'ch1-night-camp', 'ch2-intro']);
    // A leftover scene that asks nothing (ch1-proof) is skipped.
  });

  it('plays the ending at once, even after two scenes already played at this workout today', () => {
    const s = caughtUp(trained(4));
    const full = { ...s, sceneMark: { at: sceneMoment(s, at), count: MAX_SCENES_AT_ONCE } };
    expect(scenesToPlay(full, at)).toEqual([]);
    expect(scenesToPlay(won(full), at).map((x) => x.id)).toEqual(['ch1-victory', 'ch1-night-camp']);
  });

  it("counts a chapter's scenes from when it began, and never ends one on workouts", () => {
    let s = caughtUp(won(caughtUp(trained(4))));
    expect(ids(s)).not.toContain('ch2-reflection');
    s = caughtUp({ ...s, sessions: [...s.sessions, workout(day(5)), workout(day(6))] });
    expect(s.seenScenes).toContain('ch2-reflection');
    // Forty workouts on, still chapter 2 until the Mirror falls in the Fog.
    s = { ...s, sessions: Array.from({ length: 40 }, (_, i) => workout(day(i))) };
    expect(storyState(s).index).toBe(1);
    expect(ids(s)).not.toContain('ch2-victory');
  });

  it("grows the flame with workouts, whatever the chapter", () => {
    const s = caughtUp(trained(14));
    expect(ids({ ...s, sessions: [...s.sessions, workout(day(15))] })).toContain('ch2-torch');
  });
});

describe('the flame on the last Fog run', () => {
  const day = (i: number) => new Date(2026, 0, 1 + i, 18);
  // Trained yesterday: a rest day, so no workout is due yet.
  const base = (): GameState => ({ ...initialState(), sessions: [workout(day(0)), workout(day(2)), workout(day(4))] });
  const at = day(5);
  const run = (s: GameState, won: boolean, floor = 2, zone = 0) => recordRun(s, { zone, won, seconds: 200, kills: 50, level: 5, floor, room: 2 }, at);

  it('reacts to a first clear, a win, a record, the mid-boss and a loss, only on the day of the run', () => {
    let s = run(base(), true, 10);
    expect(runKind(s, at)).toBe('firstClear');
    expect(flameLine(s, at)).toBe(FIRST_CLEAR[0]);
    s = run(s, true, 10);
    expect(runKind(s, at)).toBe('won');
    expect(RUN_LINES.won.map((l) => l.text)).toContain(runLine(s, at));
    s = run(s, false, 3, 1);
    expect(runKind(s, at)).toBe('lost');
    s = run(s, false, 7, 1);
    expect(runKind(s, at)).toBe('record');
    s = run(s, false, 7, 1);
    expect(runKind(s, at)).toBe('mid');
    expect(runLine(s, day(6))).toBeUndefined();
  });

  it('nudges toward training, gently, when a workout is due', () => {
    const later = day(7);
    const s = recordRun(base(), { zone: 0, won: false, seconds: 100, kills: 20, level: 3, floor: 2, room: 1 }, later);
    expect(runKind(s, later)).toBe('due');
    expect(RUN_LINES.due.map((l) => l.text)).toContain(flameLine(s, later));
  });

  it('has a first-clear line for every zone, and keeps every line short and general', () => {
    expect(FIRST_CLEAR).toHaveLength(CHAPTERS.length);
    for (const t of [...FIRST_CLEAR, ...Object.values(RUN_LINES).flat().map((l) => l.text)]) {
      expect(t.length, t).toBeLessThanOrEqual(80);
      expect(t, t).not.toMatch(/\d/);
    }
  });
});

