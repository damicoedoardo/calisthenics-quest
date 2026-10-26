import { weekKey, WEEKLY_GOAL, type GameState } from '@/lib/game';
import { daysInRow, daysSinceTraining, isRestDay } from '@/lib/days';
import { ANYTIME } from './anytime';
import { CAST, type CastId } from './cast';
import { CHAPTERS } from './chapters';
import type { PlaceId } from './places';
import { DEFAULT_FLAME_NAME } from './flame';
import type { Chapter, Line, Scene, When, WordKey, Words } from './types';

/* Reads the story files: which chapter you're in, which scenes are due, and how a line reads
   with your own words in it. Nothing here knows the story itself. */

export interface StoryState {
  /** Index into CHAPTERS of the chapter being played; CHAPTERS.length once the story is finished. */
  index: number;
  chapter: Chapter | null;
  hearts: number;
  heartsLeft: number;
  /** All workouts done, but the chapter's max test is still missing. */
  awaitingTest: boolean;
  finished: boolean;
}

/** Workouts done before chapter `n` starts. */
export function chapterStart(n: number): number {
  return CHAPTERS.slice(0, n - 1).reduce((a, c) => a + c.workouts, 0);
}

/** Chapters move with workouts, not strength: every workout takes one heart off the enemy. */
export function storyState(state: GameState): StoryState {
  const done = state.sessions.length;
  const tests = state.tests.length;
  let start = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i];
    const end = start + ch.workouts;
    if (done >= end && tests >= ch.tests) {
      start = end;
      continue;
    }
    return {
      index: i,
      chapter: ch,
      hearts: ch.workouts,
      heartsLeft: Math.max(0, end - done),
      awaitingTest: done >= end && tests < ch.tests,
      finished: false,
    };
  }
  return { index: CHAPTERS.length, chapter: null, hearts: 0, heartsLeft: 0, awaitingTest: false, finished: true };
}

function hadPerfectWeek(state: GameState): boolean {
  const counts = new Map<string, number>();
  for (const s of state.sessions) {
    const k = weekKey(new Date(s.date));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.values()].some((c) => c >= WEEKLY_GOAL);
}

/** Does a scene's `when` hold right now? */
export function holds(w: When, state: GameState, st: StoryState, now: Date): boolean {
  const n = state.sessions.length;
  const current = st.index + 1;
  const words = storyWords(state);
  const checks: [unknown, () => boolean][] = [
    [w.workouts, () => n >= w.workouts!],
    [w.chapter, () => current >= w.chapter!],
    [w.beaten, () => st.index >= w.beaten!],
    [w.awaitingTest, () => current === w.awaitingTest && st.awaitingTest],
    [w.inChapter, () => current === w.inChapter],
    [w.restDay, () => isRestDay(state, now) === w.restDay],
    [w.shortSession, () => (state.sessions[n - 1]?.kind === 'mini') === w.shortSession],
    [w.daysInRow, () => daysInRow(state, now) >= w.daysInRow!],
    [w.perfectWeek, () => hadPerfectWeek(state) === w.perfectWeek],
    [w.skill, () => state.progress[w.skill!.path] > w.skill!.past],
    [w.noClass, () => !state.profile.classId === w.noClass],
    [w.answer, () => (w.answer!.is === undefined ? !!state.answers?.[w.answer!.id] : state.answers?.[w.answer!.id] === w.answer!.is)],
    [w.needs, () => !!words[w.needs!].trim()],
    [w.away, () => (daysSinceTraining(state, now) ?? 0) >= w.away!],
    [w.finished, () => st.finished === w.finished],
  ];
  return checks.every(([given, test]) => given === undefined || test());
}

interface Placed {
  scene: Scene;
  /** The chapter whose file holds it; 0 for scenes that can happen any time. */
  chapter: number;
}

/** Every scene, in story order. */
export const ALL_SCENES: Placed[] = [...CHAPTERS.flatMap((c) => c.scenes.map((scene) => ({ scene, chapter: c.n }))), ...ANYTIME.map((scene) => ({ scene, chapter: 0 }))];

/** The id a scene is saved under: scenes that repeat after every absence get the workout count. */
export function savedId(scene: Scene, state: GameState): string {
  return scene.when.away ? `${scene.id}-${state.sessions.length}` : scene.id;
}

/**
 * Scenes whose moment has come and that the player has not seen yet, in story order. Once a
 * chapter is behind you, its leftover scenes are skipped (except the one that ends it), so a
 * returning player isn't buried in old scenes.
 */
export function pendingScenes(state: GameState, now: Date): Scene[] {
  const st = storyState(state);
  const seen = new Set(state.seenScenes);
  const current = st.index + 1;
  const due = ALL_SCENES.filter(({ scene, chapter }) => {
    if (seen.has(savedId(scene, state))) return false;
    if (chapter > 0 && chapter < current && scene.when.beaten !== chapter) return false;
    return holds(scene.when, state, st, now);
  }).map(({ scene }) => (scene.when.away ? { ...scene, id: savedId(scene, state) } : scene));
  // Coming back after a long time goes first.
  return [...due.filter((s) => s.when.away), ...due.filter((s) => !s.when.away)];
}

export function sceneById(id: string): Placed | undefined {
  return ALL_SCENES.find((p) => p.scene.id === id || id.startsWith(`${p.scene.id}-`));
}

/** Where a scene happens: its own place, else its chapter's, else the chapter you're in. */
export function scenePlace(scene: Scene, state: GameState): PlaceId {
  if (scene.place) return scene.place;
  const n = sceneById(scene.id)?.chapter || storyState(state).index + 1;
  return CHAPTERS[Math.min(CHAPTERS.length, n) - 1].place;
}

export function storyWords(state: GameState): Words {
  const a = state.answers ?? {};
  return {
    ...state.profile.letter,
    voice: state.profile.voice,
    sessions: String(state.sessions.length),
    flame: state.profile.flame || DEFAULT_FLAME_NAME,
    heart1: a.heart1 ?? '',
    heart2: a.heart2 ?? '',
    heart3: a.heart3 ?? '',
    heart4: a.heart4 ?? '',
    heart5: a.heart5 ?? '',
    heart6: a.heart6 ?? '',
  };
}

/** Fill in a text's {words}. Letter parts sit inside sentences, so their end punctuation goes. */
export function fill(text: string, words: Words): string {
  const out = text.replace(/\{(\w+)\}/g, (_, k: WordKey) => {
    const v = (words[k] ?? '').trim();
    return k === 'voice' || k === 'heart3' ? v : v.replace(/[.!]+$/, '');
  });
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** Fill in the player's own words and drop lines whose word is missing. */
export function renderLines(lines: Line[], words: Words): Line[] {
  return lines.filter((l) => !l.needs || words[l.needs].trim()).map((l) => ({ ...l, text: fill(l.text, words) }));
}

/** The name over a line. */
export function speakerName(who: CastId, words: Words): string {
  return fill(CAST[who].name, words);
}
