import * as mapLoader from '../mapLoader.js';

const LAYER_LABELS = {
  ground: 'Sol',
  roads: 'Routes',
  buildings: 'Bâtiments',
  details: 'Détails',
};

// Pour les cartes de la palette utilisant une sprite-sheet (une seule frame à
// montrer en miniature, pas la feuille entière) — recopié de TEXTURE_CROP dans
// mapLoader.js, avec en plus la taille totale de l'image pour le positionnement
// CSS background-size/position.
const SPRITE_THUMB = {
  char_worker: { x: 0, y: 0, width: 508, height: 774, fullWidth: 2032, fullHeight: 774 },
  vehicle_tricycle: { x: 0, y: 0, width: 724, height: 724, fullWidth: 2172, fullHeight: 724 },
  vehicle_camion: { x: 0, y: 0, width: 724, height: 724, fullWidth: 2172, fullHeight: 724 },
};

const ICON_SIZE = 40;

/**
 * UI d'édition en overlay DOM (pas dans le canvas Phaser), en 3 morceaux
 * indépendants :
 * - bouton "Mode édition" (haut droite) + panneau (calques, gomme, actions) ;
 * - rappel des raccourcis clavier (haut gauche) ;
 * - palette flottante sans fond (bas centre), filtrée par calque actif —
 *   voir mapLoader.LAYER_PALETTE.
 * Réorganisation du 2026-09-23 à la demande de l'utilisateur (façon panneau
 * Figma : sections repliables + palette contextuelle en cartes).
 */
export class EditorPanel {
  constructor({
    onToggle,
    onLayerChange,
    onLayerVisibilityChange,
    onBrushChange,
    onExport,
    onImport,
    onClearSaved,
    onResetToGrass,
    onRotateBrush,
    onMoveTool,
    onEraseTool,
  }) {
    this.onToggle = onToggle;
    this.onLayerChange = onLayerChange;
    this.onLayerVisibilityChange = onLayerVisibilityChange;
    this.onResetToGrass = onResetToGrass;
    this.onBrushChange = onBrushChange;
    this.onExport = onExport;
    this.onImport = onImport;
    this.onClearSaved = onClearSaved;
    this.onRotateBrush = onRotateBrush;
    this.onMoveTool = onMoveTool;
    this.onEraseTool = onEraseTool;

    this.active = false;
    this.activeLayer = 'ground';
    this.selectedCard = null;
    this._currentTool = 'move';
    this._currentBrushKey = null;
    this._currentFlipX = false;
    this._currentFlipY = false;

    this._injectStyles();
    this._buildDom();
  }

  _injectStyles() {
    if (document.getElementById('ne-editor-styles')) return;

    const style = document.createElement('style');
    style.id = 'ne-editor-styles';
    style.textContent = `
      .ne-toggle-btn {
        position: fixed; top: 16px; right: 16px; z-index: 1000;
        font: 14px system-ui, sans-serif;
        background: #1b1712; color: #f1e9d2; border: 2px solid #6b5a46;
        border-radius: 8px; padding: 10px 16px; cursor: pointer;
      }
      .ne-toggle-btn.active { background: #1f5e52; border-color: #c79a3b; }

      .ne-panel {
        position: fixed; top: 64px; right: 16px; z-index: 1000;
        width: 280px; max-height: calc(100vh - 96px); overflow-y: auto;
        background: #1b1712ee; color: #f1e9d2; border: 2px solid #6b5a46;
        border-radius: 8px; padding: 12px; font: 13px system-ui, sans-serif;
      }
      .ne-panel[hidden] { display: none; }

      .ne-hint {
        position: fixed; top: 16px; left: 16px; z-index: 1000;
        font: 12px system-ui, sans-serif; line-height: 1.6; color: #c79a3b;
        background: #1b1712ee; border: 2px solid #6b5a46; border-radius: 8px;
        padding: 10px 12px;
      }
      .ne-hint[hidden] { display: none; }
      .ne-hint kbd {
        background: #6b5a46; color: #f1e9d2; border-radius: 3px; padding: 1px 5px;
        font-family: inherit;
      }

      .ne-section {
        border: 1px solid #6b5a46; border-radius: 6px; margin-bottom: 10px; overflow: hidden;
      }
      .ne-section-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 10px; cursor: pointer; background: #6b5a4640;
        font-weight: bold; color: #c79a3b; user-select: none;
      }
      .ne-section-chevron { display: inline-block; transition: transform 0.15s; }
      .ne-section-chevron.collapsed { transform: rotate(-90deg); }
      .ne-section-body { padding: 8px 10px; }
      .ne-section-body[hidden] { display: none; }

      .ne-layer-row { display: flex; align-items: center; gap: 6px; padding: 3px 0; }
      .ne-layer-row label { flex: 1; cursor: pointer; }

      .ne-swatches { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
      .ne-eraser-card .ne-palette-card-icon { background-color: #a23b2a; color: #f1e9d2; }

      .ne-export-btn, .ne-clear-btn, .ne-rotate-btn {
        width: 100%; margin-top: 8px; padding: 8px; border-radius: 6px; border: none;
        cursor: pointer; font: 13px system-ui, sans-serif;
      }
      .ne-export-btn { background: #1f5e52; color: #f1e9d2; }
      .ne-clear-btn { background: #a23b2a; color: #f1e9d2; }
      .ne-rotate-btn { background: #6b5a46; color: #f1e9d2; }
      .ne-orientation-label { font-size: 12px; color: #8c7860; margin: 8px 0 -2px; }

      .ne-floating-palette {
        position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 1000;
        display: flex; gap: 8px; padding: 4px; max-width: 92vw; overflow-x: auto;
        background: none; border: none;
      }
      .ne-floating-palette[hidden] { display: none; }
      .ne-palette-card {
        flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 4px;
        background: #1b1712dd; border: 2px solid #6b5a46; border-radius: 8px;
        padding: 6px; cursor: pointer; width: 60px;
      }
      .ne-palette-card.selected { border-color: #c79a3b; box-shadow: 0 0 0 2px #c79a3b; }
      .ne-palette-card-icon {
        width: ${ICON_SIZE}px; height: ${ICON_SIZE}px; border-radius: 4px;
        background-color: #4c6b3f; background-repeat: no-repeat;
        display: flex; align-items: center; justify-content: center; font-size: 16px;
      }
      .ne-palette-card-label {
        font: 10px system-ui, sans-serif; color: #f1e9d2; text-align: center;
        line-height: 1.2;
      }
    `;
    document.head.appendChild(style);
  }

  _buildDom() {
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.type = 'button';
    this.toggleBtn.className = 'ne-toggle-btn';
    this.toggleBtn.textContent = '✏️ Mode édition';
    this.toggleBtn.addEventListener('click', () => this._toggle());
    document.body.appendChild(this.toggleBtn);

    this._buildHint();

    this.panel = document.createElement('div');
    this.panel.className = 'ne-panel';
    this.panel.hidden = true;
    document.body.appendChild(this.panel);

    this._renderViewSection();
    this._renderEditSection();
    this._renderToolsSection();
    this._renderActionsSection();

    this._buildFloatingPalette();
    this._renderFloatingPalette();
  }

  _buildHint() {
    this.hint = document.createElement('div');
    this.hint.className = 'ne-hint';
    this.hint.hidden = true;
    this.hint.innerHTML =
      '<kbd>V</kbd> se déplacer &nbsp; <kbd>glisser</kbd> peindre &nbsp; <kbd>Maj</kbd>+glisser ligne droite<br>' +
      '<kbd>Ctrl</kbd>+<kbd>Z</kbd> annuler &nbsp; <kbd>Ctrl</kbd>+<kbd>Y</kbd> rétablir<br>' +
      '<kbd>R</kbd> pivoter &nbsp; <kbd>Suppr</kbd> supprimer &nbsp; <kbd>Échap</kbd> désélectionner';
    document.body.appendChild(this.hint);
  }

  _toggle() {
    this.active = !this.active;
    this.toggleBtn.classList.toggle('active', this.active);
    this.toggleBtn.textContent = this.active ? '✅ Édition active' : '✏️ Mode édition';
    this.panel.hidden = !this.active;
    this.hint.hidden = !this.active;
    this.floatingPalette.hidden = !this.active;
    this.onToggle(this.active);
  }

  /** Crée une section repliable (façon panneau Figma) et retourne son corps
   * (`body`), où l'appelant ajoute son propre contenu. */
  _createSection(title, collapsedByDefault) {
    const section = document.createElement('div');
    section.className = 'ne-section';

    const header = document.createElement('div');
    header.className = 'ne-section-header';

    const label = document.createElement('span');
    label.textContent = title;

    const chevron = document.createElement('span');
    chevron.className = 'ne-section-chevron';
    chevron.textContent = '▾';
    chevron.classList.toggle('collapsed', collapsedByDefault);

    header.appendChild(label);
    header.appendChild(chevron);

    const body = document.createElement('div');
    body.className = 'ne-section-body';
    body.hidden = collapsedByDefault;

    header.addEventListener('click', () => {
      body.hidden = !body.hidden;
      chevron.classList.toggle('collapsed', body.hidden);
    });

    section.appendChild(header);
    section.appendChild(body);
    this.panel.appendChild(section);

    return body;
  }

  /** Section "Vue" (repliée par défaut) : uniquement la visibilité de chaque
   * calque, en checklist — séparée du choix du calque actif (voir "Modifier
   * espace" ci-dessous). */
  _renderViewSection() {
    const body = this._createSection('Vue', true);

    for (const layerName of mapLoader.LAYER_NAMES) {
      const row = document.createElement('div');
      row.className = 'ne-layer-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.id = `ne-visible-${layerName}`;
      checkbox.addEventListener('change', () => {
        this.onLayerVisibilityChange(layerName, checkbox.checked);
      });

      const label = document.createElement('label');
      label.textContent = LAYER_LABELS[layerName];
      label.htmlFor = checkbox.id;

      row.appendChild(checkbox);
      row.appendChild(label);
      body.appendChild(row);
    }
  }

  /** Section "Modifier espace" (dépliée par défaut, c'est l'action
   * principale) : le calque actif pour l'édition, en radio. */
  _renderEditSection() {
    const body = this._createSection('Modifier espace', false);

    for (const layerName of mapLoader.LAYER_NAMES) {
      const row = document.createElement('div');
      row.className = 'ne-layer-row';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'ne-active-layer';
      radio.id = `ne-layer-${layerName}`;
      radio.checked = layerName === this.activeLayer;
      radio.addEventListener('change', () => {
        this.activeLayer = layerName;
        this.onLayerChange(layerName);
        this._renderFloatingPalette();
      });

      const label = document.createElement('label');
      label.textContent = LAYER_LABELS[layerName];
      label.htmlFor = radio.id;

      row.appendChild(radio);
      row.appendChild(label);
      body.appendChild(row);
    }
  }

  /** Gomme + orientation + pivoter — restent dans le panneau latéral (pas
   * dans la palette flottante), à la demande de l'utilisateur. */
  _renderToolsSection() {
    const toolsRow = document.createElement('div');
    toolsRow.className = 'ne-swatches';
    toolsRow.appendChild(this._createEraserSwatch());
    this.panel.appendChild(toolsRow);

    this.orientationLabel = document.createElement('div');
    this.orientationLabel.className = 'ne-orientation-label';
    this.orientationLabel.textContent = 'Orientation : normale';
    this.panel.appendChild(this.orientationLabel);

    const rotateBtn = document.createElement('button');
    rotateBtn.type = 'button';
    rotateBtn.className = 'ne-rotate-btn';
    rotateBtn.textContent = '🔄 Pivoter (R)';
    rotateBtn.addEventListener('click', () => this.onRotateBrush());
    this.panel.appendChild(rotateBtn);
  }

  _createEraserSwatch() {
    // Même structure que les cartes de la palette (icône + nom visible, pas
    // juste une info-bulle au survol) — nommée "Gomme" et coloriée en rouge
    // (palette verrouillée #A23B2A) à la demande de l'utilisateur.
    const card = this._createToolCard('✖', 'Gomme', () => this.onEraseTool());
    card.classList.add('ne-eraser-card');
    this._eraserBtn = card;
    return card;
  }

  _buildFloatingPalette() {
    this.floatingPalette = document.createElement('div');
    this.floatingPalette.className = 'ne-floating-palette';
    this.floatingPalette.hidden = true;
    document.body.appendChild(this.floatingPalette);

    // Carte "Déplacer" : permanente, jamais filtrée par calque (c'est un
    // outil de navigation, pas un asset à poser) — conservée en mémoire pour
    // être réinsérée à chaque _renderFloatingPalette().
    this.moveCard = this._createToolCard('✋', 'Se déplacer', () => this.onMoveTool());
    this.floatingPalette.appendChild(this.moveCard);
  }

  _createToolCard(iconText, label, onClick) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'ne-palette-card';
    card.title = label;

    const icon = document.createElement('div');
    icon.className = 'ne-palette-card-icon';
    icon.textContent = iconText;

    const labelEl = document.createElement('div');
    labelEl.className = 'ne-palette-card-label';
    labelEl.textContent = label;

    card.appendChild(icon);
    card.appendChild(labelEl);
    card.addEventListener('click', onClick);
    return card;
  }

  /** Re-remplit la palette flottante avec la carte "Déplacer" (permanente) +
   * uniquement les assets du calque actif (voir mapLoader.LAYER_PALETTE) —
   * appelée au démarrage et à chaque changement de calque actif. */
  _renderFloatingPalette() {
    this.floatingPalette.innerHTML = '';
    this.floatingPalette.appendChild(this.moveCard);

    const items = mapLoader.LAYER_PALETTE[this.activeLayer] ?? [];
    for (const item of items) {
      this.floatingPalette.appendChild(this._createPaletteCard(item));
    }

    this._applyToolHighlight();
  }

  /** Reflète l'outil actuellement actif (Déplacer/Gomme/Peindre) sur les
   * bons éléments DOM — source unique de vérité pour le surlignage, appelée
   * aussi bien après un clic que via setActiveTool() (déclenché par un
   * raccourci clavier côté MapEditor). */
  _applyToolHighlight() {
    this.moveCard?.classList.remove('selected');
    this._eraserBtn?.classList.remove('selected');
    this.floatingPalette.querySelectorAll('.ne-palette-card').forEach((card) => {
      card.classList.remove('selected');
      const icon = card.querySelector('.ne-palette-card-icon');
      if (icon) icon.style.transform = '';
    });
    this.selectedCard = null;

    if (this._currentTool === 'move') {
      this.moveCard?.classList.add('selected');
    } else if (this._currentTool === 'erase') {
      this._eraserBtn?.classList.add('selected');
    } else if (this._currentTool === 'paint') {
      const card = this.floatingPalette.querySelector(`[data-key="${this._currentBrushKey}"]`);
      if (card) {
        card.classList.add('selected');
        this.selectedCard = card;
        // L'orientation peut arriver avant ce surlignage (setBrush() côté
        // MapEditor envoie onOrientationChange avant onToolChange) — la
        // ré-appliquer ici sur la BONNE carte plutôt que de dépendre de
        // l'ordre d'appel des deux callbacks.
        const icon = card.querySelector('.ne-palette-card-icon');
        if (icon) icon.style.transform = `scaleX(${this._currentFlipX ? -1 : 1}) scaleY(${this._currentFlipY ? -1 : 1})`;
      }
    }
  }

  /** Appelé depuis MapScene, branché sur MapEditor.onToolChange — reste la
   * source de vérité même quand l'outil change via un raccourci clavier
   * (V, ou la Gomme n'a pas de raccourci mais suit le même chemin). */
  setActiveTool(tool, brushKey) {
    this._currentTool = tool;
    this._currentBrushKey = brushKey;
    this._applyToolHighlight();
  }

  _createPaletteCard(item) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'ne-palette-card';
    card.title = item.label;
    card.dataset.key = item.key;

    const icon = document.createElement('div');
    icon.className = 'ne-palette-card-icon';

    if (item.key === 'tile_water') {
      icon.style.backgroundColor = '#1f5e52';
      icon.textContent = '💧';
    } else {
      const path = mapLoader.ASSET_PATHS[item.key];
      const thumb = SPRITE_THUMB[item.key];
      icon.style.backgroundImage = `url("${path}")`;
      if (thumb) {
        const scale = ICON_SIZE / thumb.width;
        icon.style.backgroundSize = `${thumb.fullWidth * scale}px ${thumb.fullHeight * scale}px`;
        icon.style.backgroundPosition = `-${thumb.x * scale}px -${thumb.y * scale}px`;
      } else {
        icon.style.backgroundSize = 'contain';
        icon.style.backgroundPosition = 'center';
      }
    }

    const label = document.createElement('div');
    label.className = 'ne-palette-card-label';
    label.textContent = item.label;

    card.appendChild(icon);
    card.appendChild(label);

    // Se contente d'appeler le callback : setActiveTool() (déclenché en
    // retour par MapEditor.onToolChange) gère tout le surlignage — voir
    // _applyToolHighlight().
    card.addEventListener('click', () => this.onBrushChange(item.key));

    return card;
  }

  /** Reflète l'orientation courante du pinceau (miroir horizontal/vertical) sur
   * la carte sélectionnée et le texte d'état — appelé à chaque cycleOrientation()
   * côté MapEditor (touche R ou bouton "Pivoter"). */
  setOrientationPreview(flipX, flipY) {
    this._currentFlipX = flipX;
    this._currentFlipY = flipY;
    if (this.selectedCard) {
      const icon = this.selectedCard.querySelector('.ne-palette-card-icon');
      icon.style.transform = `scaleX(${flipX ? -1 : 1}) scaleY(${flipY ? -1 : 1})`;
    }
    const labels = {
      'false,false': 'normale',
      'true,false': 'miroir horizontal',
      'false,true': 'miroir vertical',
      'true,true': 'miroir horizontal + vertical',
    };
    this.orientationLabel.textContent = `Orientation : ${labels[`${flipX},${flipY}`]}`;
  }

  _renderActionsSection() {
    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'ne-export-btn';
    exportBtn.textContent = '💾 Exporter la carte (JSON)';
    exportBtn.addEventListener('click', () => this.onExport());
    this.panel.appendChild(exportBtn);

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = 'application/json,.json';
    importInput.hidden = true;
    importInput.addEventListener('change', () => {
      const file = importInput.files[0];
      if (file) this.onImport(file);
      importInput.value = ''; // permet de réimporter le même fichier une deuxième fois
    });
    this.panel.appendChild(importInput);

    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'ne-export-btn';
    importBtn.textContent = '📂 Importer une carte (JSON)';
    importBtn.addEventListener('click', () => importInput.click());
    this.panel.appendChild(importBtn);

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'ne-clear-btn';
    resetBtn.textContent = '🌱 Tout effacer (garder l\'herbe)';
    resetBtn.title = 'Vide routes/bâtiments/détails et remplit le sol entier d\'herbe';
    resetBtn.addEventListener('click', () => {
      const ok = window.confirm(
        'Tout effacer sauf l\'herbe ? Cette action écrase toute l\'édition en cours et ne peut pas être annulée.'
      );
      if (ok) this.onResetToGrass();
    });
    this.panel.appendChild(resetBtn);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'ne-clear-btn';
    clearBtn.textContent = '↺ Revenir à la carte importée de Tiled';
    clearBtn.title = 'Efface la sauvegarde locale et recharge la conversion Tiled d\'origine';
    clearBtn.addEventListener('click', () => this.onClearSaved());
    this.panel.appendChild(clearBtn);
  }

  /** Retire les éléments DOM du panneau — à appeler avant de recréer un
   * EditorPanel (ex. scene.restart()), sinon les boutons se dupliquent. */
  destroy() {
    this.toggleBtn.remove();
    this.hint.remove();
    this.panel.remove();
    this.floatingPalette.remove();
  }
}
