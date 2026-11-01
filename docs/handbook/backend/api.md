---
type: conceptual
title: API
description: The FastAPI app in backend/ — Supabase token check (JWKS), the save backup routes (GET/PUT/DELETE /save) and the rev rule that stops a stale phone overwriting newer progress, and POST /coach, the relay to the coach's LLM.
tags: [backend, api, auth, saves]
timestamp: 2026-11-01
---

# API

`backend/` is a small FastAPI app (Python 3.12, uv), the same shape as minlit's backend and
partly copied from it. The game itself never needs it: FORMA plays offline with the save on the
phone. The api adds what a phone can't do alone: a backup of the save tied to a login, and the coach's LLM (its keys must
live on a server).

| File | What |
|---|---|
| `backend/app/main.py` | The app: CORS for the web app's origins, the routers, `GET /health` |
| `backend/app/config.py` | Settings, read from `FORMA_*` environment variables |
| `backend/app/auth.py`, `auth_jwks.py` | Who is calling: checks the Supabase login token (copied from minlit) |
| `backend/app/saves.py` | Where saves are kept: `PgStore` (Postgres) and `MemoryStore` (tests), same rules |
| `backend/app/routes/save.py` | `GET`, `PUT`, `DELETE /save` |
| `backend/app/friends.py`, `routes/friends.py` | Friend cards and friendships: `PUT /me`, `/friends`; profiles: `/me/profile`, `/me/photo`, `/profiles/{id}/photo` ([friends.md](friends.md#profiles)); creates its tables on start |
| `backend/app/party.py`, `routes/party.py` | Parties: invite, join, ready, zone, start (`/party...`, [friends.md](friends.md#parties)); creates its tables on start |
| `backend/app/voice.py` | The party voice pass for `POST /party/voice` ([friends.md](friends.md#party-voice)) |
| `backend/app/play.py` | The live run pass for `POST /party/play` ([live-runs.md](live-runs.md)); `FORMA_PLAY_URL`, `FORMA_PLAY_SECRET` |
| `backend/app/gifts.py`, `routes/gifts.py` | Forge materials friends give each other: `POST /gifts`, `GET /gifts`, `POST /gifts/claim` ([friends.md](friends.md)); creates its table on start |
| `backend/app/cheers.py`, `routes/cheers.py` | Cheers between friends: `POST /cheers`, `POST /cheers/take` ([friends.md](friends.md#cheers)); creates its table on start |
| `backend/app/feed.py`, `routes/feed.py` | The workout feed: posts, photos, flames, comments (`/feed...`, [friends.md](friends.md#the-feed)); creates its tables on start |
| `backend/app/coach.py`, `routes/coach.py` | `POST /coach`: the coach's rules (`SYSTEM`), its tools (`TOOLS`), the call to the LLM through the LiteLLM proxy, and a daily cap per player; creates its table on start (below) |
| `backend/db/init.sql` | The schema, run by Postgres on first boot |
| `backend/tests/` | pytest: the save rules and the token check, no database needed |

## The coach

`POST /coach` takes `{brief, messages}` and returns `{message, finish_reason, left_today}`. The
phone keeps all the coach's memory and the chat (OpenAI style messages) and sends a short brief
with each call ([../game/coach.md](../game/coach.md)); the server adds the fixed rules and the tool
list, asks the model once, and hands its message back. When that message calls tools, the phone
runs them and calls again with the results. So the server keeps no chat and no save.

- **Model**: `LiteLLMModel` posts to the LiteLLM proxy on the server (`FORMA_LITELLM_URL`, under
  `FORMA_LITELLM_KEY`, the proxy's master key) for the alias `forma-coach` (`FORMA_COACH_MODEL`).
  `litellm-config.yaml` maps the alias to the real model on OpenRouter, the same setup as minlit
  ([server.md](server.md)). No key: the route answers 503 and the app says the coach is off.
- **Cap**: `coach_usage` counts each player's messages (`turns`, a `user` message) and model calls
  (`calls`, tool results included) per UTC day; past `coach_turns_per_day` (40) or
  `coach_calls_per_day` (200) it answers 429. A chat over `max_coach_bytes` is 413.
- **Errors**: a provider error is logged and answered 502 with a plain line, never the provider's
  text; a `content_filter` finish becomes a kind line from the coach.
- Tests use a fake model (`tests/test_coach.py`), as other routes use memory stores.

## Login

Supabase does the login (its own `forma` project, not minlit's) and signs a token; the api only
checks it, with Supabase's public keys (JWKS), and never issues tokens. Every `/save`, `/me`, `/profiles`, `/friends`, `/gifts`, `/cheers` and `/feed` route needs
`Authorization: Bearer <token>`; the player is the token's `sub`.

## The save rules

One row per player in `saves`: the whole `GameState` as JSON (see
[../architecture/game-state.md](../architecture/game-state.md)), its `version`, the workout count,
and `rev`, which goes up by one on every write.

- `PUT /save` sends `{data, base_rev}`: the rev the phone last saw (`null` for the first upload).
  If the cloud is still on that rev, the save is written and the new rev comes back. If not
  (another phone saved since), nothing is written and the answer is **409 with the cloud copy**, so
  the app can ask which one to keep. Keeping the phone's means sending it again on the cloud's rev.
- A save must look like one (a whole-number `version` and a `sessions` list) and stay under
  `max_save_bytes`.
- `DELETE /save` removes the cloud copy; the phone keeps its own.

## Running it

```bash
cd backend
uv sync
uv run pytest                     # tests, no database
uv run ruff check app tests
docker compose up -d postgres     # from the repo root, for a real database
FORMA_DATABASE_URL=postgresql://forma:forma_dev@127.0.0.1:5432/forma uv run uvicorn app.main:app --reload
```

CI runs lint and tests on PRs that touch `backend/` (`.github/workflows/backend.yml`).

## How to change things

| I want to... | Edit |
|---|---|
| Add a route | a new file in `backend/app/routes/`, included in `main.py`, tests in `backend/tests/` |
| Change the table | a new `backend/db/migrate_<date>_<what>.sql`, the same change in `init.sql`; apply by hand on the server ([server.md](server.md)). Friends tables are made by the api on start instead ([friends.md](friends.md)) |
| Allow another web origin | `cors_origins` / `cors_origin_regex` in `config.py`, or `CORS_ORIGINS` in the server's `.env` |
| Add a setting | `config.py` (`FORMA_` prefix), `docker-compose.yml` (`api` environment), `.env.example` |
