import { Check, Lock } from 'lucide-react';
import { PATHS } from '@/lib/skills';
import { repsFor, type GameState } from '@/lib/game';

export function SkillsTab({ state }: { state: GameState }) {
  return (
    <div className="space-y-6">
      {PATHS.map((path) => {
        const at = state.progress[path.id];
        return (
          <section key={path.id}>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-pixel text-xs text-gold-300">{path.name}</h2>
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
                        current ? 'bg-ink-700 ring-1 ring-sky-400/50' : beaten ? 'bg-ink-800' : 'bg-ink-900 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{node.name}</p>
                        <span className="flex items-center gap-1.5 text-xs text-slate-300">
                          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: node.reward.color }} />
                          {node.reward.name}
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
