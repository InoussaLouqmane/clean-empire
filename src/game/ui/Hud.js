import { icon } from '../../menu/icons.js';
import { VEHICLE_TYPES, ECONOMY, formatMoney } from '../economy.js';
import { bus } from '../events.js';
import { sfx } from '../sfx.js';
import { unitIcon } from './units.js';

/**
 * HUD en jeu (haut-gauche) : bouton boutique, carnet de quêtes, argent, XP
 * (barre vers le niveau suivant) et, dans la MÊME barre, un compteur
 * « disponibles/total » par type d'unité : ouvriers, puis tricycles et camions
 * dès qu'on en possède (retour utilisateur du 2026-09-25 : le nombre compte
 * plus que l'état ; l'état des engins est dans la boutique). Un clic sur un
 * compteur d'engin ouvre la boutique. Chaque valeur qui change fait une petite
 * impulsion (design system §13–14).
 */
export class Hud {
  constructor(root, state, { onShop, onQuests }) {
    this.state = state;
    this.el = document.createElement('div');
    this.el.className = 'hud-game';
    this.el.innerHTML = `
      <button type="button" class="hud-shop" data-hud="shop" aria-label="Boutique">
        <img src="assets/ui/boutique.png" alt="" width="160" height="157" />
      </button>
      <button type="button" class="hud-quests" data-hud="quests" aria-label="Quêtes" hidden>
        ${icon('book')}<span class="hud-badge" data-hud="badge" hidden></span>
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
        <span class="hud-stat" data-hud="walker" title="Ouvriers à pied disponibles / total">${icon('worker')}<b></b></span>
        ${VEHICLE_TYPES.map(
          (t) => `
        <button type="button" class="hud-stat hud-stat--unit" data-hud="${t}" hidden
          title="${ECONOMY.units[t].label}s disponibles / total — ouvrir la boutique">${unitIcon(t)}<b></b></button>`
        ).join('')}
      </div>`;
    root.appendChild(this.el);

    this.shopBtn = this.el.querySelector('[data-hud="shop"]');
    // Carnet de quêtes : caché pendant le tutoriel (les quêtes y avancent en
    // coulisses), puis présenté par Karim. Badge = quêtes à réclamer.
    this.questBtn = this.el.querySelector('[data-hud="quests"]');
    this.badgeEl = this.el.querySelector('[data-hud="badge"]');
    this.questBtn.addEventListener('click', () => {
      sfx.click();
      onQuests?.();
    });
    this.moneyEl = this.el.querySelector('[data-hud="money"]');
    this.xpEl = this.el.querySelector('[data-hud="xp"]');
    this.unitEls = Object.fromEntries(['walker', ...VEHICLE_TYPES].map((t) => [t, this.el.querySelector(`[data-hud="${t}"]`)]));
    this.workersEl = this.unitEls.walker;
    this.shopBtn.addEventListener('click', () => {
      sfx.click();
      onShop();
    });
    for (const t of VEHICLE_TYPES) {
      this.unitEls[t].addEventListener('click', () => {
        sfx.click();
        onShop({ forceOpen: true });
      });
    }

    this.prev = {};
    this._off = bus.on('state_changed', () => this.render());
    this._timer = setInterval(() => this.render(), 1000); // fins de réparation
    this.render(true);
  }

  render(initial = false) {
    const s = this.state;
    const now = Date.now();
    this.moneyEl.querySelector('b').textContent = formatMoney(s.money);
    this.xpEl.querySelector('.hud-xp__label b').textContent = String(s.xp);
    this.xpEl.querySelector('.hud-xp__label small').textContent = `· Niv. ${s.level}`;
    const { floor, next } = s.levelBounds; // jauge = progression DANS le niveau
    this.xpEl.querySelector('.hud-xp__fill').style.width = `${Math.min(100, (100 * (s.xp - floor)) / (next - floor))}%`;

    const counts = {};
    for (const [t, el] of Object.entries(this.unitEls)) {
      const units = s.units.filter((u) => u.type === t);
      const free = units.filter((u) => s.unitStatus(u, now) === 'available').length;
      counts[t] = `${free}/${units.length}`;
      el.hidden = t !== 'walker' && units.length === 0;
      el.querySelector('b').textContent = counts[t];
      if (!initial && this.prev.counts && this.prev.counts[t] !== counts[t]) this._bump(el, true);
    }

    this.questBtn.hidden = !(s.questsIntroDone || this.showQuests); // révélé par Karim
    const claimable = s.claimableQuestCount;
    this.badgeEl.hidden = claimable === 0;
    this.badgeEl.textContent = String(claimable);
    if (!initial && this.prev.claimable !== undefined && claimable > this.prev.claimable) this._bump(this.questBtn, true);

    if (!initial) {
      if (this.prev.money !== undefined && this.prev.money !== s.money) this._bump(this.moneyEl, s.money > this.prev.money);
      if (this.prev.xp !== undefined && this.prev.xp !== s.xp) this._bump(this.xpEl, true);
    }
    this.prev = { money: s.money, xp: s.xp, counts, claimable };
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
    clearInterval(this._timer);
    this._off();
    this.el.remove();
  }
}
