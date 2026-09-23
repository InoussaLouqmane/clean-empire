import Phaser from 'phaser';
import * as customAssets from './customAssets.js';

// Depuis le 2026-09-23 (session éditeur), ce module ne connaît plus le format
// Tiled directement : il travaille sur le format de carte propre à Net Empire
// défini dans mapData.js (grille de clés de texture, indépendante de tout gid).
// La conversion depuis l'export Tiled ne se fait qu'une fois, voir
// mapData.convertTiledToGrid(). Ce module reste responsable du chargement des
// assets et du rendu (placement des sprites), utilisé aussi bien pour l'affichage
// initial que par l'éditeur en direct (voir editor/MapEditor.js).

export const MAP_JSON_KEY = 'net-empire-map';
export const MAP_JSON_PATH = 'maps/net-empire.tmj';

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

export const LAYER_NAMES = ['ground', 'roads', 'buildings', 'details'];

export const ASSET_PATHS = {
  tile_grass: 'assets/tiles/Isometric Bare Grass Tile — 64×32.png',
  tile_sidewalk: 'assets/tiles/Isometric Sidewalk Tile — 64×32.png',
  tile_road_straight: 'assets/tiles/Route droite isométrique — 64×32.png',
  tile_road_corner: 'assets/tiles/Route en angle isométrique — 64×32.png',
  tile_road_intersection: 'assets/tiles/Intersection isométrique — 64×32.png',
  building_hopital: 'assets/buildings/hopital.png',
  building_marche: 'assets/buildings/marché.png',
  building_depot: 'assets/buildings/Déchetterie.png',
  building_hotel: 'assets/buildings/hotel.png',
  building_cousin: 'assets/buildings/batiment cousin.png',
  building_qg: 'assets/buildings/base-QG.png',
  building_ecole: 'assets/buildings/ecole.png',
  building_cinema: 'assets/buildings/cinema.png',
  building_restaurant: 'assets/buildings/restaurant.png',
  prop_tree: 'assets/props/Decorative Tree — 32×32.png',
  prop_lamp: 'assets/props/Street Lamp — 32×32.png',
  prop_bench: 'assets/props/Bench — 32×32.png',
  prop_poubelle_vide: 'assets/props/Poubelle vide — 32×32.png',
  prop_poubelle_pleine: 'assets/props/Poubelle pleine — 32×32.png',
  prop_poubelle_debordante: 'assets/props/Poubelle débordante — 32×32.png',
  char_worker: 'assets/characters/worker_walk_4frames_32x48.png',
  vehicle_tricycle: 'assets/vehicles/tricycle_move_3frames_32x32.png',
  vehicle_camion: 'assets/vehicles/camion_move_3frames_32x32.png',
};

// "Canal" (eau) n'a aucun asset réel : on réutilise le trottoir teinté avec la
// couleur sarcelle de la palette verrouillée (#1F5E52) pour le distinguer.
// Ce n'est pas une entrée d'ASSET_PATHS (rien à charger), juste un choix
// disponible dans la palette de l'éditeur.
export const WATER_TINT = 0x1f5e52;

// Frame à cropper pour les sprite-sheets utilisées ici juste comme icône statique
// (pas d'animation pour l'instant — voir STATUS.md).
const TEXTURE_CROP = {
  char_worker: { x: 0, y: 0, width: 508, height: 774 },
  vehicle_tricycle: { x: 0, y: 0, width: 724, height: 724 },
  vehicle_camion: { x: 0, y: 0, width: 724, height: 724 },
};

// Palette affichée dans l'éditeur (voir editor/EditorPanel.js), une liste
// d'assets par calque éditable — la palette flottante n'affiche que les
// assets pertinents pour le calque actuellement actif (décision utilisateur
// du 2026-09-23 : filtrer plutôt que tout montrer tout le temps). "details"
// est le calque fourre-tout (décor + personnages/véhicules).
export const LAYER_PALETTE = {
  ground: [
    { key: 'tile_grass', label: 'Herbe' },
    { key: 'tile_sidewalk', label: 'Trottoir' },
    { key: 'tile_water', label: 'Eau (repli teinté)' },
  ],
  roads: [
    { key: 'tile_road_straight', label: 'Route droite' },
    { key: 'tile_road_corner', label: 'Route en angle' },
    { key: 'tile_road_intersection', label: 'Intersection' },
  ],
  buildings: [
    { key: 'building_qg', label: 'QG' },
    { key: 'building_depot', label: 'Dépôt' },
    { key: 'building_hopital', label: 'Hôpital' },
    { key: 'building_marche', label: 'Marché' },
    { key: 'building_hotel', label: 'Hôtel' },
    { key: 'building_ecole', label: 'École' },
    { key: 'building_cousin', label: 'Immeuble de quartier' },
    { key: 'building_cinema', label: 'Cinéma' },
    { key: 'building_restaurant', label: 'Restaurant' },
  ],
  details: [
    { key: 'prop_tree', label: 'Arbre' },
    { key: 'prop_lamp', label: 'Lampadaire' },
    { key: 'prop_bench', label: 'Banc' },
    { key: 'prop_poubelle_vide', label: 'Poubelle vide' },
    { key: 'prop_poubelle_pleine', label: 'Poubelle pleine' },
    { key: 'prop_poubelle_debordante', label: 'Poubelle débordante' },
    { key: 'char_worker', label: 'Ouvrier' },
    { key: 'vehicle_tricycle', label: 'Tricycle' },
    { key: 'vehicle_camion', label: 'Camion' },
  ],
};

/** À appeler depuis scene.preload(). Charge le JSON Tiled (pour la conversion
 * initiale, voir mapData.js) + tous les assets réels utilisés dans le jeu +
 * les assets personnalisés déjà enregistrés par l'utilisateur (voir
 * customAssets.js et editor/AddAssetModal.js). */
export function preload(scene) {
  scene.load.json(MAP_JSON_KEY, MAP_JSON_PATH);

  for (const [key, path] of Object.entries(ASSET_PATHS)) {
    scene.load.image(key, path);
  }

  for (const asset of customAssets.loadCustomAssets()) {
    scene.load.image(asset.key, asset.dataUrl);
  }
}

export function getRawTiledJson(scene) {
  return scene.cache.json.get(MAP_JSON_KEY);
}

export function isoToScreen(col, row) {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2),
  };
}

/** Inverse de isoToScreen : position monde -> cellule de grille la plus proche. */
export function screenToIso(x, y) {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const col = (x / hw + y / hh) / 2;
  const row = (y / hh - x / hw) / 2;
  return { col: Math.round(col), row: Math.round(row) };
}

export function computeMapBounds(widthInTiles, heightInTiles) {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const corners = [
    isoToScreen(0, 0),
    isoToScreen(widthInTiles - 1, 0),
    isoToScreen(0, heightInTiles - 1),
    isoToScreen(widthInTiles - 1, heightInTiles - 1),
  ];
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);

  return {
    minX: Math.min(...xs) - hw,
    maxX: Math.max(...xs) + hw,
    minY: Math.min(...ys) - hh,
    maxY: Math.max(...ys) + hh,
  };
}

/** Taille d'affichage par défaut d'une texture. Pour un asset personnalisé,
 * dépend de la catégorie choisie dans le popup d'ajout (voir customAssets.js) ;
 * pour un asset intégré, selon son préfixe de clé. */
function defaultDisplaySize(textureKey) {
  if (textureKey.startsWith('custom_')) {
    const entry = customAssets.loadCustomAssets().find((a) => a.key === textureKey);
    if (entry) return customAssets.CATEGORY_DISPLAY_SIZE[entry.category] ?? [TILE_WIDTH, TILE_HEIGHT];
    return [TILE_WIDTH, TILE_HEIGHT];
  }
  if (textureKey.startsWith('tile_')) return [TILE_WIDTH, TILE_HEIGHT];
  if (textureKey.startsWith('building_')) return [72, 72];
  if (textureKey.startsWith('prop_')) return [32, 32];
  if (textureKey === 'char_worker') return [32, 48];
  if (textureKey.startsWith('vehicle_')) return [32, 32];
  return [TILE_WIDTH, TILE_HEIGHT];
}

/** Palette d'un calque : ses assets intégrés (LAYER_PALETTE) + les assets
 * personnalisés que l'utilisateur a assignés à cette catégorie, avec le
 * chemin d'image déjà résolu (fichier du projet ou data URL) pour que
 * l'éditeur n'ait pas besoin de connaître la différence. */
export function getPaletteForLayer(layerName) {
  const builtIn = (LAYER_PALETTE[layerName] ?? []).map((item) => ({
    key: item.key,
    label: item.label,
    path: ASSET_PATHS[item.key],
  }));

  const custom = customAssets
    .loadCustomAssets()
    .filter((a) => a.category === layerName)
    .map((a) => ({ key: a.key, label: a.label, path: a.dataUrl }));

  return [...builtIn, ...custom];
}

function applyCrop(sprite, textureKey) {
  const crop = TEXTURE_CROP[textureKey];
  if (crop) sprite.setCrop(crop.x, crop.y, crop.width, crop.height);
}

/** Structure { layerName: [row][col] -> sprite | null }, un par cellule éditable. */
export function createSpriteGrid(width, height) {
  const grid = {};
  for (const name of LAYER_NAMES) {
    grid[name] = Array.from({ length: height }, () => Array(width).fill(null));
  }
  return grid;
}

/** Détruit tous les sprites de `spriteGrid` et remet chaque cellule à null. */
export function clearSpriteGrid(spriteGrid) {
  for (const layerName of Object.keys(spriteGrid)) {
    for (const row of spriteGrid[layerName]) {
      for (let col = 0; col < row.length; col++) {
        if (row[col]) {
          row[col].destroy();
          row[col] = null;
        }
      }
    }
  }
}

// Une cellule de grille est soit `null` (vide), soit { key, flipX, flipY }.
// flipX/flipY permettent d'orienter une tuile sans avoir besoin de 4 images
// tournées séparément — voir cycleOrientation() dans editor/MapEditor.js. Ce
// n'est PAS une vraie rotation à 90° (qui déformerait le losange 64×32
// isométrique), seulement jusqu'à 4 combinaisons de miroirs.
export function makeCell(key, flipX = false, flipY = false) {
  return key ? { key, flipX, flipY } : null;
}

export function cellsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.key === b.key && !!a.flipX === !!b.flipX && !!a.flipY === !!b.flipY;
}

/** Cycle à 4 états (normal -> miroir X -> miroir Y -> les deux -> normal),
 * utilisé aussi bien pour le pinceau de la palette que pour une tuile déjà
 * posée qu'on sélectionne (voir editor/MapEditor.js). */
export function nextOrientation(flipX, flipY) {
  if (!flipX && !flipY) return { flipX: true, flipY: false };
  if (flipX && !flipY) return { flipX: false, flipY: true };
  if (!flipX && flipY) return { flipX: true, flipY: true };
  return { flipX: false, flipY: false };
}

/**
 * Place/remplace/retire une tuile à (col,row) sur `layerName`. `cell` à
 * `null` efface la cellule. Fonction unique utilisée aussi bien pour le rendu
 * initial (buildFromGrid) que par l'éditeur en direct.
 */
export function placeTileAt(scene, container, spriteGrid, layerName, col, row, cell) {
  const existing = spriteGrid[layerName]?.[row]?.[col];
  if (existing) {
    existing.destroy();
    spriteGrid[layerName][row][col] = null;
  }
  if (!cell) return;

  const textureKey = cell.key;
  const isWater = textureKey === 'tile_water';
  const realKey = isWater ? 'tile_sidewalk' : textureKey;
  const { x, y } = isoToScreen(col, row);

  const sprite = scene.add.sprite(x, y, realKey);
  applyCrop(sprite, realKey);

  const [w, h] = defaultDisplaySize(textureKey);
  sprite.setDisplaySize(w, h);
  sprite.setFlipX(!!cell.flipX);
  sprite.setFlipY(!!cell.flipY);

  if (isWater) sprite.setTint(WATER_TINT);

  container.add(sprite);
  spriteGrid[layerName][row][col] = sprite;
}

/** Construit tous les sprites initiaux à partir d'une carte au format Net Empire. */
export function buildFromGrid(scene, container, spriteGrid, gridData) {
  for (const layerName of Object.keys(gridData.layers)) {
    const rows = gridData.layers[layerName];
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < rows[row].length; col++) {
        const cell = rows[row][col];
        if (cell) placeTileAt(scene, container, spriteGrid, layerName, col, row, cell);
      }
    }
  }
}

// Les coordonnées d'objets Tiled sur une carte isométrique sont exprimées dans un
// espace pixel où x et y sont TOUS LES DEUX divisés par tileHeight (pas
// tileWidth) pour retrouver une position de grille fractionnaire, avant
// application de la même projection iso que les calques de tuiles. C'est la
// convention du renderer isométrique de Tiled lui-même.
function objectToScreen(objX, objY) {
  const col = objX / TILE_HEIGHT;
  const row = objY / TILE_HEIGHT;
  return isoToScreen(col, row);
}

/** Affiche les objets sans image du calque "Repères" (ex. CENTRE DE
 * DISTRIBUTION) en marqueurs statiques. Ne fait pas partie de la grille
 * éditable — lu directement depuis le JSON Tiled d'origine. */
export function placeLandmarks(scene, container, tiledJson) {
  const landmarks = tiledJson.layers.find((l) => l.type === 'objectgroup' && l.name === 'Repères');
  if (!landmarks) return;

  for (const obj of landmarks.objects) {
    if (!obj.visible) continue;
    const { x, y } = objectToScreen(obj.x, obj.y);

    const marker = scene.add.circle(x, y, 6, 0xc79a3b).setStrokeStyle(2, 0x1b1712);
    const label = scene.add
      .text(x, y - 14, obj.name, {
        fontSize: '12px',
        color: '#f1e9d2',
        backgroundColor: '#1b1712',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1);

    container.add(marker);
    container.add(label);
  }
}
