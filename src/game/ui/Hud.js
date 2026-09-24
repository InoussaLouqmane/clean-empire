import { icon } from '../../menu/icons.js';
import { formatMoney } from '../economy.js';
import { bus } from '../events.js';
import { sfx } from '../sfx.js';

/**
 * HUD en jeu (haut-gauche) : bouton boutique, argent, XP (barre vers le
 * niveau suivant), ouvriers au format « disponibles/total » (script niveau 1).
 * Chaque valeur qui change fait une petite impulsion (design system §13–14).
 */
export class Hud {
  constructor(root, state, { onShop }) {
    this.state = state;
    this.el = document.createElement('div');
    this.el.className = 'hud-game';
    this.el.innerHTML = `
      <button type="button" class="hud-shop" data-hud="shop" aria-label="Boutique">
        <img src="assets/ui/boutique.png" alt="" width="160" height="157" />
      </button>
      <div class="hud-bar" role="status" aria-live="polite">
        <span class="hud-stat" data-hud="money">${icon('coin')}<b></b></span>
        <span class="hud-stat hud-stat--xp" data-hud="xp">
          ${icon('star')}
          <span class="hud-xp">
            <span class="hud-xp__label"><b></b> XP <small></small></span>
            <span class="hud-xp__track"><span class="hud-xp__fill"></span></span>
          </span>
        </span>
        <span class="hud-stat" data-hud="workers" title="Ouvriers disponibles / total">${icon('worker')}<b></b></span>
      </div>`;
    root.appendChild(this.el);

    this.shopBtn = this.el.querySelector('[data-hud="shop"]');
    this.moneyEl = this.el.querySelector('[data-hud="money"]');
    this.xpEl = this.el.querySelector('[data-hud="xp"]');
    this.workersEl = this.el.querySelector('[data-hud="workers"]');
    this.shopBtn.addEventListener('click', () => {
      sfx.click();
      onShop();
    });

    this.prev = {};
    this._off = bus.on('state_changed', () => this.render());
    this.render(true);
  }

  render(initial = false) {
    const s = this.state;
    const money = formatMoney(s.money);
    const workers = `${s.workersFree}/${s.workersTotal}`;
    const xp = s.xp;

    this.moneyEl.querySelector('b').textContent = money;
    this.xpEl.querySelector('.hud-xp__label b').textContent = String(xp);
    this.xpEl.querySelector('.hud-xp__label small').textContent = `· Niv. ${s.level}`;
    this.xpEl.querySelector('.hud-xp__fill').style.width = `${Math.min(100, (100 * xp) / s.xpForNextLevel)}%`;
    this.workersEl.querySelector('b').textContent = workers;

    if (!initial) {
      if (this.prev.money !== undefined && this.prev.money !== s.money) this._bump(this.moneyEl, s.money > this.prev.money);
      if (this.prev.xp !== undefined && this.prev.xp !== xp) this._bump(this.xpEl, true);
      if (this.prev.workers !== undefined && this.prev.workers !== workers) this._bump(this.workersEl, true);
    }
    this.prev = { money: s.money, xp, workers };
  }

  _bump(el, positive) {
    el.classList.remove('is-bump', 'is-bump-down');
    void el.offsetWidth;
    el.classList.add(positive ? 'is-bump' : 'is-bump-down');
  }

  setVisible(visible) {
    this.el.classList.toggle('is-hidden', !visible);
  }

  destroy() {
    this._off();
    this.el.remove();
  }
}
