'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Headphones } from 'lucide-react';
import { Dialogue } from './Dialogue';
import { Book, Ember, Enemy, Hollow, Wanderer } from './Characters';
import { Hero } from './Hero';
import { FirstFight } from './FirstFight';
import { useLook } from './Look';
import { LookEditor } from './LookEditor';
import { RiseUp } from './RiseUp';
import { SoundToggle, useMusic } from './Sound';
import { Weather } from './Weather';
import { PixelSnap } from './sideways';
import type { GameState, Kit, Letter } from '@/lib/game';
import { equippedGear, type Gear, type GearSlot } from '@/lib/gear';
import { music } from '@/lib/music';
import { COLD_OPEN, FADING, FIRST_QUEST, HOLLOW_MEET, LETTER_PROMPTS, MEET, SEALED, VOICES } from '@/story/opening';
import { renderLines, storyWords } from '@/story/engine';
import { STARTER_LOOKS } from '@/sprites/characters/hero';
import type { Look } from '@/sprites/engine/figure';

type Step = 'title' | 'cold' | 'fading' | 'voice' | 'hollow' | 'fight' | 'fallen' | 'meet' | 'letter' | 'sealed' | 'kit' | 'quest' | 'look' | 'name';

interface Props {
  state: GameState;
  onFinish: (patch: { letter: Letter; voice: string; kit?: Kit; name?: string }) => void;
  /** Saves the player's look right away (the boy/girl pick, then the editor after the story). */
  onLook: (look: Look) => void;
  /** Shown on the title screen when the opening is replayed. */
  onExit?: () => void;
  /** Developer mode: jump past the whole opening. */
  onSkip?: () => void;
  /** On the first screen of an installed iPhone app: bring the hero over from Safari. */
  bring?: ReactNode;
}

const goldButton =
  'w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:opacity-40';

/** Held sideways, the letter, the kit pick and the look editor go in two columns: who speaks and the
    button on the left, the form on the right. */
const SIDE = 'land-safe-x [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:max-w-4xl [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-[16rem_minmax(0,1fr)] [@media(orientation:landscape)_and_(max-height:600px)]:grid-rows-[auto_1fr] [@media(orientation:landscape)_and_(max-height:600px)]:gap-x-8 [@media(orientation:landscape)_and_(max-height:600px)]:pb-4';
// The button stays in reach when the form is taller than the screen (the look editor).
const SIDE_BUTTON = '[@media(orientation:landscape)_and_(max-height:600px)]:sticky [@media(orientation:landscape)_and_(max-height:600px)]:bottom-4 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-2 [@media(orientation:landscape)_and_(max-height:600px)]:self-end';

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

/**
 * First run: pick boy or girl, the story opens, the player meets the voice in their head, loses,
 * gets up, writes their letter, and finally makes the hero look like them. Held sideways, every
 * figure in it is drawn at a whole multiple of its pixels (PixelSnap).
 */
export function Prologue(props: Props) {
  return (
    <PixelSnap.Provider value>
      <PrologueSteps {...props} />
    </PixelSnap.Provider>
  );
}

function PrologueSteps({ state, onFinish, onLook, onExit, onSkip, bring }: Props) {
  const [step, setStep] = useState<Step>('title');
  const look = useLook();
  const firstRun = !state.profile.onboarded;
  const [letter, setLetter] = useState<Letter>(state.profile.letter);
  const [voice, setVoice] = useState(state.profile.voice);
  const [custom, setCustom] = useState(!!state.profile.voice && !VOICES.includes(state.profile.voice));
  const [kit, setKit] = useState<Kit>(state.profile.kit ?? 'gym');
  const [name, setName] = useState(state.profile.name ?? '');
  const gear = equippedGear(undefined, state.sessions.length);
  // A dull, cracked blade for the first fight.
  const fightGear: Record<GearSlot, Gear> = { ...gear, weapon: { ...gear.weapon, tier: 1, color: '#6b7280', glow: undefined } };
  // Only brand-new players are asked where they train; anyone replaying keeps their answer.
  const asksKit = !state.profile.onboarded && state.sessions.length === 0;
  // The flame gets its name after the first workout; until then it's "A spark".
  const words = { ...storyWords(state), ...letter, voice: voice.trim() || "You're not enough.", flame: state.profile.flame ?? '' };
  const go = useCallback((s: Step) => () => setStep(s), []);

  const finish = () => onFinish({ letter, voice: voice.trim(), kit: asksKit ? kit : undefined, name: name.trim() || undefined });
  const begin = () => {
    music.unlock();
    setStep('cold');
  };

  const skip = onSkip && (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSkip();
      }}
      className="mt-8 rounded-xl border border-dashed border-sky-400/60 px-4 py-2.5 text-sm text-sky-300"
    >
      Skip the intro (developer mode)
    </button>
  );

  switch (step) {
    case 'title':
      if (firstRun && !state.profile.look)
        return (
          // Held sideways: the name on the left, the pick on the right.
          <div className="fixed inset-0 flex flex-col items-center justify-center bg-ink-950 px-6 text-center [@media(orientation:landscape)_and_(max-height:600px)]:flex-row [@media(orientation:landscape)_and_(max-height:600px)]:gap-16">
            <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:block">
              <p className="font-pixel text-3xl tracking-widest text-gold-400">FORMA</p>
              <p className="mt-3 font-pixel text-[10px] text-slate-400">The Road Back</p>
            </div>
            <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:flex-col [@media(orientation:landscape)_and_(max-height:600px)]:items-center">
            <p className="mt-12 font-pixel text-[10px] text-slate-300 [@media(orientation:landscape)_and_(max-height:600px)]:mt-0">Who walks the road?</p>
            <div className="mt-5 flex gap-4">
              {(['m', 'f'] as const).map((sex) => (
                <button
                  key={sex}
                  onClick={() => {
                    onLook(STARTER_LOOKS[sex]);
                    begin();
                  }}
                  className="flex flex-col items-center rounded-2xl bg-ink-800 px-2 pb-3 pt-1 transition active:scale-95"
                >
                  <Hero gear={gear} look={STARTER_LOOKS[sex]} size={120} />
                  <span className="mt-1 font-pixel text-[10px] text-gold-300">{sex === 'm' ? 'Boy' : 'Girl'}</span>
                </button>
              ))}
            </div>
            <p className="mt-8 flex items-center gap-2 text-xs text-slate-500 [@media(orientation:landscape)_and_(max-height:600px)]:mt-4">
              <Headphones size={14} /> Best with sound on
            </p>
            {bring}
            {skip}
            </div>
          </div>
        );
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center bg-ink-950 px-6 text-center [@media(orientation:landscape)_and_(max-height:600px)]:flex-row [@media(orientation:landscape)_and_(max-height:600px)]:gap-16"
          onClick={begin}
        >
          <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:flex-col [@media(orientation:landscape)_and_(max-height:600px)]:items-center">
          <p className="font-pixel text-3xl tracking-widest text-gold-400">FORMA</p>
          <p className="mt-3 font-pixel text-[10px] text-slate-400">The Road Back</p>
          <div className="mt-12 opacity-60 grayscale [@media(orientation:landscape)_and_(max-height:600px)]:mt-6">
            <Hero gear={gear} size={96} />
          </div>
          </div>
          <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:flex-col [@media(orientation:landscape)_and_(max-height:600px)]:items-center">
          <p className="mt-12 [@media(orientation:landscape)_and_(max-height:600px)]:mt-0 animate-blink font-pixel text-[10px] text-slate-300">Tap to begin</p>
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
          {skip}
          </div>
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
          backdrop={(i) => (i < 2 ? <Wanderer size={140} /> : i < 5 ? <Book size={120} /> : <Ember size={72} stage="spark" mood="soft" />)}
          flame="spark"
          onDone={go(asksKit ? 'kit' : 'quest')}
        />
      );
    case 'quest':
      return (
        <Dialogue key="quest" lines={FIRST_QUEST} gear={gear} flame="spark" cinematic backdrop={() => <Enemy id="slime" size={110} />} onDone={firstRun ? go('look') : finish} />
      );
    case 'kit':
      return <KitPick kit={kit} setKit={setKit} onDone={go('quest')} />;
    case 'look':
      return <MakeItYours look={look} setLook={onLook} gear={gear} onDone={go('name')} />;
    case 'name':
      return <NameIt name={name} setName={setName} onDone={finish} />;
  }
}

/** After the look: the hero's name, asked once. It's what friends will see. */
function NameIt({ name, setName, onDone }: { name: string; setName: (n: string) => void; onDone: () => void }) {
  useMusic('rise');
  const ok = name.trim().length > 0;
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 pb-6">
      <div className="flex items-center gap-3">
        <Ember size={64} stage="spark" />
        <p className="flex-1 text-sm text-slate-300">&ldquo;And what should I call you? It&apos;s the name your friends will see, if you bring any along.&rdquo;</p>
      </div>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onDone();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          autoFocus
          placeholder="Your name"
          aria-label="Your hero's name"
          className="w-full rounded-2xl bg-ink-900 px-4 py-4 text-center text-lg text-slate-100 placeholder:text-slate-500"
        />
        <button type="submit" disabled={!ok} className={goldButton}>
          That&apos;s me
        </button>
      </form>
    </div>
  );
}

function MakeItYours({ look, setLook, gear, onDone }: { look: Look; setLook: (l: Look) => void; gear: Record<GearSlot, Gear>; onDone: () => void }) {
  useMusic('rise');
  return (
    // Held sideways: the flame and the button on the left, the editor on the right.
    <div className={`safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 ${SIDE}`}>
      <div className="mt-4 flex items-center gap-3 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-1">
        <Ember size={64} stage="spark" />
        <p className="flex-1 text-sm text-slate-300">&ldquo;One more thing before we walk. Is this really you? Change anything. You can change it again later.&rdquo;</p>
      </div>
      <div className="mt-5 flex-1 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:600px)]:row-span-2 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:mt-4">
        <LookEditor look={look} onChange={setLook} gear={gear} />
      </div>
      <button onClick={onDone} className={`mt-5 ${goldButton} ${SIDE_BUTTON}`}>
        This is me
      </button>
    </div>
  );
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
      <div className="safe-top land-safe-x flex px-4">
        <SoundToggle />
      </div>
      {/* Held sideways: the Hollow and its question on the left, the answers on the right. */}
      <div className="land-safe-x mx-auto flex min-h-[90dvh] max-w-md flex-col px-5 pb-6 [@media(orientation:landscape)_and_(max-height:600px)]:min-h-0 [@media(orientation:landscape)_and_(max-height:600px)]:max-w-4xl [@media(orientation:landscape)_and_(max-height:600px)]:flex-row [@media(orientation:landscape)_and_(max-height:600px)]:items-center [@media(orientation:landscape)_and_(max-height:600px)]:gap-8 [@media(orientation:landscape)_and_(max-height:600px)]:pb-3">
        <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:block [@media(orientation:landscape)_and_(max-height:600px)]:flex-1">
        <div className="flex justify-center opacity-50">
          <Hollow size={90} />
        </div>
        <p className="mt-4 text-center text-lg leading-relaxed text-slate-300">
          It&apos;s quiet. It&apos;s always there. And it sounds exactly like you.
        </p>
        <p className="mt-5 text-center font-pixel text-[11px] text-red-300">What does it tell you?</p>
        </div>
        <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:flex-1 [@media(orientation:landscape)_and_(max-height:600px)]:flex-col">
        <div className="mt-5 space-y-2 [@media(orientation:landscape)_and_(max-height:600px)]:mt-0 [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:600px)]:gap-2 [@media(orientation:landscape)_and_(max-height:600px)]:space-y-0">
          {VOICES.map((v) => (
            <button
              key={v}
              onClick={() => {
                setVoice(v);
                setCustom(false);
              }}
              className={`w-full rounded-xl px-4 py-3 text-left text-base transition active:scale-[.98] [@media(orientation:landscape)_and_(max-height:600px)]:py-2 ${
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
              className="w-full rounded-xl bg-[#2a1630] px-4 py-3 text-base text-red-100 [@media(orientation:landscape)_and_(max-height:600px)]:py-2 outline-none ring-1 ring-red-400/60 placeholder:text-red-200/40"
            />
          ) : (
            <button
              onClick={() => {
                setCustom(true);
                setVoice('');
              }}
              className="w-full rounded-xl bg-ink-800 px-4 py-3 text-left text-base text-slate-500 [@media(orientation:landscape)_and_(max-height:600px)]:py-2"
            >
              Something else...
            </button>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500 [@media(orientation:landscape)_and_(max-height:600px)]:mt-2">Be honest. Only you will ever see this.</p>
        <div className="flex-1" />
        <button onClick={onDone} disabled={!voice.trim()} className={`mt-6 ${goldButton} [@media(orientation:landscape)_and_(max-height:600px)]:mt-3 [@media(orientation:landscape)_and_(max-height:600px)]:py-3`}>
          That&apos;s the one
        </button>
        </div>
      </div>
    </div>
  );
}

function LetterForm({ letter, setLetter, onDone }: { letter: Letter; setLetter: (l: Letter) => void; onDone: () => void }) {
  useMusic('rise');
  return (
    // Held sideways: the Wanderer and the button on the left, the letter on the right.
    <div className={`safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 ${SIDE}`}>
      <div className="mt-4 flex items-center gap-3 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-1">
        <Wanderer size={56} />
        <p className="flex-1 text-sm italic text-slate-300">&ldquo;Write to the person you want to become.&rdquo;</p>
        <SoundToggle />
      </div>
      <div className="mt-5 flex-1 space-y-4 rounded-2xl bg-[#f5ecd7] p-5 text-[#3b2a1a] shadow-xl [@media(orientation:landscape)_and_(max-height:600px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:600px)]:row-span-2 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:mt-4 [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:600px)]:gap-x-4 [@media(orientation:landscape)_and_(max-height:600px)]:gap-y-3 [@media(orientation:landscape)_and_(max-height:600px)]:space-y-0 [@media(orientation:landscape)_and_(max-height:600px)]:p-4">
        <p className="font-pixel text-[11px] [@media(orientation:landscape)_and_(max-height:600px)]:col-span-2">A letter to my future self</p>
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
        <p className="text-xs text-[#7a6a4f] [@media(orientation:landscape)_and_(max-height:600px)]:col-span-2">Every line is optional. Only you will ever read it.</p>
      </div>
      <button onClick={onDone} className={`mt-5 ${goldButton} ${SIDE_BUTTON}`}>
        Seal the letter
      </button>
    </div>
  );
}

const KITS: { id: Kit; label: string; note: string }[] = [
  { id: 'gym', label: 'At a gym', note: 'Barbells, dumbbells, cables' },
  { id: 'home', label: 'At home', note: 'No kit: a chair, a table, the floor' },
];

function KitPick({ kit, setKit, onDone }: { kit: Kit; setKit: (k: Kit) => void; onDone: () => void }) {
  useMusic('rise');
  return (
    // Held sideways: the flame and the button on the left, the two places on the right.
    <div className={`safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 ${SIDE}`}>
      <div className="mt-4 flex items-center gap-3 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-1">
        <Ember size={64} stage="spark" />
        <p className="flex-1 text-sm text-slate-300">&ldquo;Before we walk: where will you train? Either is fine. You can change it on the Train tab.&rdquo;</p>
      </div>
      <div className="mt-6 flex-1 space-y-3 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:600px)]:row-span-2 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:mt-4 [@media(orientation:landscape)_and_(max-height:600px)]:self-center">
        {KITS.map((k) => (
          <button
            key={k.id}
            aria-pressed={kit === k.id}
            onClick={() => setKit(k.id)}
            className={`w-full rounded-xl p-4 text-left ${kit === k.id ? 'bg-ink-700 ring-2 ring-gold-400' : 'bg-ink-800'}`}
          >
            <span className="block font-semibold">{k.label}</span>
            <span className="block text-xs text-slate-400">{k.note}</span>
          </button>
        ))}
        <p className="px-1 text-xs text-slate-500">Every workout starts light, with a warm-up, and ends with a stretch. Day one should feel winnable.</p>
      </div>
      <button onClick={onDone} className={`mt-5 ${goldButton} ${SIDE_BUTTON}`}>
        Begin the road
      </button>
    </div>
  );
}
