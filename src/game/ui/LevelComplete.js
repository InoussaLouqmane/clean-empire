import { icon } from '../../menu/icons.js';
import { formatMoney } from '../economy.js';
import { sfx } from '../sfx.js';

/**
 * Écran de fin du niveau 1 (en attendant le niveau 2) : un vrai événement
 * (design system §15), avec le bilan de la partie.
 */
export function showLevelComplete(root, state, { onContinue, unlocks = '' }) {
  sfx.levelUp();
  const el = document.createElement('div');
  el.className = 'level-complete';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-labelledby', 'lc-title');
  el.innerHTML = `
    <div class="level-complete__panel">
      <p class="level-complete__badge">${icon('star')} Niveau 1 terminé ${icon('star')}</p>
      <h2 id="lc-title">L'affaire du cousin</h2>
      <p class="level-complete__lead">Bravo ${escapeHtml(state.playerName)}, l'entreprise est lancée.</p>
      <ul class="level-complete__stats">
        <li>${icon('coin')}<span>Argent</span><b>${formatMoney(state.money)}</b></li>
        <li>${icon('star')}<span>XP</span><b>${state.xp}</b></li>
        ${state.levelBonusXp ? `<li class="level-complete__bonus">${icon('star')}<span>dont bonus de fin de niveau</span><b>+${state.levelBonusXp} XP</b></li>` : ''}
        <li>${icon('worker')}<span>Unités de collecte</span><b>${state.units.length}</b></li>
      </ul>
      <p class="level-complete__next">Tu passes au <b>niveau 2</b> « À son compte »</p>
      ${unlocks ? `<p class="level-complete__unlocks">${unlocks}</p>` : ''}
      <div class="level-complete__actions">
        <button type="button" class="game-btn game-btn--primary" data-lc="continue">
          <span class="game-btn__label">Continuer à jouer</span>
        </button>
        <button type="button" class="game-btn game-btn--secondary" data-lc="menu">
          <span class="game-btn__label">Menu principal</span>
        </button>
      </div>
    </div>`;
  root.appendChild(el);

  el.querySelector('[data-lc="continue"]').addEventListener('click', () => {
    sfx.click();
    el.remove();
    onContinue();
  });
  el.querySelector('[data-lc="menu"]').addEventListener('click', () => {
    sfx.click();
    window.location.reload();
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
