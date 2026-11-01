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

/** True when a JPEG says it was taken with the front camera (its EXIF lens name, e.g. "iPhone 15
    front camera 2.69mm f/1.9"). Such a selfie is saved the other way round from how the camera
    showed it while taking it, so the app shows it mirrored, as it looked then. Reads only the
    file's head; any file it can't read counts as not a selfie. */
export function fromFrontCamera(head: Uint8Array): boolean {
  const lens = exifLens(head);
  return !!lens && /front/i.test(lens);
}

function exifLens(b: Uint8Array): string | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const marker = b[i + 1];
    const size = (b[i + 2] << 8) | b[i + 3];
    // APP1 holding "Exif\0\0".
    if (marker === 0xe1 && String.fromCharCode(...b.subarray(i + 4, i + 8)) === 'Exif') return tiffLens(b.subarray(i + 10, i + 2 + size));
    if (marker === 0xda) return null;
    i += 2 + size;
  }
  return null;
}

function tiffLens(t: Uint8Array): string | null {
  if (t.length < 8) return null;
  const le = t[0] === 0x49; // "II": little end first; "MM": big end first.
  const u16 = (o: number) => (o + 2 > t.length ? -1 : le ? t[o] | (t[o + 1] << 8) : (t[o] << 8) | t[o + 1]);
  const u32 = (o: number) => (o + 4 > t.length ? -1 : le ? (t[o] | (t[o + 1] << 8) | (t[o + 2] << 16) | (t[o + 3] << 24)) >>> 0 : ((t[o] << 24) | (t[o + 1] << 16) | (t[o + 2] << 8) | t[o + 3]) >>> 0);
  const find = (ifd: number, tag: number): number => {
    const n = u16(ifd);
    for (let k = 0; k >= 0 && k < n; k++) {
      const e = ifd + 2 + k * 12;
      if (u16(e) === tag) return e;
    }
    return -1;
  };
  const exifPtr = find(u32(4), 0x8769);
  if (exifPtr < 0) return null;
  const e = find(u32(exifPtr + 8), 0xa434);
  if (e < 0) return null;
  const count = u32(e + 4);
  const at = count <= 4 ? e + 8 : u32(e + 8);
  if (count < 1 || at < 0 || at + count > t.length) return null;
  return String.fromCharCode(...t.subarray(at, at + count)).replace(/\0+$/, '');
}
