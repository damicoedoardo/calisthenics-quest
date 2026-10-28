# The game server for live party runs (play/server.ts). Built on the server from the repo:
# `docker compose up -d --build play` (scripts/deploy/README.md). It runs the app's own engine
# (src/game) as TypeScript, which Node reads as-is; the only package it needs is ws.
FROM node:22-alpine

WORKDIR /app

COPY play/package.json ./play/
RUN cd play && npm install --omit=dev --no-audit --no-fund

COPY scripts/ts-hooks.mjs ./scripts/
COPY src/ ./src/
COPY play/ ./play/

WORKDIR /app/play
ENV PORT=8090
EXPOSE 8090
HEALTHCHECK --interval=10s --timeout=5s --retries=3 CMD wget -qO- http://localhost:8090/health || exit 1
CMD ["node", "--no-warnings", "--import", "./register.mjs", "server.ts"]
