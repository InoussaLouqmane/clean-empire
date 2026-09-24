import './menu/tokens.css';
import './menu/menu.css';
import { MainMenu } from './menu/MainMenu.js';
import { SoundManager } from './menu/SoundManager.js';
import { preloadGame, preloadGameWhenMenuIsReady, onPreloadProgress } from './menu/gameLoader.js';

// Point d'entrée : UNIQUEMENT le menu. Aucun import de Phaser ici — le jeu
// (src/game.js) est chargé à la demande, voir menu/gameLoader.js.

const sound = new SoundManager();
let starting = false;

const menu = new MainMenu({
  root: document.getElementById('menu-root'),
  sound,
  onNewGame: async () => {
    if (starting) return;
    starting = true;

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

    game.startGame({ onReady: () => menu.destroy() });
  },
});

sound.start();
preloadGameWhenMenuIsReady();
