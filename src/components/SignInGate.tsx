'use client';

import { useState } from 'react';
import { Ember } from './Characters';
import { cloudConfigured, googleSignIn, maybeSignedIn, signInWithEmail, signInWithGoogle, verifyEmailCode } from '@/lib/cloud-client';

/* Right after the opening, FORMA needs an account: there is no playing on without
   one. It backs the hero up from day one, it's who you are to your friends, and your coach talks to
   you through it. Once signed in, the game still plays offline.
   On an installed iPhone app the email's link opens Safari, not the app, so the code in the email
   (6 or 8 digits, a Supabase setting) is the way in there. The backup and its rules are in Cloud.tsx and lib/cloud*.ts. */

const goldButton =
  'w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:opacity-40';

/** Sign-in is asked for: the backend is set up, and this phone isn't signed in (or about to be). */
export const signInDue = (signedIn: boolean) => cloudConfigured && !signedIn && !maybeSignedIn();

const begin = () => window.dispatchEvent(new Event('forma-cloud-start'));

/** `back` and `welcome`: the opening's "I already have a hero" (a returning player on a new phone):
    a way back to the start, and words for coming back rather than for a new account. */
export function SignInGate({ back, welcome = false }: { back?: () => void; welcome?: boolean } = {}) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;

  const send = async () => {
    const e = email.trim();
    if (!e.includes('@')) return setMsg('That email looks off.');
    setBusy(true);
    setMsg('');
    begin();
    const err = await signInWithEmail(e);
    setBusy(false);
    if (err) return setMsg(err);
    setSent(true);
  };

  const verify = async () => {
    const c = code.replace(/\D/g, '');
    if (c.length < 6) return setMsg('Type the whole code from the email.');
    setBusy(true);
    setMsg('');
    const err = await verifyEmailCode(email.trim(), c);
    setBusy(false);
    // Signed in: the sync hook hears it and this screen goes away.
    if (err) setMsg("That code didn't work. Check the newest email, or send a new one.");
  };

  return (
    <div className="safe-top fixed inset-0 z-40 overflow-y-auto bg-ink-950 land-safe-x">
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-5 pb-10 pt-6 text-center">
        <Ember size={64} stage="spark" />
        <h1 className="mt-4 font-pixel text-sm leading-relaxed text-gold-400">{welcome ? 'Welcome back' : 'Make your hero yours'}</h1>
        <p className="mt-3 text-sm text-slate-300">
          {welcome
            ? 'Type the email you play with. We send you a code, and your hero comes back to this phone just as you left it.'
            : 'Sign in to play. Your hero is kept safe and comes with you to a new phone, your friends can find you, and your flame can coach you. After that FORMA works with no signal.'}
        </p>

        {offline ? (
          <p className="mt-6 text-sm text-amber-300">You&apos;re offline. Signing in needs signal once; come back when you have it.</p>
        ) : !sent ? (
          <form
            className="mt-6 w-full space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            {googleSignIn && (
              <button
                type="button"
                onClick={async () => {
                  begin();
                  const err = await signInWithGoogle();
                  if (err) setMsg(err);
                }}
                className="w-full rounded-2xl bg-ink-700 py-4 text-sm font-semibold"
              >
                Sign in with Google
              </button>
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              aria-label="Your email"
              autoComplete="email"
              className="w-full rounded-2xl bg-ink-900 px-4 py-4 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <button type="submit" disabled={busy} className={goldButton}>
              {busy ? 'Sending…' : 'Send me a sign-in email'}
            </button>
          </form>
        ) : (
          <form
            className="mt-6 w-full space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void verify();
            }}
          >
            <p className="text-sm text-slate-300">
              Sent to <b className="text-slate-100">{email.trim()}</b>. Type the code from the email here, or tap its link on this phone.
            </p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              placeholder="Code"
              aria-label="The code from the email"
              className="w-full rounded-2xl bg-ink-900 px-4 py-4 text-center font-mono text-xl tracking-[0.4em] text-slate-100 placeholder:text-slate-600"
            />
            <button type="submit" disabled={busy} className={goldButton}>
              {busy ? 'Checking…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setCode('');
                setMsg('');
              }}
              className="text-xs text-slate-400 underline"
            >
              Use another email, or send it again
            </button>
          </form>
        )}

        {msg && <p className="mt-3 text-xs text-sky-300">{msg}</p>}
        {back && (
          <button type="button" onClick={back} className="mt-6 text-sm text-slate-400">
            Back
          </button>
        )}
      </div>
    </div>
  );
}
