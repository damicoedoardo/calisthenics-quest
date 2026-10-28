'use client';

import { api } from './cloud-client';
import type { HeroSetup } from '@/game/dungeon/engine';
import type { Down, Start, Up } from '@/game/net/wire';

/* The phone's side of a live party run: a pass from the api, then a WebSocket to the game server
   (play/server.ts). The run itself is played in the scene (src/game/dungeon/scene.ts, net mode);
   this only carries messages. When live runs aren't set up, or the line can't be opened, the
   caller falls back to a practice run with bots. */

/** An open line to the party's live run, once it has begun. */
export interface PlayLink {
  start: Start;
  /** Your place in the run's order. */
  me: number;
  send: (m: Up) => void;
  /** The snapshots that came in since the last call, oldest first. */
  take: () => string[];
  /** The line dropped and couldn't come back (the run goes on for the others, played by the bot). */
  lost: () => boolean;
  close: () => void;
}

export interface Waiting {
  here: string[];
  need: string[];
}

/** Why there's no live run: not set up (or not signed in), or the line failed. */
export class NoLive extends Error {}

/** Ask for a pass, open the line, say hello, and wait for the run to begin. `onWait` hears who's in.
    `direct`: a server and pass already in hand (the lab, against a game server on this computer). */
export async function joinLive(hero: HeroSetup, onWait: (w: Waiting) => void, signal: AbortSignal, direct?: { url: string; token: string }): Promise<PlayLink> {
  if (direct) return open(direct.url, direct.token, hero, onWait, signal);
  let pass: { url: string; token: string };
  try {
    const r = await api('POST', '/party/play');
    if (!r.ok) throw new NoLive(`No live run (${r.status})`);
    pass = (await r.json()) as { url: string; token: string };
  } catch (e) {
    throw e instanceof NoLive ? e : new NoLive(String(e));
  }
  return open(pass.url, pass.token, hero, onWait, signal);
}

/** How many times a dropped line is opened again, and how long to wait between tries (ms). */
const RETRIES = 5;
const RETRY_MS = 1000;

function open(url: string, token: string, hero: HeroSetup, onWait: (w: Waiting) => void, signal: AbortSignal): Promise<PlayLink> {
  return new Promise((resolve, reject) => {
    const inbox: string[] = [];
    let ws: WebSocket | null = null,
      link: PlayLink | null = null,
      tries = 0,
      closed = false,
      gone = false;

    const connect = () => {
      ws = new WebSocket(url);
      ws.onopen = () => ws?.send(JSON.stringify({ t: 'hello', pass: token, hero } satisfies Up));
      ws.onmessage = (e) => {
        let m: Down;
        try {
          m = JSON.parse(String(e.data)) as Down;
        } catch {
          return;
        }
        tries = 0;
        if (m.t === 'wait') onWait({ here: m.here, need: m.need });
        else if (m.t === 'run') {
          inbox.push(m.s);
          // A phone that fell far behind only needs the newest few.
          if (inbox.length > 20) inbox.splice(0, inbox.length - 20);
        } else if (m.t === 'start') {
          if (link) return;
          link = {
            start: m.start,
            me: m.me,
            send: (u) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(u)),
            take: () => inbox.splice(0),
            lost: () => gone,
            close,
          };
          resolve(link);
        } else if (m.t === 'error') {
          gone = true;
          close();
          reject(new NoLive(m.text));
        }
      };
      ws.onclose = () => {
        if (closed) return;
        // Not begun yet: no run to go back to.
        if (!link) {
          close();
          return reject(new NoLive('The line to the live run closed'));
        }
        if (tries++ >= RETRIES) {
          gone = true;
          return;
        }
        setTimeout(() => !closed && connect(), RETRY_MS * tries);
      };
    };

    function close() {
      closed = true;
      ws?.close();
    }

    signal.addEventListener('abort', () => {
      close();
      reject(new NoLive('Left'));
    });
    connect();
  });
}
