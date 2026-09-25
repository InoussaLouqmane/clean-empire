import { icon } from '../../menu/icons.js';
import { formatMoney } from '../economy.js';
import { bus } from '../events.js';
import { sfx } from '../sfx.js';

const MONEY_TYPES = new Set(['money_earned', 'money_held']);
const CLAIM_OUT_MS = 320;

/**
 * Carnet de quêtes (prompt du 2026-09-25) : quêtes actives avec une jauge de
 * progression ; une quête complétée affiche « Réclamer » — la récompense n'est
 * JAMAIS donnée automatiquement — puis disparaît de la liste.
 * Données : game/quests.js ; suivi : GameState (_checkQuests, claimQuest).
 */
export class QuestPanel {
  constructor(root, state) {
    this.state = state;
    this.isOpen = false;

    this.el = document.createElement('div');
    this.el.className = 'quest-panel';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="quest-panel__window" role="dialog" aria-label="Quêtes">
        <header class="quest-panel__header">
          ${icon('book')}<h2>Carnet d'objectifs</h2>
          <button type="button" class="shop__close" aria-label="Fermer les quêtes">×</button>
        </header>
        <ul class="quest-list" data-q="list"></ul>
        <p class="quest-panel__footer" data-q="footer"></p>
      </div>`;
    root.appendChild(this.el);
    this.list = this.el.querySelector('[data-q="list"]');

    this.el.addEventListener('click', (e) => {
      if (e.target.closest('.shop__close') || e.target === this.el) {
        sfx.close();
        this.close();
        return;
      }
      const btn = e.target.closest('[data-claim]');
      if (btn) this._claim(btn);
    });
    this._onKey = (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    };
    window.addEventListener('keydown', this._onKey);
    this._off = bus.on('state_changed', () => this.isOpen && !this._claiming && this.render());
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
    bus.emit('quests_opened');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el.hidden = true;
    bus.emit('quests_closed');
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  render() {
    const s = this.state;
    // Complétées d'abord (à réclamer), puis par ordre du carnet.
    const quests = s.activeQuests().sort((a, b) => Number(s.isQuestCompleted(b.id)) - Number(s.isQuestCompleted(a.id)));
    this.list.innerHTML = quests.length
      ? quests.map((q) => this._row(q)).join('')
      : `<li class="quest-list__empty">${icon('star')}<p>Tous les objectifs du moment sont remplis. De nouveaux arrivent au niveau suivant.</p></li>`;
    const locked = s.lockedQuestCount;
    this.el.querySelector('[data-q="footer"]').textContent = !s.introQuestsClaimed
      ? 'Réclame ces primes pour découvrir tes objectifs suivants.'
      : locked
        ? `${locked} objectif${locked > 1 ? 's' : ''} à débloquer aux niveaux suivants.`
        : 'Tu as débloqué tous les objectifs du jeu.';
  }

  _row(q) {
    const s = this.state;
    const done = s.isQuestCompleted(q.id);
    const { value, target } = s.questProgress(q);
    const fmt = (n) => (MONEY_TYPES.has(q.type) ? formatMoney(n) : String(n));
    const reward = [q.reward.money ? `+${formatMoney(q.reward.money)}` : '', q.reward.xp ? `+${q.reward.xp} XP` : ''].filter(Boolean).join(' · ');
    return `
      <li class="quest${done ? ' is-done' : ''}" data-quest="${q.id}">
        <span class="quest__icon" aria-hidden="true">${icon(done ? 'star' : 'book')}</span>
        <span class="quest__body">
          <b class="quest__title">${q.title}</b>
          <small class="quest__desc">${q.desc}</small>
          <span class="quest__gauge" role="meter" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${value}">
            <i style="width:${Math.round((100 * value) / target)}%"></i>
          </span>
          <small class="quest__count">${fmt(value)} / ${fmt(target)}</small>
        </span>
        <span class="quest__side">
          <span class="quest__reward">${reward}</span>
          ${done ? `<button type="button" class="game-btn game-btn--primary" data-claim="${q.id}"><span class="game-btn__label">Réclamer</span></button>` : ''}
        </span>
      </li>`;
  }

  _claim(btn) {
    const row = btn.closest('.quest');
    this._claiming = true; // pas de re-rendu pendant l'animation de sortie
    if (!this.state.claimQuest(btn.dataset.claim)) {
      this._claiming = false;
      sfx.denied();
      return;
    }
    sfx.coin();
    row.classList.add('is-claimed');
    setTimeout(() => {
      this._claiming = false;
      if (this.isOpen) this.render();
    }, CLAIM_OUT_MS);
  }

  destroy() {
    window.removeEventListener('keydown', this._onKey);
    this._off();
    this.el.remove();
  }
}
