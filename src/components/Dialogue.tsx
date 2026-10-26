'use client';

import { useEffect, useState } from 'react';
import { Hero } from './Hero';
import { Doubt, Ember, Mira, Wanderer } from './Characters';
import { SPEAKER_NAMES, type Line, type Speaker } from '@/lib/story';
import type { ClassId, Gear, GearSlot } from '@/lib/gear';

interface Props {
  lines: Line[];
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  onDone: () => void;
}

const SPEED_MS = 28;

function Portrait({ who, gear, classId }: { who: Speaker; gear: Record<GearSlot, Gear>; classId?: ClassId }) {
  switch (who) {
    case 'wanderer':
      return <Wanderer size={140} />;
    case 'ember':
      return <Ember size={110} />;
    case 'doubt':
      return <Doubt size={150} />;
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
export function Dialogue({ lines, gear, classId, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const line = lines[index];
  const full = line ? line.text.length : 0;
  const done = shown >= full;

  useEffect(() => {
    setShown(0);
  }, [index]);

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setShown((n) => Math.min(full, n + 1)), SPEED_MS);
    return () => clearTimeout(t);
  }, [shown, full, done]);

  if (!line) return null;

  const advance = () => {
    if (!done) setShown(full);
    else if (index + 1 >= lines.length) onDone();
    else setIndex((i) => i + 1);
  };

  const narrator = line.who === 'narrator';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950" onClick={advance} role="dialog" aria-live="polite">
      <div className="safe-top flex justify-end px-4">
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

      <div className={`flex justify-center pb-6 ${narrator ? 'flex-[0.6]' : 'flex-1 items-end'}`}>
        {!narrator && (
          <div key={`${index}-${line.who}`} className="animate-pop">
            <Portrait who={line.who} gear={gear} classId={classId} />
          </div>
        )}
      </div>

      <div className={`safe-bottom mx-auto w-full max-w-md px-4 pb-6 ${narrator ? 'flex-1' : ''}`}>
        <div className={`min-h-[132px] rounded-xl bg-ink-800 p-4 pixel-border ${narrator ? 'text-center' : ''}`}>
          {!narrator && <p className="mb-2 font-pixel text-[10px] text-gold-300">{SPEAKER_NAMES[line.who]}</p>}
          <p className={`text-lg leading-snug ${narrator ? 'italic text-slate-300' : 'text-slate-100'}`}>
            {line.text.slice(0, shown)}
            {!done && <span className="opacity-0">{line.text.slice(shown)}</span>}
          </p>
          <p className="mt-2 text-right text-xs text-slate-500">
            {done ? <span className="animate-blink">▼ tap</span> : <span>&nbsp;</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
