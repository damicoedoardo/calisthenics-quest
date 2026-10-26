'use client';

import { useState } from 'react';
import { Map, Shield, Swords } from 'lucide-react';
import { QuestTab } from '@/components/QuestTab';
import { SkillsTab } from '@/components/SkillsTab';
import { HeroTab } from '@/components/HeroTab';
import { RewardModal } from '@/components/RewardModal';
import { Hero } from '@/components/Hero';
import { equippedGear, finishSession, levelInfo, totalXp, type FinishResult } from '@/lib/game';
import { useGameState } from '@/lib/store';

type Tab = 'quest' | 'skills' | 'hero';

const TABS: { id: Tab; label: string; Icon: typeof Swords }[] = [
  { id: 'quest', label: 'Quest', Icon: Swords },
  { id: 'skills', label: 'Skills', Icon: Map },
  { id: 'hero', label: 'Hero', Icon: Shield },
];

export default function Home() {
  const { state, ready, update } = useGameState();
  const [tab, setTab] = useState<Tab>('quest');
  const [reward, setReward] = useState<FinishResult | null>(null);
  const lvl = levelInfo(totalXp(state));

  const finish = () => {
    const res = finishSession(state, new Date());
    if (!res) return;
    update(() => res.state);
    setReward(res);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="safe-top sticky top-0 z-20 bg-ink-950/90 px-4 pb-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-ink-800">
            {ready && <Hero gear={equippedGear(state)} size={42} bounce={false} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between">
              <p className="font-pixel text-sm tracking-widest text-gold-400">FORMA</p>
              <p className="text-xs text-slate-400">
                Lv {lvl.level} · <span className="text-slate-200">{lvl.title}</span>
              </p>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-sm bg-ink-700">
              <div className="h-full bg-gradient-to-r from-gold-500 to-gold-300 transition-all duration-700" style={{ width: `${lvl.pct * 100}%` }} />
            </div>
            <p className="mt-1 text-right text-[11px] text-slate-500">
              {lvl.into} / {lvl.needed} XP
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-2">
        {!ready ? null : tab === 'quest' ? (
          <QuestTab state={state} update={update} onFinish={finish} />
        ) : tab === 'skills' ? (
          <SkillsTab state={state} />
        ) : (
          <HeroTab state={state} update={update} />
        )}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-ink-700 bg-ink-900/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                window.scrollTo({ top: 0 });
              }}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${tab === id ? 'text-gold-400' : 'text-slate-500'}`}
            >
              <Icon size={22} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {reward && <RewardModal result={reward} onClose={() => setReward(null)} />}
    </div>
  );
}
