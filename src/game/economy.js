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

  // Seuil d'XP pour atteindre le niveau n+1 : xpPerLevel × n (100, 200, 300…).
  // Le niveau 1 se termine par son objectif (tutoriel), pas par l'XP.
  progression: {
    xpPerLevel: 100,
  },

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

/** Coût du prochain ouvrier à pied quand on en possède déjà `owned`. */
export function nextWalkerCost(owned) {
  const w = ECONOMY.units.walker;
  const n = owned + 1;
  return Math.round(w.baseCost * w.costMultiplier ** Math.max(0, n - 2));
}

/** Durée (s) d'une collecte chez un client, avec un type d'unité donné. */
export function collectionDuration(client, unitType) {
  const speedup = ECONOMY.units[unitType]?.speedupS ?? 0;
  return Math.max(ECONOMY.collection.minDurationS, client.durationS - speedup);
}

/** Gain net (FCFA) d'une collecte : récompense − carburant de l'unité. */
export function netReward(client, unitType) {
  return client.money - (ECONOMY.units[unitType]?.fuel ?? 0);
}

/** Format « 1 500 FCFA ». */
export function formatMoney(amount) {
  return `${Math.round(amount).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
}
