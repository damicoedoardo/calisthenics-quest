import { describe, expect, it } from 'vitest';
import { CHAPTERS } from './chapters';
import { storyGraph, WALKS, type Node, type Problem, type StoryGraph } from './graph';

/* The story graph: every scene, what makes it play, the answers it leans on, and what three kinds
   of player really get, played through the real engine. `pnpm story:graph` rewrites
   src/story/graph.md; `pnpm test` fails while it is out of date, so a story change shows its new
   graph in the pull request. */

const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const table = (head: string[], rows: (string | number)[][]) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
/** A Mermaid node id. */
const mid = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '_');
/** Text safe inside a Mermaid label. */
const label = (t: string) => t.replace(/"/g, "'").replace(/[{}]/g, '').replace(/[<>]/g, '');

const KINDS: Record<Problem['kind'], string> = {
  'lost-early': 'Lost when the boss falls early (fails the test)',
  'after-ending': "Plays after its chapter's ending (fails the test)",
  'missing-answer': 'Plays before the question it leans on (fails the test)',
  never: 'No walk reaches it (fails the test)',
  optional: 'Optional scenes the fast walk dropped',
  'out-of-chapter': 'Flame growth lands in another chapter',
};

function shape(n: Node, text: string): string {
  if (n.ends) return `${mid(n.id)}(["${text}"])`;
  if (n.asks) return `${mid(n.id)}{{"${text}"}}`;
  return `${mid(n.id)}["${text}"]`;
}

function styles(g: StoryGraph, nodes: Node[]): string[] {
  const lost = new Set(g.problems.filter((p) => p.kind === 'lost-early').map((p) => p.scene));
  const only = new Set(g.nodes.filter((n) => n.optional).map((n) => n.id));
  const out = [
    '  classDef lost fill:#fde2e2,stroke:#c0392b,color:#5b1a12',
    '  classDef only fill:#fdf1d6,stroke:#c98a10,color:#4a3305',
    '  classDef ask fill:#e2ecfd,stroke:#2f5fb3,color:#13284d',
    '  classDef done fill:#e3f6e5,stroke:#2e8b3e,color:#123d19',
  ];
  for (const n of nodes) {
    const c = lost.has(n.id) ? 'lost' : only.has(n.id) ? 'only' : n.ends ? 'done' : n.asks ? 'ask' : '';
    if (c) out.push(`  class ${mid(n.id)} ${c}`);
  }
  return out;
}

/** Opening, the six chapters, the finale: what ends each chapter. */
function spine(): string {
  const lines = ['```mermaid', 'flowchart LR', '  opening(["Opening: first Fog, the Wanderer, the class"])'];
  let prev = 'opening';
  for (const c of CHAPTERS) {
    lines.push(`  c${c.n}["Chapter ${c.n}: ${label(c.name)}<br/>${c.scenes.length} scenes"]`);
    lines.push(prev === 'opening' ? `  opening -->|"first workout"| c1` : `  ${prev} -->|"${label(CHAPTERS[c.n - 2].enemy)} falls"| c${c.n}`);
    prev = `c${c.n}`;
  }
  lines.push(`  ${prev} -->|"${label(CHAPTERS[CHAPTERS.length - 1].enemy)} falls"| finale(["finale"])`);
  lines.push('  anytime["Any time: SPs, beating last time, coming back"] -.-> c1');
  lines.push('  road["Ember Road: with friends, its own 3 chapters"] -.-> c1');
  lines.push('```');
  return lines.join('\n');
}

/** Each answer, the scene that asks it, and every scene that reads it. */
function threads(g: StoryGraph): string {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const askers = [...new Set(g.nodes.flatMap((n) => n.uses.map((u) => u.from)).filter((x): x is string => !!x))];
  const out: string[] = [];
  for (const from of askers) {
    const users = g.nodes.filter((n) => n.uses.some((u) => u.from === from));
    const key = [...new Set(users.flatMap((n) => n.uses.filter((u) => u.from === from).map((u) => u.key)))].join(', ');
    const lines = ['```mermaid', 'flowchart LR', `  ${shape(byId.get(from)!, `${from}<br/>asks ${key}`)}`];
    for (const n of users) {
      const u = n.uses.filter((x) => x.from === from);
      const how = u.map((x) => `${x.key}${x.is !== undefined ? ` = ${x.is}` : ''}${x.whole ? '' : ' (some lines)'}`).join(', ');
      lines.push(`  ${mid(from)} -.->|"${label(how)}"| ${shape(n, label(n.id))}`);
    }
    lines.push(...styles(g, [byId.get(from)!, ...users]), '```');
    out.push(`### ${key} (asked in ${from})`, '', lines.join('\n'), '');
  }
  return out.join('\n');
}

const tick = (g: StoryGraph, id: string) => g.walks.map((w) => (w.played.some((p) => p.id === id) ? 'yes' : '**no**'));

function chapter(g: StoryGraph, n: number): string {
  const c = CHAPTERS[n - 1];
  const nodes = g.nodes.filter((x) => x.group === n);
  // In the order the planned walk plays them, then whatever it never reached.
  const order = g.walks[0].played.map((p) => p.id);
  const pos = (id: string) => (order.includes(id) ? order.indexOf(id) : Infinity);
  const sorted = [...nodes].sort((a, b) => pos(a.id) - pos(b.id));
  const lines = ['```mermaid', 'flowchart TD'];
  for (const x of sorted) lines.push(`  ${shape(x, `${x.id}<br/>${label(x.when)}`)}`);
  sorted.slice(1).forEach((x, i) => lines.push(`  ${mid(sorted[i].id)} --> ${mid(x.id)}`));
  for (const x of sorted) for (const u of x.uses) if (u.from && nodes.some((y) => y.id === u.from)) lines.push(`  ${mid(u.from)} -.->|"${label(`${u.key}${u.is !== undefined ? ` = ${u.is}` : ''}`)}"| ${mid(x.id)}`);
  lines.push(...styles(g, nodes), '```');
  const rows = sorted.map((x) => [`\`${x.id}\``, x.when, x.asks ?? '', [x.ends ? 'ends the chapter' : '', x.optional ? 'optional' : '', ...x.uses.map((u) => `reads ${u.key}${u.from ? ` (${u.from})` : ''}`)].filter(Boolean).join(', '), ...tick(g, x.id)]);
  return [
    `## Chapter ${n}: ${c.name}`,
    '',
    `Ends when ${c.enemy} falls in the Fog. Planned length ${c.workouts} workouts. \`workouts\` below count from the chapter's start.`,
    '',
    lines.join('\n'),
    '',
    table(['Scene', 'Plays when', 'Asks', 'Notes', ...WALKS.map((w) => w.id)], rows),
    '',
  ].join('\n');
}

function others(g: StoryGraph, group: 0 | 'road', title: string, about: string): string {
  const nodes = g.nodes.filter((x) => x.group === group);
  const rows = nodes.map((x) => [`\`${x.id}\``, x.when, x.asks ?? '', x.uses.map((u) => `reads ${u.key}${u.from ? ` (${u.from})` : ''}`).join(', '), ...tick(g, x.id)]);
  return [`## ${title}`, '', about, '', table(['Scene', 'Plays when', 'Asks', 'Notes', ...WALKS.map((w) => w.id)], rows), ''].join('\n');
}

function problems(g: StoryGraph): string {
  const out = ['## Problem paths', '', 'Found by the walks. A scene lost, played after its ending, played before its question, or never reached fails `pnpm test`, so none are left. What is listed here is allowed, to look at.', ''];
  for (const k of Object.keys(KINDS) as Problem['kind'][]) {
    const list = g.problems.filter((p) => p.kind === k);
    if (!list.length) continue;
    out.push(`### ${KINDS[k]} (${list.length})`, '', ...list.map((p) => `- \`${p.scene}\`: ${p.text}`), '');
  }
  return out.join('\n');
}

describe('story graph', () => {
  const g = storyGraph();

  it('is up to date (pnpm story:graph rewrites it)', async () => {
    const md = [
      '# Story graph',
      '',
      'Written by `pnpm story:graph` from `src/story/` and the real story engine. Do not edit by hand; `pnpm test` fails while it is out of date. How it works: `docs/handbook/game/story.md`.',
      '',
      "Every scene is a box. A box with pointed sides asks a question; a rounded one ends its chapter. Solid arrows are the order a planned player meets the scenes; dashed arrows carry an answer to the scenes that read it. Every chapter scene catches up before the chapter's ending when its boss falls early, except the optional ones (amber: flavor for a kind of day). Red: a scene lost anyway (the test fails).",
      '',
      '## The walks',
      '',
      'Each walk plays the story through `scenesToPlay`, day by day: trains Monday, Wednesday and Friday, opens the app every day, every seventh workout a short one, every other one beats last time, first choice on every question. Nobody in a walk goes away, trains days in a row, or walks the Ember Road.',
      '',
      table(['Walk', 'Who', 'Bosses fall at workout', 'Scenes played'], g.walks.map((w) => [w.walk.id, w.walk.about, w.bossesAt.join(', '), w.played.length])),
      '',
      '## The spine',
      '',
      spine(),
      '',
      problems(g),
      '## Answers that carry',
      '',
      'Each question, and every scene that reads its answer later. A scene that waits for an answer is skipped without it; lines that read it drop out.',
      '',
      threads(g),
      ...CHAPTERS.map((c) => chapter(g, c.n)),
      others(g, 0, 'Any time', 'Scenes from `anytime.ts`: `workouts` count every workout, whatever the chapter.'),
      others(g, 'road', 'The Ember Road', 'Walked with friends (`road.ts`); no walk plays it.'),
    ].join('\n');
    await expect(md).toMatchFileSnapshot('./graph.md');
  });

  it('no scene is lost, or plays after its ending, when a boss falls early (mark flavor optional)', () => {
    expect(g.problems.filter((p) => p.kind === 'lost-early' || p.kind === 'after-ending')).toEqual([]);
  });

  it('no scene plays before the question it leans on', () => {
    expect(g.problems.filter((p) => p.kind === 'missing-answer')).toEqual([]);
  });

  it('every scene a walk can reach is reached', () => {
    expect(g.problems.filter((p) => p.kind === 'never')).toEqual([]);
  });

  it('every walk ends with the finale', () => {
    for (const w of g.walks) expect(w.played.map((p) => p.id)).toContain('finale');
  });
});
