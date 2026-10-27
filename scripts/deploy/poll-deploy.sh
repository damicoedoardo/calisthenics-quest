#!/usr/bin/env bash
#
# FORMA backend auto-deploy poller (runs on the server). Adapted from minlit's.
#
# Run every ~2 min by forma-deploy.timer. It pulls the api image from GHCR (a cheap manifest check
# when nothing changed) and, when the pulled image differs from the running one, swaps it in with
# a zero-downtime `docker rollout api`, then checks /health through Caddy.
#
# Failures: a pull that fails PULL_FAIL_THRESHOLD times in a row (likely a revoked GHCR token), a
# failed rollout, or a failing smoke check fail the unit; see `journalctl -u forma-deploy`.
# docker-rollout keeps the old container serving when a rollout fails.
#
# Auth: a prior `docker login ghcr.io` with a classic read:packages token (the package is private).

set -euo pipefail

COMPOSE_DIR="${FORMA_COMPOSE_DIR:-/root/forma}"
SERVICE="api"
IMAGE="${FORMA_API_IMAGE:-ghcr.io/damicoedoardo/forma-api:latest}"
# The public health address; read DOMAIN from .env when not given.
if [ -z "${FORMA_SMOKE_URL:-}" ]; then
  domain="$(grep -E '^DOMAIN=' "$COMPOSE_DIR/.env" 2>/dev/null | tail -n1 | cut -d= -f2- || true)"
  FORMA_SMOKE_URL="https://${domain:-localhost}/health"
fi
SMOKE_URL="$FORMA_SMOKE_URL"
# 5 failures in a row at a 2-min cadence is about 10 min of broken pulls.
PULL_FAIL_THRESHOLD="${FORMA_PULL_FAIL_THRESHOLD:-5}"
# /run is tmpfs: the counter resets on reboot.
PULL_FAIL_FILE="/run/forma-deploy.pull-failures"

log() { printf '%s forma-deploy: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

cd "$COMPOSE_DIR"

running_cid="$(docker compose ps -q "$SERVICE" 2>/dev/null | head -n1 || true)"
running_img=""
if [ -n "$running_cid" ]; then
  running_img="$(docker inspect -f '{{.Image}}' "$running_cid" 2>/dev/null || true)"
fi

if ! docker compose pull "$SERVICE" 2>&1 | while IFS= read -r line; do log "pull: $line"; done; then
  fails=$(( $(cat "$PULL_FAIL_FILE" 2>/dev/null || echo 0) + 1 ))
  echo "$fails" > "$PULL_FAIL_FILE"
  if [ "$fails" -ge "$PULL_FAIL_THRESHOLD" ]; then
    log "docker compose pull failed $fails times in a row: GHCR auth or network is broken; deploys are frozen until fixed."
    exit 1
  fi
  log "docker compose pull failed ($fails/$PULL_FAIL_THRESHOLD in a row). Leaving the current deployment alone."
  exit 0
fi
rm -f "$PULL_FAIL_FILE"

pulled_img="$(docker image inspect "$IMAGE" -f '{{.Id}}' 2>/dev/null || true)"
if [ -z "$pulled_img" ]; then
  log "Could not resolve the pulled image id for $IMAGE. Skipping."
  exit 0
fi

if [ "$running_img" = "$pulled_img" ]; then
  log "Up to date (${pulled_img#sha256:}). No deploy."
  exit 0
fi

log "New image: running ${running_img:-<none>}, pulled $pulled_img. Rolling out $SERVICE..."
docker rollout "$SERVICE"
log "Rollout complete."

for attempt in 1 2 3; do
  code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$SMOKE_URL" || echo 000)"
  if [ "$code" = "200" ]; then
    log "Smoke check OK ($SMOKE_URL -> 200)."
    break
  fi
  log "Smoke check attempt $attempt: $SMOKE_URL -> $code"
  if [ "$attempt" = "3" ]; then
    log "Smoke check still failing after the rollout."
    exit 1
  fi
  sleep 5
done

# Drop old images so the disk stays bounded; keep the one just replaced for an hour (rollback).
docker image prune -f --filter "until=1h" >/dev/null 2>&1 || true
