import Phaser from 'phaser';
import { CameraController } from '../CameraController.js';
import * as mapLoader from '../mapLoader.js';

// Première carte réelle du jeu (export Tiled du rôle 5, Map v3.tmj), en
// remplacement de la grille de calibration neutre. Voir mapLoader.js pour la
// correspondance tuile Tiled -> vrai asset, et STATUS.md pour le détail de la
// session qui l'a branchée.

export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  preload() {
    mapLoader.preload(this);
  }

  create() {
    const container = this.add.container(0, 0);
    const bounds = mapLoader.buildMap(this, container);

    this.cameras.main.centerOn(
      (bounds.minX + bounds.maxX) / 2,
      (bounds.minY + bounds.maxY) / 2
    );

    const margin = mapLoader.TILE_WIDTH * 4;
    this.cameras.main.setBounds(
      bounds.minX - margin,
      bounds.minY - margin,
      bounds.maxX - bounds.minX + margin * 2,
      bounds.maxY - bounds.minY + margin * 2
    );

    this.cameraController = new CameraController(this, {
      minZoom: 0.3,
      maxZoom: 2.5,
    });
  }

  update() {
    this.cameraController.update();
  }
}
