import { icon } from '../../menu/icons.js';
import { ECONOMY, VEHICLE_TYPES, formatMoney } from '../economy.js';
import { bus } from '../events.js';
import { sfx } from '../sfx.js';
import { unitIcon, conditionGauge, STATUS_LABELS } from './units.js';

const TABS = [
  { id: 'staff', icon: 'worker', label: 'Personnel & équipement', short: 'Équipe' },
  { id: 'contracts', icon: 'book', label: 'Contrats', short: 'Contrats' },
  { id: 'upgrades', icon: 'gear', label: 'Améliorations', short: 'Améliorations' },
  { id: 'premium', icon: 'star', label: 'Premium', short: 'Premium' },
];
const UPGRADE_IDS = Object.keys(ECONOMY.upgrades);
const COMING_SOON_MS = 2200;

/**
 * Boutique — pop-up plein écran à onglets (prompt du 2026-09-25) :
 * - « Personnel & équipement » : recruter un ouvrier à pied, acheter un engin
 *   (conducteur inclus), état et réparation de ses engins ;
 * - « Contrats » : établissements qui demandent un contrat (nouveaux à
 *   chaque niveau) — Signer, ou Voir sur la carte ; + clients actuels ;
 * - « Améliorations » : upgrades permanents (economy.js → upgrades) ;
 * - « Premium » : achats en argent réel SIMULÉS (prix en XOF, bouton
 *   « Arrive bientôt ») — démonstration de la monétisation.
 * Onglets 2 et 3 verrouillés tant que le tutoriel n'est pas fini (ses
 * montants ne doivent pas bouger). Chaque action a son propre retour (design
 * system §21–24) ; un article indisponible affiche toujours POURQUOI.
 */
export class ShopPanel {
  constructor(root, state, { onShowBuilding } = {}) {
    this.state = state;
    this.onShowBuilding = onShowBuilding;
    this.isOpen = false;
    this.tab = 'staff';
    this.tutorialRecruit = false;
    this.recruitDenied = 0;

    this.el = document.createElement('div');
    this.el.className = 'shop';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="shop__window" role="dialog" aria-label="Boutique">
        <header class="shop__header">
          <img src="assets/ui/boutique.png" alt="" width="160" height="157" />
          <h2>Boutique</h2>
          <p class="shop__money">${icon('coin')}<b data-shop="money"></b></p>
          <button type="button" class="shop__close" aria-label="Fermer la boutique">×</button>
        </header>
        <div class="shop__tabs" role="tablist">
          ${TABS.map(
            (t) => `
          <button type="button" role="tab" class="shop__tab" data-tab="${t.id}" aria-selected="${t.id === 'staff'}">
            ${icon(t.icon)}<span class="shop__tab-long">${t.label}</span><span class="shop__tab-short">${t.short}</span>
            <span class="shop__tab-lock" hidden>${icon('lock')}</span>
          </button>`
          ).join('')}
        </div>
        <div class="shop__body">
          <section class="shop__panel" data-panel="staff">${this._staffHtml()}</section>
          <section class="shop__panel" data-panel="contracts" hidden></section>
          <section class="shop__panel" data-panel="upgrades" hidden></section>
          <section class="shop__panel" data-panel="premium" hidden></section>
        </div>
      </div>`;
    root.appendChild(this.el);

    this.el.addEventListener('click', (e) => {
      if (this._onShowcaseClick) {
        // vitrine du tutoriel : rien n'est cliquable, un clic fait avancer Karim
        this._onShowcaseClick();
        return;
      }
      if (e.target.closest('.shop__close')) {
        sfx.close();
        this.close();
        return;
      }
      const tab = e.target.closest('[data-tab]');
      if (tab) {
        sfx.click();
        this.showTab(tab.dataset.tab);
        return;
      }
      const buy = e.target.closest('[data-buy]');
      if (buy) this._act(buy, () => (buy.dataset.buy === 'walker' ? this.state.hireWorker() : this.state.buyVehicle(buy.dataset.buy)));
      const repair = e.target.closest('[data-repair]');
      if (repair) this._act(repair, () => this.state.repairUnit(repair.dataset.repair), 'repair');
      const upgrade = e.target.closest('[data-upgrade]');
      if (upgrade) this._act(upgrade, () => this.state.buyUpgrade(upgrade.dataset.upgrade), 'upgrade');
      const pack = e.target.closest('[data-pack]');
      if (pack) this._comingSoon(pack);
      const sign = e.target.closest('[data-sign]');
      if (sign) this._act(sign, () => this.state.signContract(sign.dataset.sign), 'contract');
      const see = e.target.closest('[data-see]');
      if (see) {
        sfx.click();
        this.close();
        this.onShowBuilding?.(see.dataset.see);
      }
    });
    this._onKey = (e) => {
      if (e.key === 'Escape' && this.isOpen && !this._onShowcaseClick) this.close();
    };
    window.addEventListener('keydown', this._onKey);
    this._off = bus.on('state_changed', () => this.isOpen && this.render());
    // Secondes de réparation : seul l'onglet Équipe en a besoin. Les autres ne
    // sont pas redessinés en boucle (un bouton remplacé sous le doigt perd le clic).
    this._timer = setInterval(() => this.isOpen && this.tab === 'staff' && this.render(), 1000);
  }

  open(tab = 'staff') {
    if (this.isOpen) return;
    sfx.open();
    this.isOpen = true;
    this.el.hidden = false;
    this.el.classList.remove('is-in');
    void this.el.offsetWidth;
    this.el.classList.add('is-in');
    this.showTab(tab);
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

  showTab(id) {
    this.tab = id;
    for (const b of this.el.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === id));
    for (const s of this.el.querySelectorAll('[data-panel]')) s.hidden = s.dataset.panel !== id;
    this.el.querySelector('.shop__body').scrollTop = 0;
    this.render();
  }

  /**
   * Tutoriel, correction 5 du 2026-09-25 : le joueur doit pouvoir ESSAYER de
   * recruter sans en avoir les moyens. Tant que c'est actif, « Recruter » a
   * l'air cliquable (pas de grisage) et un échec est silencieux à l'écran
   * (juste le son « refus ») ; `recruitDenied` compte ces essais.
   */
  setTutorialRecruit(on) {
    this.tutorialRecruit = on;
    if (this.isOpen) this.render();
  }

  /**
   * Vitrine du tutoriel (consigne 6, demande du 2026-09-25) : la boutique est
   * montrée pendant que Karim parle des engins — lecture seule, engins mis en
   * valeur (anneau pulsé), le reste estompé ; un clic appelle `onClick` (faire
   * avancer le dialogue).
   */
  setShowcase(on, onClick = null) {
    this._onShowcaseClick = on ? onClick ?? (() => {}) : null;
    this.el.classList.toggle('is-showcase', on);
    for (const type of VEHICLE_TYPES) {
      this.el.querySelector(`[data-item="${type}"]`)?.classList.toggle('tuto-pulse', on);
    }
  }

  /** Bouton « Recruter » (pour la pulsation du tutoriel). */
  get recruitButton() {
    return this.el.querySelector('[data-buy="walker"]');
  }

  render() {
    const s = this.state;
    this.el.querySelector('[data-shop="money"]').textContent = formatMoney(s.money);
    const locked = !s.tutorial.done;
    for (const b of this.el.querySelectorAll('[data-tab]')) {
      b.querySelector('.shop__tab-lock').hidden = !(locked && b.dataset.tab !== 'staff');
    }
    if (this.tab === 'staff') this._renderStaff();
    else if (this.tab === 'contracts') this._renderContracts(locked);
    else if (this.tab === 'upgrades') this._renderUpgrades(locked);
    else this._renderPremium(locked);
  }

  // ----------------------------------------------- Personnel & équipement

  _staffHtml() {
    return `
      <p class="shop__section">Recruter</p>
      <ul class="shop__items">
        <li class="shop-item" data-item="walker">
          ${unitIcon('walker')}
          <span class="shop-item__text">
            <b>Ouvrier à pied</b>
            <small data-shop="walker-desc"></small>
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
            <small data-shop="${type}-desc"></small>
          </span>
          <button type="button" class="game-btn game-btn--secondary" data-buy="${type}">
            <span class="game-btn__label"></span>
          </button>
        </li>`;
        }).join('')}
      </ul>
      <div data-shop="fleet"></div>`;
  }

  _renderStaff() {
    const s = this.state;
    const m = s.mods;
    const walkerBtn = this.recruitButton;
    const cost = s.nextWalkerCost;
    this.el.querySelector('[data-price="walker"]').textContent = formatMoney(cost);
    const walkerS = Math.max(ECONOMY.collection.minDurationS, ECONOMY.clients.building_restaurant.durationS - m.walkerSpeedupS);
    this.el.querySelector('[data-shop="walker-desc"]').textContent = `+1 unité · collecte en ${walkerS} s`;
    const short = s.money < cost && !this.tutorialRecruit;
    walkerBtn.setAttribute('aria-disabled', String(short));
    walkerBtn.title = short ? "Pas assez d'argent" : '';

    for (const type of VEHICLE_TYPES) {
      const v = ECONOMY.units[type];
      const btn = this.el.querySelector(`[data-buy="${type}"]`);
      const blocker = s.vehicleBlocker(type);
      const locked = v.unlockLevel > s.level;
      btn.setAttribute('aria-disabled', String(Boolean(blocker)));
      btn.title = blocker ?? '';
      this.el.querySelector(`[data-item="${type}"]`).classList.toggle('is-locked', locked);
      this.el.querySelector(`[data-shop="${type}-desc"]`).textContent = `Collecte −${v.speedupS} s · carburant ${Math.round(v.fuel * m.fuelMult)} FCFA`;
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
            const left = s.maxUses(u.type) - u.uses;
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

  // ------------------------------------------------------------ Contrats

  _renderContracts(locked) {
    const panel = this.el.querySelector('[data-panel="contracts"]');
    if (locked) {
      panel.innerHTML = lockedHtml('Les nouveaux contrats arrivent à la fin du tutoriel.');
      return;
    }
    const s = this.state;
    const bonus = ECONOMY.contracts.newContract;
    const offers = s.contractOffers.map((id) => s.catalog.get(id)).filter(Boolean);
    const clients = [...s.contracts.values()];
    panel.innerHTML = `
      <p class="shop__lead">Ta réputation grandit : à chaque niveau, de nouveaux établissements veulent travailler avec toi. Signature gratuite, +${formatMoney(bonus.money)} et +${bonus.xp} XP par contrat.</p>
      <p class="shop__section">Demandes en attente (${offers.length})</p>
      ${
        offers.length
          ? `<ul class="shop__items">${offers
              .map(
                (b) => `
        <li class="shop-item shop-item--offer" data-item="offer-${b.id}">
          <span class="shop-item__icon">${icon('star')}</span>
          <span class="shop-item__text"><b>${b.name}</b><small>${b.client.type} · ${formatMoney(b.client.money)} · +${b.client.xp} XP · ${b.client.durationS} s à pied</small></span>
          <span class="shop-item__actions">
            <button type="button" class="game-btn" data-see="${b.id}"><span class="game-btn__label">Voir</span></button>
            <button type="button" class="game-btn game-btn--primary" data-sign="${b.id}"><span class="game-btn__label">Signer</span></button>
          </span>
        </li>`
              )
              .join('')}</ul>`
          : `<p class="shop__empty">Aucune demande pour l'instant. De nouveaux établissements te contacteront au prochain niveau.</p>`
      }
      <p class="shop__section">Tes clients (${clients.length})</p>
      <ul class="shop__clients">${clients.map((c) => `<li>${c.name} <small>${c.client.type}</small></li>`).join('')}</ul>`;
  }

  // ------------------------------------------------------ Améliorations

  _renderUpgrades(locked) {
    const panel = this.el.querySelector('[data-panel="upgrades"]');
    if (locked) {
      panel.innerHTML = lockedHtml('Les améliorations se débloquent à la fin du tutoriel.');
      return;
    }
    const s = this.state;
    panel.innerHTML = `
      <p class="shop__lead">Des investissements permanents, achetés une seule fois, qui changent ta façon de travailler.</p>
      <ul class="shop__items">
        ${UPGRADE_IDS.map((id) => {
          const u = ECONOMY.upgrades[id];
          const owned = s.upgrades.includes(id);
          const blocker = s.upgradeBlocker(id);
          const levelLocked = !owned && !u.comingSoon && u.unlockLevel > s.level;
          let action;
          if (owned) action = `<span class="unit-row__status is-available">${icon('star')} Acquise</span>`;
          else if (u.comingSoon) action = `<button type="button" class="game-btn" aria-disabled="true" title="${blocker}"><span class="game-btn__label">Bientôt</span></button>`;
          else if (levelLocked) action = `<button type="button" class="game-btn" aria-disabled="true" title="${blocker}"><span class="game-btn__label">${icon('lock')} Niveau ${u.unlockLevel}</span></button>`;
          else action = `<button type="button" class="game-btn game-btn--primary" data-upgrade="${id}" aria-disabled="${Boolean(blocker)}" title="${blocker ?? ''}"><span class="game-btn__label">${formatMoney(u.cost)}</span></button>`;
          return `
        <li class="shop-item${owned ? ' is-owned' : ''}${levelLocked || u.comingSoon ? ' is-locked' : ''}" data-item="upgrade-${id}">
          <span class="shop-item__icon">${icon(u.icon)}</span>
          <span class="shop-item__text"><b>${u.label}</b><small>${u.desc}</small></span>
          ${action}
        </li>`;
        }).join('')}
      </ul>`;
  }

  // ------------------------------------------------------------- Premium

  _renderPremium(locked) {
    const panel = this.el.querySelector('[data-panel="premium"]');
    if (locked) {
      panel.innerHTML = lockedHtml('La boutique premium ouvre à la fin du tutoriel.');
      return;
    }
    if (panel.dataset.built) return; // contenu statique : pas de re-rendu (garde « Arrive bientôt »)
    panel.dataset.built = '1';
    panel.innerHTML = `
      <p class="shop__demo">${icon('lock')} Achats en argent réel : <b>démonstration</b>, aucun paiement n'est actif pour l'instant.</p>
      <ul class="premium">
        ${ECONOMY.premium.map(
          (p) => `
        <li class="premium-pack">
          ${p.tag ? `<span class="premium-pack__tag">${p.tag}</span>` : ''}
          <span class="premium-pack__art" aria-hidden="true">${icon('coin')}<small>visuel à venir</small></span>
          <b class="premium-pack__name">${p.label}</b>
          <ul class="premium-pack__contents">${p.contents.map((c) => `<li>${c}</li>`).join('')}</ul>
          <button type="button" class="game-btn game-btn--primary" data-pack="${p.id}" data-price="${formatXof(p.priceXOF)}">
            <span class="game-btn__label" role="status">${formatXof(p.priceXOF)}</span>
          </button>
        </li>`
        ).join('')}
      </ul>
      <p class="shop__note">Prix en <b>XOF</b> (argent réel), à ne pas confondre avec les FCFA gagnés en jeu.</p>`;
  }

  /** Achat premium simulé : pas de paiement, juste « Arrive bientôt ». */
  _comingSoon(btn) {
    sfx.denied();
    const label = btn.querySelector('.game-btn__label');
    label.textContent = 'Arrive bientôt';
    btn.classList.add('is-soon');
    clearTimeout(btn._t);
    btn._t = setTimeout(() => {
      label.textContent = btn.dataset.price;
      btn.classList.remove('is-soon');
    }, COMING_SOON_MS);
  }

  _act(btn, fn, kind) {
    if (btn.getAttribute('aria-disabled') === 'true' || !fn()) {
      sfx.denied();
      if (this.tutorialRecruit && btn.dataset.buy === 'walker') {
        this.recruitDenied += 1;
        bus.emit('recruit_denied');
        return; // pas de secousse : échec muet à l'écran
      }
      btn.classList.remove('is-denied');
      void btn.offsetWidth;
      btn.classList.add('is-denied');
      return;
    }
    if (kind === 'repair' || kind === 'upgrade') sfx.buy();
    else if (kind === 'contract') sfx.hire();
    else if (btn.dataset.buy === 'walker') sfx.hire();
    else sfx.buy();
    const item = this.el.querySelector(`[data-item="${btn.closest('.shop-item')?.dataset.item}"]`);
    item?.classList.remove('is-bought');
    void item?.offsetWidth;
    item?.classList.add('is-bought');
  }

  destroy() {
    clearInterval(this._timer);
    window.removeEventListener('keydown', this._onKey);
    this._off();
    this.el.remove();
  }
}

function lockedHtml(text) {
  return `<div class="shop__locked">${icon('lock')}<p>${text}</p></div>`;
}

/** Prix en argent réel : « 1 000 XOF ». */
function formatXof(amount) {
  return formatMoney(amount).replace('FCFA', 'XOF'); // même séparateur de milliers
}
