import type { EnemyId } from '@/components/Characters';
import { daysSinceLastSession, weekKey, WEEKLY_GOAL, type GameState, type Letter } from './game';

export type Speaker = 'narrator' | 'wanderer' | 'ember' | 'echo' | 'doubt' | 'mira' | 'bestself' | 'you';

export interface Line {
  who: Speaker;
  text: string;
  /** Only shown when this part of the letter was written. */
  needs?: keyof Letter;
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
  { n: 4, name: 'The Fog', enemy: 'Doubt', enemyId: 'doubt', sessions: 12, tests: 1 },
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

/** Chapters open with sessions, not strength: every session takes one heart off the enemy. */
export function storyState(state: GameState): StoryState {
  const sessions = state.sessions.length;
  const tests = state.tests.length;
  let start = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i];
    const end = start + ch.sessions;
    if (sessions >= end && tests >= ch.tests) {
      start = end;
      continue;
    }
    return {
      index: i,
      chapter: ch,
      hearts: ch.sessions,
      heartsLeft: Math.max(0, end - sessions),
      awaitingTest: sessions >= end && tests < ch.tests,
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
}

function hadPerfectWeek(state: GameState): boolean {
  const counts = new Map<string, number>();
  for (const s of state.sessions) {
    const k = weekKey(new Date(s.date));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.values()].some((c) => c >= WEEKLY_GOAL);
}

const STORY: { id: string; when: (s: GameState, st: StoryState) => boolean; lines: Line[]; action?: Scene['action'] }[] = [
  {
    id: 'first-quest',
    when: (s) => s.sessions.length >= 1,
    lines: [
      { who: 'ember', text: "You did it. One page written." },
      { who: 'ember', text: "I feel... warmer? Is that weird? That's weird." },
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
      { who: 'narrator', text: "A golden figure blocks the road. He has your face, two years younger." },
      { who: 'echo', text: "Look at you. Out of breath already? I did fifty push-ups before breakfast." },
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
      { who: 'narrator', text: "The fog rolls in. A voice speaks. It sounds exactly like yours." },
      { who: 'doubt', text: "Who are you kidding? You always quit. The gym membership. The running app." },
      { who: 'doubt', text: "This will be the same. Save yourself the embarrassment." },
      { who: 'ember', text: "Don't listen to him. He's loud. That doesn't make him right." },
    ],
  },
  {
    id: 'ch4-victory',
    when: (_, st) => st.index > 3,
    lines: [
      { who: 'narrator', text: "Surrounded by fog, you hear footsteps. Golden ones." },
      { who: 'echo', text: "I said cruel things. I was scared that if you got strong again, you'd forget me." },
      { who: 'echo', text: "I'm not your goal. I'm your proof. You did it once. You can do it again." },
      { who: 'narrator', text: "The Echo turns into light and settles into your armor." },
      { who: 'doubt', text: "I'll be back." },
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
      { who: 'narrator', text: "At the top, the Wanderer lowers his hood." },
      { who: 'narrator', text: "He has your face. Older. Stronger. The same scar on the same hand." },
      { who: 'bestself', text: "Hi. I've been waiting a long time to meet you." },
      { who: 'bestself', text: "I didn't come back to save you. I couldn't. I could only walk next to you." },
      { who: 'bestself', text: "Every rep you did, I became a little more real." },
      { who: 'bestself', text: "On the first day you wrote: \"I'm starting again because {why}.\"", needs: 'why' },
      { who: 'bestself', text: "You wanted to be able to {want}. Look at your hands.", needs: 'want' },
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
  const out: Scene[] = STORY.filter((s) => !seen.has(s.id) && s.when(state, st)).map(({ id, lines, action }) => ({ id, lines, action }));

  const gap = daysSinceLastSession(state, now);
  const returnId = `return-${state.sessions.length}`;
  if (gap !== null && gap >= 8 && !seen.has(returnId)) {
    out.unshift({
      id: returnId,
      lines: [
        { who: 'ember', text: "I waited. I knew you'd come back." },
        { who: 'wanderer', text: "You're here. That's the only part that matters. We start light today." },
        { who: 'wanderer', text: "You told me once: \"{remind}.\" Do you still mean it?", needs: 'remind' },
      ],
    });
  }
  return out;
}

/** Fill in the player's own words and drop lines whose part of the letter is empty. */
export function renderLines(lines: Line[], letter: Letter): Line[] {
  return lines
    .filter((l) => !l.needs || letter[l.needs].trim())
    .map((l) => ({ ...l, text: l.text.replace(/\{(why|want|remind)\}/g, (_, k: keyof Letter) => letter[k].trim().replace(/[.!]+$/, '')) }));
}

export const SPEAKER_NAMES: Record<Speaker, string> = {
  narrator: '',
  wanderer: 'The Wanderer',
  ember: 'Ember',
  echo: 'The Echo',
  doubt: 'Doubt',
  mira: 'Mira',
  bestself: 'Your Best Self',
  you: 'You',
};
