'use client';

import { useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { LIFT_BANDS, PULLUP_BANDS, PUSHUP_BANDS, RUN_BANDS, answersOf, applySetup, type SetupAnswers } from '@/lib/coach/setup';
import type { Area, Experience, Gear, Goal, Minutes, Mode } from '@/lib/coach/types';

/* Setting up the coach: eight short screens of taps, one free answer at the end. It tells the
   coach what you train, what for, how often, with what, and where you start. Redo it any time
   from the Train tab; your log stays. */

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  onClose: () => void;
}

const MODES: { id: Mode; label: string; note: string }[] = [
  { id: 'gym', label: 'Gym', note: 'Weights, machines, cables' },
  { id: 'calisthenics', label: 'Calisthenics', note: 'Your body weight: push-ups, pull-ups, dips' },
  { id: 'running', label: 'Running', note: 'Easy runs, intervals, a longer one' },
];
const GOALS: { id: Goal; label: string; note: string }[] = [
  { id: 'health', label: 'Feel good', note: 'Fit, healthy, more energy' },
  { id: 'strength', label: 'Get stronger', note: 'Lift more, fewer reps, heavier' },
  { id: 'muscle', label: 'Build muscle', note: 'More reps, a classic gym plan' },
  { id: 'endurance', label: 'Go longer', note: 'Run further, last longer' },
  { id: 'skill', label: 'Learn a skill', note: 'A first pull-up, an L-sit, a handstand' },
];
const GEAR: { id: Gear; label: string; note: string }[] = [
  { id: 'gym', label: 'A full gym', note: 'Barbells, dumbbells, machines' },
  { id: 'dumbbells', label: 'Dumbbells', note: 'Or kettlebells at home' },
  { id: 'bar', label: 'A pull-up bar', note: 'Or rings, a park bar' },
  { id: 'bands', label: 'Bands', note: 'Elastic bands' },
  { id: 'none', label: 'Nothing', note: 'Just me and the floor' },
];
const EXPERIENCE: { id: Experience; label: string }[] = [
  { id: 'new', label: 'Never really trained' },
  { id: 'on-off', label: 'On and off' },
  { id: 'returning', label: 'Coming back after a break' },
  { id: 'steady', label: 'Steady for years' },
];
const AREAS: { id: Area; label: string }[] = [
  { id: 'knee', label: 'Knee' },
  { id: 'back', label: 'Back' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'wrist', label: 'Wrist' },
  { id: 'other', label: 'Something else' },
];
const MINUTES: Minutes[] = [20, 30, 40, 60];

const STEPS = ['modes', 'goal', 'time', 'gear', 'experience', 'level', 'avoid', 'note'] as const;

export function CoachSetup({ state, update, onClose }: Props) {
  const [a, setA] = useState<SetupAnswers>(() => answersOf(state.coach?.profile));
  const [step, setStep] = useState(0);
  const set = (patch: Partial<SetupAnswers>) => setA((x) => ({ ...x, ...patch }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const id = STEPS[step];
  const ready = id === 'modes' ? a.modes.length > 0 : id === 'gear' ? a.gear.length > 0 : true;
  const strengthy = a.modes.some((m) => m !== 'running');

  const done = () => {
    update((s) => ({ ...s, coach: applySetup(s.coach, a, new Date(), () => Math.random().toString(36).slice(2, 10)) }));
    onClose();
  };
  const next = () => (step === STEPS.length - 1 ? done() : setStep(step + 1));

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink-950">
      <header className="safe-top land-safe-x flex items-center justify-between px-4 pb-2">
        <button onClick={step ? () => setStep(step - 1) : onClose} aria-label={step ? 'Back' : 'Close'} className="grid h-10 w-10 place-items-center rounded-lg bg-ink-800">
          {step ? <ChevronLeft size={18} /> : <X size={18} />}
        </button>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <span key={s} className={`h-2 w-5 rounded-sm ${i < step ? 'bg-gold-400' : i === step ? 'bg-gold-300' : 'bg-ink-700'}`} />
          ))}
        </div>
        <span className="w-10" />
      </header>

      <main className="land-safe-x mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 pb-4 [@media(orientation:landscape)_and_(max-height:600px)]:max-w-2xl">
        {id === 'modes' && (
          <Step title="What do you want to train?" hint="Pick one, or more for a mix: the coach takes turns.">
            {MODES.map((m) => (
              <Pick key={m.id} on={a.modes.includes(m.id)} label={m.label} note={m.note} onClick={() => set({ modes: toggle(a.modes, m.id) })} />
            ))}
          </Step>
        )}
        {id === 'goal' && (
          <Step title="What is it for?" hint="The main thing. You can change it later.">
            {GOALS.map((g) => (
              <Pick key={g.id} on={a.goal === g.id} label={g.label} note={g.note} onClick={() => set({ goal: g.id })} />
            ))}
          </Step>
        )}
        {id === 'time' && (
          <Step title="How much time?" hint="Be honest: a plan you keep beats a perfect one.">
            <p className="text-sm text-slate-300">Workouts a week</p>
            <Row>
              {[2, 3, 4, 5, 6].map((d) => (
                <Chip key={d} on={a.days === d} label={String(d)} onClick={() => set({ days: d })} />
              ))}
            </Row>
            <p className="mt-4 text-sm text-slate-300">Minutes each</p>
            <Row>
              {MINUTES.map((m) => (
                <Chip key={m} on={a.minutes === m} label={`${m}`} onClick={() => set({ minutes: m })} />
              ))}
            </Row>
          </Step>
        )}
        {id === 'gear' && (
          <Step title="What do you have?" hint="Everything you can use. The coach only picks what you have.">
            {GEAR.map((g) => (
              <Pick key={g.id} on={a.gear.includes(g.id)} label={g.label} note={g.note} onClick={() => set({ gear: toggle(a.gear, g.id) })} />
            ))}
          </Step>
        )}
        {id === 'experience' && (
          <Step title="How long have you trained?" hint="">
            {EXPERIENCE.map((e) => (
              <Pick key={e.id} on={a.experience === e.id} label={e.label} onClick={() => set({ experience: e.id })} />
            ))}
          </Step>
        )}
        {id === 'level' && (
          <Step title="Where do you start?" hint="Today, not your best ever. Not sure? Pick “I don't know”: the coach starts easy and learns from your workouts.">
            {strengthy && <Bands label="Push-ups in a row" bands={PUSHUP_BANDS} value={a.pushups} onChange={(v) => set({ pushups: v })} />}
            {strengthy && <Bands label="Pull-ups in a row" bands={PULLUP_BANDS} value={a.pullups} onChange={(v) => set({ pullups: v })} />}
            {a.modes.includes('gym') && <Bands label="Squat, bench, deadlift?" bands={LIFT_BANDS} value={a.lifts} onChange={(v) => set({ lifts: v })} />}
            {a.modes.includes('running') && <Bands label="How long can you run without stopping?" bands={RUN_BANDS} value={a.run} onChange={(v) => set({ run: v })} />}
          </Step>
        )}
        {id === 'avoid' && (
          <Step title="Anything to spare?" hint="Something that hurts or is healing. The coach keeps work off it.">
            <Row>
              {AREAS.map((x) => (
                <Chip key={x.id} on={a.avoid.includes(x.id)} label={x.label} onClick={() => set({ avoid: toggle(a.avoid, x.id) })} />
              ))}
            </Row>
            {a.avoid.length > 0 && (
              <input
                value={a.avoidText ?? ''}
                onChange={(e) => set({ avoidText: e.target.value })}
                placeholder="A few words (optional): “left knee, since the summer”"
                className="mt-3 w-full rounded-xl bg-ink-800 px-3 py-3 text-sm text-slate-100 ring-1 ring-ink-700 placeholder:text-slate-500 focus:outline-none focus:ring-gold-400"
              />
            )}
          </Step>
        )}
        {id === 'note' && (
          <Step title="Anything else for your coach?" hint="In your own words, if you like. It keeps it in mind.">
            <textarea
              value={a.note ?? ''}
              onChange={(e) => set({ note: e.target.value })}
              rows={4}
              placeholder="“I hate burpees.” “The gym is busy after 6.” “I want my first pull-up by summer.”"
              className="w-full rounded-xl bg-ink-800 px-3 py-3 text-sm text-slate-100 ring-1 ring-ink-700 placeholder:text-slate-500 focus:outline-none focus:ring-gold-400"
            />
          </Step>
        )}
      </main>

      <footer className="safe-bottom land-safe-x mx-auto w-full max-w-md px-4 pt-2">
        <button
          onClick={next}
          disabled={!ready}
          className="w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:opacity-30 [@media(orientation:landscape)_and_(max-height:600px)]:py-3"
        >
          {step === STEPS.length - 1 ? 'Build my first workout' : 'Next'}
        </button>
      </footer>
    </div>
  );
}

function Step({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="mt-4">
      <h2 className="font-pixel text-sm leading-relaxed text-gold-300">{title}</h2>
      {hint && <p className="mt-2 text-sm text-slate-400">{hint}</p>}
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

function Pick({ on, label, note, onClick }: { on: boolean; label: string; note?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={`w-full rounded-xl p-3 text-left active:scale-[.98] ${on ? 'bg-ink-700 ring-2 ring-gold-400' : 'bg-ink-800 ring-1 ring-ink-700'}`}>
      <span className="block text-sm font-semibold text-slate-100">{label}</span>
      {note && <span className="block text-xs text-slate-400">{note}</span>}
    </button>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={`min-w-[3rem] rounded-lg px-3 py-2.5 text-sm font-semibold active:scale-95 ${on ? 'bg-gold-400 text-ink-950' : 'bg-ink-800 text-slate-200 ring-1 ring-ink-700'}`}>
      {label}
    </button>
  );
}

function Bands({ label, bands, value, onChange }: { label: string; bands: readonly string[]; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="mb-4">
      <p className="text-sm text-slate-300">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {bands.map((b, i) => (
          <Chip key={b} on={value === i} label={b} onClick={() => onChange(i)} />
        ))}
        <Chip on={value === null} label="I don't know" onClick={() => onChange(null)} />
      </div>
    </div>
  );
}
