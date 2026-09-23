// Assets personnalisés ajoutés par l'utilisateur (popup "Ajouter un asset",
// voir editor/AddAssetModal.js) — stockés en base64 dans le navigateur
// (localStorage), pas de serveur ni de dossier de fichiers : ce projet est un
// site statique, il n'y a nulle part côté serveur où écrire un fichier.
//
// Chaque entrée : { key, label, category, dataUrl }
// - key : identifiant unique généré (custom_<timestamp>_<aléatoire>)
// - category : un des 4 calques (ground/roads/buildings/details), détermine
//   à la fois dans quelle palette l'asset apparaît ET sa taille d'affichage
//   par défaut (voir CATEGORY_DISPLAY_SIZE)
// - dataUrl : l'image encodée en base64 (data:image/...;base64,...)
//
// Limite volontaire : pas de vraie gestion de gros volumes (localStorage est
// limité à quelques Mo selon le navigateur) — voir MAX_FILE_SIZE_BYTES, une
// image trop lourde est refusée avec un message clair plutôt que d'échouer
// silencieusement plus tard.

export const STORAGE_KEY = 'net-empire-custom-assets-v1';

export const MAX_FILE_SIZE_BYTES = 1.5 * 1024 * 1024; // 1,5 Mo

export const CATEGORY_LABELS = {
  ground: 'Sol',
  roads: 'Routes',
  buildings: 'Bâtiments',
  details: 'Détails',
};

// Taille d'affichage par défaut selon la catégorie choisie dans le popup —
// même convention que defaultDisplaySize() dans mapLoader.js pour les assets
// intégrés au projet.
export const CATEGORY_DISPLAY_SIZE = {
  ground: [64, 32],
  roads: [64, 32],
  buildings: [72, 72],
  details: [32, 32],
};

export function loadCustomAssets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomAssets(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Stockage indisponible ou quota dépassé (des data URLs base64 peuvent
    // être volumineuses) — l'asset reste utilisable pour la session en cours
    // via le cache de textures Phaser, juste pas persisté.
  }
}

function makeKey() {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Enregistre un nouvel asset personnalisé et retourne son entrée complète
 * (avec la clé générée). Ne charge pas la texture dans Phaser — voir
 * MapScene._loadCustomAssetRuntime(). */
export function addCustomAsset({ label, category, dataUrl }) {
  const list = loadCustomAssets();
  const entry = { key: makeKey(), label, category, dataUrl };
  list.push(entry);
  saveCustomAssets(list);
  return entry;
}

/** Fusionne des entrées importées (depuis un fichier de carte exporté) dans
 * le registre local, sans dupliquer une clé déjà connue. */
export function mergeCustomAssets(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const list = loadCustomAssets();
  const existingKeys = new Set(list.map((a) => a.key));
  const added = [];

  for (const entry of entries) {
    if (
      entry &&
      typeof entry.key === 'string' &&
      typeof entry.label === 'string' &&
      typeof entry.category === 'string' &&
      typeof entry.dataUrl === 'string' &&
      !existingKeys.has(entry.key)
    ) {
      list.push(entry);
      existingKeys.add(entry.key);
      added.push(entry);
    }
  }

  if (added.length > 0) saveCustomAssets(list);
  return added;
}
