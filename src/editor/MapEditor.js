import Phaser from 'phaser';
import * as mapLoader from '../mapLoader.js';

const DRAG_THRESHOLD = 6; // px écran — en dessous, un pointerdown→up est un "clic", pas un glissé

/**
 * Logique d'édition de la carte : peindre/effacer des tuiles à la souris sur le
 * calque actif, avec la texture actuellement sélectionnée dans la palette
 * (voir EditorPanel.js). Ne fait rien tant que setActive(true) n'a pas été
 * appelé (branché sur le bouton "Mode édition").
 *
 * Deux gestes bien distincts, pour ne pas gêner la pose en masse (glisser pour
 * peindre de l'herbe/route sur une zone) tout en permettant un ajustement fin
 * tuile par tuile :
 * - **Glisser** (déplacement > DRAG_THRESHOLD) = peint en continu avec le
 *   pinceau actuel (comportement historique), OU déplace la tuile sélectionnée
 *   si le glissé démarre exactement sur la cellule sélectionnée.
 * - **Clic simple** (pas de glissé) : sur une case vide, pose une tuile puis la
 *   sélectionne aussitôt (cadre contextuel, voir editor/SelectionFrame.js) ;
 *   sur une case déjà occupée, la sélectionne SANS l'écraser (sauf avec l'outil
 *   Gomme, qui efface directement au clic comme avant) ; sur du vide alors que
 *   la Gomme est l'outil actif, désélectionne juste.
 *
 * Facilités de pose (ajoutées le 2026-09-23, à la demande de l'utilisateur) :
 * - Ctrl+Z / Ctrl+Y (ou Ctrl+Maj+Z) : annuler / rétablir, par glissé complet ou
 *   action ponctuelle (une seule étape d'annulation, pas case par case).
 * - Maj (Shift) maintenu pendant un glissé de peinture : verrouille la pose sur
 *   un seul axe de la grille (colonne ou ligne, celui dominant depuis le début
 *   du glissé) — pour tracer une ligne droite sans déborder sur l'axe
 *   perpendiculaire. Ne s'applique pas à un glissé de déplacement.
 * - Touche R (ou bouton "Pivoter" du cadre contextuel / de la palette) : fait
 *   pivoter l'orientation de la tuile (miroir horizontal/vertical — PAS une
 *   vraie rotation à 90°, voir makeCell() dans mapLoader.js pour l'explication).
 * - Suppr/Retour arrière : supprime la tuile actuellement sélectionnée.
 * - Échap : désélectionne.
 * - Touche V (ou carte "Déplacer" de la palette) : repasse en outil
 *   Déplacement — voir "Outils" ci-dessous.
 *
 * Outils (ajouté le 2026-09-23, à la demande de l'utilisateur) : trois outils
 * mutuellement exclusifs, `this.tool` :
 * - **'move'** (par défaut à chaque activation du mode édition) : navigation
 *   pure, la caméra retrouve son pan au glisser + pincement normaux, aucun
 *   clic/glissé sur la carte n'édite quoi que ce soit. Avant cet outil, le
 *   mode édition désactivait TOUJOURS le pan de la caméra dès qu'il était
 *   actif, peu importe l'outil — empêchant de simplement se déplacer sur la
 *   carte sans re-régler quelque chose par erreur.
 * - **'erase'** : clic/glissé efface (doit être sélectionné explicitement,
 *   n'est plus jamais actif par défaut).
 * - **'paint'** : clic/glissé pose `brushKey` (sélectionné dans la palette).
 */
export class MapEditor {
  constructor(scene, { container, grid, spriteGrid, onChange, onOrientationChange, onToolChange }) {
    this.scene = scene;
    this.container = container;
    this.grid = grid;
    this.spriteGrid = spriteGrid;
    this.onChange = onChange;
    this.onOrientationChange = onOrientationChange;
    this.onToolChange = onToolChange;

    this.active = false;
    this.activeLayer = 'ground';
    this.tool = 'move'; // 'move' | 'erase' | 'paint'
    this.brushKey = null; // clé de texture sélectionnée dans la palette — pertinent seulement si tool === 'paint'
    this.brushFlipX = false;
    this.brushFlipY = false;
    // Mémorise la dernière orientation utilisée PAR TYPE D'ASSET (clé de
    // texture -> { flipX, flipY }), pas une seule valeur globale : poser
    // plusieurs routes de suite dans le même sens ne doit pas obliger à
    // re-pivoter à chaque sélection, mais changer pour un bâtiment ne doit
    // pas hériter du miroir d'une route (décision utilisateur du 2026-09-23).
    this.brushOrientations = new Map();

    this.selectedCell = null; // { layerName, col, row } d'une tuile déjà posée, sélectionnée

    this.isPointerDown = false;
    this.dragMode = 'none'; // 'none' | 'brush' | 'move', déterminé au premier dépassement du seuil de glissé
    this.strokeAnchor = null; // { col, row } du premier point du geste courant (verrouillage Maj)
    this.currentStrokeChanges = null; // Map "layer:row:col" -> { layerName, col, row, prevValue, newValue }

    this.undoStack = [];
    this.redoStack = [];

    this.shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    this._boundKeyDown = this._onKeyDown.bind(this);
    this._bindInput();
  }

  setActive(active) {
    this.active = active;
    if (active) {
      // Repart toujours en outil Déplacement à l'activation — jamais la
      // Gomme par défaut, il faut la sélectionner explicitement.
      this.setMoveTool();
    } else {
      this.isPointerDown = false;
      this.dragMode = 'none';
      this.currentStrokeChanges = null;
      this.strokeAnchor = null;
      this._deselect();
      this._syncCameraEnabled();
    }
  }

  setActiveLayer(layerName) {
    this.activeLayer = layerName;
    this._deselect();
  }

  /** Outil Déplacement : navigation pure, aucune édition au clic/glissé — la
   * caméra retrouve pan + pincement normaux (le zoom molette, lui, n'est
   * jamais désactivé, y compris pour les autres outils). */
  setMoveTool() {
    this.tool = 'move';
    this._deselect();
    this._syncCameraEnabled();
    this.onToolChange?.('move', null);
  }

  setEraseTool() {
    this.tool = 'erase';
    this._deselect();
    this._syncCameraEnabled();
    this.onToolChange?.('erase', null);
  }

  /** Sélectionne une nouvelle texture depuis la palette (passe en outil
   * Peindre) — reprend la dernière orientation utilisée POUR CE TYPE D'ASSET
   * précis (mémorisée dans brushOrientations), pas une remise à zéro
   * systématique : poser plusieurs routes de suite dans le même sens ne doit
   * pas obliger à re-pivoter à chaque clic sur la palette. */
  setBrush(textureKey) {
    this.tool = 'paint';
    this.brushKey = textureKey;
    const remembered = this.brushOrientations.get(textureKey) ?? { flipX: false, flipY: false };
    this.brushFlipX = remembered.flipX;
    this.brushFlipY = remembered.flipY;
    this._syncCameraEnabled();
    this.onOrientationChange?.(this.brushFlipX, this.brushFlipY);
    this.onToolChange?.('paint', textureKey);
  }

  /** Le pan/pincement de la caméra n'est actif que hors édition, ou avec
   * l'outil Déplacement — peindre/effacer en glissant a besoin du geste de
   * glisser pour lui-même, pas pour faire défiler la vue. */
  _syncCameraEnabled() {
    if (this.scene.cameraController) {
      this.scene.cameraController.enabled = !this.active || this.tool === 'move';
    }
  }

  /** Fait pivoter le pinceau de la palette (tuile pas encore posée) — mémorise
   * la nouvelle orientation pour ce type d'asset précis, pour la retrouver la
   * prochaine fois qu'il est sélectionné. */
  cycleOrientation() {
    const next = mapLoader.nextOrientation(this.brushFlipX, this.brushFlipY);
    this.brushFlipX = next.flipX;
    this.brushFlipY = next.flipY;
    if (this.brushKey) this.brushOrientations.set(this.brushKey, next);
    this.onOrientationChange?.(this.brushFlipX, this.brushFlipY);
  }

  /** Fait pivoter la tuile actuellement sélectionnée (déjà posée) — bouton
   * "⟲" du cadre contextuel. */
  rotateSelected() {
    if (!this.selectedCell) return;
    const { layerName, col, row } = this.selectedCell;
    const current = this.grid.layers[layerName][row][col];
    if (!current) return;

    const next = mapLoader.nextOrientation(current.flipX, current.flipY);
    const newValue = mapLoader.makeCell(current.key, next.flipX, next.flipY);
    this._setCellWithUndo(layerName, col, row, newValue);
  }

  /** Supprime la tuile actuellement sélectionnée — bouton "✖" du cadre
   * contextuel (ou touche Suppr/Retour arrière). */
  deleteSelected() {
    if (!this.selectedCell) return;
    const { layerName, col, row } = this.selectedCell;
    this._setCellWithUndo(layerName, col, row, null);
    this._deselect();
  }

  /** Position monde { x, y } de la tuile sélectionnée (suit le sprite en
   * temps réel, y compris pendant un glissé de déplacement) — utilisé par
   * MapScene pour positionner le cadre contextuel. `null` si rien sélectionné. */
  getSelectedWorldPosition() {
    if (!this.selectedCell) return null;
    const { layerName, col, row } = this.selectedCell;
    const sprite = this.spriteGrid[layerName]?.[row]?.[col];
    return sprite ? { x: sprite.x, y: sprite.y } : null;
  }

  setLayerVisible(layerName, visible) {
    for (const row of this.spriteGrid[layerName]) {
      for (const sprite of row) {
        if (sprite) sprite.setVisible(visible);
      }
    }
  }

  /** Vide tous les calques et ne laisse que de l'herbe sur tout le sol — pour
   * repartir d'une surface vierge. Écrase toute édition en cours, y compris
   * l'historique d'annulation (repartir à zéro repart vraiment à zéro). */
  resetToGrassOnly() {
    const { width, height } = this.grid;
    for (const layerName of mapLoader.LAYER_NAMES) {
      this.grid.layers[layerName] = Array.from({ length: height }, () => Array(width).fill(null));
    }
    this.grid.layers.ground = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => mapLoader.makeCell('tile_grass'))
    );

    mapLoader.clearSpriteGrid(this.spriteGrid);
    mapLoader.buildFromGrid(this.scene, this.container, this.spriteGrid, this.grid);

    this.undoStack = [];
    this.redoStack = [];
    this._deselect();
    this.onChange();
  }

  undo() {
    const stroke = this.undoStack.pop();
    if (!stroke) return;
    for (const change of stroke) {
      this.grid.layers[change.layerName][change.row][change.col] = change.prevValue;
      mapLoader.placeTileAt(
        this.scene,
        this.container,
        this.spriteGrid,
        change.layerName,
        change.col,
        change.row,
        change.prevValue
      );
    }
    this.redoStack.push(stroke);
    this._deselect();
    this.onChange();
  }

  redo() {
    const stroke = this.redoStack.pop();
    if (!stroke) return;
    for (const change of stroke) {
      this.grid.layers[change.layerName][change.row][change.col] = change.newValue;
      mapLoader.placeTileAt(
        this.scene,
        this.container,
        this.spriteGrid,
        change.layerName,
        change.col,
        change.row,
        change.newValue
      );
    }
    this.undoStack.push(stroke);
    this._deselect();
    this.onChange();
  }

  _select(layerName, col, row) {
    this.selectedCell = { layerName, col, row };
  }

  _deselect() {
    this.selectedCell = null;
  }

  /** Modifie une seule cellule hors d'un glissé (clic, bouton du cadre
   * contextuel...) et l'enregistre comme une étape d'annulation à part entière. */
  _setCellWithUndo(layerName, col, row, newValue) {
    const prevValue = this.grid.layers[layerName][row][col];
    if (mapLoader.cellsEqual(prevValue, newValue)) return;

    this.grid.layers[layerName][row][col] = newValue;
    mapLoader.placeTileAt(this.scene, this.container, this.spriteGrid, layerName, col, row, newValue);

    this.undoStack.push([{ layerName, col, row, prevValue, newValue }]);
    this.redoStack = [];
    this.onChange();
  }

  _bindInput() {
    this.scene.input.on('pointerdown', (pointer) => {
      if (!this.active || this.tool === 'move') return;
      const { col, row } = mapLoader.screenToIso(pointer.worldX, pointer.worldY);

      this.isPointerDown = true;
      this.dragMode = 'none';
      this.strokeAnchor = { col, row };
      this.currentStrokeChanges = new Map();
      this._startedOnSelection =
        !!this.selectedCell &&
        this.selectedCell.layerName === this.activeLayer &&
        this.selectedCell.col === col &&
        this.selectedCell.row === row;
    });

    this.scene.input.on('pointermove', (pointer) => {
      if (!this.active || this.tool === 'move' || !this.isPointerDown || !pointer.isDown) return;

      if (this.dragMode === 'none' && pointer.getDistance() > DRAG_THRESHOLD) {
        this.dragMode = this._startedOnSelection ? 'move' : 'brush';
        if (this.dragMode === 'brush') this._deselect();
      }

      if (this.dragMode === 'brush') this._paintAt(pointer);
      else if (this.dragMode === 'move') this._previewMove(pointer);
    });

    this.scene.input.on('pointerup', (pointer) => {
      if (!this.active || this.tool === 'move' || !this.isPointerDown) return;

      if (this.dragMode === 'brush') {
        this._commitStroke();
      } else if (this.dragMode === 'move') {
        this._commitMove(pointer);
      } else {
        this._handleClick(this.strokeAnchor);
      }

      this.isPointerDown = false;
      this.dragMode = 'none';
      this.currentStrokeChanges = null;
      this.strokeAnchor = null;
    });

    window.addEventListener('keydown', this._boundKeyDown);
  }

  _onKeyDown(event) {
    if (!this.active) return;
    const key = event.key.toLowerCase();
    const ctrlOrCmd = event.ctrlKey || event.metaKey;

    if (ctrlOrCmd && key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
    } else if (ctrlOrCmd && (key === 'y' || (key === 'z' && event.shiftKey))) {
      event.preventDefault();
      this.redo();
    } else if (key === 'r') {
      if (this.selectedCell) this.rotateSelected();
      else this.cycleOrientation();
    } else if (key === 'delete' || key === 'backspace') {
      if (this.selectedCell) {
        event.preventDefault();
        this.deleteSelected();
      }
    } else if (key === 'escape') {
      this._deselect();
    } else if (key === 'v') {
      this.setMoveTool();
    }
  }

  /** `null` (efface) si l'outil Gomme est actif, sinon la texture du pinceau
   * (pertinent seulement en outil Peindre). */
  _currentBrushCell() {
    if (this.tool === 'erase') return null;
    return mapLoader.makeCell(this.brushKey, this.brushFlipX, this.brushFlipY);
  }

  /** Clic simple (pas de glissé) sur `{ col, row }`. */
  _handleClick({ col, row }) {
    if (col < 0 || col >= this.grid.width || row < 0 || row >= this.grid.height) {
      this._deselect();
      return;
    }

    const current = this.grid.layers[this.activeLayer][row][col];

    if (this.tool === 'erase') {
      if (current) this._setCellWithUndo(this.activeLayer, col, row, null);
      this._deselect();
      return;
    }

    if (current) {
      // Case déjà occupée : on la sélectionne pour ajustement (pivoter,
      // supprimer, déplacer) plutôt que de l'écraser avec le pinceau actuel.
      this._select(this.activeLayer, col, row);
      return;
    }

    // Case vide : pose la tuile actuelle puis la sélectionne aussitôt.
    this._setCellWithUndo(this.activeLayer, col, row, this._currentBrushCell());
    this._select(this.activeLayer, col, row);
  }

  _paintAt(pointer) {
    let { col, row } = mapLoader.screenToIso(pointer.worldX, pointer.worldY);

    // Maj maintenu : verrouille la pose sur l'axe (colonne ou ligne) dominant
    // depuis le début du glissé, pour tracer une ligne droite sans divaguer.
    if (this.shiftKey.isDown && this.strokeAnchor) {
      const dCol = col - this.strokeAnchor.col;
      const dRow = row - this.strokeAnchor.row;
      if (Math.abs(dCol) >= Math.abs(dRow)) {
        row = this.strokeAnchor.row;
      } else {
        col = this.strokeAnchor.col;
      }
    }

    if (col < 0 || col >= this.grid.width || row < 0 || row >= this.grid.height) return;

    const cellValue = this._currentBrushCell();
    const current = this.grid.layers[this.activeLayer][row][col];
    if (mapLoader.cellsEqual(current, cellValue)) return;

    if (this.currentStrokeChanges) {
      const key = `${this.activeLayer}:${row}:${col}`;
      if (!this.currentStrokeChanges.has(key)) {
        this.currentStrokeChanges.set(key, { layerName: this.activeLayer, col, row, prevValue: current });
      }
      this.currentStrokeChanges.get(key).newValue = cellValue;
    }

    this.grid.layers[this.activeLayer][row][col] = cellValue;
    mapLoader.placeTileAt(this.scene, this.container, this.spriteGrid, this.activeLayer, col, row, cellValue);
    this.onChange();
  }

  _commitStroke() {
    if (this.currentStrokeChanges && this.currentStrokeChanges.size > 0) {
      this.undoStack.push(Array.from(this.currentStrokeChanges.values()));
      this.redoStack = [];
    }
  }

  /** Pendant un glissé de déplacement : le sprite suit le pointeur librement,
   * pas encore casé sur la grille (le cadrage sur la grille n'a lieu qu'au
   * relâchement, voir _commitMove). */
  _previewMove(pointer) {
    const { layerName, col, row } = this.selectedCell;
    const sprite = this.spriteGrid[layerName]?.[row]?.[col];
    if (!sprite) return;
    sprite.x = pointer.worldX;
    sprite.y = pointer.worldY;
  }

  _commitMove(pointer) {
    const { layerName, col: oldCol, row: oldRow } = this.selectedCell;
    const cellValue = this.grid.layers[layerName][oldRow][oldCol];
    const { col: newCol, row: newRow } = mapLoader.screenToIso(pointer.worldX, pointer.worldY);

    const outOfBounds = newCol < 0 || newCol >= this.grid.width || newRow < 0 || newRow >= this.grid.height;
    const noRealMove = newCol === oldCol && newRow === oldRow;

    if (outOfBounds || noRealMove) {
      // Remet le sprite exactement à sa place d'origine (pendant l'aperçu, sa
      // position suivait librement le pointeur).
      mapLoader.placeTileAt(this.scene, this.container, this.spriteGrid, layerName, oldCol, oldRow, cellValue);
      return;
    }

    const destPrevValue = this.grid.layers[layerName][newRow][newCol];

    this.grid.layers[layerName][oldRow][oldCol] = null;
    this.grid.layers[layerName][newRow][newCol] = cellValue;

    mapLoader.placeTileAt(this.scene, this.container, this.spriteGrid, layerName, oldCol, oldRow, null);
    mapLoader.placeTileAt(this.scene, this.container, this.spriteGrid, layerName, newCol, newRow, cellValue);

    this.undoStack.push([
      { layerName, col: oldCol, row: oldRow, prevValue: cellValue, newValue: null },
      { layerName, col: newCol, row: newRow, prevValue: destPrevValue, newValue: cellValue },
    ]);
    this.redoStack = [];

    this._select(layerName, newCol, newRow);
    this.onChange();
  }

  /** Retire l'écouteur clavier global — à appeler quand la scène se ferme. */
  destroy() {
    window.removeEventListener('keydown', this._boundKeyDown);
  }
}
