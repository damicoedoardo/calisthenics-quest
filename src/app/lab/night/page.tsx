'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Dumbbell, Film, Gem, Music, Play, Smartphone, Sparkles, Swords } from 'lucide-react';
import { addFakeWorkouts, clearNextZone, skipDueScenes, skipIntro } from '@/lib/dev';
import { initialState, type GameState } from '@/lib/game';
import { ZONES } from '@/lib/fog';
import { SANDBOX_KEY } from '@/lib/store';
import { withTodayPage } from '@/story/daily';
import { midBoss } from '@/game/dungeon/engine';
import { rollItem, type Item } from '@/game/dungeon/items';
import { seeded } from '@/lib/random';
import { spendEvenly } from '@/lib/stats';

/* What's new tonight: one tap to try each change. Everything that opens the app does it on a
   sandbox save (SANDBOX_KEY, chosen by ?sandbox), so the real save on this phone is never touched.
   Story scenes play in the Story Lab, which doesn't save anything. Linked from the dev panel. */

const DAY = 86_400_000;

/** A player `workouts` sessions in with `cleared` Fog bosses beaten, a page in the Book of Days for
    each of the last two weeks, and no story scene waiting. */
function veteran(workouts: number, cleared: number): GameState {
  const now = Date.now();
  let s = skipIntro(initialState(), new Date(now - 15 * DAY));
  s = { ...s, profile: { ...s.profile, flame: 'Pip', classId: 'warrior' } };
  // Most of them long ago, then the last two weeks day by day (with a rest day now and then).
  const recent = Math.min(workouts, 10);
  if (workouts > recent) s = addFakeWorkouts(s, workouts - recent, new Date(now - 15 * DAY), true);
  let left = recent;
  for (let d = 14; d >= 0; d--) {
    const day = new Date(now - d * DAY);
    day.setHours(18, 0, 0, 0);
    if (left > 0 && (d % 3 !== 1 || left > d)) {
      s = addFakeWorkouts(s, 1, day, true);
      left--;
    }
    s = withTodayPage(s, day);
  }
  for (let i = 0; i < cleared; i++) s = clearNextZone(s);
  // Nothing waiting to play over the screen being opened (a rest-day scene, say).
  for (let i = 0; i < 5; i++) s = skipDueScenes(s, new Date());
  return s;
}

/** A veteran with points spent and Fog gear: a sword (the flame guards it) and a charm on, a few things in
    the vault, one they can't wear yet. `idle` moves every workout that many days back, so the
    flame has gone cold and can't hold the sword. */
function geared(idle = 0): GameState {
  const v = veteran(14, 1),
    s = spendEvenly(idle ? { ...v, sessions: v.sessions.map((x) => ({ ...x, date: new Date(Date.parse(x.date) - idle * DAY).toISOString() })) } : v),
    rnd = seeded(12),
    find = (slot: Item['slot'], rarity: Item['rarity'], floor: number) => {
      for (;;) {
        const it = rollItem(rnd, { zone: 1, workouts: ZONES[1].workouts, floor, cls: 'warrior' }, rarity);
        if (it.slot === slot) return it;
      }
    };
  return { ...s, fogGear: { worn: { weapon: find('weapon', 'magic', 1), charm: find('charm', 'magic', 2) }, vault: [find('armor', 'rare', 2), find('charm', 'magic', 3), find('weapon', 'legendary', 9)], guard: 'weapon' } };
}

/** The geared player with embers to spare (as if melted down), co-op materials, and gear forged to
    `plus`: the sword worn, and one of each look band in the vault. */
function forged(plus: number): GameState {
  const s = geared(),
    g = s.fogGear!,
    at = (it: Item, p: number): Item => ({ ...it, plus: p });
  return {
    ...s,
    fogGear: {
      ...g,
      worn: { ...g.worn, weapon: at(g.worn.weapon!, plus), charm: at(g.worn.charm!, Math.min(plus, 7)) },
      vault: [at(g.vault[0], 4), at(g.vault[1], 10), at(g.vault[2], 13)],
      mats: { thread: 120, shard: 30, coal: 8, heart: 2 },
      embers: { found: 3000, spent: 0 },
    },
  };
}

/** The forged save with the vault's legendary worn as the sword, at +0 and wearable now: its fire, no shine. */
function legendWorn(): GameState {
  const s = forged(0),
    g = s.fogGear!,
    legend = g.vault[2];
  return { ...s, fogGear: { ...g, worn: { ...g.worn, weapon: { ...legend, plus: 0, need: null } }, vault: [g.vault[0], g.vault[1], g.worn.weapon!], guard: 'weapon' } };
}

/** A player past the finale: the flame lives in them now. */
function fused(): GameState {
  const s = veteran(80, 6);
  return s.seenScenes.includes('finale') ? s : { ...s, seenScenes: [...s.seenScenes, 'finale'] };
}

/** Write the sandbox save and open the app on it at `query`. */
function open(state: GameState, query: string) {
  try {
    localStorage.setItem(SANDBOX_KEY, JSON.stringify(state));
  } catch {
    // Storage blocked: the app opens on an empty sandbox instead.
  }
  window.location.href = `/?sandbox&${query}`;
}

const MOMENTS: [string, string][] = [
  ['flame-name', 'The flame gets its name'],
  ['ch1-victory', 'Tomorrow falls'],
  ['ch2-victory', 'The Mirror cracks'],
  ['ch3-knight-kneels', 'The Knight kneels'],
  ['ch4-victory', 'The Plateau shatters'],
  ['ch5-gathering', 'The gathering'],
  ['ch5-victory', "The Hollow's hand"],
  ['ch6-fall', 'The fall near the top'],
  ['finale', 'The finale'],
];

const BETTER: [string, string][] = [
  ['first-better', 'The first time a set beats last time'],
  ['teach-me', 'The kid asks you to teach them'],
  ['good-steel', 'Mira: "Good steel."'],
];

function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-ink-900 p-4 pixel-border">
      <h2 className="font-pixel text-[10px] text-gold-300">{title}</h2>
      {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

const chip = 'whitespace-nowrap rounded-lg bg-ink-800 px-1 py-2 text-[11px] text-slate-200 active:scale-95';

function Row({ icon, label, note, onClick, href }: { icon: ReactNode; label: string; note?: string; onClick?: () => void; href?: string }) {
  const body = (
    <>
      <span className="shrink-0 text-gold-400">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-slate-200">{label}</span>
        {note && <span className="block text-[11px] text-slate-500">{note}</span>}
      </span>
    </>
  );
  const cls = 'flex w-full items-center gap-3 rounded-xl bg-ink-950 px-3 py-2.5 text-left active:scale-[.99]';
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

export default function NightLab() {
  return (
    <main className="safe-top mx-auto min-h-dvh max-w-md space-y-4 px-4 pb-16">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Back to the app" className="rounded-lg bg-ink-800 p-2 text-slate-300">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-pixel text-sm text-gold-300">What&apos;s new tonight</h1>
          <p className="text-xs text-slate-500">One tap to try each change.</p>
        </div>
      </header>
      <p className="rounded-lg border border-dashed border-sky-400/60 px-3 py-2 text-xs text-sky-300">
        Everything here opens on a sandbox save. Your real progress on this phone is untouched; the app shows a blue bar while you&apos;re in the sandbox.
      </p>

      <Panel title="MENUS" note="Four tabs, one job each: Fog only plays (Story or Together), Hero holds your gear, vault and forge, stats and class. Tap your hero at the top for the You page.">
        <Row icon={<Swords size={16} />} label="Fog: Story" note="The worlds, then the ready strip: what you wear (tap it for Hero > Gear), warmed up, rested, the boss's hearts" onClick={() => open(geared(), 'tab=play')} />
        <Row icon={<Swords size={16} />} label="Fog: Together" note="Play with friends: the rules, the party, your friends (on a real signed-in save)" onClick={() => open(geared(), 'tab=play&fog=together')} />
        <Row icon={<Gem size={16} />} label="Hero > Gear" note="What you wear, the vault, and Mira's forge for the item you tap: the only place for them" onClick={() => open(forged(7), 'tab=hero&hero=gear')} />
        <Row icon={<Sparkles size={16} />} label="Hero > Stats" note="Your champion's points, and what your flame gives you" onClick={() => open(veteran(30, 2), 'tab=hero&hero=stats')} />
        <Row icon={<Swords size={16} />} label="Hero > Class" note="Your class and Change class" onClick={() => open(veteran(30, 2), 'tab=hero&hero=class')} />
        <Row icon={<BookOpen size={16} />} label="The You page" note="Tap your hero at the top: letter, quest log, settings, backup, cloud save" onClick={() => open(veteran(30, 2), 'you')} />
        <Row icon={<Gem size={16} />} label="Today with keepsakes" note="Three keepsakes won, at the end of Today" onClick={() => open(veteran(40, 3), 'tab=today')} />
      </Panel>

      <Panel title="INSTALL THE APP" note="After the opening, a phone in a browser tab has to put FORMA on its home screen before playing on. Each guide is shown here whatever phone you hold.">
        <Row icon={<Smartphone size={16} />} label="iPhone, Safari" note="Copy your hero, Share, Add to Home Screen, open it" onClick={() => open(skipIntro(initialState(), new Date()), 'gate=ios-safari')} />
        <Row icon={<Smartphone size={16} />} label="iPhone, Chrome" note="The same, with Share in the address bar" onClick={() => open(skipIntro(initialState(), new Date()), 'gate=ios-chrome')} />
        <Row icon={<Smartphone size={16} />} label="iPhone, another browser" note="Firefox or an app's own browser: open it in Safari" onClick={() => open(skipIntro(initialState(), new Date()), 'gate=ios-other')} />
        <Row icon={<Smartphone size={16} />} label="Android" note="The Install button where Chrome offers it, else the menu steps" onClick={() => open(skipIntro(initialState(), new Date()), 'gate=android')} />
        <Row icon={<Smartphone size={16} />} label="The installed iPhone app, first time" note="A fresh save: 'Started in another browser? Bring your hero'. Copy a hero on the Safari jump first" onClick={() => open(initialState(), 'gate=ios-safari')} />
      </Panel>

      <Panel title="THE FOG: SIX DUNGEONS" note="Every zone is a dungeon now, with its own monsters, ground, music, a mid-boss on floor 5 and its boss at the bottom. The recap shows records and relics.">
        {ZONES.map((z) => {
          // Enough workouts for the zone's chapter, and the bosses before it beaten.
          const state = () => veteran(z.workouts + 2, z.id);
          return (
            <div key={z.id} className="rounded-xl bg-ink-950 p-3">
              <p className="text-sm font-semibold text-slate-100">
                {z.id + 1}. {z.name}
              </p>
              <p className="text-[11px] text-slate-400">
                Mid-boss: {midBoss(z).name} · Boss: {z.bossName}
              </p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                <button className={chip} onClick={() => open(state(), `run=${z.id}`)}>
                  Floor 1
                </button>
                <button className={chip} onClick={() => open(state(), `run=${z.id}&at=mid`)}>
                  Mid-boss
                </button>
                <button className={chip} onClick={() => open(state(), `run=${z.id}&at=boss`)}>
                  Boss
                </button>
                <button className={chip} onClick={() => open(state(), `run=${z.id}&at=win`)}>
                  Recap
                </button>
              </div>
            </div>
          );
        })}
        <Row icon={<Swords size={16} />} label="The Fog tab" note="Story: all six worlds open, the ready strip under them" onClick={() => open(veteran(78, 6), 'tab=play')} />
        <Row icon={<Swords size={16} />} label="The Fog, sideways" note="Hold the phone across: rooms run left to right, tap a monster to aim at it" onClick={() => open(veteran(14, 1), 'run=0')} />
        <Row icon={<Swords size={16} />} label="A party run (practice)" note="You with two friends, Ana the archer and Ben the mage, played by the bot: names over their heads, XP for all, drops each their own" onClick={() => open(veteran(14, 1), 'run=0&party')} />
        <Row icon={<Gem size={16} />} label="Loot: your gear and the vault" note="Hero > Gear: what you wear into the Fog, the vault, an item you can't wear yet" onClick={() => open(geared(), 'tab=hero&hero=gear')} />
        <div className="rounded-xl bg-ink-950 px-3 py-2.5">
          <p className="text-sm text-slate-200">Mira&apos;s forge, +1 to +15</p>
          <p className="text-[11px] text-slate-500">Your sword forged this far, co-op materials to spend, a new look every few pluses (vault: +4, +10, +13). Tap the sword, then try for the next plus.</p>
          <div className="mt-2 grid grid-cols-6 gap-1">
            {[3, 6, 9, 12, 14, 15].map((p) => (
              <button key={p} className={chip} onClick={() => open(forged(p), 'tab=hero&hero=gear')}>
                +{p}
              </button>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-6 gap-1">
            {[3, 6, 9, 12, 14, 15].map((p) => (
              <button key={p} className={chip} onClick={() => open(forged(p), 'run=1')}>
                Run
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-ink-950 px-3 py-2.5">
          <p className="text-sm text-slate-200">A legendary worn</p>
          <p className="text-[11px] text-slate-500">A legendary sword at +0: the ring of fire on its card, red flames around you in a run, no forge shine yet.</p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            <button className={chip} onClick={() => open(legendWorn(), 'tab=hero&hero=gear')}>
              Play tab
            </button>
            <button className={chip} onClick={() => open(legendWorn(), 'run=1')}>
              Run
            </button>
          </div>
        </div>
        <Row icon={<Gem size={16} />} label="Loot in a run" note="Monsters and chests drop gear; the bag button top right; the stairs ask: deeper or leave with it" onClick={() => open(geared(), 'run=1')} />
        <Row icon={<Gem size={16} />} label="Loot in a run, the flame gone cold" note="No workout in 4 days: the bag says training would let the flame hold your sword" onClick={() => open(geared(4), 'run=1')} />
        <Row icon={<Swords size={16} />} label="A boss with no hearts left" note="Fog tab: 15 workouts in, Tomorrow still standing. It fights weaker, and runs start with 3 free skills" onClick={() => open(veteran(15, 0), 'tab=play')} />
        <Row icon={<Swords size={16} />} label="A boss with no hearts left, in a run" note="The 3 free skills at the start, then Tomorrow with less HP" onClick={() => open(veteran(15, 0), 'run=0&at=boss')} />
        <Row icon={<Swords size={16} />} label="A boss with hearts left" note="Fog tab: how many workouts until Tomorrow runs out of hearts" onClick={() => open(veteran(8, 0), 'tab=play')} />
        <Row icon={<Swords size={16} />} label="Exercise library" note="Train tab, top button: 870+ exercises, pixel demos for boy and girl" onClick={() => open(veteran(10, 1), 'tab=train')} />
      </Panel>

      <Panel title="STORY: THE BIG MOMENTS" note="Played in the Story Lab with a sample letter and answers; nothing is saved. It comes back here when the scene ends.">
        {MOMENTS.map(([id, label]) => (
          <Row key={id} icon={<Film size={16} />} label={label} note={id} href={`/lab/story?play=${id}&back`} />
        ))}
        <Row icon={<Play size={16} />} label="The opening" note="A new player on the sandbox: title, the fall, the letter" onClick={() => open(initialState(), '')} />
        <Row icon={<Sparkles size={16} />} label="After the finale: you burn with your flame" note="Hero tab: the flame has fused with you, red fire all around your hero" onClick={() => open(fused(), 'tab=hero')} />
        <Row icon={<Swords size={16} />} label="After the finale, in the Fog" note="The same fire on your hero in a run" onClick={() => open(fused(), 'run=5')} />
      </Panel>

      <Panel title="STORY: BETTER THAN LAST TIME" note="Scenes for beating last time, once and then again and again.">
        {BETTER.map(([id, label]) => (
          <Row key={id} icon={<Sparkles size={16} />} label={label} note={id} href={`/lab/story?play=${id}&back`} />
        ))}
      </Panel>

      <Panel title="TRAINING AND DAYS">
        <Row icon={<Dumbbell size={16} />} label="The Train tab" note="Exercise library, gym or home, the plan's two days, the next gear" onClick={() => open(veteran(14, 1), 'tab=train')} />
        <Row icon={<Sparkles size={16} />} label="Stat points" note="Hero tab: 30 workouts of points to put into Health, Armor, Damage, Haste, Speed, Crit" onClick={() => open(veteran(30, 2), 'tab=hero&hero=stats')} />
        <Row icon={<Dumbbell size={16} />} label="Exercise demos" note="Your hero doing each exercise on the set logger; tap it to enlarge" onClick={() => open(veteran(14, 1), 'workout')} />
        <Row icon={<BookOpen size={16} />} label="Book of Days" note="Two weeks of pages, day icons and margin notes" onClick={() => open(veteran(30, 2), 'book')} />
        <Row icon={<Gem size={16} />} label="Keepsakes" note="Today, at the end: three won, the rest still in the fog" onClick={() => open(veteran(40, 3), 'tab=today')} />
        <Row icon={<Music size={16} />} label="Music Lab" note="Every zone's theme, the Warden's, and the stings" href="/lab/music" />
      </Panel>

      <Panel title="UNDER THE HOOD" note="Nothing to tap; how to see each one.">
        <ul className="list-disc space-y-1.5 pl-4 text-xs text-slate-300">
          <li>Faster: tapping Play starts a run in about a third of the time (sprites drawn ahead while the Play tab is open).</li>
          <li>Offline: after one visit the app starts with no signal; open the Play tab once and runs work offline too.</li>
          <li>Updates: an installed app picks up a new version when you bring it back to the front.</li>
          <li>iOS: a FORMA launch screen when the installed app opens.</li>
          <li>Reduced motion (iOS Settings, Accessibility, Motion): no screen shake, flashes or hit-stop.</li>
          <li>Keyboard and screen readers: focus stays inside open screens, Escape closes them.</li>
        </ul>
      </Panel>
    </main>
  );
}
