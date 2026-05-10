import { elementMultiplier } from '../data/elements.js';
import { matchupMultiplier } from './progression.js';

/**
 * @param {object|null} exercise — depuis allExercises().find(...)
 * @param {object} equipmentBonus — résultat de computeEquipmentBonus(player)
 * @param {object|null} weaponMain — state.player.equipment.weapon_main (élément matchup)
 */
export function computeExerciseDamage(
  exercise,
  sets,
  repsOrSec,
  weight,
  recordBonus,
  equipmentBonus,
  boss,
  weaponMain,
  options = {}
) {
  if (!exercise) return 0;
  const forceMult = 1 + (equipmentBonus.force || 0) / 200;
  const baseUnit = exercise.unit === 'seconds' ? 30 : 10;
  const volumeMult = repsOrSec / baseUnit;
  let dmg = (exercise.baseDamage + recordBonus) * sets * volumeMult;
  if (exercise.hasWeight && weight > 0) dmg += weight * 0.3;
  dmg *= forceMult;
  if (boss) {
    dmg *= matchupMultiplier(exercise.type, boss.type);
    if (weaponMain && weaponMain.element && boss.element) {
      dmg *= elementMultiplier(weaponMain.element, boss.element);
    }
    const defReduction = 100 / (100 + (boss.defense || 0));
    dmg *= defReduction;
  }
  if (options.skill) dmg *= 2;
  return Math.max(1, Math.round(dmg));
}

export function computeBossCounterAttack(boss, playerDefense, equipmentBonus) {
  const totalDef = playerDefense + (equipmentBonus.defense || 0);
  const reduction = Math.min(0.7, totalDef / (totalDef + 50));
  const raw = boss.attack * (0.85 + Math.random() * 0.3);
  return Math.max(1, Math.round(raw * (1 - reduction)));
}
