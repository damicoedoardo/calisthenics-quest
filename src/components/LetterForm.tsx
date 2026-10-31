'use client';

import { useState } from 'react';
import { Wanderer } from './Characters';
import { SoundToggle } from './Sound';
import type { Letter } from '@/lib/game';
import { LETTER_PROMPTS } from '@/story/opening';

/* The letter to your future self. Asked by the Wanderer after the first workout (the scene
   'first-letter' in chapter 1), not in the opening: by then there is someone to write to. */

const goldButton =
  'w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:opacity-40';

/** Held sideways: who speaks and the button on the left, the letter on the right. */
const SIDE = 'land-safe-x [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:max-w-4xl [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-[16rem_minmax(0,1fr)] [@media(orientation:landscape)_and_(max-height:600px)]:grid-rows-[auto_1fr] [@media(orientation:landscape)_and_(max-height:600px)]:gap-x-8 [@media(orientation:landscape)_and_(max-height:600px)]:pb-4';
const SIDE_BUTTON = '[@media(orientation:landscape)_and_(max-height:600px)]:sticky [@media(orientation:landscape)_and_(max-height:600px)]:bottom-4 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-2 [@media(orientation:landscape)_and_(max-height:600px)]:self-end';

export function LetterForm({ start, onDone }: { start: Letter; onDone: (l: Letter) => void }) {
  const [letter, setLetter] = useState<Letter>(start);
  return (
    // Held sideways: the Wanderer and the button on the left, the letter on the right.
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink-950">
    <div className={`safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 ${SIDE}`}>
      <div className="mt-4 flex items-center gap-3 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-1">
        <Wanderer size={56} />
        <p className="flex-1 text-sm italic text-slate-300">&ldquo;Write to the person you want to become.&rdquo;</p>
        <SoundToggle />
      </div>
      <div className="mt-5 flex-1 space-y-4 rounded-2xl bg-[#f5ecd7] p-5 text-[#3b2a1a] shadow-xl [@media(orientation:landscape)_and_(max-height:600px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:600px)]:row-span-2 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:mt-4 [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:600px)]:gap-x-4 [@media(orientation:landscape)_and_(max-height:600px)]:gap-y-3 [@media(orientation:landscape)_and_(max-height:600px)]:space-y-0 [@media(orientation:landscape)_and_(max-height:600px)]:p-4">
        <p className="font-pixel text-[11px] [@media(orientation:landscape)_and_(max-height:600px)]:col-span-2">A letter to my future self</p>
        {LETTER_PROMPTS.map((p) => (
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
        <p className="text-xs text-[#7a6a4f] [@media(orientation:landscape)_and_(max-height:600px)]:col-span-2">Every line is optional. Only you will ever read it.</p>
      </div>
      <button onClick={() => onDone(letter)} className={`mt-5 ${goldButton} ${SIDE_BUTTON}`}>
        Seal the letter
      </button>
    </div>
    </div>
  );
}

