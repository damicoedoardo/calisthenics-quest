---
type: conceptual
title: Live party runs
description: The game server that plays one real Fog run for a party — the pass, the wire format, the room, how a phone predicts and corrects, the fall back to bots, and how it is deployed.
tags: [backend, co-op, multiplayer, game-server, websocket]
timestamp: 2026-10-28
---

# Live party runs

When a party's leader starts a run, every phone used to play its own copy with bots for the
friends (the practice run, [friends.md](friends.md)). With the game server on, the party's first
attempt is **one real run** that everyone plays together. "Try again" after it is a run of your own.

## The shape

- **The server plays, phones show.** `play/server.ts` (Node, `ws`) runs the same pure engine as
  the app (`src/game/dungeon/engine.ts`) at 60 steps a second, one `Room` per party start
  (`src/game/net/room.ts`). Every 3 steps (20 a second) it sends each phone the run as JSON text
  (a snapshot, about 6 KB, compressed on the way by permessage-deflate).
- **A pass gets you in.** The phone asks the api for one (`POST /party/play`, `backend/app/play.py`):
  an HS256 token, 15 minutes, with who you are, the party, its seed and zone, and its members in
  order. The game server checks it with the secret both share (`play/pass.ts`). 503 means live runs
  aren't set up, 404 not in a party, 409 no run started.
- **What goes over the line** is all in `src/game/net/wire.ts`: `Up` (phone to server: hello with
  the pass and your `HeroSetup`, the steps you pressed, picks, the stairs, gear) and `Down` (wait,
  start, run, error). `snapshot`/`applySnapshot` turn a run into text and back: what each phone
  already has (setup, layout, dice, closures) stays out, heroes and monsters held elsewhere go as
  their id, numbers are cut to 3 decimals.
- **Waiting.** The room starts when the whole party is in, or `NET.waitSeconds` after the first
  phone (`room.ts`). Phones see "Waiting for your party" (`PartyWait` in `FogRun.tsx`).
- **Your steps, counted the same on both sides.** The server plays one of your steps each step.
  When yours hasn't come yet it plays it with the stick as you last held it and counts it as
  played (`ack`); when it comes late it's passed over (its buttons kept). So the server moves you
  exactly as many steps as your phone did, and your phone almost never has to pull you back. A
  phone that runs a little fast has two steps played as one once more than `NET.steady` wait.
- **Nobody holds the run up.** A phone that drops is played by the bot until it's back
  (`botInput`); a pick waits at most `NET.pickSeconds`, then the bot picks; the stairs go deeper
  after the same wait. Any member can answer the stairs for everyone.

## On the phone

`src/lib/play-client.ts` gets the pass, opens the WebSocket, says hello, waits for `start`, then
hands the scene a `PlayLink` (`RunSetup.net`). It tries again a few times when the line drops. Any
failure before the start (no server, no sign-in, offline) falls back to the practice run, with a
line saying so.

The scene (`src/game/dungeon/scene.ts`, `live()`) builds its own copy of the run from the start
message (`runFromStart`: same setup, same seed, you first) and hands it to a `Follower`
(`src/game/net/follow.ts`, pure), which each frame:

1. puts in every snapshot that came (`applySnapshot`), drops your steps the server has played
   (`ack`), and plays the rest again on top: so your hero moves the moment you press. A small
   correction glides away (`off`, drawn by `sync`) instead of a jump;
2. plays what you press now. The engine reads each hero's input **by its id** (its place in the
   server's run), not by its place in this phone's party, where you are first;
3. sends your numbered steps every `FOLLOW.sendMs`;
4. before drawing, puts everyone else (friends, monsters, shots) where they were `FOLLOW.behindMs`
   ago on the server's clock, between two snapshots (`place`), so they glide instead of jumping
   20 times a second.

`follow.test.ts` plays two phones and the server over a slow, uneven line (70 ms each way, give or
take 30) and checks that your hero is almost never pulled back, and that a friend moves the same
small way every frame.

Only the server's events are played (sounds, hits, new rooms, loot), so nothing happens twice,
except your own moves: a swing, an ability, an SP move or a dodge shows the moment you press
(`press` returns it), and the server's copy is skipped. The engine tags those events with the hero
whose turn made them (`byOf` in `engine.ts`). In developer mode the run shows `ping`: from pressing
a step to the server playing it.
Picks, chests and the stairs are sent and applied at once; the server's next few snapshots may
still ask, so they're ignored for `ANSWER_MS`. A card the server no longer asks (someone else took
the stairs, the bot picked for you) closes (`dismiss`). Pausing or opening the bag doesn't stop a
live run: your hero just stands still. There is no hit-stop in a live run.

## Trying it on one computer

`cd play && PLAY_SECRET=test-secret pnpm start` runs the server on port 8090. Mint a pass for two
users with that secret (claims in `play/pass.ts`), then open
`/?sandbox&run=0&party&live=ws://localhost:8090/play&pass=<token>` in two browsers (developer mode;
`labLive` in `FogRun.tsx` only takes a local server). `room.test.ts` covers the rules without
sockets.

## Deploy

The `play` service in `docker-compose.yml` is built on the server from the repo
(`play/Dockerfile`: Node 22 runs the TypeScript as-is through `scripts/ts-hooks.mjs`; only `ws` is
installed). Caddy sends `wss://api.formaquest.app/play` to it. The api needs `FORMA_PLAY_URL` and
`FORMA_PLAY_SECRET`, the server `PLAY_SECRET` (the same value). One-time setup and updates:
[server.md](server.md) and `scripts/deploy/README.md`. Rooms live in memory, so a rebuild ends the
runs going on.

## How to change things

| I want to... | Edit |
|---|---|
| Wait longer for the party, or for a pick | `NET` in `src/game/net/room.ts` |
| Send snapshots more or less often | `SEND_EVERY` in `play/server.ts` |
| Send more or less in a snapshot | `KEEP_OUT` and the replacer in `snapshot` (`wire.ts`) |
| Add something a phone can do in a live run | a case in `Up` (`wire.ts`), `Room.take` (`room.ts`), and the scene's handler sends it (`answer` or `gear` in `scene.ts`) |
| Draw the others further in the past (smoother on a bad line, but later) | `FOLLOW.behindMs` in `src/game/net/follow.ts` |
| Change how a correction to your hero glides | `FOLLOW.glidePx`, `FOLLOW.glideKeep` (`follow.ts`) |
| Change how the server waits for your steps | `NET.steady`, `NET.maxQueue` and `inputFor` in `room.ts` |
| Change the waiting screen | `PartyWait` in `src/components/FogRun.tsx` |
| Change how long a pass lasts | `play_pass_seconds` in `backend/app/config.py` |

Not done yet: your own hits shown before the server confirms them, and a live "Try again".
