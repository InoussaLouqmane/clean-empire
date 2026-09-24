// Tous les chiffres de l'économie de CLEAN CEO, au même endroit : les ajuster
// ici suffit, sans toucher à la logique du jeu.
//
// Valeurs validées avec l'utilisateur le 2026-09-24 (roadmap niveau 1) :
// départ à 500 FCFA (et non 0 comme dans le script d'origine, sinon le
// recrutement à 2 000 FCFA est impossible avec 3 restaurants), recollecte
// d'un bâtiment après 30 s, tricycle visible au niveau 1 mais trop cher,
// camion verrouillé jusqu'au niveau 2.

export const ECONOMY = {
  start: {
    money: 500,
    xp: 0,
    workers: 1,
  },

  collection: {
    durationS: 15, // durée d'une collecte sans engin
    reward: { money: 500, xp: 4 }, // restaurant (niveau 1)
    cooldownS: 30, // délai avant de pouvoir recollecter le même bâtiment
    minDurationS: 3, // plancher, même avec tous les engins
  },

  // Coût du n-ième ouvrier (n ≥ 2) : base × multiplicateur^(n − 2)
  // → 2 000, 3 000, 4 500, 6 750…
  worker: {
    baseCost: 2000,
    costMultiplier: 1.5,
  },

  vehicles: {
    tricycle: { label: 'Tricycle', cost: 5000, speedupS: 5, unlockLevel: 1 },
    camion: { label: 'Camion', cost: 50000, speedupS: 10, unlockLevel: 2 },
  },

  // Seuil d'XP pour atteindre le niveau n+1 : xpPerLevel × n (100, 200, 300…).
  // Le niveau 1 se termine par son objectif (tutoriel), pas par l'XP.
  progression: {
    xpPerLevel: 100,
  },

  // Pour les niveaux suivants (pas utilisé au niveau 1).
  contracts: {
    newContract: { money: 1000, xp: 10 },
    maxDelays: 3,
    terminationXpPenalty: 15,
  },
};

/** Coût du prochain ouvrier quand on en possède déjà `owned`. */
export function nextWorkerCost(owned) {
  const n = owned + 1;
  return Math.round(ECONOMY.worker.baseCost * ECONOMY.worker.costMultiplier ** Math.max(0, n - 2));
}

/** Durée d'une collecte (s) selon les engins possédés (le meilleur compte). */
export function collectionDuration(vehicles) {
  let speedup = 0;
  for (const [id, owned] of Object.entries(vehicles)) {
    if (owned) speedup = Math.max(speedup, ECONOMY.vehicles[id]?.speedupS ?? 0);
  }
  return Math.max(ECONOMY.collection.minDurationS, ECONOMY.collection.durationS - speedup);
}

/** Format « 1 500 FCFA ». */
export function formatMoney(amount) {
  return `${Math.round(amount).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
}
