import { initialState, type GameState, type Session } from '@/lib/game';
import { NO_FOG } from '@/lib/fog';
import { giveSp, spAfterRun, SP_FLOOR } from '@/lib/sp';
import { ALL_SCENES, isEnding, scenesToPlay, sawScene, storyState, workoutsFor, VILLAGERS } from './engine';
import { CHAPTERS } from './chapters';
import { ROAD_SCENES } from './road';
import type { AnswerId, Line, Scene, When, WordKey } from './types';

/* The story as a graph: every scene is a node, with what makes it play, what it asks, and which
   answers it leans on. Walks play the whole story through the real engine (scenesToPlay) for a few
   kinds of player, so the graph shows which scenes each one really gets, and `problems` lists the
   paths that lose something (a scene lost or played after its chapter's ending when a boss falls
   early, a follow-up whose question never came). graph.test.ts writes it all to graph.md (`pnpm story:graph`), and `pnpm test` fails
   while graph.md is out of date. Pure: reads the story data, never a save. */

/** A scene's trigger in words, e.g. "8 workouts · rest day". */
export function describeWhen(w: When): string {
  const parts: string[] = [];
  if (w.workouts !== undefined) parts.push(`${w.workouts} workout${w.workouts === 1 ? '' : 's'}`);
  if (w.grown) parts.push(`flame grown to ${w.grown}`);
  if (w.chapter) parts.push(`chapter ${w.chapter} started`);
  if (w.inChapter) parts.push(`in chapter ${w.inChapter}`);
  if (w.upTo) parts.push(`up to chapter ${w.upTo}`);
  if (w.beaten) parts.push(`boss ${w.beaten} beaten`);
  if (w.restDay !== undefined) parts.push(w.restDay ? 'rest day' : 'not a rest day');
  if (w.shortSession) parts.push('after a short workout');
  if (w.daysInRow) parts.push(`${w.daysInRow} days in a row`);
  if (w.perfectWeek) parts.push('a full week');
  if (w.better) parts.push(`beat last time in ${w.better} workout${w.better === 1 ? '' : 's'}`);
  if (w.noClass !== undefined) parts.push(w.noClass ? 'no class yet' : 'has a class');
  if (w.noLetter) parts.push('no letter yet');
  if (w.spReady) parts.push('SP trial done');
  if (w.answer) parts.push(w.answer.is === undefined ? `answered ${w.answer.id}` : `${w.answer.id} = ${w.answer.is || '(none)'}`);
  if (w.needs) parts.push(`needs {${w.needs}}`);
  if (w.helped !== undefined) parts.push(w.helped ? 'helped a villager' : 'helped no villager');
  if (w.roughRun) parts.push(`last ${w.roughRun} workouts short`);
  if (w.away) parts.push(`away ${w.away}+ days`);
  if (w.finished) parts.push('story finished');
  if (w.road) parts.push(`Ember Road ${Object.entries(w.road).map(([k, v]) => (v === true ? k : `${k} ${v}`))[0]}`);
  return parts.join(' · ') || 'any time';
}

/** Where a scene sits: a chapter (1 to 6), any time (0), or the Ember Road. */
export type Group = number | 'road';

/** An answer or word a scene leans on, and the scene that asks for it. */
export interface Use {
  /** What it reads: an answer id (lia, heart2) or a letter word (why, want). */
  key: AnswerId | WordKey;
  /** The answer it waits for ("yes"), when it waits for one in particular. */
  is?: string;
  /** The scene that asks for it; left out for words given before the story (the opening). */
  from?: string;
  /** The whole scene waits for it (in `when`), or only some lines do. */
  whole: boolean;
}

export interface Node {
  id: string;
  group: Group;
  /** Its name: the scene's title, or its first line. */
  title: string;
  when: string;
  /** What it asks: an answer id, or the kind of ask (name, letter, class, sp). */
  asks?: string;
  /** It ends its chapter (its boss fell). */
  ends: boolean;
  /** Plays even when its chapter ends first (`keep`, or it asks something). */
  /** May be dropped when its boss falls first (`optional`); every other chapter scene catches up. */
  optional: boolean;
  uses: Use[];
}

/** The words the opening gives, before any scene: the Hollow's line. */
const FROM_OPENING: WordKey[] = ['voice', 'sessions', 'flame'];
const LETTER: WordKey[] = ['why', 'want', 'forWho', 'remind'];

function linesOf(scene: Scene): Line[] {
  const ask = scene.ask;
  const after = ask && 'after' in ask && ask.after ? ask.after : [];
  const choices = ask?.kind === 'choice' ? ask.choices.flatMap((c) => c.after ?? []) : [];
  return [...scene.lines, ...after, ...choices];
}

/** Which scene asks for each answer, and for the flame's name and the letter. */
function askers(): Map<string, string> {
  const by = new Map<string, string>();
  for (const { scene } of ALL_SCENES) {
    const ask = scene.ask;
    if (!ask) continue;
    const key = ask.kind === 'choice' ? ask.id : ask.kind;
    if (!by.has(key)) by.set(key, scene.id);
    if (ask.kind === 'letter') LETTER.forEach((w) => by.set(w, scene.id));
    if (ask.kind === 'choice' && ask.id.startsWith('heart')) by.set(ask.id, scene.id);
  }
  return by;
}

function usesOf(scene: Scene, by: Map<string, string>): Use[] {
  const out: Use[] = [];
  const add = (key: AnswerId | WordKey, whole: boolean, is?: string) => {
    if (FROM_OPENING.includes(key as WordKey)) return;
    const from = by.get(key);
    // An ask's own answer is not a use of itself.
    if (from === scene.id) return;
    const at = out.find((u) => u.key === key && u.is === is);
    if (at) at.whole ||= whole;
    else out.push({ key, ...(is !== undefined ? { is } : {}), ...(from ? { from } : {}), whole });
  };
  const w = scene.when;
  if (w.answer) add(w.answer.id, true, w.answer.is);
  if (w.needs) add(w.needs, true);
  if (w.helped !== undefined) VILLAGERS.forEach((v) => add(v, true));
  for (const l of linesOf(scene)) {
    if (l.answer) add(l.answer.id, false, l.answer.is);
    if (l.needs) add(l.needs, false);
    if (l.missing) add(l.missing, false);
    for (const m of l.text.matchAll(/\{(\w+)\}/g)) add(m[1] as WordKey, false);
  }
  return out;
}

function titleOf(scene: Scene): string {
  const text = scene.title ?? scene.lines[0]?.text ?? scene.id;
  const plain = text.replace(/\{(\w+)\}/g, (_, k: string) => (k === 'flame' ? 'Ember' : `…`));
  return plain.length > 60 ? `${plain.slice(0, 57).trimEnd()}...` : plain;
}

/** Every scene as a node, in story order. */
export function storyNodes(): Node[] {
  const by = askers();
  const road = new Set(ROAD_SCENES.map((s) => s.id));
  return ALL_SCENES.map(({ scene, chapter }) => ({
    id: scene.id,
    group: road.has(scene.id) ? 'road' : chapter,
    title: titleOf(scene),
    when: describeWhen(scene.when),
    ...(scene.ask ? { asks: scene.ask.kind === 'choice' ? scene.ask.id : scene.ask.kind } : {}),
    ends: !!scene.when.beaten && scene.when.beaten === chapter,
    optional: !!scene.optional,
    uses: usesOf(scene, by),
  }));
}

// ---- Walks: the whole story played through the real engine ----

export interface Walk {
  id: string;
  about: string;
  /** Workouts into a chapter when its boss falls in the Fog (left out: the chapter's planned length). */
  bossAfter?: number;
  /** Joins every villager's story (true) or walks on (false). */
  helps: boolean;
}

export const WALKS: Walk[] = [
  { id: 'planned', about: "Beats each boss at the chapter's planned length (12 to 14 workouts), joins every villager", helps: true },
  { id: 'fast', about: 'Beats each boss 4 workouts into its chapter (a strong player), joins every villager', bossAfter: 4, helps: true },
  { id: 'alone', about: 'Planned pace, but walks on from every villager', helps: false },
];

export interface Played {
  id: string;
  /** Workouts done when it played. */
  at: number;
  /** The chapter being played then (7 once the story is finished). */
  inChapter: number;
}

export interface WalkResult {
  walk: Walk;
  played: Played[];
  /** Workouts done when each boss fell. */
  bossesAt: number[];
}

const DAY = 86_400_000;

/**
 * One kind of player, from the first workout to the finale and a while after: trains Monday,
 * Wednesday and Friday (every seventh workout a short one, every other one beats last time),
 * opens the app every day, answers every question with its first choice, picks a class when asked.
 */
export function walkStory(walk: Walk, start: Date): WalkResult {
  const base = initialState();
  let state: GameState = {
    ...base,
    profile: { ...base.profile, onboarded: true, flame: 'Ember', voice: "You're not enough.", letter: { why: '', want: '', forWho: '', remind: '' } },
    fog: { ...NO_FOG, clearedAt: [] },
  };
  const played: Played[] = [];
  const bossesAt: number[] = [];

  const play = (now: Date) => {
    for (let guard = 0; guard < 40; guard++) {
      const scene = scenesToPlay(state, now)[0];
      if (!scene) return;
      played.push({ id: scene.id, at: state.sessions.length, inChapter: storyState(state).index + 1 });
      state = sawScene(state, scene.id);
      const ask = scene.ask;
      if (ask?.kind === 'choice') {
        const villager = (VILLAGERS as string[]).includes(ask.id);
        const pick = villager && !walk.helps ? ask.choices.find((c) => c.value !== 'yes') : ask.choices[0];
        state = { ...state, answers: { ...state.answers, [ask.id]: pick?.value ?? '' } };
      } else if (ask?.kind === 'letter') {
        state = { ...state, profile: { ...state.profile, letter: { why: 'I miss it', want: 'run again', forWho: 'me', remind: 'it gets easier' } } };
      } else if (ask?.kind === 'class') {
        state = { ...state, profile: { ...state.profile, classId: 'warrior' } };
      } else if (ask?.kind === 'sp') {
        state = giveSp(state, ask.n ?? 1);
      }
    }
  };

  for (let d = 0; d < 400; d++) {
    const now = new Date(start.getTime() + d * DAY);
    if ([1, 3, 5].includes(now.getDay())) {
      const n = state.sessions.length;
      const session: Session = { id: `walk-${n}`, date: now.toISOString(), kind: (n + 1) % 7 === 0 ? 'mini' : 'full', day: n % 2 ? 'B' : 'A', xp: 100, breakdown: [], entries: [], better: n % 2 === 1 };
      state = { ...state, sessions: [...state.sessions, session] };
      if (state.sp) state = spAfterRun(state, { floor: SP_FLOOR });
      play(now);
      const st = storyState(state);
      if (!st.finished && workoutsFor(state, st.index + 1) >= (walk.bossAfter ?? st.chapter!.workouts)) {
        const fog = state.fog ?? NO_FOG;
        state = { ...state, fog: { ...fog, cleared: fog.cleared + 1, clearedAt: [...(fog.clearedAt ?? []), state.sessions.length] } };
        bossesAt.push(state.sessions.length);
      }
    }
    play(now);
    if (storyState(state).finished && played.some((p) => p.id === 'finale') && d > 7 * 40) break;
  }
  return { walk, played, bossesAt };
}

// ---- Problems: the paths that lose something ----

export interface Problem {
  scene: string;
  kind: 'lost-early' | 'after-ending' | 'missing-answer' | 'never' | 'optional' | 'out-of-chapter';
  text: string;
}

/** `when` fields the walks never make happen, so a scene that needs them is not walked. */
const UNWALKED: (keyof When)[] = ['road', 'away', 'daysInRow', 'roughRun', 'perfectWeek'];

export function storyProblems(nodes: Node[], walks: WalkResult[]): Problem[] {
  const out: Problem[] = [];
  const scene = new Map(ALL_SCENES.map((p) => [p.scene.id, p]));
  const sees = (w: WalkResult, id: string) => w.played.some((p) => p.id === id);
  const planned = walks.find((w) => w.walk.id === 'planned')!;
  const fast = walks.find((w) => w.walk.id === 'fast');
  const boss = (n: number) => CHAPTERS[n - 1]?.enemy ?? `chapter ${n}'s boss`;

  for (const node of nodes) {
    if (node.group === 'road') continue;
    const s = scene.get(node.id)!.scene;
    const ch = node.group as number;
    const story = ch > 0 && !node.ends && !s.when.grown;
    // A chapter's scene the planned player gets and the fast one loses: its boss fell first.
    if (story && fast && sees(planned, node.id) && !sees(fast, node.id)) {
      if (node.optional) out.push({ scene: node.id, kind: 'optional', text: `Optional (${describeWhen(s.when)}): the fast walk never got that day before ${boss(ch)} fell.` });
      else out.push({ scene: node.id, kind: 'lost-early', text: `Lost when ${boss(ch)} falls 4 workouts into chapter ${ch}.` });
    }
    // A chapter's scene that plays after the chapter's ending (the boss fell before its moment).
    if (story && !node.optional) {
      for (const w of walks) {
        const at = w.played.findIndex((p) => p.id === node.id);
        const end = w.played.findIndex((p) => isEnding(scene.get(p.id)!.scene, ch) && scene.get(p.id)!.chapter === ch);
        if (at >= 0 && end >= 0 && at > end) out.push({ scene: node.id, kind: 'after-ending', text: `In the ${w.walk.id} walk it plays after the chapter's ending (${w.played[end].id}), in chapter ${w.played[at].inChapter}.` });
      }
    }
    // The flame grows by all workouts, so a growth scene can land in another chapter, or after the end.
    if (ch > 0 && s.when.grown) {
      for (const w of walks) {
        const p = w.played.find((x) => x.id === node.id);
        if (p && p.inChapter > CHAPTERS.length) out.push({ scene: node.id, kind: 'after-ending', text: `In the ${w.walk.id} walk the flame grows up on screen after the finale (workout ${p.at}).` });
        else if (p && p.inChapter !== ch) out.push({ scene: node.id, kind: 'out-of-chapter', text: `In the ${w.walk.id} walk it plays ${p.inChapter > CHAPTERS.length ? 'after the finale' : `in chapter ${p.inChapter}`} (workout ${p.at}), not in chapter ${ch} where it is written.` });
      }
    }
    // A scene or line that leans on an answer the player was never asked by then.
    for (const u of node.uses) {
      if (!u.from) continue;
      for (const w of walks) {
        const at = w.played.findIndex((p) => p.id === node.id);
        const asked = w.played.findIndex((p) => p.id === u.from);
        if (at >= 0 && (asked < 0 || asked > at)) out.push({ scene: node.id, kind: 'missing-answer', text: `In the ${w.walk.id} walk it plays before ${u.from} asks ${u.key}${u.whole ? '' : ', so its lines about it drop'}.` });
      }
    }
    if (!walks.some((w) => sees(w, node.id)) && !UNWALKED.some((k) => s.when[k] !== undefined)) out.push({ scene: node.id, kind: 'never', text: 'No walk reaches it.' });
  }
  return out;
}

/** A Monday evening: the walks start here, so the graph is the same on every machine. */
export const GRAPH_START = new Date(2026, 10, 2, 19);

export interface StoryGraph {
  nodes: Node[];
  walks: WalkResult[];
  problems: Problem[];
}

export function storyGraph(start = GRAPH_START): StoryGraph {
  const nodes = storyNodes();
  const walks = WALKS.map((w) => walkStory(w, start));
  return { nodes, walks, problems: storyProblems(nodes, walks) };
}
