// The handbook's guard: docs/handbook/ is the map of the code that every agent reads first, and it
// only stays true if a change to the code also changes the pages about it. Plain Node, no deps.
//
//   node scripts/handbook.mjs lint          # pages, links, indexes, and every file has a page
//   node scripts/handbook.mjs check [base]  # the pages for what this branch touched were updated
//
// The routing table (touched path -> pages) lives in .claude/skills/updating-handbook/SKILL.md, so
// the people and agents reading it and this check use the same one. `check` passes a branch whose
// commits say `Handbook: none (<why>)` on a line of their own, for a change that makes no page false.
// The pre-push hook (.githooks/pre-push) and CI (.github/workflows/handbook.yml) run both.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HB = 'docs/handbook';
const SKILL = '.claude/skills/updating-handbook/SKILL.md';
const TYPES = ['conceptual', 'reference', 'landing'];
const REQUIRED = ['type', 'title', 'description', 'tags', 'timestamp'];
// Paths a file must have a route for. Everything else (lockfile, .gitignore, docs) needs none.
const COVERED = /^(src|scripts|public|\.github|\.githooks|\.claude)\/|^[^/]+\.(ts|js|cjs|mjs|json)$/;
const UNROUTED = new Set(['pnpm-lock.yaml', 'package-lock.json']);
const SKIP_TRAILER = /^Handbook:\s*none\b/im;

const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

function walk(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(join(ROOT, path)).isDirectory() ? walk(path) : [path];
  });
}

/** `src/game/**`, `src/lib/{fog,days}.ts`, `*.ts`: a path glob as a regex over repo paths. */
function globRe(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      re += glob[i + 2] === '/' ? '(?:.*/)?' : '.*';
      i += glob[i + 2] === '/' ? 2 : 1;
    } else if (c === '*') re += '[^/]*';
    else if (c === '{') re += '(?:';
    else if (c === '}') re += ')';
    else if (c === ',') re += '|';
    else re += c.replace(/[.+?^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

/** The routing table's rows: which paths each row covers, and the handbook pages it points at. */
function routes() {
  const rows = [];
  for (const line of readFileSync(join(ROOT, SKILL), 'utf8').split('\n')) {
    const cells = line.split('|').slice(1, -1);
    if (cells.length !== 2 || /^\s*:?-+/.test(cells[0])) continue;
    const ticks = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const paths = ticks(cells[0]);
    const pages = ticks(cells[1]).map((p) => `${HB}/${p}`);
    if (paths.length && pages.length) rows.push({ paths, res: paths.map(globRe), pages });
  }
  return rows;
}

const routesFor = (file, rows) => rows.filter((r) => r.res.some((re) => re.test(file)));

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  return Object.fromEntries(m[1].split('\n').flatMap((l) => {
    const kv = l.match(/^([A-Za-z_]+):\s*(.*)$/);
    return kv ? [[kv[1], kv[2].trim()]] : [];
  }));
}

function lint() {
  const errors = [];
  const pages = walk(HB).filter((p) => p.endsWith('.md'));
  const linked = new Set();
  for (const dir of new Set(pages.map(dirname))) {
    if (!existsSync(join(ROOT, dir, 'index.md'))) errors.push(`${dir}: no index.md`);
  }
  for (const page of pages) {
    const text = readFileSync(join(ROOT, page), 'utf8');
    const fm = frontmatter(text);
    if (!fm) {
      errors.push(`${page}: no frontmatter`);
      continue;
    }
    for (const k of REQUIRED) if (!fm[k]) errors.push(`${page}: frontmatter has no '${k}'`);
    if (fm.type && !TYPES.includes(fm.type)) errors.push(`${page}: type '${fm.type}' is not one of ${TYPES.join(', ')}`);
    if (page.endsWith('/index.md') && fm.type !== 'landing') errors.push(`${page}: an index.md is 'type: landing'`);
    if (fm.timestamp && !/^\d{4}-\d{2}-\d{2}$/.test(fm.timestamp)) errors.push(`${page}: timestamp is YYYY-MM-DD`);
    for (const m of text.matchAll(/\]\((?!https?:|#|mailto:)([^)#\s]+)(#[^)]*)?\)/g)) {
      const target = relative(ROOT, resolve(ROOT, dirname(page), m[1]));
      if (!existsSync(join(ROOT, target))) errors.push(`${page}: broken link -> ${m[1]}`);
      if (page.endsWith('/index.md')) linked.add(target);
    }
  }
  for (const page of pages) {
    if (!page.endsWith('/index.md') && !linked.has(page)) errors.push(`${page}: no index.md links to it`);
  }
  if (!pages.includes(`${HB}/index.md`)) errors.push(`${HB}/index.md is missing`);

  const rows = routes();
  if (!rows.length) errors.push(`${SKILL}: no routing table found`);
  for (const r of rows) for (const p of r.pages) if (!existsSync(join(ROOT, p))) errors.push(`${SKILL}: routes to a page that doesn't exist: ${p}`);
  // Every file has a page: a new folder or file with no row fails here until it gets one.
  for (const file of git('ls-files').split('\n')) {
    if (!COVERED.test(file) || UNROUTED.has(file) || file.startsWith(`${HB}/`)) continue;
    if (!existsSync(join(ROOT, file))) continue;
    if (!routesFor(file, rows).length) errors.push(`${file}: no row in the routing table (${SKILL})`);
  }

  for (const e of errors) console.log(`  ${e}`);
  console.log(`${errors.length ? 'FAIL' : 'OK'}: handbook lint, ${pages.length} pages, ${errors.length} problems`);
  return errors.length === 0;
}

function check(baseArg) {
  const base = baseArg || process.env.HANDBOOK_BASE || 'origin/main';
  let mergeBase;
  try {
    mergeBase = git(`merge-base ${base} HEAD`);
  } catch {
    console.log(`SKIP: handbook check, can't find ${base} (run \`git fetch origin main\`)`);
    return true;
  }
  const touched = git(`diff --name-only ${mergeBase} HEAD`).split('\n').filter(Boolean);
  const messages = git(`log --format=%B ${mergeBase}..HEAD`);
  if (SKIP_TRAILER.test(messages)) {
    console.log('OK: handbook check skipped by a "Handbook: none" line in a commit message');
    return true;
  }
  const rows = routes();
  const changed = new Set(touched);
  // A file is covered when any page of any row it matches was updated; files are grouped by those pages.
  const missing = new Map();
  for (const file of touched) {
    if (file.startsWith(`${HB}/`)) continue;
    const pages = [...new Set(routesFor(file, rows).flatMap((r) => r.pages))];
    if (!pages.length || pages.some((p) => changed.has(p))) continue;
    const m = missing.get(pages.join()) ?? { pages, files: [] };
    m.files.push(file);
    missing.set(pages.join(), m);
  }
  if (!missing.size) {
    console.log(`OK: handbook check, ${touched.length} files touched since ${base}`);
    return true;
  }
  console.log(`FAIL: handbook check. These changes have handbook pages that weren't updated (since ${base}):\n`);
  for (const { pages, files } of missing.values()) {
    console.log(`  ${files.slice(0, 4).join(', ')}${files.length > 4 ? ` and ${files.length - 4} more` : ''}`);
    console.log(`    -> update one of: ${pages.join(', ')}\n`);
  }
  console.log('Read the page, fix anything your change made false or incomplete, bump its timestamp.');
  console.log('If nothing on it changed, add a line `Handbook: none (<why>)` to a commit message.');
  console.log(`How: ${SKILL}`);
  return false;
}

const [mode, arg] = process.argv.slice(2);
const ok = mode === 'lint' ? lint() : mode === 'check' ? check(arg) : (console.log('usage: handbook.mjs lint | check [base]'), false);
process.exit(ok ? 0 : 1);
