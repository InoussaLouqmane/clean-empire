import { isoToScreen } from '../mapLoader.js';
import { ECONOMY } from './economy.js';
import { GameState } from './GameState.js';
import { CityBuildings } from './CityBuildings.js';
import { listCityBuildings } from './buildingRegistry.js';
import { DialogueManager } from './DialogueManager.js';
import { bus } from './events.js';
import { worldToScreen } from './screen.js';
import { loadSave, clearSave } from './save.js';
import { Hud } from './ui/Hud.js';
import { BuildingMenu } from './ui/BuildingMenu.js';
import { ShopPanel } from './ui/ShopPanel.js';
import { DialogueBox } from './ui/DialogueBox.js';
import { Guide } from './ui/Guide.js';
import { askPlayerName } from './ui/NameInput.js';
import { showLevelComplete } from './ui/LevelComplete.js';
import { CONTRACTS, KARIM_HOUSE } from './level1/script.js';
import { runLevel1 } from './level1/Level1Tutorial.js';
import './ui/game-ui.css';

const DEFAULT_PLAYER_NAME = 'Ange'; // si le joueur ne saisit pas de prénom (décision du 2026-09-24)
const FOCUS_ZOOM = 1.6; // zoom des dialogues « complets » vers un bâtiment
const FOCUS_SCREEN_Y = 0.36; // la cible est cadrée dans le tiers haut (la bulle est au centre)
const FOCUS_MS = 700;

/**
 * Le jeu proprement dit, posé sur la carte de MapScene : état de la partie,
 * bâtiments (tous cliquables), HUD, boutique, dialogue, guidage, tutoriel.
 * `mode` : 'new' (efface la sauvegarde) ou 'resume'.
 */
export class GameController {
  constructor(scene, { spriteGrid, grid, mode = 'new' }) {
    this.scene = scene;
    if (mode === 'new') clearSave();
    const saved = mode === 'resume' ? loadSave() : null;

    const contracts = resolveContracts(grid);
    this.cityBuildings = listCityBuildings(grid, contracts);
    const contractEntries = this.cityBuildings.filter((b) => b.contract);
    this.contractCells = contractEntries;
    this.state = new GameState(saved ?? {}, contractEntries);

    this.root = document.createElement('div');
    this.root.className = 'game-ui';
    document.body.appendChild(this.root);

    this.buildings = new CityBuildings(scene, spriteGrid, this.cityBuildings, this.state);
    this.hud = new Hud(this.root, this.state, {
      onShop: ({ forceOpen } = {}) => (forceOpen ? this.shop.open() : this.shop.toggle()),
    });
    this.buildingMenu = new BuildingMenu(this.root, this.state, this.cityBuildings);
    this.shop = new ShopPanel(this.root, this.state);
    this.guide = new Guide(this.root, scene, this.buildings);
    this.dialogueBox = new DialogueBox(this.root);
    this.dialogue = new DialogueManager(this.dialogueBox, this.state, { focus: (t) => this._focus(t) });

    // Ouvrir la boutique ferme la fiche d'un bâtiment (et inversement).
    this._offs = [
      bus.on('shop_opened', () => this.buildingMenu.close()),
      bus.on('building_clicked', () => this.shop.close()),
    ];

    this.hud.setVisible(false);

    // Accès de test (?debug dans l'URL uniquement) : état de la partie et
    // position écran des bâtiments — utilisé par les tests automatisés.
    if (new URLSearchParams(window.location.search).has('debug')) {
      window.__CLEAN_CEO__ = {
        state: this.state,
        buildings: this.cityBuildings,
        guide: this.guide,
        buildingScreenPos: (id) => {
          const p = this.buildings.worldPositionOf(id);
          return p && worldToScreen(scene.cameras.main, p.x, p.y - 20);
        },
      };
    }

    this._start();
  }

  async _start() {
    if (!this.state.playerName) {
      this.buildings.setGreyed(true);
      const name = await askPlayerName(this.root);
      this.state.setPlayerName(name || DEFAULT_PLAYER_NAME);
    }

    await runLevel1({
      state: this.state,
      dialogue: this.dialogue,
      buildings: this.buildings,
      buildingMenu: this.buildingMenu,
      shop: this.shop,
      hud: this.hud,
      guide: this.guide,
      pulse,
      revealCity: () => this._panZoom(this._cityCenter(), 1.1, 1200),
      onLevelComplete: () => showLevelComplete(this.root, this.state, { onContinue: () => {} }),
    });

    // Tutoriel terminé (ou déjà fini à la reprise) : jeu libre.
    this.guide.clear();
    this.buildings.setGreyed(false);
    this.hud.setVisible(true);
  }

  // --------------------------------------------------------------- caméra

  _cityCenter() {
    const pts = this.contractCells.map(({ col, row }) => isoToScreen(col, row));
    return {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
  }

  /** Point monde d'une cible de dialogue ('karim_house', 'city' ou id). */
  _targetPoint(target) {
    if (target === 'karim_house') {
      const p = isoToScreen(KARIM_HOUSE.col, KARIM_HOUSE.row);
      return { x: p.x, y: p.y - 30 };
    }
    if (target === 'city') return this._cityCenter();
    return this.buildings.centerOf(target);
  }

  /**
   * Zoom caméra vers une cible (dialogue « complet »), cadrée dans le tiers
   * haut de l'écran pour que la bulle centrée ne la cache pas. Renvoie une
   * fonction qui ramène la caméra à sa vue d'avant (dézoom).
   */
  async _focus(target) {
    const cam = this.scene.cameras.main;
    const before = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom };
    const p = this._targetPoint(target);
    if (!p) return async () => {};
    const zoom = target === 'city' ? 1.1 : FOCUS_ZOOM;
    const z = Math.max(zoom, this.scene.cameraController.minZoom);
    const dy = ((0.5 - FOCUS_SCREEN_Y) * cam.height) / z;
    await this._panZoom({ x: p.x, y: p.y + dy }, zoom, FOCUS_MS);
    return () => this._panZoom(before, before.zoom, FOCUS_MS);
  }

  _panZoom({ x, y }, zoom, duration) {
    const cam = this.scene.cameras.main;
    const z = Math.max(zoom, this.scene.cameraController.minZoom);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!duration || reduceMotion) {
      cam.setZoom(z);
      cam.centerOn(x, y);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      cam.pan(x, y, duration, 'Sine.easeInOut', true);
      cam.zoomTo(z, duration, 'Sine.easeInOut', true, (_c, progress) => {
        if (progress === 1) resolve();
      });
    });
  }

  /** À chaque frame (MapScene.update). */
  update() {
    const now = Date.now();
    this.state.tick(now);
    this.buildings.update(now);
    this.buildingMenu.update(this.scene.cameras.main, (id) => this.buildings.anchorOf(id));
    this.guide.update();
  }

  destroy() {
    this.dialogue.cancel();
    for (const off of this._offs) off();
    this.buildings.destroy();
    this.hud.destroy();
    this.buildingMenu.destroy();
    this.shop.destroy();
    this.guide.destroy();
    this.dialogueBox.destroy();
    this.root.remove();
  }
}

/** Les 3 contrats du script (avec leur client), ou à défaut les premiers restaurants. */
function resolveContracts(grid) {
  const at = (c) => grid.layers.buildings[c.row]?.[c.col]?.key === 'building_restaurant';
  let list = CONTRACTS;
  if (!CONTRACTS.every(at)) {
    const found = [];
    grid.layers.buildings.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell?.key === 'building_restaurant') found.push({ col: c, row: r });
      })
    );
    list = CONTRACTS.map((contract, i) => ({ ...contract, ...(found[i] ?? contract) }));
  }
  return list.map((c) => ({ ...c, client: ECONOMY.clients.building_restaurant }));
}

/** Pulsation d'attention sur un élément d'UI (tutoriel) ; renvoie l'arrêt. */
function pulse(el) {
  el?.classList.add('tuto-pulse');
  return () => el?.classList.remove('tuto-pulse');
}
