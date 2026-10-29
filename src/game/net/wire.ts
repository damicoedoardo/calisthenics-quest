import { createRun, type Foe, type Hero, type HeroSetup, type Input, type Run, type GameEvent } from '../dungeon/engine';
import type { RelicId } from '../dungeon/content';
import type { ItemSlot } from '../dungeon/items';
import { zoneByCode, type UpgradeId } from '@/lib/fog';

/* What goes between a phone and the game server (play/server.ts) in a live party run. The server
   plays the one real run (room.ts); phones send what they press and get the run back. Plain JSON
   over a WebSocket. Pure: no sockets here. */

/** One engine step's input, numbered by the phone, so the server can say which it has played. */
export interface Press extends Input {
  seq: number;
}

/** Phone to server. */
export type Up =
  /** First thing on a new socket: the pass from the api and the hero you walk in as. */
  | { t: 'hello'; pass: string; hero: HeroSetup }
  /** The steps pressed since the last message. */
  | { t: 'in'; steps: Press[] }
  | { t: 'pick'; id: UpgradeId }
  | { t: 'relic'; id: RelicId }
  | { t: 'stairs'; choice: 'deeper' | 'leave' | 'stay' }
  | { t: 'wear'; id: string }
  | { t: 'takeOff'; slot: ItemSlot }
  | { t: 'drop'; id: string }
  /** You left the run: it ends for the whole party. */
  | { t: 'quit' };

/** The run as everyone starts it: the same as createRun gets, so each phone can build its own copy. */
export interface Start {
  /** The zone as the party keeps it (partyCode in src/lib/fog.ts). */
  zone: number;
  seed: number;
  /** Every hero, in the run's order, with whose they are (user ids). */
  heroes: HeroSetup[];
  users: string[];
}

/** Server to phone. */
export type Down =
  /** Waiting for the rest of the party: who's here, out of whom. */
  | { t: 'wait'; here: string[]; need: string[] }
  /** The run begins; `me` is your place in it. */
  | { t: 'start'; start: Start; me: number }
  /** The run now (snapshot), as text, so it's encoded once for everyone. */
  | { t: 'run'; s: string }
  | { t: 'error'; text: string };

/** A phone's own copy of the run, built as the server built it, with you (`me`) first. */
export function runFromStart(start: Start, me: number): Run {
  const zone = zoneByCode(start.zone);
  if (!zone) throw new Error(`No zone ${start.zone}`);
  const run = createRun({ ...start.heroes[0], zone, seed: start.seed, friends: start.heroes.slice(1) });
  meFirst(run, me);
  return run;
}

/** Your hero first in the party, and the one the screen follows. The others keep their order. */
function meFirst(run: Run, me: number) {
  const mine = run.party.find((h) => h.id === me) ?? run.party[0];
  run.party = [mine, ...run.party.filter((h) => h !== mine)];
  run.hero = mine;
}

// ---------- the run as text ----------

/** What a phone can't take or doesn't need: how the run was set up (each phone has it), the dice,
    the closures waiting to fire, and `hero` (each phone has its own). */
const KEEP_OUT = new Set(['setup', 'layout', 'rnd', 'critRnd', 'timers', 'hero']);

/** The run's moving parts as text, and for each hero the last step of theirs it played (`ack`).
    A hero or monster held somewhere else (a burn's source, a shot's owner, the boss) is written as
    its id, numbers are cut to 3 decimals, and the events since the last snapshot go along. */
export function snapshot(run: Run, ack: number[]): string {
  const heroes = new Set<object>(run.party),
    foes = new Set<object>(run.foes),
    body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(run)) if (!KEEP_OUT.has(k)) body[k] = v;
  return JSON.stringify({ ack, run: body }, function (this: unknown, _k, v: unknown) {
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return { $n: Number.isNaN(v) ? 0 : v > 0 ? 1 : -1 };
      return Number.isInteger(v) ? v : Math.round(v * 1000) / 1000;
    }
    if (v instanceof Set) return { $set: [...v] };
    if (v && typeof v === 'object') {
      if (heroes.has(v) && this !== run.party) return { $h: (v as Hero).id };
      if (foes.has(v) && this !== run.foes) return { $f: (v as Foe).id };
    }
    return v;
  });
}

type Ref = { $h: number } | { $f: number };
const isRef = (v: unknown): v is Ref => !!v && typeof v === 'object' && ('$h' in v || '$f' in v);

/** Put a snapshot into this phone's copy of the run: everything moving comes from the server, your
    hero (`me`, the run's order) goes first so the screen follows you, and the events it carried are
    handed back to play. Returns what the server has played of each hero's steps. */
export function applySnapshot(run: Run, text: string, me: number): { ack: number[]; events: GameEvent[] } {
  // Parsed plain (a reviver is called for every value, several times slower on a phone), then one
  // walk puts back what JSON can't hold: other heroes and monsters, endless numbers, sets.
  const { ack, run: body } = JSON.parse(text) as { ack: number[]; run: Partial<Run> };
  Object.assign(run, body);
  const hs = new Map(run.party.map((h) => [h.id, h])),
    fs = new Map(run.foes.map((f) => [f.id, f]));
  const fix = (o: Record<string, unknown>) => {
    for (const k in o) {
      const v = o[k];
      if (!v || typeof v !== 'object') continue;
      if (isRef(v)) o[k] = '$h' in v ? hs.get(v.$h) : (fs.get(v.$f) ?? null);
      else if ('$n' in v) o[k] = (v as { $n: number }).$n === 1 ? Infinity : (v as { $n: number }).$n === -1 ? -Infinity : NaN;
      else if ('$set' in v) o[k] = new Set((v as { $set: unknown[] }).$set);
      else fix(v as Record<string, unknown>);
    }
  };
  fix(run as unknown as Record<string, unknown>);
  meFirst(run, me);
  // The server's waiting closures stay there; this copy only looks a few steps ahead.
  run.timers = [];
  const events = run.events;
  run.events = [];
  return { ack, events };
}
