'use client';

import { useState } from 'react';
import { Download, Trophy, Upload } from 'lucide-react';
import { Hero } from './Hero';
import { PATHS } from '@/lib/skills';
import { equippedGear, logMaxTest, nextTestDate, type GameState } from '@/lib/game';
import { exportState, parseImport } from '@/lib/store';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function HeroTab({ state, update }: Props) {
  const gear = equippedGear(state);
  const [test, setTest] = useState({ pushups: '', pullups: '', lsitSec: '' });
  const [testMsg, setTestMsg] = useState('');
  const first = state.tests[0];
  const best = state.tests.reduce(
    (a, t) => ({ pushups: Math.max(a.pushups, t.pushups), pullups: Math.max(a.pullups, t.pullups), lsitSec: Math.max(a.lsitSec, t.lsitSec) }),
    { pushups: 0, pullups: 0, lsitSec: 0 },
  );
  const nextTest = nextTestDate(state);
  const testReady = !nextTest || nextTest <= new Date();

  const submitTest = () => {
    const values = { pushups: Number(test.pushups) || 0, pullups: Number(test.pullups) || 0, lsitSec: Number(test.lsitSec) || 0 };
    const res = logMaxTest(state, values, new Date());
    update(() => res.state);
    setTest({ pushups: '', pullups: '', lsitSec: '' });
    setTestMsg(res.test.xp ? `+${res.test.xp} XP. Records saved!` : 'Saved. Test XP returns after the 3-week cooldown.');
  };

  const download = () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `forma-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseImport(await file.text());
    if (parsed) update(() => parsed);
    setTestMsg(parsed ? 'Backup restored.' : 'That file is not a FORMA backup.');
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col items-center rounded-2xl bg-gradient-to-b from-ink-700 to-ink-800 pb-4 pt-6">
        <Hero gear={gear} size={180} />
        <div className="mt-3 grid w-full grid-cols-3 gap-2 px-3 text-center text-xs">
          {(['weapon', 'armor', 'shield'] as const).map((slot) => (
            <div key={slot} className="rounded-lg bg-ink-900/70 px-2 py-2">
              <p className="uppercase tracking-wider text-slate-500">{slot}</p>
              <p className="mt-0.5 font-semibold" style={{ color: gear[slot].color === 'transparent' ? '#64748b' : gear[slot].color }}>
                {gear[slot].name}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-ink-800 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Quests done</p>
          <p className="mt-1 text-2xl font-semibold">{state.sessions.length}</p>
        </div>
        <div className="rounded-2xl bg-ink-800 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Skills beaten</p>
          <p className="mt-1 text-2xl font-semibold">
            {state.sessions.reduce((a, s) => a + s.unlocked.length, 0)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-ink-800 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-pixel text-xs text-gold-300">
            <Trophy size={14} /> Max test
          </h2>
          <p className="text-xs text-slate-400">
            {testReady ? 'Ready: +200 XP' : `Next XP on ${nextTest!.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
          </p>
        </div>
        <p className="mt-1 text-xs text-slate-400">The only day you go all out. Once every 3 weeks, fresh, after a warm-up.</p>

        {first && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {(
              [
                ['Push-ups', 'pushups', ''],
                ['Pull-ups', 'pullups', ''],
                ['L-sit', 'lsitSec', 's'],
              ] as const
            ).map(([label, key, unit]) => (
              <div key={key} className="rounded-lg bg-ink-900 p-2">
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="text-lg font-bold">
                  {best[key]}
                  {unit}
                </p>
                <p className="text-[11px] text-emerald-400">
                  {best[key] > first[key] ? `+${best[key] - first[key]} since ${fmtDate(first.date)}` : 'baseline'}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2">
          {(
            [
              ['pushups', 'Push-ups'],
              ['pullups', 'Pull-ups'],
              ['lsitSec', 'L-sit sec'],
            ] as const
          ).map(([key, label]) => (
            <input
              key={key}
              inputMode="numeric"
              placeholder={label}
              value={test[key]}
              onChange={(e) => setTest({ ...test, [key]: e.target.value.replace(/\D/g, '') })}
              className="w-full rounded-lg bg-ink-900 px-3 py-2.5 text-center text-sm outline-none ring-1 ring-ink-600 focus:ring-gold-400"
            />
          ))}
        </div>
        <button
          onClick={submitTest}
          disabled={!test.pushups && !test.pullups && !test.lsitSec}
          className="mt-3 w-full rounded-xl bg-ink-600 py-3 text-sm font-semibold active:scale-[.98] disabled:opacity-40"
        >
          Log test
        </button>
        {testMsg && <p className="mt-2 text-center text-xs text-gold-300">{testMsg}</p>}
      </section>

      {state.sessions.length > 0 && (
        <section className="rounded-2xl bg-ink-800 p-4">
          <h2 className="font-pixel text-xs text-gold-300">Quest log</h2>
          <ul className="mt-3 divide-y divide-ink-700 text-sm">
            {[...state.sessions]
              .reverse()
              .slice(0, 12)
              .map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <span className="text-slate-300">
                    {fmtDate(s.date)} · {s.kind === 'full' ? 'Quest' : 'Mini quest'}
                    {s.unlocked.length > 0 && ' · 🔓'}
                  </span>
                  <span className="font-semibold text-gold-300">+{s.xp} XP</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl bg-ink-800 p-4">
        <h2 className="font-pixel text-xs text-gold-300">Settings</h2>
        <p className="mt-2 text-xs text-slate-400">Starting point on each path. Change it if a level is too easy or too hard.</p>
        <div className="mt-2 space-y-2">
          {PATHS.map((path) => (
            <label key={path.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-300">{path.name}</span>
              <select
                value={state.progress[path.id]}
                onChange={(e) => update((s) => ({ ...s, progress: { ...s.progress, [path.id]: Number(e.target.value) } }))}
                className="max-w-[60%] rounded-lg bg-ink-900 px-2 py-2 text-sm ring-1 ring-ink-600"
              >
                {path.nodes.map((n, i) => (
                  <option key={n.id} value={i}>
                    {i + 1}. {n.name}
                  </option>
                ))}
                <option value={path.nodes.length}>All beaten</option>
              </select>
            </label>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-400">Progress lives on this phone. Back it up now and then.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={download} className="flex items-center justify-center gap-2 rounded-xl bg-ink-600 py-3 text-sm font-semibold">
            <Download size={16} /> Backup
          </button>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink-600 py-3 text-sm font-semibold">
            <Upload size={16} /> Restore
            <input type="file" accept="application/json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
          </label>
        </div>
      </section>
    </div>
  );
}
