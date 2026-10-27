'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, Check, ChevronRight, Lock } from 'lucide-react';
import { PATHS } from '@/lib/skills';
import { repsFor, type GameState } from '@/lib/game';
import { rewardFor } from '@/lib/gear';

// The library carries the whole exercise catalog, so it loads only when opened.
const ExerciseLibrary = dynamic(() => import('./ExerciseLibrary').then((m) => m.ExerciseLibrary), { ssr: false });

export function SkillsTab({ state }: { state: GameState }) {
  const [library, setLibrary] = useState(false);
  return (
    <div className="space-y-6">
      <button onClick={() => setLibrary(true)} className="flex w-full items-center gap-3 rounded-xl bg-ink-800 p-3 text-left ring-1 ring-ink-700 active:bg-ink-700">
        <BookOpen size={18} className="shrink-0 text-gold-300" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Exercise library</span>
          <span className="block text-xs text-slate-400">870+ exercises, how to do each, pixel demos</span>
        </span>
        <ChevronRight size={16} className="text-slate-500" />
      </button>
      {library && <ExerciseLibrary state={state} onClose={() => setLibrary(false)} />}
      {PATHS.map((path) => {
        const at = state.progress[path.id];
        return (
          <section key={path.id}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-pixel text-xs" style={{ color: path.color }}>{path.name}</h2>
              <p className="text-xs text-slate-400">
                {path.tagline} · {Math.min(at, path.nodes.length)}/{path.nodes.length}
              </p>
            </div>
            <ol className="relative space-y-2 pl-6">
              <span className="absolute bottom-4 left-[11px] top-4 w-0.5 bg-ink-600" aria-hidden />
              {path.nodes.map((node, i) => {
                const beaten = i < at;
                const current = i === at;
                const unit = node.unit === 'sec' ? 's' : '';
                const reward = rewardFor(state.profile.classId, state.progress, path.id, i);
                return (
                  <li key={node.id} className="relative">
                    <span
                      className={`absolute -left-6 top-4 grid h-6 w-6 place-items-center rounded-md text-[10px] font-bold ${
                        beaten ? 'bg-gold-400 text-ink-950' : current ? 'bg-sky-400 text-ink-950 ring-4 ring-sky-400/20' : 'bg-ink-700 text-slate-500'
                      }`}
                    >
                      {beaten ? <Check size={14} /> : current ? i + 1 : <Lock size={11} />}
                    </span>
                    <div
                      className={`rounded-xl p-3 ${
                        current ? 'bg-ink-700 ring-1 ring-sky-400/50' : beaten ? 'bg-ink-800' : 'bg-ink-900 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{node.name}</p>
                        <span className="flex items-center gap-1.5 text-xs text-slate-300">
                          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: reward.color }} />
                          {reward.name}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {current
                          ? `Now: ${node.sets}×${repsFor(state, node)}${unit} → unlock at ${node.unlockSets}×${node.unlockReps}${unit}`
                          : `Unlock at ${node.unlockSets}×${node.unlockReps}${unit}`}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
