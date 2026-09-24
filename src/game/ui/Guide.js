import { icon } from '../../menu/icons.js';
import { worldToScreen } from '../screen.js';

/**
 * Guidage visuel du tutoriel (refonte niveau 1) :
 * - un DOIGT qui pointe la cible (placeholder SVG pixel en attendant un
 *   curseur dessiné), en complément du losange au sol ;
 * - un SPOTLIGHT : la carte est légèrement assombrie, sauf autour de la cible.
 *   Bord net (pas de dégradé ni de flou — design system).
 *
 * Cible : { building: id } (bâtiment de la carte) ou { el } (élément d'UI :
 * bouton Collecter, boutique…). Pour une cible d'UI, la carte est assombrie
 * en entier et l'élément reste au-dessus, non assombri.
 * Le spotlight laisse passer les clics (pointer-events: none).
 */
export class Guide {
  constructor(root, scene, buildings) {
    this.scene = scene;
    this.buildings = buildings;
    this.target = null;

    this.spot = document.createElement('div');
    this.spot.className = 'spotlight';
    this.spot.hidden = true;
    root.prepend(this.spot); // sous toute l'UI : n'assombrit que la carte

    this.finger = document.createElement('div');
    this.finger.className = 'guide-finger';
    this.finger.hidden = true;
    this.finger.innerHTML = icon('finger');
    root.appendChild(this.finger);
  }

  point(target) {
    this.target = target;
    this.spot.hidden = false;
    this.finger.hidden = false;
    this.spot.classList.toggle('is-full', Boolean(target.el));
    this.update();
  }

  clear() {
    this.target = null;
    this.spot.hidden = true;
    this.finger.hidden = true;
  }

  /** À chaque frame : suit la cible (caméra qui bouge, menu qui s'ouvre…). */
  update() {
    const t = this.target;
    if (!t) return;
    const cam = this.scene.cameras.main;

    if (t.building) {
      const c = this.buildings.centerOf(t.building);
      const top = this.buildings.anchorOf(t.building);
      if (!c || !top) return;
      const p = worldToScreen(cam, c.x, c.y);
      const pt = worldToScreen(cam, top.x, top.y);
      const size = Math.max(90, 120 * cam.zoom);
      this._place(this.spot, p.x - size / 2, p.y - size / 2, size, size);
      this._finger(pt.x, pt.y - 34, pt.y < 90);
      return;
    }

    const r = t.el?.getBoundingClientRect();
    if (!r || (!r.width && !r.height)) {
      this.finger.hidden = true;
      return;
    }
    this.finger.hidden = false;
    // Pas la place au-dessus (HUD en haut d'écran) : doigt SOUS l'élément,
    // retourné vers le haut.
    if (r.top < 56) this._finger(r.left + r.width / 2, r.bottom + 6, true);
    else this._finger(r.left + r.width / 2, r.top - 6);
  }

  _place(el, x, y, w, h) {
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    el.style.width = `${Math.round(w)}px`;
    el.style.height = `${Math.round(h)}px`;
  }

  _finger(x, y, fromBelow = false) {
    // (x, y) = point visé ; bout du doigt en bas de l'icône (ou en haut si
    // fromBelow : icône retournée, posée sous le point).
    this.finger.classList.toggle('is-up', fromBelow);
    const top = fromBelow ? y + 4 : y - 44;
    this.finger.style.transform = `translate(${Math.round(x - 20)}px, ${Math.round(top)}px)`;
  }

  destroy() {
    this.spot.remove();
    this.finger.remove();
  }
}
