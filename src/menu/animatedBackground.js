// Fond animé du Main Menu (essai du 2026-09-24, vidéo fournie par
// l'utilisateur, compressée en H.264 sans audio : ~1,6 Mo).
//
// - L'image fixe HD (menu.css) reste affichée immédiatement ; la vidéo ne
//   commence à se télécharger qu'une fois la page chargée, et n'apparaît
//   qu'une fois prête à jouer. Jamais d'écran vide.
// - La vidéo actuelle ne boucle pas proprement (le camion "saute" à la
//   reprise). En attendant une version où le camion sort du cadre, on fait un
//   fondu très court vers l'image fixe juste avant la fin, puis retour en
//   fondu au début : le saut devient une transition douce. Une seule vidéo
//   décodée (pas de double lecteur), pour rester léger.
// - Pas de vidéo si "réduire les animations" ou "économie de données" est
//   activé : l'image fixe suffit.

const VIDEO_URL = 'assets/menu/main_menu_background.mp4';
const LOOP_FADE_S = 0.45; // durée du fondu vers/depuis l'image fixe à la boucle

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
  video.style.opacity = '0';
  container.appendChild(video);

  let running = true;
  let frame = 0;

  const tick = () => {
    if (!running) return;
    const d = video.duration;
    if (d && !video.paused) {
      const t = video.currentTime;
      const opacity = Math.max(0, Math.min(1, t / LOOP_FADE_S, (d - t) / LOOP_FADE_S));
      video.style.opacity = opacity.toFixed(3);
    }
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    video.src = VIDEO_URL;
    video.addEventListener(
      'canplaythrough',
      () => {
        video.play().then(
          () => (frame = requestAnimationFrame(tick)),
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
      running = false;
      cancelAnimationFrame(frame);
      video.pause();
    },
  };
}
