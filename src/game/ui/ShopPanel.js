import { icon } from '../../menu/icons.js';
import { ECONOMY, VEHICLE_TYPES, formatMoney } from '../economy.js';
import { bus } from '../events.js';
import { sfx } from '../sfx.js';
import { unitIcon, conditionGauge, STATUS_LABELS } from './units.js';

/**
 * Boutique : recruter un ouvrier à pied, acheter un engin (unité « tout
 * compris », conducteur inclus), réparer un engin en panne. Chaque action a
 * son propre retour (design system §21–24). Un article indisponible affiche
 * toujours POURQUOI.
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
      <p class="shop__section">Recruter</p>
      <ul class="shop__items">
        <li class="shop-item" data-item="walker">
          ${unitIcon('walker')}
          <span class="shop-item__text">
            <b>Ouvrier à pied</b>
            <small>+1 unité · collecte en ${ECONOMY.clients.building_restaurant.durationS} s</small>
          </span>
          <button type="button" class="game-btn game-btn--primary" data-buy="walker">
            <span class="game-btn__label" data-price="walker"></span>
          </button>
        </li>
        ${VEHICLE_TYPES.map((type) => {
          const v = ECONOMY.units[type];
          return `
        <li class="shop-item" data-item="${type}">
          ${unitIcon(type)}
          <span class="shop-item__text">
            <b>${v.label} <small>(conducteur inclus)</small></b>
            <small>Collecte −${v.speedupS} s · carburant ${v.fuel} FCFA</small>
          </span>
          <button type="button" class="game-btn game-btn--secondary" data-buy="${type}">
            <span class="game-btn__label"></span>
          </button>
        </li>`;
        }).join('')}
      </ul>
      <div data-shop="fleet"></div>`;
    root.appendChild(this.el);

    this.el.addEventListener('click', (e) => {
      if (e.target.closest('.shop__close')) {
        sfx.close();
        this.close();
        return;
      }
      const buy = e.target.closest('[data-buy]');
      if (buy) this._act(buy, () => (buy.dataset.buy === 'walker' ? this.state.hireWorker() : this.state.buyVehicle(buy.dataset.buy)));
      const repair = e.target.closest('[data-repair]');
      if (repair) this._act(repair, () => this.state.repairUnit(repair.dataset.repair), 'repair');
    });
    this._off = bus.on('state_changed', () => this.isOpen && this.render());
    this._timer = setInterval(() => this.isOpen && this.render(), 1000);
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
    return this.el.querySelector('[data-buy="walker"]');
  }

  render() {
    const s = this.state;
    this.el.querySelector('[data-shop="money"]').textContent = formatMoney(s.money);

    const walkerBtn = this.recruitButton;
    const cost = s.nextWalkerCost;
    this.el.querySelector('[data-price="walker"]').textContent = formatMoney(cost);
    walkerBtn.setAttribute('aria-disabled', String(s.money < cost));
    walkerBtn.title = s.money < cost ? "Pas assez d'argent" : '';

    for (const type of VEHICLE_TYPES) {
      const v = ECONOMY.units[type];
      const btn = this.el.querySelector(`[data-buy="${type}"]`);
      const blocker = s.vehicleBlocker(type);
      const locked = v.unlockLevel > s.level;
      btn.setAttribute('aria-disabled', String(Boolean(blocker)));
      btn.title = blocker ?? '';
      this.el.querySelector(`[data-item="${type}"]`).classList.toggle('is-locked', locked);
      btn.querySelector('.game-btn__label').innerHTML = locked ? `${icon('lock')} Niveau ${v.unlockLevel}` : formatMoney(v.cost);
    }

    // Tes engins : jauge « État » + réparation.
    const vehicles = s.units.filter((u) => u.type !== 'walker');
    const fleet = this.el.querySelector('[data-shop="fleet"]');
    if (!vehicles.length) {
      fleet.innerHTML = '';
      return;
    }
    const now = Date.now();
    fleet.innerHTML = `
      <p class="shop__section">Tes engins</p>
      <ul class="shop__items">
        ${vehicles
          .map((u) => {
            const status = s.unitStatus(u, now);
            const spec = ECONOMY.units[u.type];
            const left = spec.maxUses - u.uses;
            let action;
            if (status === 'broken') {
              const rb = s.repairBlocker(u.id, now);
              action = `<button type="button" class="game-btn game-btn--danger" data-repair="${u.id}" aria-disabled="${Boolean(rb)}" title="${rb ?? ''}">
                <span class="game-btn__label">Réparer · ${formatMoney(spec.repairCost)}</span></button>`;
            } else if (status === 'repairing') {
              action = `<span class="unit-row__status is-repairing">Prêt dans ${s.repairLeftS(u, now)} s</span>`;
            } else {
              action = `<span class="unit-row__status is-${status}">${STATUS_LABELS[status]}</span>`;
            }
            return `
          <li class="shop-item shop-item--fleet">
            ${unitIcon(u.type)}
            <span class="shop-item__text">
              <b>${s.unitLabel(u)}</b>
              <small>État ${conditionGauge(s.unitCondition(u))} ${status === 'broken' ? 'hors service' : `${left} collecte${left > 1 ? 's' : ''} avant panne`}</small>
            </span>
            ${action}
          </li>`;
          })
          .join('')}
      </ul>`;
  }

  _act(btn, fn, kind) {
    if (btn.getAttribute('aria-disabled') === 'true' || !fn()) {
      sfx.denied();
      btn.classList.remove('is-denied');
      void btn.offsetWidth;
      btn.classList.add('is-denied');
      return;
    }
    if (kind === 'repair') sfx.buy();
    else if (btn.dataset.buy === 'walker') sfx.hire();
    else sfx.buy();
    const item = btn.closest('.shop-item');
    item?.classList.remove('is-bought');
    void item?.offsetWidth;
    item?.classList.add('is-bought');
  }

  destroy() {
    clearInterval(this._timer);
    this._off();
    this.el.remove();
  }
}
