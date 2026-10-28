'use client';

import { useEffect } from 'react';

/** A text field: focusing one brings the keyboard up. */
function isField(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/**
 * Puts the screen back together after the keyboard closes, on an installed iPhone app.
 *
 * iOS has a bug there: once the keyboard has been up, the page keeps the shorter height it had with
 * the keyboard open. The tab bar then floats in the middle of the screen, where the top of the
 * keyboard was, and the header no longer sticks under the clock. Hiding the page for one layout and
 * showing it again makes iOS measure the screen afresh. It all happens before the next frame is
 * drawn, so nothing flickers; the scroll is put back where it was.
 */
export function ViewportHeal() {
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;

    const heal = () => {
      if (isField(document.activeElement)) return;
      const { scrollX: x, scrollY: y } = window;
      const body = document.body;
      body.style.display = 'none';
      void body.offsetHeight;
      body.style.display = '';
      window.scrollTo(x, y);
    };
    // iOS settles the screen in steps as the keyboard slides away, so heal soon and once more later.
    const timers: number[] = [];
    const healSoon = () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.length = 0;
      timers.push(window.setTimeout(heal, 150), window.setTimeout(heal, 600));
    };

    const onFocusOut = (e: FocusEvent) => {
      if (isField(e.target)) healSoon();
    };
    // The visible screen grows again when the keyboard goes down, even if no field lost the focus.
    const vv = window.visualViewport;
    let lastHeight = vv?.height ?? 0;
    const onResize = () => {
      if (!vv) return;
      if (vv.height > lastHeight + 40) healSoon();
      lastHeight = vv.height;
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') healSoon();
    };

    document.addEventListener('focusout', onFocusOut);
    vv?.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      document.removeEventListener('focusout', onFocusOut);
      vv?.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return null;
}
