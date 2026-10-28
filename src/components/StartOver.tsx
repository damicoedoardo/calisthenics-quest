'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { cloudConfigured, deleteCloud, holdCloudWrites, Offline, rememberRev, useCloudStatus } from '@/lib/cloud-client';
import { codeMatches, startOverCode } from '@/lib/restart';
import { offRecord, wipeSave } from '@/lib/store';

/* The You page's "Start over from scratch": asked once, then a code to type back, then the save
   goes from this phone and the cloud and the opening plays again. The account and friends stay. */

type Step = 'idle' | 'sure' | 'code' | 'working';

export function StartOver() {
  const { signedIn } = useCloudStatus();
  const [step, setStep] = useState<Step>('idle');
  const [code, setCode] = useState('');
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState('');
  // The sandbox and the developer save never reach the cloud: only this page's save goes.
  const cloud = cloudConfigured && !offRecord();

  const cancel = () => {
    setStep('idle');
    setTyped('');
    setMsg('');
  };

  const go = async () => {
    setStep('working');
    setMsg('');
    try {
      if (cloud) {
        holdCloudWrites(true);
        await deleteCloud();
        rememberRev('', null);
      }
      wipeSave();
    } catch (e) {
      // Nothing on the phone was touched: the backup goes on as before.
      holdCloudWrites(false);
      setStep('code');
      setMsg(e instanceof Offline ? 'No connection. Starting over needs one, so your old hero can’t come back from the cloud.' : 'Couldn’t start over right now. Try again in a bit.');
    }
  };

  if (step === 'idle')
    return (
      <button onClick={() => setStep('sure')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/40 py-3 text-sm font-semibold text-red-300">
        <RotateCcw size={16} /> Start over from scratch
      </button>
    );

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-red-400/40 p-3" role="group" aria-label="Start over from scratch">
      {step === 'sure' && (
        <>
          <p className="text-sm text-slate-200">Start over from scratch?</p>
          <p className="text-xs text-slate-400">
            Your hero, name, workouts, story, gear and Fog progress all go{cloud ? ', on this phone and in the cloud' : ' from this save'}, and the opening plays again. Your account and your friends stay. This can&apos;t be undone.
          </p>
          {cloud && !signedIn && <p className="text-xs text-amber-300">Sign in first, so the copy in the cloud goes too.</p>}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={cancel} className="rounded-xl bg-ink-600 py-3 text-sm font-semibold">
              Keep my hero
            </button>
            <button
              disabled={cloud && !signedIn}
              onClick={() => {
                setCode(startOverCode(Math.random));
                setStep('code');
              }}
              className="rounded-xl bg-red-500/80 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Yes, start over
            </button>
          </div>
        </>
      )}
      {(step === 'code' || step === 'working') && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 'code' && codeMatches(typed, code)) void go();
          }}
        >
          <p className="text-xs text-slate-400">To be sure, type this code:</p>
          <p className="select-all text-center font-mono text-2xl font-semibold tracking-[0.3em] text-red-200">{code}</p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={12}
            placeholder="The code"
            aria-label="Type the code to start over"
            className="w-full rounded-xl bg-ink-900 px-3 py-3 text-center font-mono text-lg uppercase tracking-[0.3em] text-slate-100 placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={cancel} disabled={step === 'working'} className="rounded-xl bg-ink-600 py-3 text-sm font-semibold disabled:opacity-40">
              Keep my hero
            </button>
            <button type="submit" disabled={step === 'working' || !codeMatches(typed, code)} className="rounded-xl bg-red-500/80 py-3 text-sm font-semibold text-white disabled:opacity-40">
              {step === 'working' ? 'Starting over…' : 'Start over'}
            </button>
          </div>
        </form>
      )}
      {msg && <p className="text-xs text-amber-300">{msg}</p>}
    </div>
  );
}
