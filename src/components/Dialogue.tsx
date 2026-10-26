'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Hero } from './Hero';
import { Ember, Hollow, Mira, Wanderer } from './Characters';
import { SoundToggle, useMusic } from './Sound';
import { SPEAKER_NAMES, type Line, type Speaker } from '@/lib/story';
import type { ClassId, Gear, GearSlot } from '@/lib/gear';
import type { TrackId } from '@/lib/music';

interface Props {
  lines: Line[];
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  onDone: () => void;
  /** Narration as a film: no text box, bigger words, slower. */
  cinematic?: boolean;
  /** What to show above narration, by line index. */
  backdrop?: (index: number) => ReactNode;
  music?: TrackId | null;
}

function Portrait({ who, gear, classId }: { who: Speaker; gear: Record<GearSlot, Gear>; classId?: ClassId }) {
  switch (who) {
    case 'wanderer':
      return <Wanderer size={140} />;
    case 'ember':
      return <Ember size={110} />;
    case 'hollow':
      return <Hollow size={170} />;
    case 'mira':
      return <Mira size={140} />;
    case 'echo':
      return <Hero gear={gear} classId={classId} size={170} variant="echo" />;
    case 'bestself':
      return <Hero gear={gear} classId={classId} size={170} variant="best" />;
    case 'you':
      return <Hero gear={gear} classId={classId} size={170} />;
    default:
      return null;
  }
}

/** RPG-style dialogue: portrait above, a text box below, tap to reveal and advance. */
export function Dialogue({ lines, gear, classId, onDone, cinematic = false, backdrop, music = 'rise' }: Props) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const line = lines[index];
  const full = line ? line.text.length : 0;
  const done = shown >= full;
  const narrator = line?.who === 'narrator';
  const film = cinematic && narrator;
  const speed = film ? 42 : 28;
  useMusic(music);

  useEffect(() => {
    setShown(0);
  }, [index]);

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setShown((n) => Math.min(full, n + 1)), speed);
    return () => clearTimeout(t);
  }, [shown, full, done, speed]);

  if (!line) return null;

  const advance = () => {
    if (!done) setShown(full);
    else if (index + 1 >= lines.length) onDone();
    else setIndex((i) => i + 1);
  };

  const hollow = line.who === 'hollow';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950" onClick={advance} role="dialog" aria-live="polite">
      <div className="safe-top relative z-10 flex justify-between px-4">
        <SoundToggle />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDone();
          }}
          className="rounded-md px-3 py-2 text-xs text-slate-500"
        >
          Skip
        </button>
      </div>

      <div className={`flex justify-center pb-6 ${narrator ? 'flex-[0.8] items-end' : 'flex-1 items-end'}`}>
        {narrator
          ? backdrop?.(index)
          : (
            <div key={`${index}-${line.who}`} className="animate-pop">
              <Portrait who={line.who} gear={gear} classId={classId} />
            </div>
          )}
      </div>

      <div className={`safe-bottom mx-auto w-full max-w-md px-4 pb-6 ${narrator ? 'flex-1' : ''}`}>
        {film ? (
          <div key={index} className="min-h-[132px] animate-fadein px-2 text-center">
            <p className="text-xl leading-relaxed text-slate-200">
              {line.text.slice(0, shown)}
              {!done && <span className="opacity-0">{line.text.slice(shown)}</span>}
            </p>
            <p className="mt-4 text-xs text-slate-600">{done ? <span className="animate-blink">tap</span> : <span>&nbsp;</span>}</p>
          </div>
        ) : (
          <div className={`min-h-[132px] rounded-xl p-4 pixel-border ${hollow ? 'bg-[#140f1f]' : 'bg-ink-800'} ${narrator ? 'text-center' : ''}`}>
            {!narrator && <p className={`mb-2 font-pixel text-[10px] ${hollow ? 'text-red-400' : 'text-gold-300'}`}>{SPEAKER_NAMES[line.who]}</p>}
            <p className={`text-lg leading-snug ${narrator ? 'italic text-slate-300' : hollow ? 'text-red-100' : 'text-slate-100'}`}>
              {line.text.slice(0, shown)}
              {!done && <span className="opacity-0">{line.text.slice(shown)}</span>}
            </p>
            <p className="mt-2 text-right text-xs text-slate-500">{done ? <span className="animate-blink">▼ tap</span> : <span>&nbsp;</span>}</p>
          </div>
        )}
      </div>
    </div>
  );
}
