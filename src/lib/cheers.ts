import type { GameState } from './game';
import { currentPlan } from './coach/week';

/* Cheers (pure): a short line one friend sends another, mostly while they work out. The api is
   backend/app/routes/cheers.py; sending is on the Friends tab, the pop-up in components/Cheers.tsx. */

/** Server limits (PER_DAY and LENGTH in backend/app/routes/cheers.py): keep the two the same. */
export const CHEER_LIMIT = { perDay: 20, length: 80 } as const;

/** Quick lines under the message box, with the friend's name in: a tap fills the box, to send as
    it is or make your own. */
export function quickCheers(name: string): string[] {
  const n = name.trim().split(/\s+/)[0] || '';
  const to = n ? `, ${n}` : '';
  return [`Push${to}!`, `Go${to}, one more set!`, `You've got this${to}!`, `Proud of you${to}!`];
}

/** A cheer as it arrives from a friend. */
export interface Cheer {
  id: string;
  from: string;
  from_name: string;
  text: string;
  at: string;
}

/** What a friend typed, as sent: one line, spaces tidied, cut to the limit. Empty means nothing to send. */
export const cleanCheer = (text: string) => text.split(/\s+/).filter(Boolean).join(' ').slice(0, CHEER_LIMIT.length);

/** What your friends see while you work out: the plan's name, or "A workout". */
export const trainingLabel = (state: GameState) => (currentPlan(state.coach)?.title ?? 'A workout').slice(0, 40);
