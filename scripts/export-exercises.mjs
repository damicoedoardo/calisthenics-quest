// Writes the whole exercise library to public/data/exercises.json: every exercise with its
// muscles, gear, level, movement family, kind (strength, stretch, mobility...), how-to steps, form
// tips and common mistakes. It's what a coach (a person, a script or an LLM) reads to build
// sessions without running the app. See src/exercises/README.md for the fields.
//
//   pnpm exercises:db
import { mkdirSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';

register('./ts-hooks.mjs', import.meta.url);
const { exportLibrary } = await import('../src/exercises/export.ts');
const out = new URL('../public/data/exercises.json', import.meta.url);
mkdirSync(new URL('.', out), { recursive: true });
writeFileSync(out, await exportLibrary());
console.log('wrote public/data/exercises.json');
