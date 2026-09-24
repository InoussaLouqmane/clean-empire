import './menu/tokens.css';
import './menu/menu.css';
import { MainMenu } from './menu/MainMenu.js';
import { SoundManager } from './menu/SoundManager.js';
import { preloadGame, preloadGameWhenMenuIsReady, onPreloadProgress } from './menu/gameLoader.js';
import { hasSave } from './game/save.js';
import { needsRotateHint, showRotateHint } from './menu/rotateHint.js';

// Point d'entrée : UNIQUEMENT le menu. Aucun import de Phaser ici — le jeu
// (src/game.js) est chargé à la demande, voir menu/gameLoader.js.
// (game/save.js est un module sans Phaser : autorisé ici.)

const sound = new SoundManager();
let starting = false;

/** Lance le jeu : `mode` = 'new' (nouvelle partie) ou 'resume'. */
async function launch(mode) {
  if (starting) return;
  starting = true;

  // Mobile en portrait : inviter à passer en paysage avant de continuer.
  if (needsRotateHint()) await showRotateHint(menu.el, { onClick: () => sound.playClick() });

  sound.fadeOutMusic();
  const loading = menu.showLoading();
  const unsubscribe = onPreloadProgress(({ loaded, total }) => loading.setProgress(loaded / total));

  let game;
  try {
    game = await preloadGame();
  } catch (err) {
    console.error(err);
    loading.setTitle('Impossible de charger la partie. Recharge la page.');
    return;
  } finally {
    unsubscribe();
  }
  loading.setProgress(1);
  loading.setTitle('Préparation de la carte…');

  game.startGame({ mode, onReady: () => menu.destroy() });
}

const menu = new MainMenu({
  root: document.getElementById('menu-root'),
  sound,
  canResume: hasSave(),
  onNewGame: () => launch('new'),
  onResume: () => launch('resume'),
});

sound.start();
preloadGameWhenMenuIsReady();
