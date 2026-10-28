/* Starting over from scratch (the You page's Settings): the code the player types back to be
   sure. Pure, so the code comes from an rng the screen passes in. */

/** Letters and digits that can't be misread for each other (no O/0, I/1/L). */
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/** A fresh code to copy, like "K7PX2M". */
export function startOverCode(rng: () => number): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CHARS[Math.floor(rng() * CHARS.length)];
  return code;
}

/** The typed code matches: case and spaces don't count. */
export const codeMatches = (typed: string, code: string) => typed.replace(/\s+/g, '').toUpperCase() === code;
