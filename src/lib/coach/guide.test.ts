import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type Session } from '@/lib/game';
import { ZONES } from '@/lib/fog';
import { CHAPTERS } from '@/story/chapters';
import { FLAME_STAGES } from '@/story/flame';
import { SP_CARDS } from '@/game/dungeon/content';
import { EMBERS, STEPS, XP } from '@/balance';
import { askGuide, BEHIND_THE_SCENES, GUIDE, guideIndex, type BalanceFile } from './guide';
import { runTool } from './tools';

const NOW = new Date('2026-10-28T10:00:00Z');

const sessions = (n: number): Session[] =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i}`, date: new Date(NOW.getTime() - (n - i) * 2 * 86_400_000).toISOString(), kind: 'full', day: 'A', xp: XP.full, breakdown: [], entries: [] }));

const fresh = (): GameState => ({ ...initialState(), profile: { ...initialState().profile, onboarded: true, classId: 'warrior' } });

/** Everything a new player could ask about what is still ahead. */
const LATER = [
  ...ZONES.slice(1).flatMap((z) => [`how do I beat ${z.bossName}?`, `what is ${z.name}?`]),
  ...Object.values(SP_CARDS).flatMap((cards) => cards.map((c) => `what is ${c.name}?`)),
  'what is an SP?',
  'what does my flame turn into?',
  'what happens at the end of the story?',
  'tell me about the last chapter',
];

/** Names a new player must never be told. */
const SECRETS = [
  ...ZONES.slice(1).flatMap((z) => [z.name, z.bossName]),
  ...CHAPTERS.slice(1).map((c) => c.name),
  ...Object.values(SP_CARDS).flatMap((cards) => cards.map((c) => c.name)),
  ...FLAME_STAGES.slice(2).map((f) => f.name),
].filter((name) => name !== 'The Fog'); // a zone named like the game itself

describe('the game guide', () => {
  it('covers every balance file, or says why not', () => {
    const files = readdirSync(join(__dirname, '../../balance'))
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'index.ts')
      .map((f) => f.replace(/\.ts$/, '') as BalanceFile);
    const covered = new Set(GUIDE.flatMap((t) => t.from));
    for (const f of files) expect(covered.has(f) || f in BEHIND_THE_SCENES, `src/balance/${f}.ts is in no guide topic`).toBe(true);
  });

  it('reads its numbers from src/balance', () => {
    const s = fresh();
    expect(askGuide(s, 'what are embers for?', NOW)).toContain(`${EMBERS.full} for a full workout`);
    expect(askGuide(s, 'how does the forge work past +5', NOW)).toContain(STEPS.slice(0, 5).map((x) => x.embers).join(', '));
    expect(askGuide(s, 'how much xp for a workout', NOW)).toContain(`${XP.full} XP`);
  });

  it('writes every topic it has reached without holes', () => {
    for (const s of [fresh(), { ...fresh(), sessions: sessions(40), sp: { givenAt: 3, floor: true }, fog: { cleared: 3, runs: 9, best: {} } }]) {
      for (const t of GUIDE) {
        if (t.opens && !t.opens(s, NOW)) continue;
        const text = t.text(s, NOW);
        expect(text, t.id).not.toMatch(/undefined|NaN|\[object/);
        expect(text.length, t.id).toBeGreaterThan(20);
      }
    }
  });

  it('answers the common questions with the right topic', () => {
    const s = fresh();
    const first = (q: string) => askGuide(s, q, NOW).split('\n')[0];
    expect(first('what are sweat coins?')).toContain('Sweat coins');
    expect(first('what happens if I die in a run?')).toContain('Falling');
    expect(first('which class is best?')).toContain('classes');
    expect(first('how do crits work')).toContain('Crits');
    expect(first('why cant I wear this legendary')).toContain('Items');
    expect(first('how do I beat the first boss')).toMatch(/Fog|Zone 1/);
  });

  it('tells a new player nothing that is still ahead', () => {
    const s = fresh();
    const said = [guideIndex(s, NOW), ...LATER.map((q) => askGuide(s, q, NOW)), ...GUIDE.filter((t) => !t.opens || t.opens(s, NOW)).map((t) => t.text(s, NOW))].join('\n');
    for (const name of SECRETS) expect(said, name).not.toContain(name);
    expect(askGuide(s, `how do I beat ${ZONES[1].bossName}?`, NOW)).toMatch(/^Ahead/);
  });

  it('opens a zone and the SPs as the player reaches them', () => {
    const later: GameState = { ...fresh(), sessions: sessions(40), sp: { givenAt: 3, floor: true }, fog: { cleared: 1, runs: 5, best: {} } };
    expect(askGuide(later, `how do I beat ${ZONES[1].bossName}?`, NOW)).toContain(ZONES[1].hint);
    const sp = askGuide(later, 'what is an SP?', NOW);
    expect(sp).toContain(SP_CARDS.warrior[0].name);
    // Only the SP they own, never the ones the story still holds.
    for (const c of SP_CARDS.warrior.slice(1)) expect(sp).not.toContain(c.name);
  });

  it('is a coach tool', () => {
    const r = runTool(fresh(), 'game_guide', JSON.stringify({ question: 'what are embers?' }), { all: [], now: NOW, id: () => 'x', rng: () => 0.5 });
    expect(r.result).toContain('embers');
    expect(runTool(fresh(), 'game_guide', '{}', { all: [], now: NOW, id: () => 'x', rng: () => 0.5 }).result).toMatch(/^Topics:/);
  });
});
