'use client';

import { useSyncExternalStore } from 'react';
import { api } from './cloud-client';
import type { PartyView } from './party';

/* The talking side of parties (rules and types in party.ts), and the last view of your party,
   shared by every screen that shows it. */

let view: PartyView = { party: null, invites: [] };
/** Your own id, as the api knows you (the Supabase user id). */
let me: string | null = null;
const listeners = new Set<() => void>();

function set(v: PartyView) {
  view = v;
  for (const l of listeners) l();
}

export function setPartyMe(id: string | null) {
  me = id;
  if (!id) set({ party: null, invites: [] });
}

export const usePartyView = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => view,
    () => view,
  );

export const partyMe = () => me;

async function call(method: 'GET' | 'PUT' | 'POST', path: string, body?: unknown): Promise<PartyView> {
  const r = await api(method, path, body);
  if (!r.ok) {
    const detail = ((await r.json().catch(() => null)) as { detail?: string } | null)?.detail;
    throw new Error(typeof detail === 'string' ? detail : `Request failed (${r.status})`);
  }
  const v = (await r.json()) as PartyView;
  set(v);
  return v;
}

export const refreshParty = () => call('GET', '/party');
export const inviteToParty = (friendId: string) => call('POST', '/party/invite', { friend_id: friendId });
export const joinParty = (partyId: string) => call('POST', '/party/join', { party_id: partyId });
export const declineParty = (partyId: string) => call('POST', '/party/decline', { party_id: partyId });
export const leaveParty = () => call('POST', '/party/leave');
export const setReady = (ready: boolean) => call('PUT', '/party/ready', { ready });
export const setPartyZone = (zone: number) => call('PUT', '/party/zone', { zone });
export const startParty = () => call('POST', '/party/start');

// ---------- the lobby screen: open from anywhere (the Friends card, the party button, an invite) ----------

let lobby = false;
const lobbyListeners = new Set<() => void>();

export function setLobbyOpen(open: boolean) {
  lobby = open;
  for (const l of lobbyListeners) l();
}

export const useLobbyOpen = () =>
  useSyncExternalStore(
    (l) => {
      lobbyListeners.add(l);
      return () => lobbyListeners.delete(l);
    },
    () => lobby,
    () => false,
  );
