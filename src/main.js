import Phaser from 'phaser';
import { CalibrationScene } from './scenes/CalibrationScene.js';
import { MapScene } from './scenes/MapScene.js';

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
