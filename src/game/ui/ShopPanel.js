import { icon } from '../../menu/icons.js';
import { ECONOMY, formatMoney } from '../economy.js';
import { bus } from '../events.js';
import { sfx } from '../sfx.js';

// Première frame des planches de sprites (3 frames côte à côte).
const VEHICLE_SPRITES = {
  tricycle: 'assets/vehicles/tricycle_move_3frames_32x32.png',
  camion: 'assets/vehicles/camion_move_3frames_32x32.png',
};

/**
 * Boutique : recruter un ouvrier, acheter un engin. L'achat d'un ouvrier et
 * celui d'un engin ont chacun leur propre retour (design system §21–23).
 * Un article indisponible affiche toujours POURQUOI (prix manquant, niveau).
 */
export class ShopPanel {
  constructor(root, state) {
    this.state = state;
    this.isOpen = false;

    this.el = document.createElement('div');
    this.el.className = 'shop';
    this.el.hidden = true;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Boutique');
    this.el.innerHTML = `
      <header class="shop__header">
        <img src="assets/ui/boutique.png" alt="" width="160" height="157" />
        <h2>Boutique</h2>
        <button type="button" class="shop__close" aria-label="Fermer la boutique">×</button>
      </header>
      <p class="shop__money">Ton argent : <b data-shop="money"></b></p>
      <ul class="shop__items">
        <li class="shop-item" data-item="worker">
          <span class="shop-item__icon">${icon('worker')}</span>
          <span class="shop-item__text">
            <b>Recruter un ouvrier</b>
            <small>+1 collecte en même temps</small>
          </span>
          <button type="button" class="game-btn game-btn--primary" data-buy="worker">
            <span class="game-btn__label" data-price="worker"></span>
          </button>
        </li>
        ${Object.entries(ECONOMY.vehicles)
          .map(
            ([id, v]) => `
        <li class="shop-item" data-item="${id}">
          <span class="shop-item__icon shop-item__icon--sprite" style="background-image:url(${VEHICLE_SPRITES[id]})"></span>
          <span class="shop-item__text">
            <b>${v.label}</b>
            <small>Collecte −${v.speedupS} s</small>
          </span>
          <button type="button" class="game-btn game-btn--secondary" data-buy="${id}">
            <span class="game-btn__label">${formatMoney(v.cost)}</span>
          </button>
        </li>`
          )
          .join('')}
      </ul>`;
    root.appendChild(this.el);

    this.el.querySelector('.shop__close').addEventListener('click', () => {
      sfx.close();
      this.close();
    });
    this.el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-buy]');
      if (btn) this._buy(btn.dataset.buy, btn);
    });
    this._off = bus.on('state_changed', () => this.render());
  }

  open() {
    if (this.isOpen) return;
    sfx.open();
    this.isOpen = true;
    this.el.hidden = false;
    this.el.classList.remove('is-in');
    void this.el.offsetWidth;
    this.el.classList.add('is-in');
    this.render();
    bus.emit('shop_opened');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.hidden = true;
    bus.emit('shop_closed');
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  /** Bouton « Recruter » (pour la pulsation du tutoriel). */
  get recruitButton() {
    return this.el.querySelector('[data-buy="worker"]');
  }

  render() {
    const s = this.state;
    this.el.querySelector('[data-shop="money"]').textContent = formatMoney(s.money);

    const workerBtn = this.recruitButton;
    const cost = s.nextWorkerCost;
    this.el.querySelector('[data-price="worker"]').textContent = formatMoney(cost);
    const workerBlocked = s.money < cost;
    workerBtn.setAttribute('aria-disabled', String(workerBlocked));
    workerBtn.title = workerBlocked ? "Pas assez d'argent" : '';

    for (const id of Object.keys(ECONOMY.vehicles)) {
      const btn = this.el.querySelector(`[data-buy="${id}"]`);
      const item = this.el.querySelector(`[data-item="${id}"]`);
      const blocker = s.vehicleBlocker(id);
      btn.setAttribute('aria-disabled', String(Boolean(blocker)));
      btn.title = blocker ?? '';
      const locked = ECONOMY.vehicles[id].unlockLevel > s.level;
      item.classList.toggle('is-locked', locked);
      item.classList.toggle('is-owned', Boolean(s.vehicles[id]));
      const label = btn.querySelector('.game-btn__label');
      if (s.vehicles[id]) label.textContent = 'Acheté ✓';
      else if (locked) label.innerHTML = `${icon('lock')} Niveau ${ECONOMY.vehicles[id].unlockLevel}`;
      else label.textContent = formatMoney(ECONOMY.vehicles[id].cost);
    }
  }

  _buy(id, btn) {
    const ok = id === 'worker' ? this.state.hireWorker() : this.state.buyVehicle(id);
    if (ok) {
      if (id === 'worker') sfx.hire();
      else sfx.buy();
      const item = btn.closest('.shop-item');
      item.classList.remove('is-bought');
      void item.offsetWidth;
      item.classList.add('is-bought');
    } else {
      sfx.denied();
      btn.classList.remove('is-denied');
      void btn.offsetWidth;
      btn.classList.add('is-denied');
    }
  }

  destroy() {
    this._off();
    this.el.remove();
  }
}
