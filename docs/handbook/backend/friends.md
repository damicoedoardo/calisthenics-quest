---
type: conceptual
title: Friends
description: Friend codes, asks and accepts, who is online, in the Fog or trained today, and parties (invite, lobby, ready, start, practice run) — the tables, the /me, /friends and /party routes, and the screens.
tags: [backend, friends, social, co-op, voice, livekit]
timestamp: 2026-10-28
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
| `src/components/Friends.tsx` | `useFriendsBeat` (in `page.tsx`) and `FriendsCard` (Fog tab, Together) |

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
party run (the Fog tab's **Together**) keeps its loot and co-op materials but never moves the story:
only Story runs clear a zone (`page.tsx`, `onEnd`). Friends, invites and the lobby button live
under Together.

| File | What |
|---|---|
| `backend/app/party.py` | Tables `parties`, `party_members`, `party_invites` (made on start), `PgStore`, `MemoryStore` |
| `backend/app/routes/party.py` | `GET /party`, `POST /party/invite`, `/join`, `/decline`, `/leave`, `/start`, `PUT /party/ready`, `/zone` |
| `backend/tests/test_party.py` | Invite, join, ready, start; only friends; only the leader; leaving |
| `src/lib/party.ts`, `party-client.ts` | Types, `startToJoin`, `canStart`; the calls and the shared party view (`usePartyView`), the lobby's open flag |
| `src/components/Party.tsx` | `usePartyPoll` (every 4 s in a party, 30 s otherwise), `PartyInviteCard`, `PartyButton`, `PartyLobby`, `VoiceBar` |

### Party voice

A party can talk. In the lobby, **Talk with your party** joins the party's voice room with the mic
on. The lobby then shows a green ring on whoever is talking, a crossed mic on anyone with the mic
off, and a speaker button on each friend that turns them down on your phone only. Next to the
party button there's a mic toggle. Voice keeps going when the lobby closes and during a run, and
it ends when you leave the party or tap Leave voice.

How it works: [LiveKit](https://livekit.io) runs on our server (`livekit` in `docker-compose.yml`,
[server.md](server.md)), with one room per party, `party-<id>`. `POST /party/voice` gives a
member a pass signed with the key LiveKit trusts: one room, mic only, 6 h (`backend/app/voice.py`).
Anyone outside the party gets 404, and 503 means voice isn't set up on the server. The app loads
`livekit-client` only when you join (`src/lib/voice-client.ts`). The room lives in that module,
not in a screen. Phones only play sound after a tap, so joining must come from one.

Limits: an installed iPhone app stops voice when it goes to the background or the screen locks.
With the mic on, the iPhone may play the game's sound lower.

| File | What |
|---|---|
| `backend/app/voice.py` | `room_of`, `voice_pass` (the signed pass) |
| `backend/app/routes/party.py` | `POST /party/voice` |
| `backend/tests/test_voice.py` | Members get a pass to their room; no party, no pass; off until set up |
| `src/lib/voice-client.ts` | `joinVoice`, `leaveVoice`, `setMic`, `silence`, `useVoice` (who's here, talking, quiet) |

## Gifts of forge materials

Friends can give each other co-op materials for Mira's forge ([../game/forge.md](../game/forge.md)).
On the Friends card each friend has a gift button: pick a material you have and how many, and
**Give**. The server keeps the gift in `gifts` (`backend/app/gifts.py`, `routes/gifts.py`) and only
then does your phone take the materials out of your save (`giveMats`). Your friend's card claims
what waits on each refresh (`POST /gifts/claim`, each gift handed out once) into their save
(`takeGifts`) and says who gave what.

- Only to an accepted friend, only the four materials, and at most 10 a day from one friend to
  another (`GIFTS.perDay` in `src/balance/upgrades.ts`; the server's copy is `PER_DAY` in
  `routes/gifts.py`, keep the two the same). Over it, the server says how many are left (429).
- The save is on the phone, so the server can't check you really had what you give; it only
  makes sure a gift arrives once. There is no market and no trading back.
- Tested in `backend/tests/test_gifts.py`; the save side in `src/lib/forge.test.ts`.

## How to change things

| I want to... | Edit |
|---|---|
| Share something new on the card | `Card` in `routes/friends.py`, a column in `SCHEMA` + `init.sql` (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `SCHEMA` for live servers), `MyCard`/`myCard` in `friends.ts` |
| Change how a friend looks in the list | `Row` / `FriendHero` in `Friends.tsx` |
| Change when someone counts as online | `ONLINE_FOR` (server) and `BEAT_MS` (app) |
| Change the party size | `MAX_PARTY` in `backend/app/party.py` and `src/lib/party.ts` (and `max_participants` in `livekit/livekit.yaml`) |
| Change the voice buttons | `VoiceBar`, `PartyButton` and the member cards in `Party.tsx` |
| Change what a voice pass allows | `voice_pass` in `backend/app/voice.py` |
| Change how much can be given a day | `GIFTS.perDay` in `src/balance/upgrades.ts` and `PER_DAY` in `backend/app/routes/gifts.py` |
| Change the gift picker | `GiveMats` in `Friends.tsx` |
