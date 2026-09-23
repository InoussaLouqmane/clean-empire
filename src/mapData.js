// Format de carte propre à Net Empire, indépendant de Tiled à partir du
// 2026-09-23 (session éditeur). Une carte est :
//   { width, height, layers: { ground, roads, buildings, details } }
// chaque calque étant un tableau 2D [row][col] contenant soit `null`, soit une
// cellule { key, flipX, flipY } (voir makeCell() dans mapLoader.js — flipX/Y
// gèrent l'orientation de la tuile, voir editor/MapEditor.js).
//
// convertTiledToGrid() ne s'exécute qu'une fois, au tout premier chargement
// (tant qu'aucune carte éditée n'est sauvegardée) : c'est la seule partie du
// code qui connaît encore le format Tiled. Toute la suite (rendu, éditeur,
// sauvegarde, export) ne manipule que ce format-ci.

import { makeCell } from './mapLoader.js';
import * as customAssets from './customAssets.js';

export const LAYER_NAMES = ['ground', 'roads', 'buildings', 'details'];

// v2 (2026-09-23) : le format de cellule est passé de "clé de texture en
// chaîne" à { key, flipX, flipY } pour supporter l'orientation des tuiles.
// Changer la clé de stockage plutôt que migrer — une éventuelle sauvegarde v1
// est simplement ignorée, on repart de la conversion Tiled.
export const STORAGE_KEY = 'net-empire-map-v2';

const TILE_HEIGHT = 32; // dupliqué volontairement pour ne pas dépendre de mapLoader.js ici

export function createEmptyGrid(width, height) {
  const layers = {};
  for (const name of LAYER_NAMES) {
    layers[name] = Array.from({ length: height }, () => Array(width).fill(null));
  }
  return { width, height, layers };
}

// gid (1 = firstgid du tileset net_empire_demo.tsx) -> clé de texture réelle.
// Voir STATUS.md (session du 2026-09-23, "fais le matching au mieux") pour le
// raisonnement derrière chaque choix, en particulier les 12 tuiles sans
// équivalent réel qui retombent sur l'asset le plus proche disponible.
const GID_TO_TEXTURE = {
  1: 'tile_grass', // Herbe
  2: 'tile_grass', // Herbe claire -> pas d'équivalent, repli sur Herbe
  3: 'tile_grass', // Prairie fleurie -> pas d'équivalent, repli sur Herbe
  4: 'tile_road_straight', // Route
  5: 'tile_road_straight', // Route secondaire -> pas d'équivalent, repli sur Route
  6: 'tile_sidewalk', // Pavés -> pas d'équivalent exact, repli sur trottoir
  7: 'tile_sidewalk', // Terre battue -> pas d'équivalent, repli sur trottoir
  8: 'tile_water', // Canal -> pas d'équivalent, repli sur trottoir teinté
  9: 'building_depot', // Dépôt logistique
  10: 'building_marche', // Boutique -> pas d'équivalent, repli sur Marché
  11: 'building_cousin', // Maison -> pas d'équivalent, repli sur Immeuble de quartier
  12: 'building_cousin', // Maison terracotta -> pas d'équivalent, repli sur Immeuble de quartier
  13: 'prop_tree', // Arbre
  14: 'prop_lamp', // Lampadaire
  15: 'prop_poubelle_pleine', // Colis -> pas d'équivalent, repli sur Poubelle
  16: 'prop_bench', // Fontaine -> pas d'équivalent, repli sur Banc
  17: 'prop_bench', // Banc
  18: 'char_worker', // Ouvrier (placeholder dans Tiled) -> vrai sprite ouvrier
  19: 'vehicle_tricycle', // Tricycle (placeholder dans Tiled) -> vrai sprite tricycle
  20: 'vehicle_camion', // Camion (placeholder dans Tiled) -> vrai sprite camion
  21: 'building_marche', // Étal de marché -> pas d'équivalent, repli sur Marché
  22: 'prop_tree', // Cultures -> pas d'équivalent, repli sur Arbre
  23: 'building_hopital', // Hôpital
  24: 'building_marche', // Marché
  25: 'building_depot', // Déchetterie
  26: 'building_hotel', // Hôtel
  27: 'building_cousin', // Immeuble de quartier
  28: 'building_qg', // QG Net Empire
  29: 'building_ecole', // École
  30: 'vehicle_camion', // Camion original (Décor)
  31: 'prop_poubelle_pleine', // Poubelle
  32: 'tile_road_intersection', // Carrefour décoratif
};

// Objets de "Bâtiments du jeu" mis en correspondance par NOM plutôt que par gid
// (un objet, "Poubelle de rue", a un gid incohérent avec son propre nom dans le
// fichier exporté — voir STATUS.md).
const OBJECT_NAME_TO_TEXTURE = {
  'Hôpital': 'building_hopital',
  'Marché principal': 'building_marche',
  'Centre de recyclage': 'building_depot',
  'Hôtel': 'building_hotel',
  'Immeuble de quartier': 'building_cousin',
  'QG Net Empire': 'building_qg',
  'École': 'building_ecole',
  'Poubelle de rue': 'prop_poubelle_pleine',
};

const TILED_LAYER_TO_OURS = {
  Ground: 'ground',
  Roads: 'roads',
  Buildings: 'buildings',
  Details: 'details',
};

/** Conversion unique depuis un JSON Tiled brut vers notre format de grille. */
export function convertTiledToGrid(tiledJson) {
  const grid = createEmptyGrid(tiledJson.width, tiledJson.height);

  for (const layer of tiledJson.layers) {
    if (layer.type !== 'tilelayer') continue;
    const target = TILED_LAYER_TO_OURS[layer.name];
    if (!target) continue;

    for (let row = 0; row < layer.height; row++) {
      for (let col = 0; col < layer.width; col++) {
        const gid = layer.data[row * layer.width + col];
        if (!gid) continue;
        const textureKey = GID_TO_TEXTURE[gid];
        if (textureKey) grid.layers[target][row][col] = makeCell(textureKey);
      }
    }
  }

  // Les bâtiments "héros" (objectgroup "Bâtiments du jeu") sont convertis en
  // cellules du calque "buildings", ancrées à la cellule de grille la plus
  // proche de leur point Tiled d'origine — plus de positionnement libre en
  // pixels après cette conversion, tout devient une grille uniforme éditable.
  for (const layer of tiledJson.layers) {
    if (layer.type !== 'objectgroup') continue;
    for (const obj of layer.objects) {
      const textureKey = OBJECT_NAME_TO_TEXTURE[obj.name];
      if (!textureKey) continue;

      const col = Math.round(obj.x / TILE_HEIGHT);
      const row = Math.round(obj.y / TILE_HEIGHT);
      if (row >= 0 && row < grid.height && col >= 0 && col < grid.width) {
        grid.layers.buildings[row][col] = makeCell(textureKey);
      }
    }
  }

  return grid;
}

export function loadSavedGrid() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGrid(grid) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grid));
  } catch {
    // Stockage indisponible (navigation privée, quota dépassé...) : l'édition
    // reste utilisable pour la session en cours, juste pas persistée.
  }
}

export function clearSavedGrid() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // rien à faire si le stockage est indisponible
  }
}

// Embarque les assets personnalisés (voir customAssets.js) dans le fichier
// exporté — sinon réimporter la carte sur un autre navigateur (ou après avoir
// vidé le stockage local) afficherait une texture manquante pour toute tuile
// utilisant un asset personnalisé, sans façon de comprendre pourquoi.
export function exportGridAsFile(grid) {
  const payload = { ...grid, customAssets: customAssets.loadCustomAssets() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'net-empire-map.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Valide et normalise le contenu texte d'un fichier de carte (issu de
 * exportGridAsFile ou modifié à la main). Lève une Error avec un message
 * explicite si le fichier n'a pas la bonne forme, plutôt que de planter plus
 * loin dans le rendu avec une erreur obscure. Retourne { grid, customAssets }
 * — les assets personnalisés embarqués doivent être fusionnés dans le
 * registre local par l'appelant (voir MapScene._importMapFromFile) avant que
 * la grille ne soit affichée, sinon leurs textures seraient manquantes.
 */
export function parseGridFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("ce n'est pas un fichier JSON valide.");
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('format inattendu (pas un objet JSON).');
  }

  const { width, height, layers } = data;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('"width"/"height" manquant(s) ou invalide(s).');
  }
  if (!layers || typeof layers !== 'object') {
    throw new Error('section "layers" manquante.');
  }

  const normalized = createEmptyGrid(width, height);

  for (const name of LAYER_NAMES) {
    const rows = layers[name];
    if (!Array.isArray(rows) || rows.length !== height) {
      throw new Error(`calque "${name}" manquant ou de mauvaise hauteur (attendu ${height} lignes).`);
    }

    for (let row = 0; row < height; row++) {
      const cols = rows[row];
      if (!Array.isArray(cols) || cols.length !== width) {
        throw new Error(`calque "${name}", ligne ${row} : largeur incorrecte (attendu ${width} colonnes).`);
      }

      for (let col = 0; col < width; col++) {
        const cell = cols[col];
        if (cell !== null && (typeof cell !== 'object' || typeof cell.key !== 'string')) {
          throw new Error(`calque "${name}", cellule [${row}][${col}] invalide.`);
        }
        normalized.layers[name][row][col] = cell ? makeCell(cell.key, !!cell.flipX, !!cell.flipY) : null;
      }
    }
  }

  const importedCustomAssets = Array.isArray(data.customAssets)
    ? data.customAssets.filter(
        (a) =>
          a &&
          typeof a.key === 'string' &&
          typeof a.label === 'string' &&
          typeof a.category === 'string' &&
          typeof a.dataUrl === 'string'
      )
    : [];

  return { grid: normalized, customAssets: importedCustomAssets };
}
