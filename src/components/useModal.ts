'use client';

import { useEffect, useRef } from 'react';

/**
 * For a screen that opens over the app from inside a tab (Book of Days, the look editor, sitting
 * by the fire): everything outside it becomes inert (no keyboard focus, hidden from screen readers),
 * focus moves into it, Escape closes it, and focus goes back where it was when it closes.
 * Returns the ref to put on the overlay's outer element.
 */
export function useModal<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Everything beside the overlay's own line of ancestors, up to <body>. Only what this call made
    // inert is released afterwards, so overlays stacked on overlays unwind correctly.
    const made: Element[] = [];
    for (let el: HTMLElement | null = box; el && el !== document.body; el = el.parentElement) {
      for (const sib of el.parentElement?.children ?? []) {
        if (sib !== el && !sib.hasAttribute('inert') && sib.tagName !== 'SCRIPT') {
          sib.setAttribute('inert', '');
          made.push(sib);
        }
      }
    }
    if (!box.hasAttribute('tabindex')) box.tabIndex = -1;
    box.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      made.forEach((el) => el.removeAttribute('inert'));
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, []);

  return ref;
}
