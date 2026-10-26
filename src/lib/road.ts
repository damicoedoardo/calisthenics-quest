import { CHAPTERS, clearedOf } from './story';
import { gearOf, levelInfo, totalXp, type GameState } from './game';

/* The road through the Fog. Training lights it, playing walks it.
   - Every real session lights one more stop. You can only play lit stops, plus one stop
     "in the dark" just past the light, where enemies are much stronger (the skill reward).
   - Each stop is one fight. Win it to clear it. Losing costs nothing.
   - Every third stop is the chapter boss: one blow per week. The last stop of a chapter is the
     final blow, and beating it ends the chapter.
   The road is one line across all chapters: chapter i owns CHAPTERS[i].sessions stops. */

export type StopKind = 'guardian' | 'fight' | 'elite' | 'boss';
export type FoeSprite = 'slime' | 'mirror' | 'golem' | 'summit' | 'wisp' | 'weight' | 'echo' | 'hollow';

export interface Move {
  kind: 'attack' | 'multi' | 'charge' | 'big';
  dmg: number;
  hits?: number;
}

export interface Stop {
  /** Index on the whole road, from 0. */
  g: number;
  chapter: number;
  /** Index inside the chapter, from 0. */
  i: number;
  kind: StopKind;
  name: string;
  sprite: FoeSprite;
  hp: number;
  moves: Move[];
  /** Boss stops: which blow this is (1-based) and how many the boss takes in this chapter. */
  blow?: { n: number; of: number };
  line?: string;
}

export const DARK_PENALTY = 0.6;
export const BLOWS_EVERY = 3;

// ---------- Ember ----------

export interface EmberStage {
  name: string;
  at: number;
  perk: string;
}

/** Ember grows with every session, forever. */
export const EMBER_STAGES: EmberStage[] = [
  { name: 'Spark', at: 0, perk: 'Heals you once per fight.' },
  { name: 'Candle', at: 6, perk: 'Wider guard timing.' },
  { name: 'Torch', at: 15, perk: 'Joins the fight: one Ember strike per battle.' },
  { name: 'Bonfire', at: 30, perk: 'You start every fight with a shield.' },
  { name: 'Beacon', at: 50, perk: 'The dark past the light is half as dangerous.' },
];

export function emberStage(sessions: number) {
  let index = 0;
  EMBER_STAGES.forEach((s, i) => {
    if (sessions >= s.at) index = i;
  });
  const next = EMBER_STAGES[index + 1] ?? null;
  return {
    index,
    stage: EMBER_STAGES[index],
    next,
    toNext: next ? next.at - sessions : 0,
    /** 0..1 progress to the next stage. */
    pct: next ? (sessions - EMBER_STAGES[index].at) / (next.at - EMBER_STAGES[index].at) : 1,
    /** Sprite size on the map: it visibly grows with every session. */
    size: Math.round(36 + index * 10 + (next ? ((sessions - EMBER_STAGES[index].at) / (next.at - EMBER_STAGES[index].at)) * 8 : 0)),
  };
}

// ---------- the road ----------

const BOSS_SPRITE: FoeSprite[] = ['slime', 'mirror', 'golem', 'hollow', 'summit'];

const BOSS_LINES: Record<number, string[]> = {
  0: ['"Rest today. You can always start tomorrow."', '"Tomorrow is safer. Tomorrow you\'ll be ready."'],
  1: ['"I never missed a day. Look at you."', '"You\'ll never be who you were."'],
  2: ['"This is as far as you go."', '"Same weight. Same reps. Forever."'],
  3: ['"You were supposed to be alone."', '"Why keep going? You always quit."'],
  4: ['"Is this really you?"', '"Then show me."'],
};

/** Base enemy moves by kind. Numbers scale with the stop's place on the road. */
const PATTERNS: Record<StopKind, Move[]> = {
  guardian: [{ kind: 'attack', dmg: 3 }],
  fight: [
    { kind: 'attack', dmg: 4 },
    { kind: 'multi', dmg: 2, hits: 2 },
    { kind: 'attack', dmg: 5 },
  ],
  elite: [
    { kind: 'multi', dmg: 3, hits: 2 },
    { kind: 'charge', dmg: 0 },
    { kind: 'big', dmg: 12 },
  ],
  boss: [
    { kind: 'attack', dmg: 5 },
    { kind: 'multi', dmg: 3, hits: 3 },
    { kind: 'charge', dmg: 0 },
    { kind: 'big', dmg: 14 },
  ],
};

const BASE_HP: Record<StopKind, number> = { guardian: 12, fight: 20, elite: 34, boss: 44 };

function chapterStart(chapter: number): number {
  return CHAPTERS.slice(0, chapter).reduce((a, c) => a + c.sessions, 0);
}

export const ROAD_LENGTH = CHAPTERS.reduce((a, c) => a + c.sessions, 0);

export function stopAt(g: number): Stop | null {
  if (g < 0 || g >= ROAD_LENGTH) return null;
  let chapter = 0;
  while (g >= chapterStart(chapter + 1)) chapter++;
  const ch = CHAPTERS[chapter];
  const i = g - chapterStart(chapter);
  const last = i === ch.sessions - 1;
  const bossStop = last || (i + 1) % BLOWS_EVERY === 0;
  const blowsTotal = Math.ceil(ch.sessions / BLOWS_EVERY);
  let kind: StopKind;
  let name: string;
  let sprite: FoeSprite;
  let line: string | undefined;
  if (g === 0) {
    kind = 'guardian';
    name = 'The Weight of Starting';
    sprite = 'weight';
    line = '"Too heavy. Too late. Why even get up?"';
  } else if (bossStop) {
    kind = 'boss';
    name = ch.enemy;
    sprite = BOSS_SPRITE[chapter];
    const n = Math.floor(i / BLOWS_EVERY) + 1;
    line = BOSS_LINES[chapter]?.[last ? 1 : 0];
    return { ...build(g, chapter, i, kind, name, sprite, line), blow: { n: Math.min(n, blowsTotal), of: blowsTotal } };
  } else if (i % BLOWS_EVERY === 1 && i > 1) {
    kind = 'elite';
    name = chapter === 0 ? 'The Afterimage' : 'Shade of ' + ch.enemy;
    sprite = 'echo';
    line = '"You used to be better than this."';
  } else {
    kind = 'fight';
    name = chapter === 0 ? 'Ash Wisp' : 'Fog Wisp';
    sprite = 'wisp';
  }
  return build(g, chapter, i, kind, name, sprite, line);
}

function build(g: number, chapter: number, i: number, kind: StopKind, name: string, sprite: FoeSprite, line?: string): Stop {
  // Enemies grow with the road, never with you: training is what makes a stop easier.
  const scale = 1 + g * 0.1;
  const hp = Math.round(BASE_HP[kind] * scale);
  const moves = PATTERNS[kind].map((m) => ({ ...m, dmg: Math.round(m.dmg * (1 + g * 0.07)) }));
  return { g, chapter, i, kind, name, sprite, hp, moves, line };
}

export function chapterStops(chapter: number): Stop[] {
  const start = chapterStart(chapter);
  return Array.from({ length: CHAPTERS[chapter].sessions }, (_, i) => stopAt(start + i)!);
}

export type StopStatus = 'cleared' | 'next' | 'lit' | 'dark' | 'fog';

export interface RoadState {
  /** Stops lit by real sessions. */
  lit: number;
  /** Stops cleared by playing. */
  cleared: number;
  /** Next stop to play, or null when the road is done or a max test blocks it. */
  next: Stop | null;
  nextInDark: boolean;
  blockedByTest: boolean;
}

export function roadState(state: GameState): RoadState {
  const lit = state.sessions.length;
  const cleared = clearedOf(state);
  const candidate = stopAt(cleared);
  // A chapter that needs a max test holds its final blow until the test is logged.
  const blockedByTest =
    !!candidate && candidate.i === CHAPTERS[candidate.chapter].sessions - 1 && state.tests.length < CHAPTERS[candidate.chapter].tests;
  // The very first stop always needs one real session: no sneaking into the dark before you start.
  const playable = !!candidate && !blockedByTest && cleared <= lit && lit > 0;
  return { lit, cleared, next: playable ? candidate : null, nextInDark: playable && cleared === lit, blockedByTest };
}

export function statusOf(stop: Stop, road: RoadState): StopStatus {
  if (stop.g < road.cleared) return 'cleared';
  if (road.next && stop.g === road.next.g) return road.nextInDark ? 'dark' : 'next';
  if (stop.g < road.lit) return 'lit';
  return 'fog';
}

// ---------- the fight's numbers ----------

export interface Fighter {
  hp: number;
  dmg: number;
  /** Guard timing window in ms (Good); Perfect is a third of it. */
  guard: number;
  heal: boolean;
  emberStrike: boolean;
  shield: number;
  darkPenalty: number;
}

/** Your stats come only from training: level from sessions, sword from Push, armor from Pull, shield from Core. */
export function fighterOf(state: GameState): Fighter {
  const level = levelInfo(totalXp(state)).level;
  const gear = gearOf(state);
  const ember = emberStage(state.sessions.length).index;
  return {
    hp: 30 + level * 4 + gear.armor.tier * 5,
    dmg: 5 + gear.weapon.tier + Math.floor(level / 2),
    guard: 150 + gear.shield.tier * 15 + (ember >= 1 ? 40 : 0),
    heal: true,
    emberStrike: ember >= 2,
    shield: ember >= 3 ? 8 : 0,
    darkPenalty: ember >= 4 ? DARK_PENALTY / 2 : DARK_PENALTY,
  };
}

/** A stop as you meet it: in the dark it hits harder and lasts longer. */
export function foeFor(stop: Stop, dark: boolean, penalty: number) {
  const m = dark ? 1 + penalty : 1;
  return { hp: Math.round(stop.hp * m), moves: stop.moves.map((mv) => ({ ...mv, dmg: Math.round(mv.dmg * m) })) };
}
