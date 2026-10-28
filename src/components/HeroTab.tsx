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
import { SpCard } from './SpCard';
import { CloudSave } from './Cloud';
import { useLand } from './useLand';
import { FriendsCard } from './Friends';
import { ItemTile } from './ItemCard';
import { getClass, tierText } from '@/lib/gear';
import { gearOf, type GameState } from '@/lib/game';
import { planExercises } from '@/lib/program';
import { exportState, inSandbox, parseImport } from '@/lib/store';
import { storyState } from '@/story/engine';
import { heroVariant } from '@/story/flame';
import { ZONES } from '@/lib/fog';
import { pointsFree } from '@/lib/stats';
import { nameOf, RARITY, SLOT_NAME } from '@/game/dungeon/items';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  onChangeClass: () => void;
  onReplayOpening: () => void;
}

const exerciseName = (id: string) => planExercises().find((x) => x.id === id)?.name ?? id;

/** What you wear right now, one tile per slot: the item's art in its rarity's frame and its name
    in that color, or a dashed slot with the plain piece you start with. */
function WornSlots({ state, tile }: { state: GameState; tile: number }) {
  const gear = gearOf(state),
    worn = state.fogGear?.worn ?? {};
  return (
    <ul className="grid grid-cols-3 gap-2 text-center">
      {(['weapon', 'armor', 'charm'] as const).map((slot) => {
        const it = worn[slot],
          piece = gear[slot === 'charm' ? 'shield' : slot];
        return (
          <li key={slot} className="flex min-w-0 flex-col items-center gap-1 rounded-lg bg-ink-900/70 px-1 pb-1.5 pt-2">
            {it ? (
              <ItemTile item={it} size={tile} />
            ) : (
              <span className="grid place-items-center rounded-lg border border-dashed border-slate-600 text-[9px] text-slate-600" style={{ width: tile, height: tile }}>
                empty
              </span>
            )}
            <span className="text-[9px] uppercase tracking-wider text-slate-500">{SLOT_NAME[slot]}</span>
            <span title={it ? nameOf(it) : piece.name} className="w-full truncate text-[10px] font-semibold leading-tight" style={{ color: it ? RARITY[it.rarity].color : tierText(piece.tier) }}>
              {it ? `${nameOf(it)}${it.plus ? ` +${it.plus}` : ''}` : piece.name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function HeroTab({ state, update, onChangeClass, onReplayOpening }: Props) {
  const menuMusic = useMenuMusic();
  const gear = gearOf(state);
  const cls = getClass(state.profile.classId);
  const story = storyState(state);
  const [backupMsg, setBackupMsg] = useState('');
  const [letterOpen, setLetterOpen] = useState(false);
  const [editingLook, setEditingLook] = useState(false);
  // Sideways: which section of the right-hand panel is open.
  const [part, setPart] = useState<'champion' | 'log' | 'keepsakes' | 'settings'>('champion');
  const land = useLand();
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

  const lookEditor = editingLook && (
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
  );

  const letterCard = hasLetter && (
    <section className={land ? 'rounded-xl bg-ink-900 p-2.5' : 'rounded-2xl bg-ink-800 p-4'}>
      <button onClick={() => setLetterOpen(!letterOpen)} className={`flex w-full items-center gap-2 font-pixel text-gold-300 ${land ? 'text-left text-[9px] leading-relaxed' : 'text-[10px]'}`}>
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
  );

  const stats = (
    <section className={land ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-3 gap-2'}>
      <Stat label="Quests" value={state.sessions.length} land={land} />
      <Stat label="Beat last time" value={state.sessions.filter((s) => s.better).length} land={land} />
      <Stat label="Chapter" value={story.finished ? 'Done' : story.index + 1} land={land} />
    </section>
  );

  const questLog = state.sessions.length > 0 && (
    <section className={land ? '' : 'rounded-2xl bg-ink-800 p-4'}>
      <h2 className="font-pixel text-[10px] text-gold-300">Quest log</h2>
      <ul className={`divide-y divide-ink-700 text-sm ${land ? 'mt-1' : 'mt-3'}`}>
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
  );

  const settings = (
    <section className={land ? '' : 'rounded-2xl bg-ink-800 p-4'}>
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
  );

  // Sideways, one screen of two panels as tall as the screen: you on a stage, and a panel with
  // tabs, your champion's points first, then your record and quest log, keepsakes, settings.
  if (land) {
    const PARTS = [
      { id: 'champion', label: 'Champion', dot: pointsFree(state) > 0 },
      { id: 'log', label: 'Log', dot: false },
      { id: 'keepsakes', label: 'Keepsakes', dot: false },
      { id: 'settings', label: 'Settings', dot: false },
    ] as const;
    return (
      <div className="flex h-full gap-3">
        <section className="flex w-48 shrink-0 flex-col items-center overflow-y-auto rounded-2xl bg-gradient-to-b from-ink-700 to-ink-800 px-2.5 pb-2.5 pt-3 min-[800px]:w-56">
          <p className="font-pixel text-[9px] text-slate-400">{cls ? cls.name : 'Adventurer'}</p>
          <div className="grid min-h-0 flex-1 place-items-center">
            <Hero gear={gear} classId={state.profile.classId} size={112} variant={heroVariant(state)} />
          </div>
          <div className="w-full">
            <WornSlots state={state} tile={36} />
          </div>
          <div className="mt-1.5 grid w-full grid-cols-2 gap-1.5">
            <button onClick={onChangeClass} className="rounded-lg bg-ink-900/70 px-1 py-2 text-[11px] font-semibold text-slate-300">
              {cls ? 'Change class' : 'Choose a class'}
            </button>
            <button onClick={() => setEditingLook(true)} className="flex items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-ink-900/70 px-1 py-2 text-[11px] font-semibold text-slate-300">
              <Palette size={12} className="shrink-0" /> Change look
            </button>
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col rounded-2xl bg-ink-800">
          <div role="tablist" aria-label="Your hero" className="m-2 mb-0 grid shrink-0 grid-cols-4 gap-1 rounded-xl bg-ink-900 p-1">
            {PARTS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={part === t.id}
                onClick={() => setPart(t.id)}
                className={`relative rounded-lg py-1.5 text-xs font-semibold transition active:scale-95 ${part === t.id ? 'bg-gold-400 text-ink-950' : 'text-slate-300'}`}
              >
                {t.label}
                {t.dot && <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-gold-300 ring-2 ring-ink-900" />}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {part === 'champion' ? (
              <>
                <StatPoints state={state} update={update} land />
                <SpCard state={state} update={update} land />
              </>
            ) : part === 'log' ? (
              <>
                {stats}
                {letterCard}
                <FriendsCard state={state} update={update} sandbox={inSandbox()} />
                {questLog || <p className="text-xs text-slate-500">Your quests land here.</p>}
              </>
            ) : part === 'keepsakes' ? (
              <Keepsakes cleared={state.fog?.cleared ?? 0} land />
            ) : (
              settings
            )}
          </div>
        </section>
        {lookEditor}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col items-center rounded-2xl bg-gradient-to-b from-ink-700 to-ink-800 pb-4 pt-5">
        <p className="font-pixel text-[10px] text-slate-400">{cls ? cls.name : 'Adventurer'}</p>
        <Hero gear={gear} classId={state.profile.classId} size={180} variant={heroVariant(state)} />
        <div className="mt-3 w-full px-3">
          <WornSlots state={state} tile={48} />
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

      <SpCard state={state} update={update} />

      {lookEditor}

      {letterCard}

      {stats}

      <Keepsakes cleared={state.fog?.cleared ?? 0} />

      <FriendsCard state={state} update={update} sandbox={inSandbox()} />

      {questLog}

      {settings}
    </div>
  );
}

/** What you won in the Fog: one keepsake per boss. */
function Keepsakes({ cleared, land }: { cleared: number; land?: boolean }) {
  return (
    <section className={land ? '' : 'rounded-2xl bg-ink-800 p-4'}>
      <h2 className="flex items-center gap-2 font-pixel text-[10px] text-gold-300">
        <Gem size={14} /> Keepsakes
      </h2>
      <p className="mt-1 text-xs text-slate-500">One for every boss you beat in the Fog, on the Play tab.</p>
      <ul className={`mt-3 grid gap-2 ${land ? 'grid-cols-3' : 'grid-cols-2'}`}>
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

function Stat({ label, value, land }: { label: string; value: number | string; land?: boolean }) {
  return (
    <div className={land ? 'flex flex-col justify-between rounded-xl bg-ink-900 p-2' : 'rounded-2xl bg-ink-800 p-3'}>
      <p className={`uppercase tracking-wider text-slate-400 ${land ? 'text-[9px] leading-tight' : 'text-[11px]'}`}>{label}</p>
      <p className={`mt-1 font-mono font-semibold ${land ? 'text-lg' : 'text-2xl'}`}>{value}</p>
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
