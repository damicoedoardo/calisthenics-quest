'use client';

/** One look for every switch between parts of a screen (Friends | Feed, Gear | Stats | Class,
    Upgrade | Reroll, the vault's slot filter): a dark sunken tray with pixel type, and the open part
    a gold block raised on its shadow, like the app's big buttons. `small` is the filter size. */
export type PixelTab<T extends string> = { id: T; label: string; dot?: boolean };

export function PixelTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  small = false,
  className = '',
}: {
  tabs: readonly PixelTab<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  small?: boolean;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`grid gap-1 rounded-lg border-2 border-ink-700 bg-ink-950 p-1 pb-1.5 shadow-[inset_0_2px_0_rgba(0,0,0,0.45)] ${className}`}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={`relative rounded-md font-pixel transition-colors ${small ? 'py-1.5 text-[8px] land:text-[7px]' : 'py-2.5 text-[9px]'} ${
              on ? 'bg-gold-400 text-ink-950 shadow-[0_3px_0_#b45309]' : 'text-slate-400 active:bg-ink-800'
            }`}
          >
            {t.label}
            {t.dot && <span aria-hidden className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 ${on ? 'bg-ink-950' : 'bg-orange-400'}`} />}
          </button>
        );
      })}
    </div>
  );
}
