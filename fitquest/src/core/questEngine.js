import { QUEST_DEFINITIONS } from '../data/quests.js';

function ensureQuestState(state) {
  if (!state.quests) state.quests = { completedIds: [], counters: {}, visitedZoneIds: [] };
  if (!Array.isArray(state.quests.completedIds)) state.quests.completedIds = [];
  if (!state.quests.counters) state.quests.counters = {};
  if (!Array.isArray(state.quests.visitedZoneIds)) state.quests.visitedZoneIds = [];
  const c = state.quests.counters;
  if (typeof c.sessions_complete !== 'number') c.sessions_complete = 0;
  if (typeof c.bosses_defeated !== 'number') c.bosses_defeated = 0;
  if (typeof c.steps_total !== 'number') c.steps_total = 0;
}

/** Appelé après chargement / migration. */
export function initQuestProgress(state) {
  ensureQuestState(state);
  const c = state.quests.counters;
  const meta = state.meta || {};
  if (c.sessions_complete === 0 && meta.total_sessions > 0) {
    c.sessions_complete = meta.total_sessions;
  }
  if (c.bosses_defeated === 0 && meta.total_bosses > 0) {
    c.bosses_defeated = meta.total_bosses;
  }
  if (state.quests.visitedZoneIds.length === 0 && state.player.unlockedZones?.length) {
    state.quests.visitedZoneIds = [...state.player.unlockedZones];
  }
  if (state.player.currentZone && !state.quests.visitedZoneIds.includes(state.player.currentZone)) {
    state.quests.visitedZoneIds.push(state.player.currentZone);
  }
}

export function questProgressFor(state, kind) {
  ensureQuestState(state);
  return state.quests.counters[kind] || 0;
}

function completeQuest(state, q, showToast) {
  if (state.quests.completedIds.includes(q.id)) return;
  state.quests.completedIds.push(q.id);
  state.player.gold = (state.player.gold || 0) + (q.rewardGold || 0);
  if (typeof showToast === 'function') showToast(`📜 Quête terminée : ${q.title} (+${q.rewardGold} or)`, 4000);
}

/**
 * @param {'sessions_complete'|'bosses_defeated'|'steps_total'|'zones_visited'} kind
 * @param {number} [amount]
 */
export function bumpQuestCounter(state, kind, amount = 1, showToast) {
  ensureQuestState(state);
  state.quests.counters[kind] = (state.quests.counters[kind] || 0) + amount;
  QUEST_DEFINITIONS.forEach((q) => {
    if (state.quests.completedIds.includes(q.id)) return;
    if (q.kind !== kind) return;
    if (state.quests.counters[kind] >= q.target) completeQuest(state, q, showToast);
  });
}

export function recheckStepsQuests(state, showToast) {
  ensureQuestState(state);
  const total = state.player.stepBalance || 0;
  state.quests.counters.steps_total = Math.max(state.quests.counters.steps_total || 0, total);
  QUEST_DEFINITIONS.forEach((q) => {
    if (state.quests.completedIds.includes(q.id)) return;
    if (q.kind !== 'steps_total') return;
    if (state.quests.counters.steps_total >= q.target) completeQuest(state, q, showToast);
  });
}

/** Nouvelle zone visitée (voyage réussi). */
export function registerZoneVisit(state, zoneId, showToast) {
  ensureQuestState(state);
  if (state.quests.visitedZoneIds.includes(zoneId)) {
    checkZonesQuests(state, showToast);
    return;
  }
  state.quests.visitedZoneIds.push(zoneId);
  checkZonesQuests(state, showToast);
}

function checkZonesQuests(state, showToast) {
  const n = state.quests.visitedZoneIds.length;
  QUEST_DEFINITIONS.forEach((q) => {
    if (state.quests.completedIds.includes(q.id)) return;
    if (q.kind !== 'zones_visited') return;
    if (n >= q.target) completeQuest(state, q, showToast);
  });
}

export function listQuestsUi(state) {
  ensureQuestState(state);
  return QUEST_DEFINITIONS.map((q) => {
    const done = state.quests.completedIds.includes(q.id);
    let cur = 0;
    if (q.kind === 'steps_total') {
      cur = Math.min(state.quests.counters.steps_total || 0, q.target);
    } else if (q.kind === 'zones_visited') {
      cur = Math.min(state.quests.visitedZoneIds.length, q.target);
    } else {
      cur = Math.min(state.quests.counters[q.kind] || 0, q.target);
    }
    return { ...q, done, current: cur };
  });
}

/** Après chargement : met à jour la progression sans spam (showToast optionnel). */
export function reconcileQuestState(state, showToast) {
  ensureQuestState(state);
  const total = state.player.stepBalance || 0;
  state.quests.counters.steps_total = Math.max(state.quests.counters.steps_total || 0, total);
  const nZones = state.quests.visitedZoneIds.length;
  QUEST_DEFINITIONS.forEach((q) => {
    if (state.quests.completedIds.includes(q.id)) return;
    if (q.kind === 'bosses_defeated' && (state.quests.counters.bosses_defeated || 0) >= q.target) {
      completeQuest(state, q, showToast);
    } else if (q.kind === 'sessions_complete' && (state.quests.counters.sessions_complete || 0) >= q.target) {
      completeQuest(state, q, showToast);
    } else if (q.kind === 'steps_total' && (state.quests.counters.steps_total || 0) >= q.target) {
      completeQuest(state, q, showToast);
    } else if (q.kind === 'zones_visited' && nZones >= q.target) {
      completeQuest(state, q, showToast);
    }
  });
}
