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

// Bâtiments : copies réduites à 288 px (public/assets/buildings-web/, ~640 Ko au
// total) au lieu des originaux 1536×1024 (public/assets/buildings/, ~13 Mo),
// affichés de toute façon en 72 px — voir STATUS.md du 2026-09-24. Les
// originaux sont gardés tels quels pour une future version HD.
export const ASSET_PATHS = {
  tile_grass: 'assets/tiles/Isometric Bare Grass Tile — 64×32.png',
  tile_sidewalk: 'assets/tiles/Isometric Sidewalk Tile — 64×32.png',
  tile_road_straight: 'assets/tiles/Route droite isométrique — 64×32.png',
  tile_road_corner: 'assets/tiles/Route en angle isométrique — 64×32.png',
  tile_road_intersection: 'assets/tiles/Intersection isométrique — 64×32.png',
  building_hopital: 'assets/buildings-web/hopital.png',
  building_marche: 'assets/buildings-web/marché.png',
  building_depot: 'assets/buildings-web/Déchetterie.png',
  building_hotel: 'assets/buildings-web/hotel.png',
  building_cousin: 'assets/buildings-web/batiment cousin.png',
  building_qg: 'assets/buildings-web/base-QG.png',
  building_ecole: 'assets/buildings-web/ecole.png',
  building_cinema: 'assets/buildings-web/cinema.png',
  building_restaurant: 'assets/buildings-web/restaurant.png',
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

// Décor hors zone (voir mapDecor.js) : nuages dessinés fournis par
// l'utilisateur le 2026-09-24 (recadrés et réduits à 512 px de large).
export const DECOR_ASSET_PATHS = {
  decor_cloud_1: 'assets/decor/cloud_1.png',
  decor_cloud_2: 'assets/decor/cloud_2.png',
  decor_cloud_3: 'assets/decor/cloud_3.png',
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

  for (const [key, path] of Object.entries({ ...ASSET_PATHS, ...DECOR_ASSET_PATHS })) {
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

// ------------------------------------------------------------------------
// Ordre d'affichage (profondeur) — corrigé le 2026-09-24.
//
// Avant : chaque sprite était ajouté à la fin d'un Container, donc tout ce
// qui était posé en dernier passait devant tout le reste (ex. de l'herbe
// repeinte à côté d'un bâtiment le recouvrait). Maintenant chaque sprite est
// posé directement dans la scène avec une profondeur calculée :
// - les calques plats (sol, routes) sont toujours sous tout le reste ;
// - les éléments "debout" (bâtiments, décor, personnages) sont triés selon
//   col + row : plus un objet est bas à l'écran, plus il passe devant.
export const DEPTH = {
  OUTSIDE_GROUND: -300000, // sol décoratif hors zone (voir mapDecor.js)
  GROUND: -200000,
  ROADS: -150000,
  ZONE_OUTLINE: -100000, // liseré de la zone jouable (voir mapDecor.js)
  MOVING: 900000, // sprite en cours de déplacement dans l'éditeur
  CLOUDS: 1000000,
};

const FLAT_LAYERS = new Set(['ground', 'roads']);

/** Profondeur d'un élément de la carte à (col, row) sur `layerName`. */
export function depthFor(layerName, col, row) {
  if (layerName === 'ground') return DEPTH.GROUND;
  if (layerName === 'roads') return DEPTH.ROADS;
  // ×10 pour laisser de la place à un départage entre calques sur une même case
  return (col + row) * 10 + (layerName === 'details' ? 1 : 0);
}

// Les images "debout" ont ~10 % de marge transparente en bas (mesuré sur les
// assets) : on les ancre à 90 % de leur hauteur pour que leur base touche le sol.
const UPRIGHT_ORIGIN_Y = 0.9;
// Décalage vertical du point d'ancrage depuis le centre de la case : les
// bâtiments sont posés vers l'avant de leur case, le petit décor au centre.
const BUILDING_ANCHOR_DY = 10;
const PROP_ANCHOR_DY = 5;

/** Largeur d'affichage des éléments debout (la hauteur suit les proportions
 * réelles de l'image — avant, tout était forcé en carré et les bâtiments
 * 3:2 étaient écrasés). */
function uprightWidth(textureKey) {
  if (textureKey.startsWith('custom_')) {
    const entry = customAssets.loadCustomAssets().find((a) => a.key === textureKey);
    const [w] = customAssets.CATEGORY_DISPLAY_SIZE[entry?.category] ?? [32];
    return w;
  }
  if (textureKey.startsWith('building_')) return 84;
  if (textureKey.startsWith('vehicle_')) return 36;
  return 32; // props, ouvrier
}

function isBuildingLike(textureKey) {
  if (textureKey.startsWith('building_')) return true;
  if (!textureKey.startsWith('custom_')) return false;
  return customAssets.loadCustomAssets().find((a) => a.key === textureKey)?.category === 'buildings';
}

// Légères variations de teinte de l'herbe, pour casser l'effet "carrelage"
// d'une seule tuile répétée. Déterministe (dépend de col/row) : la carte a
// toujours le même aspect d'un chargement à l'autre.
const GRASS_TINTS = [0xffffff, 0xf8faf3, 0xf3f6ec, 0xfdfaf1, 0xf5f8ef];

export function grassTintAt(col, row) {
  const h = Math.imul(col * 73856093 ^ row * 19349663, 0x5bd1e995) >>> 0;
  return GRASS_TINTS[h % GRASS_TINTS.length];
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

/** Structure { layerName: [row][col] -> sprite | null }, un par cellule
 * éditable, + `hiddenLayers` (calques masqués via la case Vue de l'éditeur). */
export function createSpriteGrid(width, height) {
  const grid = { hiddenLayers: new Set() };
  for (const name of LAYER_NAMES) {
    grid[name] = Array.from({ length: height }, () => Array(width).fill(null));
  }
  return grid;
}

/** Détruit tous les sprites de `spriteGrid` et remet chaque cellule à null. */
export function clearSpriteGrid(spriteGrid) {
  for (const layerName of LAYER_NAMES) {
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
export function placeTileAt(scene, spriteGrid, layerName, col, row, cell) {
  const existing = spriteGrid[layerName]?.[row]?.[col];
  // Un calque masqué (case "Vue" de l'éditeur) doit le rester même quand on
  // y pose une nouvelle tuile.
  const visible = !spriteGrid.hiddenLayers.has(layerName);
  if (existing) {
    existing.destroy();
    spriteGrid[layerName][row][col] = null;
  }
  if (!cell) return;

  const sprite = createCellSprite(scene, layerName, col, row, cell);
  sprite.setVisible(visible);
  spriteGrid[layerName][row][col] = sprite;
}

/**
 * Crée le sprite d'une cellule { key, flipX, flipY } à (col, row), avec sa
 * taille, son ancrage au sol et sa profondeur. Réutilisé par mapDecor.js pour
 * le décor hors zone (arbres de bordure).
 * `sprite.getData('anchorDy')` = écart vertical entre la position du sprite et
 * le centre de sa case (utile pour caler le cadre de sélection de l'éditeur).
 */
export function createCellSprite(scene, layerName, col, row, cell) {
  const textureKey = cell.key;
  const isWater = textureKey === 'tile_water';
  const realKey = isWater ? 'tile_sidewalk' : textureKey;
  const { x, y } = isoToScreen(col, row);

  const sprite = scene.add.sprite(x, y, realKey);
  applyCrop(sprite, realKey);
  sprite.setFlipX(!!cell.flipX);
  sprite.setFlipY(!!cell.flipY);
  sprite.setDepth(depthFor(layerName, col, row));

  if (FLAT_LAYERS.has(layerName)) {
    sprite.setDisplaySize(TILE_WIDTH, TILE_HEIGHT);
    sprite.setData('anchorDy', 0);
    if (isWater) sprite.setTint(WATER_TINT);
    else if (textureKey === 'tile_grass') sprite.setTint(grassTintAt(col, row));
    return sprite;
  }

  const crop = TEXTURE_CROP[realKey];
  const frame = scene.textures.getFrame(realKey);
  const srcW = crop?.width ?? frame?.width ?? 1;
  // Échelle calculée sur la zone visible : setDisplaySize() se base sur la
  // texture ENTIÈRE, ce qui rendait les sprite-sheets (ouvrier, tricycle,
  // camion) 3 à 4 fois trop petits une fois croppés.
  sprite.setScale(uprightWidth(textureKey) / srcW);

  // setCrop travaille en coordonnées de texture : l'origine doit être
  // calculée sur la zone croppée (sprite-sheets), pas sur toute l'image.
  if (crop) {
    sprite.setOrigin(
      (crop.x + crop.width / 2) / frame.width,
      (crop.y + crop.height * UPRIGHT_ORIGIN_Y) / frame.height
    );
  } else {
    sprite.setOrigin(0.5, UPRIGHT_ORIGIN_Y);
  }

  const anchorDy = isBuildingLike(textureKey) ? BUILDING_ANCHOR_DY : PROP_ANCHOR_DY;
  sprite.y = y + anchorDy;
  sprite.setData('anchorDy', anchorDy);
  return sprite;
}

/** Construit tous les sprites initiaux à partir d'une carte au format Net Empire. */
export function buildFromGrid(scene, spriteGrid, gridData) {
  for (const layerName of Object.keys(gridData.layers)) {
    const rows = gridData.layers[layerName];
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < rows[row].length; col++) {
        const cell = rows[row][col];
        if (cell) placeTileAt(scene, spriteGrid, layerName, col, row, cell);
      }
    }
  }
}
