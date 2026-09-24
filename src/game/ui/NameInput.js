import { sfx } from '../sfx.js';

const MAX_LENGTH = 16;

/**
 * Séquence 0 du niveau 1 : « Comment est-ce qu'on t'appelle ? ».
 * Non bloquante (refonte niveau 1) : la croix ✕ ferme la fenêtre, et un
 * prénom vide est accepté. Résout avec le prénom saisi, ou '' — l'appelant
 * applique alors le prénom par défaut (« Ange »).
 */
export function askPlayerName(root) {
  return new Promise((resolve) => {
    const el = document.createElement('form');
    el.className = 'name-input';
    el.innerHTML = `
      <button type="button" class="name-input__close" aria-label="Fermer">×</button>
      <label class="name-input__label" for="player-name">Comment est-ce qu'on t'appelle ?</label>
      <input id="player-name" class="name-input__field" type="text" maxlength="${MAX_LENGTH}"
        autocomplete="given-name" spellcheck="false" placeholder="Ton prénom (sinon : Ange)" />
      <button type="submit" class="game-btn game-btn--primary">
        <span class="game-btn__label">Valider</span>
      </button>`;
    root.appendChild(el);

    const field = el.querySelector('input');
    setTimeout(() => field.focus(), 50);

    const done = (name) => {
      sfx.click();
      el.classList.add('is-out');
      setTimeout(() => {
        el.remove();
        resolve(name);
      }, 200);
    };

    el.querySelector('.name-input__close').addEventListener('click', () => done(''));
    el.addEventListener('submit', (e) => {
      e.preventDefault();
      done(field.value.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH));
    });
  });
}
