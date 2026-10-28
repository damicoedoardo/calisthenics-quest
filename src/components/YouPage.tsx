'use client';

import { useState } from 'react';
import { Download, Film, Mail, Upload, X } from 'lucide-react';
import { SoundToggle, useMenuMusic } from './Sound';
import { CloudSave } from './Cloud';
import { useModal } from './useModal';
import { music } from '@/lib/music';
import type { GameState } from '@/lib/game';
import { planExercises } from '@/lib/program';
import { exportState, inSandbox, parseImport } from '@/lib/store';
import { storyState } from '@/story/engine';

/* The You page: what is about you, not the game. Opened by tapping your hero at the top of the
   screen: your letter, your record and quest log, then settings, backup and the cloud save. */

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  onReplayOpening: () => void;
  onClose: () => void;
}

const exerciseName = (id: string) => planExercises().find((x) => x.id === id)?.name ?? id;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function YouPage({ state, update, onReplayOpening, onClose }: Props) {
  const box = useModal<HTMLDivElement>(onClose);
  const menuMusic = useMenuMusic();
  const story = storyState(state);
  const [backupMsg, setBackupMsg] = useState('');
  const [letterOpen, setLetterOpen] = useState(false);
  const letter = state.profile.letter;
  const hasLetter = !!(letter.why || letter.want || letter.forWho || letter.remind);

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
    <div ref={box} role="dialog" aria-modal="true" aria-label="You" className="safe-top safe-bottom fixed inset-0 z-40 overflow-y-auto bg-ink-950 outline-none land-safe-x">
      <div className="mx-auto max-w-md px-4 pb-8 pt-3 land:max-w-4xl land:pb-4">
        <div className="mb-4 flex items-center justify-between land:mb-2">
          <h2 className="font-pixel text-xs text-gold-300">{state.profile.name || 'You'}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg bg-ink-800 p-2 text-slate-300">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 land:grid land:grid-cols-2 land:gap-4 land:space-y-0">
          <div className="space-y-4">
            <section className="grid grid-cols-3 gap-2">
              <Stat label="Quests" value={state.sessions.length} />
              <Stat label="Beat last time" value={state.sessions.filter((s) => s.better).length} />
              <Stat label="Chapter" value={story.finished ? 'Done' : story.index + 1} />
            </section>

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

            <section className="rounded-2xl bg-ink-800 p-4">
              <h2 className="font-pixel text-[10px] text-gold-300">Quest log</h2>
              {state.sessions.length ? (
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
                        {s.better && <p className="text-xs text-emerald-400">Better than last time</p>}
                        {!!s.heavier?.length && <p className="text-xs text-sky-300">Next time a little heavier: {s.heavier.map(exerciseName).join(', ')}</p>}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Your quests land here.</p>
              )}
            </section>
          </div>

          <section className="self-start rounded-2xl bg-ink-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-pixel text-[10px] text-gold-300">Settings</h2>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                Music <SoundToggle />
              </span>
            </div>
            <label className="mt-1 flex min-h-[44px] items-center justify-between text-sm text-slate-300">
              Music in the menus
              <input type="checkbox" checked={menuMusic} onChange={(e) => music.setMenuMusic(e.target.checked)} className="h-5 w-5 accent-gold-400" />
            </label>
            <button
              onClick={() => {
                onClose();
                onReplayOpening();
              }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-600 py-3 text-sm font-semibold"
            >
              <Film size={16} /> Replay the opening
            </button>
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
            <CloudSave sandbox={inSandbox()} />
          </section>
        </div>
      </div>
    </div>
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
