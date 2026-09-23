<div align="center">

# 🗑️♟️ Net Empire

**Un empire de la collecte de déchets, vu du ciel — en isométrique.**

Jeu 2D de gestion/logistique développé pendant un workshop game design.
Fais grandir ta flotte (ouvriers → tricycle → camion), collecte chez tes clients,
ramène tout au dépôt, et regarde ton FCFA et ta réputation grimper.

[![Phaser](https://img.shields.io/badge/Phaser-3-8B5CF6?logo=phaser&logoColor=white)](https://phaser.io/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Status](https://img.shields.io/badge/status-en_construction-orange)](./STATUS.md)
[![Deployed on Vercel](https://img.shields.io/badge/deployed_on-Vercel-000000?logo=vercel&logoColor=white)](https://clean-empire.vercel.app)

</div>

---

## 🎮 Le concept

Le joueur gère une petite entreprise de collecte de déchets dans une ville vue en
isométrique. Des ouvriers à pied, puis un tricycle, puis un camion, font la navette
entre les clients (commerces, écoles, hôpitaux...) et le point de dépôt / QG. Chaque
collecte rapporte de l'argent (FCFA) et de l'expérience ; investir dans du matériel
plus rapide et honorer les contrats à temps fait grandir l'empire.

> 🚧 Ce dépôt contient la **base technique** du jeu, construite étape par étape.
> L'état exact de ce qui est fonctionnel aujourd'hui est documenté dans
> [`STATUS.md`](./STATUS.md) — toujours à jour, jamais réécrit.

## ✨ Ce qui fonctionne aujourd'hui

- 🗺️ Rendu isométrique dimétrique (tuiles 64×32) plein écran, responsive
- 🖱️ **Caméra** : glisser pour panner (souris et tactile), molette / pincement pour
  zoomer, **inertie** façon Clash of Clans au relâchement
- 🎨 Grille de calibration en damier aux couleurs officielles du jeu, assez large pour
  naviguer longtemps avant d'atteindre un bord

## 🔜 Pas encore là

Bâtiments positionnés, interactions au clic, économie, vraie carte (en attente de
l'export Tiled), sons. Voir [`STATUS.md`](./STATUS.md) pour le détail précis et la
prochaine étape en cours.

## 🕹️ Live demo

<!-- Lien mis à jour après le premier déploiement Vercel -->
👉 **[Jouer à la démo](https://clean-empire.vercel.app)** *(scène de calibration —
pas encore le vrai jeu)*

## 🧱 Stack technique

| | |
|---|---|
| Moteur de jeu | [Phaser 3](https://phaser.io/) |
| Build / dev server | [Vite](https://vitejs.dev/) |
| Langage | JavaScript vanilla (ES modules) — pas de framework, pas de TypeScript |
| Déploiement | [Vercel](https://vercel.com/) |

## 🎨 Direction artistique

Vue isométrique dimétrique, ratio de tuile **64×32 px (2:1)**. Palette verrouillée :

| | | | | | | | | | | | |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ![#1B1712](https://placehold.co/40x40/1B1712/1B1712.png) | ![#6B5A46](https://placehold.co/40x40/6B5A46/6B5A46.png) | ![#8C7860](https://placehold.co/40x40/8C7860/8C7860.png) | ![#4C6B3F](https://placehold.co/40x40/4C6B3F/4C6B3F.png) | ![#6E8F52](https://placehold.co/40x40/6E8F52/6E8F52.png) | ![#9C5B3E](https://placehold.co/40x40/9C5B3E/9C5B3E.png) | ![#C98F5E](https://placehold.co/40x40/C98F5E/C98F5E.png) | ![#5B4632](https://placehold.co/40x40/5B4632/5B4632.png) | ![#1F5E52](https://placehold.co/40x40/1F5E52/1F5E52.png) | ![#C79A3B](https://placehold.co/40x40/C79A3B/C79A3B.png) | ![#A23B2A](https://placehold.co/40x40/A23B2A/A23B2A.png) | ![#F1E9D2](https://placehold.co/40x40/F1E9D2/F1E9D2.png) |
| `#1B1712` | `#6B5A46` | `#8C7860` | `#4C6B3F` | `#6E8F52` | `#9C5B3E` | `#C98F5E` | `#5B4632` | `#1F5E52` | `#C79A3B` | `#A23B2A` | `#F1E9D2` |

## 🚀 Démarrage rapide

Prérequis : [Node.js](https://nodejs.org/) 18+ et npm.

```bash
# Installer les dépendances
npm install

# Lancer le serveur de dev (hot reload)
npm run dev

# Build de production → dist/
npm run build

# Prévisualiser le build de production
npm run preview
```

`npm run dev` ouvre un serveur local (Vite l'affiche dans le terminal, généralement
`http://localhost:5173`).

## 📁 Structure du projet

```
index.html              Point d'entrée HTML, monte le canvas Phaser dans #game-container
vite.config.js           Config Vite (dossier public/ servi tel quel)
package.json

public/assets/           Assets statiques, servis tels quels par Vite
  tiles/                  Tuiles de sol et de route (64×32)
  buildings/              Bâtiments clients, bâtiment cousin, QG, point de dépôt
  characters/             Sprites ouvrier (marche, retour chargé)
  vehicles/               Tricycle, camion
  props/                  Poubelles de rue, décor de rue
  ui/                     Icônes économie, jauge de réputation, boutons, alertes, écrans
  sound/                  Vide pour l'instant

src/
  main.js                 Point d'entrée JS, crée l'instance Phaser.Game
  CameraController.js     Module caméra réutilisable : pan (glisser souris/tactile),
                           zoom (molette + pincement), inertie au relâchement
  scenes/
    CalibrationScene.js   Scène actuelle : grille isométrique aux couleurs du jeu,
                           sert à tester la caméra — sera remplacée par la vraie carte
  mapLoader.js             Stub en attente de l'export Tiled de la carte réelle
```

## 📚 Documentation du projet

| Fichier | Contenu |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Décisions verrouillées : stack, palette, vue isométrique, bug connu de Phaser sur le tile-picking, économie prévue |
| [`STATUS.md`](./STATUS.md) | Journal *append-only* — ce qui est fait, bloqué, et la prochaine étape, session par session |

## 🤖 Reprendre ce projet (humain ou agent IA)

Ce projet est pensé pour être repris sans contexte préalable, y compris par une autre
session Claude Code ou un autre agent IA :

1. Lire [`CLAUDE.md`](./CLAUDE.md) pour les décisions déjà verrouillées.
2. Lire la **dernière entrée** de [`STATUS.md`](./STATUS.md) pour savoir où le projet
   en est et quelle est la prochaine étape.
3. Ne jamais réécrire une entrée précédente de STATUS.md — toujours en ajouter une
   nouvelle, datée, en bas du fichier.
