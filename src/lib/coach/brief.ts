import type { Family } from '@/exercises/coaching';
import type { Checkin, GameState } from '../game';
import { liveNotes } from './notes';
import { patternOf } from './options';
import { PATTERNS } from './types';

/* The coach brief: everything the coach needs to know about you, as one short page of plain text,
   built by code from the save every time it is asked (profile, notes, and the log). The LLM reads
   this; it never reads or writes the save itself. Kept to about 2k tokens. */

const day = (iso: string) => iso.slice(0, 10);
const ago = (iso: string, now: Date) => Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);

export function coachBrief(state: GameState, now: Date, checkin: Checkin = 'normal'): string {
  const p = state.coach?.profile;
  const lines: string[] = [];
  lines.push(`Today: ${day(now.toISOString())}. Check-in: ${checkin}.`);
  if (p) {
    lines.push(`Modes: ${p.modes.join(', ')}. Goal: ${p.goal}. ${p.days} days a week, ${p.minutes} min. Gear: ${p.gear.join(', ')}. Experience: ${p.experience}.`);
    lines.push(`Levels (1-5): ${PATTERNS.map((k) => `${k} ${p.levels[k].level}${p.levels[k].source === 'setup' ? ' (guess)' : ''}`).join(', ')}.`);
    if (p.avoid.length) lines.push(`Spare: ${p.avoid.map((a) => a.text ?? a.area).join(', ')}.`);
  } else lines.push('No setup yet.');

  const notes = liveNotes(state.coach, now);
  if (notes.length) {
    lines.push('', 'Notes:');
    for (const n of notes) lines.push(`- [${n.id}] ${n.type}: ${n.text} (${day(n.at)}, ${n.by})`);
  }

  const recent = state.sessions.slice(-10);
  if (recent.length) {
    lines.push('', 'Last workouts (oldest first):');
    for (const s of recent) {
      const moves = s.entries.map((e) => `${e.name ?? e.exerciseId} ${e.sets.map((x) => `${x.reps}${x.kg ? `@${x.kg}kg` : ''}`).join('/')}`).join('; ');
      const extra = [s.felt && `felt ${s.felt}`, s.comment && `"${s.comment}"`, s.skipped?.length && `skipped ${s.skipped.length}`, s.changed?.length && `changed ${s.changed.map((c) => `${c.from}->${c.to} (${c.how})`).join(', ')}`].filter(Boolean);
      lines.push(`- ${day(s.date)} ${s.mode ?? 'gym'} ${s.kind}: ${moves}${extra.length ? `. ${extra.join(', ')}` : ''}`);
    }
  }

  // What each part of you did lately, so the coach rests what was just worked.
  const since: string[] = [];
  for (const pattern of PATTERNS) {
    const last = state.sessions.findLast((s) => s.entries.some((e) => e.family && patternOf(e.family as Family) === pattern));
    since.push(`${pattern} ${last ? `${ago(last.date, now)}d ago` : 'never'}`);
  }
  lines.push('', `Last trained: ${since.join(', ')}.`);
  const week = state.sessions.filter((s) => ago(s.date, now) < 7);
  lines.push(`This week: ${week.length} workouts.`);
  return lines.join('\n');
}
