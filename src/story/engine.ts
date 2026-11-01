import { weekKey, WEEKLY_GOAL, type GameState } from '@/lib/game';
import { dayKey, daysInRow, daysSinceTraining } from '@/lib/days';
import { isRestToday } from '@/lib/coach/week';
import { ANYTIME } from './anytime';
import { CAST, type CastId } from './cast';
import { CHAPTERS } from './chapters';
import type { PlaceId } from './places';
import { DEFAULT_FLAME_NAME, FLAME_STAGES } from './flame';
import { spOpen } from '@/lib/sp';
import { roadHolds } from '@/lib/road';
import { ROAD_SCENES } from './road';
import type { AnswerId, Ask, Chapter, Line, Scene, When, WordKey, Words } from './types';

/* Reads the story files: which chapter you're in, which scenes are due, and how a line reads
   with your own words in it. Nothing here knows the story itself. */

export interface StoryState {
  /** Index into CHAPTERS of the chapter being played; CHAPTERS.length once the story is finished.
      It is the number of Fog bosses beaten in Story runs: a chapter ends when its boss falls. */
  index: number;
  chapter: Chapter | null;
  /** The chapter boss's hearts in the Fog: each workout takes one, and with none left it fights
      weaker (EDGE in src/lib/fog.ts). They run out at the workout its zone is built for. */
  hearts: number;
  heartsLeft: number;
  /** Every chapter is behind you. */
  finished: boolean;
}

/** Workouts a scene tied to a workout count can still play late, while a chapter catches up. */
export const CATCH_UP = 3;

/** Workouts done when chapter `n` is planned to start (at the weekly goal): what its Fog zone is
    built for. Chapters really start when the boss before falls (`chapterBegan`). */
export function chapterStart(n: number): number {
  return CHAPTERS.slice(0, n - 1).reduce((a, c) => a + c.workouts, 0);
}

/** Workouts done when chapter `n` really began: when the boss before it fell (`fog.clearedAt`). */
export function chapterBegan(state: GameState, n: number): number {
  if (n <= 1) return 0;
  return state.fog?.clearedAt?.[n - 2] ?? chapterStart(n);
}

/** Chapters move with the Fog: a chapter lasts until its boss falls in a Story run. Workouts take
    the boss's hearts, so it fights weaker, but only beating it ends the chapter. */
export function storyState(state: GameState): StoryState {
  const i = Math.min(state.fog?.cleared ?? 0, CHAPTERS.length);
  if (i >= CHAPTERS.length) return { index: CHAPTERS.length, chapter: null, hearts: 0, heartsLeft: 0, finished: true };
  const end = chapterStart(i + 2);
  const done = state.sessions.length;
  return { index: i, chapter: CHAPTERS[i], hearts: Math.max(0, end - chapterBegan(state, i + 1)), heartsLeft: Math.max(0, end - done), finished: false };
}

/** Workouts that count for a scene's `workouts`: since its chapter began (in all, for the scenes
    of anytime.ts and the Ember Road, chapter 0). */
export function workoutsFor(state: GameState, chapter: number): number {
  return state.sessions.length - (chapter > 0 ? chapterBegan(state, chapter) : 0);
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

/** Has the player written any line of their letter? */
export function wroteLetter(state: GameState): boolean {
  return Object.values(state.profile.letter).some((v) => v.trim());
}

/** Does a scene's `when` hold right now? */
export function holds(w: When, state: GameState, st: StoryState, now: Date, chapter = 0): boolean {
  const n = state.sessions.length;
  const current = st.index + 1;
  const words = storyWords(state);
  // A chapter's own scenes wait for it to begin, and once it is behind you their workouts are done.
  const own = chapter > 0 && !w.grown && !w.beaten && w.finished === undefined;
  if (own && current < chapter) return false;
  const count = own && current > chapter ? Infinity : workoutsFor(state, chapter);
  const checks: [unknown, () => boolean][] = [
    [w.workouts, () => count >= w.workouts!],
    [w.chapter, () => current >= w.chapter!],
    [w.beaten, () => st.index >= w.beaten!],
    [w.grown, () => FLAME_STAGES.find((f) => f.id === w.grown)!.at <= n],
    [w.inChapter, () => current === w.inChapter],
    [w.restDay, () => isRestToday(state, now) === w.restDay],
    [w.shortSession, () => (state.sessions[n - 1]?.kind === 'mini') === w.shortSession],
    [w.daysInRow, () => daysInRow(state, now) >= w.daysInRow!],
    [w.perfectWeek, () => hadPerfectWeek(state) === w.perfectWeek],
    [w.better, () => state.sessions.filter((x) => x.better).length >= w.better!],
    [w.noClass, () => !state.profile.classId === w.noClass],
    [w.noLetter, () => !wroteLetter(state) === w.noLetter],
    [w.spReady, () => spOpen(state) === w.spReady],
    [w.answer, () => gave(state, w.answer!)],
    [w.needs, () => !!words[w.needs!].trim()],
    [w.roughRun, () => state.sessions.length >= w.roughRun! && state.sessions.slice(-w.roughRun!).every((x) => x.kind === 'mini')],
    [w.helped, () => (helpedVillagers(state).length > 0) === w.helped],
    [w.away, () => (daysSinceTraining(state, now) ?? 0) >= w.away!],
    [w.finished, () => st.finished === w.finished],
    [w.road, () => roadHolds(w.road!, state)],
  ];
  return checks.every(([given, test]) => given === undefined || test());
}

interface Placed {
  scene: Scene;
  /** The chapter whose file holds it; 0 for scenes that can happen any time. */
  chapter: number;
}

/** Every scene, in story order; the Ember Road's (road.ts) come with any chapter, like ANYTIME's. */
export const ALL_SCENES: Placed[] = [
  ...CHAPTERS.flatMap((c) => c.scenes.map((scene) => ({ scene, chapter: c.n }))),
  ...ANYTIME.map((scene) => ({ scene, chapter: 0 })),
  ...ROAD_SCENES.map((scene) => ({ scene, chapter: 0 })),
];

/** The id a scene is saved under: scenes that repeat after every absence get the workout count. */
export function savedId(scene: Scene, state: GameState): string {
  return scene.when.away ? `${scene.id}-${state.sessions.length}` : scene.id;
}

/** `when` fields that wait for something to happen (a rest day, a class...), not for a workout count. */
const WAITS_FOR: (keyof When)[] = ['restDay', 'shortSession', 'roughRun', 'daysInRow', 'perfectWeek', 'better', 'noClass', 'spReady', 'away', 'beaten', 'grown', 'finished', 'road'];

/**
 * A story beat tied to a workout plays then, or a few workouts later while a chapter catches up.
 * One whose moment is long gone (a scene added after the player passed it) doesn't play late.
 * Scenes that also wait for something else (the first rest day, a class pick) never go stale.
 */
function longGone(w: When, state: GameState, chapter: number): boolean {
  if (w.workouts === undefined || WAITS_FOR.some((k) => w[k] !== undefined)) return false;
  return workoutsFor(state, chapter) - w.workouts > CATCH_UP;
}

/** A scene as this player gets it: lines that wait for an answer they didn't give are left out,
    in the question's answer lines too. */
export function sceneFor(scene: Scene, state: GameState): Scene {
  const keep = (ls: Line[]) => ls.filter((l) => !l.answer || gave(state, l.answer));
  return { ...scene, lines: keep(scene.lines), ask: askFor(scene.ask, keep) };
}

function askFor(ask: Ask | undefined, keep: (ls: Line[]) => Line[]): Ask | undefined {
  if (ask?.kind === 'name' || ask?.kind === 'letter') return { ...ask, after: keep(ask.after) };
  if (ask?.kind === 'choice') return { ...ask, after: ask.after && keep(ask.after), choices: ask.choices.map((c) => ({ ...c, after: c.after && keep(c.after) })) };
  return ask;
}

/**
 * Scenes whose moment has come and that the player has not seen yet, in story order. Once a
 * chapter is behind you (its boss fell), its leftover scenes are skipped, except the one that ends
 * it and the ones that ask something (a heart moment, a villager's story), so later scenes still
 * have your answers. Scenes tied to a workout long past are skipped too, so nobody is buried in
 * old scenes. A chapter's ending plays first, then its leftover questions, then the next chapter.
 */
export function pendingScenes(state: GameState, now: Date): Scene[] {
  const st = storyState(state);
  // Scenes put off with Later wait in Story so far, not here.
  const seen = new Set([...state.seenScenes, ...(state.laterScenes ?? [])]);
  const current = st.index + 1;
  const behind = (chapter: number) => chapter > 0 && chapter < current;
  const due = ALL_SCENES.filter(({ scene, chapter }) => {
    if (seen.has(savedId(scene, state))) return false;
    const w = scene.when;
    if (behind(chapter) && w.beaten !== chapter && !w.finished && !w.grown && !scene.ask && !scene.keep) return false;
    if (!behind(chapter) && longGone(w, state, chapter)) return false;
    return holds(w, state, st, now, chapter);
  });
  // In story order: a chapter's ending, then what it still had to ask, then the new chapter.
  const rank = ({ scene, chapter }: Placed) => (scene.when.away ? 0 : scene.when.beaten ? 1 : behind(chapter) && !scene.when.grown ? 2 : 3);
  return [...due]
    .sort((a, b) => rank(a) - rank(b))
    .map(({ scene }) => sceneFor(scene.when.away ? { ...scene, id: savedId(scene, state) } : scene, state));
}

/** One story moment: today, after this many workouts and Fog bosses. A new workout starts a new
    one, and so does a boss falling (it ends a chapter, so its ending plays at once). */
export function sceneMoment(state: GameState, now: Date): string {
  return `${dayKey(now)}|${state.sessions.length}|${state.fog?.cleared ?? 0}`;
}

/**
 * The scenes to play now: every due one, one after another. Nothing plays at a moment where the
 * player said Later; the rest wait for the next workout, day or boss.
 */
export function scenesToPlay(state: GameState, now: Date): Scene[] {
  if (state.sceneMark?.off && state.sceneMark.at === sceneMoment(state, now)) return [];
  return pendingScenes(state, now);
}

/** Mark a scene played. */
export function sawScene(state: GameState, id: string): GameState {
  return { ...state, seenScenes: state.seenScenes.includes(id) ? state.seenScenes : [...state.seenScenes, id] };
}

/** How a scene was opened: when its moment came, from the scenes put off, or watched again. */
export type SceneMode = 'due' | 'later' | 'again';

/** How a scene ended: put off with Later, or with its words or question skipped. */
export interface SceneEnd {
  later?: boolean;
  skipped?: boolean;
}

const without = (ids: string[] | undefined, id: string) => (ids ?? []).filter((x) => x !== id);
const withId = (ids: string[] | undefined, id: string) => (ids?.includes(id) ? ids : [...(ids ?? []), id]);

/** Put the scenes due now off with Later. Nothing else plays this moment: the player said not now. */
export function putOff(state: GameState, ids: string[], now: Date): GameState {
  return { ...state, laterScenes: ids.reduce(withId, state.laterScenes), sceneMark: { at: sceneMoment(state, now), off: true } };
}

/**
 * The save's story lists after a scene ends. A due scene is seen;
 * one from the put-off list is seen and leaves it; one watched again stays seen. A skip marks it
 * in Story so far, and watching it to the end clears the mark.
 */
export function endedScene(state: GameState, id: string, mode: SceneMode, end: SceneEnd, now: Date): GameState {
  if (end.later && mode !== 'again') return putOff(state, [id], now);
  const seen = mode === 'due' ? sawScene(state, id) : { ...state, seenScenes: withId(state.seenScenes, id) };
  const next = { ...seen, laterScenes: without(state.laterScenes, id) };
  return { ...next, skippedScenes: end.skipped ? withId(state.skippedScenes, id) : without(state.skippedScenes, id) };
}

/** Scenes waiting for the player in Story so far: put off, or skipped. */
export function waitingCount(state: GameState): number {
  return (state.laterScenes?.length ?? 0) + (state.skippedScenes?.length ?? 0);
}

/** Watched again, does a scene ask its question for real? Only when it was never answered:
    the flame's name skipped (it kept the default), or a choice with no answer saved. Gifts (an SP,
    a class) never come twice. */
export function asksAgain(scene: Scene, state: GameState): boolean {
  const ask = scene.ask;
  if (ask?.kind === 'name') return !!state.skippedScenes?.includes(scene.id) && (state.profile.flame ?? DEFAULT_FLAME_NAME) === DEFAULT_FLAME_NAME;
  if (ask?.kind === 'choice') return state.answers?.[ask.id] === undefined;
  if (ask?.kind === 'letter') return !wroteLetter(state);
  return false;
}

/** Watched again without its question: the lines that followed the answer the player gave. */
export function answeredLines(scene: Scene, state: GameState): Line[] {
  const ask = scene.ask;
  if (ask?.kind === 'name' || ask?.kind === 'letter') return ask.after;
  if (ask?.kind !== 'choice') return [];
  const value = state.answers?.[ask.id];
  const picked = ask.choices.find((c) => c.value === value);
  return picked?.after ?? ask.after ?? [];
}

export interface StoryEntry {
  /** The id it's saved under (with its workout count for a scene that repeats). */
  id: string;
  scene: Scene;
  title: string;
  waits?: 'later' | 'skipped';
}

export interface StoryGroup {
  title: string;
  entries: StoryEntry[];
}

/** A scene's name in Story so far: its own title, else its first line as the player reads it. */
export function sceneTitle(scene: Scene, state: GameState): string {
  if (scene.title) return scene.title;
  const first = renderLines(sceneFor(scene, state).lines, storyWords(state))[0];
  return first?.text ?? scene.id;
}

/**
 * Story so far: every scene the player has reached, in story order, by chapter, then the scenes
 * that come any time, then the Ember Road. A scene not reached yet never shows (no spoilers).
 * A scene that repeats (coming back after time away) shows once, its latest time.
 */
export function storySoFar(state: GameState): StoryGroup[] {
  const later = state.laterScenes ?? [];
  const skipped = state.skippedScenes ?? [];
  const reached = [...state.seenScenes, ...later];
  const road = new Set(ROAD_SCENES.map((s) => s.id));
  const entry = ({ scene }: Placed): StoryEntry | null => {
    const id = scene.when.away ? reached.filter((x) => x.startsWith(`${scene.id}-`)).at(-1) : reached.includes(scene.id) ? scene.id : undefined;
    if (!id) return null;
    const waits = later.includes(id) ? 'later' : skipped.includes(id) ? 'skipped' : undefined;
    const s = sceneFor(scene.when.away ? { ...scene, id } : scene, state);
    return { id, scene: s, title: sceneTitle(s, state), ...(waits ? { waits } : {}) };
  };
  const group = (title: string, placed: Placed[]): StoryGroup => ({ title, entries: placed.map(entry).filter((e): e is StoryEntry => !!e) });
  return [
    ...CHAPTERS.map((c) => group(`Chapter ${c.n}: ${c.name}`, ALL_SCENES.filter((p) => p.chapter === c.n))),
    group('Along the way', ALL_SCENES.filter((p) => p.chapter === 0 && !road.has(p.scene.id))),
    group('The Ember Road', ALL_SCENES.filter((p) => road.has(p.scene.id))),
  ].filter((g) => g.entries.length > 0);
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
