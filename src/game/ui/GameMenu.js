import { icon } from '../../menu/icons.js';
import { sfx } from '../sfx.js';

// Mêmes clés que menu/SoundManager.js : sfx.js les relit à chaque son, donc
// un changement ici s'applique immédiatement.
const MUTE_KEY = 'clean-ceo-muted';
const VOLUME_KEY = 'clean-ceo-volume';

function read(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // stockage indisponible : réglage perdu au rechargement
  }
}

/**
 * Bouton « Menu » en haut à droite pendant la partie (demande utilisateur du
 * 2026-09-25) : son (couper / volume) et retour à l'accueil. La partie est
 * sauvegardée en continu, le retour recharge simplement la page (le menu
 * propose alors « Continuer ») ; une collecte en cours n'est pas sauvegardée,
 * d'où une confirmation dans le panneau dans ce cas.
 */
export class GameMenu {
  constructor(root, state) {
    this.state = state;
    this.el = document.createElement('div');
    this.el.className = 'game-menu';
    this.el.innerHTML = `
      <button type="button" class="game-menu__toggle" aria-label="Menu" aria-expanded="false">${icon('gear')}</button>
      <div class="game-menu__panel" role="dialog" aria-label="Menu" hidden>
        <p class="game-menu__title">Menu</p>
        <div class="game-menu__row">
          <span>Son</span>
          <button type="button" class="game-menu__mute" data-menu="mute"></button>
        </div>
        <label class="game-menu__row">
          <span>Volume</span>
          <input type="range" min="0" max="100" step="5" data-menu="volume" />
        </label>
        <button type="button" class="game-btn game-btn--primary" data-menu="resume">
          <span class="game-btn__label">Reprendre</span>
        </button>
        <button type="button" class="game-btn" data-menu="home">
          <span class="game-btn__label">Retour à l'accueil</span>
        </button>
        <div class="game-menu__confirm" hidden>
          <p>Une collecte est en cours : elle sera perdue. Ta partie est sauvegardée pour le reste.</p>
          <button type="button" class="game-btn game-btn--danger" data-menu="home-confirm">
            <span class="game-btn__label">Quitter quand même</span>
          </button>
        </div>
      </div>`;
    root.appendChild(this.el);

    this.toggleBtn = this.el.querySelector('.game-menu__toggle');
    this.panel = this.el.querySelector('.game-menu__panel');
    this.muteBtn = this.el.querySelector('[data-menu="mute"]');
    this.volume = this.el.querySelector('[data-menu="volume"]');
    this.confirm = this.el.querySelector('.game-menu__confirm');

    this.toggleBtn.addEventListener('click', () => {
      sfx.click();
      this.isOpen ? this.close() : this.open();
    });
    this.muteBtn.addEventListener('click', () => {
      const muted = read(MUTE_KEY, 'false') !== 'true';
      write(MUTE_KEY, muted);
      this._render();
      sfx.click(); // audible seulement si on vient de réactiver le son
    });
    this.volume.addEventListener('input', () => write(VOLUME_KEY, Number(this.volume.value) / 100));
    this.volume.addEventListener('change', () => sfx.click()); // aperçu du niveau
    this.el.querySelector('[data-menu="resume"]').addEventListener('click', () => {
      sfx.click();
      this.close();
    });
    this.el.querySelector('[data-menu="home"]').addEventListener('click', () => {
      sfx.click();
      if (Object.keys(this.state.collecting).length > 0 && this.confirm.hidden) {
        this.confirm.hidden = false;
        return;
      }
      this._goHome();
    });
    this.el.querySelector('[data-menu="home-confirm"]').addEventListener('click', () => this._goHome());

    this._onKey = (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    };
    this._onOutside = (e) => {
      if (this.isOpen && !this.el.contains(e.target)) this.close();
    };
    window.addEventListener('keydown', this._onKey);
    document.addEventListener('pointerdown', this._onOutside, true);
  }

  get isOpen() {
    return !this.panel.hidden;
  }

  open() {
    this._render();
    this.confirm.hidden = true;
    this.panel.hidden = false;
    this.toggleBtn.setAttribute('aria-expanded', 'true');
  }

  close() {
    this.panel.hidden = true;
    this.toggleBtn.setAttribute('aria-expanded', 'false');
  }

  _render() {
    const muted = read(MUTE_KEY, 'false') === 'true';
    this.muteBtn.innerHTML = `${icon(muted ? 'soundOff' : 'soundOn')}<span>${muted ? 'Coupé' : 'Activé'}</span>`;
    this.muteBtn.setAttribute('aria-pressed', String(!muted));
    const volume = Number(read(VOLUME_KEY, '0.6'));
    this.volume.value = String(Math.round((Number.isFinite(volume) ? volume : 0.6) * 100));
    this.volume.disabled = muted;
  }

  _goHome() {
    this.state.save();
    // Sans ?edit : le menu principal s'affiche (avec « Continuer »).
    window.location.reload();
  }

  destroy() {
    window.removeEventListener('keydown', this._onKey);
    document.removeEventListener('pointerdown', this._onOutside, true);
    this.el.remove();
  }
}
