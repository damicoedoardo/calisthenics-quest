import type { Session } from './game';
import type { FriendCard } from './friends';

/* The feed (pure): finished workouts friends share, with an optional line and photo, the flames
   friends give and their comments. The api is backend/app/routes/feed.py; the screens are in
   components/Feed.tsx. */

/** Server limits (TEXT, COMMENT, PHOTO_BYTES, PER_DAY in backend/app/routes/feed.py): keep the two the same.
    `photoEdge` is how big the phone makes a photo before sending it. */
export const FEED_LIMIT = { text: 280, comment: 200, photoBytes: 600_000, perDay: 5, photoEdge: 1080 } as const;

/** A workout as a post shows it. */
export interface WorkoutCard {
  title: string;
  minutes: number;
  sets: number;
  exercises: string[];
  mini: boolean;
  started_at?: string;
}

export interface PostComment {
  id: string;
  author: string;
  name: string;
  text: string;
  at: string;
  mine: boolean;
}

export interface Post {
  id: string;
  /** The author's card; the bare id and name if their card is gone. */
  author: FriendCard | { id: string; name: string };
  at: string;
  workout: WorkoutCard;
  text: string;
  photo: boolean;
  /** Friends who cheered during this workout. */
  cheered_by: string[];
  flames: number;
  flamed: boolean;
  comments: PostComment[];
  mine: boolean;
}

/** The post's card for a finished session: the plan's name, how long it took, the sets logged
    and the exercises, without the warm-up and the stretch (`taps`). */
export function workoutCard(session: Session, opts: { title: string; startedAt?: string; taps?: ReadonlySet<string> }): WorkoutCard {
  const real = session.entries.filter((e) => !opts.taps?.has(e.exerciseId));
  const ms = opts.startedAt ? new Date(session.date).getTime() - new Date(opts.startedAt).getTime() : 0;
  return {
    title: opts.title.slice(0, 40),
    minutes: Math.min(600, Math.max(0, Math.round(ms / 60_000))),
    sets: real.reduce((a, e) => a + e.sets.length, 0),
    exercises: real.map((e) => (e.name ?? e.exerciseId).slice(0, 40)).slice(0, 12),
    mini: session.kind === 'mini',
    ...(opts.startedAt ? { started_at: opts.startedAt } : {}),
  };
}

/** What someone typed, as sent: one line, spaces tidied, cut to `max`. */
export const cleanLine = (text: string, max: number) => text.split(/\s+/).filter(Boolean).join(' ').slice(0, max);

/** Posts newer than the last time you opened the feed, not your own: the dot on the Feed button. */
export const newPosts = (posts: Pick<Post, 'at' | 'mine'>[], seenAt: string | null) =>
  posts.filter((p) => !p.mine && (!seenAt || new Date(p.at) > new Date(seenAt))).length;

/** "38 min · 12 sets" (a quick workout says so). */
export function workoutLine(w: WorkoutCard): string {
  const parts = [w.minutes ? `${w.minutes} min` : '', `${w.sets} set${w.sets === 1 ? '' : 's'}`].filter(Boolean);
  return (w.mini ? ['Minimum quest', ...parts] : parts).join(' · ');
}
