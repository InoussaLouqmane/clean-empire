import path from 'node:path';
import { defineConfig } from 'vite';

// Le dossier du projet EST le dossier utilisateur Windows (choix explicite du projet,
// voir CLAUDE.md). Il contient aussi AppData, OneDrive, Google Drive, Downloads, etc.
// Sans restriction, le watcher de fichiers de Vite (chokidar) essaie de parcourir tout
// ce dossier, y compris des fichiers "cloud" (OneDrive/Google Drive) qui déclenchent un
// re-téléchargement à chaque accès — ce qui bloque le serveur de dev indéfiniment
// ("ça n'arrête pas de charger"). On limite donc explicitement la surveillance aux
// dossiers/fichiers du projet.
const projectRoot = process.cwd();
const WATCHED_TOP_LEVEL = new Set([
  'src',
  'public',
  'index.html',
  'package.json',
  'package-lock.json',
  'vite.config.js',
]);

function isOutsideProject(filePath) {
  const rel = path.relative(projectRoot, filePath);
  if (rel === '') return false;
  const first = rel.split(path.sep)[0];
  return !WATCHED_TOP_LEVEL.has(first);
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    // Le fichier du jeu (Phaser ~1,5 Mo) est chargé à part, en arrière-plan,
    // après l'affichage du menu (voir src/menu/gameLoader.js) : sa taille est
    // assumée, inutile d'avertir à chaque build.
    chunkSizeWarningLimit: 1600,
  },
  server: {
    open: true,
    watch: {
      ignored: [isOutsideProject],
    },
  },
});
