'use client';

import { useState } from 'react';
import { Check, ChevronDown, Download, Film, Mail, Pencil, Upload } from 'lucide-react';
import { SoundToggle, useMenuMusic } from './Sound';
import { CloudSave } from './Cloud';
import { StartOver } from './StartOver';
import { DayQuote } from './DayQuote';
import { setGymMode, useGymMode } from './Gym';
import { useModal } from './useModal';
import { Hero } from './Hero';
import { Sprite } from './Sprite';
import { music } from '@/lib/music';
import { setStatsShared, statsConfigured, useStatsShared } from '@/lib/analytics-client';
import { gearOf, type GameState } from '@/lib/game';
import { heroVariant } from '@/story/flame';
import { spWorn } from '@/lib/sp';
import { planExercises } from '@/lib/program';
import { exportState, offRecord, parseImport } from '@/lib/store';
import { storyState } from '@/story/engine';

/* The You page: what is about you, not the game. Opened by tapping your hero at the top of the
   screen: your hero and name, two counts, the quote, your letter, your workouts, then settings
   (one row each) and your save (cloud, backup file, start over). */

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  onReplayOpening: () => void;
  onClose: () => void;
  /** Developer mode's switch: only on the developer's account. On, the app plays a separate developer save. */
  devSwitch?: { on: boolean; set: (on: boolean) => void };
}

const exerciseName = (id: string) => planExercises().find((x) => x.id === id)?.name ?? id;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function YouPage({ state, update, onReplayOpening, onClose, devSwitch }: Props) {
  const box = useModal<HTMLDivElement>(onClose);
  const menuMusic = useMenuMusic();
  const gym = useGymMode();
  const statsShared = useStatsShared();
  const story = storyState(state);
  const [backupMsg, setBackupMsg] = useState('');
  const [letterOpen, setLetterOpen] = useState(false);
  const [name, setName] = useState(state.profile.name ?? '');
  const renamed = name.trim() && name.trim() !== (state.profile.name ?? '');
  // The quest log shows the last five, then the last twelve on More.
  const [allLog, setAllLog] = useState(false);
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
        {/* You: your hero, your name (tap to change it, it is what friends see), close. */}
        <div className="mb-4 flex items-center gap-3 land:mb-2">
          <Hero gear={gearOf(state)} classId={state.profile.classId} size={48} bounce={false} variant={heroVariant(state)} sp={spWorn(state)} />
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (renamed) update((s) => ({ ...s, profile: { ...s.profile, name: name.trim() } }));
              (document.activeElement as HTMLElement | null)?.blur();
            }}
          >
            <label htmlFor="hero-name" className="sr-only">
              Your name
            </label>
            <input
              id="hero-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Your name"
              className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-1 font-pixel text-xs text-gold-300 placeholder:text-slate-500 focus:bg-ink-900 focus:outline-none"
            />
            {renamed ? (
              <button type="submit" aria-label="Save the name" className="rounded-lg bg-gold-400 p-2 text-ink-950">
                <Check size={16} />
              </button>
            ) : (
              <Pencil size={13} className="shrink-0 text-slate-500" aria-hidden />
            )}
          </form>
          <button onClick={onClose} aria-label="Close" className="rounded-lg bg-ink-800 p-2.5">
            <Sprite id="uiIcon" opts={{ name: 'close' }} size={14} label="" />
          </button>
        </div>

        <div className="space-y-4 land:grid land:grid-cols-2 land:gap-4 land:space-y-0">
          <div className="space-y-4">
            <section className="grid grid-cols-2 gap-2">
              <Stat label="Workouts" value={state.sessions.length} />
              <Stat label="Chapter" value={story.finished ? 'Done' : story.index + 1} />
            </section>

            <DayQuote state={state} update={update} />

            {hasLetter && (
              <section className="rounded-2xl bg-ink-800">
                <button onClick={() => setLetterOpen(!letterOpen)} aria-expanded={letterOpen} className="flex w-full items-center gap-2 px-4 py-3.5 text-left">
                  <Mail size={15} className="text-gold-300" /> <span className="flex-1 font-pixel text-[10px] text-gold-300">Your letter</span>
                  <ChevronDown size={15} className={`text-slate-500 transition ${letterOpen ? 'rotate-180' : ''}`} />
                </button>
                {letterOpen && (
                  <div className="mx-4 mb-4 space-y-2 rounded-xl bg-[#f5ecd7] p-4 text-sm text-[#3b2a1a]">
                    {letter.why && <p>Dear future me, I&apos;m starting again because {letter.why}</p>}
                    {letter.want && <p>One day I want to be able to {letter.want}</p>}
                    {letter.forWho && <p>I&apos;m doing this for {letter.forWho}</p>}
                    {letter.remind && <p>When I want to quit, remind me that {letter.remind}</p>}
                  </div>
                )}
              </section>
            )}

            <section className="rounded-2xl bg-ink-800 p-4">
              <h2 className="font-pixel text-[10px] text-gold-300">Your workouts</h2>
              {state.sessions.length ? (
                <ul className="mt-3 divide-y divide-ink-700 text-sm">
                  {[...state.sessions]
                    .reverse()
                    .slice(0, allLog ? 12 : 5)
                    .map((s) => (
                      <li key={s.id} className="py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-200">{s.kind === 'full' ? `Day ${s.day}` : 'Minimum'}</span>
                          <span className="text-xs text-slate-500">{fmtDate(s.date)}</span>
                        </div>
                        {s.better && <p className="mt-0.5 text-xs text-emerald-400">Better than last time</p>}
                        {!!s.heavier?.length && <p className="mt-0.5 text-xs text-sky-300">Next time a little heavier: {s.heavier.map((id) => s.entries.find((e) => e.exerciseId === id)?.name ?? exerciseName(id)).join(', ')}</p>}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Your workouts land here.</p>
              )}
              {!allLog && state.sessions.length > 5 && (
                <button onClick={() => setAllLog(true)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-ink-900 py-2.5 text-sm text-slate-400">
                  More <ChevronDown size={14} />
                </button>
              )}
            </section>
          </div>

          <div className="space-y-4 self-start">
            {/* Settings: one row each, a switch on the right. */}
            <section className="rounded-2xl bg-ink-800 px-4 py-2">
              <h2 className="pb-1 pt-2 font-pixel text-[10px] text-gold-300">Settings</h2>
              <Row label="Gym mode" note="A plain, modern look once a workout starts.">
                <Switch id="gym-mode" on={gym} set={setGymMode} />
              </Row>
              <Row label="Sound">
                <SoundToggle className="!text-slate-300" />
              </Row>
              <Row label="Music in the menus">
                <Switch id="menu-music" on={menuMusic} set={(v) => music.setMenuMusic(v)} />
              </Row>
              {statsConfigured && (
                <Row label="Share play stats" note="How far you get, never your words.">
                  <Switch id="share-stats" on={statsShared} set={setStatsShared} />
                </Row>
              )}
              {devSwitch && (
                <Row label="Developer mode" note={devSwitch.on ? 'On: a separate developer save.' : 'Plays a copy of your hero.'}>
                  <Switch id="dev-mode" on={devSwitch.on} set={devSwitch.set} />
                </Row>
              )}
              <button
                onClick={() => {
                  onClose();
                  onReplayOpening();
                }}
                className="flex min-h-[48px] w-full items-center justify-between border-t border-ink-700 text-sm text-slate-200"
              >
                Replay the opening <Film size={16} className="text-slate-500" />
              </button>
            </section>

            {/* Your save: the cloud, a file backup, and starting over. */}
            <section className="rounded-2xl bg-ink-800 p-4">
              <h2 className="font-pixel text-[10px] text-gold-300">Your save</h2>
              <CloudSave sandbox={offRecord()} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={download} className="flex items-center justify-center gap-2 rounded-xl bg-ink-700 py-2.5 text-sm">
                  <Download size={15} /> Backup file
                </button>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink-700 py-2.5 text-sm">
                  <Upload size={15} /> Restore
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
              <StartOver />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One settings row: what it is (and a short note), its control on the right. */
function Row({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-3 border-t border-ink-700 py-1.5 first-of-type:border-t-0">
      <div className="min-w-0">
        <p className="text-sm text-slate-200">{label}</p>
        {note && <p className="text-xs text-slate-500">{note}</p>}
      </div>
      {children}
    </div>
  );
}

/** An on/off switch, square like the game's pixels. */
function Switch({ id, on, set }: { id: string; on: boolean; set: (on: boolean) => void }) {
  return (
    <button id={id} role="switch" aria-checked={on} onClick={() => set(!on)} className={`relative h-6 w-11 shrink-0 rounded-md transition ${on ? 'bg-gold-400' : 'bg-ink-600'}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-sm bg-ink-950 transition-all motion-reduce:transition-none ${on ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-ink-800 p-3">
      <p className="font-pixel text-[7px] uppercase leading-relaxed text-slate-500">{label}</p>
      <p className="mt-1.5 font-pixel text-base text-slate-100">{value}</p>
    </div>
  );
}
