// Tous les chiffres de l'économie de CLEAN CEO, au même endroit : les ajuster
// ici suffit, sans toucher à la logique du jeu.
//
// Validé avec l'utilisateur le 2026-09-24 :
// - départ à 500 FCFA ; recollecte d'un bâtiment après 30 s ;
// - UNITÉS DE COLLECTE (refonte niveau 1) : un ouvrier à pied, ou un engin
//   « tout compris » (conducteur inclus). Chaque unité part indépendamment ;
// - engins : usure sur 10 utilisations (jauge « État »), puis panne ;
//   réparation 500 FCFA / 20 s (tricycle), 1 000 FCFA / 30 s (camion) ;
// - carburant déduit du gain de chaque collecte faite avec un engin.

export const ECONOMY = {
  start: {
    money: 500,
    xp: 0,
    walkers: 1, // ouvriers à pied au départ
  },

  collection: {
    cooldownS: 30, // délai avant de pouvoir recollecter le même bâtiment
    minDurationS: 3, // plancher, même avec le meilleur engin
  },

  units: {
    // Ouvrier à pied : coût du n-ième (n ≥ 2) = baseCost × multiplicateur^(n − 2)
    // → 2 000, 3 000, 4 500…
    walker: { label: 'Ouvrier', baseCost: 2000, costMultiplier: 1.5, speedupS: 0, fuel: 0 },
    tricycle: {
      label: 'Tricycle',
      cost: 5000, // conducteur inclus
      speedupS: 5,
      fuel: 50, // montant validé le 2026-09-24
      maxUses: 10, // utilisations avant panne
      repairCost: 500,
      repairS: 20,
      unlockLevel: 1,
    },
    camion: {
      label: 'Camion',
      cost: 50000, // conducteur inclus
      speedupS: 10,
      fuel: 150, // montant validé le 2026-09-24
      maxUses: 10,
      repairCost: 1000,
      repairS: 30,
      unlockLevel: 2,
    },
  },

  // XP à gagner PENDANT le niveau n pour passer au niveau n+1 : xpPerLevel × n
  // (100, 200, 300…), soit un total de 100 XP pour le niveau 2, 300 pour le 3,
  // 600 pour le 4… Activé le 2026-09-25.
  // Le niveau 1 se termine par son OBJECTIF (tutoriel), pas par l'XP : à ce
  // moment, un bonus de fin de niveau complète l'XP jusqu'au seuil du niveau 2
  // (option A validée par l'utilisateur le 2026-09-25 — sinon la jauge disait
  // « Niv. 1, 12 % » sur l'écran « Niveau 1 terminé »).
  progression: {
    xpPerLevel: 100,
  },

  // Améliorations permanentes (onglet « Améliorations » de la boutique) :
  // achat unique. `effect` est lu par modifiers() ci-dessous — ne jamais
  // appliquer un effet ailleurs. `comingSoon` : affichée mais pas achetable
  // (mécanique pas encore dans le jeu).
  upgrades: {
    chariots: { label: 'Chariots à roulettes', desc: 'Collecte à pied −3 s', icon: 'worker', cost: 3000, unlockLevel: 1, effect: { walkerSpeedupS: 3 } },
    sacs: { label: 'Sacs grande capacité', desc: '+10 % de gain par collecte', icon: 'coin', cost: 4000, unlockLevel: 1, effect: { rewardMult: 1.1 } },
    tournees: { label: 'Tournées optimisées', desc: 'Déchets prêts plus vite : 30 s → 24 s', icon: 'clock', cost: 5000, unlockLevel: 1, effect: { cooldownS: 24 } },
    carburant: { label: 'Carburant négocié', desc: '−40 % de carburant par collecte en engin', icon: 'leaf', cost: 3500, unlockLevel: 2, effect: { fuelMult: 0.6 } },
    atelier: { label: 'Atelier mécanique', desc: 'Engins : 15 utilisations avant panne, réparation 2× plus rapide', icon: 'gear', cost: 8000, unlockLevel: 2, effect: { maxUsesBonus: 5, repairTimeMult: 0.5 } },
    formation: { label: 'Formation des équipes', desc: '+2 XP par collecte', icon: 'star', cost: 6000, unlockLevel: 2, effect: { xpBonus: 2 } },
    bennes: { label: 'Bennes de quartier', desc: 'Plus de déchets stockés avant saturation — arrive avec la gestion des retards', icon: 'lock', cost: null, unlockLevel: 3, comingSoon: true, effect: {} },
  },

  // Boutique premium (argent RÉEL, simulée : l'achat affiche « Arrive
  // bientôt »). Prix en XOF pour ne pas confondre avec les FCFA du jeu.
  premium: [
    { id: 'coup_de_pouce', label: 'Coup de pouce', contents: ['+10 000 FCFA en jeu', 'Formation des équipes offerte'], priceXOF: 200 },
    { id: 'entrepreneur', label: 'Pack Entrepreneur', tag: 'Populaire', contents: ['+30 000 FCFA en jeu', '1 ouvrier offert', '1 tricycle offert'], priceXOF: 1000 },
    { id: 'ceo', label: 'Pack CEO', tag: 'Meilleure offre', contents: ['1 camion offert', 'Atelier mécanique offert', 'Gains ×2 pendant 30 min'], priceXOF: 2500 },
  ],

  // Clients possibles par type de bâtiment : gain, XP, durée de base (à pied).
  // Au niveau 1, seuls les 3 restaurants du tutoriel sont sous contrat ; les
  // autres affichent ces valeurs, verrouillées.
  clients: {
    building_restaurant: { type: 'Restaurant', money: 500, xp: 4, durationS: 15, unlockLevel: 1 },
    building_cousin: { type: 'Immeuble', money: 300, xp: 2, durationS: 12, unlockLevel: 2 },
    building_ecole: { type: 'École', money: 600, xp: 5, durationS: 20, unlockLevel: 2 },
    building_marche: { type: 'Marché', money: 700, xp: 5, durationS: 20, unlockLevel: 2 },
    building_hotel: { type: 'Hôtel', money: 800, xp: 6, durationS: 25, unlockLevel: 2 },
    building_cinema: { type: 'Cinéma', money: 900, xp: 7, durationS: 25, unlockLevel: 3 },
    building_hopital: { type: 'Hôpital', money: 1000, xp: 8, durationS: 30, unlockLevel: 3 },
  },

  // Pour les niveaux suivants (pas utilisé au niveau 1).
  contracts: {
    newContract: { money: 1000, xp: 10 },
    maxDelays: 3,
    terminationXpPenalty: 15,
  },
};

export const VEHICLE_TYPES = ['tricycle', 'camion'];

/** Niveau atteint avec `xp` au total, et bornes d'XP du niveau (pour la jauge). */
export function levelInfo(xp) {
  const per = ECONOMY.progression.xpPerLevel;
  let level = 1;
  let floor = 0;
  while (xp >= floor + per * level) {
    floor += per * level;
    level += 1;
  }
  return { level, floor, next: floor + per * level };
}

/** Effets cumulés des améliorations possédées (liste d'ids). */
export function modifiers(owned = []) {
  const m = { walkerSpeedupS: 0, rewardMult: 1, cooldownS: ECONOMY.collection.cooldownS, fuelMult: 1, maxUsesBonus: 0, repairTimeMult: 1, xpBonus: 0 };
  for (const id of owned) {
    const e = ECONOMY.upgrades[id]?.effect ?? {};
    m.walkerSpeedupS += e.walkerSpeedupS ?? 0;
    m.rewardMult *= e.rewardMult ?? 1;
    if (e.cooldownS) m.cooldownS = Math.min(m.cooldownS, e.cooldownS);
    m.fuelMult *= e.fuelMult ?? 1;
    m.maxUsesBonus += e.maxUsesBonus ?? 0;
    m.repairTimeMult *= e.repairTimeMult ?? 1;
    m.xpBonus += e.xpBonus ?? 0;
  }
  return m;
}

/** Coût du prochain ouvrier à pied quand on en possède déjà `owned`. */
export function nextWalkerCost(owned) {
  const w = ECONOMY.units.walker;
  const n = owned + 1;
  return Math.round(w.baseCost * w.costMultiplier ** Math.max(0, n - 2));
}

/** Durée (s) d'une collecte chez un client, avec un type d'unité donné. */
export function collectionDuration(client, unitType, mods = modifiers()) {
  const speedup = (ECONOMY.units[unitType]?.speedupS ?? 0) + (unitType === 'walker' ? mods.walkerSpeedupS : 0);
  return Math.max(ECONOMY.collection.minDurationS, client.durationS - speedup);
}

/** Récompense d'une collecte : { money (net), xp, fuel }, améliorations comprises. */
export function collectionReward(client, unitType, mods = modifiers()) {
  const fuel = Math.round((ECONOMY.units[unitType]?.fuel ?? 0) * mods.fuelMult);
  return { money: Math.round(client.money * mods.rewardMult) - fuel, xp: client.xp + mods.xpBonus, fuel };
}

/** Gain net (FCFA) d'une collecte : récompense − carburant de l'unité. */
export function netReward(client, unitType, mods = modifiers()) {
  return collectionReward(client, unitType, mods).money;
}

/** Format « 1 500 FCFA ». */
export function formatMoney(amount) {
  return `${Math.round(amount).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
}
