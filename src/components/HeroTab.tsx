'use client';

import { useState } from 'react';
import { Download, Film, Gem, Lock, Mail, Palette, Trophy, Upload } from 'lucide-react';
import { SoundToggle } from './Sound';
import { Hero } from './Hero';
import { useLook } from './Look';
import { LookEditor } from './LookEditor';
import { PATHS } from '@/lib/skills';
import { getClass } from '@/lib/gear';
import { gearOf, logMaxTest, nextTestDate, nodeName, type GameState } from '@/lib/game';
import { exportState, parseImport } from '@/lib/store';
import { storyState } from '@/story/engine';
import { ZONES } from '@/lib/fog';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  onChangeClass: () => void;
  onTestLogged: () => void;
  onReplayOpening: () => void;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function HeroTab({ state, update, onChangeClass, onTestLogged, onReplayOpening }: Props) {
  const gear = gearOf(state);
  const cls = getClass(state.profile.classId);
  const story = storyState(state);
  const [test, setTest] = useState({ pushups: '', pullups: '', lsitSec: '' });
  const [msg, setMsg] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [letterOpen, setLetterOpen] = useState(false);
  const [editingLook, setEditingLook] = useState(false);
  const look = useLook();
  const first = state.tests[0];
  const best = state.tests.reduce(
    (a, t) => ({ pushups: Math.max(a.pushups, t.pushups), pullups: Math.max(a.pullups, t.pullups), lsitSec: Math.max(a.lsitSec, t.lsitSec) }),
    { pushups: 0, pullups: 0, lsitSec: 0 },
  );
  const nextTest = nextTestDate(state);
  const testReady = !nextTest || nextTest <= new Date();
  const letter = state.profile.letter;
  const hasLetter = !!(letter.why || letter.want || letter.forWho || letter.remind);

  const submitTest = () => {
    const values = { pushups: Number(test.pushups) || 0, pullups: Number(test.pullups) || 0, lsitSec: Number(test.lsitSec) || 0 };
    const res = logMaxTest(state, values, new Date());
    update(() => res.state);
    setTest({ pushups: '', pullups: '', lsitSec: '' });
    setMsg(res.test.xp ? `+${res.test.xp} XP. Saved.` : 'Saved. Test XP comes back after the 3-week cooldown.');
    onTestLogged();
  };

  const download = () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `forma-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    // Revoking right away can cancel the download on some phones.
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    const parsed = parseImport(await file.text());
    if (!parsed) return setBackupMsg("That file isn't a FORMA backup.");
    // A restore replaces everything on this phone, so check first.
    const n = parsed.sessions.length;
    if (!window.confirm(`Replace the progress on this phone with this backup (${n} ${n === 1 ? 'workout' : 'workouts'})?`)) return;
    update(() => parsed);
    setBackupMsg('Backup restored.');
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col items-center rounded-2xl bg-gradient-to-b from-ink-700 to-ink-800 pb-4 pt-5">
        <p className="font-pixel text-[10px] text-slate-400">{cls ? cls.name : 'Adventurer'}</p>
        <Hero gear={gear} classId={state.profile.classId} size={180} />
        <div className="mt-3 grid w-full grid-cols-3 gap-2 px-3 text-center text-xs">
          {(['weapon', 'armor', 'shield'] as const).map((slot) => (
            <div key={slot} className="rounded-lg bg-ink-900/70 px-2 py-2">
              <p className="uppercase tracking-wider text-slate-500">{slot}</p>
              <p className="mt-0.5 font-semibold" style={{ color: gear[slot].tier === 0 ? '#64748b' : gear[slot].color }}>
                {gear[slot].name}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={onChangeClass} className="rounded-lg bg-ink-900/70 px-4 py-2 text-xs font-semibold text-slate-300">
            {cls ? 'Change class' : 'Choose a class'}
          </button>
          <button onClick={() => setEditingLook(true)} className="flex items-center gap-1.5 rounded-lg bg-ink-900/70 px-4 py-2 text-xs font-semibold text-slate-300">
            <Palette size={13} /> Change look
          </button>
        </div>
      </section>

      {editingLook && (
        <div className="safe-top safe-bottom fixed inset-0 z-40 !mt-0 overflow-y-auto bg-ink-950">
          <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 pt-4">
            <h2 className="mb-4 font-pixel text-xs text-gold-300">Your look</h2>
            <div className="flex-1">
              <LookEditor
                look={look}
                onChange={(l) => update((s) => ({ ...s, profile: { ...s.profile, look: l } }))}
                gear={gear}
                classId={state.profile.classId}
              />
            </div>
            <button
              onClick={() => setEditingLook(false)}
              className="mt-5 w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {hasLetter && (
        <section className="rounded-2xl bg-ink-800 p-4">
          <button onClick={() => setLetterOpen(!letterOpen)} className="flex w-full items-center gap-2 font-pixel text-[10px] text-gold-300">
            <Mail size={14} /> Your letter {letterOpen ? '' : '(tap to read)'}
          </button>
          {letterOpen && (
            <div className="mt-3 space-y-2 rounded-xl bg-[#f5ecd7] p-4 text-sm text-[#3b2a1a]">
              {letter.why && <p>Dear future me, I&apos;m starting again because {letter.why}</p>}
              {letter.want && <p>One day I want to be able to {letter.want}</p>}
              {letter.forWho && <p>I&apos;m doing this for {letter.forWho}</p>}
              {letter.remind && <p>When I want to quit, remind me that {letter.remind}</p>}
            </div>
          )}
        </section>
      )}

      <section className="grid grid-cols-3 gap-2">
        <Stat label="Quests" value={state.sessions.length} />
        <Stat label="Skills beaten" value={state.sessions.reduce((a, s) => a + s.unlocked.length, 0)} />
        <Stat label="Chapter" value={story.finished ? 'Done' : story.index + 1} />
      </section>

      <Keepsakes cleared={state.fog?.cleared ?? 0} />

      <section className="rounded-2xl bg-ink-800 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-pixel text-[10px] text-gold-300">
            <Trophy size={14} /> Max test
          </h2>
          <p className="text-xs text-slate-400">
            {testReady ? 'Ready: +200 XP' : `Next XP on ${nextTest!.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
          </p>
        </div>
        <p className="mt-1 text-xs text-slate-400">The only day you go all out. Every 3 to 4 weeks, fresh, after a warm-up.</p>

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
                <p className="font-mono text-lg font-bold">
                  {best[key]}
                  {unit}
                </p>
                <p className="text-[11px] text-emerald-400">{best[key] > first[key] ? `+${best[key] - first[key]} since ${fmtDate(first.date)}` : 'your start'}</p>
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
              aria-label={label}
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
        {msg && <p className="mt-2 text-center text-xs text-gold-300">{msg}</p>}
      </section>

      {state.sessions.length > 0 && (
        <section className="rounded-2xl bg-ink-800 p-4">
          <h2 className="font-pixel text-[10px] text-gold-300">Quest log</h2>
          <ul className="mt-3 divide-y divide-ink-700 text-sm">
            {[...state.sessions]
              .reverse()
              .slice(0, 12)
              .map((s) => (
                <li key={s.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">
                      {fmtDate(s.date)} · {s.kind === 'full' ? `Day ${s.day}` : 'Minimum'}
                    </span>
                    <span className="font-mono font-semibold text-gold-300">+{s.xp}</span>
                  </div>
                  {s.unlocked.length > 0 && <p className="text-xs text-emerald-400">Beat {s.unlocked.map(nodeName).join(', ')}</p>}
                </li>
              ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl bg-ink-800 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-[10px] text-gold-300">Settings</h2>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            Music <SoundToggle />
          </span>
        </div>
        <button onClick={onReplayOpening} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-600 py-3 text-sm font-semibold">
          <Film size={16} /> Replay the opening
        </button>
        <p className="mt-2 text-xs text-slate-400">Your level on each path. Change it if it feels too easy or too hard.</p>
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
        <p className="mt-4 text-xs text-slate-400">Your progress lives on this phone. Back it up now and then.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={download} className="flex items-center justify-center gap-2 rounded-xl bg-ink-600 py-3 text-sm font-semibold">
            <Download size={16} /> Backup
          </button>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink-600 py-3 text-sm font-semibold">
            <Upload size={16} /> Restore
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                restore(e.target.files?.[0]);
                // Lets the same file be picked again.
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {backupMsg && <p className="mt-2 text-center text-xs text-gold-300">{backupMsg}</p>}
      </section>
    </div>
  );
}

/** What you won in the Fog: one keepsake per boss. */
function Keepsakes({ cleared }: { cleared: number }) {
  return (
    <section className="rounded-2xl bg-ink-800 p-4">
      <h2 className="flex items-center gap-2 font-pixel text-[10px] text-gold-300">
        <Gem size={14} /> Keepsakes
      </h2>
      <p className="mt-1 text-xs text-slate-500">One for every boss you beat in the Fog, on the Play tab.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {ZONES.map((z) => {
          const won = z.id < cleared;
          return (
            <li key={z.id} className={`rounded-xl p-3 ${won ? 'bg-ink-900 ring-1 ring-gold-400/25' : 'bg-ink-900/50'}`}>
              {won ? (
                <>
                  <p className="text-sm font-semibold text-slate-100">{z.keepsake.name}</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-400">{z.keepsake.text}</p>
                </>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-slate-600">
                  {/* Only the next boss has a name; the ones after it are still in the fog. */}
                  <Lock size={12} /> {z.id === cleared ? z.bossName : '???'}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-ink-800 p-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
    </div>
  );
}
