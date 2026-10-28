'use client';

import { useSyncExternalStore } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { GameState } from './game';
import type { CloudCopy } from './cloud';

/* The talking side of the cloud backup: Supabase for login, FORMA's api for the save
   (docs/handbook/backend/api.md). The rules of what to send live in cloud.ts. All of it is off
   until the three NEXT_PUBLIC_ settings are there, and the Supabase library loads only when used. */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export const cloudConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY && API_URL);

/** Google sign-in shows only once the Google provider is on in Supabase (NEXT_PUBLIC_GOOGLE_SIGNIN=1). */
export const googleSignIn = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === '1';

let client: Promise<SupabaseClient> | null = null;

export function supabase(): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    }),
  );
  return client;
}

/** True when this phone may already be signed in (a stored session) or is coming back from a sign-in link. */
export function maybeSignedIn(): boolean {
  if (!cloudConfigured || typeof window === 'undefined') return false;
  if (/[?&#](code|access_token|error_description)=/.test(window.location.href)) return true;
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  } catch {
    return false;
  }
}

// ---------- what the screens show ----------

export interface CloudStatus {
  /** Signed in as (null: signed out). */
  email: string | null;
  signedIn: boolean;
  phase: 'idle' | 'saving' | 'saved' | 'offline' | 'error';
  savedAt?: string;
  workouts?: number;
}

let status: CloudStatus = { email: null, signedIn: false, phase: 'idle' };
const listeners = new Set<() => void>();

export function setCloudStatus(patch: Partial<CloudStatus>) {
  status = { ...status, ...patch };
  for (const l of listeners) l();
}

export function useCloudStatus(): CloudStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => status,
  );
}

// ---------- the last cloud rev this phone saw, per account ----------

const REV_KEY = 'forma-cloud-rev-v1';

export function lastRev(user: string): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(REV_KEY) ?? 'null') as { user?: string; rev?: number } | null;
    return v?.user === user && typeof v.rev === 'number' ? v.rev : null;
  } catch {
    return null;
  }
}

export function rememberRev(user: string, rev: number | null) {
  try {
    if (rev === null) localStorage.removeItem(REV_KEY);
    else localStorage.setItem(REV_KEY, JSON.stringify({ user, rev }));
  } catch {
    // Storage blocked: the next sign-in asks again, which is safe.
  }
}

// ---------- the api ----------

export class Offline extends Error {}

/** A signed-in call to FORMA's api; no connection throws Offline. */
export async function api(method: 'GET' | 'PUT' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<Response> {
  const { data } = await (await supabase()).auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Offline('No connection');
  }
}

const call = (method: 'GET' | 'PUT' | 'DELETE', body?: unknown) => api(method, '/save', body);

/** The cloud copy, or null when there is none yet. */
export async function getCloud(): Promise<CloudCopy | null> {
  const r = await call('GET');
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Cloud read failed (${r.status})`);
  return (await r.json()) as CloudCopy;
}

export type PutResult = { ok: true; copy: CloudCopy } | { ok: false; current: CloudCopy | null };

/** Write this save over the cloud's `baseRev`; a clash returns the cloud copy instead. */
export async function putCloud(state: GameState, baseRev: number | null): Promise<PutResult> {
  const r = await call('PUT', { data: state, base_rev: baseRev });
  if (r.status === 409) return { ok: false, current: ((await r.json()) as { current: CloudCopy | null }).current };
  if (!r.ok) throw new Error(`Cloud save failed (${r.status})`);
  return { ok: true, copy: (await r.json()) as CloudCopy };
}

export async function deleteCloud(): Promise<void> {
  const r = await call('DELETE');
  if (!r.ok && r.status !== 404) throw new Error(`Cloud delete failed (${r.status})`);
}

// ---------- signing in and out ----------

const back = () => `${window.location.origin}/`;

export async function signInWithGoogle(): Promise<string | null> {
  const { error } = await (await supabase()).auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back() } });
  return error?.message ?? null;
}

export async function signInWithEmail(email: string): Promise<string | null> {
  const { error } = await (await supabase()).auth.signInWithOtp({ email, options: { emailRedirectTo: back() } });
  return error?.message ?? null;
}

/** Sign in with the code from the email: the way in on an installed iPhone app, where the
    email's link would open Safari instead. */
export async function verifyEmailCode(email: string, code: string): Promise<string | null> {
  const { error } = await (await supabase()).auth.verifyOtp({ email, token: code, type: 'email' });
  return error?.message ?? null;
}

export async function signOut(): Promise<void> {
  await (await supabase()).auth.signOut();
}
