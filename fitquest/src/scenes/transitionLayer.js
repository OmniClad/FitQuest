/**
 * Transitions entre scènes : View Transitions API si dispo, sinon overlay CSS.
 * @param {(id: string) => HTMLElement | null} $
 */
export function createTransitionLayer($) {
  const OVERLAY_ID = 'sceneTransitionOverlay';
  let busy = false;

  function ensureOverlay() {
    let el = $(OVERLAY_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = OVERLAY_ID;
    el.className = 'scene-transition-overlay';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  }

  function fallbackAnimate(applyFn, style) {
    const ov = ensureOverlay();
    const outCls = style === 'battle' ? 'scene-tr-battle-out' : 'scene-tr-fade-out';
    const inCls = style === 'battle' ? 'scene-tr-battle-in' : 'scene-tr-fade-in';
    ov.classList.remove('scene-tr-fade-in', 'scene-tr-battle-in', 'active');
    ov.classList.add('active', outCls);
    return new Promise((resolve) => {
      setTimeout(() => {
        applyFn();
        ov.classList.remove(outCls);
        void ov.offsetWidth;
        ov.classList.add(inCls);
        setTimeout(() => {
          ov.classList.remove('active', inCls);
          resolve();
        }, 320);
      }, 200);
    });
  }

  /**
   * @param {() => void} applyFn — bascule DOM (showView interne)
   * @param {'fade'|'battle'|'none'} [style]
   */
  function run(applyFn, style = 'fade') {
    if (busy) {
      applyFn();
      return Promise.resolve();
    }
    if (style === 'none') {
      applyFn();
      return Promise.resolve();
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      applyFn();
      return Promise.resolve();
    }
    busy = true;
    const doc = document;
    if (typeof doc.startViewTransition === 'function') {
      const vt = doc.startViewTransition(() => {
        applyFn();
      });
      return vt.finished.finally(() => {
        busy = false;
      });
    }
    return fallbackAnimate(applyFn, style).finally(() => {
      busy = false;
    });
  }

  return { run, ensureOverlay };
}
