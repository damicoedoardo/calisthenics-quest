# FORMA server: setup and auto-deploy

The FORMA backend runs on one server as the Docker Compose stack in `docker-compose.yml`
(Caddy, the FastAPI `api`, Postgres), the same shape as minlit's droplet. A push to `main` that
touches `backend/**` runs the backend tests, then builds `ghcr.io/damicoedoardo/forma-api:latest`
(`.github/workflows/deploy-backend.yml`). The server polls GHCR every ~2 minutes and swaps a new
image in with a zero-downtime `docker rollout api`, then checks `https://<DOMAIN>/health`.

Application code ships inside the image. Changes to `docker-compose.yml`, `caddy/Caddyfile` or
these scripts need a manual `git pull` on the server (below). The game server is the exception: it
is built on the server from the repo (Live party runs, below).

| File | Role |
|---|---|
| `.github/workflows/deploy-backend.yml` | main: backend tests, then build and push the image |
| `.github/workflows/backend.yml` | PRs: backend lint and tests |
| `scripts/deploy/poll-deploy.sh` | server: pull, roll out on a new digest, smoke check, prune |
| `scripts/deploy/forma-deploy.{service,timer}` | systemd: run the poller every 2 minutes |
| `scripts/deploy/vendor/docker-rollout` | the rollout plugin, pinned (see `VENDORED.md`) |

## One-time server setup

Needs: a Linux server with Docker and the compose plugin, ports 80 and 443 open, and a DNS A
record for the api domain pointing at it.

```bash
# 0. The repo at /root/forma
git clone https://github.com/damicoedoardo/calisthenics-quest /root/forma
cd /root/forma

# 1. The rollout plugin
mkdir -p ~/.docker/cli-plugins
cp scripts/deploy/vendor/docker-rollout ~/.docker/cli-plugins/docker-rollout
chmod +x ~/.docker/cli-plugins/docker-rollout

# 2. GHCR: the image is public, so no login is needed. If it is ever made private again, log in
#    with a CLASSIC token with only read:packages (GHCR doesn't take fine-grained tokens):
#    echo "$GHCR_PAT" | docker login ghcr.io -u damicoedoardo --password-stdin

# 3. Settings
cp .env.example .env    # then fill in DOMAIN (api.formaquest.app), POSTGRES_PASSWORD, the Supabase URLs

# 4. The deploy timer
cp scripts/deploy/forma-deploy.service scripts/deploy/forma-deploy.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now forma-deploy.timer

# 5. Start
docker compose pull api && docker compose up -d
curl https://<DOMAIN>/health    # {"status":"ok"}
```

The first image exists once a backend change has landed on `main` (or run the "Deploy backend"
workflow by hand from GitHub Actions).

## Applying infra changes later

```bash
cd /root/forma && git pull
# compose:          docker compose up -d <changed services>   (api: prefer `docker rollout api`)
# caddy/Caddyfile:  docker compose exec -w /etc/caddy caddy caddy reload --config /etc/caddy/Caddyfile
# *.sh:             nothing, the units run them from the repo
# *.service/*.timer: copy to /etc/systemd/system again, then systemctl daemon-reload
# db changes:       docker compose exec -T postgres psql -U forma forma < backend/db/migrate_<file>.sql
```

## Party voice (one time)

LiveKit (`livekit` in `docker-compose.yml`) needs its own address and two open ports:

1. DNS: an `A voice` record pointing at the server (formaquest.app DNS on Vercel).
2. Hetzner firewall: let in TCP 7881 and UDP 7882 from anywhere.
3. On the server:

```bash
cd /root/forma && git pull
cat >> .env <<EOF2
VOICE_DOMAIN=voice.formaquest.app
LIVEKIT_URL=wss://voice.formaquest.app
LIVEKIT_API_KEY=forma
LIVEKIT_API_SECRET=$(openssl rand -hex 32)
EOF2
docker compose up -d livekit caddy   # caddy is recreated to see VOICE_DOMAIN
docker rollout api                    # the api picks up the LIVEKIT_ settings
curl -s https://voice.formaquest.app  # "OK"
```

## Live party runs (one time)

The game server (`play` in `docker-compose.yml`, code in `play/`) runs the one real run for a
party; phones reach it at `wss://<DOMAIN>/play` through Caddy, so no new DNS record or port. The
api signs a pass for each party member with a secret both share. Until `PLAY_SECRET` is set, the
api answers 503 and parties play with bots, as before.

```bash
cd /root/forma && git pull
cat >> .env <<EOF2
PLAY_URL=wss://api.formaquest.app/play
PLAY_SECRET=$(openssl rand -hex 32)
EOF2
docker compose up -d --build play                                               # the game server
docker compose exec -w /etc/caddy caddy caddy reload --config /etc/caddy/Caddyfile   # the /play route
docker rollout api                                                              # the api reads PLAY_*
curl -s https://api.formaquest.app/play/health                                  # {"ok":true,"rooms":0}
```

After that the poller keeps it current: when `play/`, `src/` or `scripts/ts-hooks.mjs` change on
`main`, it fast-forwards the repo and runs `docker compose up -d --build play` (ending the runs
going on at that moment). `docker compose logs -f play` shows it.

## Looking around

```bash
systemctl list-timers forma-deploy.timer      # next poll
journalctl -u forma-deploy.service -n 50      # recent polls and deploys
systemctl start forma-deploy.service          # poll now
docker compose logs -f api                    # the api's log
docker compose exec postgres psql -U forma forma -c 'select user_id, workouts, rev, updated_at from saves'
```

Not here yet (minlit has them): email alerts on a failed deploy, and database backups.
