import { COMB_BONUS_PER_LEVEL, COUNTER_TYPE } from '../data/constants.js';

export function xpForNextLevel(level) {
  return 200 * (level + 1);
}

export function getEffectiveStats(item) {
  if (!item || !item.stats) return {};
  const lvl = item.combLevel || 0;
  const mult = 1 + COMB_BONUS_PER_LEVEL * lvl;
  const out = {};
  Object.entries(item.stats).forEach(([k, v]) => {
    out[k] = Math.round(v * mult);
  });
  return out;
}

/** Bonus cumulés des pièces équipées (stats effectives avec fusion). */
export function computeEquipmentBonus(player) {
  const bonus = { force: 0, defense: 0, agility: 0, constitution: 0 };
  Object.values(player.equipment).forEach((item) => {
    if (item) {
      const eff = getEffectiveStats(item);
      Object.entries(eff).forEach(([k, v]) => {
        bonus[k] = (bonus[k] || 0) + v;
      });
    }
  });
  return bonus;
}

export function getDifficultyTier(level) {
  if (level <= 10) return { tier: 'easy', numEx: 3, sets: 3, reps: 10, seconds: 30 };
  if (level <= 30) return { tier: 'medium', numEx: 4, sets: 3, reps: 12, seconds: 40 };
  if (level <= 50) return { tier: 'hard', numEx: 5, sets: 4, reps: 14, seconds: 50 };
  return { tier: 'extreme', numEx: 6, sets: 4, reps: 16, seconds: 60 };
}

export function isGoodMatchup(exerciseType, bossType) {
  return COUNTER_TYPE[bossType] === exerciseType;
}

export function matchupMultiplier(exerciseType, bossType) {
  return isGoodMatchup(exerciseType, bossType) ? 1.5 : 1.0;
}

/**
 * Mutate state.player / state.meta — renvoie le nombre de niveaux gagnés.
 * @param {{ player: object, meta: object }} state
 */
export function applyXp(state, amount) {
  state.player.xp += amount;
  let lvl = 0;
  while (state.player.xp >= xpForNextLevel(state.player.level)) {
    state.player.xp -= xpForNextLevel(state.player.level);
    state.player.level += 1;
    lvl += 1;
    state.meta.total_levelups += 1;
    state.player.stats.force += 5;
    state.player.stats.defense += 3;
    state.player.stats.agility += 2;
    state.player.stats.constitution += 10;
    state.player.stats.mana = (state.player.stats.mana || 100) + 10;
    state.player.stats.hp_current = state.player.stats.constitution;
    state.player.stats.mp_current = state.player.stats.mana;
  }
  return lvl;
}
