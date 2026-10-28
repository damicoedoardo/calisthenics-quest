'use client';

import { useSyncExternalStore } from 'react';
import type { Room } from 'livekit-client';
import { api } from './cloud-client';

/* Party voice: one LiveKit room per party (backend/app/voice.py). Joining asks the api for a
   pass, then talks to the voice server; the talk itself goes phone to server to phones. The
   room lives here, not in a screen, so voice keeps going when the lobby closes and in a run.
   livekit-client is loaded only when you join. */

export interface VoiceView {
  status: 'off' | 'joining' | 'on';
  /** Your mic is on. */
  mic: boolean;
  /** Who is in the room (user ids), you included. */
  here: string[];
  /** Who is talking right now. */
  talking: string[];
  /** Friends with their mic off. */
  quiet: string[];
  /** Friends you turned down on your phone. */
  silenced: string[];
  error: string;
}

const OFF: VoiceView = { status: 'off', mic: false, here: [], talking: [], quiet: [], silenced: [], error: '' };

let view: VoiceView = OFF;
let room: Room | null = null;
const silenced = new Set<string>();
const listeners = new Set<() => void>();

function set(patch: Partial<VoiceView>) {
  view = { ...view, ...patch };
  for (const l of listeners) l();
}

export const useVoice = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => view,
    () => OFF,
  );

/** Read who's here, talking and quiet from the room. */
function sync() {
  if (!room) return;
  const others = [...room.remoteParticipants.values()];
  set({
    mic: room.localParticipant.isMicrophoneEnabled,
    here: [room.localParticipant.identity, ...others.map((p) => p.identity)],
    talking: room.activeSpeakers.map((p) => p.identity),
    quiet: others.filter((p) => !p.isMicrophoneEnabled).map((p) => p.identity),
    silenced: [...silenced],
  });
}

/** Join the party's voice with the mic on. Call it from a tap: phones only play sound after one. */
export async function joinVoice() {
  if (room || view.status === 'joining') return;
  set({ status: 'joining', error: '' });
  try {
    const r = await api('POST', '/party/voice');
    if (!r.ok) {
      const detail = ((await r.json().catch(() => null)) as { detail?: string } | null)?.detail;
      throw new Error(typeof detail === 'string' ? detail : "Couldn't join voice right now.");
    }
    const { url, token } = (await r.json()) as { url: string; token: string };
    const { Room, RoomEvent, Track } = await import('livekit-client');
    const next = new Room({ audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    room = next;
    next
      .on(RoomEvent.TrackSubscribed, (track, _pub, p) => {
        if (track.kind !== Track.Kind.Audio) return;
        const el = track.attach();
        el.dataset.voice = p.identity;
        document.body.appendChild(el);
        if (silenced.has(p.identity)) p.setVolume(0);
      })
      .on(RoomEvent.TrackUnsubscribed, (track) => track.detach().forEach((el) => el.remove()))
      .on(RoomEvent.ParticipantConnected, sync)
      .on(RoomEvent.ParticipantDisconnected, sync)
      .on(RoomEvent.ActiveSpeakersChanged, sync)
      .on(RoomEvent.TrackMuted, sync)
      .on(RoomEvent.TrackUnmuted, sync)
      .on(RoomEvent.LocalTrackPublished, sync)
      .on(RoomEvent.Disconnected, () => {
        if (room === next) drop();
      });
    await next.connect(url, token);
    await next.startAudio();
    try {
      await next.localParticipant.setMicrophoneEnabled(true);
    } catch {
      set({ error: 'FORMA can’t use the mic. You can still listen; allow the mic in Settings to talk.' });
    }
    set({ status: 'on' });
    sync();
  } catch (e) {
    await leaveVoice();
    set({ error: e instanceof Error ? e.message : "Couldn't join voice right now." });
  }
}

function drop() {
  room = null;
  silenced.clear();
  document.querySelectorAll('audio[data-voice]').forEach((el) => el.remove());
  set({ ...OFF, error: view.error });
}

export async function leaveVoice() {
  const r = room;
  drop();
  await r?.disconnect().catch(() => {});
}

export async function setMic(on: boolean) {
  if (!room) return;
  try {
    await room.localParticipant.setMicrophoneEnabled(on);
    set({ error: '' });
  } catch {
    set({ error: 'FORMA can’t use the mic. Allow it in Settings to talk.' });
  }
  sync();
}

/** Turn a friend down (or back up) on your phone only; they still hear you. */
export function silence(id: string, off: boolean) {
  if (off) silenced.add(id);
  else silenced.delete(id);
  room?.remoteParticipants.get(id)?.setVolume(off ? 0 : 1);
  sync();
}
