import { randInt } from './utils.js';

/** Tirage de butin selon les chances du boss (boss.drops). */
export function rollDrops(boss) {
  const drops = [];
  (boss.drops || []).forEach((d) => {
    if (Math.random() < d.chance) {
      const qty = randInt(d.qty[0], d.qty[1]);
      drops.push({ type: d.type, id: d.id, qty });
    }
  });
  return drops;
}
