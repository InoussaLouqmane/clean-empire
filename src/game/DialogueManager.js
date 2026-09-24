import { bus } from './events.js';

const RECHECK_MS = 300;

/**
 * Pilote la boîte de dialogue au rythme du jeu (guide technique §4).
 * - `say(lines)` : enchaîne des répliques, résout quand la dernière est
 *   fermée par NEXT.
 * - `waitUntil(cond)` : cache la boîte (Karim reste discret dans le coin) et
 *   attend qu'une condition de jeu devienne vraie — revérifiée à chaque
 *   événement du bus (et toutes les 300 ms pour les minuteries). C'est ce qui
 *   permet « la boîte disparaît pendant que le joueur agit, puis réapparaît ».
 *
 * La condition est un état (« ce bâtiment a été collecté »), pas un
 * événement : si le joueur agit plus vite que le dialogue (il clique sur
 * Collecter avant de fermer la bulle), rien n'est manqué.
 */
export class DialogueManager {
  constructor(box, state) {
    this.box = box;
    this.state = state;
    this.cancelled = false;
  }

  _resolveLine(line) {
    const name = this.state.playerName || 'Toi';
    const text = line.text.replaceAll('{PRENOM}', name);
    const isKarim = line.speaker === 'karim';
    return { ...line, text, isKarim, speaker: isKarim ? 'Karim' : name };
  }

  async say(lines) {
    for (const line of lines) {
      if (this.cancelled) return;
      await this.box.say(this._resolveLine(line));
    }
  }

  hide({ withKarim = true } = {}) {
    this.box.hide({ withKarim });
  }

  waitUntil(cond, { withKarim = true } = {}) {
    if (cond()) return Promise.resolve();
    this.hide({ withKarim });
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
    });
  }

  cancel() {
    this.cancelled = true;
  }
}
