// Chargement différé de la partie "jeu" (Phaser + carte + éditeur, ~15 Mo).
//
// Principe (demande utilisateur du 2026-09-24) : le menu s'affiche d'abord,
// seul. UNE FOIS le menu entièrement chargé, on télécharge en silence le code
// du jeu (import() -> fichier séparé généré par Vite) puis chacun des assets
// de la carte, pour remplir le cache HTTP du navigateur. Au clic sur
// "Nouvelle partie", le loader de Phaser retrouve tout en cache : la carte
// s'ouvre quasi instantanément. Si le joueur clique avant la fin, l'écran de
// chargement reprend la progression là où elle en est (rien n'est relancé).

const PARALLEL_DOWNLOADS = 4;

let preloadPromise = null;
const state = { loaded: 0, total: 1, done: false };
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn({ ...state });
}

/** Abonnement à la progression { loaded, total, done } ; renvoie le désabonnement. */
export function onPreloadProgress(fn) {
  listeners.add(fn);
  fn({ ...state });
  return () => listeners.delete(fn);
}

async function prefetch(url) {
  try {
    const res = await fetch(encodeURI(url));
    await res.blob(); // lire le corps pour qu'il soit réellement mis en cache
  } catch {
    // Un asset en échec n'empêche pas de jouer : Phaser retentera lui-même.
  }
}

async function run() {
  const game = await import('../game.js');
  const urls = game.GAME_ASSET_URLS;
  state.total = urls.length + 1;
  state.loaded = 1;
  emit();

  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next++];
      await prefetch(url);
      state.loaded++;
      emit();
    }
  };
  await Promise.all(Array.from({ length: PARALLEL_DOWNLOADS }, worker));

  state.done = true;
  emit();
  return game;
}

/** Lance le pré-chargement (idempotent) et renvoie le module du jeu une fois tout prêt. */
export function preloadGame() {
  if (!preloadPromise) preloadPromise = run();
  return preloadPromise;
}

/** Attend que le menu soit complètement affiché (images, police), puis
 * démarre le pré-chargement pendant un moment calme du navigateur. */
export function preloadGameWhenMenuIsReady() {
  const begin = () => {
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 300));
    idle(() => preloadGame(), { timeout: 1500 });
  };
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  const pageLoaded =
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  Promise.all([fontsReady, pageLoaded]).then(begin);
}
