'use client';

/** One look for every switch between parts of a screen (Friends | Feed, Gear | Stats | Class,
    Upgrade | Reroll, the vault's slot filter). Edoardo 2026-10-31: the old ones didn't look like the
    game, and the first pixel one was too big, so there are a few looks to pick from in the Lab
    (/lab/night, "Tab switch looks"); `TAB_LOOK` is the one the app uses.
    - `block`: a slim dark tray, the open part a gold block on its shadow, like the big buttons.
    - `line`: no tray, pixel words, the open one gold with a pixel bar under it.
    - `cursor`: like a game menu, a ▶ before the open part.
    - `folder`: tabs on a line, the open one a raised card with a gold top edge. */
export type TabLook = 'block' | 'line' | 'cursor' | 'folder';
export const TAB_LOOK: TabLook = 'block';
export const TAB_LOOKS: { id: TabLook; name: string }[] = [
  { id: 'block', name: 'A. Gold block' },
  { id: 'line', name: 'B. Underline' },
  { id: 'cursor', name: 'C. Menu cursor' },
  { id: 'folder', name: 'D. Folder tabs' },
];

export type PixelTab<T extends string> = { id: T; label: string; dot?: boolean };

const TRAY: Record<TabLook, string> = {
  block: 'gap-0.5 rounded-lg bg-ink-950/80 p-0.5 ring-1 ring-ink-700',
  line: 'gap-1 border-b-2 border-ink-700',
  cursor: 'gap-1',
  folder: 'gap-1 border-b-2 border-gold-400/70 px-1',
};

function tabClass(look: TabLook, on: boolean): string {
  switch (look) {
    case 'block':
      return on ? 'rounded-md bg-gold-400 text-ink-950 shadow-[0_2px_0_#b45309]' : 'rounded-md text-slate-400';
    case 'line':
      return on ? '-mb-0.5 border-b-2 border-gold-400 text-gold-300' : '-mb-0.5 border-b-2 border-transparent text-slate-500';
    case 'cursor':
      return on ? 'text-gold-300' : 'text-slate-500';
    case 'folder':
      return on ? '-mb-0.5 rounded-t-md border-2 border-b-0 border-gold-400/70 bg-ink-800 text-gold-300' : 'rounded-t-md border-2 border-transparent text-slate-500';
  }
}

export function PixelTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  small = false,
  look = TAB_LOOK,
  className = '',
}: {
  tabs: readonly PixelTab<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  small?: boolean;
  look?: TabLook;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={`grid ${TRAY[look]} ${className}`} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={`relative font-pixel transition-colors ${small ? 'py-1 text-[7px]' : 'py-1.5 text-[8px]'} ${tabClass(look, on)}`}
          >
            {look === 'cursor' && <span aria-hidden className={`mr-1 inline-block ${on ? 'motion-safe:animate-pulse' : 'invisible'}`}>▶</span>}
            {t.label}
            {t.dot && <span aria-hidden className={`absolute right-1 top-1 h-1.5 w-1.5 ${on && look === 'block' ? 'bg-ink-950' : 'bg-orange-400'}`} />}
          </button>
        );
      })}
    </div>
  );
}
