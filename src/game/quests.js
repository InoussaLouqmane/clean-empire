// Quêtes de CLEAN CEO (prompt « boutique, quêtes, temporalités » du
// 2026-09-25). Données seules : le suivi est dans GameState (_checkQuests,
// claimQuest), l'affichage dans ui/QuestPanel.js.
//
// Une quête n'est visible qu'à partir de son niveau (`level`). Elle se
// complète quand questValue() atteint `target` — une fois complétée, elle le
// reste (dépenser son argent ne la « dé-complète » pas) — et sa récompense
// n'est donnée qu'au clic sur « Réclamer ».
//
// Niveau 1 : 3 quêtes d'introduction, qui avancent en coulisses pendant le
// tutoriel et sont révélées à la fin. Le reste appartient à la suite du jeu.
// Quêtes de contrats : onglet Contrats rétabli le même jour (40 quêtes).
// Contrats proposés : 3 au niv. 2, +4 au 3, +5 au 4, +6 au 5 → objectifs 1/5/10/15.

/** Valeur actuelle mesurée par un type de quête. */
export function questValue(state, quest) {
  switch (quest.type) {
    case 'collections':
      return state.stats.collections;
    case 'money_earned':
      return state.stats.moneyEarned;
    case 'money_held':
      return state.money;
    case 'walkers':
      return state.walkerCount;
    case 'vehicles':
      return state.units.filter((u) => u.type !== 'walker' && (!quest.unit || u.type === quest.unit)).length;
    case 'vehicle_collections':
      return state.stats.vehicleCollections;
    case 'upgrades':
      return state.upgrades.length;
    case 'repairs':
      return state.stats.repairs;
    case 'level':
      return state.level;
    case 'contracts':
      return state.signedContracts.length;
    default:
      return 0;
  }
}

const q = (level, id, type, target, title, desc, money, xp = 0, extra = {}) => ({
  level, id, type, target, title, desc, reward: { money, xp }, ...extra,
});

export const QUESTS = [
  // --- Niveau 1 : introduction (3)
  q(1, 'premier_balai', 'collections', 1, 'Premier coup de balai', 'Termine ta première collecte', 200),
  q(1, 'equipe', 'walkers', 2, 'Une équipe qui grandit', 'Aie 2 ouvriers à pied', 300),
  // 1 500 = les 3 collectes du tutoriel : les 3 quêtes d'intro sont prêtes à
  // réclamer quand Karim présente le carnet.
  q(1, 'premiers_benefices', 'money_earned', 1500, 'Premiers bénéfices', 'Gagne 1 500 FCFA au total', 300, 5),

  // --- Niveau 2 (10)
  q(2, 'a_son_compte', 'level', 2, 'À son compte', 'Atteins le niveau 2', 1000, 0),
  q(2, 'tournee', 'collections', 10, 'La tournée du quartier', 'Fais 10 collectes', 500, 5),
  q(2, 'croisiere', 'collections', 25, 'Rythme de croisière', 'Fais 25 collectes', 1000, 10),
  q(2, 'compte_remplit', 'money_earned', 10000, 'Le compte se remplit', 'Gagne 10 000 FCFA au total', 1000, 5),
  q(2, 'bas_de_laine', 'money_held', 5000, 'Bas de laine', 'Aie 5 000 FCFA en poche', 500),
  q(2, 'renfort', 'walkers', 3, 'Renfort', 'Aie 3 ouvriers à pied', 800),
  q(2, 'premier_engin', 'vehicles', 1, 'Premier engin', 'Achète un engin', 1000, 10),
  q(2, 'chapeaux_de_roue', 'vehicle_collections', 5, 'Sur les chapeaux de roue', 'Fais 5 collectes en engin', 800, 5),
  q(2, 'investisseur', 'upgrades', 1, 'Investisseur', 'Achète une amélioration', 800, 5),
  q(2, 'mecano', 'repairs', 1, 'Mécano du dimanche', 'Répare un engin', 500),
  q(2, 'premier_contrat', 'contracts', 1, 'Poignée de main', 'Signe un nouveau contrat', 500, 5),

  // --- Niveau 3 (11)
  q(3, 'niveau_3', 'level', 3, 'Entrepreneur confirmé', 'Atteins le niveau 3', 2000),
  q(3, 'cinquante', 'collections', 50, 'Cinquante tournées', 'Fais 50 collectes', 2000, 15),
  q(3, 'centaine', 'collections', 100, 'La centaine', 'Fais 100 collectes', 4000, 25),
  q(3, 'cinquante_mille', 'money_earned', 50000, 'Petite fortune', 'Gagne 50 000 FCFA au total', 3000, 10),
  q(3, 'cent_mille', 'money_earned', 100000, 'Cent mille', 'Gagne 100 000 FCFA au total', 5000, 20),
  q(3, 'tresorerie', 'money_held', 20000, 'Trésorerie saine', 'Aie 20 000 FCFA en poche', 2000),
  q(3, 'cinq_ouvriers', 'walkers', 5, 'Brigade', 'Aie 5 ouvriers à pied', 2000, 10),
  q(3, 'flotte', 'vehicles', 3, 'Petite flotte', 'Aie 3 engins', 3000, 15),
  q(3, 'poids_lourd', 'vehicles', 1, 'Poids lourd', 'Achète un camion', 5000, 20, { unit: 'camion' }),
  q(3, 'rouleur', 'vehicle_collections', 25, 'Rouleur', 'Fais 25 collectes en engin', 2500, 15),
  q(3, 'trois_ameliorations', 'upgrades', 3, 'Toujours mieux', 'Achète 3 améliorations', 2500, 15),
  q(3, 'carnet_adresses', 'contracts', 5, "Carnet d'adresses", 'Signe 5 nouveaux contrats', 2000, 15),

  // --- Niveau 4 (6)
  q(4, 'niveau_4', 'level', 4, 'Patron de quartier', 'Atteins le niveau 4', 4000),
  q(4, 'deux_cents', 'collections', 200, 'Deux cents tournées', 'Fais 200 collectes', 8000, 40),
  q(4, 'quart_million', 'money_earned', 250000, 'Quart de million', 'Gagne 250 000 FCFA au total', 10000, 40),
  q(4, 'huit_ouvriers', 'walkers', 8, 'Grande équipe', 'Aie 8 ouvriers à pied', 6000, 30),
  q(4, 'cinq_ameliorations', 'upgrades', 5, 'Machine bien huilée', 'Achète 5 améliorations', 6000, 30),
  q(4, 'dix_reparations', 'repairs', 10, 'Atelier tournant', 'Répare 10 fois un engin', 4000, 20),
  q(4, 'reseau', 'contracts', 10, 'Le réseau', 'Signe 10 nouveaux contrats', 6000, 30),

  // --- Niveau 5 (6)
  q(5, 'niveau_5', 'level', 5, 'CLEAN CEO', 'Atteins le niveau 5', 10000),
  q(5, 'cinq_cents', 'collections', 500, 'Légende du quartier', 'Fais 500 collectes', 20000, 80),
  q(5, 'million', 'money_earned', 1000000, 'Millionnaire', 'Gagne 1 000 000 FCFA au total', 30000, 100),
  q(5, 'six_engins', 'vehicles', 6, 'Parc automobile', 'Aie 6 engins', 15000, 60),
  q(5, 'cent_cinquante_engin', 'vehicle_collections', 150, 'Roi de la route', 'Fais 150 collectes en engin', 15000, 60),
  q(5, 'tout_ameliore', 'upgrades', 6, 'Rien à redire', 'Achète toutes les améliorations disponibles', 20000, 80),
  q(5, 'toute_la_ville', 'contracts', 15, 'Toute la ville en parle', 'Signe 15 nouveaux contrats', 15000, 60),
];
