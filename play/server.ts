import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { Room } from '../src/game/net/room';
import type { Down, Up } from '../src/game/net/wire';
import { readPass } from './pass';

/* The game server: one live run per party start, played by the same engine as the phones
   (src/game/net/room.ts), 60 steps a second, the run sent back 20 times a second. Caddy brings
   wss://<api domain>/play here. Rooms live in memory: a restart ends the runs going on. */

const PORT = Number(process.env.PORT ?? 8090);
const SECRET = process.env.PLAY_SECRET ?? '';
const STEP_MS = 1000 / 60;
/** Steps between snapshots: 3 is 20 a second. */
const SEND_EVERY = 3;

const rooms = new Map<string, Room>();
const sockets = new Map<string, Map<string, WebSocket>>();

const send = (ws: WebSocket, m: Down) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(m));
const everyone = (key: string, m: Down) => {
  const text = JSON.stringify(m);
  for (const ws of sockets.get(key)?.values() ?? []) if (ws.readyState === ws.OPEN) ws.send(text);
};

const http = createServer((req, res) => {
  if (req.url?.endsWith('/health')) {
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ server: http, path: '/play', perMessageDeflate: { threshold: 512 }, maxPayload: 64 * 1024 });

wss.on('connection', (ws) => {
  let key = '',
    user = '';
  ws.on('message', (data) => {
    let m: Up;
    try {
      m = JSON.parse(String(data)) as Up;
    } catch {
      return;
    }
    if (m.t === 'hello') {
      const pass = readPass(m.pass, SECRET);
      if (!pass) return send(ws, { t: 'error', text: 'That pass is no good. Start again from the lobby.' });
      key = `${pass.party}:${pass.seed}`;
      user = pass.sub;
      let room = rooms.get(key);
      if (!room) rooms.set(key, (room = new Room(pass.users, pass.zone, pass.seed)));
      if (!room.join(user, m.hero, Date.now() / 1000)) return send(ws, { t: 'error', text: 'This run already started without you.' });
      if (!sockets.has(key)) sockets.set(key, new Map());
      sockets.get(key)!.get(user)?.close();
      sockets.get(key)!.set(user, ws);
      // Back in a run already going: it starts again on this phone.
      if (room.started) send(ws, { t: 'start', start: room.started, me: room.placeOf(user) });
      else everyone(key, { t: 'wait', here: room.here, need: room.users });
      return;
    }
    rooms.get(key)?.take(user, m);
  });
  ws.on('close', () => {
    const room = rooms.get(key);
    if (!room) return;
    if (sockets.get(key)?.get(user) === ws) sockets.get(key)!.delete(user);
    room.leave(user, Date.now() / 1000);
    if (!room.run) everyone(key, { t: 'wait', here: room.here, need: room.users });
  });
});

// The clock: every room steps on real time, and catches up a few steps when the box was slow.
let last = Date.now(),
  steps = 0;
setInterval(() => {
  const now = Date.now();
  let due = Math.min(6, Math.floor((now - last) / STEP_MS));
  last += due * STEP_MS;
  if (now - last > 200) last = now;
  for (const [key, room] of rooms) {
    if (room.due(now / 1000)) {
      const start = room.begin();
      for (const [u, ws] of sockets.get(key) ?? []) send(ws, { t: 'start', start, me: room.placeOf(u) });
    }
  }
  while (due-- > 0) {
    steps++;
    for (const [key, room] of rooms) {
      if (!room.run) continue;
      room.tick(Date.now() / 1000);
      if (steps % SEND_EVERY === 0 || room.run.over) everyone(key, { t: 'run', s: room.snapshot() });
      if (room.done) {
        rooms.delete(key);
        // Give the last snapshot a moment, then let the phones go.
        const gone = sockets.get(key);
        sockets.delete(key);
        setTimeout(() => gone?.forEach((ws) => ws.close()), 3000);
      }
    }
  }
  // A room nobody came back to in time.
  for (const [key, room] of rooms) if (!room.run && room.here.length === 0) rooms.delete(key);
}, 8);

http.listen(PORT, () => console.log(`play: listening on ${PORT}`));
