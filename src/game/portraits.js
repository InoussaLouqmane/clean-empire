// Portraits (bustes) livrés dans public/assets/characters/, un par
// expression du script : `karim_<expression>.png` / `joueur_<expression>.png`,
// noms sans accents (voir slug() dans ui/DialogueBox.js). AJOUTER ICI chaque
// fichier livré : seuls ceux listés sont chargés, les autres utilisent le
// repli (karim.png, ou silhouette + initiale pour le joueur) — pas de 404.
//
// Karim : 12 expressions livrées le 2026-09-25 (Downloads/karim_image),
// réduites à 512 px ; fierte et patient recadrés pour que la tête ait la même
// taille que sur les autres.
export const CHAR_DIR = 'assets/characters';

export const AVAILABLE_PORTRAITS = new Set([
  'karim_accueil',
  'karim_encouragement',
  'karim_enthousiasme',
  'karim_fierte',
  'karim_malin',
  'karim_mysterieux',
  'karim_patient',
  'karim_rassurant',
  'karim_realiste',
  'karim_satisfaction',
  'karim_sincere',
  'karim_sourire',
]);

/** Pour le pré-chargement par le menu (game.js → GAME_ASSET_URLS). */
export const PORTRAIT_URLS = [...AVAILABLE_PORTRAITS].map((key) => `${CHAR_DIR}/${key}.png`);
