import type { Family } from '@/exercises/coaching';
import type { Checkin, GameState } from '../game';
import { liveNotes } from './notes';
import { restKept, weekText } from './week';
import { coachNudge } from './nudge';
import { goingLines } from './feedback';
import { storyState } from '@/story/engine';
import { CHAPTERS } from '@/story/chapters';
import { FLAME_STAGES, flameStage, fused } from '@/story/flame';
import { patternOf } from './options';
import { PATTERNS } from './types';

/* The coach brief: everything the coach needs to know about you, as one short page of plain text,
   built by code from the save every time it is asked (profile, notes, and the log). The LLM reads
   this; it never reads or writes the save itself. Kept to about 2k tokens. */

const day = (iso: string) => iso.slice(0, 10);
const FEEL = { '4+': 'e', '2-3': 'r', '0-1': 'h' } as const;
const ago = (iso: string, now: Date) => Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);

export function coachBrief(state: GameState, now: Date, checkin: Checkin = 'normal'): string {
  const p = state.coach?.profile;
  const lines: string[] = [];
  const flame = state.profile.flame?.trim() || 'Ember';
  lines.push(`You are ${flame}, the player's flame: the small fire that never stopped believing in them, now also their coach. An old fire: a little spooky, a little superior, and deeply on their side.${state.profile.name ? ` The player's name: ${state.profile.name}.` : ''}`);
  // Who the flame is right now: its form, and where the story is. It speaks from there.
  const form = flameStage(state.sessions.length);
  const story = storyState(state);
  // Only the next form: the ones after it are the story's to show.
  const next = FLAME_STAGES.find((f) => f.at > state.sessions.length);
  lines.push(`Your form now: ${form.name} (you grow with their workouts${next ? `; next, ${next.name} at ${next.at}` : ''}).${fused(state.seenScenes) ? ' You have fused with the player: you burn inside them now.' : ''}`);
  lines.push(
    story.chapter
      ? `The story: chapter ${story.chapter.n} of ${CHAPTERS.length}, ${story.chapter.name}. Its lesson: ${story.chapter.lesson}. The enemy: ${story.chapter.enemy}, ${story.heartsLeft} of ${story.hearts} hearts left (each workout takes one).`
      : 'The story: every chapter is done. The road is theirs now.',
  );
  lines.push(`Today: ${day(now.toISOString())}. Check-in: ${checkin}.`);
  const nudge = coachNudge(state, now);
  if (nudge && !state.coach?.chat?.length) lines.push(`Open by bringing this up: ${nudge.text}`);
  if (p) {
    lines.push(`Modes: ${p.modes.join(', ')}. Goal: ${p.goal}. ${p.days} days a week, ${p.minutes} min. Gear: ${p.gear.join(', ')}. Experience: ${p.experience}.`);
    lines.push(`Levels (1-5): ${PATTERNS.map((k) => `${k} ${p.levels[k].level}${p.levels[k].source === 'setup' ? ' (guess)' : ''}`).join(', ')}.`);
    if (p.avoid.length) lines.push(`Spare: ${p.avoid.map((a) => a.text ?? a.area).join(', ')}.`);
  } else lines.push('No setup yet.');

  const live = liveNotes(state.coach, now);
  const rules = live.filter((n) => n.type === 'rule'),
    notes = live.filter((n) => n.type !== 'rule');
  if (rules.length) {
    // The player's own rules: kept in every plan, unless one breaks a law (then say so).
    lines.push('', 'Their rules (keep every one in every plan; a law beats a rule):');
    for (const n of rules) lines.push(`- [${n.id}] ${n.text}`);
  }
  if (notes.length) {
    lines.push('', 'Notes:');
    for (const n of notes) lines.push(`- [${n.id}] ${n.type}: ${n.text} (${day(n.at)}, ${n.by})`);
  }

  lines.push('', 'This week (the plan the player sees; a rest day is kept by resting, sitting by the fire):', ...weekText(state.coach?.week, now, (d) => restKept(state, d)));
  lines.push('', 'Next week (the player sees it too; change it any time):', ...weekText(state.coach?.week, now, undefined, 1));

  const recent = state.sessions.slice(-10);
  if (recent.length) {
    lines.push('', 'Last workouts (oldest first; each set is reps and how it felt: e easy 4+ left, r just right 2-3, h very hard 0-1; "of N" the target):');
    for (const s of recent) {
      // Each set as reps and how it felt (e easy 4+ left, r just right 2-3, h very hard 0-1), then the target.
      const moves = s.entries.map((e) => `${e.name ?? e.exerciseId} ${e.sets.map((x) => `${x.reps}${x.kg ? `@${x.kg}kg` : ''}${FEEL[x.rir]}`).join('/')} of ${e.target}`).join('; ');
      const extra = [
        s.felt && `felt ${s.felt}`,
        s.checkin === 'rough' && 'a rough day',
        s.minutes && `${s.minutes} min${s.planned ? ` (planned ${s.planned})` : ''}`,
        s.comment && `"${s.comment}"`,
        s.skipped?.length && `skipped ${s.skipped.length}`,
        s.changed?.length && `changed ${s.changed.map((c) => `${c.from}->${c.to} (${c.how})`).join(', ')}`,
        s.eased?.length && `target eased: ${s.eased.length}`,
      ].filter(Boolean);
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
  const going = goingLines(state, now);
  if (going.length) lines.push('', 'How training is going (plan with it):', ...going);
  const week = state.sessions.filter((s) => ago(s.date, now) < 7);
  lines.push(`This week: ${week.length} workouts.`);
  return lines.join('\n');
}
