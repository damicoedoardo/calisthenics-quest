import { finishSession, initialState, levelInfo, todaysQuest, totalXp, type Checkin, type GameState, type Letter, type Rir } from '@/lib/game';
import { recordRun, zoneDue, zoneStatus, ZONES } from '@/lib/fog';
import { giveSp, SP_FLOOR, spAfterRun } from '@/lib/sp';
import { dayKey, daysApart, isRestDay } from '@/lib/days';
import { seeded } from '@/lib/random';
import { MAX_SCENES_AT_ONCE, sawScene, sceneMoment, scenesToPlay, renderLines, speakerName, storyState, storyWords } from '@/story/engine';
import { CALLBACKS } from '@/story/daily/flame-lines';
import { runKind, runLine, afterWorkoutLine, canSitByFire, fireLine, marginNote, restTruth, todayMoment, todayPage, updateTodayPage, withTodayPage } from '@/story/daily';
import { DEFAULT_FLAME_NAME, flameStage } from '@/story/flame';
import { STARTER_LOOKS } from '@/sprites/characters/hero';
import type { ClassId } from '@/lib/gear';
import { pointsFree, spendEvenly, spendPoint } from '@/lib/stats';
import type { Line, Moment, Scene } from '@/story/types';

/* The season simulator: months of FORMA in a second, with no screen. A kind of player trains on
   their own schedule, and the real game rules (workouts, story, flame, Fog, Book of Days) run day
   by day. Everything the player would see goes into a timeline, and anything that looks wrong goes
   into `problems`. Run it with `pnpm sim`; the timelines land in sim-out/. */

export interface PlayerKind {
  id: string;
  /** Who this is, in a few words. */
  about: string;
  /** Trains on day `d` (0 is the first day after the opening). */
  trains: (d: number, rng: () => number) => boolean;
  /** Opens the app on a day without training. */
  visits?: (d: number, rng: () => number) => boolean;
  /** Picks Rough on Today (a short workout). */
  rough?: (d: number, rng: () => number) => boolean;
  /** Hour of the day they open the app. */
  hour?: number;
  sex?: 'm' | 'f';
  letter?: Letter;
  /** Sits by the fire on rest days. */
  sitsByFire?: boolean;
  /** Plays the Fog, and beats each boss on this try (0 never plays). */
  bossOnTry?: number;
  /** How they spend stat points after each workout: spread over the four (the default), all on Damage, or never. */
  spends?: 'even' | 'damage' | 'never';
  /** Names the flame (empty skips and keeps the default). */
  flame?: string;
  /** Which choice they pick in heart moments: 'first', 'write', or 'skip'. */
  answers?: 'first' | 'write' | 'skip';
  class?: ClassId;
}

export type EventKind = 'start' | 'workout' | 'scene' | 'ask' | 'flame' | 'chapter' | 'zone' | 'boss' | 'level' | 'better' | 'day' | 'rest' | 'problem';

export interface SimEvent {
  day: number;
  date: string;
  kind: EventKind;
  text: string;
}

export interface Season {
  player: PlayerKind;
  events: SimEvent[];
  problems: string[];
  state: GameState;
  /** Scene ids that played, in order. */
  played: string[];
  /** How many times each kind of day came up on Today. */
  moments: Partial<Record<Moment, number>>;
  /** The player as each Fog zone opens, and some workouts later (see laterBy): what the Fog balance bot plays with. */
  snapshots: { label: string; state: GameState }[];
}

/**
 * How many workouts after a zone opens its "later" snapshot is taken. The last two zones open when
 * each stat point is worth less (points fall off as a stat fills), so six workouts there changes
 * little; about six weeks of steady training does.
 */
export const laterBy = (zone: number) => (zone >= 4 ? 18 : 6);

const FULL_LETTER: Letter = { why: 'I want to feel strong again', want: 'run a whole 10 km', forWho: 'my little brother', remind: 'I already did this once.' };

/** Text a player sees with a {word} still in it, or a name that came out empty. */
function broken(text: string): boolean {
  return /\{\w+\}|undefined|null|NaN|\s,|\s\.(?!\.)/.test(text) || !text.trim();
}

/** A player who has just finished the opening. */
function afterOpening(kind: PlayerKind): GameState {
  const s = initialState();
  return {
    ...s,
    profile: { ...s.profile, onboarded: true, look: STARTER_LOOKS[kind.sex ?? 'm'], letter: kind.letter ?? FULL_LETTER, voice: "You're not enough." },
  };
}

/** One workout, every set at its target, done the way the player feels today. */
function train(state: GameState, now: Date, checkin: Checkin, rng: () => number): GameState | null {
  const quest = todaysQuest(state, checkin);
  const sets: Record<string, { reps: number; rir: Rir }[]> = {};
  for (const q of quest) {
    // Mostly just right, sometimes a hard day.
    const rir: Rir = rng() < 0.15 ? '0-1' : '2-3';
    sets[q.id] = Array.from({ length: q.sets }, () => ({ reps: q.reps, rir }));
  }
  const draft = { startedAt: now.toISOString(), checkin, sets };
  return finishSession({ ...state, draft }, now)?.state ?? null;
}

export function playSeason(kind: PlayerKind, days = 200, start = new Date(2026, 10, 2), seed = 7): Season {
  const rng = seeded(seed);
  const events: SimEvent[] = [];
  const problems: string[] = [];
  const played: string[] = [];
  const moments: Season['moments'] = {};
  let state = afterOpening(kind);
  let day = 0;
  let now = new Date(start);
  const tries: Record<number, number> = {};
  const snapshots: Season['snapshots'] = [];
  const openedAt: Record<number, number> = {};

  const note = (k: EventKind, text: string) => {
    events.push({ day, date: dayKey(now), kind: k, text });
    if (k === 'problem') problems.push(`day ${day} (${dayKey(now)}): ${text}`);
  };

  const check = (where: string, text: string) => {
    if (broken(text)) note('problem', `${where} reads "${text}"`);
    if (!state.profile.flame && text.includes(DEFAULT_FLAME_NAME)) note('problem', `${where} calls the flame "${DEFAULT_FLAME_NAME}" before it has a name: "${text}"`);
  };

  const checkLines = (scene: Scene, lines: Line[]) => {
    const words = storyWords(state);
    for (const l of renderLines(lines, words)) {
      check(`scene ${scene.id}`, l.text);
      // The name tag reads "A spark" until the flame is named.
      const tag = l.who === 'flame' && !state.profile.flame ? 'A spark' : speakerName(l.who, words);
      if (l.who !== 'narrator' && l.who !== 'you') check(`name tag in ${scene.id}`, tag);
    }
  };

  /** Scenes played at each story moment, to check none ever gets more than the cap. */
  const perMoment = new Map<string, number>();
  /** Plays every scene that's due, like the app does when you're back on the main screen. */
  const playScenes = (when: string) => {
    let count = 0;
    for (let guard = 0; guard < 20; guard++) {
      const scene = scenesToPlay(state, now)[0];
      if (!scene) break;
      count++;
      const moment = sceneMoment(state, now);
      perMoment.set(moment, (perMoment.get(moment) ?? 0) + 1);
      if (perMoment.get(moment)! > MAX_SCENES_AT_ONCE) note('problem', `more than ${MAX_SCENES_AT_ONCE} scenes at one moment (${scene.id})`);
      played.push(scene.id);
      checkLines(scene, scene.lines);
      note('scene', `${scene.id} (${when})`);
      const seen = sawScene(state, scene.id, now).seenScenes;
      const mark = sawScene(state, scene.id, now).sceneMark;
      const ask = scene.ask;
      if (ask?.kind === 'name') {
        const name = kind.flame || DEFAULT_FLAME_NAME;
        note('ask', `names the flame ${name}`);
        state = { ...state, sceneMark: mark, seenScenes: seen, profile: { ...state.profile, flame: name } };
        checkLines(scene, ask.after);
      } else if (ask?.kind === 'choice') {
        const how = kind.answers ?? 'first';
        // Someone who writes their own answers still has to pick one when there's nothing to write in.
        const writes = how === 'write' && !!ask.write;
        const choice = how === 'skip' || writes ? undefined : ask.choices[0];
        const value = writes ? 'my own words here' : (choice?.value ?? '');
        note('ask', `${ask.id}: ${how === 'skip' ? 'skipped' : `"${value || '(no answer)'}"`}`);
        state = { ...state, sceneMark: mark, seenScenes: seen, answers: how === 'skip' ? state.answers : { ...state.answers, [ask.id]: value } };
        const after = how === 'skip' ? undefined : (choice?.after ?? ask.after);
        if (after) checkLines(scene, after);
      } else if (ask?.kind === 'letter') {
        note('ask', 'writes the letter');
        state = { ...state, sceneMark: mark, seenScenes: seen, profile: { ...state.profile, letter: { why: 'I miss it', want: 'run again', forWho: 'me', remind: 'it gets easier' } } };
        checkLines(scene, ask.after);
      } else if (ask?.kind === 'class') {
        if (state.profile.classId) note('problem', `${scene.id} asks for a class, but one was already picked`);
        const id = kind.class ?? 'warrior';
        note('ask', `picks the ${id} class`);
        state = { ...state, sceneMark: mark, seenScenes: seen, profile: { ...state.profile, classId: id } };
      } else if (ask?.kind === 'sp') {
        note('ask', `gets SP ${ask.n ?? 1}`);
        state = giveSp({ ...state, sceneMark: mark, seenScenes: seen }, ask.n ?? 1);
      } else {
        state = { ...state, sceneMark: mark, seenScenes: seen };
      }
    }
    // A chapter's ending and the next one's start make two; more than three is a pile-up.
    if (count > 3) note('problem', `${count} scenes in a row ${when}`);
  };

  /** Today's page, line and quote, like opening the app. */
  const open = () => {
    const fresh = !todayPage(state, now);
    const quotesBefore = (state.days ?? []).filter((p) => p.day !== dayKey(now) && daysApart(new Date(`${p.day}T12:00:00`), now) < 21).map((p) => p.quote.text);
    state = withTodayPage(state, now);
    const page = todayPage(state, now)!;
    const moment = todayMoment(state, now);
    moments[moment] = (moments[moment] ?? 0) + 1;
    check('flame line on Today', page.line);
    check('quote author', page.quote.by);
    if (fresh && quotesBefore.includes(page.quote.text)) note('problem', `quote "${page.quote.text}" came back within 3 weeks`);
    const callback = CALLBACKS.find((c) => c.text === page.line);
    if (callback && fresh) {
      if ((state.days ?? []).some((p) => p.day !== dayKey(now) && p.line === callback.text)) note('problem', `follow-up after ${callback.after} said twice`);
      note('day', `Today: follow-up to ${callback.after} ("${page.line}")`);
    } else if (['back', 'missed', 'smoky', 'best', 'rough'].includes(moment)) note('day', `Today: ${moment} ("${page.line}")`);
    if (isRestDay(state, now)) {
      check('rest card', restTruth(now));
      if (kind.sitsByFire && canSitByFire(state, now) && !page.fire) {
        state = updateTodayPage(state, now, { fire: true });
        check('fire line', fireLine(state, now));
        note('rest', 'sits by the fire for a minute');
      }
    }
  };

  /** Plays the open Fog zone; the boss falls on the player's lucky try. */
  const fog = () => {
    // Every kind walks into the Fog now and then: once the SP is given, deep enough for its trial.
    if (!kind.bossOnTry) {
      if (state.sp) state = spAfterRun(state, { floor: SP_FLOOR });
      return;
    }
    // A model player meets each zone at the workout it is built for (zoneDue), though a strong one
    // can go in sooner.
    const zone = ZONES.find((z) => zoneStatus(state, z).state === 'open' && zoneDue(state, z));
    if (!zone) return;
    tries[zone.id] = (tries[zone.id] ?? 0) + 1;
    const won = tries[zone.id] >= kind.bossOnTry;
    const floor = won ? 10 : 3 + (tries[zone.id] % 5);
    state = spAfterRun(recordRun(state, { zone: zone.id, won, seconds: won ? 260 : 120, kills: 80, level: 8, floor, room: 2 }, now), { floor });
    // Back on Today, the flame talks about the run.
    const said = runLine(state, now);
    check('flame line after a run', said ?? '');
    note('day', `after the run (${runKind(state, now)}): "${said}"`);
    if (won) note('boss', `beats ${zone.bossName} in ${zone.name} (try ${tries[zone.id]})`);
  };

  const snapshot = () => ({
    chapter: storyState(state),
    stage: flameStage(state.sessions.length).id,
    level: levelInfo(totalXp(state)).level,
    open: ZONES.filter((z) => zoneStatus(state, z).state === 'open' && zoneDue(state, z)).map((z) => z.id),
  });

  /** Stat points go where this kind of player puts them. */
  const spend = () => {
    if (kind.spends === 'never') return;
    state = kind.spends === 'damage' ? spendPoint(state, 'damage', pointsFree(state)) : spendEvenly(state);
  };

  note('start', `${kind.about}. Starts after the opening.`);
  spend();

  // The first zone is open from the start.
  openedAt[0] = 0;
  snapshots.push({ label: 'zone0-open', state });
  for (day = 0; day < days; day++) {
    now = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day, kind.hour ?? 18, 30);
    const before = snapshot();
    const trains = kind.trains(day, rng);
    if (!trains && !kind.visits?.(day, rng)) continue;
    open();
    playScenes('on opening the app');
    fog();
    if (trains) {
      const checkin: Checkin = kind.rough?.(day, rng) ? 'rough' : 'normal';
      const next = train(state, now, checkin, rng);
      if (!next) note('problem', 'a workout could not be saved');
      else {
        const s = next.sessions[next.sessions.length - 1];
        state = next;
        note('workout', `workout ${state.sessions.length}${s.kind === 'mini' ? ' (short)' : ''}, +${s.xp} XP`);
        const says = afterWorkoutLine(state);
        check('after-workout line', says);
        note('day', `after the workout: "${says}"`);
        if (s.better) note('better', 'a set beat last time');
        spend();
        // About 40 minutes later, back on Today.
        now = new Date(now.getTime() + 40 * 60_000);
        open();
        playScenes('after the workout');
      }
    }
    const after = snapshot();
    if (after.chapter.index !== before.chapter.index) note('chapter', after.chapter.chapter ? `chapter ${after.chapter.chapter.n}: ${after.chapter.chapter.name}` : 'the story is finished');
    if (after.stage !== before.stage) note('flame', `the flame grows: ${after.stage}`);
    if (after.level !== before.level) note('level', `level ${after.level}`);
    for (const id of after.open.filter((z) => !before.open.includes(z))) {
      note('zone', `Fog zone opens: ${ZONES[id].name}`);
      openedAt[id] = state.sessions.length;
      snapshots.push({ label: `zone${id}-open`, state });
    }
    // SIM_EVERY=1 also keeps the player after every workout of the first two zones (zone0-w03...),
    // to see how win rates climb between a zone opening and its "later" point.
    if (trains && process.env.SIM_EVERY && state.sessions.length <= 26) {
      const at = Math.max(...Object.keys(openedAt).map(Number));
      const w = String(state.sessions.length).padStart(2, '0');
      if (!snapshots.some((x) => x.label === `zone${at}-w${w}`)) snapshots.push({ label: `zone${at}-w${w}`, state });
    }
    for (const [id, n] of Object.entries(openedAt)) {
      if (state.sessions.length >= n + laterBy(Number(id)) && !snapshots.some((x) => x.label === `zone${id}-later`)) snapshots.push({ label: `zone${id}-later`, state });
    }
  }
  for (const page of state.days ?? []) {
    const m = marginNote(state, page);
    if (m) check(`margin note on ${page.day}`, m);
  }
  return { player: kind, events, problems, state, played, moments, snapshots };
}

/** A season as a timeline to read, a line per thing that happened, grouped by week. */
export function formatSeason(s: Season): string {
  const out = [`# ${s.player.id}: ${s.player.about}`, ''];
  let week = -1;
  for (const e of s.events) {
    const w = Math.floor(e.day / 7) + 1;
    if (w !== week) {
      week = w;
      out.push('', `## Week ${w}`);
    }
    out.push(`- ${e.date} · ${e.kind}: ${e.text}`);
  }
  const st = storyState(s.state);
  out.push(
    '',
    '## End',
    `- ${s.state.sessions.length} workouts, level ${levelInfo(totalXp(s.state)).level}, ${pointsFree(s.state)} stat points unspent`,
    `- story: ${st.finished ? 'finished' : `chapter ${st.chapter?.n}`}, ${s.played.length} scenes`,
    `- Fog bosses beaten: ${s.state.fog?.cleared ?? 0}`,
    `- days on Today: ${Object.entries(s.moments)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ')}`,
    '',
    `## Problems (${s.problems.length})`,
    ...(s.problems.length ? s.problems.map((p) => `- ${p}`) : ['- none']),
  );
  return out.join('\n');
}
