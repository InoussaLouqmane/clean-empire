import { TILE_WIDTH, TILE_HEIGHT, isoToScreen } from '../mapLoader.js';
import { bus } from './events.js';

const CLICK_MAX_DRAG_PX = 6; // au-delà, c'est un glissé de caméra, pas un clic
const GREY_TINT = 0x8a8a8a;
const HOVER_TINT = 0xfff4d6;

/**
 * Tous les bâtiments de la ville côté Phaser (refonte niveau 1 : tous sont
 * cliquables). Pour les bâtiments SOUS CONTRAT uniquement : marqueur au sol,
 * gains flottants, et DEUX temporalités bien distinctes (prompt du
 * 2026-09-25) :
 * - jauge horizontale AU PIED du bâtiment = déchets accumulés depuis la
 *   dernière collecte ; pleine → pastille VERTE à coche blanche au-dessus
 *   (prêt, « c'est bon, tu peux collecter ») ; si le client attend plus que
 *   sa patience → pastille ROUGE à visage en colère (mécontent : la collecte
 *   coûtera de l'XP) ;
 * - anneau AU-DESSUS du bâtiment = collecte EN COURS (+ secondes).
 * Établissement qui DEMANDE un contrat (pas encore client) : pastille
 * sarcelle à CLOCHE qui se balance de temps en temps. Un bâtiment sans contrat
 * n'affiche jamais d'indicateur de collecte (cohérent avec le message
 * « pas de contrat » au clic).
 *
 * Clic : zone interactive définie en coordonnées LOCALES à la texture du
 * sprite (règle de CLAUDE.md : jamais getTileAtWorldXY sur l'isométrique).
 * Un clic n'est pris en compte que si le pointeur n'a presque pas bougé,
 * pour ne pas confondre avec un glissé de caméra.
 */
export class CityBuildings {
  constructor(scene, spriteGrid, buildings, state) {
    this.scene = scene;
    this.state = state;
    this.enabled = true;
    this.greyed = false;
    this.items = new Map();

    for (const b of buildings) {
      const sprite = spriteGrid.buildings[b.row]?.[b.col];
      if (!sprite) continue;
      this.items.set(b.id, this._setup(b, sprite));
    }

    this._offFinished = bus.on('collection_finished', ({ id, reward }) => this._floatReward(id, reward));
  }

  _setup(building, sprite) {
    // Clic au pixel près (test d'opacité dans la texture, en coordonnées
    // locales) : avec TOUS les bâtiments cliquables, un simple rectangle
    // faisait « voler » les clics par les marges transparentes du voisin.
    sprite.setInteractive({ pixelPerfect: true, alphaTolerance: 40, useHandCursor: true });
    const item = { building, sprite, top: sprite.y - sprite.displayHeight * 0.9 };

    sprite.on('pointerover', (pointer) => {
      if (pointer.event?.target !== this.scene.game.canvas) return;
      if (this.enabled && !this._isGreyed(item)) sprite.setTint(HOVER_TINT);
    });
    sprite.on('pointerout', () => this._applyTint(item));
    sprite.on('pointerup', (pointer) => {
      if (!this.enabled || this._isGreyed(item)) return;
      // Phaser voit aussi les clics faits SUR l'UI DOM au-dessus du canvas
      // (fiche, boutique…) : sans ce filtre, cliquer « Collecter » cliquait
      // aussi le bâtiment dessous et reconstruisait la fiche sous le doigt.
      if (pointer.event?.target !== this.scene.game.canvas) return;
      if (pointer.getDistance() > CLICK_MAX_DRAG_PX) return;
      bus.emit('building_clicked', { id: building.id });
    });

    // Pastille « demande de contrat » (cloche) : créée pour tous les clients
    // possibles, affichée seulement tant que la demande est en attente.
    if (building.client) {
      item.offerBadge = this.scene.add.graphics().setDepth(950000).setPosition(sprite.x, item.top - 16);
    }
    if (building.contract) this._attachContract(item);
    return item;
  }

  /** Marqueur, jauge et indicateur d'un bâtiment SOUS CONTRAT. */
  _attachContract(item) {
    const { building, sprite } = item;
    // Marqueur au sol (losange doré) : "ce bâtiment est ciblé".
    const { x, y } = isoToScreen(building.col, building.row);
    item.marker = this.scene.add.graphics().setDepth(-120000).setPosition(x, y);
    item.marker
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
    item.marker.setVisible(false);

    // Jauge d'accumulation des déchets, au pied du bâtiment.
    item.gauge = this.scene.add.graphics().setDepth(948000).setPosition(sprite.x, sprite.y + 8);

    // Indicateur au-dessus du bâtiment : prêt (!) ou collecte en cours (anneau).
    item.indicator = this.scene.add.graphics().setDepth(950000).setPosition(sprite.x, item.top - 16);
    item.indicatorText = this.scene.add
      .text(sprite.x, item.top - 16, '', {
        fontFamily: 'Oxanium, sans-serif',
        fontSize: '11px',
        fontStyle: '700',
        color: '#f1e9d2',
      })
      .setOrigin(0.5)
      .setDepth(950001)
      .setResolution(3);
  }

  /** Un établissement vient de signer : il devient client sur la carte. */
  addContract(id) {
    const item = this.items.get(id);
    if (!item || item.indicator) return;
    this._attachContract(item);
    item.offerBadge?.clear();
    this._applyTint(item);
  }

  // Grisé = visible mais non interactif. Pendant les retrouvailles, toute la
  // ville est grisée ; ensuite, rien ne l'est.
  _isGreyed() {
    return this.greyed;
  }

  _applyTint(item) {
    if (this._isGreyed(item)) item.sprite.setTint(GREY_TINT);
    else item.sprite.clearTint();
  }

  setGreyed(greyed) {
    this.greyed = greyed;
    for (const item of this.items.values()) {
      if (!item.building.contract) continue; // seuls les contrats sont grisés (script)
      this._applyTint(item);
      item.sprite.input.cursor = greyed ? 'default' : 'pointer';
    }
  }

  /** Désactive tous les clics (écran de fin…). */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /** Surligne des bâtiments sous contrat (marqueur au sol pulsant). */
  setHighlight(ids, { pulse = true } = {}) {
    const wanted = new Set(Array.isArray(ids) ? ids : ids ? [ids] : []);
    for (const [id, item] of this.items) {
      if (!item.marker) continue;
      const on = wanted.has(id);
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

  /** Position monde du haut d'un bâtiment (ancrage des menus DOM, du doigt). */
  anchorOf(id) {
    const item = this.items.get(id);
    return item ? { x: item.sprite.x, y: item.top } : null;
  }

  /** Position monde du centre visuel d'un bâtiment (cadrage caméra, spotlight). */
  centerOf(id) {
    const item = this.items.get(id);
    return item ? { x: item.sprite.x, y: item.sprite.y - item.sprite.displayHeight * 0.45 } : null;
  }

  worldPositionOf(id) {
    const item = this.items.get(id);
    return item ? { x: item.sprite.x, y: item.sprite.y } : null;
  }

  /** À chaque frame : indicateurs de disponibilité des bâtiments sous contrat. */
  update(now = Date.now()) {
    for (const [id, item] of this.items) {
      if (item.offerBadge && !item.indicator) {
        item.offerBadge.clear();
        if (item.building.offer && !this.greyed) this._drawBell(item.offerBadge, now);
      }
      if (!item.indicator) continue;
      const g = item.indicator;
      const text = item.indicatorText;
      g.clear();
      item.gauge.clear();
      text.setText('').setFontSize(11).setColor('#f1e9d2');
      if (this.greyed) continue;
      const r = 13;

      const collecting = this.state.isCollecting(id);
      this._drawGauge(item.gauge, collecting ? 0 : this.state.accumulation(id, now));

      if (collecting) {
        // En collecte : anneau vert qui se remplit + secondes restantes.
        const p = this.state.collectionProgress(id, now);
        g.fillStyle(0x1b1712, 0.85).fillCircle(0, 0, r + 4);
        g.lineStyle(4, 0x5b4632, 1).strokeCircle(0, 0, r);
        g.lineStyle(4, 0x6e8f52, 1).beginPath();
        g.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2, false).strokePath();
        text.setText(String(Math.max(0, Math.ceil((this.state.collecting[id].endsAt - now) / 1000))));
        continue;
      }

      // Déchets en accumulation : rien au-dessus, seule la jauge au pied parle.
      if (this.state.cooldownLeftS(id, now) > 0) continue;

      g.fillStyle(0x1b1712, 0.9).fillCircle(0, 0, r + 2);
      if (this.state.isAngry(id, now)) {
        // Mécontent : pastille rouge, visage en colère (sourcils + bouche).
        g.fillStyle(0xa23b2a, 1).fillCircle(0, 0, r - 1);
        g.lineStyle(2.5, 0xf1e9d2, 1);
        g.lineBetween(-7, -6, -2, -3).lineBetween(7, -6, 2, -3); // sourcils
        g.fillStyle(0xf1e9d2, 1).fillCircle(-4, -1, 1.6).fillCircle(4, -1, 1.6); // yeux
        g.beginPath();
        g.arc(0, 8, 5, Math.PI * 1.15, Math.PI * 1.85, false).strokePath(); // bouche
        continue;
      }
      // Prêt : pastille verte à coche blanche (« c'est bon, tu peux collecter »).
      g.fillStyle(0x4c6b3f, 1).fillCircle(0, 0, r - 1);
      g.lineStyle(4, 0xf1e9d2, 1).beginPath();
      g.moveTo(-6, 0).lineTo(-2, 5).lineTo(7, -5).strokePath();
    }
  }

  /** Pastille sarcelle à cloche (demande de contrat), qui sonne toutes les 2 s. */
  _drawBell(g, now) {
    const r = 13;
    const t = now % 2200;
    g.setRotation(t < 700 ? Math.sin(t / 55) * 0.3 * (1 - t / 700) : 0);
    g.fillStyle(0x1b1712, 0.9).fillCircle(0, 0, r + 2);
    g.fillStyle(0x1f5e52, 1).fillCircle(0, 0, r - 1);
    g.fillStyle(0xf1e9d2, 1);
    g.fillCircle(0, -3, 4.5); // dôme
    g.fillPoints([{ x: -4.5, y: -3 }, { x: 4.5, y: -3 }, { x: 6, y: 4 }, { x: -6, y: 4 }], true); // corps
    g.fillRect(-7.5, 3.5, 15, 2.5); // bord
    g.fillCircle(0, 7.5, 1.8); // battant
  }

  /** Jauge au pied du bâtiment : `fill` 0..1 (pleine = dorée, prêt à collecter). */
  _drawGauge(g, fill) {
    const w = 42;
    const h = 7;
    const full = fill >= 1;
    g.fillStyle(0x1b1712, 0.85).fillRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
    g.fillStyle(0x5b4632, 1).fillRect(-w / 2, -h / 2, w, h);
    if (fill > 0) g.fillStyle(full ? 0xc79a3b : 0xc98f5e, 1).fillRect(-w / 2, -h / 2, Math.round(w * fill), h);
    // graduations tous les 25 % : lecture « pixel » de la progression
    g.fillStyle(0x1b1712, 0.55);
    for (let i = 1; i < 4; i++) g.fillRect(-w / 2 + Math.round((w * i) / 4), -h / 2, 1, h);
  }

  _floatReward(id, reward) {
    const item = this.items.get(id);
    if (!item) return;
    const lines = [
      { text: `+${reward.money} FCFA`, color: '#e8bd55', dy: 0 },
      reward.angry
        ? { text: `${reward.xp || '−0'} XP · client mécontent`, color: '#e0735f', dy: 16 }
        : { text: `+${reward.xp} XP`, color: '#a8d27a', dy: 16 },
    ];
    if (reward.fuel) lines.push({ text: `carburant −${reward.fuel}`, color: '#d9a08a', dy: 32, small: true });
    lines.forEach((line, i) => {
      const t = this.scene.add
        .text(item.sprite.x, item.top - 10 + line.dy, line.text, {
          fontFamily: 'Oxanium, sans-serif',
          fontSize: line.small ? '11px' : '14px',
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
        delay: i * 90,
        ease: 'Cubic.easeOut',
        onComplete: () => t.destroy(),
      });
    });
  }

  destroy() {
    this._offFinished();
  }
}
