'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Dialogue } from './Dialogue';
import { Ember, Wanderer } from './Characters';
import { placement, type GameState, type Letter } from '@/lib/game';
import { equippedGear } from '@/lib/gear';
import { getPath } from '@/lib/skills';
import type { Line } from '@/lib/story';

type Step = 'intro' | 'meet' | 'letter' | 'sealed' | 'placement' | 'quest';

const INTRO: Line[] = [
  { who: 'narrator', text: 'There was a time you were strong.' },
  { who: 'narrator', text: 'Then life happened. Work. Tired evenings. One skipped week became a month. A month became years.' },
  { who: 'narrator', text: 'Nobody took it from you. You just put it down.' },
];

const MEET: Line[] = [
  { who: 'narrator', text: 'You wake up in a gray, quiet land. A cracked sword lies in the ash beside you.' },
  { who: 'wanderer', text: "You're awake. Good. Most people who come here stay asleep." },
  { who: 'you', text: 'Where am I?' },
  { who: 'wanderer', text: "The Ashlands. It's where things go when we stop taking care of them." },
  { who: 'wanderer', text: 'Your strength is here too. Buried, not gone.' },
  { who: 'wanderer', text: "Before we walk, I need one thing from you. Write to the person you want to become. Not who you were. Who you're going to be." },
];

const SEALED: Line[] = [
  { who: 'narrator', text: 'The Wanderer folds your letter without reading it, and puts it inside his coat.' },
  { who: 'wanderer', text: "I'll keep this safe. You'll see it again. I promise." },
  { who: 'narrator', text: 'Something flickers in the ash. A spark, no bigger than a fingernail.' },
  { who: 'ember', text: "...hi. Sorry. I'm small right now. I used to be bigger." },
  { who: 'ember', text: 'I think I was waiting for you.' },
];

const QUEST: Line[] = [
  { who: 'wanderer', text: 'Your first quest is simple. Show up three times this week.' },
  { who: 'wanderer', text: 'Not perfect. Present.' },
  { who: 'ember', text: "Every session you do, I grow. Just so you know. No pressure. (Some pressure.)" },
];

const PROMPTS: { key: keyof Letter; label: string; placeholder: string }[] = [
  { key: 'why', label: "Dear future me, I'm starting again because...", placeholder: 'I miss feeling strong in my own body' },
  { key: 'want', label: 'One day I want to be able to...', placeholder: 'do 15 pull-ups again, and hold an L-sit' },
  { key: 'remind', label: 'When I want to quit, remind me that...', placeholder: 'every rep counts, even on bad days' },
];

interface Props {
  state: GameState;
  onFinish: (patch: { letter: Letter; progress?: GameState['progress'] }) => void;
}

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

/** First run: the story opens, the player writes their letter and says roughly where they stand. */
export function Prologue({ state, onFinish }: Props) {
  const [step, setStep] = useState<Step>('intro');
  const [letter, setLetter] = useState<Letter>(state.profile.letter);
  const [counts, setCounts] = useState({ push: 15, pull: 3, core: 10 });
  const gear = equippedGear(undefined, state.progress);
  // Existing players keep their progress; only new ones are placed.
  const needsPlacement = state.sessions.length === 0;
  const placed = useMemo(() => placement(counts.push, counts.pull, counts.core), [counts]);

  const finish = () => onFinish({ letter, progress: needsPlacement ? placed : undefined });

  if (step === 'intro') return <Rain><Dialogue lines={INTRO} gear={gear} onDone={() => setStep('meet')} /></Rain>;
  if (step === 'meet') return <Dialogue lines={MEET} gear={gear} onDone={() => setStep('letter')} />;
  if (step === 'sealed') return <Dialogue lines={SEALED} gear={gear} onDone={() => setStep(needsPlacement ? 'placement' : 'quest')} />;
  if (step === 'quest') return <Dialogue lines={QUEST} gear={gear} onDone={finish} />;

  if (step === 'letter') {
    return (
      <div className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6">
        <div className="mt-4 flex items-center gap-3">
          <Wanderer size={56} />
          <p className="text-sm italic text-slate-300">&ldquo;Write to the person you want to become.&rdquo;</p>
        </div>
        <div className="mt-5 flex-1 space-y-4 rounded-2xl bg-[#f5ecd7] p-5 text-[#3b2a1a] shadow-xl">
          <p className="font-pixel text-[11px]">A letter to my future self</p>
          {PROMPTS.map((p) => (
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
        <button
          onClick={() => setStep('sealed')}
          className="mt-5 w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
        >
          Seal the letter
        </button>
      </div>
    );
  }

  // placement
  return (
    <div className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6">
      <div className="mt-4 flex items-center gap-3">
        <Ember size={44} />
        <p className="text-sm text-slate-300">&ldquo;Before we walk: roughly how many can you do today? Guess low. I won&apos;t judge.&rdquo;</p>
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
      <button
        onClick={() => setStep('quest')}
        className="mt-5 w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
      >
        Begin the road
      </button>
    </div>
  );
}

/** Pixel rain behind the opening lines. */
function Rain({ children }: { children: ReactNode }) {
  const drops = useMemo(
    () => Array.from({ length: 40 }).map(() => ({ left: Math.random() * 100, delay: Math.random() * 2, dur: 0.7 + Math.random() * 0.6 })),
    [],
  );
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
        {drops.map((d, i) => (
          <span
            key={i}
            className="absolute top-0 h-3 w-px animate-rain bg-sky-300/40"
            style={{ left: `${d.left}%`, animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s` }}
          />
        ))}
      </div>
      {children}
    </>
  );
}
