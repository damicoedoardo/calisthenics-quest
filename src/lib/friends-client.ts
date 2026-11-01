'use client';

import { api, Offline } from './cloud-client';
import type { Cheer } from './cheers';
import type { FriendsList, MyCard, Profile } from './friends';

/* The talking side of friends (rules and types in friends.ts). Every call needs sign-in. */

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const detail = ((await r.json().catch(() => null)) as { detail?: string } | null)?.detail;
    throw new Error(typeof detail === 'string' ? detail : `Request failed (${r.status})`);
  }
  return (await r.json()) as T;
}

/** Send your card; also the heartbeat that shows you online. */
export const sendCard = async (card: Partial<MyCard>) => json<{ code: string; name: string }>(await api('PUT', '/me', card));

export const getFriends = async () => json<FriendsList>(await api('GET', '/friends'));

/** Add by code: "asked", or "friends" when they had asked you first. */
export const addFriend = async (code: string) => json<{ status: 'asked' | 'friends'; name: string }>(await api('POST', '/friends', { code }));

export const acceptFriend = async (id: string) => json<{ status: string }>(await api('POST', `/friends/${id}/accept`));

export async function removeFriend(id: string): Promise<void> {
  const r = await api('DELETE', `/friends/${id}`);
  if (!r.ok && r.status !== 404) throw new Error(`Request failed (${r.status})`);
}

export { Offline };

/** Where you live and a line about you (friends only). */
export const saveProfile = async (place: string, about: string) => json<Profile>(await api('PUT', '/me/profile', { place, about }));

/** Your photo: a base64 JPEG from `shrinkPhoto` (feed-client.ts), or null to take it down. */
export const savePhoto = async (photo: string | null) => json<Profile>(photo ? await api('PUT', '/me/photo', { photo }) : await api('DELETE', '/me/photo'));

/** A player's photo as a link the page can show (it needs sign-in, so an <img> can't fetch it
    itself). `version` is the profile's `photo` time: a new one fetches the new photo. */
const photos = new Map<string, Promise<string>>();
export function profilePhotoUrl(id: string, version: string): Promise<string> {
  const key = `${id}@${version}`;
  let p = photos.get(key);
  if (!p) {
    p = api('GET', `/profiles/${id}/photo`).then(async (r) => {
      if (!r.ok) throw new Error(`Request failed (${r.status})`);
      return URL.createObjectURL(await r.blob());
    });
    p.catch(() => photos.delete(key));
    photos.set(key, p);
  }
  return p;
}

/** Co-op materials one friend gives another (app/routes/gifts.py on the server). */
export interface Gift {
  id: string;
  from: string;
  from_name: string;
  mat: string;
  n: number;
}

/** Give a friend materials: "given", with how many more you can give them today. */
export const giveGift = async (to: string, mat: string, n: number) => json<{ status: string; left_today: number }>(await api('POST', '/gifts', { to, mat, n }));

/** Take home what friends gave you (each gift only once). */
export const claimGifts = async () => json<{ gifts: Gift[] }>(await api('POST', '/gifts/claim'));

/** Cheer a friend on (app/routes/cheers.py): "sent", with how many more you can send them today. */
export const sendCheer = async (to: string, text: string) => json<{ status: string; left_today: number }>(await api('POST', '/cheers', { to, text }));

/** What friends cheered you since the last look (each cheer only once). */
export const takeCheers = async () => json<{ cheers: Cheer[] }>(await api('POST', '/cheers/take'));
