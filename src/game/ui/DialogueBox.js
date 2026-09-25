import { sfx } from '../sfx.js';
import { AVAILABLE_PORTRAITS, CHAR_DIR, PLAYER_NEUTRAL } from '../portraits.js';

const TYPE_MS_PER_CHAR = 22;
const KARIM_FALLBACK = `${CHAR_DIR}/karim.png`; // expression sans portrait livré
const KARIM_CORNER = `${CHAR_DIR}/karim_accueil.png`;
const missing = new Set();

function slug(expression) {
  return (expression ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
}

// Silhouette de buste (placeholder tant que le portrait n'est pas livré) :
// tête + épaules, l'initiale du personnage posée sur la tête.
const BUST_PLACEHOLDER_SVG = `
  <svg viewBox="0 0 160 200" aria-hidden="true">
    <path d="M8 200 C8 150 36 128 80 128 C124 128 152 150 152 200 Z" />
    <circle cx="80" cy="78" r="46" />
  </svg>`;

/**
 * Boîte de dialogue (refonte du 2026-09-25, références diagBox1-3 fournies
 * par l'utilisateur, façon Stardew Valley) :
 * - boîte large EN BAS de l'écran, texte toujours aligné à gauche ;
 * - portraits en BUSTE posés sur le haut de la boîte : joueur à gauche,
 *   Karim à droite ;
 * - nom dans une étiquette sur le bord haut, du côté de celui qui parle ;
 * - ▼ clignotant quand la réplique est entièrement affichée.
 * Deux formats :
 * - 'full'  : écran assombri (caméra gérée par le DialogueManager), les DEUX
 *             bustes, celui qui ne parle pas en retrait ;
 * - 'light' : sans assombrissement, seul le buste de celui qui parle, plus
 *             petit.
 * Un clic (ou Entrée / Espace) termine la machine à écrire puis avance.
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

    const bust = (who) => `
      <figure class="dialogue__bust dialogue__bust--${who}" aria-hidden="true">
        <img alt="" hidden />
        <div class="dialogue__placeholder">${BUST_PLACEHOLDER_SVG}<span class="dialogue__initial"></span></div>
      </figure>`;

    this.el = document.createElement('div');
    this.el.className = 'dialogue';
    this.el.hidden = true;
    this.el.innerHTML = `
      ${bust('player')}
      ${bust('karim')}
      <div class="dialogue__box">
        <p class="dialogue__speaker"></p>
        <p class="dialogue__text" aria-live="polite"></p>
        <button type="button" class="dialogue__more" aria-label="Suite">▼</button>
      </div>`;
    root.appendChild(this.el);

    this.corner = document.createElement('div');
    this.corner.className = 'karim-corner';
    this.corner.hidden = true;
    this.corner.innerHTML = `<img src="${KARIM_CORNER}" alt="Karim" /><span>Karim</span>`;
    root.appendChild(this.corner);

    this.busts = {
      karim: this._bustRefs(this.el.querySelector('.dialogue__bust--karim')),
      player: this._bustRefs(this.el.querySelector('.dialogue__bust--player')),
    };
    this.busts.karim.initial.textContent = 'K';
    this.speakerEl = this.el.querySelector('.dialogue__speaker');
    this.textEl = this.el.querySelector('.dialogue__text');

    this._resolve = null;
    this._typing = null;

    this.el.addEventListener('click', () => this._advance());
    this._onKey = (e) => {
      if (this.el.hidden) return;
      if (e.target.closest?.('.game-menu')) return; // Entrée/Espace dans le menu en jeu
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._advance();
      }
    };
    window.addEventListener('keydown', this._onKey);
  }

  _bustRefs(figure) {
    return {
      figure,
      img: figure.querySelector('img'),
      placeholder: figure.querySelector('.dialogue__placeholder'),
      initial: figure.querySelector('.dialogue__initial'),
      url: undefined,
    };
  }

  /** Format de la boîte : 'full' (écran assombri) ou 'light'. */
  setMode(mode) {
    this.mode = mode;
    this.el.classList.toggle('is-full', mode === 'full');
    this.el.classList.toggle('is-light', mode !== 'full');
    this.backdrop.hidden = mode !== 'full' || this.el.hidden;
  }

  /**
   * Affiche une réplique ; résout la promesse quand le joueur avance sur le
   * texte entièrement affiché.
   * @param {{ speaker: string, isKarim: boolean, expression?: string, text: string, playerName?: string }} line
   * @param {{ hold?: boolean }} options  `hold` : réplique de consigne — reste
   *   affichée sans ▼ et sans assombrissement, le clic ne la fait pas avancer
   *   (c'est le DialogueManager qui passe à la suite quand l'action est faite).
   */
  say({ speaker, isKarim, expression, text, playerName }, { hold = false } = {}) {
    this.hold = hold;
    this.show();
    this.el.classList.toggle('is-hold', hold);
    if (hold) this.backdrop.hidden = true;
    const changed = !this.el.classList.contains(isKarim ? 'is-karim' : 'is-player');
    this.el.classList.toggle('is-karim', isKarim);
    this.el.classList.toggle('is-player', !isKarim);
    this.el.dataset.expression = expression ?? '';

    // Initiale du joueur, affichée aussi quand c'est Karim qui parle (full).
    const name = playerName ?? (isKarim ? '' : speaker);
    if (name) this.busts.player.initial.textContent = name.trim().charAt(0).toUpperCase();

    const who = isKarim ? 'karim' : 'player';
    const key = `${isKarim ? 'karim' : 'joueur'}_${slug(expression)}`;
    const fallback = isKarim ? KARIM_FALLBACK : null;
    this._setBust(this.busts[who], AVAILABLE_PORTRAITS.has(key) ? `${CHAR_DIR}/${key}.png` : fallback, fallback);
    // Le joueur n'a pas encore parlé : sa silhouette (ou son portrait neutre).
    if (isKarim && this.busts.player.url === undefined) {
      const neutral = AVAILABLE_PORTRAITS.has(PLAYER_NEUTRAL) ? `${CHAR_DIR}/${PLAYER_NEUTRAL}.png` : null;
      this._setBust(this.busts.player, neutral, null);
    }

    if (changed) {
      const fig = this.busts[who].figure;
      fig.classList.remove('is-entering');
      void fig.offsetWidth; // relance l'animation
      fig.classList.add('is-entering');
    }

    this.speakerEl.textContent = speaker;
    this._type(text);
    return new Promise((resolve) => (this._resolve = resolve));
  }

  /** Portrait réel si `url` se charge, sinon `fallback`, sinon silhouette. */
  _setBust(bust, url, fallback) {
    const pick = (u) => (u && !missing.has(u) ? u : null);
    const target = pick(url) ?? pick(fallback);
    if (!target) {
      bust.url = null;
      bust.img.hidden = true;
      bust.placeholder.hidden = false;
      return;
    }
    if (bust.url === target) return;
    bust.url = target;
    bust.img.onload = () => {
      bust.img.hidden = false;
      bust.placeholder.hidden = true;
    };
    bust.img.onerror = () => {
      missing.add(target);
      bust.img.onerror = null;
      bust.url = undefined;
      this._setBust(bust, fallback, null);
    };
    bust.img.src = target;
  }

  _type(text) {
    clearInterval(this._typing?.timer);
    this.textEl.textContent = '';
    this.el.classList.add('is-typing');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      this.textEl.textContent = text;
      this._typing = null;
      this.el.classList.remove('is-typing');
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
        this.el.classList.remove('is-typing');
      }
    }, TYPE_MS_PER_CHAR);
    this._typing = typing;
  }

  /** Avance comme un clic sur la boîte (ex. clic sur la vitrine de la boutique). */
  advance() {
    if (!this.el.hidden) this._advance();
  }

  _advance() {
    if (this._typing) {
      clearInterval(this._typing.timer);
      this.textEl.textContent = this._typing.text;
      this._typing = null;
      this.el.classList.remove('is-typing');
      return;
    }
    if (this.hold) return; // consigne : on attend l'action, pas un clic
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
    // stoppe la machine à écrire (sinon elle continue, avec ses blips, boîte cachée)
    clearInterval(this._typing?.timer);
    this._typing = null;
    this.el.classList.remove('is-typing');
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
