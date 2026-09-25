import { icon } from '../../menu/icons.js';
import { ECONOMY, formatMoney } from '../economy.js';
import { bus } from '../events.js';
import { sfx } from '../sfx.js';
import { worldToScreen } from '../screen.js';
import { unitIcon, STATUS_LABELS } from './units.js';

/**
 * Fiche d'un bâtiment, ancrée au-dessus de lui (DOM, repositionnée à chaque
 * frame pour suivre la caméra). Trois cas (refonte niveau 1) :
 * - sous contrat : nom, récompense, durée, CHOIX EXPLICITE de l'unité à
 *   envoyer (durée et gain net carburant déduit par unité), bouton Collecter ;
 * - client sans contrat : mêmes infos, verrouillé (« pas encore de contrat ») ;
 * - bâtiment spécial (déchetterie…) : simple information.
 */
export class BuildingMenu {
  constructor(root, state, buildings) {
    this.state = state;
    this.buildings = new Map(buildings.map((b) => [b.id, b]));
    this.openId = null;
    this.selectedUnitId = null;

    this.el = document.createElement('div');
    this.el.className = 'building-menu';
    this.el.hidden = true;
    root.appendChild(this.el);

    this.el.addEventListener('click', (e) => {
      if (e.target.closest('.building-menu__close')) {
        sfx.close();
        this.close();
      } else if (e.target.closest('[data-bm="collect"]')) {
        this._collect();
      } else {
        const row = e.target.closest('[data-unit]');
        if (row && row.getAttribute('aria-disabled') !== 'true') {
          sfx.click();
          this.selectedUnitId = row.dataset.unit;
          this._refresh();
        }
      }
    });

    this._offClick = bus.on('building_clicked', ({ id }) => this.open(id));
    this._offState = bus.on('state_changed', () => this._refresh());
  }

  /** Bouton « Collecter » (pour la pulsation du tutoriel). */
  get collectBtn() {
    return this.el.querySelector('[data-bm="collect"]');
  }

  open(id) {
    const b = this.buildings.get(id);
    if (!b) return;
    if (this.openId === id && !this.el.hidden) return; // déjà ouverte : ne rien reconstruire
    if (this.openId !== id) {
      sfx.open();
      this.selectedUnitId = null;
    }
    this.openId = id;
    this.el.hidden = false;
    this.el.classList.remove('is-in');
    void this.el.offsetWidth;
    this.el.classList.add('is-in');
    this._render();
  }

  close() {
    if (!this.openId) return;
    const id = this.openId;
    this.openId = null;
    this.el.hidden = true;
    bus.emit('building_menu_closed', { id });
  }

  _render() {
    const b = this.buildings.get(this.openId);
    this.el.dataset.kind = b.contract ? 'contract' : b.client ? 'locked' : 'info';
    const close = '<button type="button" class="building-menu__close" aria-label="Fermer">×</button>';

    if (b.contract) {
      const c = b.client;
      this.el.innerHTML = `${close}
        <p class="building-menu__kicker">Contrat actif · ${c.type}</p>
        <h3 class="building-menu__title">${b.name}</h3>
        ${stats(c, this.state)}
        <p class="building-menu__section">Qui envoyer ?</p>
        <ul class="unit-picker" data-bm="units"></ul>
        <button type="button" class="game-btn game-btn--primary" data-bm="collect">
          <span class="game-btn__label">Collecter</span>
        </button>
        <p class="building-menu__hint" data-bm="hint"></p>`;
      this._refresh();
      return;
    }

    if (b.client) {
      const c = b.client;
      this.el.innerHTML = `${close}
        <p class="building-menu__kicker building-menu__kicker--locked">${icon('lock')} Pas encore de contrat</p>
        <h3 class="building-menu__title">${b.name}</h3>
        ${stats(c, this.state)}
        <p class="building-menu__locked">${c.type} · ${this.state.level >= c.unlockLevel ? 'nouveaux contrats bientôt disponibles' : `client disponible au niveau ${c.unlockLevel}`}.</p>
        <button type="button" class="game-btn" aria-disabled="true">
          <span class="game-btn__label">${icon('lock')} Verrouillé</span>
        </button>`;
      return;
    }

    const type = b.special?.type ?? 'Bâtiment';
    this.el.innerHTML = `${close}
      <p class="building-menu__kicker">${type}</p>
      <h3 class="building-menu__title">${b.name}</h3>
      <p class="building-menu__info">${b.special?.info ?? 'Rien à faire ici pour le moment.'}</p>`;
  }

  _refresh() {
    if (!this.openId) return;
    const b = this.buildings.get(this.openId);
    if (!b?.contract) return;
    const list = this.el.querySelector('[data-bm="units"]');
    const s = this.state;
    const now = Date.now();

    // Unité présélectionnée s'il n'y en a qu'une disponible (le choix reste
    // visible) ; sinon le joueur choisit lui-même (pas d'assignation auto).
    const available = s.availableUnits(now);
    const selected = s.units.find((u) => u.id === this.selectedUnitId);
    if (!selected || s.unitStatus(selected, now) !== 'available') {
      this.selectedUnitId = available.length === 1 ? available[0].id : null;
    }

    list.innerHTML = s.units
      .map((u) => {
        const status = s.unitStatus(u, now);
        const ok = status === 'available';
        const spec = ECONOMY.units[u.type];
        const dur = s.collectionDurationFor(b.id, u.type);
        const net = s.netRewardFor(b.id, u.type);
        const fuelCost = Math.round(spec.fuel * s.mods.fuelMult);
        const fuel = fuelCost ? ` <small>(carburant −${fuelCost})</small>` : '';
        return `
        <li class="unit-row${u.id === this.selectedUnitId ? ' is-selected' : ''}" data-unit="${u.id}"
            role="radio" aria-checked="${u.id === this.selectedUnitId}" aria-disabled="${!ok}" tabindex="${ok ? 0 : -1}">
          ${unitIcon(u.type)}
          <span class="unit-row__name">${s.unitLabel(u)}</span>
          ${ok ? `<span class="unit-row__meta">${dur} s · +${net}${fuel}</span>` : `<span class="unit-row__status is-${status}">${STATUS_LABELS[status]}</span>`}
        </li>`;
      })
      .join('');

    const blocker = s.collectBlocker(this.openId, now) ?? (this.selectedUnitId ? null : 'Choisis une unité');
    this.collectBtn.setAttribute('aria-disabled', blocker ? 'true' : 'false');
    this.el.querySelector('[data-bm="hint"]').textContent = blocker ?? '';
  }

  _collect() {
    const id = this.openId;
    if (!id) return;
    if (this.selectedUnitId && this.state.startCollection(id, this.selectedUnitId)) {
      sfx.collectStart();
      this.close();
    } else {
      sfx.denied();
      const btn = this.collectBtn;
      btn.classList.remove('is-denied');
      void btn.offsetWidth;
      btn.classList.add('is-denied');
    }
  }

  /** À chaque frame : suit le bâtiment à l'écran (+ secondes de recollecte). */
  update(camera, anchorOf) {
    if (!this.openId) return;
    const anchor = anchorOf(this.openId);
    if (!anchor) return;
    const p = worldToScreen(camera, anchor.x, anchor.y);
    // Toujours entièrement à l'écran : si le bâtiment est cadré trop haut, la
    // fiche descend (quitte à le recouvrir) ; idem sur les côtés.
    const h = this.el.offsetHeight;
    const w = this.el.offsetWidth;
    const y = Math.max(p.y, h + 22);
    const x = Math.min(Math.max(p.x, w / 2 + 8), window.innerWidth - w / 2 - 8);
    this.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    const now = Math.floor(Date.now() / 1000);
    if (now !== this._lastSecond) {
      this._lastSecond = now;
      this._refresh();
    }
  }

  destroy() {
    this._offClick();
    this._offState();
    this.el.remove();
  }
}

/** Récompense, XP et durée à pied, améliorations comprises. */
function stats(c, state) {
  const m = state.mods;
  const walkerS = Math.max(ECONOMY.collection.minDurationS, c.durationS - m.walkerSpeedupS);
  return `
    <dl class="building-menu__stats">
      <div>${icon('coin')}<dt>Récompense</dt><dd>${formatMoney(Math.round(c.money * m.rewardMult))}</dd></div>
      <div>${icon('star')}<dt>Expérience</dt><dd>+${c.xp + m.xpBonus} XP</dd></div>
      <div>${icon('clock')}<dt>Collecte (à pied)</dt><dd>${walkerS} s</dd></div>
    </dl>`;
}
