import { COUNTER_TYPE } from '../data/constants.js';
import { shuffle } from './utils.js';
import { getDifficultyTier } from './progression.js';

export function findZoneById(zones, id) {
  return zones.find((z) => z.id === id);
}

export function isZoneUnlocked(zoneId, player, zones) {
  if (player.unlockedZones.includes(zoneId)) return true;
  const z = findZoneById(zones, zoneId);
  if (!z) return false;
  if (player.level < z.requiredLevel) return false;
  if (z.requiredRegionalBoss && !player.defeatedRegionalBosses.includes(z.requiredRegionalBoss)) return false;
  return true;
}

/** Mutate player.unlockedZones — zones with travelKm > 0 require GPS travel, never auto-unlock */
export function tryUnlockZones(player, zones) {
  zones.forEach((z) => {
    if (!player.unlockedZones.includes(z.id) && isZoneUnlocked(z.id, player, zones)) {
      if (!z.travelKm || z.travelKm === 0) {
        player.unlockedZones.push(z.id);
      }
    }
  });
}

export function pickBossForLevel(playerLevel, zone, allBosses, defeatedRegionalBosses) {
  const pool = allBosses.filter((b) => {
    if (b.region !== zone.id) return false;
    if (b.isRegionalBoss) return false;
    return true;
  });
  if (pool.length === 0) {
    const fb = allBosses.filter((b) => b.region === zone.id && !defeatedRegionalBosses.includes(b.id));
    if (fb.length > 0) return fb[Math.floor(Math.random() * fb.length)];
    return allBosses[0];
  }
  const close = pool.filter((b) => Math.abs(b.level - playerLevel) <= 8);
  const final = close.length > 0 ? close : pool;
  return final[Math.floor(Math.random() * final.length)];
}

export function getRegionalBossForZone(zone, defeatedRegionalBosses, allBosses) {
  if (!zone.regionalBossId) return null;
  if (defeatedRegionalBosses.includes(zone.regionalBossId)) return null;
  return allBosses.find((b) => b.id === zone.regionalBossId) || null;
}

export function generateProposedExercises(boss, allExercises, opts = {}) {
  const tier = getDifficultyTier(boss.level);
  const numEx = Math.max(
    2,
    Math.min(opts.numEx != null ? opts.numEx : tier.numEx, allExercises.length),
  );
  const counterT = COUNTER_TYPE[boss.type];
  const counterCount = Math.ceil((numEx * 2) / 3);
  const otherCount = numEx - counterCount;
  const counterPool = allExercises.filter((e) => e.type === counterT);
  const otherPool = allExercises.filter((e) => e.type !== counterT);
  const picked = [];
  shuffle(counterPool)
    .slice(0, counterCount)
    .forEach((e) => picked.push(e));
  shuffle(otherPool)
    .slice(0, otherCount)
    .forEach((e) => picked.push(e));
  return shuffle(picked);
}

/** Zone active ou première entrée de la liste fusionnée (équivalent ancien GAME_DATA.zones[0]). */
export function resolveCurrentZone(currentZoneId, zones) {
  return findZoneById(zones, currentZoneId) || zones[0];
}
