# STATUS.md — Journal de session (Net Empire)

Ce fichier est **append-only** : chaque session ajoute une nouvelle entrée datée en bas,
on ne réécrit jamais une entrée précédente. En cas de correction nécessaire, ajouter une
nouvelle entrée qui référence la précédente plutôt que de la modifier.

Structure attendue par entrée : **Fait** / **Bloqué** / **Prochaine étape**.

---

## 2026-09-23 — Session initiale : setup projet, assets, caméra

### Fait

- **Assets** : dézippage de `GameDesignWorkShop-20260923T115120Z-1-001.zip` (copié à la
  racine du projet) et réorganisation dans `public/assets/` (`tiles/`, `buildings/`,
  `characters/`, `vehicles/`, `props/`, `ui/`, `sound/`).
- **Audit des assets** (voir détail ci-dessous) — aucun asset corrigé, uniquement
  documenté.
- **Setup projet** : Vite + Phaser 3, JS vanilla, scripts npm `dev` / `build` /
  `preview`, `.gitignore` (node_modules, dist). Projet scaffoldé manuellement (fichiers
  écrits directement) plutôt que via `npm create vite@latest` interactif, car le dossier
  du projet n'était pas vide et l'outil interactif ne fonctionne pas en session non
  interactive.
- **Module caméra** (`src/CameraController.js`) : pan par glisser (souris/tactile via
  l'API pointer de Phaser), zoom à la molette et par pincement à deux doigts, bornes de
  zoom ×0.5 à ×2.5, inertie après relâchement (vélocité du dernier mouvement de drag,
  décélération par friction jusqu'à l'arrêt).
- **Scène de calibration** (`src/scenes/CalibrationScene.js`) : grille isométrique de
  24×24 losanges 64×32, couleurs neutres génériques (explicitement pas la palette du
  jeu), commentée comme temporaire. Bornes de caméra généreuses autour de la grille pour
  laisser de la marge au pan/inertie.
- **`src/mapLoader.js`** : stub créé avec la signature `loadMap(scene, tiledJsonKey)` et
  le commentaire `// TODO: brancher ici une fois l'export Tiled du rôle 5 reçu`. Rien
  d'implémenté à l'intérieur.
- **Validation** : `npm install` puis `npm run build` exécutés avec succès (9 modules
  transformés, aucune erreur). Le serveur `npm run dev` démarre et sert `index.html`
  (HTTP 200 confirmé). Impossible de faire une vérification visuelle en navigateur dans
  cette session (extension Claude in Chrome non connectée) — le rendu du canvas Phaser
  et le comportement réel du pan/zoom/inertie n'ont donc **pas été validés à l'œil**,
  seulement par la compilation. À vérifier visuellement à la prochaine session ou par
  l'utilisateur en lançant `npm run dev`.

### Audit des assets — écarts constatés (non corrigés)

**Dossiers vides / contenu manquant** par rapport au brief de génération :
- `Bouton_Action` (attendu : `Boutons_Action`) — dossier présent mais **vide**, aucun
  bouton livré.
- `Ecran` (attendu : `Ecrans`) — dossier présent mais **vide**.
- `Icones_Alerte` — dossier présent mais **vide**.
- `Sound/` — vide, conforme à ce qui était annoncé (pas un écart).

**Incohérences de nommage** entre les dossiers du zip et les noms attendus dans le brief
(accents, singulier/pluriel — n'affecte pas le contenu, juste la convention) :
- `Camion_Déplacement` / `Tricycle_Déplacement` (accent) vs `Camion_Deplacement` /
  `Tricycle_Deplacement` attendus.
- `Point_Dépot` (accent) vs `Point_Depot` attendu.
- `Decors_Props` (pluriel) vs `Decor_Props` attendu.
- `Poubelle_Rue` (singulier) vs `Poubelles_Rue` attendu.
- `Icones_economie` (casse) vs `Icones_Economie` attendu.
- `Ecran` (singulier) vs `Ecrans` attendu.
- `Bouton_Action` (singulier) vs `Boutons_Action` attendu.

**Dimensions des tuiles** : les fichiers de `Route_Tuiles/` et `Sol_Tuiles/` sont nommés
"64×32" mais mesurent en réalité **256×128 px** — soit exactement 4× l'échelle nominale.
Le **ratio 2:1 est correct**, ce n'est donc pas un problème de proportion, seulement une
résolution plus élevée que prévu. À l'usage dans Phaser, soit redimensionner les
sprites à l'affichage (scale 0.25), soit retraiter les fichiers sources — décision à
prendre côté humain/design, non tranchée ici.

**Sprite-sheets personnages/véhicules — incohérences de découpage** :
- `worker_walk_4frames_32x48.png` : 2032×774 px. 2032 / 4 frames = 508 px/frame (divise
  proprement), mais le nom suggère 32×48 par frame — échelle réelle très différente du
  nom (~15.9×).
- `worker_carry_4frames_32x48.png` : 2033×773 px. **2033 n'est pas divisible par 4** —
  découpage en 4 frames égales impossible sans rognage (508.25 px/frame). À signaler
  pour re-génération ou retraitement avant tout usage en `spritesheet` Phaser.
- Les deux sprite-sheets ouvrier ont des **hauteurs différentes** (774 vs 773 px) alors
  qu'elles devraient probablement correspondre à la même échelle de personnage.
- `camion_move_3frames_32x32.png` et `tricycle_move_3frames_32x32.png` : 2172×724 px
  chacun, 2172 / 3 = 724 px/frame exact — ceux-ci sont cohérents entre eux et se
  découpent proprement.

**Incohérence de style visible — bâtiments clients** : dans `Batiments_Clients/`,
`cinema.png`, `hopital.png`, `marché.png`, `restaurant.png` mesurent 1536×1024 px,
tandis que `ecole.png` et `hotel.png` mesurent 1254×1254 px (carré). `batiment
cousin.png` (dossier `Batiment_Cousin`) est également en 1254×1254. Deux formats de
canevas différents cohabitent dans le même lot de bâtiments clients — à uniformiser
avant intégration en jeu si un alignement visuel strict est nécessaire.

**Incohérence économie (signalée, non tranchée)** : le brief mentionne "XP" et "ISP"
utilisés à des endroits différents pour apparemment la même grandeur. Ce fichier ne
tranche pas laquelle des deux dénominations est correcte — voir CLAUDE.md, section
Économie.

### Bloqué

- **Bloqué sur l'export Tiled du rôle 5** — la vraie carte du jeu n'est pas encore
  disponible. `src/mapLoader.js` reste un stub tant que ce fichier n'est pas reçu.
- Dossiers d'assets manquants (`Boutons_Action`, `Ecrans`, `Icones_Alerte`) — en attente
  de livraison par la personne en charge de ces assets.
- Vérification visuelle du rendu (canvas Phaser, pan/zoom/inertie à l'œil) non faite
  dans cette session faute d'accès navigateur — seule la compilation a été validée.

### Prochaine étape

Bloqué sur l'export Tiled du rôle 5 — une fois reçu, brancher dans `mapLoader.js`.
En parallèle : faire vérifier visuellement `npm run dev` (canvas + pan/glisser/zoom/
inertie) par un humain ou une session avec accès navigateur, et statuer sur les écarts
d'assets listés ci-dessus (dossiers vides, incohérence XP/ISP, dimensions des tuiles,
découpage des sprite-sheets personnages) avant de les intégrer en jeu.

---

## 2026-09-23 — Correction : serveur de dev bloqué + canvas non plein écran

### Fait

- **Diagnostic et correction du blocage de `npm run dev`** signalé par l'utilisateur
  ("ça n'arrête pas de charger, fond noir") : le dossier du projet est la racine du
  profil Windows (choix explicite documenté dans CLAUDE.md), qui contient aussi
  `AppData`, `OneDrive`, `Google Drive`, `Downloads`, etc. Le watcher de fichiers de
  Vite (chokidar) tentait de parcourir tout ce dossier au démarrage, y compris des
  fichiers "cloud" (placeholders OneDrive/Google Drive) qui déclenchent une
  re-hydratation réseau à chaque accès — ce qui bloquait indéfiniment le serveur de dev.
  Correction : `vite.config.js` restreint désormais explicitement la surveillance de
  fichiers aux dossiers/fichiers du projet (`src/`, `public/`, `index.html`,
  `package.json`, `vite.config.js`) via une fonction `ignored` personnalisée.
- Nettoyage de plusieurs processus `node`/Vite restés bloqués en arrière-plan suite aux
  tests de la session précédente (ports 5173/5174/5180 tous occupés simultanément).
- **Canvas plein écran** : le `Scale Manager` de Phaser était en mode `RESIZE` mais
  combiné à `autoCenter: CENTER_BOTH`, ce qui laissait le canvas à sa taille initiale
  fixe et centré (fond sombre de page visible tout autour) au lieu de remplir la
  fenêtre. Retrait de `autoCenter` (pertinent seulement pour les modes `FIT`/`ENVELOP`,
  pas `RESIZE`), ajout d'un écouteur `window.resize` qui appelle
  `game.scale.resize(...)` pour rester correct si la fenêtre change de taille. CSS mis à
  jour (`index.html`) pour que le canvas occupe explicitement `100vw`/`100vh`.
- **Grille de calibration agrandie** : `GRID_SIZE` passé de 24 à **80** (constante en
  haut de `CalibrationScene.js`), couleurs remplacées par la palette verrouillée du jeu
  (`#4C6B3F` / `#6E8F52` en damier, contour `#3A5230`) au lieu des couleurs neutres
  grises précédentes. La tuile d'origine (0,0) reste en rouge de calibration
  (`0xD05050`). Dessin toujours effectué une seule fois dans `create()`, jamais dans
  `update()` (déjà le cas avant cette session, confirmé inchangé).
- Bornes de caméra (`setBounds`) recalculées automatiquement puisqu'elles dépendent déjà
  de la constante `GRID_SIZE` — aucune valeur en dur à corriger séparément.
- Validation : `npm run build` réussi (9 modules, aucune erreur) après chaque
  changement. Serveur `npm run dev` relancé proprement sur le port par défaut (5173),
  testé via PowerShell `Invoke-WebRequest` (toutes les routes répondent en <1s).

### Bloqué

- **Toujours pas de vérification visuelle en navigateur dans cette session** :
  l'extension Claude in Chrome n'est pas connectée. Le rendu réel (canvas plein écran
  sans bord sombre, damier de gazon, pan/zoom/inertie sur la grille agrandie) a été
  validé uniquement par lecture de code + compilation + réponses HTTP correctes, pas à
  l'œil. C'est l'utilisateur qui a confirmé le symptôme initial et devra confirmer que
  cette correction résout bien le problème.
- Export Tiled du rôle 5 toujours non reçu (inchangé depuis l'entrée précédente).

### Prochaine étape

Faire confirmer par l'utilisateur que `npm run dev` affiche maintenant un canvas plein
écran sans bord sombre, avec un damier de gazon aux couleurs verrouillées et assez de
terrain pour panner longtemps avant d'atteindre un bord. Toujours bloqué sur l'export
Tiled du rôle 5 pour la suite — une fois reçu, brancher dans `mapLoader.js`.

---

## 2026-09-23 — Correction : bornes de caméra asymétriques (bord bas inatteignable)

### Fait

- **Bug signalé par l'utilisateur** : le pan fonctionnait dans un sens (voir le haut du
  plateau) mais pas dans l'autre (impossible d'atteindre l'extrémité basse du plateau).
- **Cause identifiée** : la projection isométrique utilisée
  (`x = (col-row)*hw`, `y = (col+row)*hh`) est symétrique en x autour de 0, mais **pas
  en y** — y ne prend que des valeurs positives, de 0 (coin col=0/row=0) jusqu'à
  `2*(GRID_SIZE-1)*hh` (coin opposé). L'ancien `_centerCameraOnGrid()` calculait les
  bornes de caméra en supposant à tort un centrage symétrique autour de (0,0)
  (`-worldHeight/2` à `+worldHeight/2`), alors que le contenu réel du plateau est
  entièrement décalé vers le bas (y positif). Résultat : les bornes autorisaient un
  vide sans aucune tuile au-dessus du plateau, tout en coupant l'accès à son extrémité
  basse réelle.
- **Correction** (`CalibrationScene.js`) : ajout de `_computeGridBounds()`, qui calcule
  la bounding box réelle à partir des 4 coins effectifs de la grille (via
  `_isoToScreen` sur `(0,0)`, `(GRID_SIZE-1,0)`, `(0,GRID_SIZE-1)`,
  `(GRID_SIZE-1,GRID_SIZE-1)`), étendue d'un demi-tuile pour la forme en losange.
  `_centerCameraOnGrid()` centre désormais la caméra sur le centre réel de cette
  bounding box et calcule les bornes à partir de `minX/maxX/minY/maxY` plutôt que d'une
  hypothèse de symétrie. Cette approche reste correcte si `GRID_SIZE` ou la projection
  change plus tard.
- Validation : `npm run build` réussi (9 modules, aucune erreur).

### Bloqué

- Vérification visuelle toujours pas possible dans cette session (extension Claude in
  Chrome non connectée) — correction validée par le calcul (les 4 coins réels du
  plateau tombent maintenant tous dans les bornes) et par compilation, pas à l'œil.
  L'utilisateur a signalé précisément le symptôme mais n'a pas encore confirmé que
  cette correction le résout.
- Export Tiled du rôle 5 toujours non reçu.

### Prochaine étape

Faire confirmer par l'utilisateur que les 4 coins du plateau (haut, bas, gauche, droite)
sont désormais tous atteignables en pan, dans les deux sens verticaux. Toujours bloqué
sur l'export Tiled du rôle 5 — une fois reçu, brancher dans `mapLoader.js`.

---

## 2026-09-23 — Zoom mini abaissé + publication GitHub/Vercel

### Fait

- **Zoom minimum** abaissé de ×0.5 à **×0.3** dans `CalibrationScene.js` (demande
  utilisateur : pouvoir dézoomer davantage). La marge de bornes existante (6 tuiles)
  suffit à ce niveau de zoom sur une grille 80×80, pas de changement nécessaire côté
  bornes de caméra.
- **Dépôt GitHub** créé et poussé : [github.com/InoussaLouqmane/clean-empire](https://github.com/InoussaLouqmane/clean-empire)
  (public, nom choisi par l'utilisateur : `clean-empire`). Le dossier du projet étant
  la racine du profil Windows, l'ajout git a été fait fichier par fichier / dossier par
  dossier explicitement (jamais `git add -A` ni `git add .`) pour ne prendre que les
  fichiers du projet — vérifié via `git status --short` avant le commit. L'archive
  source des assets (`GameDesignWorkShop-*.zip`) est exclue du repo (déjà réorganisée
  dans `public/assets/`, pas besoin de la dupliquer).
- **README.md réécrit** : présentation plus riche (badges, palette visuelle, concept du
  jeu, lien de démo, structure du projet, doc pour reprendre le projet).
- **Déploiement Vercel** : projet `clean-empire` créé sous le scope `louqmanes-projects`
  et connecté au dépôt GitHub (`vercel git connect`) pour un déploiement continu à
  chaque push sur `main`. Premier déploiement déclenché par un push (pas d'upload de
  fichiers locaux, pour éviter tout risque lié au fait que le dossier de travail est la
  racine du profil Windows). Build réussi (14s). URL de production vérifiée : canvas
  (HTTP 200) et un asset test (`tiles/Isometric Bare Grass Tile...png`, HTTP 200)
  répondent correctement.
  - **Démo live** : https://clean-empire.vercel.app

### Bloqué

- Toujours pas de vérification visuelle en navigateur dans cette session (extension
  Claude in Chrome non connectée) — la démo live a été validée par requêtes HTTP
  (canvas + un asset), pas à l'œil, ni sur le rendu réel du jeu déployé.
- Export Tiled du rôle 5 toujours non reçu.

### Prochaine étape

Faire confirmer par l'utilisateur que la démo live (https://clean-empire.vercel.app)
s'affiche et se comporte comme en local (canvas plein écran, damier de gazon, pan/zoom
×0.3 à ×2.5/inertie). Toujours bloqué sur l'export Tiled du rôle 5 — une fois reçu,
brancher dans `mapLoader.js`.
