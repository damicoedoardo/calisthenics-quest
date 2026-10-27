'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Square, Zap } from 'lucide-react';
import { SoundToggle, useMuted } from '@/components/Sound';
import { music, type StingId, type TrackId } from '@/lib/music';
import { ZONE_MUSIC } from '@/lib/music-zones';
import { ZONES } from '@/lib/fog';

/* Music Lab: play every theme and sting. The music is written as note patterns in
   src/lib/music.ts (story) and src/lib/music-zones.ts (the Fog, zone by zone). */

const STORY: [TrackId, string][] = [
  ['memory', 'The opening: what you lost'],
  ['hollow', 'The Hollow'],
  ['heartbeat', 'On the ground'],
  ['rise', 'Getting up'],
  ['camp', 'Night camp, rest days'],
];
const STINGS: [StingId, string][] = [
  ['victory', 'Victory'],
  ['defeat', 'Defeat'],
  ['levelup', 'Level up'],
  ['shatter', 'The Plateau shatters'],
  ['warmth', "The Hollow's hand"],
];

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-ink-900 p-4 pixel-border">
      <h2 className="mb-3 font-pixel text-[10px] text-gold-300">{title}</h2>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

export default function MusicLab() {
  const [on, setOn] = useState<TrackId | null>(null);
  const muted = useMuted();

  // Stop whatever is playing when leaving the lab.
  useEffect(() => () => (on ? music.release(on) : undefined), [on]);

  const toggle = (id: TrackId) => {
    music.unlock();
    if (on === id) {
      music.release(id);
      setOn(null);
    } else {
      music.play(id);
      setOn(id);
    }
  };

  const Row = ({ id, label, note }: { id: TrackId; label: string; note?: string }) => (
    <button onClick={() => toggle(id)} className="flex w-full items-center gap-3 rounded-xl bg-ink-950 px-3 py-2.5 text-left active:scale-[.99]">
      {on === id ? <Square size={12} className="shrink-0 text-gold-300" /> : <Play size={12} className="shrink-0 text-gold-400" />}
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-slate-200">{label}</span>
        <span className="block font-mono text-[11px] text-slate-500">
          {id}
          {note ? ` · ${note}` : ''}
        </span>
      </span>
    </button>
  );

  return (
    <main className="safe-top mx-auto min-h-dvh max-w-md space-y-4 px-4 pb-16">
      <header className="flex items-center gap-3">
        <Link href="/lab" aria-label="Back to the Sprite Lab" className="rounded-lg bg-ink-800 p-2 text-slate-300">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-pixel text-sm text-gold-300">Music Lab</h1>
          <p className="text-xs text-slate-500">Every theme. Tap to play, tap again to stop.</p>
        </div>
        <SoundToggle className="ml-auto" />
      </header>
      {muted && <p className="rounded-lg bg-ink-900 px-3 py-2 text-xs text-slate-400">Sound is off. Turn it on with the speaker button to listen.</p>}

      <Panel title="THE FOG, ZONE BY ZONE">
        {ZONE_MUSIC.map((z, i) => (
          <div key={z.run} className="space-y-1.5">
            <p className="pt-1 font-pixel text-[9px] text-slate-500">{(ZONES[i]?.name ?? `Zone ${i + 1}`).toUpperCase()}</p>
            <Row id={z.run} label="The run" />
            <Row id={z.boss} label={`The boss: ${ZONES[i]?.bossName ?? ''}`} />
          </div>
        ))}
        <p className="pt-1 font-pixel text-[9px] text-slate-500">HALFWAY DOWN</p>
        <Row id="warden" label="The Warden of the Ashes" />
      </Panel>

      <Panel title="STORY">
        {STORY.map(([id, label]) => (
          <Row key={id} id={id} label={label} />
        ))}
      </Panel>

      <Panel title="STINGS">
        {STINGS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              music.unlock();
              music.sting(id);
            }}
            className="flex w-full items-center gap-3 rounded-xl bg-ink-950 px-3 py-2.5 text-left active:scale-[.99]"
          >
            <Zap size={12} className="shrink-0 text-gold-400" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-slate-200">{label}</span>
              <span className="block font-mono text-[11px] text-slate-500">{id}</span>
            </span>
          </button>
        ))}
      </Panel>
    </main>
  );
}
