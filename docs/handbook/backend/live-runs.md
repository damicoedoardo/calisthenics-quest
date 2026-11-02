---
type: conceptual
title: Live party runs
description: The game server that plays one real Fog run for a party — the pass, the wire format, the room, how a phone predicts and corrects, the fall back to bots, and how it is deployed.
tags: [backend, co-op, multiplayer, game-server, websocket]
timestamp: 2026-11-02
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
  the pass and your `HeroSetup`, the steps you pressed, picks, the stairs, gear, quit) and `Down` (wait,
  start, run, error). `snapshot`/`applySnapshot` turn a run into text and back: what each phone
  already has (setup, layout, dice, closures) stays out, heroes and monsters held elsewhere go as
  their id, numbers are cut to 3 decimals.
- **Waiting.** The room starts when the whole party is in, or `NET.waitSeconds` after the first
  phone (`room.ts`). Phones see "Waiting for your party" (`PartyWait` in `FogRun.tsx`).
- **Your steps, played exactly as your phone played them.** The server plays your steps in order,
  one each step, none guessed and none dropped (`inputFor` in `room.ts`). When your next one
  hasn't come yet, your hero has no turn that step (an input with `wait`: no move, no attack); it's
  played when it comes. When more than `NET.steady` of yours wait (they came in a bunch, or your
  phone runs a little fast), you get an extra turn (`extraTurn` in `engine.ts`: your move, buttons
  and attacks, the rest of the run not stepping). So the server's run of you is your phone's, and
  your phone never has to take a move, an ability or a shot back. (Guessing a late step and passing
  over the real one, as before, made abilities show, vanish and show again.) A phone more than
  `NET.maxQueue` steps ahead loses its oldest, buttons kept.
- **Nobody holds the run up.** A phone that drops is played by the bot until it's back
  (`botInput`). If it isn't back within `NET.goneSeconds`, or its player leaves the run (the phone
  sends `quit` when the run screen closes before the end), the run ends for everyone, each keeping
  what they carry (`leaveRun` in `engine.ts`, ended as `left`). A pick waits at most `NET.pickSeconds`, then the bot picks; the stairs go deeper
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
2. plays what you press now, with `stepOwn` (`engine.ts`): only your hero (moving, buttons,
   attacks, your shots and fire) and what flies; monsters and friends aren't stepped on the phone,
   since they're drawn from the server's snapshots anyway. That keeps step 1 cheap: a phone
   replays its waiting steps on every snapshot, 20 times a second, and stepping every monster in
   each replay cost about 4 times as much (dropped frames on a phone in a full room);
3. sends your numbered steps every `FOLLOW.sendMs`;
4. before drawing, puts everyone else (friends, monsters) where they were a moment ago on
   the server's clock, between two snapshots (`place`), so they glide instead of jumping 20 times
   a second. How far back is measured, not fixed: the phone keeps how late each of the last
   `FOLLOW.window` snapshots came, and waits long enough for `FOLLOW.cover` of them, plus the gap
   to the next one and a frame (`aim`). A steady line waits less (about 90 ms on good wifi), a
   bumpy one more. The wait eases toward that (`growRate`, `shrinkRate`) instead of jumping, and a
   hold (everyone on a card) doesn't count as a slow line. A snapshot later still: the others go
   on the way they were going for at most `FOLLOW.aheadMs` instead of freezing. `place` also gives
   friends and monsters the speed they're drawn moving at (`vx`, `vy`), so a friend plays their
   walk and faces the way they go.
   A friend is placed along their own steps rather than the server's clock (`placeByStep`, with
   the `ack` of each hero in every snapshot): the server plays their steps as they come, so on its
   clock they'd go now slower, now faster; their phone took one each 1/60 s, and they're drawn at
   that even pace. Shots aren't drawn in the past: they fly on your phone from the server's place
   (`stepOwn` moves them), so one never stops short or vanishes before it lands. Each shot is
   numbered by its thrower and throw (`fire`, `Hero.fired`), so the one your phone throws ahead of
   the server has the server's number: one shot on screen, not one that vanishes and another that
   takes its place.

`follow.test.ts` plays two phones, then three, and the server over a slow, uneven line (70 ms
each way, give or take 30) and checks that your hero is almost never pulled back, and that a
friend moves the same small way every frame. A snapshot is parsed plain and one walk puts back
the heroes, monsters, sets and endless numbers (`applySnapshot`): a reviver on every value cost
six times as much.

Only the server's events are played (sounds, hits, new rooms, loot), so nothing happens twice,
except your own: a swing, an ability, an SP move or a dodge, and the hits you land and the
monsters you fell in your own turn (a swing, a blast; not a shot's hit later in its flight, and
not a boss or a mid-boss: those wait for the server), show the moment they happen on your phone (`press` returns them), and the server's copy is skipped. The engine tags
those events with the hero who made them (`byOf`, `emitBy` in `engine.ts`). A hit's spark and
number are put where the monster is drawn, a moment in the past, not where the rules have it now. In developer mode the run shows `ping` (from pressing
a step to the server playing it) and how far back the others are drawn.
A friend's own news (their item, their pick) isn't played on your phone (`heard`). A level-up or
a chest comes to everyone at once, each with their own card ([../game/dungeon.md](../game/dungeon.md)).
Cards (a level's skills, a chest's items, the stairs) come only from the server: the `Follower`
drops any its own steps ask, since it would roll other choices than the server's. Your answer is
sent and applied at once; the server's next few snapshots may still ask the same card, so that
one card is ignored for `ANSWER_MS` (a new one shows). Each phone's recap is its own hero's end
(`overFor`), not the run's, which is the leader's. A card the server no longer asks (someone else took
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
| Draw the others further in the past (smoother on a bad line, but later) | `FOLLOW.cover`, `FOLLOW.marginMs` in `src/game/net/follow.ts` |
| Let the others keep going longer through a late snapshot | `FOLLOW.aheadMs` (`follow.ts`) |
| Show more of your own news at once (not a line later) | `emitBy` in the engine function that makes it (`engine.ts`) |
| Change how a correction to your hero glides | `FOLLOW.glidePx`, `FOLLOW.glideKeep` (`follow.ts`) |
| Change how the server waits for your steps | `NET.steady`, `NET.maxQueue`, `inputFor` and the extra turns in `tick` (`room.ts`) |
| Change the waiting screen | `PartyWait` in `src/components/FogRun.tsx` |
| Change how long a pass lasts | `play_pass_seconds` in `backend/app/config.py` |

Not done yet: a live "Try again".
