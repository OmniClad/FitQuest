import { getBossLevelBadgeTier } from '../core/progression.js';

export function iconUrl(name, color) {
  const c = encodeURIComponent(color || '#FFFFFF');
  return `https://api.iconify.design/game-icons:${name}.svg?color=${c}`;
}

export function buildIconImg(iconName, color, sizeClass, fallbackEmoji) {
  const url = iconUrl(iconName, color);
  return `<img src="${url}" class="${sizeClass}" alt="" onerror="this.outerHTML='<span class=&quot;${sizeClass.replace('-img', '-emoji')} boss-emoji&quot;>${fallbackEmoji}</span>'">`;
}

/**
 * Badges dans `public/badge_level/boss/boss_badge_{1–5}.webp` (copiés à la racine de `dist/` au build).
 * Résolution par rapport à l’URL de la page : fiable en `vite dev`, build `base:'./'`, et Capacitor.
 */
export function bossLevelBadgeUrl(level) {
  const tier = getBossLevelBadgeTier(level);
  const path = `badge_level/boss/boss_badge_${tier}.webp`;
  if (typeof window !== 'undefined' && window.location?.href) {
    try {
      return new URL(path, window.location.href).href;
    } catch {
      /* fallback */
    }
  }
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${path}`.replace(/([^:])\/{2,}/g, '$1/');
}
