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

/** One turn: the player's words (or none, for the coach to open), then the coach until it answers. */
export async function coachTurn(opts: { text?: string; get: () => GameState; set: (fn: (s: GameState) => GameState) => void; ask: Ask; ctx: () => ToolContext; checkin?: Parameters<typeof coachBrief>[2] }): Promise<void> {
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
    if (m.role === 'user' && m.content !== OPENER) out.push({ who: 'you', text: m.content, key: `u${i}` });
    else if (m.role === 'assistant') {
      if (m.content.trim()) out.push({ who: 'coach', text: m.content.trim(), key: `a${i}` });
      if ((m.tool_calls ?? []).some((c: ToolCall) => SHOWN_TOOLS.has(c.function.name))) out.push({ who: 'workout', key: `w${i}` });
    }
  });
  return out;
}
