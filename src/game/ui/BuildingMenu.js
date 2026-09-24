import { icon } from '../../menu/icons.js';
import { ECONOMY, formatMoney } from '../economy.js';
import { bus } from '../events.js';
import { sfx } from '../sfx.js';
import { worldToScreen } from '../screen.js';

/**
 * Menu contextuel d'un bâtiment sous contrat, ancré au-dessus du bâtiment
 * (DOM, repositionné à chaque frame pour suivre la caméra). Une seule action
 * principale : « Collecter » (design system §30), avec ses états : actif,
 * collecte en cours, en attente (recollecte), aucun ouvrier libre.
 */
export class BuildingMenu {
  constructor(root, state, contracts) {
    this.state = state;
    this.contracts = new Map(contracts.map((c) => [c.id, c]));
    this.openId = null;

    this.el = document.createElement('div');
    this.el.className = 'building-menu';
    this.el.hidden = true;
    this.el.innerHTML = `
      <button type="button" class="building-menu__close" aria-label="Fermer">×</button>
      <p class="building-menu__kicker">Contrat actif</p>
      <h3 class="building-menu__title"></h3>
      <dl class="building-menu__stats">
        <div>${icon('clock')}<dt>Collecte</dt><dd data-bm="duration"></dd></div>
        <div>${icon('coin')}<dt>Récompense</dt><dd data-bm="reward"></dd></div>
      </dl>
      <button type="button" class="game-btn game-btn--primary" data-bm="collect">
        <span class="game-btn__label">Collecter</span>
      </button>
      <p class="building-menu__hint" data-bm="hint"></p>`;
    root.appendChild(this.el);

    this.titleEl = this.el.querySelector('.building-menu__title');
    this.durationEl = this.el.querySelector('[data-bm="duration"]');
    this.rewardEl = this.el.querySelector('[data-bm="reward"]');
    this.collectBtn = this.el.querySelector('[data-bm="collect"]');
    this.hintEl = this.el.querySelector('[data-bm="hint"]');

    this.el.querySelector('.building-menu__close').addEventListener('click', () => {
      sfx.close();
      this.close();
    });
    this.collectBtn.addEventListener('click', () => this._collect());

    this._offClick = bus.on('building_clicked', ({ id }) => this.open(id));
  }

  open(id) {
    const contract = this.contracts.get(id);
    if (!contract) return;
    if (this.openId !== id) sfx.open();
    this.openId = id;
    this.titleEl.textContent = contract.name;
    const r = ECONOMY.collection.reward;
    this.rewardEl.textContent = `${formatMoney(r.money)} · +${r.xp} XP`;
    this.el.hidden = false;
    this.el.classList.remove('is-in');
    void this.el.offsetWidth;
    this.el.classList.add('is-in');
    this._refresh();
  }

  close() {
    if (!this.openId) return;
    const id = this.openId;
    this.openId = null;
    this.el.hidden = true;
    bus.emit('building_menu_closed', { id });
  }

  _collect() {
    const id = this.openId;
    if (!id) return;
    if (this.state.startCollection(id)) {
      sfx.collectStart();
      this.close();
    } else {
      sfx.denied();
      this.collectBtn.classList.remove('is-denied');
      void this.collectBtn.offsetWidth;
      this.collectBtn.classList.add('is-denied');
    }
  }

  _refresh() {
    if (!this.openId) return;
    this.durationEl.textContent = `${this.state.collectionDurationS} s`;
    const blocker = this.state.collectBlocker(this.openId);
    this.collectBtn.setAttribute('aria-disabled', blocker ? 'true' : 'false');
    this.hintEl.textContent = blocker ?? '';
  }

  /** À chaque frame : suit le bâtiment à l'écran + rafraîchit les états. */
  update(camera, anchorOf) {
    if (!this.openId) return;
    const anchor = anchorOf(this.openId);
    if (!anchor) return;
    const p = worldToScreen(camera, anchor.x, anchor.y);
    this.el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
    this._refresh();
  }

  destroy() {
    this._offClick();
    this.el.remove();
  }
}
