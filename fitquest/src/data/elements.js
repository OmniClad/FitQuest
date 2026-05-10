/** Cycle élémentaire et helpers d’affichage (HTML). */

export const ELEMENTS = {
  fire: { name: 'Feu', icon: '🔥', color: '#EF4444' },
  water: { name: 'Eau', icon: '💧', color: '#3B82F6' },
  wind: { name: 'Vent', icon: '🌪️', color: '#10B981' },
  lightning: { name: 'Foudre', icon: '⚡', color: '#FBBF24' },
  holy: { name: 'Sacré', icon: '✨', color: '#FDE68A' },
  dark: { name: 'Sombre', icon: '🌑', color: '#A855F7' },
};

/** Cycle : Feu > Vent > Foudre > Eau > Feu */
export const ELEMENT_COUNTERS = {
  fire: 'wind',
  wind: 'lightning',
  lightning: 'water',
  water: 'fire',
};

export const ELEMENT_OPTIONS = [['', '—']].concat(
  Object.entries(ELEMENTS).map(([k, v]) => [k, `${v.icon} ${v.name}`])
);

export function elementMultiplier(attackerEl, defenderEl) {
  if (!attackerEl || !defenderEl) return 1;
  if (
    (attackerEl === 'holy' && defenderEl === 'dark') ||
    (attackerEl === 'dark' && defenderEl === 'holy')
  )
    return 1.3;
  if (ELEMENT_COUNTERS[attackerEl] === defenderEl) return 1.25;
  if (ELEMENT_COUNTERS[defenderEl] === attackerEl) return 0.75;
  return 1;
}

export function elementTag(el) {
  if (!el || !ELEMENTS[el]) return '';
  const e = ELEMENTS[el];
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:0.05em;background:${e.color}33;color:${e.color};border:1px solid ${e.color};">${e.icon} ${e.name}</span>`;
}
