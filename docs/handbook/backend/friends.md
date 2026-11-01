---
type: conceptual
title: Friends
description: Friend codes, asks and accepts, profiles (photo, where you live, a line), who is online, training, in the Fog or trained today, cheers mid-workout, the workout feed, and parties (invite, lobby, ready, start, practice run) — the tables, the /me, /friends and /party routes, and the screens.
tags: [backend, friends, social, co-op, voice, livekit, cheers, feed, profile, photo]
timestamp: 2026-11-01
---

# Friends

The first step of co-op (plan: the "FORMA co-op: friends, party and the first shared world" doc,
project thread "Explore multiplayer dungeon runs with friends"). Friends need sign-in; the game
itself never does.

## What a friend sees

Each player has a public **card** on the server: the hero's name (from the save, asked after the look in the opening; older saves are asked on the Friends card), class, level,
look and worn gear tiers, when they last trained, and whether the app is open (`online`), in a
run (`playing`, the zone's name) or in a workout (`training`, the plan's name, `trainingLabel` in
`src/lib/cheers.ts`). Nothing else of the save is shared. A friend shows as:

- **Training now: <workout>** while they work out, **In the Fog: <world>** while their run is
  going, **Online** while the app is open, else **Seen 2 h ago**. Over the hero a small bubble
  says it at a glance in pixel icons: a dumbbell while training, swords in the Fog, nothing otherwise (`Doing`
  in `Friends.tsx`).
- A flame and **trained today** when their last workout was on this phone's today. This is the
  part that nudges friends to train.

Accepted friends also get your **profile** (below): a photo, where you live and a line about you.

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
| `src/components/Friends.tsx` | `useFriendsBeat` and `useFriends` (both in `page.tsx`: the list, refreshed every 20 s on the Friends tab and every minute elsewhere for the tab's online count, with sample friends in the sandbox) and `FriendsCard` (the Friends tab, `FriendsTab.tsx`) |

- **Heartbeat:** while signed in and the app is visible, `useFriendsBeat` sends your card with
  `PUT /me` every 30 s, when the app comes back to the front, and when a run starts or ends. The
  server counts a player seen in the last 75 s as online. A locked iPhone can't send anything, so
  online honestly means "app open".
- **Tables** (`profiles`, `friends`): the api creates them on start (`CREATE ... IF NOT EXISTS`),
  so a deploy needs no hand-run SQL; they are in `db/init.sql` too. A friendship is one row
  `(a, b)`: `a` asked, `accepted` once `b` says yes.
- An invite link opened before sign-in keeps the code in `localStorage` and adds the friend once
  you're signed in.

## Profiles

Each player can tell friends a little about themselves, all optional and minimal (Edoardo
2026-11-01): a **photo**, **where you live** (one line, up to 40 letters) and **a few words about
you** (up to 140). You fill it in on the You page (`ProfileEdit` in `Profile.tsx`, signed in only,
"Only your friends see it"). A friend's profile opens when you tap them: their hero or name in the
friends list, their name in the camp's panel (after tapping them at the fire), or their hero and
name on a feed post: each calls `openProfile`, and one `ProfileHost` in the Friends tab shows
`ProfilePage`. It shows the photo with their hero at its corner (no photo: the hero, big), name,
class, level and where they live, what they're doing now, their line; then **Cheer** (while they
train, `CheerPage`) or **Party**, and **Gift** (`GiveMats`), the same as their row; then how they
**train** (workouts in all, this week against the weekly goal, the weekly streak, and the three
exercises they did most); then their **latest posts** (up to 3, from the feed, as `PostCard`s).

- **How they train** comes from their save, not typed: `trainingStats` in `src/lib/friends.ts`
  goes on the card with every heartbeat (`stats` in `PUT /me`, the `stats` jsonb column). "Does
  most" counts the exercises with two sets or more (not the warm-up and stretch taps) over the
  last 20 workouts. The card carries the week's Monday (`week_of`), so `statsNow` shows 0 for a
  week that is over and drops a streak whose last week missed the goal, when a friend hasn't
  opened the app for a while.

- **Who sees what:** only you and your accepted friends. `card_json(..., friend=True)` adds
  `place`, `about`, `photo` and `stats` for accepted friends in `GET /friends` and for post authors in
  the feed; an ask (either way) gets the card without them. `GET /profiles/{id}/photo` is 404 for
  anyone else, as if there were no photo. Unfriending hides it again.
  The party lobby's cards (`routes/party.py`) leave the profile out.
- **The photo**: tapping the square opens the front camera (a selfie, turned as above); "From your photos" opens the camera roll. It is cropped to the middle square and made small on the phone (`shrinkPhoto(file,
  {square: true, ...})` in `feed-client.ts`: 480 px, a JPEG under 200 KB) and sent as base64. The
  server keeps only JPEGs, one per player, in `profile_photos` (Postgres, made on start). The card's
  `photo` is the time it last changed, so the app fetches it again (`profilePhotoUrl` in
  `friends-client.ts`, a blob link, as photos need sign-in) only when it is new.
- Limits: `PROFILE_LIMIT` in `src/lib/friends.ts`; the server's copies are `PLACE`, `ABOUT`,
  `PHOTO_BYTES` in `routes/friends.py`, keep them the same.
- In the sandbox Ana has a profile with a sample (drawn) photo, stats and posts, and Ben a place, stats and a post (and he is training: Cheer); the You page
  saves on the screen only.

| File | What |
|---|---|
| `backend/app/friends.py` | Columns `place`, `about`, `photo_at`, `stats` on `profiles`, table `profile_photos`; `set_about`, `set_photo`, `photo` |
| `backend/app/routes/friends.py` | `PUT /me/profile`, `PUT /me/photo`, `DELETE /me/photo`, `GET /profiles/{id}/photo`; `profile_json` |
| `backend/tests/test_profile.py` | Friends see it, asks and strangers don't, photo rules, limits |
| `src/components/Profile.tsx` | `ProfilePhoto`, `openProfile` and `ProfileHost`, `ProfilePage`, `ProfileEdit` |
| `src/lib/friends.ts` | `trainingStats`, `statsNow`, `PROFILE_LIMIT` |

## Parties

Up to 4 friends (`MAX_PARTY`) go into the Fog together. The **leader** invites friends (the
Party button on a friend's row, or Invite in the lobby), picks the zone among the ones open to
them, and starts once everyone else taps ready. A **start** is a seed and a time on the party:
every phone sees it on its next look and walks in (`startToJoin` in `src/lib/party.ts`, run from
`page.tsx`, played once per phone, `forma-party-played-v1`); then the party is back in its lobby
with the ready flags cleared. The first attempt is a **live run** on the game server, everyone in
one run ([live-runs.md](live-runs.md)); when that isn't there (not set up, offline) each phone
plays a **practice run**: you, with bots playing your friends' heroes (see
[../game/dungeon.md](../game/dungeon.md)). A
party run (from the **Friends** tab) keeps its loot and co-op materials but never moves the story:
only Story runs clear a zone (`page.tsx`, `onEnd`). The lobby also lists the **Ember Road**'s chapters up to the one the leader is on (before you set out, a line points to the
Friends tab's "Set out on the road") (sent to the server as zone `20 + chapter`, `partyCode`/`zoneByCode` in `src/lib/fog.ts`); beating a road boss there moves the road on for each hero on that chapter (`wonRoad`, see [../game/story.md](../game/story.md)). Friends, invites and the lobby button live
on the Friends tab.

| File | What |
|---|---|
| `backend/app/party.py` | Tables `parties`, `party_members`, `party_invites` (made on start), `PgStore`, `MemoryStore` |
| `backend/app/routes/party.py` | `GET /party`, `POST /party/invite`, `/join`, `/decline`, `/leave`, `/start`, `PUT /party/ready`, `/zone` |
| `backend/tests/test_party.py` | Invite, join, ready, start; only friends; only the leader; leaving |
| `src/lib/party.ts`, `party-client.ts` | Types, `startToJoin`, `canStart`; the calls and the shared party view (`usePartyView`; an answer that comes back after a newer one is dropped, so a poll sent just before Join can't bring the invite back), the lobby's open flag |
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

## Cheers

A friend who is working out can be cheered on. Their row in the Friends card shows **Cheer**
instead of Party; it opens a page (`CheerPage`
in `Friends.tsx`) with a box for your own words and quick lines with their name in ("Push, Ben!")
that only fill the box. **Send** stores it on the server; their phone looks for cheers every 8 s
during a workout and every minute otherwise (`useCheers` in `Cheers.tsx`, in `page.tsx`) and
shows each one at the top, over the workout too: your hero, "<name> cheers you on" and your line
(`CheerToast`, 6 s, a tap closes it). Each cheer shows once. In gym mode, mid-workout, it is a plain grey card (`plain`: the name and the words, no hero), see [../app/screens.md](../app/screens.md#gym-mode-a-plain-look-for-training).

- Only to an accepted friend, at most 80 letters, at most 20 a day from one friend to another
  (`CHEER_LIMIT` in `src/lib/cheers.ts`; the server's copies are `PER_DAY` and `LENGTH` in
  `routes/cheers.py`, keep them the same). Over it, 429.
- A friend sees a cheer only while the app is open (it is, during a workout); there are no phone
  notifications yet. The cheers of a workout also show on its feed post.
- In the sandbox Ben is training (tap Cheer to see the page) and a workout gets a sample cheer from
  Ana after 4 s.

| File | What |
|---|---|
| `backend/app/cheers.py` | Table `cheers` (made on start), `PgStore`, `MemoryStore` |
| `backend/app/routes/cheers.py` | `POST /cheers` (send), `POST /cheers/take` (what waits, each once) |
| `backend/tests/test_cheers.py` | Send and see once, only friends, not empty, so many a day, `training` on the card |
| `src/lib/cheers.ts` | Pure: the limits, `quickCheers`, `cleanCheer`, `trainingLabel` |
| `src/components/Cheers.tsx` | `useCheers` and `CheerToast` |

## The feed

Finished workouts, shared with friends. After a workout the loot card has **Share with friends**
(signed in only): it opens `SharePage` (`Feed.tsx`) with the workout as a card (the coach's name
for the day or "A workout", minutes, sets and exercises without the warm-up and the stretch:
`workoutCard` in `src/lib/feed.ts`, built in `page.tsx` when the workout ends), a line about it,
and a photo if you like. **Share** sends it; then the app opens the Feed.

The **Feed** is the second half of the Friends tab (a Friends | Feed switch at the top,
`FriendsTab.tsx`; `?tab=friends&feed` in the sandbox, and the "The Feed" jump on `/lab/night`).
Each post shows the hero and name, how long ago, the workout card, the line, the photo, who
cheered during that workout ("Cheered on by Ana"), a flame button with its count, and the
comments with a box to add one. You can delete your own posts and comments, and any comment on
your own post (no browser pop-up: Delete then Delete or Keep). The Feed button, and the Friends
tab when no friend is online, get an orange dot for friends' posts since you last opened it
(`newPosts`, `forma-feed-seen-v1` in localStorage). It refreshes every 30 s while open, every 2
minutes otherwise (`useFeed`).

- **Who sees what:** your posts, photos and comments only reach you and your accepted friends.
  Anyone else gets 404, as if the post weren't there. Unfriending hides each other's posts.
- **The photo** is made small on the phone (`shrinkPhoto` in `feed-client.ts`: at most 1080 px
  on its long side, a JPEG under 600 KB, lower quality until it fits) and sent as base64. The
  server keeps only JPEGs (checks the first bytes) in `post_photos` (Postgres). The phone reads
  the photo through an `<img>` (`upright`), which follows the camera's turn-and-flip note the way
  the camera roll does (`createImageBitmap` didn't on iPhone). A **selfie** is turned on its own to look the way you
  saw yourself in the camera (Edoardo 2026-11-01, no flip button). The share page has **Selfie**
  (opens the front camera, `capture="user"`) and **Photo** (the usual picker). A photo taken in
  the usual picker carries no lens name on iPhone, so it can't be told apart; the Selfie button
  is how a selfie is known (`shrinkPhoto(..., {selfie: true})`). From the camera roll,
  `fromFrontCamera` in `feed.ts` reads the JPEG's EXIF lens name ("... front camera ..."). A photo needs
  sign-in, so the app fetches it into a blob link when its post nears the screen (`photoUrl`).
- **Cheers on the post:** the server adds the friends who cheered you since the workout started
  (at most 6 h back; `senders_since` in `cheers.py`).
- Limits: a line up to 280 letters, a comment up to 200, 5 posts a day (`FEED_LIMIT` in
  `src/lib/feed.ts`; the server's copies are `TEXT`, `COMMENT`, `PHOTO_BYTES`, `PER_DAY` in
  `routes/feed.py`, keep them the same). There are no notifications for comments yet.

| File | What |
|---|---|
| `backend/app/feed.py` | Tables `posts`, `post_photos`, `post_flames`, `post_comments` (made on start), `PgStore`, `MemoryStore` |
| `backend/app/routes/feed.py` | `POST /feed`, `GET /feed?before=`, `GET /feed/{id}/photo`, `POST /feed/{id}/flame`, `POST /feed/{id}/comments`, `DELETE /feed/{id}`, `DELETE /feed/comments/{id}` |
| `backend/tests/test_feed.py` | Share and friends see it, strangers don't, flames, comments, deleting, cheers on the post, photos and limits |
| `src/lib/feed.ts` | Pure: types, `FEED_LIMIT`, `workoutCard`, `workoutLine`, `newPosts`, `cleanLine` |
| `src/lib/feed-client.ts` | The calls, `photoUrl`, `shrinkPhoto` |
| `src/components/Feed.tsx` | `useFeed` (in `page.tsx`), `FeedView`, `PostCard`, `PostPhoto`, `SharePage`; two sample posts in the sandbox |

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
| Add a field to the profile, or change what it shows | `profile_json` and `About` in `routes/friends.py`, a column in `friends.SCHEMA` + `init.sql`, `Profile` in `src/lib/friends.ts`, `ProfilePage`/`ProfileEdit` in `Profile.tsx` |
| Change the photo's size | `PROFILE_LIMIT` in `src/lib/friends.ts` and `PHOTO_BYTES` in `routes/friends.py` |
| Change when someone counts as online | `ONLINE_FOR` (server) and `BEAT_MS` (app) |
| Change the party size | `MAX_PARTY` in `backend/app/party.py` and `src/lib/party.ts` (and `max_participants` in `livekit/livekit.yaml`) |
| Change the voice buttons | `VoiceBar`, `PartyButton` and the member cards in `Party.tsx` |
| Change what a voice pass allows | `voice_pass` in `backend/app/voice.py` |
| Change how much can be given a day | `GIFTS.perDay` in `src/balance/upgrades.ts` and `PER_DAY` in `backend/app/routes/gifts.py` |
| Change the gift picker | `GiveMats` in `Friends.tsx` |
| Change the cheer page or the quick lines | `CheerPage` in `Friends.tsx`, `quickCheers` in `src/lib/cheers.ts` |
| Change how a cheer pops up, or how often the app looks | `CheerToast`, `FAST_MS`/`SLOW_MS`/`SHOW_MS` in `Cheers.tsx` |
| Change how many cheers a day, or how long | `CHEER_LIMIT` in `src/lib/cheers.ts` and `PER_DAY`/`LENGTH` in `backend/app/routes/cheers.py` |
| Change the bubble over a friend's hero | `Doing` in `Friends.tsx` |
| Change what a post shows | `PostCard` in `Feed.tsx`; the workout card in `workoutCard` (`src/lib/feed.ts`) |
| Change the share page | `SharePage` in `Feed.tsx`; its button in `AfterSession.tsx` |
| Change the feed's limits or photo size | `FEED_LIMIT` in `src/lib/feed.ts` and the constants in `backend/app/routes/feed.py` |
