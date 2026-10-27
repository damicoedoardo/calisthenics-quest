'use client';

import { api, Offline } from './cloud-client';
import type { FriendsList, MyCard } from './friends';

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
