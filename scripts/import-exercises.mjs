// Pulls the open exercise catalog (free-exercise-db, public domain under the Unlicense:
// https://github.com/yuhonas/free-exercise-db) and writes the fields the app uses to
// src/exercises/catalog.json. Its photos are left out: every demo in FORMA is our own pixel art.
// Run: node scripts/import-exercises.mjs
import { writeFileSync } from 'node:fs';

const SOURCE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`${SOURCE}: ${res.status}`);
const raw = await res.json();

const tidy = (s) => s.replace(/\s+/g, ' ').replace(/\.(?=[A-Z])/g, '. ').trim();
const catalog = raw
  .map((x) => ({
    id: x.id,
    name: x.name.trim(),
    category: x.category,
    equipment: x.equipment ?? 'body only',
    level: x.level,
    force: x.force ?? null,
    mechanic: x.mechanic ?? null,
    primary: x.primaryMuscles,
    secondary: x.secondaryMuscles,
    steps: x.instructions.map(tidy).filter(Boolean),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(new URL('../src/exercises/catalog.json', import.meta.url), JSON.stringify(catalog) + '\n');
console.log(`${catalog.length} exercises written`);
