import { FAMILIES, KINDS, loadLibrary } from './library';

/** The library as the JSON file in public/data/exercises.json (see README.md next to this). */
export async function exportLibrary(): Promise<string> {
  const all = await loadLibrary();
  const db = {
    about: 'FORMA exercise library. Catalog entries come from free-exercise-db (public domain); coaching is FORMA\'s own.',
    fields: 'See src/exercises/README.md',
    families: FAMILIES,
    kinds: KINDS,
    count: all.length,
    exercises: all.map(({ id, name, kind, family, region, level, equipment, kit, category, force, mechanic, primary, secondary, steps, tips, mistakes, demo, source }) => ({
      id,
      name,
      kind,
      family,
      region,
      level,
      equipment,
      kit,
      category,
      force,
      mechanic,
      primary,
      secondary,
      steps,
      tips,
      mistakes,
      demo,
      source,
    })),
  };
  return JSON.stringify(db, null, 1) + '\n';
}
