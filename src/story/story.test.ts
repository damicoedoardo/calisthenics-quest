import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type Session } from '@/lib/game';
import { TRACKS } from '@/lib/music';
import { SPRITES } from '@/sprites/registry';
import { CAST } from './cast';
import { CHAPTERS } from './chapters';
import { ALL_SCENES, chapterStart, fill, storyWords } from './engine';
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
    expect(todayMoment(trained(10), tue(27))).toBe('back');
    expect(todayMoment(trained(24, 25, 26, 27), tue(27))).toBe('smoky');
    expect(todayMoment(trained(23, 24, 25, 26), tue(27))).toBe('smoky');
    expect(todayMoment(trained(26), tue(27, 23))).toBe('late');
    expect(todayMoment({ ...initialState(), sessions: [workout(tue(26), 'mini')] }, tue(27))).toBe('rough');
    expect(todayMoment({ ...initialState(), sessions: [workout(tue(26), 'full', ['push-2'])] }, tue(27))).toBe('best');
    expect(flameMood(trained(10), tue(27))).toBe('dim');
    expect(flameMood(trained(24, 25, 26, 27), tue(27))).toBe('smoky');
  });

  it('keeps the same line and quote all day, and does not repeat them for three weeks', () => {
    let s = trained(1);
    const lines = new Set<string>(),
      quotes = new Set<string>();
    for (let d = 3; d < 3 + 4; d++) {
      // "missed" days: 6 lines, so four days in a row never repeat
      const now = tue(d + 1);
      s = withTodayPage(s, now);
      expect(withTodayPage(s, now)).toBe(s);
      expect(flameLine(s, now)).toBe(s.days![s.days!.length - 1].line);
      lines.add(flameLine(s, now));
      quotes.add(dayQuote(s, now).text);
    }
    expect(lines.size).toBe(4);
    expect(quotes.size).toBe(4);
  });

  it('updates the page line after a workout but keeps the quote', () => {
    const morning = withTodayPage(trained(26), tue(27, 9));
    const after = withTodayPage({ ...morning, sessions: [...morning.sessions, workout(tue(27, 11))] }, tue(27, 12));
    expect(after.days).toHaveLength(1);
    expect(after.days![0].quote).toEqual(morning.days![0].quote);
    expect(FLAME_LINES.trained.map((l) => fill(l.text, storyWords(after)))).toContain(after.days![0].line);
  });
});
