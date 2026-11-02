'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LookProvider } from '@/components/Look';
import { MangaPage } from '@/components/MangaPage';
import { STARTER_LOOKS } from '@/sprites/characters/hero';
import { MANGA_PAGES } from '@/story/manga';
import { VOICES } from '@/story/opening';

/* Manga Lab: the story told as a manga, one page at a time. A try-out: the live opening is still
   the scene player. The pages are data in src/story/manga.ts. Open /lab/manga. */

export default function MangaLab() {
  const [sex, setSex] = useState<'m' | 'f'>('m');
  const [voice, setVoice] = useState(VOICES[3]);
  const [n, setN] = useState(0);
  const page = MANGA_PAGES[n];
  return (
    <LookProvider look={STARTER_LOOKS[sex]}>
      <main className="min-h-screen bg-ink-950 pb-16 text-slate-200">
        <header className="mx-auto flex max-w-[480px] items-center gap-3 px-4 py-3">
          <Link href="/lab" aria-label="Back to the lab" className="rounded-lg bg-ink-800 p-2">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-pixel text-[10px] text-gold-300">Manga</h1>
          <div className="ml-auto flex gap-1">
            {(['m', 'f'] as const).map((s) => (
              <button key={s} onClick={() => setSex(s)} className={`rounded-lg px-2.5 py-1.5 text-xs ${s === sex ? 'bg-gold-400 font-semibold text-ink-950' : 'bg-ink-800 text-slate-300'}`}>
                {s === 'm' ? 'Boy' : 'Girl'}
              </button>
            ))}
          </div>
        </header>
        <div className="mx-auto max-w-[480px] px-2">
          <MangaPage page={page} words={{ voice }} />
        </div>
        <div className="mx-auto mt-4 max-w-[480px] space-y-3 px-4">
          <div>
            <p className="mb-1.5 font-pixel text-[9px] text-slate-500">The voice you picked</p>
            <div className="flex flex-wrap gap-1.5">
              {VOICES.map((v) => (
                <button key={v} onClick={() => setVoice(v)} className={`rounded-lg px-2.5 py-1.5 text-xs ${v === voice ? 'bg-gold-400 font-semibold text-ink-950' : 'bg-ink-800 text-slate-300'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          {MANGA_PAGES.length > 1 && (
            <div className="flex gap-1.5">
              {MANGA_PAGES.map((p, i) => (
                <button key={p.id} onClick={() => setN(i)} className={`rounded-lg px-2.5 py-1.5 text-xs ${i === n ? 'bg-gold-400 font-semibold text-ink-950' : 'bg-ink-800 text-slate-300'}`}>
                  {p.part} {p.page}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </LookProvider>
  );
}
