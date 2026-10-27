'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Dumbbell, Film, Gem, Music, Play, Sparkles, Swords } from 'lucide-react';
import { addFakeWorkouts, clearNextZone, skipIntro } from '@/lib/dev';
import { initialState, type GameState } from '@/lib/game';
import { ZONES } from '@/lib/fog';
import { SANDBOX_KEY } from '@/lib/store';
import { withTodayPage } from '@/story/daily';
import { midBoss } from '@/game/dungeon/engine';

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
  return s;
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
  ['finale', 'The finale'],
];

const SKILLS: [string, string][] = [
  ['skill-floor', 'Off the bench: push-ups from the floor'],
  ['first-pullup', 'The first strict pull-up'],
  ['skill-lsit', 'The first full L-sit'],
  ['skill-top-push', 'The end of the push path'],
  ['skill-top-pull', 'The end of the pull path'],
  ['skill-top-core', 'The end of the core path'],
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
        <Row icon={<Swords size={16} />} label="The Play tab" note="Power from training with pixel icons, all six zones open" onClick={() => open(veteran(78, 6), 'tab=play')} />
      </Panel>

      <Panel title="STORY: THE BIG MOMENTS" note="Played in the Story Lab with a sample letter and answers; nothing is saved. It comes back here when the scene ends.">
        {MOMENTS.map(([id, label]) => (
          <Row key={id} icon={<Film size={16} />} label={label} note={id} href={`/lab/story?play=${id}&back`} />
        ))}
        <Row icon={<Play size={16} />} label="The opening" note="A new player on the sandbox: title, the fall, the letter" onClick={() => open(initialState(), '')} />
      </Panel>

      <Panel title="STORY: SKILL MILESTONES" note="A scene when you pass a skill that matters.">
        {SKILLS.map(([id, label]) => (
          <Row key={id} icon={<Sparkles size={16} />} label={label} note={id} href={`/lab/story?play=${id}&back`} />
        ))}
      </Panel>

      <Panel title="TRAINING AND DAYS">
        <Row icon={<Dumbbell size={16} />} label="Exercise demos" note="Your hero doing each exercise on the set logger; tap it to enlarge" onClick={() => open(veteran(14, 1), 'workout')} />
        <Row icon={<BookOpen size={16} />} label="Book of Days" note="Two weeks of pages, day icons and margin notes" onClick={() => open(veteran(30, 2), 'book')} />
        <Row icon={<Gem size={16} />} label="Keepsakes" note="Three won, the rest still in the fog" onClick={() => open(veteran(40, 3), 'tab=hero')} />
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
