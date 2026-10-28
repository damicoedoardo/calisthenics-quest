---
type: conceptual
title: Server and deploys
description: FORMA's Hetzner server (separate from minlit's), the Docker Compose stack (Caddy, api, Postgres), and the GHCR image + systemd timer auto-deploy copied from minlit.
tags: [backend, ops, docker-compose, caddy, hetzner, ghcr]
timestamp: 2026-10-28
---

# Server and deploys

FORMA has its own server, apart from minlit's: the Hetzner project "Forma", server `forma`
(CX23, Helsinki, `204.168.131.244`), built from Hetzner's `docker-ce` image. Its firewall lets in
only SSH (22), HTTP (80), HTTPS (443), ping, and party voice (TCP 7881, UDP 7882). **Minlit's server is a different machine; nothing
here touches it.**

Its public addresses are https://api.formaquest.app and wss://voice.formaquest.app (`A api` and
`A voice` records in the formaquest.app DNS on Vercel). SSH is key-only (`/etc/ssh/sshd_config.d/00-forma-keys-only.conf`); Edoardo's Mac key
is the way in. If a key is ever lost: Hetzner console, Rescue, "Enable rescue & power cycle" with a
saved key, mount the disk and add the key to `/root/.ssh/authorized_keys`. A Hetzner rebuild can't
add a key and wipes the disk.

The web app stays on Vercel ([../dev/workflow.md](../dev/workflow.md)); the server runs only the
backend, as the Docker Compose stack in `docker-compose.yml`:

| Service | Reachable as | Notes |
|---|---|---|
| `caddy` | host `:80`, `:443` | The only public door. Gets the TLS certificate for `DOMAIN` itself (`caddy/Caddyfile`) |
| `livekit` | `livekit:7880` through Caddy at `VOICE_DOMAIN`; host TCP `7881`, UDP `7882` | Party voice ([friends.md](friends.md#party-voice)). Settings in `livekit/livekit.yaml`; the key pair (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`) in `.env`, shared with the api |
| `api` | `api:8000`, compose network only | The FastAPI app ([api.md](api.md)); image from GHCR |
| `postgres` | host `127.0.0.1:5432` only | Runs `backend/db/init.sql` on first boot; data in the `postgres_data` volume |

Settings live in `/root/forma/.env` on the server (template: `.env.example`), never in git.
`docker-compose.dev.yml` publishes the api on `localhost:8000` for local work.

## How code gets there

The same pipeline as minlit: a push to `main` that touches `backend/**` runs the tests and pushes
`ghcr.io/damicoedoardo/forma-api:latest` (`.github/workflows/deploy-backend.yml`). On the server,
`forma-deploy.timer` runs `scripts/deploy/poll-deploy.sh` every 2 minutes: when GHCR has a new
image it swaps it in with a zero-downtime `docker rollout api` and checks `/health` through
Caddy. Why the api has no host port and Caddy re-resolves `api` every 2s: two api containers run
side by side for a moment during a rollout.

Everything outside the image (compose file, Caddyfile, deploy scripts, database changes) is
applied by hand after a `git pull` on the server. The one-time setup and those steps are in
`scripts/deploy/README.md`.

Not set up yet: email alerts on a failed deploy, database backups, Hetzner's server backups.

## How to change things

| I want to... | Edit |
|---|---|
| Add a service (LiteLLM, next) | `docker-compose.yml`, `.env.example`, this page; then `docker compose up -d <service>` on the server |
| Change the public address | `DOMAIN` (api) or `VOICE_DOMAIN` (voice) in the server's `.env`, then restart `caddy` |
| Change how deploys run | `scripts/deploy/*`, `.github/workflows/deploy-backend.yml` |
