---
type: conceptual
title: API
description: The FastAPI app in backend/ — Supabase token check (JWKS), the save backup routes (GET/PUT/DELETE /save) and the rev rule that stops a stale phone overwriting newer progress.
tags: [backend, api, auth, saves]
timestamp: 2026-10-27
---

# API

`backend/` is a small FastAPI app (Python 3.12, uv), the same shape as minlit's backend and
partly copied from it. The game itself never needs it: FORMA plays offline with the save on the
phone. The api adds what a phone can't do alone: a backup of the save tied to a login, and later
the workout planner (the LLM key must live on a server).

| File | What |
|---|---|
| `backend/app/main.py` | The app: CORS for the web app's origins, the routers, `GET /health` |
| `backend/app/config.py` | Settings, read from `FORMA_*` environment variables |
| `backend/app/auth.py`, `auth_jwks.py` | Who is calling: checks the Supabase login token (copied from minlit) |
| `backend/app/saves.py` | Where saves are kept: `PgStore` (Postgres) and `MemoryStore` (tests), same rules |
| `backend/app/routes/save.py` | `GET`, `PUT`, `DELETE /save` |
| `backend/app/friends.py`, `routes/friends.py` | Friend cards and friendships: `PUT /me`, `/friends` ([friends.md](friends.md)); creates its tables on start |
| `backend/app/gifts.py`, `routes/gifts.py` | Forge materials friends give each other: `POST /gifts`, `GET /gifts`, `POST /gifts/claim` ([friends.md](friends.md)); creates its table on start |
| `backend/db/init.sql` | The schema, run by Postgres on first boot |
| `backend/tests/` | pytest: the save rules and the token check, no database needed |

## Login

Supabase does the login (its own `forma` project, not minlit's) and signs a token; the api only
checks it, with Supabase's public keys (JWKS), and never issues tokens. Every `/save`, `/me`, `/friends` and `/gifts` route needs
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
