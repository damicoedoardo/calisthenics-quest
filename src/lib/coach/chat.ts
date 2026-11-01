import type { GameState } from '../game';
import { coachBrief } from './brief';
import { runTool, type ToolContext } from './tools';
import type { ChatMessage, CoachState, ToolCall } from './types';

/* The chat with the coach: the messages the LLM reads (kept in the save, the recent part only),
   one turn of the talk (ask the model, run the tools it calls here, ask again with their results,
   until it has answered), and what the screen shows of it. */

/** Messages kept: about the last ten exchanges. Older ones are in the coach's notes and the log. */
export const CHAT_KEEP = 40;
/** Model calls in one turn: enough to search, build and fix a workout, never a loop. */
export const MAX_ROUNDS = 6;
/** What the chat starts with when the coach speaks first; never shown. */
export const OPENER = '(The player opened the coach chat.)';

/** What the app asks the coach when a week is due for planning on its own (`aiPlanDue`). Said in
    the chat as the player's turn, never shown; the coach's answer is. */
export const planAsk = (which: 'this' | 'next') =>
  `(The app: ${which === 'next' ? "this week's last workout is done" : 'a new week starts and nothing of it is done yet'}. The week the player sees for ${which} week is the app's plain draft. Read workout_log, plan ${which} week yourself from how training really went, and save it with set_week week "${which}". Then tell the player in two short lines what you saw and what you changed. No questions this time; they can answer if they want.)`;
const hidden = (text: string) => text === OPENER || text.startsWith('(The app: ');

export interface Answer {
  message: Extract<ChatMessage, { role: 'assistant' }>;
  finish_reason: string;
}

/** Ask the model: the brief and the chat in, its next message out. */
export type Ask = (brief: string, messages: ChatMessage[]) => Promise<Answer>;

/** The recent part of the chat, starting at something the player said. */
export function trimChat(chat: ChatMessage[]): ChatMessage[] {
  const out = chat.slice(-CHAT_KEEP);
  const first = out.findIndex((m) => m.role === 'user');
  if (first !== -1) return out.slice(first);
  // One long turn of tool calls: keep it whole from what the player said, so it is never lost.
  const last = chat.findLastIndex((m) => m.role === 'user');
  return last === -1 ? [] : chat.slice(last);
}

const withChat = (s: GameState, chat: ChatMessage[], patch: Partial<CoachState> = {}): GameState => ({
  ...s,
  coach: { notes: [], ...s.coach, ...patch, chat: trimChat(chat) },
});

/** What the flame is doing, said while it works: one line per tool it runs. */
export const STEP_LABEL: Record<string, string> = {
  find_exercises: 'Looked through the exercises',
  draft_week: 'Sketched a week',
  show_week: 'Read your week',
  workout_log: 'Read your workouts',
  set_week: 'Wrote your week',
  set_workout: 'Built the workout',
  move_workout: 'Moved a workout',
  rest_day: 'Made a rest day',
  save_profile: 'Remembered you',
  add_note: 'Made a note',
  remove_note: 'Let a note go',
  training_guide: 'Checked the playbook',
  game_guide: 'Read the guide',
};

/** One turn: the player's words (or none, for the coach to open), then the coach until it answers.
    `onStep` hears each tool it ran (STEP_LABEL), so the screen can show it working. */
export async function coachTurn(opts: { text?: string; get: () => GameState; set: (fn: (s: GameState) => GameState) => void; ask: Ask; ctx: () => ToolContext; checkin?: Parameters<typeof coachBrief>[2]; onStep?: (label: string) => void }): Promise<void> {
  const { get, set, ask } = opts;
  const text = opts.text?.trim();
  if (text) set((s) => withChat(s, [...(s.coach?.chat ?? []), { role: 'user', content: text.slice(0, 1000) }], { replies: [] }));
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const state = get();
    const chat = state.coach?.chat ?? [];
    // The model only answers a player: an empty chat opens with a hello it never sees as typed.
    const messages: ChatMessage[] = chat.length ? chat : [{ role: 'user', content: OPENER }];
    const { message } = await ask(coachBrief(state, new Date(), opts.checkin), messages);
    const calls = message.tool_calls ?? [];
    // Tools run on the latest save, and only change the coach's part of it.
    let after = get();
    const results: ChatMessage[] = [];
    let waits = calls.length > 0;
    for (const c of calls) {
      const label = STEP_LABEL[c.function.name];
      if (label) opts.onStep?.(label);
      const run = runTool(after, c.function.name, c.function.arguments, opts.ctx());
      after = run.state;
      waits &&= !!run.waits;
      results.push({ role: 'tool', tool_call_id: c.id, content: run.result });
    }
    const coach = after.coach;
    set((s) => withChat({ ...s, coach: coach ?? s.coach }, [...messages, message, ...results]));
    if (!calls.length || waits) return;
  }
}

/** A line of the chat as the screen shows it. */
export type Shown = { who: 'coach' | 'you'; text: string; key: string } | { who: 'workout'; key: string };

const SHOWN_TOOLS = new Set(['set_workout', 'set_week', 'move_workout', 'rest_day']);

export function shownChat(chat: ChatMessage[] | undefined): Shown[] {
  const out: Shown[] = [];
  (chat ?? []).forEach((m, i) => {
    if (m.role === 'user' && !hidden(m.content)) out.push({ who: 'you', text: m.content, key: `u${i}` });
    else if (m.role === 'assistant') {
      if (m.content.trim()) out.push({ who: 'coach', text: m.content.trim(), key: `a${i}` });
      if ((m.tool_calls ?? []).some((c: ToolCall) => SHOWN_TOOLS.has(c.function.name))) out.push({ who: 'workout', key: `w${i}` });
    }
  });
  return out;
}
