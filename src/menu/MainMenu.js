import { icon } from './icons.js';

// Main Menu de CLEAN CEO — overlay DOM/CSS (pas Phaser), pour s'afficher
// immédiatement sans attendre le moteur de jeu ni les assets de la carte
// (voir gameLoader.js). Référence visuelle : maquette "page_main_menu" et
// design system fournis par l'utilisateur le 2026-09-24 (voir STATUS.md).
//
// Les actions déclenchent leur effet APRÈS le petit feedback de clic
// (ACTION_DELAY_MS), comme le demande le design system : "le bouton descend,
// puis l'action est déclenchée".

const ACTION_DELAY_MS = 110;
const LEAVE_MS = 250;

const RULES = [
  ['coin', 'Collecte', '15 s → +500 FCFA, +4 XP'],
  ['folder', 'Nouveau contrat', '+1 000 FCFA, +10 XP'],
  ['smiley', 'Recruter un ouvrier', '2 000 FCFA'],
  ['coin', 'Tricycle', '5 000 FCFA · collecte −5 s'],
  ['coin', 'Camion', '50 000 FCFA · collecte −10 s'],
  ['star', 'Niveau suivant', 'tous les 100 XP'],
];

export class MainMenu {
  /**
   * @param {object} options
   * @param {HTMLElement} options.root  conteneur où monter le menu
   * @param {import('./SoundManager.js').SoundManager} options.sound
   * @param {() => void} options.onNewGame
   */
  constructor({ root, sound, onNewGame }) {
    this.root = root;
    this.sound = sound;
    this.onNewGame = onNewGame;
    this.openModalEl = null;
    this._render();
    this._bind();
    this._syncSoundButton();
    sound.onChange(() => this._syncSoundButton());
  }

  _render() {
    this.el = document.createElement('div');
    this.el.className = 'menu';
    this.el.innerHTML = `
      <div class="menu-bg" aria-hidden="true"></div>

      <header class="menu-top">
        <div class="hud" aria-label="Ressources de départ">
          <span class="hud-item">${icon('coin')}<span><b>500</b> FCFA</span></span>
          <span class="hud-item">${icon('star')}<span><b>0</b> XP</span></span>
          <span class="hud-item">${icon('smiley')}<span>Bonne</span></span>
        </div>

        <nav class="menu-icons" aria-label="Réglages rapides">
          <button type="button" class="icon-btn" data-action="language"
            aria-label="Langue" aria-disabled="true" data-tooltip="Langue — bientôt disponible">${icon('globe')}</button>
          <button type="button" class="icon-btn" data-action="sound" data-sound-toggle></button>
          <button type="button" class="icon-btn" data-action="settings"
            aria-label="Paramètres" data-tooltip="Paramètres">${icon('gear')}</button>
        </nav>
      </header>

      <main class="menu-center">
        <img class="menu-logo" src="assets/menu/logo_clean_ceo.png" alt="CLEAN CEO" width="283" height="283" />
        <div class="menu-buttons" role="menu">
          ${this._menuButton('new', 'play', 'Nouvelle partie', { primary: true })}
          ${this._menuButton('resume', 'folder', 'Reprendre partie', {
            disabled: true,
            tooltip: 'Aucune partie sauvegardée',
          })}
          ${this._menuButton('howto', 'book', 'Comment jouer')}
          ${this._menuButton('options', 'gear', 'Options')}
        </div>
      </main>

      <footer class="menu-footer">${icon('leaf')}<span>CLEAN CEO</span></footer>
    `;
    this.root.appendChild(this.el);
    this.buttons = [...this.el.querySelectorAll('.menu-btn')];
    this.soundBtn = this.el.querySelector('[data-action="sound"]');
  }

  _menuButton(action, iconName, label, { primary = false, disabled = false, tooltip = '' } = {}) {
    const index = ['new', 'resume', 'howto', 'options'].indexOf(action);
    return `
      <button type="button" role="menuitem" data-action="${action}" style="--i:${index}"
        class="menu-btn${primary ? ' menu-btn--primary' : ''}"
        ${disabled ? 'aria-disabled="true"' : ''}
        ${tooltip ? `data-tooltip="${tooltip}"` : ''}>
        <span class="menu-btn__icon">${icon(iconName)}</span>
        <span class="menu-btn__label">${label}</span>
        <span class="menu-btn__chevron">${icon('chevron')}</span>
      </button>`;
  }

  _bind() {
    this.el.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-action]');
      if (!btn || !this.el.contains(btn)) return;

      if (btn.getAttribute('aria-disabled') === 'true') {
        this.sound.playDenied();
        btn.classList.remove('is-denied');
        void btn.offsetWidth; // relance l'animation de refus à chaque clic
        btn.classList.add('is-denied');
        return;
      }

      this.sound.playClick();
      const action = btn.dataset.action;
      setTimeout(() => this._runAction(action, btn), ACTION_DELAY_MS);
    });

    // Son de survol : seulement à l'entrée du pointeur sur un bouton actif.
    this.el.addEventListener('pointerover', (event) => {
      const btn = event.target.closest('button');
      if (!btn || btn.contains(event.relatedTarget)) return;
      if (btn.getAttribute('aria-disabled') === 'true') return;
      this.sound.playHover();
    });

    // Flèches haut/bas pour naviguer entre les 4 boutons principaux.
    this.el.addEventListener('keydown', (event) => {
      if (this.openModalEl) return;
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const current = this.buttons.indexOf(document.activeElement);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const next = current === -1 ? 0 : (current + delta + this.buttons.length) % this.buttons.length;
      this.buttons[next].focus();
      event.preventDefault();
    });

    this._onKeyDownGlobal = (event) => {
      if (event.key === 'Escape' && this.openModalEl) this._closeModal();
    };
    document.addEventListener('keydown', this._onKeyDownGlobal);
  }

  _runAction(action, btn) {
    switch (action) {
      case 'new':
        this.onNewGame();
        break;
      case 'howto':
        this._openHowTo(btn);
        break;
      case 'options':
      case 'settings':
        this._openOptions(btn);
        break;
      case 'sound':
        this.sound.toggleMuted();
        break;
      default:
        break;
    }
  }

  _syncSoundButton() {
    const muted = this.sound.muted;
    this.soundBtn.innerHTML = icon(muted ? 'soundOff' : 'soundOn');
    this.soundBtn.setAttribute('aria-pressed', String(muted));
    this.soundBtn.setAttribute('aria-label', muted ? 'Réactiver le son' : 'Couper le son');
    this.soundBtn.dataset.tooltip = muted ? 'Son coupé' : 'Son activé';
    this.soundBtn.classList.toggle('is-off', muted);

    const toggle = this.openModalEl?.querySelector('[data-option="music"]');
    if (toggle) {
      toggle.textContent = muted ? 'Coupé' : 'Activé';
      toggle.setAttribute('aria-pressed', String(!muted));
    }
  }

  // ---------------------------------------------------------------- modales

  _openModal(title, bodyHtml, returnFocusTo) {
    this._closeModal();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal__header"><h2 id="modal-title">${title}</h2></header>
        <div class="modal__body">${bodyHtml}</div>
        <footer class="modal__footer">
          <button type="button" class="menu-btn menu-btn--small" data-modal-close>
            <span class="menu-btn__label">Retour</span>
          </button>
        </footer>
      </section>`;

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop || event.target.closest('[data-modal-close]')) {
        this.sound.playClick();
        this._closeModal();
      }
    });
    backdrop.addEventListener('pointerover', (event) => {
      const btn = event.target.closest('button');
      if (btn && !btn.contains(event.relatedTarget) && btn.getAttribute('aria-disabled') !== 'true') {
        this.sound.playHover();
      }
    });

    this.el.appendChild(backdrop);
    this.el.classList.add('has-modal');
    this.openModalEl = backdrop;
    this._returnFocusTo = returnFocusTo;
    backdrop.querySelector('[data-modal-close]').focus();
    return backdrop;
  }

  _closeModal() {
    if (!this.openModalEl) return;
    this.openModalEl.remove();
    this.openModalEl = null;
    this.el.classList.remove('has-modal');
    this._returnFocusTo?.focus();
  }

  _openHowTo(returnFocusTo) {
    const rows = RULES.map(
      ([iconName, name, value]) => `
        <li class="rule">${icon(iconName)}<span class="rule__name">${name}</span><span class="rule__value">${value}</span></li>`
    ).join('');

    this._openModal(
      'Comment jouer',
      `<p class="modal__intro">Tu diriges une jeune entreprise de collecte de déchets.
        Envoie tes ouvriers chez tes clients, ramène les déchets au dépôt, encaisse
        et investis pour couvrir toute la ville.</p>
       <ul class="rules">${rows}</ul>
       <p class="modal__warning"><strong>Attention :</strong> 3 retards sur un contrat et le
        client le résilie (−15 XP). Protège ta réputation !</p>
       <p class="modal__start">Tu démarres avec <b>500 FCFA</b>, <b>0 XP</b> et <b>1 ouvrier</b>.</p>`,
      returnFocusTo
    );
  }

  _openOptions(returnFocusTo) {
    const muted = this.sound.muted;
    const volume = Math.round(this.sound.volume * 100);
    const modal = this._openModal(
      'Options',
      `<div class="option">
         <span class="option__label">Musique</span>
         <button type="button" class="toggle" data-option="music" aria-pressed="${!muted}">${muted ? 'Coupé' : 'Activé'}</button>
       </div>
       <label class="option">
         <span class="option__label">Volume</span>
         <input type="range" min="0" max="100" step="5" value="${volume}" data-option="volume" />
       </label>
       <div class="option">
         <span class="option__label">Langue</span>
         <span class="choice">
           <button type="button" class="toggle" aria-pressed="true">Français</button>
           <button type="button" class="toggle" aria-disabled="true" data-tooltip="Bientôt disponible">English</button>
         </span>
       </div>`,
      returnFocusTo
    );

    modal.querySelector('[data-option="music"]').addEventListener('click', () => {
      this.sound.playClick();
      this.sound.toggleMuted();
    });
    modal.querySelector('[data-option="volume"]').addEventListener('input', (event) => {
      this.sound.setVolume(Number(event.target.value) / 100);
    });
    modal.querySelector('.toggle[aria-disabled="true"]').addEventListener('click', () => {
      this.sound.playDenied();
    });
  }

  // ------------------------------------------------------ passage au jeu

  /** Fait disparaître le contenu du menu (garde le fond) et affiche l'écran
   * de chargement. Renvoie un objet pour piloter la barre de progression. */
  showLoading() {
    this._closeModal();
    this.el.classList.add('is-leaving');

    const overlay = document.createElement('div');
    overlay.className = 'loading';
    overlay.setAttribute('role', 'status');
    overlay.innerHTML = `
      <div class="loading__panel">
        <p class="loading__title">Chargement de la ville…</p>
        <div class="loading__bar" aria-hidden="true">${'<span></span>'.repeat(20)}</div>
        <p class="loading__percent">0 %</p>
      </div>`;
    setTimeout(() => this.el.appendChild(overlay), LEAVE_MS);

    const segments = overlay.querySelectorAll('.loading__bar span');
    const percentEl = overlay.querySelector('.loading__percent');
    const titleEl = overlay.querySelector('.loading__title');

    return {
      setProgress: (ratio) => {
        const pct = Math.round(Math.min(1, ratio) * 100);
        percentEl.textContent = `${pct} %`;
        const lit = Math.round((pct / 100) * segments.length);
        segments.forEach((s, i) => s.classList.toggle('is-lit', i < lit));
      },
      setTitle: (text) => {
        titleEl.textContent = text;
      },
    };
  }

  /** Retire tout le menu en fondu, une fois la carte affichée derrière. */
  destroy() {
    document.removeEventListener('keydown', this._onKeyDownGlobal);
    this.el.classList.add('is-gone');
    setTimeout(() => this.el.remove(), LEAVE_MS);
  }
}
