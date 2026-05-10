/** Libellés FR pour les raretés affichées dans l’UI */
export function rarityLabel(r) {
  return (
    {
      common: 'Commun',
      rare: 'Rare',
      epic: 'Épique',
      legendary: 'Légendaire',
    }[r] || r
  );
}

/** Slots d’équipement affichés sur le dashboard (icône + libellé court) */
export const EQUIP_SLOTS = [
  { key: 'weapon_main', icon: '⚔️', label: 'Arme' },
  { key: 'weapon_secondary', icon: '🏹', label: 'Sec.' },
  { key: 'armor', icon: '🛡️', label: 'Plastron' },
  { key: 'helmet', icon: '⛑', label: 'Casque' },
  { key: 'legs', icon: '👖', label: 'Jambes' },
  { key: 'cape', icon: '🧥', label: 'Cape' },
  { key: 'accessory_1', icon: '💍', label: 'Bague 1' },
  { key: 'accessory_2', icon: '📿', label: 'Bague 2' },
];
