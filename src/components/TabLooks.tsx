'use client';

import { useState } from 'react';
import { PixelTabs, TAB_LOOKS, type TabLook } from './PixelTabs';

/** Lab: every look of the tab switch side by side, on the app's real switches, to pick one. */
export function TabLooks() {
  return (
    <div className="space-y-3">
      {TAB_LOOKS.map((l) => (
        <Sample key={l.id} look={l.id} name={l.name} />
      ))}
    </div>
  );
}

function Sample({ look, name }: { look: TabLook; name: string }) {
  const [friends, setFriends] = useState<'friends' | 'feed'>('friends');
  const [part, setPart] = useState<'gear' | 'stats' | 'class'>('gear');
  const [slot, setSlot] = useState<'all' | 'weapon' | 'armor' | 'charm'>('all');
  return (
    <div className="rounded-xl bg-ink-800 p-3">
      <p className="mb-2 font-pixel text-[9px] text-slate-300">{name}</p>
      <div className="space-y-3">
        <PixelTabs look={look} label="Friends or feed" tabs={[{ id: 'friends', label: 'Friends' }, { id: 'feed', label: 'Feed', dot: true }]} value={friends} onChange={setFriends} />
        <PixelTabs look={look} label="Your hero" tabs={[{ id: 'gear', label: 'Gear' }, { id: 'stats', label: 'Stats', dot: true }, { id: 'class', label: 'Class' }]} value={part} onChange={setPart} />
        <PixelTabs look={look} small label="Show" tabs={[{ id: 'all', label: 'All' }, { id: 'weapon', label: 'Weapon' }, { id: 'armor', label: 'Armor' }, { id: 'charm', label: 'Charm' }]} value={slot} onChange={setSlot} />
      </div>
    </div>
  );
}
