'use client';

import { api } from './cloud-client';
import { FEED_LIMIT, type Post, type WorkoutCard } from './feed';

/* The talking side of the feed (rules and types in feed.ts). Every call needs sign-in. */

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const detail = ((await r.json().catch(() => null)) as { detail?: string } | null)?.detail;
    throw new Error(typeof detail === 'string' ? detail : `Request failed (${r.status})`);
  }
  return (await r.json()) as T;
}

/** Yours and your friends' posts, newest first; `before` (a post's `at`) for the next page. */
export const getFeed = async (before?: string) => json<{ posts: Post[]; more: boolean }>(await api('GET', `/feed${before ? `?before=${encodeURIComponent(before)}` : ''}`));

/** Share a finished workout, with a line and a photo (base64 JPEG from `shrinkPhoto`) if you like. */
export const sharePost = async (workout: WorkoutCard, text: string, photo: string | null) => json<Post>(await api('POST', '/feed', { workout, text, ...(photo ? { photo } : {}) }));

export const flamePost = async (id: string) => json<{ flamed: boolean; flames: number }>(await api('POST', `/feed/${id}/flame`));

/** Comment on a post: the post back, with every comment. */
export const commentPost = async (id: string, text: string) => json<Post>(await api('POST', `/feed/${id}/comments`, { text }));

async function gone(r: Response) {
  if (!r.ok && r.status !== 404) throw new Error(`Request failed (${r.status})`);
}

export const deletePost = async (id: string) => gone(await api('DELETE', `/feed/${id}`));

export const deleteComment = async (id: string) => gone(await api('DELETE', `/feed/comments/${id}`));

/** A post's photo as a link the page can show (the photo needs sign-in, so an <img> can't fetch it itself). */
const photos = new Map<string, Promise<string>>();
export function photoUrl(id: string): Promise<string> {
  let p = photos.get(id);
  if (!p) {
    p = api('GET', `/feed/${id}/photo`).then(async (r) => {
      if (!r.ok) throw new Error(`Request failed (${r.status})`);
      return URL.createObjectURL(await r.blob());
    });
    p.catch(() => photos.delete(id));
    photos.set(id, p);
  }
  return p;
}

/** A photo from the phone, made small enough to send: at most `edge` (FEED_LIMIT.photoEdge) on
    its long side, as a JPEG under `bytes` (FEED_LIMIT.photoBytes). `square` crops the middle square
    first (a profile photo). Returns base64 (no "data:" head) and a preview link. */
export async function shrinkPhoto(file: File, { edge = FEED_LIMIT.photoEdge, bytes = FEED_LIMIT.photoBytes, square = false }: { edge?: number; bytes?: number; square?: boolean } = {}): Promise<{ base64: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const [sx, sy, sw, sh] = square ? [(bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side] : [0, 0, bitmap.width, bitmap.height];
  const scale = Math.min(1, edge / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext('2d')?.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const q of [0.82, 0.7, 0.55, 0.4]) {
    const url = canvas.toDataURL('image/jpeg', q);
    const base64 = url.slice(url.indexOf(',') + 1);
    if ((base64.length * 3) / 4 <= bytes) return { base64, preview: url };
  }
  throw new Error("That photo is too big. Try another one.");
}
