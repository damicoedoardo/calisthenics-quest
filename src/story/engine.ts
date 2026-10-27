import { weekKey, WEEKLY_GOAL, type GameState } from '@/lib/game';
import { daysInRow, daysSinceTraining, isRestDay } from '@/lib/days';
import { ANYTIME } from './anytime';
import { CAST, type CastId } from './cast';
import { CHAPTERS } from './chapters';
import type { PlaceId } from './places';
import { DEFAULT_FLAME_NAME } from './flame';
import type { AnswerId, Chapter, Line, Scene, When, WordKey, Words } from './types';

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

/**
 * Workouts a chapter waits for its max test before it moves on anyway. The test is worth taking,
 * but someone who never takes one shouldn't be stuck in the same month forever.
 */
export const TEST_GRACE = 3;

/** Workouts done before chapter `n` starts. */
export function chapterStart(n: number): number {
  return CHAPTERS.slice(0, n - 1).reduce((a, c) => a + c.workouts, 0);
}

/**
 * Chapters move with workouts, not strength: every workout takes one heart off the enemy. A chapter
 * that ends with a max test waits for one taken during the chapter (a first test on day one doesn't
 * count for month two), for at most TEST_GRACE more workouts.
 */
export function storyState(state: GameState): StoryState {
  const done = state.sessions.length;
  let start = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i];
    const end = start + ch.workouts;
    const wantsTest = ch.tests > (CHAPTERS[i - 1]?.tests ?? 0);
    const began = start > 0 ? state.sessions[start - 1]?.date : undefined;
    const tested = !wantsTest || state.tests.some((t) => !began || t.date >= began);
    if (done >= end && (tested || done >= end + TEST_GRACE)) {
      start = end;
      continue;
    }
    return {
      index: i,
      chapter: ch,
      hearts: ch.workouts,
      heartsLeft: Math.max(0, end - done),
      awaitingTest: done >= end,
      finished: false,
    };
  }
  return { index: CHAPTERS.length, chapter: null, hearts: 0, heartsLeft: 0, awaitingTest: false, finished: true };
}

/** The villagers whose stories you can join. Saying yes to one of them is "helping" them. */
export const VILLAGERS: AnswerId[] = ['lia', 'sol', 'vela'];

/** The villagers the player helped, in the order they met them. */
export function helpedVillagers(state: GameState): AnswerId[] {
  return VILLAGERS.filter((id) => state.answers?.[id] === 'yes');
}

const gave = (state: GameState, a: { id: AnswerId; is?: string }) => (a.is === undefined ? !!state.answers?.[a.id] : state.answers?.[a.id] === a.is);

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
    [w.answer, () => gave(state, w.answer!)],
    [w.needs, () => !!words[w.needs!].trim()],
    [w.roughRun, () => state.sessions.length >= w.roughRun! && state.sessions.slice(-w.roughRun!).every((x) => x.kind === 'mini')],
    [w.helped, () => (helpedVillagers(state).length > 0) === w.helped],
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

/** `when` fields that wait for something to happen (a rest day, a class...), not for a workout count. */
const WAITS_FOR: (keyof When)[] = ['restDay', 'shortSession', 'roughRun', 'daysInRow', 'perfectWeek', 'skill', 'noClass', 'away', 'awaitingTest', 'beaten', 'finished'];

/**
 * A story beat tied to a workout plays then, or a few workouts later while a chapter catches up.
 * One whose moment is long gone (a scene added after the player passed it) doesn't play late.
 * Scenes that also wait for something else (the first rest day, a class pick) never go stale.
 */
function longGone(w: When, state: GameState): boolean {
  if (w.workouts === undefined || WAITS_FOR.some((k) => w[k] !== undefined)) return false;
  return state.sessions.length - w.workouts > TEST_GRACE;
}

/** A scene as this player gets it: lines that wait for an answer they didn't give are left out. */
export function sceneFor(scene: Scene, state: GameState): Scene {
  const lines = scene.lines.filter((l) => !l.answer || gave(state, l.answer));
  return lines.length === scene.lines.length ? scene : { ...scene, lines };
}

/**
 * Scenes whose moment has come and that the player has not seen yet, in story order. Once a
 * chapter is behind you, its leftover scenes are skipped (except the one that ends it, and the
 * finale), and so are
 * scenes tied to a workout long past, so nobody is buried in old scenes.
 */
export function pendingScenes(state: GameState, now: Date): Scene[] {
  const st = storyState(state);
  const seen = new Set(state.seenScenes);
  const current = st.index + 1;
  const due = ALL_SCENES.filter(({ scene, chapter }) => {
    if (seen.has(savedId(scene, state))) return false;
    if (chapter > 0 && chapter < current && scene.when.beaten !== chapter && !scene.when.finished) return false;
    if (longGone(scene.when, state)) return false;
    return holds(scene.when, state, st, now);
  }).map(({ scene }) => sceneFor(scene.when.away ? { ...scene, id: savedId(scene, state) } : scene, state));
  // Coming back after a long time goes first.
  return [...due.filter((s) => s.when.away), ...due.filter((s) => !s.when.away)];
}

export function sceneById(id: string): Placed | undefined {
  // Exact first: `ch4-vela-down` is its own scene, not a repeat of `ch4-vela`.
  return ALL_SCENES.find((p) => p.scene.id === id) ?? ALL_SCENES.find((p) => p.scene.when.away && id.startsWith(`${p.scene.id}-`));
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

const LETTER_WORDS: WordKey[] = ['why', 'want', 'forWho', 'remind'];

/** Pronouns as someone else says them back to you: "my kids" becomes "your kids". */
const BACK: [RegExp, string][] = [
  [/\bI am\b/g, 'you are'],
  [/\bI was\b/g, 'you were'],
  [/\bI'm\b/g, "you're"],
  [/\bI've\b/g, "you've"],
  [/\bI'll\b/g, "you'll"],
  [/\bI'd\b/g, "you'd"],
  [/\bI\b/g, 'you'],
  [/\bmyself\b/gi, 'yourself'],
  [/\bmine\b/gi, 'yours'],
  [/\bmy\b/g, 'your'],
  [/\bMy\b/g, 'Your'],
  [/\bme\b/gi, 'you'],
];

/** The player's letter in someone else's mouth. */
export function sayBack(words: string): string {
  return BACK.reduce((t, [from, to]) => t.replace(from, to), words);
}

/**
 * Fill in a text's {words}. Letter parts sit inside sentences, so their end punctuation goes. Read
 * out in quotes they stay as written ("I'm starting again because {why}."); told back outside quotes
 * they turn to "you" ("You did this for {forWho}" gives "for your kids", not "for my kids").
 */
export function fill(text: string, words: Words): string {
  const out = text.replace(/\{(\w+)\}/g, (_, k: WordKey, at: number) => {
    const v = (words[k] ?? '').trim();
    if (k === 'voice' || k === 'heart3') return v;
    const bare = v.replace(/[.!]+$/, '');
    const quoted = (text.slice(0, at).match(/"/g)?.length ?? 0) % 2 === 1;
    return LETTER_WORDS.includes(k) && !quoted ? sayBack(bare) : bare;
  });
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** Fill in the player's own words, and drop lines whose word is missing (or, for `missing`, given). */
export function renderLines(lines: Line[], words: Words): Line[] {
  return lines
    .filter((l) => (!l.needs || words[l.needs].trim()) && (!l.missing || !words[l.missing].trim()))
    .map((l) => ({ ...l, text: fill(l.text, words) }));
}

/** The name over a line. */
export function speakerName(who: CastId, words: Words): string {
  return fill(CAST[who].name, words);
}
