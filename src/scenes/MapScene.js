import Phaser from 'phaser';
import { CameraController } from '../CameraController.js';
import * as mapLoader from '../mapLoader.js';
import * as mapData from '../mapData.js';
import * as customAssets from '../customAssets.js';
import { MapEditor } from '../editor/MapEditor.js';
import { EditorPanel } from '../editor/EditorPanel.js';
import { SelectionFrame } from '../editor/SelectionFrame.js';
import { AddAssetModal } from '../editor/AddAssetModal.js';

const SELECTION_FRAME_WORLD_SIZE = 56; // demi-tuile de marge autour d'une tuile 64×32

// Carte du jeu, éditable en direct (voir editor/). Le premier chargement
// convertit l'export Tiled (net-empire.tmj) vers notre propre format de grille
// (mapData.js) ; toute édition ultérieure est sauvegardée dans le navigateur et
// n'a plus besoin de Tiled — voir STATUS.md pour le détail de cette session.

export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  preload() {
    mapLoader.preload(this);
  }

  create() {
    const container = this.add.container(0, 0);

    const tiledJson = mapLoader.getRawTiledJson(this);
    const grid = mapData.loadSavedGrid() ?? mapData.convertTiledToGrid(tiledJson);

    const spriteGrid = mapLoader.createSpriteGrid(grid.width, grid.height);
    mapLoader.buildFromGrid(this, container, spriteGrid, grid);
    mapLoader.placeLandmarks(this, container, tiledJson);

    const bounds = mapLoader.computeMapBounds(grid.width, grid.height);
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

    this.mapEditor = new MapEditor(this, {
      container,
      grid,
      spriteGrid,
      onChange: () => mapData.saveGrid(grid),
      onOrientationChange: (flipX, flipY) => this.editorPanel?.setOrientationPreview(flipX, flipY),
      onToolChange: (tool, brushKey) => this.editorPanel?.setActiveTool(tool, brushKey),
    });

    this.selectionFrame = new SelectionFrame({
      onDelete: () => this.mapEditor.deleteSelected(),
      onRotate: () => this.mapEditor.rotateSelected(),
    });

    this.addAssetModal = new AddAssetModal({
      onSubmit: (fields) => this._addCustomAsset(fields),
    });

    // scene.restart() (bouton "Revenir à la carte importée de Tiled") relance
    // create() sans détruire les éléments DOM des panneaux précédents ni
    // retirer l'écouteur clavier de l'éditeur précédent — il faut les nettoyer
    // explicitement, sinon boutons dupliqués et raccourcis clavier en double.
    this.events.once('shutdown', () => {
      this.editorPanel?.destroy();
      this.selectionFrame?.destroy();
      this.addAssetModal?.destroy();
      this.mapEditor?.destroy();
    });

    this.editorPanel = new EditorPanel({
      onToggle: (active) => this.mapEditor.setActive(active),
      onLayerChange: (layer) => this.mapEditor.setActiveLayer(layer),
      onLayerVisibilityChange: (layer, visible) => this.mapEditor.setLayerVisible(layer, visible),
      onBrushChange: (textureKey) => this.mapEditor.setBrush(textureKey),
      onRotateBrush: () => this.mapEditor.cycleOrientation(),
      onMoveTool: () => this.mapEditor.setMoveTool(),
      onEraseTool: () => this.mapEditor.setEraseTool(),
      onExport: () => mapData.exportGridAsFile(grid),
      onImport: (file) => this._importMapFromFile(file),
      onResetToGrass: () => this.mapEditor.resetToGrassOnly(),
      onOpenAddAsset: () => this.addAssetModal.open(),
      onClearSaved: () => {
        mapData.clearSavedGrid();
        this.scene.restart();
      },
    });
  }

  update() {
    this.cameraController.update();
    this._updateSelectionFrame();
  }

  /** Repositionne le cadre contextuel (DOM) chaque frame à partir de la
   * position monde de la tuile sélectionnée — nécessaire même sans glisser en
   * cours, puisque le zoom molette reste actif pendant l'édition. */
  _updateSelectionFrame() {
    const worldPos = this.mapEditor.getSelectedWorldPosition();
    if (!worldPos) {
      this.selectionFrame.hide();
      return;
    }

    // Conversion monde -> écran. Le zoom d'une caméra Phaser pivote autour de
    // son CENTRE actuel (scrollX + width/2, scrollY + height/2), pas autour de
    // l'origine du monde — la version précédente de ce calcul l'oubliait, ce
    // qui causait un décalage entre le cadre et la tuile réelle dès que le
    // zoom n'était pas exactement 1 (signalé par l'utilisateur via capture
    // d'écran). Cette formule reproduit le pivot central que centerOn()/setZoom()
    // utilisent déjà en interne.
    const camera = this.cameras.main;
    const halfWidth = camera.width / 2;
    const halfHeight = camera.height / 2;
    const screenX = (worldPos.x - camera.scrollX - halfWidth) * camera.zoom + halfWidth;
    const screenY = (worldPos.y - camera.scrollY - halfHeight) * camera.zoom + halfHeight;
    this.selectionFrame.setScreenRect(screenX, screenY, SELECTION_FRAME_WORLD_SIZE * camera.zoom);
  }

  /** Lit et valide un fichier JSON exporté (ou modifié à la main), fusionne
   * les assets personnalisés qu'il embarque dans le registre local, sauvegarde
   * la carte et relance la scène pour repartir dessus proprement — même
   * mécanisme que "Revenir à la carte importée de Tiled", pour ne pas avoir à
   * gérer un changement de dimensions de grille en direct. */
  _importMapFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { grid, customAssets: importedCustomAssets } = mapData.parseGridFile(reader.result);
        customAssets.mergeCustomAssets(importedCustomAssets);
        mapData.saveGrid(grid);
        this.scene.restart();
      } catch (err) {
        window.alert(`Import impossible : ${err.message}`);
      }
    };
    reader.onerror = () => window.alert('Impossible de lire ce fichier.');
    reader.readAsText(file);
  }

  /** Callback de AddAssetModal : enregistre le nouvel asset dans le registre
   * local, charge sa texture dans Phaser à la volée (le jeu tourne déjà, on
   * n'est plus dans preload()), et rafraîchit la palette flottante une fois
   * chargée pour qu'il apparaisse immédiatement sans recharger la page. */
  _addCustomAsset({ label, category, dataUrl }) {
    const entry = customAssets.addCustomAsset({ label, category, dataUrl });

    this.load.image(entry.key, entry.dataUrl);
    this.load.once('complete', () => {
      this.editorPanel?.refreshPalette();
    });
    this.load.start();
  }
}
