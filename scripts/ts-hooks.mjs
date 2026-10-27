// Lets Node run the app's TypeScript as-is: "@/x" means src/x, and imports without an extension
// find the .ts file. Node strips the types itself.
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const src = fileURLToPath(new URL('../src/', import.meta.url));

export async function resolve(specifier, context, next) {
  let spec = specifier;
  if (spec.startsWith('@/')) spec = pathToFileURL(src + spec.slice(2)).href;
  if (spec.startsWith('file:') || spec.startsWith('.')) {
    const base = fileURLToPath(new URL(spec, context.parentURL));
    for (const ext of ['', '.ts', '.tsx', '/index.ts']) {
      const p = base + ext;
      if (existsSync(p) && statSync(p).isFile()) return next(pathToFileURL(p).href, context);
    }
  }
  return next(spec, context);
}
