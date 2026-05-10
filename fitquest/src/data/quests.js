/** Définitions quêtes solo (IDs stables pour la sauvegarde). */

export const QUEST_DEFINITIONS = [
  {
    id: 'tutorial_session',
    title: 'Première séance',
    desc: 'Terminez une séance d’entraînement (au moins un exercice validé).',
    kind: 'sessions_complete',
    target: 1,
    rewardGold: 25,
  },
  {
    id: 'slayer_1',
    title: 'Chasseur de monstres',
    desc: 'Vainquez 1 boss.',
    kind: 'bosses_defeated',
    target: 1,
    rewardGold: 75,
  },
  {
    id: 'walker_forest',
    title: 'Marche vers l’inconnu',
    desc: 'Accumulez 2 500 pas de marche (bouton « Synchroniser les pas »).',
    kind: 'steps_total',
    target: 2500,
    rewardGold: 40,
  },
  {
    id: 'zones_2',
    title: 'Explorateur',
    desc: 'Visitez 2 zones différentes (voyages réussis).',
    kind: 'zones_visited',
    target: 2,
    rewardGold: 60,
  },
];
