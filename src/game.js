import Phaser from 'phaser';
import { CalibrationScene } from './scenes/CalibrationScene.js';
import { MapScene } from './scenes/MapScene.js';
import { ASSET_PATHS, DECOR_ASSET_PATHS, MAP_JSON_PATH } from './mapLoader.js';

// Partie "jeu" (Phaser + carte + éditeur). Ce module n'est JAMAIS importé
// statiquement par le menu (src/main.js) : il est chargé à la demande via
// import() pour que Vite le sépare dans son propre fichier, et que le menu
// s'affiche sans attendre Phaser ni les ~15 Mo d'assets de la carte.

/** Liste des fichiers que MapScene va charger — le menu les pré-télécharge en
 * arrière-plan (cache HTTP du navigateur) pour que le loader de Phaser les
 * retrouve instantanément au clic sur "Nouvelle partie" (MAP_JSON_PATH = la
 * carte par défaut). */
export const GAME_ASSET_URLS = [
  MAP_JSON_PATH,
  ...Object.values(ASSET_PATHS),
  ...Object.values(DECOR_ASSET_PATHS),
];

/**
 * Crée le Phaser.Game dans #game-container. `onReady` est appelé une fois la
 * carte réellement affichée (fin du create() de MapScene), pour que le menu
 * puisse retirer son écran de chargement au bon moment.
 */
export function startGame({ onReady } = {}) {
  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#1b1712',
    scale: {
      // RESIZE fait correspondre le canvas à la taille de son parent en continu.
      // Ne pas combiner avec autoCenter (prévu pour FIT/ENVELOP) : les deux ensemble
      // laissaient le canvas à sa taille initiale, centré, au lieu de remplir l'écran.
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
    },
    // MapScene (la vraie carte) est active en premier. CalibrationScene reste
    // enregistrée mais inutilisée par défaut — utile pour retester la caméra seule
    // si besoin, sans dépendre du chargement de la carte.
    scene: [MapScene, CalibrationScene],
  };

  const game = new Phaser.Game(config);

  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });

  if (onReady) {
    game.events.once(Phaser.Core.Events.READY, () => {
      game.scene.getScene('MapScene').events.once(Phaser.Scenes.Events.CREATE, onReady);
    });
  }

  return game;
}
