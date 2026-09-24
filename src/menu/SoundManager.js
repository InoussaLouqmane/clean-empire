// Son du menu : musique en boucle (fichier fourni) + petits effets de
// survol/clic synthétisés en Web Audio (aucun fichier d'effet sonore n'a été
// livré — des "blips" carrés très courts, cohérents avec le pixel art).
//
// Lecture automatique : on TENTE de lancer la musique dès le chargement, mais
// les navigateurs bloquent presque toujours le son avant une première
// interaction de l'utilisateur (règle d'autoplay de Chrome/Safari/Firefox,
// impossible à contourner). Dans ce cas, la musique démarre au premier clic
// ou à la première touche n'importe où sur la page.
//
// Le choix "son coupé" est mémorisé (localStorage) et respecté partout.

const MUTE_KEY = 'clean-ceo-muted';
const VOLUME_KEY = 'clean-ceo-volume';
const MUSIC_URL = 'assets/sound/main_menu_music.mp3';

function readStorage(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // stockage indisponible : le réglage vaut pour la session seulement
  }
}

export class SoundManager {
  constructor() {
    this.muted = readStorage(MUTE_KEY, 'false') === 'true';
    this.volume = Number(readStorage(VOLUME_KEY, '0.6'));
    if (!Number.isFinite(this.volume)) this.volume = 0.6;
    this.listeners = new Set();

    this.music = new Audio(MUSIC_URL);
    this.music.loop = true;
    this.music.preload = 'auto';
    this.music.volume = this.volume;

    this.audioCtx = null;
    this._unlocked = false;
    this._onFirstGesture = this._onFirstGesture.bind(this);
  }

  /** Tente la lecture tout de suite ; sinon attend le premier geste. */
  start() {
    // Le contexte Web Audio (effets de survol/clic) ne peut démarrer qu'après
    // un geste, même quand la musique a pu se lancer toute seule.
    document.addEventListener('pointerdown', () => this._ctx(), { once: true, capture: true });
    if (this.muted) return;
    this.music.play().then(
      () => (this._unlocked = true),
      () => this._waitForGesture()
    );
  }

  _waitForGesture() {
    document.addEventListener('pointerdown', this._onFirstGesture, true);
    document.addEventListener('keydown', this._onFirstGesture, true);
  }

  _onFirstGesture(event) {
    this._ctx(); // débloque aussi le contexte Web Audio des effets sonores
    // Un premier clic sur le bouton volume lui-même veut dire "couper" : on
    // ne relance pas la musique juste avant qu'il la coupe.
    if (event.target?.closest?.('[data-sound-toggle]')) return;
    document.removeEventListener('pointerdown', this._onFirstGesture, true);
    document.removeEventListener('keydown', this._onFirstGesture, true);
    this._unlocked = true;
    if (!this.muted) this.music.play().catch(() => {});
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    for (const fn of this.listeners) fn(this);
  }

  setMuted(muted) {
    this.muted = muted;
    writeStorage(MUTE_KEY, muted);
    if (muted) {
      this.music.pause();
    } else {
      this.music.play().catch(() => this._waitForGesture());
    }
    this._emit();
  }

  toggleMuted() {
    this.setMuted(!this.muted);
  }

  setVolume(volume) {
    this.volume = Math.min(1, Math.max(0, volume));
    this.music.volume = this.volume;
    writeStorage(VOLUME_KEY, this.volume);
    this._emit();
  }

  /** Baisse la musique en fondu puis la met en pause (passage menu -> jeu). */
  fadeOutMusic(durationMs = 600) {
    const startVolume = this.music.volume;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      this.music.volume = startVolume * (1 - t);
      if (t < 1) requestAnimationFrame(step);
      else this.music.pause();
    };
    requestAnimationFrame(step);
  }

  _ctx() {
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.audioCtx = new Ctx();
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});
    return this.audioCtx;
  }

  /** Blip carré court : fréquence de départ -> arrivée, durée en ms. */
  _blip(fromHz, toHz, durationMs, gain) {
    if (this.muted) return;
    const ctx = this._ctx();
    if (!ctx || ctx.state !== 'running') return;

    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const t0 = ctx.currentTime;
    const t1 = t0 + durationMs / 1000;

    osc.type = 'square';
    osc.frequency.setValueAtTime(fromHz, t0);
    osc.frequency.exponentialRampToValueAtTime(toHz, t1);
    amp.gain.setValueAtTime(gain * this.volume, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t1);

    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }

  playHover() {
    this._blip(880, 1320, 45, 0.04);
  }

  playClick() {
    this._blip(520, 260, 90, 0.08);
  }

  /** Son court et grave : action indisponible (bouton désactivé, "bientôt"). */
  playDenied() {
    this._blip(180, 120, 140, 0.07);
  }
}
