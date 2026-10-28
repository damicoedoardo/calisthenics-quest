'use client';

import { api, Offline } from './cloud-client';
import type { Answer } from './coach/chat';
import type { ChatMessage } from './coach/types';

/* Talking to the coach: POST /coach on FORMA's api (backend/app/routes/coach.py), which asks the
   LLM. Needs a sign-in, like the cloud backup. Errors come back as a line the coach can say. */

export class CoachError extends Error {}

export async function askCoach(brief: string, messages: ChatMessage[]): Promise<Answer> {
  let r: Response;
  try {
    r = await api('POST', '/coach', { brief, messages });
  } catch (e) {
    throw new CoachError(e instanceof Offline ? "I can't reach you right now. Are you online?" : 'Sign in first, on the Hero tab, and we can talk.');
  }
  if (r.status === 429) throw new CoachError("We've talked a lot today. Let's pick this up tomorrow!");
  if (r.status === 503) throw new CoachError("I can't talk yet: my voice isn't switched on.");
  if (!r.ok) throw new CoachError('I lost my words for a second. Try again?');
  return (await r.json()) as Answer;
}
