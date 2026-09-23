import Phaser from 'phaser';

// Branché le 2026-09-23 avec l'export Tiled du rôle 5 (Map v3.tmj).
// Voir STATUS.md pour le détail de cette session et le raisonnement complet.
//
// Le fichier .tmj référence un tileset externe (net_empire_demo.tsx) dont les
// images (placeholders générés ailleurs, ex. "L_hopital.png") n'existent pas dans
// ce projet. On ignore volontairement ce tileset : le .tmj est chargé comme une
// simple source de données (grille de tuiles + objets), et GID_TO_TEXTURE /
// OBJECT_NAME_TO_TEXTURE ci-dessous font correspondre chaque tuile/objet Tiled à
// un vrai asset de public/assets/, à la main, une fois pour toutes.
//
// Environ 12 des 32 tuiles du plan Tiled n'ont aucun équivalent réel (herbe
// claire, prairie fleurie, route secondaire, terre battue, canal/eau, boutique,
// maison, maison terracotta, colis, fontaine, étal de marché, cultures) : elles
// utilisent l'asset réel le plus proche disponible plutôt que d'être bloquantes
// (décision validée avec l'utilisateur le 2026-09-23 : "fais le matching au
// mieux"). Cette liste de replis est à revisiter si de vrais assets pour ces
// tuiles arrivent un jour.

export const MAP_JSON_KEY = 'net-empire-map';
const MAP_JSON_PATH = 'maps/net-empire.tmj';

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

const ASSET_PATHS = {
  tile_grass: 'assets/tiles/Isometric Bare Grass Tile — 64×32.png',
  tile_sidewalk: 'assets/tiles/Isometric Sidewalk Tile — 64×32.png',
  tile_road_straight: 'assets/tiles/Route droite isométrique — 64×32.png',
  tile_road_intersection: 'assets/tiles/Intersection isométrique — 64×32.png',
  building_hopital: 'assets/buildings/hopital.png',
  building_marche: 'assets/buildings/marché.png',
  building_depot: 'assets/buildings/Déchetterie.png',
  building_hotel: 'assets/buildings/hotel.png',
  building_cousin: 'assets/buildings/batiment cousin.png',
  building_qg: 'assets/buildings/base-QG.png',
  building_ecole: 'assets/buildings/ecole.png',
  prop_tree: 'assets/props/Decorative Tree — 32×32.png',
  prop_lamp: 'assets/props/Street Lamp — 32×32.png',
  prop_bench: 'assets/props/Bench — 32×32.png',
  prop_poubelle: 'assets/props/Poubelle pleine — 32×32.png',
  char_worker: 'assets/characters/worker_walk_4frames_32x48.png',
  vehicle_tricycle: 'assets/vehicles/tricycle_move_3frames_32x32.png',
  vehicle_camion: 'assets/vehicles/camion_move_3frames_32x32.png',
};

// Taille d'affichage par défaut pour les textures utilisées comme icône dans un
// calque de tuiles (grille 40×30). Les bâtiments "héros" de l'objectgroup
// "Bâtiments du jeu" utilisent plutôt la taille définie dans Tiled (voir plus bas).
const TILE_ICON_SIZE = {
  tile_grass: [TILE_WIDTH, TILE_HEIGHT],
  tile_sidewalk: [TILE_WIDTH, TILE_HEIGHT],
  tile_road_straight: [TILE_WIDTH, TILE_HEIGHT],
  tile_road_intersection: [TILE_WIDTH, TILE_HEIGHT],
  prop_tree: [32, 32],
  prop_lamp: [32, 32],
  prop_bench: [32, 32],
  prop_poubelle: [32, 32],
  building_depot: [56, 56],
  building_marche: [56, 56],
  building_cousin: [56, 56],
  char_worker: [32, 48],
  vehicle_tricycle: [32, 32],
  vehicle_camion: [32, 32],
};

// Frame à cropper pour les sprite-sheets utilisées ici juste comme icône statique
// (pas d'animation pour l'instant — voir STATUS.md).
const TEXTURE_CROP = {
  char_worker: { x: 0, y: 0, width: 508, height: 774 },
  vehicle_tricycle: { x: 0, y: 0, width: 724, height: 724 },
  vehicle_camion: { x: 0, y: 0, width: 724, height: 724 },
};

// "Canal" (eau) n'a aucun asset réel : on réutilise le trottoir teinté avec la
// couleur sarcelle de la palette verrouillée (#1F5E52) pour le distinguer.
const WATER_TINT = 0x1f5e52;

// gid (1 = firstgid du tileset net_empire_demo.tsx) -> clé de texture réelle.
// Un gid absent ou 0 = case vide, rien à dessiner.
const GID_TO_TEXTURE = {
  1: 'tile_grass', // Herbe
  2: 'tile_grass', // Herbe claire -> pas d'équivalent, repli sur Herbe
  3: 'tile_grass', // Prairie fleurie -> pas d'équivalent, repli sur Herbe
  4: 'tile_road_straight', // Route
  5: 'tile_road_straight', // Route secondaire -> pas d'équivalent, repli sur Route
  6: 'tile_sidewalk', // Pavés -> pas d'équivalent exact, repli sur trottoir
  7: 'tile_sidewalk', // Terre battue -> pas d'équivalent, repli sur trottoir
  8: 'tile_water', // Canal -> pas d'équivalent, repli sur trottoir teinté (voir WATER_TINT)
  9: 'building_depot', // Dépôt logistique
  10: 'building_marche', // Boutique -> pas d'équivalent, repli sur Marché
  11: 'building_cousin', // Maison -> pas d'équivalent, repli sur Immeuble de quartier
  12: 'building_cousin', // Maison terracotta -> pas d'équivalent, repli sur Immeuble de quartier
  13: 'prop_tree', // Arbre
  14: 'prop_lamp', // Lampadaire
  15: 'prop_poubelle', // Colis -> pas d'équivalent, repli sur Poubelle
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
  31: 'prop_poubelle', // Poubelle
  32: 'tile_road_intersection', // Carrefour décoratif
};

// Les objets de "Bâtiments du jeu" sont mis en correspondance par NOM plutôt que
// par gid : un des objets ("Poubelle de rue") pointe vers un gid incohérent avec
// son propre nom dans le fichier exporté (gid du "Camion original" au lieu de
// celui de "Poubelle") — le nom, tapé à la main dans Tiled, est plus fiable que
// ce gid-là.
const OBJECT_NAME_TO_TEXTURE = {
  'Hôpital': 'building_hopital',
  'Marché principal': 'building_marche',
  'Centre de recyclage': 'building_depot',
  'Hôtel': 'building_hotel',
  'Immeuble de quartier': 'building_cousin',
  'QG Net Empire': 'building_qg',
  'École': 'building_ecole',
  'Poubelle de rue': 'prop_poubelle',
};

function isoToScreen(col, row) {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2),
  };
}

/** À appeler depuis scene.preload(). Charge le JSON de la carte + tous les assets utilisés. */
export function preload(scene) {
  scene.load.json(MAP_JSON_KEY, MAP_JSON_PATH);

  for (const [key, path] of Object.entries(ASSET_PATHS)) {
    scene.load.image(key, path);
  }
}

/**
 * À appeler depuis scene.create(), une fois preload() terminé. Construit la
 * carte (calques de tuiles + objets) dans `container` et retourne la bounding
 * box écran de la carte entière : { minX, maxX, minY, maxY }.
 */
export function buildMap(scene, container) {
  const mapData = scene.cache.json.get(MAP_JSON_KEY);

  for (const layer of mapData.layers) {
    if (layer.type === 'tilelayer' && layer.visible) {
      buildTileLayer(scene, container, layer);
    } else if (layer.type === 'objectgroup' && layer.visible) {
      buildObjectLayer(scene, container, layer);
    }
  }

  return computeMapBounds(mapData.width, mapData.height);
}

function buildTileLayer(scene, container, layer) {
  for (let row = 0; row < layer.height; row++) {
    for (let col = 0; col < layer.width; col++) {
      const gid = layer.data[row * layer.width + col];
      if (!gid) continue;

      const textureKey = GID_TO_TEXTURE[gid];
      if (!textureKey) continue;

      const { x, y } = isoToScreen(col, row);
      placeTileIcon(scene, container, textureKey, x, y);
    }
  }
}

function placeTileIcon(scene, container, textureKey, x, y) {
  const isWater = textureKey === 'tile_water';
  const realKey = isWater ? 'tile_sidewalk' : textureKey;

  const sprite = scene.add.sprite(x, y, realKey);
  applyCrop(sprite, realKey);

  const [w, h] = TILE_ICON_SIZE[textureKey] ?? [TILE_WIDTH, TILE_HEIGHT];
  sprite.setDisplaySize(w, h);

  if (isWater) sprite.setTint(WATER_TINT);

  container.add(sprite);
}

function buildObjectLayer(scene, container, layer) {
  for (const obj of layer.objects) {
    if (!obj.visible) continue;

    const textureKey = OBJECT_NAME_TO_TEXTURE[obj.name];

    if (!textureKey) {
      // Objet sans image associée (ex. le point "CENTRE DE DISTRIBUTION" du
      // calque "Repères") : marqueur simple plutôt qu'un vrai sprite.
      placeLandmarkMarker(scene, container, obj);
      continue;
    }

    const { x, y } = objectToScreen(obj.x, obj.y);
    const sprite = scene.add.sprite(x, y, textureKey);
    applyCrop(sprite, textureKey);
    sprite.setOrigin(0.5, 1); // le tileset source déclare objectalignment="bottom"
    sprite.setDisplaySize(obj.width, obj.height);
    container.add(sprite);
  }
}

function placeLandmarkMarker(scene, container, obj) {
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

function applyCrop(sprite, textureKey) {
  const crop = TEXTURE_CROP[textureKey];
  if (crop) sprite.setCrop(crop.x, crop.y, crop.width, crop.height);
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

function computeMapBounds(widthInTiles, heightInTiles) {
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
