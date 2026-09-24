// Icônes pixel art du menu, dessinées à la main sur une grille 16×16 et
// converties en SVG (un <rect> par segment horizontal de même couleur).
// Pourquoi pas des PNG recadrés depuis les planches de maquette : dans
// assets_game.png les icônes font ~20 px, les agrandir les rendrait floues.
// Un SVG `crispEdges` reste net à n'importe quelle taille, sans casser
// l'esthétique pixel (décision validée avec l'utilisateur le 2026-09-24).
//
// Codes couleur des grilles (palette verrouillée, voir CLAUDE.md) :
//   c = currentColor (crème #F1E9D2 par défaut, hérité du bouton)
//   g = or #C79A3B   b = brun #9C5B3E   d = brun foncé #1B1712
//   G = vert #6E8F52 k = vert foncé #4C6B3F   . = transparent

const COLORS = {
  c: 'currentColor',
  g: '#C79A3B',
  b: '#9C5B3E',
  d: '#1B1712',
  G: '#6E8F52',
  k: '#4C6B3F',
};

const SIZE = 16;

const GRIDS = {
  play: [
    '................',
    '................',
    '....cc..........',
    '....ccc.........',
    '....cccc........',
    '....ccccc.......',
    '....cccccc......',
    '....ccccccc.....',
    '....ccccccc.....',
    '....cccccc......',
    '....ccccc.......',
    '....cccc........',
    '....ccc.........',
    '....cc..........',
    '................',
    '................',
  ],
  folder: [
    '................',
    '................',
    '................',
    '.ccccc..........',
    '.cccccc.........',
    '.cccccccccccccc.',
    '.cccccccccccccc.',
    '.cddddddddddddc.',
    '.cccccccccccccc.',
    '.cccccccccccccc.',
    '.cccccccccccccc.',
    '.cccccccccccccc.',
    '.cccccccccccccc.',
    '................',
    '................',
    '................',
  ],
  book: [
    '................',
    '................',
    '................',
    '..cccc....cccc..',
    '.ccccccddcccccc.',
    '.cdddccddccdddc.',
    '.ccccccddcccccc.',
    '.cdddccddccdddc.',
    '.ccccccddcccccc.',
    '.cdddccddccdddc.',
    '.ccccccddcccccc.',
    '.cccccddddccccc.',
    '......dddd......',
    '................',
    '................',
    '................',
  ],
  gear: [
    '................',
    '......cccc......',
    '..cc..cccc..cc..',
    '..cccccccccccc..',
    '...cccccccccc...',
    '..ccccc..ccccc..',
    '.ccccc....ccccc.',
    'cccccc....cccccc',
    'cccccc....cccccc',
    '.ccccc....ccccc.',
    '..ccccc..ccccc..',
    '...cccccccccc...',
    '..cccccccccccc..',
    '..cc..cccc..cc..',
    '......cccc......',
    '................',
  ],
  globe: [
    '................',
    '.....cccccc.....',
    '...ccc.cc.ccc...',
    '..ccc.cccc.ccc..',
    '.cccc.cccc.cccc.',
    '.cccc.cccc.cccc.',
    '.cccc.cccc.cccc.',
    '................',
    '.cccc.cccc.cccc.',
    '.cccc.cccc.cccc.',
    '.cccc.cccc.cccc.',
    '..ccc.cccc.ccc..',
    '...ccc.cc.ccc...',
    '.....cccccc.....',
    '................',
    '................',
  ],
  soundOn: [
    '................',
    '................',
    '................',
    '.......cc...c...',
    '......ccc....c..',
    '.cccccccc.c..c..',
    '.cccccccc..c..c.',
    '.cccccccc..c..c.',
    '.cccccccc..c..c.',
    '.cccccccc..c..c.',
    '.cccccccc.c..c..',
    '......ccc....c..',
    '.......cc...c...',
    '................',
    '................',
    '................',
  ],
  soundOff: [
    '................',
    '................',
    '................',
    '.......cc.......',
    '......ccc.......',
    '.cccccccc.c...c.',
    '.cccccccc..c.c..',
    '.cccccccc...c...',
    '.cccccccc..c.c..',
    '.cccccccc.c...c.',
    '.cccccccc.......',
    '......ccc.......',
    '.......cc.......',
    '................',
    '................',
    '................',
  ],
  chevron: [
    '................',
    '................',
    '................',
    '................',
    '......cc........',
    '......ccc.......',
    '.......ccc......',
    '........ccc.....',
    '........ccc.....',
    '.......ccc......',
    '......ccc.......',
    '......cc........',
    '................',
    '................',
    '................',
    '................',
  ],
  star: [
    '................',
    '.......gg.......',
    '.......gg.......',
    '......gggg......',
    '......gggg......',
    '.gggggggggggggg.',
    '..gggggggggggg..',
    '...gggggggggg...',
    '....gggggggg....',
    '....gggggggg....',
    '...gggg..gggg...',
    '...ggg....ggg...',
    '..ggg......ggg..',
    '..gg........gg..',
    '................',
    '................',
  ],
  leaf: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '..GGG......GGG..',
    '.GGGGG....GGGGG.',
    '.GGGGGG..GGGGGG.',
    '..GGGGGggGGGGG..',
    '....GGGggGGG....',
    '.......gg.......',
    '.......gg.......',
    '................',
    '................',
    '................',
    '................',
  ],
  coin: disc((x, y, d) => {
    if (d > 6.1) return 'b';
    if ((x === 5 && y === 4) || (x === 4 && y === 5) || (x === 4 && y === 6)) return 'c';
    if (d > 3.6 && d < 4.6) return 'b';
    return 'g';
  }),
  smiley: disc((x, y, d) => {
    if (d > 6.1) return 'k';
    if ((x === 5 || x === 10) && (y === 5 || y === 6)) return 'd';
    if (y === 10 && x >= 5 && x <= 10) return 'd';
    if (y === 9 && (x === 4 || x === 11)) return 'd';
    return 'G';
  }),
};

/** Construit une grille "disque" 16×16 : `paint(x, y, distanceAuCentre)`
 * renvoie le code couleur de chaque pixel à l'intérieur du disque. */
function disc(paint) {
  const rows = [];
  for (let y = 0; y < SIZE; y++) {
    let row = '';
    for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      row += d <= 7.2 ? paint(x, y, d) : '.';
    }
    rows.push(row);
  }
  return rows;
}

function gridToSvg(rows) {
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x;
      while (end < row.length && row[end] === ch) end++;
      if (COLORS[ch]) {
        rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${COLORS[ch]}"/>`;
      }
      x = end;
    }
  });
  return (
    `<svg class="px-icon" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="crispEdges" ` +
    `aria-hidden="true" focusable="false">${rects}</svg>`
  );
}

const cache = new Map();

/** Balise <svg> de l'icône `name` (voir GRIDS). */
export function icon(name) {
  if (!cache.has(name)) cache.set(name, gridToSvg(GRIDS[name]));
  return cache.get(name);
}
