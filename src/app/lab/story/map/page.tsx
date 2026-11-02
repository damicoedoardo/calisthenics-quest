'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play } from 'lucide-react';
import { CHAPTERS } from '@/story/chapters';
import { storyGraph, WALKS, type Node, type Problem } from '@/story/graph';

/* Story map: every scene as a step in its chapter, what makes it play, what it asks and reads, and
   which of three kinds of player really get it (src/story/graph.ts walks the real engine). The same
   graph is written to src/story/graph.md. Not linked from the app; open /lab/story/map. */

const KINDS: Record<Problem['kind'], { name: string; tone: string }> = {
  'lost-early': { name: 'Skipped when the boss falls early', tone: 'text-red-300' },
  'chapter-only': { name: 'Only if a kind of day comes in time', tone: 'text-amber-300' },
  'asked-late': { name: 'Question after the chapter ended', tone: 'text-sky-300' },
  'out-of-chapter': { name: 'Flame growth in another chapter', tone: 'text-violet-300' },
  'missing-answer': { name: 'Before the question it reads', tone: 'text-red-300' },
  never: { name: 'No walk reaches it', tone: 'text-red-300' },
};

function Chip({ children, tone = 'bg-ink-800 text-slate-300' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`rounded px-1.5 py-0.5 text-[10px] ${tone}`}>{children}</span>;
}

export default function StoryMap() {
  const g = useMemo(() => storyGraph(), []);
  const [open, setOpen] = useState<Problem['kind'] | null>('lost-early');
  const kindOf = (id: string) => g.problems.find((p) => p.scene === id && (p.kind === 'lost-early' || p.kind === 'chapter-only'))?.kind;
  const order = g.walks[0].played.map((p) => p.id);
  const pos = (id: string) => (order.includes(id) ? order.indexOf(id) : Infinity);

  const row = (n: Node) => {
    const k = kindOf(n.id);
    const edge = k === 'lost-early' ? 'border-red-400' : k === 'chapter-only' ? 'border-amber-400' : n.ends ? 'border-emerald-400' : n.asks ? 'border-sky-400' : 'border-ink-600';
    return (
      <Link key={n.id} href={`/lab/story?play=${n.id}`} className={`block rounded-xl border-l-4 bg-ink-950 px-3 py-2 active:scale-[.99] ${edge}`}>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-200">{n.id}</span>
          {g.walks.map((w) => {
            const got = w.played.some((p) => p.id === n.id);
            return (
              <span key={w.walk.id} title={w.walk.id} className={`w-4 text-center font-pixel text-[8px] ${got ? 'text-gold-300' : 'text-ink-600 line-through'}`}>
                {w.walk.id[0].toUpperCase()}
              </span>
            );
          })}
          <Play size={10} className="shrink-0 text-gold-400" />
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500">{n.when}</p>
        {(n.asks || n.ends || n.uses.length > 0) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {n.ends && <Chip tone="bg-emerald-900/60 text-emerald-200">ends the chapter</Chip>}
            {n.asks && <Chip tone="bg-sky-900/60 text-sky-200">asks {n.asks}</Chip>}
            {n.uses.map((u) => (
              <Chip key={`${u.key}${u.is ?? ''}`}>
                reads {u.key}
                {u.is !== undefined ? ` = ${u.is}` : ''}
                {u.from ? ` · ${u.from}` : ''}
              </Chip>
            ))}
          </div>
        )}
      </Link>
    );
  };

  return (
    <main className="safe-top mx-auto min-h-dvh max-w-md space-y-4 px-4 pb-16">
      <header className="flex items-center gap-3">
        <Link href="/lab/story" aria-label="Back to the Story Lab" className="rounded-lg bg-ink-800 p-2 text-slate-300">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-pixel text-sm text-gold-300">Story map</h1>
          <p className="text-xs text-slate-500">Every scene, when it plays, and who really gets it.</p>
        </div>
      </header>

      <section className="space-y-2 rounded-2xl bg-ink-900 p-4 pixel-border">
        <h2 className="font-pixel text-[10px] text-gold-300">THREE PLAYERS</h2>
        {g.walks.map((w) => (
          <div key={w.walk.id} className="flex gap-3 text-xs">
            <span className="w-4 font-pixel text-[9px] text-gold-300">{w.walk.id[0].toUpperCase()}</span>
            <span className="flex-1 text-slate-400">
              <span className="text-slate-200">{w.walk.id}</span>: {w.walk.about}. Bosses fall at {w.bossesAt.join(', ')}. Sees {w.played.length} scenes.
            </span>
          </div>
        ))}
        <p className="pt-1 text-[11px] text-slate-500">Each one trains Mon, Wed, Fri through the real story engine. A crossed-out letter on a scene: that player never sees it.</p>
      </section>

      <section className="rounded-2xl bg-ink-900 p-4 pixel-border">
        <h2 className="mb-2 font-pixel text-[10px] text-gold-300">PROBLEM PATHS</h2>
        <div className="space-y-1.5">
          {(Object.keys(KINDS) as Problem['kind'][]).map((k) => {
            const list = g.problems.filter((p) => p.kind === k);
            if (!list.length) return null;
            return (
              <div key={k}>
                <button onClick={() => setOpen(open === k ? null : k)} className="flex w-full items-center justify-between rounded-lg bg-ink-950 px-3 py-2 text-left text-xs">
                  <span className={KINDS[k].tone}>{KINDS[k].name}</span>
                  <span className="font-mono text-slate-400">{list.length}</span>
                </button>
                {open === k && (
                  <ul className="mt-1 space-y-1 px-1">
                    {list.map((p, i) => (
                      <li key={i} className="text-[11px] leading-snug text-slate-400">
                        <span className="font-mono text-slate-200">{p.scene}</span> {p.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {CHAPTERS.map((c) => (
        <section key={c.n} className="rounded-2xl bg-ink-900 p-4 pixel-border">
          <h2 className="font-pixel text-[10px] text-gold-300">
            {c.n} · {c.name.toUpperCase()}
          </h2>
          <p className="mb-2 mt-1 text-[11px] text-slate-500">
            Ends when {c.enemy} falls. Planned {c.workouts} workouts; counts start with the chapter.
          </p>
          <div className="space-y-1.5">
            {g.nodes
              .filter((n) => n.group === c.n)
              .sort((a, b) => pos(a.id) - pos(b.id))
              .map(row)}
          </div>
        </section>
      ))}

      <section className="rounded-2xl bg-ink-900 p-4 pixel-border">
        <h2 className="mb-2 font-pixel text-[10px] text-gold-300">ANY TIME</h2>
        <div className="space-y-1.5">{g.nodes.filter((n) => n.group === 0).map(row)}</div>
      </section>
      <section className="rounded-2xl bg-ink-900 p-4 pixel-border">
        <h2 className="mb-2 font-pixel text-[10px] text-gold-300">THE EMBER ROAD</h2>
        <p className="mb-2 text-[11px] text-slate-500">With friends; no walk plays it.</p>
        <div className="space-y-1.5">{g.nodes.filter((n) => n.group === 'road').map(row)}</div>
      </section>
      <p className="text-center text-[10px] text-slate-500">{WALKS.length} walks · {g.nodes.length} scenes · also in src/story/graph.md</p>
    </main>
  );
}
