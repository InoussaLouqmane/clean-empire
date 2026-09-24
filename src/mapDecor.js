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
// 3. au-delà de la forêt, une mer de nuages qui remplit TOUT le reste
//    (demande utilisateur du 2026-09-24 : la ville est une île au-dessus des
//    nuages, on devine qu'il existe quelque chose au-delà).
// + un liseré discret qui marque la limite de la zone jouable.

const OUTSIDE_TINT = 0x9ea58c; // assombrit/désature l'herbe et les arbres hors zone
const OUTSIDE_EXTENT = 1500; // px monde couverts autour de la carte (la caméra en montre ~220 max)
const TREE_RING = 9; // largeur (en cases) de la bande d'arbres (au-delà : mer de nuages)
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
  const clouds = createCloudSea(scene, grid, bounds);
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

// ---------------------------------------------------------- 3. mer de nuages

// Nuages dessinés (voir DECOR_ASSET_PATHS dans mapLoader.js).
const CLOUD_KEYS = ['decor_cloud_1', 'decor_cloud_2', 'decor_cloud_3'];
// Éclaircissement vers le crème #F1E9D2 (0 = nuages d'origine, 1 = crème
// uni) : en grande quantité, les nuages beiges d'origine faisaient "sable".
const CLOUD_LIGHTEN = 0.35;
// Lisière de la mer de nuages, en cases autour de la zone jouable : la forêt
// (TREE_RING) s'y enfonce et disparaît dans la brume.
const SEA_EDGE = 8;
const EDGE_CLOUDS = 110; // nuages serrés le long de la lisière (bord moelleux)
const FIELD_CLOUDS = 120; // nuages répartis sur la mer visible (relief)
// Le fond de la mer est éclairci vers le crème par rapport à la couleur
// moyenne des nuages : à la couleur moyenne pure, il faisait "sable".
const SEA_BASE_LIGHTEN = 0.45;
// px au-delà de la carte où placer des nuages : la caméra ne montre que ~220 px
// au-delà du bord (voir CAMERA_MARGIN dans MapScene.js), inutile d'aller plus loin
// — le dézoom est limité depuis le 2026-09-24, ce qui allège beaucoup le rendu.
const CAMERA_REACH = 500;

/** Version éclaircie d'une texture de nuage (canvas, fichier d'origine intact).
 * Renvoie aussi sa couleur moyenne, utilisée pour le fond de la mer. */
function makeLightCloud(scene, key) {
  const lightKey = `${key}_light`;
  const src = scene.textures.get(key).getSourceImage();
  const tex = scene.textures.exists(lightKey)
    ? scene.textures.get(lightKey)
    : scene.textures.createCanvas(lightKey, src.width, src.height);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-atop'; // ne teinte que les pixels opaques
  ctx.fillStyle = `rgba(241, 233, 210, ${CLOUD_LIGHTEN})`;
  ctx.fillRect(0, 0, src.width, src.height);
  ctx.globalCompositeOperation = 'source-over';
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST); // pixels nets

  const { data } = ctx.getImageData(0, 0, src.width, src.height);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 200) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  return { key: lightKey, avg: n ? [r / n, g / n, b / n] : [233, 219, 189] };
}

/** Sommets (haut, droite, bas, gauche) du losange de la zone jouable
 * élargie de `k` cases. */
function expandedDiamond(grid, k) {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const { width: W, height: H } = grid;
  const t = isoToScreen(-k, -k);
  const r = isoToScreen(W - 1 + k, -k);
  const b = isoToScreen(W - 1 + k, H - 1 + k);
  const l = isoToScreen(-k, H - 1 + k);
  return {
    top: { x: t.x, y: t.y - hh },
    right: { x: r.x + hw, y: r.y },
    bottom: { x: b.x, y: b.y + hh },
    left: { x: l.x - hw, y: l.y },
  };
}

/** (x, y) est-il dans le losange de la zone jouable élargie de `k` cases ? */
function insideDiamond(grid, k, x, y) {
  const col = (x / (TILE_WIDTH / 2) + y / (TILE_HEIGHT / 2)) / 2;
  const row = (y / (TILE_HEIGHT / 2) - x / (TILE_WIDTH / 2)) / 2;
  return col > -k - 0.5 && col < grid.width - 0.5 + k && row > -k - 0.5 && row < grid.height - 0.5 + k;
}

function createCloudSea(scene, grid, bounds) {
  const rng = makeRng(SEED + 1);
  const lights = CLOUD_KEYS.map((key) => makeLightCloud(scene, key));
  const avg = lights.reduce((acc, l) => acc.map((v, i) => v + l.avg[i] / lights.length), [0, 0, 0]);
  const cream = [241, 233, 210];
  const base = avg.map((v, i) => Math.round(v + (cream[i] - v) * SEA_BASE_LIGHTEN));
  const seaColor = (base[0] << 16) | (base[1] << 8) | base[2];
  const pickKey = () => lights[Math.floor(rng() * lights.length)].key;

  // 1) Fond plein couleur nuage sur tout ce qui est au-delà de la lisière :
  //    garantit qu'il ne reste AUCUN trou, même entre deux nuages. C'est le
  //    rectangle du monde moins le losange de l'île, découpé en 4 polygones.
  const d = expandedDiamond(grid, SEA_EDGE + 1);
  const TL = { x: bounds.minX - OUTSIDE_EXTENT, y: bounds.minY - OUTSIDE_EXTENT };
  const TR = { x: bounds.maxX + OUTSIDE_EXTENT, y: bounds.minY - OUTSIDE_EXTENT };
  const BR = { x: bounds.maxX + OUTSIDE_EXTENT, y: bounds.maxY + OUTSIDE_EXTENT };
  const BL = { x: bounds.minX - OUTSIDE_EXTENT, y: bounds.maxY + OUTSIDE_EXTENT };
  // Profondeur bien en dessous des nuages : leur profondeur vaut CLOUDS + y,
  // et y est négatif en haut de la carte (sinon ils passaient sous le fond).
  const sea = scene.add.graphics().setDepth(DEPTH.CLOUDS - 50000).fillStyle(seaColor, 1);
  for (const poly of [
    [TL, TR, d.right, d.top, d.left],
    [BL, d.left, d.bottom, d.right, BR],
    [TL, d.left, BL],
    [TR, BR, d.right],
  ]) {
    sea.fillPoints(poly.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
  }

  const clouds = [];
  const addCloud = (x, y, scale, amp) => {
    const sprite = scene.add
      .image(x, y, pickKey())
      .setScale(scale)
      .setFlipX(rng() < 0.5)
      .setDepth(DEPTH.CLOUDS + y); // les nuages du bas passent devant ceux du haut
    clouds.push({ sprite, baseX: x, amp, speed: 0.00012 + rng() * 0.00018, phase: rng() * 6.28 });
  };

  // 2) Lisière : nuages serrés le long du bord du losange, qui mordent un peu
  //    sur la forêt — la ligne droite du fond n'est jamais visible. Petite
  //    amplitude d'ondulation pour que le bord reste toujours couvert.
  const edge = expandedDiamond(grid, SEA_EDGE + 0.5);
  const sides = [
    [edge.top, edge.right],
    [edge.right, edge.bottom],
    [edge.bottom, edge.left],
    [edge.left, edge.top],
  ];
  const lengths = sides.map(([a, b]) => Math.hypot(b.x - a.x, b.y - a.y));
  const total = lengths.reduce((sum, v) => sum + v, 0);
  for (let i = 0; i < EDGE_CLOUDS; i++) {
    let dist = ((i + rng() * 0.6) / EDGE_CLOUDS) * total;
    let s = 0;
    while (s < sides.length - 1 && dist > lengths[s]) dist -= lengths[s++];
    const [a, b] = sides[s];
    const t = Math.min(1, dist / lengths[s]);
    const jitter = (rng() - 0.3) * 50; // un peu vers l'extérieur en moyenne
    addCloud(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + jitter, 0.55 + rng() * 0.45, 6 + rng() * 10);
  }

  // Pointes du losange : quelques nuages de plus, là où la forêt dépasse.
  for (const v of [edge.top, edge.right, edge.bottom, edge.left]) {
    for (let j = 0; j < 4; j++) {
      addCloud(v.x + (rng() - 0.5) * 140, v.y + (rng() - 0.5) * 60, 0.6 + rng() * 0.4, 6 + rng() * 8);
    }
  }

  // 3) Champ : nuages répartis sur toute la mer visible, pour le relief.
  let attempts = 0;
  let placed = 0;
  while (placed < FIELD_CLOUDS && attempts++ < 5000) {
    const x = bounds.minX - CAMERA_REACH + rng() * (bounds.maxX - bounds.minX + CAMERA_REACH * 2);
    const y = bounds.minY - CAMERA_REACH + rng() * (bounds.maxY - bounds.minY + CAMERA_REACH * 2);
    if (insideDiamond(grid, SEA_EDGE + 2, x, y)) continue;
    addCloud(x, y, 0.6 + rng() * 0.8, 20 + rng() * 40);
    placed++;
  }

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return {
    // Ondulation lente d'avant en arrière (pas de dérive : un nuage ne
    // traverse jamais la zone jouable).
    update(time) {
      if (reduceMotion) return;
      for (const c of clouds) {
        c.sprite.x = Math.round(c.baseX + Math.sin(time * c.speed + c.phase) * c.amp);
      }
    },
  };
}
