import Phaser from 'phaser';
import { CameraController } from '../CameraController.js';
import * as mapLoader from '../mapLoader.js';
import * as mapData from '../mapData.js';
import * as customAssets from '../customAssets.js';
import { createMapDecor } from '../mapDecor.js';
import { MapEditor } from '../editor/MapEditor.js';
import { EditorPanel } from '../editor/EditorPanel.js';
import { SelectionFrame } from '../editor/SelectionFrame.js';
import { AddAssetModal } from '../editor/AddAssetModal.js';

// Part maximale de la carte visible d'un coup (mesurée sur la capture de
// référence default_zoom.png : ~86 % de la largeur, ~96 % de la hauteur).
const MAX_VIEW_FRACTION = { width: 0.86, height: 0.96 };
const CAMERA_MARGIN = 220; // px monde au-delà du bord de la carte : forêt + lisière de nuages
const SELECTION_FRAME_WORLD_SIZE = 56;
// Carte en cours d'édition, gardée le temps de la session (registre du jeu :
// survit à scene.restart(), pas à un rechargement de la page).
const SESSION_GRID_KEY = 'sessionGrid'; // demi-tuile de marge autour d'une tuile 64×32

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
    // À chaque lancement : la carte par défaut (public/maps/default-map.json).
    // Les éditions ne sont plus relues depuis le navigateur au chargement — sinon
    // une vieille sauvegarde reprenait le dessus. Seule exception : un import
    // JSON ou une édition dans la même session (scene.restart()).
    const grid =
      this.registry.get(SESSION_GRID_KEY) ??
      mapData.parseGridFile(JSON.stringify(mapLoader.getDefaultMapJson(this))).grid;

    const spriteGrid = mapLoader.createSpriteGrid(grid.width, grid.height);
    mapLoader.buildFromGrid(this, spriteGrid, grid);
    // Sol, arbres et nuages HORS de la zone jouable : plus de fond noir.
    // (Le repère "CENTRE DE DISTRIBUTION" issu de Tiled, qui s'affichait
    // hors de la carte, a été retiré définitivement le 2026-09-24.)
    this.decor = createMapDecor(this, grid);

    const bounds = mapLoader.computeMapBounds(grid.width, grid.height);
    this.cameras.main.centerOn(
      (bounds.minX + bounds.maxX) / 2,
      (bounds.minY + bounds.maxY) / 2
    );

    // Bornes = la carte + une petite marge : au bord, on ne voit que la forêt
    // et le début de la mer de nuages, jamais le lointain (mapDecor.js n'a
    // donc à habiller que cette zone — bien plus léger).
    const mapWidth = bounds.maxX - bounds.minX;
    const mapHeight = bounds.maxY - bounds.minY;
    const boundsWidth = mapWidth + CAMERA_MARGIN * 2;
    const boundsHeight = mapHeight + CAMERA_MARGIN * 2;
    this.cameras.main.setBounds(bounds.minX - CAMERA_MARGIN, bounds.minY - CAMERA_MARGIN, boundsWidth, boundsHeight);

    this.cameraController = new CameraController(this, {
      minZoom: 1,
      maxZoom: 2.5,
    });

    // Dézoom maximal fixé sur la capture de référence de l'utilisateur
    // (Downloads/default_zoom.png, 2026-09-24) : la vue montre au plus
    // MAX_VIEW_FRACTION de la carte, quelle que soit la taille de l'écran.
    // Recalculé quand la fenêtre change de taille.
    const fitMinZoom = () => {
      const cam = this.cameras.main;
      const minZoom = Math.max(
        cam.width / (mapWidth * MAX_VIEW_FRACTION.width),
        cam.height / (mapHeight * MAX_VIEW_FRACTION.height)
      );
      this.cameraController.minZoom = minZoom;
      if (cam.zoom < minZoom) cam.setZoom(minZoom);
    };
    fitMinZoom();
    this.scale.on('resize', fitMinZoom);
    this.events.once('shutdown', () => this.scale.off('resize', fitMinZoom));

    this.mapEditor = new MapEditor(this, {
      grid,
      spriteGrid,
      onChange: () => this.registry.set(SESSION_GRID_KEY, grid),
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

    // scene.restart() (bouton "Revenir à la carte par défaut", import) relance
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
        this.registry.remove(SESSION_GRID_KEY);
        this.scene.restart();
      },
    });
  }

  update(time) {
    this.cameraController.update();
    this.decor.update(time);
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
   * les assets personnalisés qu'il embarque dans le registre local, garde la
   * carte pour la session et relance la scène pour repartir dessus proprement
   * — même mécanisme que "Revenir à la carte par défaut", pour ne pas avoir à
   * gérer un changement de dimensions de grille en direct. */
  _importMapFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { grid, customAssets: importedCustomAssets } = mapData.parseGridFile(reader.result);
        customAssets.mergeCustomAssets(importedCustomAssets);
        this.registry.set(SESSION_GRID_KEY, grid);
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
