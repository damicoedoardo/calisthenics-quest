import { MAX_NOTES } from '@/balance';
import type { CoachNote, CoachState } from './types';

/* Coach notes: the flexible part of the coach's memory. Short, typed, dated, and few: past
   MAX_NOTES the oldest goes first, but a note about pain stays until you or the coach remove it. */

export function addNote(coach: CoachState, note: Pick<CoachNote, 'type' | 'text' | 'by'> & { until?: string }, now: Date, id: () => string): CoachState {
  const text = note.text.trim().slice(0, 200);
  if (!text) return coach;
  let notes = [...coach.notes, { ...note, text, id: id(), at: now.toISOString() }];
  while (notes.length > MAX_NOTES) {
    const drop = notes.findIndex((n) => n.type !== 'pain');
    notes = notes.filter((_, i) => i !== (drop === -1 ? 0 : drop));
  }
  return { ...coach, notes };
}

export function removeNote(coach: CoachState, id: string): CoachState {
  return { ...coach, notes: coach.notes.filter((n) => n.id !== id) };
}

/** The notes that still hold today. */
export function liveNotes(coach: CoachState | undefined, now: Date): CoachNote[] {
  return (coach?.notes ?? []).filter((n) => !n.until || new Date(n.until).getTime() > now.getTime());
}
