# FORMA server: setup and auto-deploy

The FORMA backend runs on one server as the Docker Compose stack in `docker-compose.yml`
(Caddy, the FastAPI `api`, Postgres), the same shape as minlit's droplet. A push to `main` that
touches `backend/**` runs the backend tests, then builds `ghcr.io/damicoedoardo/forma-api:latest`
(`.github/workflows/deploy-backend.yml`). The server polls GHCR every ~2 minutes and swaps a new
image in with a zero-downtime `docker rollout api`, then checks `https://<DOMAIN>/health`.

Application code ships inside the image. Changes to `docker-compose.yml`, `caddy/Caddyfile` or
these scripts need a manual `git pull` on the server (below).

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

# 2. GHCR read access (the image is private). A CLASSIC token with only read:packages;
#    GHCR doesn't take fine-grained tokens.
echo "$GHCR_PAT" | docker login ghcr.io -u damicoedoardo --password-stdin

# 3. Settings
cp .env.example .env    # then fill in DOMAIN, POSTGRES_PASSWORD, the Supabase URLs

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

## Looking around

```bash
systemctl list-timers forma-deploy.timer      # next poll
journalctl -u forma-deploy.service -n 50      # recent polls and deploys
systemctl start forma-deploy.service          # poll now
docker compose logs -f api                    # the api's log
docker compose exec postgres psql -U forma forma -c 'select user_id, workouts, rev, updated_at from saves'
```

Not here yet (minlit has them): email alerts on a failed deploy, and database backups.
