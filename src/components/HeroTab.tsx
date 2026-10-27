'use client';

import { useState, type ReactNode } from 'react';
import { Download, Film, Gem, Lock, Mail, Palette, Upload } from 'lucide-react';
import { SoundToggle, useMenuMusic } from './Sound';
import { music } from '@/lib/music';
import { Hero } from './Hero';
import { Sprite } from './Sprite';
import { useLook } from './Look';
import { LookEditor } from './LookEditor';
import { useModal } from './useModal';
import { StatPoints } from './StatPoints';
import { CloudSave } from './Cloud';
import { getClass, tierText } from '@/lib/gear';
import { gearOf, type GameState } from '@/lib/game';
import { planExercises } from '@/lib/program';
import { exportState, inSandbox, parseImport } from '@/lib/store';
import { storyState } from '@/story/engine';
import { ZONES } from '@/lib/fog';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  onChangeClass: () => void;
  onReplayOpening: () => void;
}

const exerciseName = (id: string) => planExercises().find((x) => x.id === id)?.name ?? id;

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function HeroTab({ state, update, onChangeClass, onReplayOpening }: Props) {
  const menuMusic = useMenuMusic();
  const gear = gearOf(state);
  const cls = getClass(state.profile.classId);
  const story = storyState(state);
  const [backupMsg, setBackupMsg] = useState('');
  const [letterOpen, setLetterOpen] = useState(false);
  const [editingLook, setEditingLook] = useState(false);
  const look = useLook();
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
    <div className="space-y-5">
      {/* Sideways: you and your champion on the left, the rest on the right. */}
      <div className="space-y-5 land:grid land:grid-cols-2 land:items-start land:gap-4 land:space-y-0">
      <div className="space-y-5">
      <section className="flex flex-col items-center rounded-2xl bg-gradient-to-b from-ink-700 to-ink-800 pb-4 pt-5">
        <p className="font-pixel text-[10px] text-slate-400">{cls ? cls.name : 'Adventurer'}</p>
        <Hero gear={gear} classId={state.profile.classId} size={180} />
        <div className="mt-3 grid w-full grid-cols-3 gap-2 px-3 text-center text-xs">
          {(['weapon', 'armor', 'shield'] as const).map((slot) => (
            <div key={slot} className="rounded-lg bg-ink-900/70 px-2 py-2">
              <p className="uppercase tracking-wider text-slate-500">{slot}</p>
              <p className="mt-0.5 font-semibold" style={{ color: tierText(gear[slot].tier) }}>
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

      <StatPoints state={state} update={update} />

      {editingLook && (
        <Overlay label="Your look" onClose={() => setEditingLook(false)}>
          <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 pt-4 land:min-h-0 land:max-w-3xl land:pl-[max(env(safe-area-inset-left),1rem)] land:pr-[max(env(safe-area-inset-right),1rem)] land:pb-4 land:pt-2">
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
              className="mt-5 w-full rounded-2xl land:mt-3 land:py-3 bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
            >
              Done
            </button>
          </div>
        </Overlay>
      )}
      </div>

      <div className="space-y-5">
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
        <Stat label="Beat last time" value={state.sessions.filter((s) => s.better).length} />
        <Stat label="Chapter" value={story.finished ? 'Done' : story.index + 1} />
      </section>

      <Keepsakes cleared={state.fog?.cleared ?? 0} />

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
                  {s.better && <p className="text-xs text-emerald-400">Better than last time</p>}
                  {!!s.heavier?.length && <p className="text-xs text-sky-300">Next time a little heavier: {s.heavier.map(exerciseName).join(', ')}</p>}
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
        <label className="mt-1 flex min-h-[44px] items-center justify-between text-sm text-slate-300">
          Music in the menus
          <input type="checkbox" checked={menuMusic} onChange={(e) => music.setMenuMusic(e.target.checked)} className="h-5 w-5 accent-gold-400" />
        </label>
        <button onClick={onReplayOpening} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-600 py-3 text-sm font-semibold">
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
                  <div className="flex items-center gap-2">
                    <Sprite id="keepsake" opts={{ zone: z.id }} size={36} label={z.keepsake.name} className="shrink-0" />
                    <p className="text-sm font-semibold leading-tight text-slate-100">{z.keepsake.name}</p>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{z.keepsake.text}</p>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Still in the fog: only its shape shows. */}
                  <Sprite id="keepsake" opts={{ zone: z.id }} size={36} label="A keepsake not won yet" className="shrink-0 opacity-40 brightness-0 invert-[.35]" />
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    {/* Only the next boss has a name; the ones after it are still in the fog. */}
                    <Lock size={12} /> {z.id === cleared ? z.bossName : '???'}
                  </p>
                </div>
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

/** A full-screen sheet over the Hero tab (the look editor): a dialog, closed with Escape too. */
function Overlay({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const box = useModal<HTMLDivElement>(onClose);
  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={label} className="safe-top safe-bottom fixed inset-0 z-40 !mt-0 overflow-y-auto bg-ink-950 outline-none">
      {children}
    </div>
  );
}
