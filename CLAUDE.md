# CLAUDE.md — Net Empire

Ce fichier est le point d'entrée pour toute session Claude Code (ou tout autre agent IA)
reprenant ce projet. Il liste les décisions déjà prises et verrouillées : ne pas les
remettre en question sans une raison explicite du côté humain.

Avant de travailler sur ce projet, lire aussi :
- **STATUS.md** — journal append-only des sessions précédentes (fait / bloqué / prochaine étape)
- **README.md** — install, scripts npm, structure des dossiers

## Résumé du projet

"Net Empire" est un jeu 2D isométrique de gestion/logistique, développé pendant un
workshop game design. Le joueur gère une flotte (ouvriers → tricycle → camion) qui
collecte des déchets chez des clients et les ramène à un point de dépôt / QG, avec une
progression économique (FCFA) et de réputation/XP.

Cette base de code est volontairement construite par étapes : chaque session ajoute une
brique fonctionnelle et documente son avancement dans STATUS.md plutôt que de tout
livrer d'un coup.

## Stack (verrouillé)

- **Phaser 3** + **Vite**
- **JavaScript vanilla (ES modules)** — pas de framework (pas de React/Vue)
- Pas de TypeScript

## Vue et grille (verrouillé)

- Vue **isométrique dimétrique**
- Ratio de tuile : **64×32 px (2:1)**
- La projection iso→écran utilisée dans le code :
  `x = (col - row) * (TILE_WIDTH / 2)`, `y = (col + row) * (TILE_HEIGHT / 2)`

## Palette verrouillée (hex)

```
#1B1712 #6B5A46 #8C7860 #4C6B3F #6E8F52 #9C5B3E #C98F5E #5B4632 #1F5E52 #C79A3B #A23B2A #F1E9D2
```

Cette palette n'est **pas encore utilisée** dans le code actuel : la grille de
calibration de `CalibrationScene.js` utilise des couleurs neutres génériques
(gris/bleu) volontairement différentes, pour ne pas mélanger "calibration technique"
et "direction artistique" tant que les vrais assets ne sont pas branchés.

## Bug connu de Phaser — tile-picking isométrique

Le tile-picking natif de Phaser (`getTileAtWorldXY`) est **peu fiable sur les tilemaps
isométriques**. Pour toute interaction future nécessitant de détecter un clic sur un
bâtiment ou une tuile :

- **Ne pas utiliser** `getTileAtWorldXY` ou l'équivalent natif.
- Utiliser des **zones interactives** (`Phaser.GameObjects.Zone` / polygones custom)
  définies en **coordonnées locales** à l'objet, pas en coordonnées mondiales.

Non nécessaire pour l'instant (aucune interaction cliquable n'existe encore dans le
code), mais à respecter dès qu'un système de clic sera ajouté.

## Économie (référence future — pas implémentée)

Ces valeurs ne sont **pas utilisées dans le code actuel**. Elles sont documentées ici
pour que la prochaine session qui implémente le gameplay économique parte des bonnes
hypothèses :

- Départ : 500 FCFA / 0 XP / 1 ouvrier
- Collecte : 15s → +500 FCFA, +4 XP
- Ouvrier : 2000 FCFA
- Tricycle : 5000 FCFA (réduit le temps de collecte de 5s)
- Camion : 50000 FCFA (réduit le temps de collecte de 10s)
- Nouveau contrat : +1000 FCFA, +10 XP
- 3 retards sur un contrat → contrat résilié, -15 XP
- Seuil de passage au niveau suivant : 100 XP

**Incohérence connue, non résolue** : le brief original utilise "XP" et "ISP" pour
désigner apparemment la même grandeur à des endroits différents. Ne pas trancher côté
agent — signaler et demander confirmation humaine avant d'implémenter le système de
progression.

## Structure des dossiers

```
public/assets/
  tiles/        ← tuiles de sol et de route (Route_Tuiles, Sol_Tuiles)
  buildings/    ← bâtiments clients, bâtiment cousin, QG, point de dépôt
  characters/   ← sprites ouvrier (marche, retour chargé)
  vehicles/     ← tricycle, camion
  props/        ← poubelles de rue, décor (bancs, arbres, lampadaires, flaques)
  ui/           ← icônes économie, jauge de réputation, boutons d'action, icônes
                  d'alerte, écrans (voir STATUS.md pour les dossiers manquants/vides)
  sound/        ← vide pour l'instant (le zip source ne contient aucun son)

src/
  main.js               ← point d'entrée, crée le Phaser.Game
  CameraController.js    ← module caméra réutilisable (pan / zoom / inertie)
  scenes/
    MapScene.js          ← scène active par défaut : charge la vraie carte via mapLoader.js
    CalibrationScene.js  ← ancienne grille de calibration neutre, gardée mais inutilisée
                           par défaut (utile pour retester la caméra seule si besoin)
  mapLoader.js           ← branché (2026-09-23) sur l'export Tiled du rôle 5
                           (public/maps/net-empire.tmj) — voir commentaires en tête de
                           fichier pour la table de correspondance tuile→asset réel
```

Le mapping "dossier du zip source → dossier organisé" ne suit pas toujours une
correspondance 1:1 exacte de noms (accents, singulier/pluriel) : voir l'audit complet
dans STATUS.md avant de rechercher un asset par son nom de dossier d'origine.

## Carte — format propre à Net Empire, Tiled abandonné après l'import initial

Depuis la session éditeur (2026-09-23), **Tiled n'est plus qu'un point de départ
ponctuel**. Toute la carte (chargement, édition, sauvegarde) utilise un format
JSON propre au projet, défini dans `src/mapData.js` :
```
{ width, height, layers: { ground, roads, buildings, details } }
```
chaque calque étant un tableau 2D `[row][col]` contenant soit `null`, soit une
clé de texture (voir `ASSET_PATHS`/`PALETTE_GROUPS` dans `src/mapLoader.js`). Ne
pas réintroduire de logique Tiled ailleurs que dans `convertTiledToGrid()`.

- Fichier source Tiled (historique, converti une seule fois) :
  `public/maps/net-empire.tmj`, export JSON isométrique 64×32, 40×30 tuiles.
- `convertTiledToGrid()` (dans `mapData.js`) ne s'exécute que tant qu'aucune
  carte éditée n'est sauvegardée en local (`localStorage`, clé
  `net-empire-map-v1`). Une fois l'utilisateur a édité quoi que ce soit via le
  mode édition, cette conversion n'est plus jamais relue — sauf clic exprès sur
  "Revenir à la carte importée de Tiled" dans le panneau d'édition.
- Le `.tmj` référence un tileset externe (`net_empire_demo.tsx`) dont les images
  n'existent pas dans ce projet (placeholders générés ailleurs) — sans
  conséquence puisqu'on ne charge jamais ce tileset, seulement la grille brute
  de gid + objets du `.tmj`.
- ~12 des 32 tuiles du plan Tiled d'origine n'avaient pas d'équivalent réel
  (herbe claire, prairie fleurie, route secondaire, terre battue, canal/eau,
  boutique, maison, maison terracotta, colis, fontaine, étal de marché,
  cultures) : la conversion initiale utilise l'asset réel le plus proche
  disponible (décision validée avec l'utilisateur — "fais le matching au
  mieux"), voir le tableau commenté dans `mapData.js`. Rien n'empêche de
  corriger ça à la main ensuite via l'éditeur.
- Les bâtiments "héros" du calque d'objets Tiled (positionnement libre en
  pixels dans Tiled) sont convertis en cellules de grille (calque `buildings`),
  ancrées à la cellule la plus proche — le positionnement libre est abandonné
  au profit d'une grille uniforme, seule façon raisonnable d'avoir un éditeur
  simple. Les coordonnées d'objets Tiled isométriques divisent x **et** y par
  `tileHeight` (pas `tileWidth`) avant projection — convention du renderer
  isométrique de Tiled lui-même, pas une supposition.

## Éditeur de carte en jeu

Bouton "✏️ Mode édition" en haut à droite (`src/editor/EditorPanel.js`, overlay
DOM par-dessus le canvas Phaser, pas un système Phaser). Permet de choisir le
calque actif (Sol/Routes/Bâtiments/Détails), de peindre/effacer des tuiles à la
souris (glissé = plusieurs cases), et d'exporter la carte en JSON. La logique de
peinture est dans `src/editor/MapEditor.js` ; pendant l'édition, le pan de
`CameraController` est désactivé (`camera.enabled = false`) pour ne pas
interférer avec le glissé de peinture — le zoom molette reste actif.

Pas d'undo pour l'instant : une erreur se corrige en repeignant par-dessus, ou
en repartant de zéro via "Revenir à la carte importée de Tiled" (efface la
sauvegarde locale).

## État fonctionnel actuel

Caméra (pan/zoom/inertie), chargement de la carte, et **éditeur de carte en
jeu** sont fonctionnels. Pas encore d'interaction de jeu (clic sur un bâtiment
pour une action), pas d'économie, pas d'animation des sprites (ouvrier/tricycle/
camion affichés en image statique), pas d'undo dans l'éditeur. Voir STATUS.md
pour le détail exact et la prochaine étape.
