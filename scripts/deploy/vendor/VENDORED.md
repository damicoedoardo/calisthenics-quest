# Vendored: docker-rollout

- Source: https://github.com/wowu/docker-rollout
- Commit: a25ac4ce474e140d93625419ace38befa602d8c2
- License: MIT (see LICENSE)
- Vendored: 2026-07-04

Zero-downtime rollout plugin for Docker Compose. Vendored so server rebuilds
are reproducible instead of curling whatever upstream master is that day.
Install on the server:

    cp scripts/deploy/vendor/docker-rollout ~/.docker/cli-plugins/docker-rollout
    chmod +x ~/.docker/cli-plugins/docker-rollout

To upgrade: bump the files from a newer upstream commit, update this note,
and re-copy on the server.
