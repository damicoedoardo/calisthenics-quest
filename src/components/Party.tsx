'use client';

import { useEffect, useState } from 'react';
import { Crown, LogOut, Swords, X } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { ZONES, zoneStatus } from '@/lib/fog';
import { getClass } from '@/lib/gear';
import type { FriendCard } from '@/lib/friends';
import { getFriends } from '@/lib/friends-client';
import { canStart, MAX_PARTY } from '@/lib/party';
import { supabase } from '@/lib/cloud-client';
import {
  declineParty,
  inviteToParty,
  joinParty,
  leaveParty,
  partyMe,
  refreshParty,
  setLobbyOpen,
  setPartyMe,
  setPartyZone,
  setReady,
  startParty,
  useLobbyOpen,
  usePartyView,
} from '@/lib/party-client';
import { FriendHero } from './Friends';
import { useModal } from './useModal';

/* Parties on screen: the polling that keeps the party fresh (usePartyPoll, in page.tsx), the
   invite card, the party button, and the lobby. Starting a run is in page.tsx (startToJoin).
   Rules and types in lib/party.ts. */

/** While in a party: look often, so a start reaches everyone within seconds. */
const IN_PARTY_MS = 4000;
/** Otherwise: now and then, for invites. */
const IDLE_MS = 30_000;

const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

export function usePartyPoll(signedIn: boolean, off: boolean) {
  const { party } = usePartyView();
  const inParty = !!party;
  useEffect(() => {
    if (off || !signedIn) {
      setPartyMe(null);
      return;
    }
    let stop = false;
    void (async () => {
      const { data } = await (await supabase()).auth.getSession();
      if (!stop) setPartyMe(data.session?.user.id ?? null);
    })();
    const look = () => {
      if (visible()) void refreshParty().catch(() => {});
    };
    look();
    const t = window.setInterval(look, inParty ? IN_PARTY_MS : IDLE_MS);
    document.addEventListener('visibilitychange', look);
    return () => {
      stop = true;
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', look);
    };
  }, [signedIn, off, inParty]);
}

/** "Ana invites you to the Fog": join or not now. */
export function PartyInviteCard() {
  const { invites } = usePartyView();
  const [busy, setBusy] = useState(false);
  const inv = invites[0];
  if (!inv) return null;
  const name = inv.from.name || 'A friend';
  return (
    <div role="status" className="fixed inset-x-3 bottom-24 z-30 mx-auto max-w-md rounded-2xl bg-ink-800 p-3 shadow-xl ring-1 ring-gold-400/40 land:bottom-4">
      <div className="flex items-center gap-3">
        <FriendHero f={inv.from} />
        <p className="min-w-0 flex-1 text-sm text-slate-200">
          <b className="text-gold-300">{name}</b> invites you to the Fog.
        </p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await declineParty(inv.party_id).catch(() => {});
            setBusy(false);
          }}
          className="rounded-xl bg-ink-600 py-2.5 text-sm font-semibold"
        >
          Not now
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await joinParty(inv.party_id);
              setLobbyOpen(true);
            } catch {
              await refreshParty().catch(() => {});
            }
            setBusy(false);
          }}
          className="rounded-xl bg-gold-400 py-2.5 text-sm font-semibold text-ink-950"
        >
          Join
        </button>
      </div>
    </div>
  );
}

/** While in a party: a button to its lobby, showing how many are in. */
export function PartyButton() {
  const { party } = usePartyView();
  const open = useLobbyOpen();
  if (!party || open) return null;
  return (
    <button
      onClick={() => setLobbyOpen(true)}
      className="fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full bg-gold-400 px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-[0_3px_0_#b45309] land:bottom-4"
    >
      <Swords size={16} /> Party · {party.members.length}
    </button>
  );
}

/** The lobby: who's in, the zone, ready, start; invite more friends; leave. */
export function PartyLobby({ state }: { state: GameState }) {
  return useLobbyOpen() ? <Lobby state={state} /> : null;
}

function Lobby({ state }: { state: GameState }) {
  const { party } = usePartyView();
  const [friends, setFriends] = useState<FriendCard[]>([]);
  const [msg, setMsg] = useState('');
  const box = useModal<HTMLDivElement>(() => setLobbyOpen(false));

  useEffect(() => {
    void getFriends()
      .then((l) => setFriends(l.friends))
      .catch(() => {});
  }, []);

  const me = partyMe();
  const close = () => setLobbyOpen(false);
  const act = async (f: () => Promise<unknown>) => {
    setMsg('');
    try {
      await f();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    }
  };

  const mine = party?.members.find((m) => m.id === me);
  const leading = !!party && party.leader === me;
  const inParty = new Set([...(party?.members.map((m) => m.id) ?? []), ...(party?.invited.map((f) => f.id) ?? [])]);
  const room = party ? MAX_PARTY - party.members.length - party.invited.length : MAX_PARTY - 1;
  const zones = ZONES.filter((z) => zoneStatus(state, z).state !== 'locked');
  const zone = ZONES.find((z) => z.id === party?.zone) ?? ZONES[0];

  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label="Your party" className="safe-top fixed inset-0 z-40 overflow-y-auto bg-ink-950/95 outline-none land-safe-x">
      <div className="mx-auto max-w-md space-y-4 px-4 pb-10 pt-4 land:max-w-3xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-pixel text-xs text-gold-300">
            <Swords size={16} /> Your party
          </h2>
          <button onClick={close} aria-label="Close" className="rounded-lg bg-ink-800 p-2">
            <X size={18} />
          </button>
        </div>

        {!party ? (
          <p className="text-sm text-slate-400">Invite a friend below to start a party.</p>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2 land:grid-cols-4">
              {party.members.map((m) => (
                <li key={m.id} className="flex flex-col items-center rounded-2xl bg-ink-800 p-3 text-center">
                  <FriendHero f={m} size={64} />
                  <p className="mt-1 flex items-center gap-1 truncate text-sm font-semibold text-slate-100">
                    {m.leader && <Crown size={12} className="text-gold-300" />}
                    {m.id === me ? 'You' : m.name || 'A hero'}
                  </p>
                  <p className="text-[11px] text-slate-400">{getClass(m.class_id ?? undefined)?.name ?? 'Adventurer'}, level {m.level}</p>
                  <p className={`mt-1 text-[11px] font-semibold ${m.leader ? 'text-gold-300' : m.ready ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {m.leader ? 'Leads' : m.ready ? 'Ready' : 'Not ready'}
                  </p>
                </li>
              ))}
              {party.invited.map((f) => (
                <li key={f.id} className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-600 p-3 text-center opacity-70">
                  <FriendHero f={f} size={48} />
                  <p className="mt-1 text-xs text-slate-400">Invited {f.name || 'a hero'}…</p>
                </li>
              ))}
            </ul>

            <section className="rounded-2xl bg-ink-800 p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Where</p>
              {leading ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {zones.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => act(() => setPartyZone(z.id))}
                      className={`rounded-xl px-3 py-2 text-sm ${z.id === party.zone ? 'bg-gold-400 font-semibold text-ink-950' : 'bg-ink-600'}`}
                    >
                      {z.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm font-semibold text-slate-100">{zone.name}</p>
              )}
              <p className="mt-3 text-xs text-slate-400">
                A practice run for now: you play your hero, and your friends&apos; heroes fight beside you, played by the game. Playing live together comes next.
              </p>
            </section>

            {leading ? (
              <button
                disabled={!canStart(party)}
                onClick={() => act(startParty)}
                className="w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:opacity-40"
              >
                {party.members.length < 2 ? 'Waiting for a friend' : canStart(party) ? 'Into the Fog' : 'Waiting for everyone to be ready'}
              </button>
            ) : (
              <button
                onClick={() => act(() => setReady(!mine?.ready))}
                className={`w-full rounded-2xl py-4 font-pixel text-xs ${mine?.ready ? 'bg-emerald-600 text-white' : 'bg-gold-400 text-ink-950 shadow-[0_4px_0_#b45309]'}`}
              >
                {mine?.ready ? 'Ready! Waiting for the leader' : "I'm ready"}
              </button>
            )}
          </>
        )}

        {msg && <p className="text-xs text-sky-300">{msg}</p>}

        {room > 0 && (
          <section className="rounded-2xl bg-ink-800 p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Invite</p>
            {friends.filter((f) => !inParty.has(f.id)).length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Add friends on the Hero tab to invite them here.</p>
            ) : (
              <ul className="mt-1 divide-y divide-ink-700">
                {friends
                  .filter((f) => !inParty.has(f.id))
                  .map((f) => (
                    <li key={f.id} className="flex items-center gap-3 py-2">
                      <FriendHero f={f} size={40} />
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                        {f.name || 'A hero'}
                        <span className={`ml-2 inline-block h-2 w-2 rounded-full ${f.playing ? 'bg-gold-300' : f.online ? 'bg-emerald-400' : 'bg-slate-600'}`} aria-hidden />
                      </span>
                      <button onClick={() => act(() => inviteToParty(f.id))} className="rounded-lg bg-ink-600 px-3 py-2 text-xs font-semibold">
                        Invite
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        )}

        {party && (
          <button
            onClick={() =>
              act(async () => {
                await leaveParty();
                close();
              })
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-800 py-3 text-sm text-slate-300"
          >
            <LogOut size={15} /> Leave the party
          </button>
        )}
      </div>
    </div>
  );
}
