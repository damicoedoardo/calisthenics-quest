'use client';

import { useCallback, useMemo, useState } from 'react';
import { Headphones, Minus, Plus } from 'lucide-react';
import { Dialogue } from './Dialogue';
import { Book, Ember, Enemy, Hollow, Wanderer } from './Characters';
import { Hero } from './Hero';
import { FirstFight } from './FirstFight';
import { RiseUp } from './RiseUp';
import { SoundToggle, useMusic } from './Sound';
import { Weather } from './Weather';
import { placement, type GameState, type Letter } from '@/lib/game';
import { equippedGear, type Gear, type GearSlot } from '@/lib/gear';
import { getPath } from '@/lib/skills';
import { music } from '@/lib/music';
import { COLD_OPEN, FADING, FIRST_QUEST, HOLLOW_MEET, LETTER_PROMPTS, MEET, SEALED, VOICES } from '@/lib/prologue';
import { renderLines } from '@/lib/story';

type Step = 'title' | 'cold' | 'fading' | 'voice' | 'hollow' | 'fight' | 'fallen' | 'meet' | 'letter' | 'sealed' | 'placement' | 'quest';

interface Props {
  state: GameState;
  onFinish: (patch: { letter: Letter; voice: string; progress?: GameState['progress'] }) => void;
  /** Shown on the title screen when the opening is replayed. */
  onExit?: () => void;
}

const goldButton =
  'w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:opacity-40';

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-ink-800 p-3">
      <p className="text-sm text-slate-200">{label}</p>
      <div className="flex items-center gap-2">
        <button aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="grid h-10 w-10 place-items-center rounded-lg bg-ink-700 active:scale-95">
          <Minus size={16} />
        </button>
        <span className="w-8 text-center font-mono text-xl font-bold">{value}</span>
        <button aria-label={`More ${label}`} onClick={() => onChange(value + 1)} className="grid h-10 w-10 place-items-center rounded-lg bg-ink-700 active:scale-95">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

/** The fading montage: who you were turns gray, and something stands behind you. */
function fadingBackdrop(gear: ReturnType<typeof equippedGear>) {
  return (i: number) => {
    const t = i / (FADING.length - 1);
    return (
      <div className="relative">
        {i === FADING.length - 1 && (
          <div className="absolute -right-16 bottom-0 animate-fadein opacity-40">
            <Hollow size={120} bounce={false} />
          </div>
        )}
        <div className="transition-all duration-1000" style={{ filter: `grayscale(${t}) brightness(${1 - 0.4 * t})`, opacity: 1 - 0.4 * t }}>
          <Hero gear={gear} size={150 - 30 * t} bounce={false} variant={i < 2 ? 'echo' : 'normal'} />
        </div>
      </div>
    );
  };
}

/** First run: the story opens, the player meets the voice in their head, loses, gets up, and writes their letter. */
export function Prologue({ state, onFinish, onExit }: Props) {
  const [step, setStep] = useState<Step>('title');
  const [letter, setLetter] = useState<Letter>(state.profile.letter);
  const [voice, setVoice] = useState(state.profile.voice);
  const [custom, setCustom] = useState(!!state.profile.voice && !VOICES.includes(state.profile.voice));
  const [counts, setCounts] = useState({ push: 15, pull: 3, core: 10 });
  const gear = equippedGear(undefined, state.progress);
  // A dull, cracked blade for the first fight.
  const fightGear: Record<GearSlot, Gear> = { ...gear, weapon: { ...gear.weapon, tier: 1, color: '#6b7280', glow: undefined } };
  // Only brand-new players are placed; anyone replaying keeps their progress.
  const needsPlacement = !state.profile.onboarded && state.sessions.length === 0;
  const placed = useMemo(() => placement(counts.push, counts.pull, counts.core), [counts]);
  const words = { ...letter, voice: voice.trim() || "You're not enough.", sessions: String(state.sessions.length) };
  const go = useCallback((s: Step) => () => setStep(s), []);

  const finish = () => onFinish({ letter, voice: voice.trim(), progress: needsPlacement ? placed : undefined });

  switch (step) {
    case 'title':
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center bg-ink-950 px-6 text-center"
          onClick={() => {
            music.unlock();
            setStep('cold');
          }}
        >
          <p className="font-pixel text-3xl tracking-widest text-gold-400">FORMA</p>
          <p className="mt-3 font-pixel text-[10px] text-slate-400">The Road Back</p>
          <div className="mt-12 opacity-60 grayscale">
            <Hero gear={gear} size={96} />
          </div>
          <p className="mt-12 animate-blink font-pixel text-[10px] text-slate-300">Tap to begin</p>
          <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
            <Headphones size={14} /> Best with sound on
          </p>
          {onExit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExit();
              }}
              className="mt-8 text-sm text-slate-500"
            >
              Not now
            </button>
          )}
        </div>
      );
    case 'cold':
      return (
        <>
          <Weather kind="rain" />
          <Dialogue key="cold" lines={COLD_OPEN} gear={gear} cinematic music="memory" onDone={go('fading')} />
        </>
      );
    case 'fading':
      return <Dialogue key="fading" lines={FADING} gear={gear} cinematic music="memory" backdrop={fadingBackdrop(gear)} onDone={go('voice')} />;
    case 'voice':
      return <VoicePick voice={voice} custom={custom} setVoice={setVoice} setCustom={setCustom} onDone={go('hollow')} />;
    case 'hollow':
      return (
        <>
          <Weather kind="ash" />
          <Dialogue
            key="hollow"
            lines={renderLines(HOLLOW_MEET, words)}
            gear={fightGear}
            music="hollow"
            backdrop={(i) =>
              i === 0 ? (
                <Hero gear={fightGear} size={150} bounce={false} />
              ) : (
                <div className="transition-all duration-1000" style={i === 1 ? { opacity: 0.4, filter: 'grayscale(1)' } : undefined}>
                  <Hollow size={160} />
                </div>
              )
            }
            onDone={go('fight')}
          />
        </>
      );
    case 'fight':
      return <FirstFight voice={words.voice} gear={fightGear} onDone={go('fallen')} />;
    case 'fallen':
      return <RiseUp gear={fightGear} onDone={go('meet')} />;
    case 'meet':
      return <Dialogue key="meet" lines={MEET} gear={fightGear} backdrop={() => <Wanderer size={140} />} onDone={go('letter')} />;
    case 'letter':
      return <LetterForm letter={letter} setLetter={setLetter} onDone={go('sealed')} />;
    case 'sealed':
      return (
        <Dialogue
          key="sealed"
          lines={SEALED}
          gear={gear}
          backdrop={(i) => (i < 2 ? <Wanderer size={140} /> : i < 5 ? <Book size={120} /> : <Ember size={36} dim />)}
          onDone={go(needsPlacement ? 'placement' : 'quest')}
        />
      );
    case 'quest':
      return <Dialogue key="quest" lines={FIRST_QUEST} gear={gear} cinematic backdrop={() => <Enemy id="slime" size={110} />} onDone={finish} />;
    case 'placement':
      return <Placement counts={counts} setCounts={setCounts} placed={placed} onDone={go('quest')} />;
  }
}

function VoicePick({
  voice,
  custom,
  setVoice,
  setCustom,
  onDone,
}: {
  voice: string;
  custom: boolean;
  setVoice: (v: string) => void;
  setCustom: (c: boolean) => void;
  onDone: () => void;
}) {
  useMusic('memory');
  return (
    <div className="safe-bottom fixed inset-0 overflow-y-auto bg-ink-950">
      <div className="safe-top flex px-4">
        <SoundToggle />
      </div>
      <div className="mx-auto flex min-h-[90dvh] max-w-md flex-col px-5 pb-6">
        <div className="flex justify-center opacity-50">
          <Hollow size={90} />
        </div>
        <p className="mt-4 text-center text-lg leading-relaxed text-slate-300">
          It&apos;s quiet. It&apos;s always there. And it sounds exactly like you.
        </p>
        <p className="mt-5 text-center font-pixel text-[11px] text-red-300">What does it tell you?</p>
        <div className="mt-5 space-y-2">
          {VOICES.map((v) => (
            <button
              key={v}
              onClick={() => {
                setVoice(v);
                setCustom(false);
              }}
              className={`w-full rounded-xl px-4 py-3 text-left text-base transition active:scale-[.98] ${
                !custom && voice === v ? 'bg-[#2a1630] text-red-100 ring-1 ring-red-400/60' : 'bg-ink-800 text-slate-300'
              }`}
            >
              &ldquo;{v}&rdquo;
            </button>
          ))}
          {custom ? (
            <input
              autoFocus
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              placeholder="In its words..."
              maxLength={80}
              className="w-full rounded-xl bg-[#2a1630] px-4 py-3 text-base text-red-100 outline-none ring-1 ring-red-400/60 placeholder:text-red-200/40"
            />
          ) : (
            <button
              onClick={() => {
                setCustom(true);
                setVoice('');
              }}
              className="w-full rounded-xl bg-ink-800 px-4 py-3 text-left text-base text-slate-500"
            >
              Something else...
            </button>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">Be honest. Only you will ever see this.</p>
        <div className="flex-1" />
        <button onClick={onDone} disabled={!voice.trim()} className={`mt-6 ${goldButton}`}>
          That&apos;s the one
        </button>
      </div>
    </div>
  );
}

function LetterForm({ letter, setLetter, onDone }: { letter: Letter; setLetter: (l: Letter) => void; onDone: () => void }) {
  useMusic('rise');
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6">
      <div className="mt-4 flex items-center gap-3">
        <Wanderer size={56} />
        <p className="flex-1 text-sm italic text-slate-300">&ldquo;Write to the person you want to become.&rdquo;</p>
        <SoundToggle />
      </div>
      <div className="mt-5 flex-1 space-y-4 rounded-2xl bg-[#f5ecd7] p-5 text-[#3b2a1a] shadow-xl">
        <p className="font-pixel text-[11px]">A letter to my future self</p>
        {LETTER_PROMPTS.map((p) => (
          <label key={p.key} className="block">
            <span className="text-sm font-semibold">{p.label}</span>
            <textarea
              value={letter[p.key]}
              onChange={(e) => setLetter({ ...letter, [p.key]: e.target.value })}
              placeholder={p.placeholder}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-[#d6c7a1] bg-[#fbf6ea] px-3 py-2 text-base outline-none placeholder:text-[#a8977a] focus:border-[#a16207]"
            />
          </label>
        ))}
        <p className="text-xs text-[#7a6a4f]">Every line is optional. Only you will ever read it.</p>
      </div>
      <button onClick={onDone} className={`mt-5 ${goldButton}`}>
        Seal the letter
      </button>
    </div>
  );
}

function Placement({
  counts,
  setCounts,
  placed,
  onDone,
}: {
  counts: { push: number; pull: number; core: number };
  setCounts: (c: { push: number; pull: number; core: number }) => void;
  placed: GameState['progress'];
  onDone: () => void;
}) {
  useMusic('rise');
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6">
      <div className="mt-4 flex items-center gap-3">
        <Ember size={44} />
        <p className="flex-1 text-sm text-slate-300">&ldquo;Before we walk: roughly how many can you do today? Guess low. I won&apos;t judge.&rdquo;</p>
      </div>
      <div className="mt-6 flex-1 space-y-3">
        <Stepper label="Push-ups" value={counts.push} onChange={(v) => setCounts({ ...counts, push: v })} />
        <Stepper label="Pull-ups" value={counts.pull} onChange={(v) => setCounts({ ...counts, pull: v })} />
        <Stepper label="Hanging knee raises" value={counts.core} onChange={(v) => setCounts({ ...counts, core: v })} />
        <div className="rounded-xl bg-ink-900 p-4 text-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500">You start at</p>
          <ul className="mt-2 space-y-1">
            {(['push', 'pull', 'core'] as const).map((p) => (
              <li key={p} className="flex justify-between">
                <span className="text-slate-400">{getPath(p).name}</span>
                <span className="font-semibold text-slate-100">{getPath(p).nodes[placed[p]].name}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Starting a step lower on purpose, so day one feels winnable.</p>
        </div>
      </div>
      <button onClick={onDone} className={`mt-5 ${goldButton}`}>
        Begin the road
      </button>
    </div>
  );
}
