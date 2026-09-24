/**
 * Position monde -> position écran (px CSS) pour la caméra principale. Le
 * zoom d'une caméra Phaser pivote autour de son CENTRE actuel, pas de
 * l'origine du monde (voir l'historique dans STATUS.md, cadre de sélection).
 */
export function worldToScreen(camera, x, y) {
  const hw = camera.width / 2;
  const hh = camera.height / 2;
  return {
    x: (x - camera.scrollX - hw) * camera.zoom + hw,
    y: (y - camera.scrollY - hh) * camera.zoom + hh,
  };
}
