import { dayKey } from '../days';
import type { GameState } from '../game';
import { storyState } from '@/story/engine';
import { minutesOf } from './validate';
import { paceOf } from './feedback';
import { daysIn, dayLabel, nextDay, restKept, restToday, shownWeek, weekDoneId, weekdayOf } from './week';

/* The flame speaks first: one thing worth saying now (a missed day, a new week, a rest day to keep, a workout done, the
   chapter's enemy nearly beaten, today's workout), picked by code from the save. It shows on the
   flame's card with a dot on the Train tab, and once you open the chat it is said there too, so
   the coach can talk it through. Each nudge has an id and is said once. */

export interface Nudge {
  /** Said once: kept in `coach.heard` after. */
  id: string;
  /** What the flame says. */
  text: string;
}

export function coachNudge(state: GameState, now: Date): Nudge | undefined {
  const coach = state.coach;
  if (!coach?.profile) return undefined;
  const today = dayKey(now);
  const week = coach.week;
  const next = nextDay(week);
  const doneToday = week?.days.find((d) => d.done && dayKey(new Date(d.done)) === today);
  if (next && next.date < today)
    return { id: `missed:${next.date}`, text: `${weekdayOf(next.date)}'s workout is still waiting for you. It's patient. So am I: I've waited longer for less. Do it today, or tell me and I'll move the week around.` };
  // Tired lately: the next workouts were made lighter (feedback.ts). Said once.
  if (next?.plan.why?.startsWith('Lighter'))
    return { id: `lighter:${next.date}`, text: `Your last workouts were heavy. I felt it from here. So I took a set off each move for the next two. Strength grows while you rest, not while you grind. Tell me if you'd rather keep it as it was.` };
  // This week's last workout done: next week is already drafted, so the flame shows it right away.
  if (week && doneToday && shownWeek(week, now) === 1)
    return { id: weekDoneId(week), text: `That was the week's last workout. I knew you'd finish it. Next week is ready: workouts on ${daysIn(week, 1).map((d) => weekdayOf(d.date)).join(', ')}, rest days between. Want to change anything? Just tell me.` };
  if (week && next && week.start === today && !week.days.some((d) => d.done) && coach.heard !== `weekdone:${week.start}`)
    return { id: `week:${week.start}`, text: `I laid out a new week while you slept: workouts on ${daysIn(week, 0).map((d) => weekdayOf(d.date)).join(', ')}, and rest days between. The rest days count too. Want to change anything? Just tell me.` };
  if (restToday(coach, now) && !restKept(state, today) && !doneToday)
    return { id: `rest:${today}`, text: "Today is a rest day, and resting is part of the plan. Come sit by the fire with me for a minute. I don't bite. Much. That's how the day counts." };
  const story = storyState(state);
  if (doneToday && story.chapter && story.heartsLeft === 1) return { id: `enemy:${story.chapter.n}`, text: `One more workout and ${story.chapter.enemy} is beaten. I can hear it getting weaker. It knows you're coming.` };
  if (doneToday) return { id: `done:${today}`, text: next ? `Hm. I knew you had that in you. Rest well. Next: ${dayLabel(next.date, now) === 'Tomorrow' ? 'tomorrow' : weekdayOf(next.date)}, ${next.plan.title}.` : "That was the week's last workout. I knew you'd finish it. Now keep your rest days: they count too." };
  if (next && next.date === today) return { id: `today:${today}`, text: `Today: ${next.plan.title}, about ${minutesOf(next.plan.items, paceOf(state.sessions))} minutes. I'll be watching. Tap any card to see how it's done.` };
  return undefined;
}

/** A nudge not said yet. */
export function freshNudge(state: GameState, now: Date): Nudge | undefined {
  const n = coachNudge(state, now);
  return n && n.id !== state.coach?.heard ? n : undefined;
}

/** The chat opened: the nudge is said in it (unless the coach opens an empty chat itself) and kept as heard. */
export function hearNudge(state: GameState, nudge: Nudge, say: boolean): GameState {
  const coach = state.coach;
  if (!coach) return state;
  const chat = say ? [...(coach.chat ?? []), { role: 'assistant' as const, content: nudge.text }] : coach.chat;
  return { ...state, coach: { ...coach, heard: nudge.id, ...(chat ? { chat } : {}) } };
}
