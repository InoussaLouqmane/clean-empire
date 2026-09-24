import { sfx } from '../sfx.js';

const MAX_LENGTH = 16;

/** Séquence 0 du niveau 1 : « Comment est-ce qu'on t'appelle ? ». */
export function askPlayerName(root) {
  return new Promise((resolve) => {
    const el = document.createElement('form');
    el.className = 'name-input';
    el.innerHTML = `
      <label class="name-input__label" for="player-name">Comment est-ce qu'on t'appelle ?</label>
      <input id="player-name" class="name-input__field" type="text" maxlength="${MAX_LENGTH}"
        autocomplete="given-name" spellcheck="false" placeholder="Ton prénom" />
      <p class="name-input__error" aria-live="polite"></p>
      <button type="submit" class="game-btn game-btn--primary">
        <span class="game-btn__label">Valider</span>
      </button>`;
    root.appendChild(el);

    const field = el.querySelector('input');
    const error = el.querySelector('.name-input__error');
    setTimeout(() => field.focus(), 50);

    el.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = field.value.trim().replace(/\s+/g, ' ');
      if (!name) {
        sfx.denied();
        error.textContent = 'Écris ton prénom pour commencer.';
        field.focus();
        return;
      }
      sfx.click();
      el.classList.add('is-out');
      setTimeout(() => {
        el.remove();
        resolve(name.slice(0, MAX_LENGTH));
      }, 200);
    });
  });
}
