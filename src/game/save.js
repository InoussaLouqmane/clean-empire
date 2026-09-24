// Sauvegarde de la partie dans le navigateur (localStorage). Module sans
// Phaser : le menu l'importe aussi, pour savoir si « Reprendre partie » doit
// être actif (voir CLAUDE.md : le menu ne doit jamais importer Phaser).
//
// Changer SAVE_KEY si le format change de façon incompatible (même réflexe
// que pour la carte en 2026-09-23) : une vieille sauvegarde est alors ignorée
// au lieu de planter.

// v2 (2026-09-24) : unités de collecte (ouvriers + engins) au lieu d'un
// simple nombre d'ouvriers — les sauvegardes v1 sont ignorées.
export const SAVE_KEY = 'clean-ceo-save-v2';

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadSave() !== null;
}

export function writeSave(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // stockage indisponible : la partie continue, juste pas sauvegardée
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // rien à faire
  }
}
