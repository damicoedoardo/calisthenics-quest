import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type Session } from '@/lib/game';
import { TRACKS } from '@/lib/music';
import { SPRITES } from '@/sprites/registry';
import { CAST } from './cast';
import { CHAPTERS } from './chapters';
import { ALL_SCENES, VILLAGERS, chapterStart, fill, pendingScenes, renderLines, storyWords } from './engine';
import { FLAME_STAGES } from './flame';
import { PLACES } from './places';
import { FLAME_LINES } from './daily/flame-lines';
import { QUOTES } from './daily/quotes';
import { FIRE_LINES, REST_TRUTHS } from './daily/rest';
import { dayQuote, flameLine, flameMood, todayMoment, withTodayPage } from './daily';
import type { Line, WordKey } from './types';

/* Checks every reference in the story files, so a typo in a speaker, a place, a song or a {word}
   fails here instead of in a scene. */

const WORDS: WordKey[] = Object.keys(storyWords(initialState())) as WordKey[];

/** Every line in a scene: its own, and the ones played after its question. */
function linesOf(scene: (typeof ALL_SCENES)[number]['scene']): Line[] {
  const ask = scene.ask;
  const after = ask && ask.kind !== 'class' ? [...(ask.after ?? []), ...(ask.kind === 'choice' ? ask.choices.flatMap((c) => c.after ?? []) : [])] : [];
  return [...scene.lines, ...after];
}

const tokens = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

describe('the story files', () => {
  it('has six chapters, 78 workouts, and three max tests', () => {
    expect(CHAPTERS.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(CHAPTERS.reduce((a, c) => a + c.workouts, 0)).toBe(78);
    expect(CHAPTERS.map((c) => c.tests)).toEqual([0, 1, 1, 2, 2, 3]);
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
    for (const stage of FLAME_STAGES.slice(1)) expect(ALL_SCENES.some((p) => p.scene.when.workouts === stage.at), stage.id).toBe(true);
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

const workout = (date: Date, kind: Session['kind'] = 'full', unlocked: string[] = []): Session => ({
  id: date.toISOString(),
  date: date.toISOString(),
  kind,
  day: 'A',
  xp: 100,
  breakdown: [],
  entries: [],
  unlocked,
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
    expect(todayMoment({ ...initialState(), sessions: [workout(tue(26), 'full', ['push-2'])] }, tue(27))).toBe('best');
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
  /** A player in month five after `n` workouts, with the max tests months two and four asked for. */
  const inTheFog = (n: number, answers: GameState['answers'] = {}): GameState => {
    const sessions = Array.from({ length: n }, (_, i) => workout(day(i)));
    const test = (i: number) => ({ id: `t${i}`, date: sessions[i].date, pushups: 20, pullups: 3, lsitSec: 5, xp: 200 });
    return { ...initialState(), sessions, tests: [test(20), test(45)], answers };
  };
  const now = day(70);

  it('brings the villagers you helped out of the fog, or Mira and the Echo when you helped none', () => {
    for (let mask = 0; mask < 8; mask++) {
      const helped = VILLAGERS.filter((_, i) => mask & (1 << i));
      const answers = Object.fromEntries(VILLAGERS.map((v) => [v, helped.includes(v) ? 'yes' : 'no']));
      const due = pendingScenes(inTheFog(63, answers), now).filter((s) => s.id.startsWith('ch5-gathering'));
      expect(due, `helped ${helped.join(', ') || 'nobody'}`).toHaveLength(1);
      const lines = renderLines(due[0].lines, storyWords(inTheFog(63, answers)));
      const speakers = new Set(lines.flatMap((l) => [l.who, l.show ?? l.who]));
      for (const v of VILLAGERS) expect(speakers.has(v as keyof typeof CAST), `${v} when helped ${helped.join(', ') || 'nobody'}`).toBe(helped.includes(v));
      expect(speakers.has('mira')).toBe(helped.length === 0);
      expect(speakers.has('echo')).toBe(helped.length === 0);
    }
  });

  it('treats skipped villager questions as not helped', () => {
    expect(pendingScenes(inTheFog(63), now).map((s) => s.id)).toContain('ch5-gathering-alone');
  });

  it('does not play a month\'s scenes before the month starts, even while the last one waits for a test', () => {
    // Month four is done but its max test is missing: month five's workout scenes wait.
    const waiting = { ...inTheFog(52), tests: [] as GameState['tests'] };
    waiting.tests = inTheFog(52).tests.slice(0, 1);
    const ids = pendingScenes(waiting, now).map((s) => s.id);
    expect(ids).toContain('ch5-wings');
    expect(ids.filter((id) => id.startsWith('ch5-') && id !== 'ch5-wings')).toEqual([]);
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
    const finale = ALL_SCENES.find((p) => p.scene.id === 'finale')!.scene;
    const flame = (heart1: string) => renderLines(finale.lines, { ...storyWords(initialState()), heart1 }).filter((l) => l.text.startsWith('I remember now'));
    expect(flame('').map((l) => l.text)).toEqual(["I remember now. I'm the part of you that loved moving, back before anyone counted anything."]);
    expect(flame('feeling free').map((l) => l.text)).toEqual(["I remember now. I'm the part of you that loved feeling free."]);
  });
});
