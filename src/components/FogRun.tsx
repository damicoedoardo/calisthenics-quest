'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleDot, Copy, Flame, Heart, Magnet, Pause, Shield, Sparkles, Sword, Wind, Zap, type LucideIcon } from 'lucide-react';
import { gearOf, type GameState } from '@/lib/game';
import { getUpgrade, nextGrowth, powerOf, RUN_SECONDS, type RunResult, type UpgradeId, type Zone } from '@/lib/fog';
import { sheetFor } from '@/sprites/registry';
import type { Hud, RunEnd, RunHandle, SheetKey } from '@/game/run';
import type { Sheet } from '@/sprites/registry';

interface Props {
  state: GameState;
  zone: Zone;
  onEnd: (r: RunResult) => void;
  onLeave: () => void;
}

const ICONS: Record<UpgradeId, LucideIcon> = {
  power: Sword,
  haste: Zap,
  multi: Copy,
  flame: Flame,
  spark: Sparkles,
  nova: CircleDot,
  swift: Wind,
  vital: Heart,
  magnet: Magnet,
  guard: Shield,
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** A run in the Fog: the Phaser canvas, with the HUD, skill picks and results drawn over it. */
export function FogRun({ state, zone, onEnd, onLeave }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const run = useRef<RunHandle | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [offer, setOffer] = useState<{ choices: UpgradeId[]; levels: Partial<Record<UpgradeId, number>>; fresh: boolean } | null>(null);
  const [paused, setPaused] = useState(false);
  const [boss, setBoss] = useState(false);
  const [end, setEnd] = useState<RunEnd | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState(false);

  useEffect(() => setPreview(window.location.hostname !== 'forma-nu-red.vercel.app'), []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    const gear = gearOf(state),
      classId = state.profile.classId,
      look = state.profile.look;
    const sheets: Record<SheetKey, Sheet> = {
      hero: sheetFor('hero', 'idle', { gear, classId, look }),
      heroAttack: sheetFor('hero', 'attack', { gear, classId, look }),
      hollow: sheetFor('hero', 'idle', { gear, classId, look, variant: 'hollow' }),
      ember: sheetFor('ember', 'idle'),
      slime: sheetFor('slime', 'idle'),
      wisp: sheetFor('wisp', 'idle'),
      mirror: sheetFor('mirror', 'idle'),
      golem: sheetFor('golem', 'idle'),
    };
    setHud(null);
    setEnd(null);
    setBoss(false);
    import('@/game/run').then(({ startRun }) => {
      if (cancelled) return;
      run.current = startRun(el, { zone, power: powerOf(state, new Date()), classId, sheets }, {
        hud: setHud,
        levelUp: (choices, levels, fresh) => setOffer({ choices, levels, fresh }),
        boss: () => {
          setBoss(true);
          setTimeout(() => setBoss(false), 3500);
        },
        end: (r) => {
          setEnd(r);
          onEnd({ ...r, zone: zone.id });
        },
      });
    });
    return () => {
      cancelled = true;
      run.current?.destroy();
      run.current = null;
    };
    // A new attempt restarts the run; the state it starts from is read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, zone.id]);

  const pick = (id: UpgradeId) => {
    setOffer(null);
    run.current?.pick(id);
  };

  const left = hud ? Math.max(0, RUN_SECONDS - hud.seconds) : RUN_SECONDS;

  return (
    <div className="fixed inset-0 z-50 touch-none select-none bg-ink-950">
      <div ref={host} className="absolute inset-0" />

      {hud && !end && (
        <div className="safe-top pointer-events-none absolute inset-x-0 top-0 px-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="relative h-3.5 overflow-hidden rounded-sm bg-ink-800/90 ring-1 ring-black/40">
                <div className="h-full bg-red-500 transition-[width] duration-150" style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} />
                <span className="absolute inset-0 grid place-items-center font-mono text-[9px] font-bold text-white">
                  {hud.hp}/{hud.maxHp}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="font-pixel text-[8px] text-sky-300">Lv{hud.level}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-sm bg-ink-800/90">
                  <div className="h-full bg-sky-400 transition-[width] duration-150" style={{ width: `${(hud.xp / hud.xpNext) * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="w-16 text-right">
              <p className={`font-pixel text-[11px] ${hud.boss ? 'text-red-400' : 'text-slate-100'}`}>{hud.boss ? 'BOSS' : clock(left)}</p>
              <p className="mt-1 font-mono text-[10px] text-slate-400">{hud.kills} down</p>
            </div>
            <button
              aria-label="Pause"
              onClick={() => {
                run.current?.pause();
                setPaused(true);
              }}
              className="pointer-events-auto grid h-9 w-9 place-items-center rounded-lg bg-ink-800/90 text-slate-200"
            >
              <Pause size={16} />
            </button>
          </div>
          {hud.boss && (
            <div className="mx-auto mt-2 max-w-xs">
              <p className="text-center font-pixel text-[9px] text-violet-300">The Hollow</p>
              <div className="mt-1 h-2.5 overflow-hidden rounded-sm bg-ink-800/90 ring-1 ring-violet-500/40">
                <div className="h-full bg-violet-500 transition-[width] duration-150" style={{ width: `${(hud.boss.hp / hud.boss.max) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {!hud && !end && <p className="absolute inset-x-0 top-1/2 text-center font-pixel text-[10px] text-slate-400">Into the Fog...</p>}

      {hud && !end && hud.seconds < 5 && (
        <p className="pointer-events-none absolute inset-x-0 bottom-24 text-center text-sm text-slate-300 animate-pulse">Drag anywhere to move. You attack on your own.</p>
      )}

      {boss && !offer && (
        <div className="pointer-events-none absolute inset-x-6 top-28 rounded-2xl bg-ink-950/85 p-4 text-center ring-1 ring-violet-500/50">
          <p className="font-pixel text-xs text-violet-300">The Hollow walks out of the Fog</p>
          {state.profile.voice && <p className="mt-2 text-sm italic text-slate-200">&ldquo;{state.profile.voice}&rdquo;</p>}
        </div>
      )}

      {offer && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950/80 px-4">
          <p className="font-pixel text-sm text-gold-300">{offer.fresh ? 'Warmed up!' : 'Level up!'}</p>
          <p className="mt-2 text-center text-xs text-slate-400">{offer.fresh ? 'You trained in the last two days: take a free skill.' : 'Pick a skill.'}</p>
          <div className="mt-4 w-full max-w-sm space-y-2">
            {offer.choices.map((id) => {
              const u = getUpgrade(id),
                Icon = ICONS[id],
                next = (offer.levels[id] ?? 0) + 1;
              return (
                <button key={id} onClick={() => pick(id)} className="flex w-full items-center gap-3 rounded-xl bg-ink-800 p-3 text-left ring-1 ring-gold-400/30 active:scale-[.98]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-900 text-gold-300">
                    <Icon size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-100">{u.name}</span>
                      <span className="font-pixel text-[8px] text-slate-400">{next === 1 ? 'NEW' : `Lv${next}`}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">{u.text(next)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {paused && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/85 px-8">
          <p className="font-pixel text-sm text-slate-200">Paused</p>
          <button
            onClick={() => {
              setPaused(false);
              run.current?.resume();
            }}
            className="w-full max-w-xs rounded-xl bg-gold-400 py-3 font-pixel text-[10px] text-ink-950"
          >
            Keep going
          </button>
          <button onClick={onLeave} className="w-full max-w-xs rounded-xl bg-ink-800 py-3 text-sm text-slate-300">
            Leave the run
          </button>
          {preview && (
            <button
              onClick={() => {
                run.current?.skipToBoss();
                setPaused(false);
                run.current?.resume();
              }}
              className="w-full max-w-xs rounded-xl border border-dashed border-slate-600 py-2.5 text-xs text-slate-400"
            >
              Skip to the boss (preview only)
            </button>
          )}
        </div>
      )}

      {end && <Results state={state} zone={zone} end={end} onAgain={() => setAttempt((a) => a + 1)} onLeave={onLeave} />}
    </div>
  );
}

function Results({ state, zone, end, onAgain, onLeave }: { state: GameState; zone: Zone; end: RunEnd; onAgain: () => void; onLeave: () => void }) {
  const hints = (['push', 'pull', 'core'] as const).map((p) => nextGrowth(state, p)).filter((h): h is string => !!h);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950/90 px-6 text-center">
      <p className={`font-pixel text-sm ${end.won ? 'text-gold-300' : 'text-slate-300'}`}>{end.won ? `${zone.name} cleared!` : 'The Fog took you'}</p>
      <p className="mt-3 text-sm text-slate-300">
        {end.won ? 'The Hollow fades. The road ahead opens when you keep training.' : 'Losing here costs nothing. Come back stronger.'}
      </p>
      <div className="mt-5 grid w-full max-w-xs grid-cols-3 gap-2">
        {[
          ['Time', clock(end.seconds)],
          ['Level', String(end.level)],
          ['Down', String(end.kills)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-ink-800 py-2">
            <p className="font-mono text-lg font-bold text-slate-100">{v}</p>
            <p className="text-[10px] text-slate-500">{k}</p>
          </div>
        ))}
      </div>
      {hints.length > 0 && (
        <div className="mt-5 w-full max-w-xs rounded-xl bg-ink-800 p-3 text-left">
          <p className="font-pixel text-[9px] text-gold-300">Train to grow</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            {hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      )}
      <button onClick={onAgain} className="mt-6 w-full max-w-xs rounded-xl bg-gold-400 py-3 font-pixel text-[10px] text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none">
        Run again
      </button>
      <button onClick={onLeave} className="mt-2 w-full max-w-xs py-3 text-sm text-slate-400">
        Back
      </button>
    </div>
  );
}
