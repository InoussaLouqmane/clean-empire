// Fond animé du Main Menu : vidéo fournie par l'utilisateur le 2026-09-24
// (new_lastest_background_video.mp4 — le camion sort du cadre, la boucle se
// raccorde proprement), compressée en H.264 sans audio (~1,6 Mo).
//
// - L'image fixe HD (menu.css) reste affichée immédiatement ; la vidéo ne
//   commence à se télécharger qu'une fois la page chargée, et apparaît en
//   fondu une fois prête à jouer. Jamais d'écran vide.
// - Pas de vidéo si "réduire les animations" ou "économie de données" est
//   activé : l'image fixe suffit.

const VIDEO_URL = 'assets/menu/main_menu_background.mp4';

export function createAnimatedBackground(container) {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData === true;
  if (reduceMotion || saveData) return { pause() {} };

  const video = document.createElement('video');
  video.className = 'menu-bg__video';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  container.appendChild(video);

  const start = () => {
    video.src = VIDEO_URL;
    video.addEventListener(
      'canplaythrough',
      () => {
        video.play().then(
          () => video.classList.add('is-ready'),
          () => video.remove() // lecture refusée : on garde l'image fixe
        );
      },
      { once: true }
    );
    video.addEventListener('error', () => video.remove(), { once: true });
  };

  // Ne pas concurrencer le chargement du menu lui-même.
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });

  return {
    /** Arrête la vidéo (lancement d'une partie) : plus aucun décodage. */
    pause() {
      video.pause();
    },
  };
}
