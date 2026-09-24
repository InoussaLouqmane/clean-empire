import Phaser from 'phaser';
import {
  TILE_WIDTH,
  TILE_HEIGHT,
  DEPTH,
  isoToScreen,
  computeMapBounds,
  createCellSprite,
  makeCell,
} from './mapLoader.js';

// Décor HORS de la zone jouable (ajouté le 2026-09-24, demande utilisateur :
// "on ne doit plus avoir de noir", l'horizon doit sembler continuer).
// Rien ici ne fait partie de la carte éditable ni de la sauvegarde : c'est
// purement visuel, régénéré à l'identique à chaque chargement (aléatoire à
// graine fixe).
//
// Trois couches, de la plus basse à la plus haute :
// 1. un sol d'herbe répété à l'infini, assombri (= "hors zone") ;
// 2. une bande d'arbres autour de la zone, de plus en plus dense en s'éloignant ;
// 3. des nuages dessinés sur l'horizon, qui ondulent lentement.
// + un liseré discret qui marque la limite de la zone jouable.

const OUTSIDE_TINT = 0x9ea58c; // assombrit/désature l'herbe et les arbres hors zone
const OUTSIDE_EXTENT = 7000; // px monde couverts autour de la carte (couvre le zoom ×0.3)
const TREE_RING = 12; // largeur (en cases) de la bande d'arbres
const CLOUD_COUNT = 44;
const SEED = 20260924;

/** Petit générateur pseudo-aléatoire à graine (mulberry32) : décor stable. */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Crée tout le décor hors zone. Renvoie un objet dont `update(time)` est à
 * appeler à chaque frame (animation des nuages). */
export function createMapDecor(scene, grid) {
  const bounds = computeMapBounds(grid.width, grid.height);
  createOutsideGround(scene, bounds);
  createZoneOutline(scene, grid);
  createTreeRing(scene, grid);
  const clouds = createClouds(scene, bounds);
  return { update: (time) => clouds.update(time) };
}

// ------------------------------------------------------------ 1. sol infini

function createOutsideGround(scene, bounds) {
  // Motif rectangulaire 64×32 qui se répète sans raccord : un losange d'herbe
  // entier au centre + un quart de losange dans chaque coin. Les losanges du
  // motif tombent exactement sur la grille de la carte (voir le calage plus bas).
  const key = 'outside_ground_pattern';
  if (!scene.textures.exists(key)) {
    const canvasTex = scene.textures.createCanvas(key, TILE_WIDTH, TILE_HEIGHT);
    const ctx = canvasTex.getContext();
    const src = scene.textures.get('tile_grass').getSourceImage();
    const w = TILE_WIDTH;
    const h = TILE_HEIGHT;
    for (const [cx, cy] of [
      [w / 2, h / 2],
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ]) {
      ctx.drawImage(src, cx - w / 2, cy - h / 2, w, h);
    }
    canvasTex.refresh();
  }

  // Coin haut-gauche calé sur un multiple de 64×32 = le centre d'une case de
  // la grille (col-row pair) : le motif prolonge la grille sans décalage.
  const left = Math.floor((bounds.minX - OUTSIDE_EXTENT) / TILE_WIDTH) * TILE_WIDTH;
  const top = Math.floor((bounds.minY - OUTSIDE_EXTENT) / TILE_HEIGHT) * TILE_HEIGHT;
  const right = Math.ceil((bounds.maxX + OUTSIDE_EXTENT) / TILE_WIDTH) * TILE_WIDTH;
  const bottom = Math.ceil((bounds.maxY + OUTSIDE_EXTENT) / TILE_HEIGHT) * TILE_HEIGHT;

  scene.add
    .tileSprite(left, top, right - left, bottom - top, key)
    .setOrigin(0, 0)
    .setTint(OUTSIDE_TINT)
    .setDepth(DEPTH.OUTSIDE_GROUND);
}

// ---------------------------------------------------- liseré de la zone

function createZoneOutline(scene, grid) {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const { width: W, height: H } = grid;
  const topV = isoToScreen(0, 0);
  const rightV = isoToScreen(W - 1, 0);
  const bottomV = isoToScreen(W - 1, H - 1);
  const leftV = isoToScreen(0, H - 1);
  const points = [
    new Phaser.Math.Vector2(topV.x, topV.y - hh),
    new Phaser.Math.Vector2(rightV.x + hw, rightV.y),
    new Phaser.Math.Vector2(bottomV.x, bottomV.y + hh),
    new Phaser.Math.Vector2(leftV.x - hw, leftV.y),
  ];

  scene.add
    .graphics()
    .setDepth(DEPTH.ZONE_OUTLINE)
    .lineStyle(4, 0x1b1712, 0.35)
    .strokePoints(points, true, true);
}

// ------------------------------------------------------ 2. bande d'arbres

function createTreeRing(scene, grid) {
  const rng = makeRng(SEED);
  const { width: W, height: H } = grid;
  const treeCell = makeCell('prop_tree');

  for (let row = -TREE_RING; row < H + TREE_RING; row++) {
    for (let col = -TREE_RING; col < W + TREE_RING; col++) {
      const inside = col >= 0 && col < W && row >= 0 && row < H;
      if (inside) continue;

      // distance (en cases) jusqu'à la zone jouable
      const dCol = col < 0 ? -col : col >= W ? col - W + 1 : 0;
      const dRow = row < 0 ? -row : row >= H ? row - H + 1 : 0;
      const d = Math.max(dCol, dRow);
      // Clairsemé au bord (la limite reste lisible), dense au loin (la
      // "forêt" continue vers l'horizon).
      const density = Math.min(0.55, 0.05 * d);
      if (rng() > density) continue;

      const flipped = rng() < 0.5;
      const tree = createCellSprite(scene, 'details', col, row, makeCell(treeCell.key, flipped, false));
      tree.setTint(OUTSIDE_TINT);
      // petite variation de taille pour éviter l'effet "copier-coller"
      tree.setScale(tree.scaleX * (0.85 + rng() * 0.4));
    }
  }
}

// --------------------------------------------------------------- 3. nuages

// Nuages dessinés (voir DECOR_ASSET_PATHS dans mapLoader.js).
const CLOUD_KEYS = ['decor_cloud_1', 'decor_cloud_2', 'decor_cloud_3'];

function createClouds(scene, bounds) {
  const rng = makeRng(SEED + 1);
  // pixel art : agrandissement sans lissage, pour garder les pixels nets
  for (const key of CLOUD_KEYS) scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);

  // Les nuages restent HORS du rectangle de la carte (+ marge) : ils habillent
  // l'horizon sans jamais masquer la zone jouable.
  const inner = {
    minX: bounds.minX - 180,
    maxX: bounds.maxX + 180,
    minY: bounds.minY - 140,
    maxY: bounds.maxY + 140,
  };
  const outer = {
    minX: bounds.minX - 2400,
    maxX: bounds.maxX + 2400,
    minY: bounds.minY - 1500,
    maxY: bounds.maxY + 1500,
  };

  const clouds = [];
  let attempts = 0;
  while (clouds.length < CLOUD_COUNT && attempts++ < 2000) {
    const x = outer.minX + rng() * (outer.maxX - outer.minX);
    const y = outer.minY + rng() * (outer.maxY - outer.minY);
    if (x > inner.minX && x < inner.maxX && y > inner.minY && y < inner.maxY) continue;

    const sprite = scene.add
      .image(x, y, CLOUD_KEYS[Math.floor(rng() * CLOUD_KEYS.length)])
      .setScale(0.6 + rng() * 0.7)
      .setAlpha(0.82 + rng() * 0.15)
      .setFlipX(rng() < 0.5)
      .setDepth(DEPTH.CLOUDS + y); // les nuages du bas passent devant ceux du haut
    clouds.push({ sprite, baseX: x, amp: 30 + rng() * 50, speed: 0.00012 + rng() * 0.00018, phase: rng() * 6.28 });
  }

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return {
    // Ondulation lente d'avant en arrière (pas de dérive continue : un nuage
    // ne traverse jamais la zone jouable).
    update(time) {
      if (reduceMotion) return;
      for (const c of clouds) {
        c.sprite.x = Math.round(c.baseX + Math.sin(time * c.speed + c.phase) * c.amp);
      }
    },
  };
}
