// Lets Node run the game's TypeScript as-is (the same hooks the Fog simulator uses).
import { register } from 'node:module';
register('../scripts/ts-hooks.mjs', import.meta.url);
