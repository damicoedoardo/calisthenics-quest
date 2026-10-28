import { createHmac, timingSafeEqual } from 'node:crypto';

/* The play pass: the api (backend/app/play.py) signs one for a party member when their run starts,
   with the secret both share (FORMA_PLAY_SECRET there, PLAY_SECRET here). An HS256 JWT: who you
   are, your party, its start (seed and zone) and its members in order. */

export interface Pass {
  sub: string;
  party: string;
  seed: number;
  zone: number;
  users: string[];
  exp: number;
}

const b64 = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/** The pass's claims if it's ours and still good, else null. */
export function readPass(token: string, secret: string, now = Date.now() / 1000): Pass | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !secret) return null;
  const [head, body, sig] = parts;
  const want = createHmac('sha256', secret).update(`${head}.${body}`).digest();
  const got = b64(sig);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    if ((JSON.parse(b64(head).toString()) as { alg?: string }).alg !== 'HS256') return null;
    const p = JSON.parse(b64(body).toString()) as Pass;
    if (typeof p.exp !== 'number' || p.exp < now || !p.sub || !p.party || !Array.isArray(p.users)) return null;
    return p;
  } catch {
    return null;
  }
}
