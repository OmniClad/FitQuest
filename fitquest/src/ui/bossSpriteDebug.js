/**
 * Barre de test des animations sprite boss (pré-session + combat).
 * Activé en dev (Vite) ou si localStorage `fitquest_debug_sprite` === '1'.
 */

export function isBossSpriteDebugEnabled() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) return true;
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('fitquest_debug_sprite') === '1';
  } catch {
    return false;
  }
}

/**
 * @param {HTMLElement} insertAfterEl — nœud après lequel insérer la bande (ex. .combat-boss-row)
 * @param {{ play: Function, listAnimations?: Function }} ctl
 */
export function mountBossSpriteDebugStrip(insertAfterEl, ctl) {
  if (!insertAfterEl?.parentElement || !isBossSpriteDebugEnabled()) return;
  const parent = insertAfterEl.parentElement;
  parent.querySelector(':scope > .boss-sprite-debug-strip')?.remove();
  const names = typeof ctl?.listAnimations === 'function' ? ctl.listAnimations() : [];
  if (!names.length) return;

  const strip = document.createElement('div');
  strip.className = 'boss-sprite-debug-strip';
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'Debug animations sprite boss');

  const label = document.createElement('span');
  label.className = 'boss-sprite-debug-label';
  label.textContent = 'Anim.';
  strip.appendChild(label);

  for (const name of names) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'boss-sprite-debug-btn';
    btn.textContent = name;
    btn.title = `Jouer ${name}`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ctl.play(name);
    });
    strip.appendChild(btn);
  }

  insertAfterEl.insertAdjacentElement('afterend', strip);
}
