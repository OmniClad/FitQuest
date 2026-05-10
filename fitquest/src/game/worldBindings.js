import {
  findZoneById,
  isZoneUnlocked as playerCanEnterZone,
  tryUnlockZones as syncUnlockedZones,
  pickBossForLevel as pickRandomBossForLevel,
  getRegionalBossForZone,
  generateProposedExercises as buildExerciseProposal,
  resolveCurrentZone,
} from '../core/world.js';
import {
  computeExerciseDamage as calcExerciseDamage,
  computeBossCounterAttack as calcBossCounterAttack,
} from '../core/combat.js';
import { computeEquipmentBonus } from '../core/progression.js';

/**
 * Relie le catalogue runtime et l’état au module world/combat du core.
 * @param {object} deps
 * @param {() => object | null} deps.getState
 * @param {object} deps.catalog — instance createGameCatalog
 */
export function createWorldBindings(deps) {
  const { getState, catalog } = deps;

  function computeExerciseDamage(exerciseId, sets, repsOrSec, weight, options = {}) {
    const state = getState();
    const ex = catalog.allExercises().find((e) => e.id === exerciseId);
    const recordBonus = state.player.records_bonus[exerciseId] || 0;
    const bonus = computeEquipmentBonus(state.player);
    return calcExerciseDamage(
      ex,
      sets,
      repsOrSec,
      weight,
      recordBonus,
      bonus,
      state.boss.current,
      state.player.equipment.weapon_main,
      options,
    );
  }

  function computeBossCounterAttack(boss) {
    const state = getState();
    return calcBossCounterAttack(boss, state.player.stats.defense, computeEquipmentBonus(state.player));
  }

  function getZoneById(id) {
    return findZoneById(catalog.allZones(), id);
  }

  function getCurrentZone() {
    const state = getState();
    return resolveCurrentZone(state.player.currentZone, catalog.allZones());
  }

  function isZoneUnlocked(zoneId) {
    const state = getState();
    return playerCanEnterZone(zoneId, state.player, catalog.allZones());
  }

  function tryUnlockZones() {
    const state = getState();
    syncUnlockedZones(state.player, catalog.allZones());
  }

  function pickBossForLevel(playerLevel) {
    const state = getState();
    return pickRandomBossForLevel(
      playerLevel,
      getCurrentZone(),
      catalog.allBosses(),
      state.player.defeatedRegionalBosses,
    );
  }

  function getRegionalBossOfCurrentZone() {
    const state = getState();
    return getRegionalBossForZone(getCurrentZone(), state.player.defeatedRegionalBosses, catalog.allBosses());
  }

  function generateProposedExercises(boss, opts) {
    return buildExerciseProposal(boss, catalog.allExercises(), opts);
  }

  return {
    computeExerciseDamage,
    computeBossCounterAttack,
    getZoneById,
    getCurrentZone,
    isZoneUnlocked,
    tryUnlockZones,
    pickBossForLevel,
    getRegionalBossOfCurrentZone,
    generateProposedExercises,
  };
}
