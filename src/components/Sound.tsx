'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { music, type TrackId } from '@/lib/music';

/** Plays a track while the calling screen is on, and fades it when it leaves. */
export function useMusic(id: TrackId | null) {
  useEffect(() => {
    if (!id) return;
    music.play(id);
    return () => music.release(id);
  }, [id]);
}

export function useMuted() {
  return useSyncExternalStore(
    (fn) => music.subscribe(fn),
    () => music.muted,
    () => false,
  );
}

/** Whether the menus have music (Hero tab, Settings). */
export function useMenuMusic() {
  return useSyncExternalStore(
    (fn) => music.subscribe(fn),
    () => music.menuMusic,
    () => true,
  );
}

/** Plays the menus' music while `on`; any screen with its own song plays over it and hands back. */
export function useMenuTrack(on: boolean) {
  const wanted = useMenuMusic() && on;
  useEffect(() => {
    music.setBase(wanted ? 'menu' : null);
  }, [wanted]);
}

export function SoundToggle({ className = '' }: { className?: string }) {
  const muted = useMuted();
  return (
    <button
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      onClick={(e) => {
        e.stopPropagation();
        music.unlock();
        music.setMuted(!muted);
      }}
      className={`grid h-9 w-9 place-items-center rounded-md text-slate-500 ${className}`}
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}
