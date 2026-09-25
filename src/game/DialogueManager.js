import { bus } from './events.js';

const RECHECK_MS = 300;

/**
 * Pilote la boîte de dialogue au rythme du jeu (guide technique §4).
 * - `say(group)` : enchaîne les répliques d'un groupe du script
 *   ({ mode, focus, lines }). En format 'full', la caméra zoome d'abord vers
 *   la cible du groupe (`focus`), puis revient à la vue d'avant à la fin
 *   (zoom / dézoom — refonte niveau 1). En 'light' : ni zoom ni assombrissement.
 * - `waitUntil(cond)` : cache la boîte (Karim reste discret dans le coin) et
 *   attend qu'une condition de jeu devienne vraie — revérifiée à chaque
 *   événement du bus (et toutes les 300 ms pour les minuteries).
 *
 * - `prompt(group, cond)` : réplique(s) de CONSIGNE (« Clique sur… ») — la
 *   dernière reste affichée sans ▼ et se ferme d'elle-même dès que `cond()`
 *   est vraie : pas de clic en plus sur la boîte (corrections du 2026-09-25).
 *
 * La condition est un état (« ce bâtiment a été collecté »), pas un
 * événement : si le joueur agit plus vite que le dialogue, rien n'est manqué.
 */
export class DialogueManager {
  /**
   * @param {object} camera  { focus(target) -> Promise<restore()> } fourni par GameController
   */
  constructor(box, state, camera) {
    this.box = box;
    this.state = state;
    this.camera = camera;
    this.cancelled = false;
  }

  _resolveLine(line) {
    const name = this.state.playerName || 'Ange';
    const text = line.text.replaceAll('{PRENOM}', name);
    const isKarim = line.speaker === 'karim';
    return { ...line, text, isKarim, speaker: isKarim ? 'Karim' : name, playerName: name };
  }

  /**
   * @param {{ mode?: 'full'|'light', focus?: string, lines: object[] }} group
   * @param {{ restoreCamera?: boolean }} options
   */
  async say(group, { restoreCamera = true } = {}) {
    const mode = group.mode ?? 'light';
    this.box.setMode(mode);
    let restore = null;
    if (mode === 'full' && group.focus && this.camera) {
      this.box.hide({ withKarim: false });
      restore = await this.camera.focus(group.focus);
    }
    for (const line of group.lines) {
      if (this.cancelled) return;
      await this.box.say(this._resolveLine(line));
    }
    if (restore && restoreCamera) {
      this.box.hide({ withKarim: true });
      await restore();
    }
  }

  /**
   * @param {{ mode?: 'full'|'light', focus?: string, lines: object[] }} group
   * @param {() => boolean} cond  l'action attendue est faite
   */
  async prompt(group, cond, { restoreCamera = true } = {}) {
    if (cond()) return;
    const mode = group.mode ?? 'light';
    this.box.setMode(mode);
    let restore = null;
    if (mode === 'full' && group.focus && this.camera) {
      this.box.hide({ withKarim: false });
      restore = await this.camera.focus(group.focus);
    }
    const met = this._when(cond);
    let done = false;
    met.then(() => (done = true));
    const { lines } = group;
    for (let i = 0; i < lines.length && !done && !this.cancelled; i++) {
      const hold = i === lines.length - 1;
      // les premières répliques s'avancent au clic ; l'action les court-circuite
      await Promise.race([this.box.say(this._resolveLine(lines[i]), { hold }), met]);
    }
    await met;
    if (this.cancelled) return;
    if (restore && restoreCamera) {
      this.box.hide({ withKarim: true });
      await restore();
    }
  }

  hide({ withKarim = true } = {}) {
    this.box.hide({ withKarim });
  }

  waitUntil(cond, { withKarim = true } = {}) {
    if (cond()) return Promise.resolve();
    this.hide({ withKarim });
    return this._when(cond);
  }

  /** Promesse résolue quand `cond()` devient vraie (ou si le dialogue est annulé). */
  _when(cond) {
    return new Promise((resolve) => {
      const check = () => {
        if (this.cancelled || cond()) {
          off();
          clearInterval(timer);
          resolve();
        }
      };
      const off = bus.on('*', check);
      const timer = setInterval(check, RECHECK_MS);
      check();
    });
  }

  cancel() {
    this.cancelled = true;
  }
}
