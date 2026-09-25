import { icon } from '../../menu/icons.js';
import { formatMoney } from '../economy.js';
import { bus } from '../events.js';
import { sfx } from '../sfx.js';
import { unitIcon, conditionGauge, STATUS_LABELS } from './units.js';

/**
 * HUD en jeu (haut-gauche) : bouton boutique, argent, XP (barre vers le
 * niveau suivant), ouvriers à pied « disponibles/total », et une pastille par
 * engin possédé (jauge « État » + statut en texte : disponible, en collecte,
 * en panne, en réparation). Un clic sur un engin ouvre la boutique (réparer).
 * Chaque valeur qui change fait une petite impulsion (design system §13–14).
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
      <div class="hud-column">
        <div class="hud-bar" role="status" aria-live="polite">
          <span class="hud-stat" data-hud="money">${icon('coin')}<b></b></span>
          <span class="hud-stat hud-stat--xp" data-hud="xp">
            ${icon('star')}
            <span class="hud-xp">
              <span class="hud-xp__label"><b></b> XP <small></small></span>
              <span class="hud-xp__track"><span class="hud-xp__fill"></span></span>
            </span>
          </span>
          <span class="hud-stat" data-hud="workers" title="Ouvriers à pied disponibles / total">${icon('worker')}<b></b></span>
        </div>
        <div class="hud-fleet" data-hud="fleet"></div>
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
    this.workersEl = this.el.querySelector('[data-hud="workers"]');
    this.fleetEl = this.el.querySelector('[data-hud="fleet"]');
    this.shopBtn.addEventListener('click', () => {
      sfx.click();
      onShop();
    });
    this.fleetEl.addEventListener('click', (e) => {
      if (!e.target.closest('.hud-vehicle')) return;
      sfx.click();
      onShop({ forceOpen: true });
    });

    this.prev = {};
    this._off = bus.on('state_changed', () => this.render());
    this._timer = setInterval(() => this._renderFleet(), 1000); // secondes de réparation
    this.render(true);
  }

  render(initial = false) {
    const s = this.state;
    const walkers = s.units.filter((u) => u.type === 'walker');
    const freeWalkers = walkers.filter((u) => s.unitStatus(u) === 'available').length;
    const workers = `${freeWalkers}/${walkers.length}`;

    this.moneyEl.querySelector('b').textContent = formatMoney(s.money);
    this.xpEl.querySelector('.hud-xp__label b').textContent = String(s.xp);
    this.xpEl.querySelector('.hud-xp__label small').textContent = `· Niv. ${s.level}`;
    const { floor, next } = s.levelBounds; // jauge = progression DANS le niveau
    this.xpEl.querySelector('.hud-xp__fill').style.width = `${Math.min(100, (100 * (s.xp - floor)) / (next - floor))}%`;
    this.workersEl.querySelector('b').textContent = workers;
    this._renderFleet();

    this.questBtn.hidden = !(s.questsIntroDone || this.showQuests); // révélé par Karim
    const claimable = s.claimableQuestCount;
    this.badgeEl.hidden = claimable === 0;
    this.badgeEl.textContent = String(claimable);
    if (!initial && this.prev.claimable !== undefined && claimable > this.prev.claimable) this._bump(this.questBtn, true);

    if (!initial) {
      if (this.prev.money !== undefined && this.prev.money !== s.money) this._bump(this.moneyEl, s.money > this.prev.money);
      if (this.prev.xp !== undefined && this.prev.xp !== s.xp) this._bump(this.xpEl, true);
      if (this.prev.workers !== undefined && this.prev.workers !== workers) this._bump(this.workersEl, true);
    }
    this.prev = { money: s.money, xp: s.xp, workers, claimable };
  }

  _renderFleet() {
    const s = this.state;
    const now = Date.now();
    const vehicles = s.units.filter((u) => u.type !== 'walker');
    this.fleetEl.hidden = vehicles.length === 0;
    this.fleetEl.innerHTML = vehicles
      .map((u) => {
        const status = s.unitStatus(u, now);
        const label = status === 'repairing' ? `Réparation ${s.repairLeftS(u, now)} s` : STATUS_LABELS[status];
        return `
        <button type="button" class="hud-vehicle is-${status}" title="${s.unitLabel(u)} — ${label}">
          ${unitIcon(u.type)}
          <span class="hud-vehicle__body">
            <span class="hud-vehicle__name">${s.unitLabel(u)}</span>
            ${conditionGauge(s.unitCondition(u), 5)}
            <span class="hud-vehicle__status">${label}</span>
          </span>
        </button>`;
      })
      .join('');
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
