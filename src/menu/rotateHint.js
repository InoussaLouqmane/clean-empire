// Refonte niveau 1 : sur mobile en portrait, au lancement d'une partie, on
// invite à passer en paysage (le jeu est pensé pour l'horizontal). Le pop-up
// se ferme tout seul dès que l'appareil est tourné, ou via « Continuer ».

const isTouch = () => window.matchMedia?.('(pointer: coarse)').matches ?? false;
const isPortrait = () => window.matchMedia?.('(orientation: portrait)').matches ?? false;

export function needsRotateHint() {
  return isTouch() && isPortrait();
}

/** Affiche le pop-up ; résout quand le joueur continue (ou tourne l'appareil). */
export function showRotateHint(root, { onClick } = {}) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'modal-backdrop rotate-hint';
    el.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="rotate-title">
        <header class="modal__header"><h2 id="rotate-title">Tourne ton téléphone</h2></header>
        <div class="modal__body rotate-hint__body">
          <div class="rotate-hint__phone" aria-hidden="true"><span></span></div>
          <p>CLEAN CEO se joue mieux <b>en mode paysage</b>.</p>
        </div>
        <footer class="modal__footer">
          <button type="button" class="menu-btn menu-btn--small" data-rotate-continue>
            <span class="menu-btn__label">Continuer</span>
          </button>
        </footer>
      </section>`;
    root.appendChild(el);

    const mq = window.matchMedia('(orientation: portrait)');
    const finish = () => {
      mq.removeEventListener?.('change', onChange);
      el.remove();
      resolve();
    };
    const onChange = () => {
      if (!mq.matches) finish();
    };
    mq.addEventListener?.('change', onChange);
    el.querySelector('[data-rotate-continue]').addEventListener('click', () => {
      onClick?.();
      finish();
    });
    el.querySelector('[data-rotate-continue]').focus();
  });
}
