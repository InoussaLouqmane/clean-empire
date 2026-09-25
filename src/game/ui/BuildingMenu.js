import { icon } from '../../menu/icons.js';
import { ECONOMY, VEHICLE_TYPES, formatMoney } from '../economy.js';
import { bus } from '../events.js';
import { sfx } from '../sfx.js';
import { worldToScreen } from '../screen.js';
import { unitIcon } from './units.js';

const UNIT_TYPES = ['walker', ...VEHICLE_TYPES];
const PLURALS = { walker: 'Ouvriers', tricycle: 'Tricycles', camion: 'Camions' };

/**
 * Fiche d'un bâtiment, ancrée au-dessus de lui (DOM, repositionnée à chaque
 * frame pour suivre la caméra). Trois cas (refonte niveau 1) :
 * - sous contrat : nom, récompense, durée, puis « Qui envoyer ? » : TOUJOURS
 *   une pastille par TYPE d'unité possédé, en ligne (badge = nombre
 *   disponible, durée, gain net) — lisible même avec 100 ouvriers — et
 *   TOUJOURS le bouton « Collecter ». On sélectionne une pastille, puis on
 *   collecte. Un seul type possédé : sa pastille est présélectionnée (retour
 *   utilisateur du 2026-09-25, capture « Présentation ») ;
 * - client sans contrat : mêmes infos, verrouillé (« pas encore de contrat ») ;
 * - bâtiment spécial (déchetterie…) : simple information.
 */
export class BuildingMenu {
  constructor(root, state, buildings) {
    this.state = state;
    this.buildings = new Map(buildings.map((b) => [b.id, b]));
    this.openId = null;
    this.selectedType = null;

    this.el = document.createElement('div');
    this.el.className = 'building-menu';
    this.el.hidden = true;
    root.appendChild(this.el);

    this.el.addEventListener('click', (e) => {
      if (e.target.closest('.building-menu__close')) {
        sfx.close();
        this.close();
      } else if (e.target.closest('[data-bm="sign"]')) {
        this._sign();
      } else if (e.target.closest('[data-bm="collect"]')) {
        this._collect(this.selectedType);
      } else {
        const chip = e.target.closest('[data-type]');
        if (chip && chip.getAttribute('aria-disabled') !== 'true') {
          sfx.click();
          this.selectedType = chip.dataset.type;
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
      this.selectedType = null;
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
        <p class="building-menu__patience" data-bm="patience" hidden></p>
        <div data-bm="assign"></div>
        <p class="building-menu__hint" data-bm="hint"></p>`;
      this._refresh();
      return;
    }

    if (b.client && b.offer) {
      const c = b.client;
      const bonus = ECONOMY.contracts.newContract;
      this.el.dataset.kind = 'offer';
      this.el.innerHTML = `${close}
        <p class="building-menu__kicker building-menu__kicker--offer">${icon('star')} Demande de contrat · ${c.type}</p>
        <h3 class="building-menu__title">${b.name}</h3>
        ${stats(c, this.state)}
        <p class="building-menu__info">Ce client a entendu parler de toi et veut travailler avec ton entreprise.</p>
        <button type="button" class="game-btn game-btn--primary" data-bm="sign">
          <span class="game-btn__label">Signer le contrat</span>
        </button>
        <small class="building-menu__meta">Signature gratuite · +${formatMoney(bonus.money)} · +${bonus.xp} XP</small>`;
      return;
    }

    if (b.client) {
      const c = b.client;
      this.el.innerHTML = `${close}
        <p class="building-menu__kicker building-menu__kicker--locked">${icon('lock')} Pas encore de contrat</p>
        <h3 class="building-menu__title">${b.name}</h3>
        ${stats(c, this.state)}
        <p class="building-menu__locked">${c.type} · ${this.state.level >= c.unlockLevel ? "ne t'a pas encore contacté — de nouvelles demandes arrivent à chaque niveau" : `client possible à partir du niveau ${c.unlockLevel}`}.</p>
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
    // Contrat tout juste signé depuis la fiche « demande » : on la reconstruit.
    if (this.el.dataset.kind !== 'contract') return this._render();
    const s = this.state;
    const now = Date.now();
    const assign = this.el.querySelector('[data-bm="assign"]');

    // Patience du client prêt (mécontentement, jeu libre uniquement).
    const patienceEl = this.el.querySelector('[data-bm="patience"]');
    const left = s.patienceLeftS(this.openId, now);
    patienceEl.hidden = left === null;
    patienceEl.classList.toggle('is-angry', left === 0);
    patienceEl.textContent =
      left === 0
        ? `Client mécontent : −${ECONOMY.collection.angryXpPenalty} XP à la collecte`
        : `Patience : ${left} s avant mécontentement`;
    const types = UNIT_TYPES.filter((t) => s.units.some((u) => u.type === t));
    const available = s.availableUnits(now);
    const blocker = s.collectBlocker(this.openId, now);

    // La structure n'est reconstruite que si les types possédés changent :
    // ensuite on ne met à jour que textes et attributs (un bouton remplacé
    // sous le doigt perdrait le clic, et la pulsation du tutoriel avec).
    const key = types.join(',');
    if (assign.dataset.key !== key) {
      assign.dataset.key = key;
      assign.innerHTML = `
        <p class="building-menu__section">Qui envoyer ?</p>
        <div class="unit-chips" role="radiogroup" aria-label="Qui envoyer ?">
          ${types
            .map(
              (t) => `
          <button type="button" class="unit-chip" role="radio" data-type="${t}">
            ${unitIcon(t)}
            <span class="unit-chip__badge"></span>
            <span class="unit-chip__name"></span>
            <span class="unit-chip__meta"></span>
          </button>`
            )
            .join('')}
        </div>
        <button type="button" class="game-btn game-btn--primary" data-bm="collect">
          <span class="game-btn__label">Collecter</span>
        </button>`;
    }

    // Un seul type possédé : présélectionné. Sinon, le choix du joueur reste
    // tant que ce type a une unité libre.
    if (types.length === 1) this.selectedType = types[0];
    else if (this.selectedType && !available.some((u) => u.type === this.selectedType)) this.selectedType = null;

    // Toutes les unités occupées : chaque pastille dit pourquoi.
    const buildingBlocker = blocker === 'Aucune unité disponible' ? null : blocker;
    for (const chip of assign.querySelectorAll('[data-type]')) {
      const t = chip.dataset.type;
      const free = available.filter((u) => u.type === t).length;
      const owned = s.units.filter((u) => u.type === t).length;
      chip.querySelector('.unit-chip__badge').textContent = String(free);
      chip.querySelector('.unit-chip__name').textContent = owned > 1 ? PLURALS[t] : ECONOMY.units[t].label;
      chip.querySelector('.unit-chip__meta').textContent = free
        ? `${s.collectionDurationFor(b.id, t)} s · +${s.netRewardFor(b.id, t)}`
        : this._busyReason(t, now);
      chip.setAttribute('aria-disabled', String(!free));
      chip.setAttribute('aria-checked', String(t === this.selectedType));
      chip.classList.toggle('is-selected', t === this.selectedType);
      chip.title = `${free} disponible${free > 1 ? 's' : ''} sur ${owned}`;
    }

    const hint =
      buildingBlocker ??
      (!available.length ? 'Toutes tes unités sont occupées' : !this.selectedType ? 'Choisis qui envoyer' : '');
    this.collectBtn.setAttribute('aria-disabled', String(Boolean(hint)));
    this.el.querySelector('[data-bm="hint"]').textContent = hint;
  }

  /** Signe la demande de contrat du bâtiment ouvert ; la fiche devient « contrat actif ». */
  _sign() {
    const id = this.openId;
    if (!id || !this.state.signContract(id)) {
      sfx.denied();
      return;
    }
    sfx.hire();
    this._render();
  }

  /** Pourquoi aucune unité de ce type n'est disponible (texte de la pastille). */
  _busyReason(type, now) {
    const statuses = this.state.units.filter((u) => u.type === type).map((u) => this.state.unitStatus(u, now));
    if (statuses.includes('busy')) return statuses.length > 1 ? 'Tous occupés' : 'Occupé';
    if (statuses.includes('repairing')) return 'En réparation';
    return 'En panne';
  }

  /** Lance la collecte avec une unité disponible du type choisi (engin : le mieux entretenu). */
  _collect(type) {
    const btn = this.collectBtn;
    const id = this.openId;
    if (!id) return;
    const s = this.state;
    const unit = s
      .availableUnits()
      .filter((u) => u.type === type)
      .sort((a, b) => s.unitCondition(b) - s.unitCondition(a))[0];
    if (btn?.getAttribute('aria-disabled') !== 'true' && unit && s.startCollection(id, unit.id)) {
      sfx.collectStart();
      this.close();
    } else {
      sfx.denied();
      btn?.classList.remove('is-denied');
      void btn?.offsetWidth;
      btn?.classList.add('is-denied');
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
      ${state.tutorial.done ? `<div>${icon('smiley')}<dt>Patience</dt><dd>${c.patienceS} s</dd></div>` : ''}
    </dl>`;
}
