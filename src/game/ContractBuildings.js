import Phaser from 'phaser';
import { TILE_WIDTH, TILE_HEIGHT, isoToScreen } from '../mapLoader.js';
import { bus } from './events.js';

const CLICK_MAX_DRAG_PX = 6; // au-delà, c'est un glissé de caméra, pas un clic
const GREY_TINT = 0x8a8a8a;
const HOVER_TINT = 0xfff4d6;

/**
 * Bâtiments sous contrat (les 3 restaurants du niveau 1) côté Phaser :
 * clic, survol, marqueur au sol, loader de collecte, gains flottants.
 *
 * Clic : zone interactive définie en coordonnées LOCALES à la texture du
 * sprite (règle de CLAUDE.md : jamais getTileAtWorldXY sur l'isométrique).
 * Un clic n'est pris en compte que si le pointeur n'a presque pas bougé,
 * pour ne pas confondre avec un glissé de caméra.
 */
export class ContractBuildings {
  constructor(scene, spriteGrid, contracts, state) {
    this.scene = scene;
    this.state = state;
    this.enabled = true;
    this.greyed = false;
    this.items = new Map();

    for (const contract of contracts) {
      const sprite = spriteGrid.buildings[contract.row]?.[contract.col];
      if (!sprite) continue;
      this.items.set(contract.id, this._setup(contract, sprite));
    }

    this._offFinished = bus.on('collection_finished', ({ id, reward }) => this._floatReward(id, reward));
  }

  _setup(contract, sprite) {
    const frame = sprite.frame;
    sprite.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, frame.width, frame.height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    sprite.on('pointerover', () => {
      if (this.enabled && !this.greyed) sprite.setTint(HOVER_TINT);
    });
    sprite.on('pointerout', () => this._applyTint(sprite));
    sprite.on('pointerup', (pointer) => {
      if (!this.enabled || this.greyed) return;
      if (pointer.getDistance() > CLICK_MAX_DRAG_PX) return;
      bus.emit('building_clicked', { id: contract.id });
    });

    // Marqueur au sol (losange doré) : "ce bâtiment est à toi / sélectionné".
    const { x, y } = isoToScreen(contract.col, contract.row);
    const marker = this.scene.add.graphics().setDepth(-120000).setPosition(x, y);
    marker
      .fillStyle(0xc79a3b, 0.35)
      .lineStyle(2, 0xc79a3b, 0.95)
      .beginPath()
      .moveTo(0, -TILE_HEIGHT / 2)
      .lineTo(TILE_WIDTH / 2, 0)
      .lineTo(0, TILE_HEIGHT / 2)
      .lineTo(-TILE_WIDTH / 2, 0)
      .closePath()
      .fillPath()
      .strokePath();
    marker.setVisible(false);

    // Loader circulaire au-dessus du bâtiment.
    const top = sprite.y - sprite.displayHeight * 0.9;
    const loader = this.scene.add.graphics().setDepth(950000).setPosition(sprite.x, top - 16);
    const loaderText = this.scene.add
      .text(sprite.x, top - 16, '', {
        fontFamily: 'Oxanium, sans-serif',
        fontSize: '11px',
        fontStyle: '700',
        color: '#f1e9d2',
      })
      .setOrigin(0.5)
      .setDepth(950001)
      .setResolution(3);

    return { contract, sprite, marker, loader, loaderText, top, pulseTween: null, highlighted: false };
  }

  _applyTint(sprite) {
    if (this.greyed) sprite.setTint(GREY_TINT);
    else sprite.clearTint();
  }

  /** Grisé = visibles mais non interactifs (début du tutoriel). */
  setGreyed(greyed) {
    this.greyed = greyed;
    for (const item of this.items.values()) {
      this._applyTint(item.sprite);
      item.sprite.input.cursor = greyed ? 'default' : 'pointer';
    }
  }

  /** Désactive tous les clics (mode édition, écran de fin…). */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /** Surligne un bâtiment (marqueur au sol + pulsation) ; `ids` vide = aucun. */
  setHighlight(ids, { pulse = true } = {}) {
    const wanted = new Set(Array.isArray(ids) ? ids : ids ? [ids] : []);
    for (const [id, item] of this.items) {
      const on = wanted.has(id);
      item.highlighted = on;
      item.marker.setVisible(on);
      item.pulseTween?.remove();
      item.pulseTween = null;
      item.marker.setScale(1).setAlpha(1);
      if (on && pulse) {
        item.pulseTween = this.scene.tweens.add({
          targets: item.marker,
          scale: 1.25,
          alpha: 0.55,
          duration: 650,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  /** Position monde du haut d'un bâtiment (pour y ancrer un menu DOM). */
  anchorOf(id) {
    const item = this.items.get(id);
    return item ? { x: item.sprite.x, y: item.top } : null;
  }

  worldPositionOf(id) {
    const item = this.items.get(id);
    return item ? { x: item.sprite.x, y: item.sprite.y } : null;
  }

  /** À chaque frame : dessine les loaders des collectes en cours. */
  update(now = Date.now()) {
    for (const [id, item] of this.items) {
      const g = item.loader;
      g.clear();
      if (!this.state.isCollecting(id)) {
        item.loaderText.setText('');
        continue;
      }
      const p = this.state.collectionProgress(id, now);
      const r = 13;
      g.fillStyle(0x1b1712, 0.85).fillCircle(0, 0, r + 4);
      g.lineStyle(4, 0x5b4632, 1).strokeCircle(0, 0, r);
      g.lineStyle(4, 0x6e8f52, 1).beginPath();
      g.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2, false).strokePath();
      const left = Math.ceil((this.state.collecting[id].endsAt - now) / 1000);
      item.loaderText.setText(String(Math.max(0, left)));
    }
  }

  _floatReward(id, reward) {
    const item = this.items.get(id);
    if (!item) return;
    const lines = [
      { text: `+${reward.money} FCFA`, color: '#e8bd55', dy: 0 },
      { text: `+${reward.xp} XP`, color: '#a8d27a', dy: 16 },
    ];
    for (const line of lines) {
      const t = this.scene.add
        .text(item.sprite.x, item.top - 10 + line.dy, line.text, {
          fontFamily: 'Oxanium, sans-serif',
          fontSize: '14px',
          fontStyle: '800',
          color: line.color,
          stroke: '#1b1712',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(960000)
        .setResolution(3);
      this.scene.tweens.add({
        targets: t,
        y: t.y - 36,
        alpha: { from: 1, to: 0 },
        duration: 900,
        delay: line.dy ? 90 : 0,
        ease: 'Cubic.easeOut',
        onComplete: () => t.destroy(),
      });
    }
  }

  destroy() {
    this._offFinished();
  }
}
