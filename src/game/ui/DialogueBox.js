import { sfx } from '../sfx.js';

const TYPE_MS_PER_CHAR = 22;
const CHAR_DIR = 'assets/characters';
const KARIM_FALLBACK = `${CHAR_DIR}/karim.png`;

// Portraits par expression : `karim_<expression>.png` / `joueur_<expression>.png`
// dans public/assets/characters/ (noms sans accents, voir la liste donnée à
// l'utilisateur le 2026-09-24). Tant qu'un fichier n'existe pas, repli
// automatique : image générique de Karim, ou vignette avec l'initiale du joueur.
const missing = new Set();

function slug(expression) {
  return (expression ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
}

/**
 * Boîte de dialogue, TOUJOURS CENTRÉE (refonte niveau 1). Deux formats :
 * - 'full'  : grande boîte + écran assombri (la caméra est gérée par le
 *             DialogueManager) — moments clés, première explication ;
 * - 'light' : même position, plus compacte, sans assombrissement — répliques
 *             courtes, pour garder le rythme.
 * Karim à DROITE, le joueur à GAUCHE, texte à côté de l'avatar qui parle.
 * NEXT toujours visible ; un clic termine la machine à écrire puis avance.
 *
 * + « Karim discret » : petit portrait en bas à droite, visible quand la
 * boîte est cachée pendant que le joueur agit.
 */
export class DialogueBox {
  constructor(root) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'dialogue-backdrop';
    this.backdrop.hidden = true;
    root.appendChild(this.backdrop);

    this.el = document.createElement('div');
    this.el.className = 'dialogue';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="dialogue__avatar dialogue__avatar--player" aria-hidden="true">
        <img alt="" hidden /><span class="dialogue__initial"></span>
      </div>
      <div class="dialogue__body">
        <p class="dialogue__speaker"></p>
        <p class="dialogue__text" aria-live="polite"></p>
        <button type="button" class="game-btn game-btn--primary dialogue__next">
          <span class="game-btn__label">NEXT</span>
        </button>
      </div>
      <div class="dialogue__avatar dialogue__avatar--karim" aria-hidden="true"><img alt="" /></div>`;
    root.appendChild(this.el);

    this.corner = document.createElement('div');
    this.corner.className = 'karim-corner';
    this.corner.hidden = true;
    this.corner.innerHTML = `<img src="${KARIM_FALLBACK}" alt="Karim" /><span>Karim</span>`;
    root.appendChild(this.corner);

    this.karimImg = this.el.querySelector('.dialogue__avatar--karim img');
    this.playerImg = this.el.querySelector('.dialogue__avatar--player img');
    this.playerInitial = this.el.querySelector('.dialogue__initial');
    this.speakerEl = this.el.querySelector('.dialogue__speaker');
    this.textEl = this.el.querySelector('.dialogue__text');

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

  /** Format de la boîte : 'full' (écran assombri) ou 'light'. */
  setMode(mode) {
    this.mode = mode;
    this.el.classList.toggle('is-full', mode === 'full');
    this.el.classList.toggle('is-light', mode !== 'full');
    this.backdrop.hidden = mode !== 'full' || this.el.hidden;
  }

  /**
   * Affiche une réplique ; résout la promesse quand le joueur clique NEXT sur
   * le texte entièrement affiché.
   * @param {{ speaker: string, isKarim: boolean, expression?: string, text: string }} line
   */
  say({ speaker, isKarim, expression, text }) {
    this.show();
    this.el.classList.toggle('is-karim', isKarim);
    this.el.classList.toggle('is-player', !isKarim);
    this.el.dataset.expression = expression ?? '';
    if (isKarim) this._setPortrait(this.karimImg, `${CHAR_DIR}/karim_${slug(expression)}.png`, KARIM_FALLBACK);
    else this._setPlayerPortrait(expression, speaker);
    this.speakerEl.textContent = speaker;
    this._type(text);
    return new Promise((resolve) => (this._resolve = resolve));
  }

  _setPortrait(img, url, fallback) {
    img.onerror = null;
    if (missing.has(url)) {
      img.src = fallback;
      return;
    }
    img.onerror = () => {
      missing.add(url);
      img.onerror = null;
      img.src = fallback;
    };
    img.src = url;
  }

  _setPlayerPortrait(expression, name) {
    const url = `${CHAR_DIR}/joueur_${slug(expression)}.png`;
    this.playerInitial.textContent = (name || '?').trim().charAt(0).toUpperCase();
    const showInitial = () => {
      this.playerImg.hidden = true;
      this.playerInitial.hidden = false;
    };
    if (missing.has(url)) return showInitial();
    this.playerImg.onload = () => {
      this.playerImg.hidden = false;
      this.playerInitial.hidden = true;
    };
    this.playerImg.onerror = () => {
      missing.add(url);
      showInitial();
    };
    showInitial();
    this.playerImg.src = url;
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
    this.backdrop.hidden = this.mode !== 'full';
    this.corner.hidden = true;
  }

  /** Cache la boîte ; `withKarim` laisse Karim discret dans le coin. */
  hide({ withKarim = false } = {}) {
    this.el.hidden = true;
    this.backdrop.hidden = true;
    this.corner.hidden = !withKarim;
  }

  destroy() {
    clearInterval(this._typing?.timer);
    window.removeEventListener('keydown', this._onKey);
    this.el.remove();
    this.backdrop.remove();
    this.corner.remove();
  }
}
