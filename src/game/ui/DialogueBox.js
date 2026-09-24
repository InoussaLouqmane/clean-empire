import { sfx } from '../sfx.js';

const TYPE_MS_PER_CHAR = 22;
const KARIM_PORTRAIT = 'assets/characters/karim.png';

/**
 * Boîte de dialogue (affichage pur : ne connaît rien du jeu — voir
 * DialogueManager). Convention du script niveau 1 : le bouton NEXT est
 * toujours visible ; un clic sur la boîte termine l'effet machine à écrire,
 * puis passe à la suite.
 *
 * + « Karim discret » : petit portrait en bas à droite, visible quand la
 * boîte est cachée pendant que le joueur agit.
 */
export class DialogueBox {
  constructor(root) {
    this.el = document.createElement('div');
    this.el.className = 'dialogue';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="dialogue__portrait" aria-hidden="true"><img alt="" /></div>
      <div class="dialogue__body">
        <p class="dialogue__speaker"></p>
        <p class="dialogue__text" aria-live="polite"></p>
      </div>
      <button type="button" class="game-btn game-btn--primary dialogue__next">
        <span class="game-btn__label">NEXT</span>
      </button>`;
    root.appendChild(this.el);

    this.corner = document.createElement('div');
    this.corner.className = 'karim-corner';
    this.corner.hidden = true;
    this.corner.innerHTML = `<img src="${KARIM_PORTRAIT}" alt="Karim" /><span>Karim</span>`;
    root.appendChild(this.corner);

    this.portraitEl = this.el.querySelector('.dialogue__portrait');
    this.portraitImg = this.portraitEl.querySelector('img');
    this.speakerEl = this.el.querySelector('.dialogue__speaker');
    this.textEl = this.el.querySelector('.dialogue__text');
    this.nextBtn = this.el.querySelector('.dialogue__next');

    this._resolve = null;
    this._typing = null;

    this.el.addEventListener('click', () => this._advance());
    this._onKey = (e) => {
      if (this.el.hidden) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._advance();
      }
    };
    window.addEventListener('keydown', this._onKey);
  }

  /**
   * Affiche une réplique. Résout la promesse quand le joueur clique NEXT
   * sur le texte entièrement affiché.
   * @param {{ speaker: string, isKarim: boolean, expression?: string, text: string }} line
   */
  say({ speaker, isKarim, expression, text }) {
    this.show();
    this.el.classList.toggle('is-player', !isKarim);
    this.portraitEl.hidden = !isKarim;
    if (isKarim) this.portraitImg.src = KARIM_PORTRAIT;
    // Une seule image pour toutes les expressions pour l'instant (décision
    // utilisateur) : l'expression est gardée en attribut pour le jour où les
    // portraits arrivent.
    this.el.dataset.expression = expression ?? '';
    this.speakerEl.textContent = speaker;
    this._type(text);
    return new Promise((resolve) => (this._resolve = resolve));
  }

  _type(text) {
    clearInterval(this._typing?.timer);
    this.textEl.textContent = '';
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      this.textEl.textContent = text;
      this._typing = null;
      return;
    }
    let i = 0;
    const typing = { text, timer: 0 };
    typing.timer = setInterval(() => {
      i += 1;
      this.textEl.textContent = text.slice(0, i);
      if (i % 3 === 0) sfx.dialogue();
      if (i >= text.length) {
        clearInterval(typing.timer);
        this._typing = null;
      }
    }, TYPE_MS_PER_CHAR);
    this._typing = typing;
  }

  _advance() {
    if (this._typing) {
      clearInterval(this._typing.timer);
      this.textEl.textContent = this._typing.text;
      this._typing = null;
      return;
    }
    if (this._resolve) {
      sfx.click();
      const resolve = this._resolve;
      this._resolve = null;
      resolve();
    }
  }

  show() {
    this.el.hidden = false;
    this.corner.hidden = true;
  }

  /** Cache la boîte ; `withKarim` laisse Karim discret dans le coin. */
  hide({ withKarim = false } = {}) {
    this.el.hidden = true;
    this.corner.hidden = !withKarim;
  }

  destroy() {
    clearInterval(this._typing?.timer);
    window.removeEventListener('keydown', this._onKey);
    this.el.remove();
    this.corner.remove();
  }
}
