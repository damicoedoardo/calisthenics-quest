---
type: conceptual
title: Friends
description: Friend codes, asks and accepts, and who is online, in the Fog or trained today — the profiles and friends tables, the /me and /friends routes, the heartbeat and the Friends card on the Hero tab.
tags: [backend, friends, social, co-op]
timestamp: 2026-10-27
---

# Friends

The first step of co-op (plan: the "FORMA co-op: friends, party and the first shared world" doc,
project thread "Explore multiplayer dungeon runs with friends"). Friends need sign-in; the game
itself never does.

## What a friend sees

Each player has a public **card** on the server: a name (asked the first time), class, level,
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
| Change how much can be given a day | `GIFTS.perDay` in `src/balance/upgrades.ts` and `PER_DAY` in `backend/app/routes/gifts.py` |
| Change the gift picker | `GiveMats` in `Friends.tsx` |
