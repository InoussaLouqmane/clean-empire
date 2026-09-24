import { isoToScreen } from '../mapLoader.js';
import { GameState } from './GameState.js';
import { ContractBuildings } from './ContractBuildings.js';
import { DialogueManager } from './DialogueManager.js';
import { bus } from './events.js';
import { worldToScreen } from './screen.js';
import { loadSave, clearSave } from './save.js';
import { Hud } from './ui/Hud.js';
import { BuildingMenu } from './ui/BuildingMenu.js';
import { ShopPanel } from './ui/ShopPanel.js';
import { DialogueBox } from './ui/DialogueBox.js';
import { askPlayerName } from './ui/NameInput.js';
import { showLevelComplete } from './ui/LevelComplete.js';
import { CONTRACTS, KARIM_HOUSE } from './level1/script.js';
import { runLevel1 } from './level1/Level1Tutorial.js';
import './ui/game-ui.css';

/**
 * Le jeu proprement dit, posé sur la carte de MapScene : état de la partie,
 * bâtiments sous contrat, HUD, boutique, dialogue, tutoriel du niveau 1.
 * `mode` : 'new' (efface la sauvegarde) ou 'resume'.
 */
export class GameController {
  constructor(scene, { spriteGrid, grid, mode = 'new' }) {
    this.scene = scene;
    if (mode === 'new') clearSave();
    const saved = mode === 'resume' ? loadSave() : null;
    this.state = new GameState(saved ?? {});

    this.root = document.createElement('div');
    this.root.className = 'game-ui';
    document.body.appendChild(this.root);

    const contracts = resolveContracts(grid);
    this.contracts = new ContractBuildings(scene, spriteGrid, contracts, this.state);
    this.hud = new Hud(this.root, this.state, { onShop: () => this.shop.toggle() });
    this.buildingMenu = new BuildingMenu(this.root, this.state, contracts);
    this.shop = new ShopPanel(this.root, this.state);
    this.dialogueBox = new DialogueBox(this.root);
    this.dialogue = new DialogueManager(this.dialogueBox, this.state);

    // Ouvrir la boutique ferme le menu d'un bâtiment (et inversement).
    this._offs = [
      bus.on('shop_opened', () => this.buildingMenu.close()),
      bus.on('building_clicked', () => this.shop.close()),
    ];

    this.hud.setVisible(false);

    // Accès de test (?debug dans l'URL uniquement) : position écran des
    // bâtiments, état de la partie — utilisé par les tests automatisés.
    if (new URLSearchParams(window.location.search).has('debug')) {
      window.__CLEAN_CEO__ = {
        state: this.state,
        buildingScreenPos: (id) => {
          const p = this.contracts.worldPositionOf(id);
          return p && worldToScreen(scene.cameras.main, p.x, p.y - 20);
        },
      };
    }

    this._start(contracts);
  }

  async _start(contracts) {
    if (!this.state.playerName) {
      this.contracts.setGreyed(true);
      this.state.setPlayerName(await askPlayerName(this.root));
    }

    await runLevel1({
      state: this.state,
      dialogue: this.dialogue,
      contracts: this.contracts,
      buildingMenu: this.buildingMenu,
      shop: this.shop,
      hud: this.hud,
      pulse,
      camera: {
        focusKarimHouse: () => this._focus(KARIM_HOUSE, 1.7, 0),
        revealCity: () => this._focusMany(contracts, 1.1, 1200),
      },
      onLevelComplete: () => showLevelComplete(this.root, this.state, { onContinue: () => {} }),
    });

    // Tutoriel terminé (ou déjà fini à la reprise) : jeu libre.
    this.contracts.setGreyed(false);
    this.hud.setVisible(true);
  }

  _focus({ col, row }, zoom, duration) {
    const { x, y } = isoToScreen(col, row);
    return this._panZoom(x, y, zoom, duration);
  }

  _focusMany(cells, zoom, duration) {
    const pts = cells.map(({ col, row }) => isoToScreen(col, row));
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return this._panZoom(x, y, zoom, duration);
  }

  _panZoom(x, y, zoom, duration) {
    const cam = this.scene.cameras.main;
    const z = Math.max(zoom, this.scene.cameraController.minZoom);
    if (!duration) {
      cam.setZoom(z);
      cam.centerOn(x, y);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      cam.pan(x, y, duration, 'Sine.easeInOut');
      cam.zoomTo(z, duration, 'Sine.easeInOut', false, (_c, progress) => {
        if (progress === 1) resolve();
      });
    });
  }

  /** À chaque frame (MapScene.update). */
  update() {
    const now = Date.now();
    this.state.tick(now);
    this.contracts.update(now);
    this.buildingMenu.update(this.scene.cameras.main, (id) => this.contracts.anchorOf(id));
  }

  destroy() {
    this.dialogue.cancel();
    for (const off of this._offs) off();
    this.contracts.destroy();
    this.hud.destroy();
    this.buildingMenu.destroy();
    this.shop.destroy();
    this.dialogueBox.destroy();
    this.root.remove();
  }
}

/** Les 3 contrats du script, ou à défaut les premiers restaurants de la carte. */
function resolveContracts(grid) {
  const at = (c) => grid.layers.buildings[c.row]?.[c.col]?.key === 'building_restaurant';
  if (CONTRACTS.every(at)) return CONTRACTS;
  const found = [];
  grid.layers.buildings.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell?.key === 'building_restaurant') found.push({ col: c, row: r });
    })
  );
  return CONTRACTS.map((contract, i) => ({ ...contract, ...(found[i] ?? contract) }));
}

/** Pulsation d'attention sur un élément d'UI (tutoriel) ; renvoie l'arrêt. */
function pulse(el) {
  el?.classList.add('tuto-pulse');
  return () => el?.classList.remove('tuto-pulse');
}
