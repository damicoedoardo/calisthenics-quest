import type { EnemyId } from '@/components/Characters';
import { daysSinceLastSession, weekKey, WEEKLY_GOAL, type GameState, type Letter } from './game';
import type { TrackId } from './music';

export type Speaker = 'narrator' | 'wanderer' | 'ember' | 'echo' | 'hollow' | 'mira' | 'bestself' | 'you';

/** The player's own words that the story can quote: the letter, the Hollow's line, and real numbers. */
export type Words = Letter & { voice: string; sessions: string };

export interface Line {
  who: Speaker;
  text: string;
  /** Only shown when this word was given (an empty letter line drops the story line). */
  needs?: keyof Words;
}

export interface Chapter {
  n: number;
  name: string;
  enemy: string;
  enemyId: EnemyId;
  /** Sessions needed to defeat this chapter's enemy. */
  sessions: number;
  /** Max tests that must exist (in total) before the chapter can end. */
  tests: number;
}

export const CHAPTERS: Chapter[] = [
  { n: 1, name: 'The Ashlands', enemy: 'Tomorrow', enemyId: 'slime', sessions: 6, tests: 0 },
  { n: 2, name: 'The Echo', enemy: 'The Mirror', enemyId: 'mirror', sessions: 9, tests: 1 },
  { n: 3, name: 'The Village of Almosts', enemy: 'The Plateau', enemyId: 'golem', sessions: 12, tests: 1 },
  { n: 4, name: 'The Fog', enemy: 'The Hollow', enemyId: 'hollow', sessions: 12, tests: 1 },
  { n: 5, name: 'Forma', enemy: 'The Summit', enemyId: 'summit', sessions: 9, tests: 2 },
];

export interface StoryState {
  /** Index into CHAPTERS of the chapter being played; CHAPTERS.length once the story is finished. */
  index: number;
  chapter: Chapter | null;
  hearts: number;
  heartsLeft: number;
  /** All sessions done, but the chapter's max test is still missing. */
  awaitingTest: boolean;
  finished: boolean;
}

/** Stops cleared on the road. Saves from before the road count chapters finished under the old rules. */
export function clearedOf(state: GameState): number {
  if (state.road !== undefined) return state.road;
  let start = 0;
  for (const ch of CHAPTERS) {
    const end = start + ch.sessions;
    if (state.sessions.length >= end && state.tests.length >= ch.tests) start = end;
    else break;
  }
  return start;
}

/**
 * Chapters end when you beat their boss on the road. Sessions light the road (one stop each),
 * playing clears it, so a chapter needs both training and a win. "Hearts" are the chapter's stops.
 */
export function storyState(state: GameState): StoryState {
  const cleared = clearedOf(state);
  const tests = state.tests.length;
  let start = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i];
    const end = start + ch.sessions;
    if (cleared >= end && tests >= ch.tests) {
      start = end;
      continue;
    }
    return {
      index: i,
      chapter: ch,
      hearts: ch.sessions,
      heartsLeft: Math.max(0, end - cleared),
      awaitingTest: cleared >= end - 1 && state.sessions.length >= end && tests < ch.tests,
      finished: false,
    };
  }
  return { index: CHAPTERS.length, chapter: null, hearts: 0, heartsLeft: 0, awaitingTest: false, finished: true };
}

export interface Scene {
  id: string;
  lines: Line[];
  /** Something the player does when the scene ends. */
  action?: 'choose-class';
  music?: TrackId;
}

function hadPerfectWeek(state: GameState): boolean {
  const counts = new Map<string, number>();
  for (const s of state.sessions) {
    const k = weekKey(new Date(s.date));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.values()].some((c) => c >= WEEKLY_GOAL);
}

const STORY: (Omit<Scene, 'lines'> & { when: (s: GameState, st: StoryState) => boolean; lines: Line[] })[] = [
  {
    id: 'first-quest',
    when: (s) => s.sessions.length >= 1,
    lines: [
      { who: 'ember', text: "You did it. One page written." },
      { who: 'ember', text: "I feel... warmer? Is that weird? That's weird." },
      { who: 'hollow', text: "One session. I've watched you do one session before." },
      { who: 'ember', text: "Not with me, you haven't. Shush." },
      { who: 'wanderer', text: "Two more this week. Not perfect. Present." },
    ],
  },
  {
    id: 'class-choice',
    when: (s) => s.sessions.length >= 3 && !s.profile.classId,
    lines: [
      { who: 'wanderer', text: "Three pages. You kept your word." },
      { who: 'wanderer', text: "I found these in the ash while you trained. They've been waiting longer than you have." },
      { who: 'wanderer', text: "Choose the one that feels like you. You'll still train everything. This is who you fight as." },
    ],
    action: 'choose-class',
  },
  {
    id: 'perfect-week',
    when: (s) => hadPerfectWeek(s),
    lines: [
      { who: 'ember', text: "Three for three! Look, I'm a real flame now." },
      { who: 'ember', text: "Okay, a candle. A brave candle." },
    ],
  },
  {
    id: 'ch1-victory',
    when: (_, st) => st.index > 0,
    lines: [
      { who: 'narrator', text: "Tomorrow splits one last time, and fades into the ash." },
      { who: 'wanderer', text: "You know what Tomorrow hates? Today." },
    ],
  },
  {
    id: 'ch2-intro',
    when: (_, st) => st.index >= 1,
    lines: [
      { who: 'narrator', text: "Chapter 2: The Echo." },
      { who: 'narrator', text: "A golden figure blocks the road. Your face, from the days you never missed." },
      { who: 'echo', text: "Look at you. Out of breath already? I never missed a day." },
      { who: 'wanderer', text: "He's not you. He's a photograph. Photographs don't train." },
    ],
  },
  {
    id: 'ch2-await-test',
    when: (_, st) => st.index === 1 && st.awaitingTest,
    lines: [
      { who: 'wanderer', text: "The Mirror only shows what you lost. Let's show it what you have." },
      { who: 'wanderer', text: "Take your max test on the Hero tab. Fresh, after a warm-up. We compare you to week one. Not to him." },
    ],
  },
  {
    id: 'ch2-victory',
    when: (_, st) => st.index > 1,
    lines: [
      { who: 'narrator', text: "The Mirror cracks. In the pieces you see your week one, and today." },
      { who: 'wanderer', text: "That's the only comparison that counts. You, last month. Not him, two years ago." },
    ],
  },
  {
    id: 'ch3-intro',
    when: (_, st) => st.index >= 2,
    lines: [
      { who: 'narrator', text: "Chapter 3: The Village of Almosts." },
      { who: 'narrator', text: "A village where the forges went cold. Full of people who stopped, like you did." },
      { who: 'mira', text: "Another one. Let me guess: you used to be good." },
      { who: 'mira', text: "Me too. Bring me effort. I'll make it into steel." },
    ],
  },
  {
    id: 'ch3-victory',
    when: (_, st) => st.index > 2,
    lines: [
      { who: 'mira', text: "Nobody remembers which hit broke the stone. The stone remembers every one." },
      { who: 'narrator', text: "Somewhere in the village, a cold forge lights up again." },
    ],
  },
  {
    id: 'ch4-intro',
    when: (_, st) => st.index >= 3,
    lines: [
      { who: 'narrator', text: "Chapter 4: The Fog." },
      { who: 'narrator', text: "The fog rolls in, thick and cold. In the middle of it, a shape you know. Your face, with empty eyes." },
      { who: 'hollow', text: "{voice}", needs: 'voice' },
      { who: 'hollow', text: "Remember me? You've been busy. {sessions} sessions. Cute." },
      { who: 'hollow', text: "You've started before. You always stop around here. It gets boring, you get tired, and you get smart about it." },
      { who: 'hollow', text: "Save yourself the embarrassment. Come back to the quiet." },
      { who: 'ember', text: "Don't listen to it. It's loud. That doesn't make it right." },
    ],
    music: 'hollow',
  },
  {
    id: 'ch4-victory',
    when: (_, st) => st.index > 3,
    lines: [
      { who: 'narrator', text: "Through the fog, you hear footsteps. Golden ones." },
      { who: 'echo', text: "I said cruel things. I was scared that if you got strong again, you'd forget me." },
      { who: 'echo', text: "I'm not your goal. I'm your proof. You did it once. You can do it again." },
      { who: 'narrator', text: "The Echo turns into light and settles into your armor." },
      { who: 'narrator', text: "The fog thins. The Hollow is still there. Smaller now." },
      { who: 'hollow', text: "You still hear me, don't you?" },
      { who: 'you', text: "Every day. I just stopped obeying you." },
      { who: 'hollow', text: "I'll be back." },
      { who: 'you', text: "I know. I'll be here." },
    ],
  },
  {
    id: 'ch5-intro',
    when: (_, st) => st.index >= 4,
    lines: [
      { who: 'narrator', text: "Chapter 5: Forma." },
      { who: 'wanderer', text: "The Summit. The last stretch." },
      { who: 'wanderer', text: "I'm getting lighter, you know. With every rep you do." },
    ],
  },
  {
    id: 'ch5-await-test',
    when: (_, st) => st.index === 4 && st.awaitingTest,
    lines: [{ who: 'wanderer', text: "One last test. Not to prove anything. Just to see how far you've come." }],
  },
  {
    id: 'finale',
    when: (_, st) => st.finished,
    lines: [
      { who: 'narrator', text: "Near the top, a small shadow sits alone on a rock. The Hollow. It's the size of a child now." },
      { who: 'hollow', text: "{voice}", needs: 'voice' },
      { who: 'you', text: "Maybe. I came anyway." },
      { who: 'narrator', text: "You hold out your hand. After a long moment, the shadow takes it." },
      { who: 'wanderer', text: "You didn't destroy it. Nobody does. You just stopped letting it walk in front of you." },
      { who: 'narrator', text: "At the top, the Wanderer lowers his hood." },
      { who: 'narrator', text: "He has your face. Older. Stronger. The same scar on the same hand." },
      { who: 'bestself', text: "Hi. I've been waiting a long time to meet you." },
      { who: 'bestself', text: "I didn't come back to save you. I couldn't. I could only walk next to you." },
      { who: 'bestself', text: "Every rep you did, I became a little more real." },
      { who: 'bestself', text: "On the first day you wrote: \"I'm starting again because {why}.\"", needs: 'why' },
      { who: 'bestself', text: "You wanted to be able to {want}. Look at your hands.", needs: 'want' },
      { who: 'bestself', text: "You said you were doing this for {forWho}. They got the best of you. So did you.", needs: 'forWho' },
      { who: 'bestself', text: "And you asked me: \"When I want to quit, remind me that {remind}.\"", needs: 'remind' },
      { who: 'bestself', text: "You never needed me to remind you. You remembered on your own." },
      { who: 'bestself', text: "This isn't an ending. Your best self isn't a place you arrive. It's a direction you keep facing." },
      { who: 'ember', text: "...So. Same time Monday?" },
    ],
  },
  {
    id: 'first-pullup',
    when: (s) => s.progress.pull > 3,
    lines: [{ who: 'echo', text: "...There it is. I remember that feeling. Now it's yours." }],
  },
];

/** Scenes whose moment has come and that the player has not seen yet, in story order. */
export function pendingScenes(state: GameState, now: Date): Scene[] {
  const st = storyState(state);
  const seen = new Set(state.seenScenes);
  const out: Scene[] = STORY.filter((s) => !seen.has(s.id) && s.when(state, st)).map(({ id, lines, action, music }) => ({ id, lines, action, music }));

  const gap = daysSinceLastSession(state, now);
  const returnId = `return-${state.sessions.length}`;
  if (gap !== null && gap >= 8 && !seen.has(returnId)) {
    out.unshift({
      id: returnId,
      lines: [
        { who: 'hollow', text: "See? I told you. You always..." },
        { who: 'ember', text: "...come back. You always come back. I waited." },
        { who: 'wanderer', text: "You're here. That's the only part that matters. We start light today." },
        { who: 'wanderer', text: "You told me once: \"{remind}.\" Do you still mean it?", needs: 'remind' },
      ],
    });
  }
  return out;
}

export function storyWords(state: GameState): Words {
  return { ...state.profile.letter, voice: state.profile.voice, sessions: String(state.sessions.length) };
}

/** Fill in the player's own words and drop lines whose word is missing. */
export function renderLines(lines: Line[], words: Words): Line[] {
  return lines
    .filter((l) => !l.needs || words[l.needs].trim())
    .map((l) => ({
      ...l,
      // The Hollow's line is said whole; letter parts sit inside sentences, so their end punctuation goes.
      text: l.text.replace(/\{(\w+)\}/g, (_, k: keyof Words) => (k === 'voice' ? words.voice.trim() : (words[k] ?? '').trim().replace(/[.!]+$/, ''))),
    }));
}

export const SPEAKER_NAMES: Record<Speaker, string> = {
  narrator: '',
  wanderer: 'The Wanderer',
  ember: 'Ember',
  echo: 'The Echo',
  hollow: 'The Hollow',
  mira: 'Mira',
  bestself: 'Your Best Self',
  you: 'You',
};
