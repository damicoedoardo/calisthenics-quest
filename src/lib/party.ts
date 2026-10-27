import type { FriendCard } from './friends';

/* Parties (pure): up to 4 friends who go into the Fog together. The leader invites, picks the
   zone and starts once everyone else is ready; a start is a zone, a seed and a time, and every
   phone that sees a start it hasn't played walks in. Until the game server exists (co-op step 3)
   each phone plays a practice run: you, with bots playing your friends' heroes. The api is in
   backend/app/routes/party.py; the screens in components/Party.tsx. */

export const MAX_PARTY = 4;

/** A start older than this is a run that already happened: it's not joined late. */
export const START_FRESH_MS = 3 * 60_000;

export interface PartyMember extends FriendCard {
  ready: boolean;
  leader: boolean;
}

export interface Party {
  id: string;
  leader: string;
  zone: number;
  seed: number | null;
  started_at: string | null;
  members: PartyMember[];
  invited: FriendCard[];
}

export interface PartyInvite {
  party_id: string;
  from: FriendCard;
}

export interface PartyView {
  party: Party | null;
  invites: PartyInvite[];
}

/** The start to walk into now: fresh, and not one this phone already played. */
export function startToJoin(party: Party | null, played: string | null, now: Date): { zone: number; seed: number; at: string } | null {
  if (!party?.started_at || party.seed === null || party.started_at === played) return null;
  if (now.getTime() - new Date(party.started_at).getTime() > START_FRESH_MS) return null;
  return { zone: party.zone, seed: party.seed, at: party.started_at };
}

/** The leader may start: a friend is in, and everyone but the leader is ready. */
export const canStart = (party: Party) => party.members.length > 1 && party.members.every((m) => m.leader || m.ready);

/** Who's in the party besides you. */
export const others = (party: Party, me: string) => party.members.filter((m) => m.id !== me);
