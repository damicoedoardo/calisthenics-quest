---
type: conceptual
title: Friends
description: Friend codes, asks and accepts, who is online, in the Fog or trained today, and parties (invite, lobby, ready, start, practice run) — the tables, the /me, /friends and /party routes, and the screens.
tags: [backend, friends, social, co-op]
timestamp: 2026-10-27
---

# Friends

The first step of co-op (plan: the "FORMA co-op: friends, party and the first shared world" doc,
project thread "Explore multiplayer dungeon runs with friends"). Friends need sign-in; the game
itself never does.

## What a friend sees

Each player has a public **card** on the server: the hero's name (from the save, asked after the look in the opening; older saves are asked on the Friends card), class, level,
look and worn gear tiers, when they last trained, and whether the app is open (`online`) or in a
run (`playing`, the zone's name). Nothing else of the save is shared. A friend shows as:

- **In the Fog: <world>** while their run is going, **Online** while the app is open, else
  **Seen 2 h ago**.
- A flame and **trained today** when their last workout was on this phone's today. This is the
  part that nudges friends to train.

There is no search by name. A friend is added only with their **friend code** (6 letters and
digits, no 0/O/1/I/L), typed or opened from an invite link `formaquest.app/?friend=CODE`. An ask
waits until the other side accepts; adding back someone who asked you is a yes.

## How it works

| File | What |
|---|---|
| `backend/app/friends.py` | The tables (`SCHEMA`), codes, `PgStore` and `MemoryStore` (tests) |
| `backend/app/routes/friends.py` | `PUT /me`, `GET /friends`, `POST /friends`, `POST /friends/{id}/accept`, `DELETE /friends/{id}` |
| `backend/tests/test_friends.py` | Ask, accept, add back, codes, online timing |
| `src/lib/friends.ts` | Pure: your card from the save (`myCard`), status lines, trained today, invite links |
| `src/lib/friends-client.ts` | The calls, through `api()` in `cloud-client.ts` |
| `src/components/Friends.tsx` | `useFriendsBeat` (in `page.tsx`) and `FriendsCard` (Hero tab) |

- **Heartbeat:** while signed in and the app is visible, `useFriendsBeat` sends your card with
  `PUT /me` every 30 s, when the app comes back to the front, and when a run starts or ends. The
  server counts a player seen in the last 75 s as online. A locked iPhone can't send anything, so
  online honestly means "app open".
- **Tables** (`profiles`, `friends`): the api creates them on start (`CREATE ... IF NOT EXISTS`),
  so a deploy needs no hand-run SQL; they are in `db/init.sql` too. A friendship is one row
  `(a, b)`: `a` asked, `accepted` once `b` says yes.
- An invite link opened before sign-in keeps the code in `localStorage` and adds the friend once
  you're signed in.

## Parties

Up to 4 friends (`MAX_PARTY`) go into the Fog together. The **leader** invites friends (the
Party button on a friend's row, or Invite in the lobby), picks the zone among the ones open to
them, and starts once everyone else taps ready. A **start** is a seed and a time on the party:
every phone sees it on its next look and walks in (`startToJoin` in `src/lib/party.ts`, run from
`page.tsx`, played once per phone, `forma-party-played-v1`); then the party is back in its lobby
with the ready flags cleared. Until the game server exists each phone plays a **practice run**:
you, with bots playing your friends' heroes (see [../game/dungeon.md](../game/dungeon.md)). A
party run in a zone you haven't opened keeps its loot but not the clear.

| File | What |
|---|---|
| `backend/app/party.py` | Tables `parties`, `party_members`, `party_invites` (made on start), `PgStore`, `MemoryStore` |
| `backend/app/routes/party.py` | `GET /party`, `POST /party/invite`, `/join`, `/decline`, `/leave`, `/start`, `PUT /party/ready`, `/zone` |
| `backend/tests/test_party.py` | Invite, join, ready, start; only friends; only the leader; leaving |
| `src/lib/party.ts`, `party-client.ts` | Types, `startToJoin`, `canStart`; the calls and the shared party view (`usePartyView`), the lobby's open flag |
| `src/components/Party.tsx` | `usePartyPoll` (every 4 s in a party, 30 s otherwise), `PartyInviteCard`, `PartyButton`, `PartyLobby` |

## How to change things

| I want to... | Edit |
|---|---|
| Share something new on the card | `Card` in `routes/friends.py`, a column in `SCHEMA` + `init.sql` (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `SCHEMA` for live servers), `MyCard`/`myCard` in `friends.ts` |
| Change how a friend looks in the list | `Row` / `FriendHero` in `Friends.tsx` |
| Change when someone counts as online | `ONLINE_FOR` (server) and `BEAT_MS` (app) |
| Change the party size | `MAX_PARTY` in `backend/app/party.py` and `src/lib/party.ts` |
