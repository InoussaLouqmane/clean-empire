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

---

## 2026-09-23 — Export Tiled reçu et branché dans mapLoader.js

### Fait

- **Export Tiled reçu** (`Map v3.tmj`, isométrique, 64×32, 40×30 tuiles, 4 calques de
  tuiles Ground/Roads/Buildings/Details + 2 calques d'objets Repères/Bâtiments du jeu),
  copié dans `public/maps/net-empire.tmj`.
- **Tileset externe (`net_empire_demo.tsx`) obtenu séparément** — le `.tmj` le
  référence par un chemin (`../Documents/Codex/.../net_empire_demo.tsx`) qui
  n'existe pas sur cette machine ; deux tentatives de réexport (`.tmx` puis
  re-`.tmj`) n'ont rien changé car le problème n'était pas le format du fichier
  carte mais la dépendance externe elle-même. L'utilisateur a fini par fournir le
  `.tsx` directement.
- **Constat après lecture du `.tsx`** : ses images (`assets/grass.png`,
  `assets/L_hopital.png`, etc.) sont des **placeholders génériques**, absents du
  projet et différents de nos vrais assets — plusieurs tuiles y sont même
  explicitement nommées "(placeholder)" (Ouvrier, Tricycle, Camion). Décision
  prise avec l'utilisateur : ignorer les images du `.tsx`, faire correspondre
  chaque tuile/objet à nos vrais assets par le **sens du nom**, pas par le
  fichier référencé.
- **Audit complet des 32 tuiles du tileset** : 18 ont un équivalent réel direct, 2
  un équivalent approximatif (Route, Pavés), et **12 n'ont aucun équivalent**
  (herbe claire, prairie fleurie, route secondaire, terre battue, canal/eau,
  boutique, maison, maison terracotta, colis, fontaine, étal de marché,
  cultures). Utilisateur confirmé : "fais le matching au mieux et on avance" — la
  liste complète des choix de repli est commentée directement dans
  `mapLoader.js` (table `GID_TO_TEXTURE`), à revisiter si de vrais assets pour
  ces 12 tuiles arrivent un jour.
- **`mapLoader.js` implémenté** (n'est plus un stub) :
  - Charge `public/maps/net-empire.tmj` comme simple source de données JSON —
    **ignore volontairement** le tileset externe qu'il référence (jamais chargé,
    inutile puisqu'on a nos propres tables de correspondance).
  - `GID_TO_TEXTURE` : correspondance gid Tiled → clé de texture réelle, pour les
    4 calques de tuiles (Ground/Roads/Buildings/Details), avec les replis décrits
    ci-dessus. "Canal" (eau) n'a aucun asset réel : repli sur la texture trottoir
    teintée avec la couleur sarcelle de la palette verrouillée (`#1F5E52`).
  - `OBJECT_NAME_TO_TEXTURE` : correspondance par **nom** (pas par gid) pour le
    calque d'objets "Bâtiments du jeu" — un des objets ("Poubelle de rue") a un
    gid incohérent avec son propre nom dans le fichier exporté (gid pointant vers
    "Camion original" au lieu de "Poubelle"), le nom tapé à la main dans Tiled
    s'est avéré plus fiable que ce gid-là pour ce cas précis.
  - Point sans image ("CENTRE DE DISTRIBUTION", calque Repères) : affiché comme
    un simple marqueur (cercle + étiquette texte), pas un sprite.
  - **Conversion de coordonnées d'objets isométriques** : découverte/appliquée la
    convention du renderer isométrique de Tiled lui-même — x et y d'un objet sont
    **tous les deux divisés par `tileHeight`** (pas `tileWidth`) pour obtenir une
    position de grille fractionnaire, avant d'appliquer la même projection iso
    que les calques de tuiles. Validé par calcul à la main sur les coordonnées
    réelles du fichier (ex. QG Net Empire) avant implémentation, pas une
    supposition non vérifiée.
- **`MapScene.js` créée**, devient la scène active par défaut dans `main.js`
  (`scene: [MapScene, CalibrationScene]`) ; `CalibrationScene` reste disponible
  mais n'est plus utilisée par défaut.
- **Validation** : `npm run build` réussi (11 modules, aucune erreur). Serveur
  `npm run dev` relancé, les 19 assets utilisés par la carte + le fichier
  `net-empire.tmj` + tous les modules JS (`main.js`, `mapLoader.js`,
  `MapScene.js`, `CalibrationScene.js`, `CameraController.js`) vérifiés un par un
  via requêtes HTTP : tous répondent 200.

### Bloqué

- **Aucune vérification visuelle possible dans cette session** (extension Claude
  in Chrome non connectée, toujours) — tout le placement isométrique (tuiles de
  sol/route, bâtiments, décor) et la conversion de coordonnées d'objets ont été
  validés par la logique du code et des requêtes HTTP, **pas à l'œil**. C'est la
  vérification la plus importante restante : le calcul de la projection
  isométrique des objets (division par `tileHeight`) est une reconstruction de la
  convention interne de Tiled, jamais testée visuellement — à confirmer en
  priorité par l'utilisateur en lançant `npm run dev`.
- Pas d'animation pour ouvrier/tricycle/camion (juste la première frame de leur
  sprite-sheet affichée en statique) — noté comme limitation, pas un bug.
- Les 12 tuiles sans équivalent réel utilisent des replis approximatifs (voir
  ci-dessus) — à revoir si de vrais assets arrivent.

### Prochaine étape

Faire confirmer par l'utilisateur, en lançant `npm run dev`, que la carte s'affiche
correctement : bâtiments bien positionnés et proportionnés, pas de décalage entre
calques de tuiles et calque d'objets (ce qui validerait la conversion de coordonnées
`objectToScreen`), pas de tuile visuellement aberrante. Une fois confirmé : commit +
push (déploiement Vercel automatique). Si le positionnement des objets est décalé,
revoir en priorité `objectToScreen()` dans `mapLoader.js`.

---

## 2026-09-23 — Correction : tuiles de route manquantes en production (encodage Unicode)

### Fait

- **Bug signalé par l'utilisateur** via une capture d'écran de la démo déployée
  (`clean-empire.vercel.app`) : de larges diagonales de cases noires avec un
  contour vert (texture "manquante" par défaut de Phaser) formant un grand X sur
  toute la carte, au lieu des tuiles de route.
- **Cause exacte identifiée** : 4 fichiers d'assets (`Route droite isométrique`,
  `Route en angle isométrique`, `Intersection isométrique`, `Poubelle
  débordante`) étaient enregistrés sur le disque — et donc dans git, et donc sur
  Vercel — avec leurs caractères accentués en **Unicode NFD** (é = "e" +
  accent combinant séparé, 2 caractères) au lieu de la forme **NFC** standard (é
  = 1 seul caractère). Origine : ces 4 fichiers sont ceux qui avaient échoué à la
  copie via `cp` en tout début de projet (voir la toute première entrée de ce
  journal) et avaient été copiés via PowerShell à la place — la commande
  PowerShell a préservé l'encodage NFD du zip source (probablement généré sur
  macOS, où NFD est courant). `mapLoader.js` référence ces fichiers avec des
  chaînes accentuées "normales" (NFC), qui ne correspondent donc jamais
  byte-à-byte au nom réel du fichier → 404 silencieux → texture manquante dans
  Phaser. Vérifié précisément au niveau des octets bruts (`ls | cat -A`), pas
  supposé — les autres fichiers accentués (ex. `marché.png`, `Déchetterie.png`)
  étaient déjà en NFC et n'ont jamais posé de problème, d'où la confusion
  possible si on avait supposé "tous les accents posent problème".
- **Correction** : renommage des 4 fichiers sur le disque en NFC (bytes UTF-8
  vérifiés après coup : `0xC3 0xA9` pour "é", plus la forme NFC), via `mv` en
  bash pour éviter le piège où PowerShell/.NET peut afficher un nom "normalisé"
  sans que ça reflète les octets réels stockés par NTFS — c'est précisément ce
  qui a rendu le diagnostic plus long que prévu (une première tentative de
  vérification/renommage via PowerShell `Get-ChildItem`/`.Normalize()` n'a rien
  détecté, alors que le problème était bien réel).
- **Scan complet** de `public/assets/` confirmant qu'aucun autre fichier n'a ce
  problème après correction.
- Build (`npm run build`) revalidé, commit + push effectués, nouveau déploiement
  Vercel confirmé Ready, et les 4 URLs précédemment en 404 revérifiées
  individuellement en production : toutes en 200 désormais.

### Bloqué

- Toujours aucune vérification visuelle directe par l'agent (pas d'accès
  navigateur) — la correction est validée par le code d'octets et les codes HTTP
  200, pas par un rendu observé. C'est l'utilisateur qui a repéré le bug
  initialement via une capture d'écran ; il faudra une nouvelle capture pour
  confirmer que les routes s'affichent bien maintenant.

### Prochaine étape

Demander à l'utilisateur une nouvelle capture d'écran de
https://clean-empire.vercel.app pour confirmer que les routes s'affichent
correctement (fini les cases noires). Profiter de cette capture pour aussi
valider le positionnement des bâtiments (objet layer) et l'absence d'autres
textures manquantes ailleurs sur la carte. Toujours bloqué sur l'export Tiled du
rôle 5 pour la suite (contenu déjà reçu et branché, mais si une nouvelle version
de la carte arrive, revoir `mapLoader.js`).

---

## 2026-09-23 — Éditeur de carte en jeu (abandon du pipeline Tiled pour la suite)

### Contexte

L'utilisateur a remarqué, via capture d'écran de la démo, que des tuiles (routes,
pavés) étaient mal placées sur la carte importée de Tiled, et a proposé un mode
édition directement dans le jeu (bouton en haut à droite, calques, palette de
tuiles, pouvoir retirer/remplacer une tuile) plutôt que de continuer à
retravailler la carte dans Tiled. Décision actée : **Tiled n'est plus utilisé
qu'une seule fois, comme point de départ**. Tout le reste (édition, sauvegarde,
export) passe désormais par un format de carte propre à Net Empire, indépendant
de Tiled. Décision explicite de l'utilisateur pour cette session : **ne pas
pusher sur GitHub après chaque changement** ("on va perdre beaucoup de tokens,
on va juste fonctionner sur le localhost") — tout ce qui suit a été développé et
testé uniquement en local (`npm run dev`), **rien n'a été commit ni poussé**.

### Fait

- **Nouveau format de carte** (`src/mapData.js`) : `{ width, height, layers: {
  ground, roads, buildings, details } }`, chaque calque étant un tableau 2D
  `[row][col]` de clé de texture (ou `null`). Plus aucune notion de gid Tiled
  dans ce format.
- **Conversion unique** `convertTiledToGrid()` : reprend exactement la logique
  de correspondance gid/nom → texture de la session précédente (déplacée depuis
  `mapLoader.js`), mais ne s'exécute qu'une fois, au tout premier chargement
  (tant qu'aucune carte éditée n'est sauvegardée localement). Les bâtiments
  "héros" du calque d'objets Tiled sont désormais convertis en cellules du
  calque `buildings`, ancrées à la cellule de grille la plus proche de leur
  position Tiled d'origine — **le positionnement libre en pixels est abandonné
  au profit d'une grille uniforme éditable**, seule façon raisonnable d'avoir un
  éditeur simple.
- **`mapLoader.js` simplifié** : ne connaît plus Tiled ni les gid. Nouvelles
  fonctions clés : `screenToIso()` (inverse de la projection iso, pour
  retrouver la cellule sous le curseur), `createSpriteGrid()`, `placeTileAt()`
  (pose/remplace/efface une seule cellule — fonction unique utilisée aussi bien
  pour le rendu initial que par l'éditeur en direct), `buildFromGrid()`. Taille
  d'affichage par défaut calculée par préfixe de clé (`tile_`/`building_`/
  `prop_`/`vehicle_`/`char_worker`) plutôt qu'une table à maintenir à la main.
  Assets ajoutés à `ASSET_PATHS` (disponibles dans la palette même si absents
  de la carte Tiled d'origine) : route en angle, cinéma, restaurant, poubelle
  vide, poubelle débordante.
- **Sauvegarde/export** (`mapData.js`) : `saveGrid()`/`loadSavedGrid()` via
  `localStorage` (clé `net-empire-map-v1`), auto-sauvegarde à chaque édition ;
  `exportGridAsFile()` télécharge un fichier `net-empire-map.json` (bouton
  "💾 Exporter la carte" dans le panneau).
- **`src/editor/MapEditor.js`** : logique de peinture — calque actif, pinceau
  sélectionné (clé de texture, ou `null` = gomme), peint en continu tant que le
  bouton de la souris est maintenu (glissé = plusieurs cases d'affilée).
  Désactive le pan au glisser de `CameraController` pendant que le mode édition
  est actif (`camera.enabled = false`), pour que peindre ne fasse pas aussi
  défiler la vue — le zoom molette reste actif dans les deux cas.
- **`src/editor/EditorPanel.js`** : overlay DOM (pas dans le canvas Phaser,
  plus simple et plus fiable pour ce genre d'UI) — bouton "✏️ Mode édition" en
  haut à droite ; une fois activé, panneau avec sélecteur de calque actif +
  case à cocher de visibilité par calque, palette groupée (Sol / Routes /
  Bâtiments / Décor / Personnages & véhicules) avec vignettes utilisant les
  vrais assets (recadrées sur la première frame pour les sprite-sheets), un
  outil "Gomme", un bouton d'export, et un bouton "↺ Revenir à la carte
  importée de Tiled" qui efface la sauvegarde locale et relance la scène
  (`scene.restart()`).
- **`CameraController.js`** : ajout d'un flag `enabled` (vérifié dans
  `_onPointerDown`/`_onPointerMove`), pour permettre à l'éditeur de désactiver
  le pan sans dupliquer la logique caméra.
- **Nettoyage DOM sur restart** : `MapScene` retire les éléments DOM du panneau
  précédent (`editorPanel.destroy()`) sur l'événement `shutdown` de la scène —
  sans ça, le bouton "Revenir à Tiled" dupliquerait le panneau à chaque clic.
- **Validation** : `npm run build` réussi (14 modules, aucune erreur). Serveur
  `npm run dev` lancé en local (port 5175, les précédents étant occupés), les
  nouveaux assets et modules JS vérifiés un par un via requêtes HTTP : tous
  répondent 200. **Rien poussé sur GitHub, rien déployé sur Vercel** — conforme
  à la demande explicite de l'utilisateur.

### Bloqué

- **Aucune vérification visuelle possible** (extension Claude in Chrome non
  connectée, toujours) — c'est particulièrement important ici vu que c'est une
  fonctionnalité interactive (peindre à la souris, panneau DOM par-dessus le
  canvas) : la logique a été relue attentivement mais jamais testée à l'usage.
  Points à vérifier en priorité par l'utilisateur : le panneau DOM s'affiche
  bien par-dessus le canvas (z-index), les vignettes de la palette ressemblent
  bien aux vrais assets (en particulier le recadrage des sprite-sheets
  ouvrier/tricycle/camion), cliquer/glisser peint bien la bonne case sans
  décalage (validerait `screenToIso`), et que désactiver le pan pendant
  l'édition ne casse pas le zoom molette.
- Pas de undo/historique — une erreur de placement s'efface seulement en
  repeignant par-dessus ou en revenant à la carte Tiled d'origine (qui repart
  de zéro, perd toute l'édition en cours).
- Pas de placement libre (hors grille) pour les bâtiments — accepté comme
  compromis pour la simplicité de l'éditeur, voir "Fait" ci-dessus.

### Prochaine étape

Faire tester l'éditeur par l'utilisateur en local (`npm run dev`, actuellement
sur le port 5175 — relancer si besoin). Une fois validé à l'usage (et seulement
à ce moment-là, l'utilisateur ayant demandé d'éviter les push inutiles) :
commit + push pour déployer sur Vercel. Si le clic ne peint pas la bonne case,
vérifier en premier `screenToIso()` dans `mapLoader.js`.

---

## 2026-09-23 — Bouton "tout effacer sauf l'herbe" dans l'éditeur

### Fait

Ajout demandé par l'utilisateur après avoir testé l'éditeur ("j'aime bien le
rendu") : un bouton **"🌱 Tout effacer (garder l'herbe)"** dans le panneau
d'édition, pour repartir d'une surface entièrement en herbe plutôt que de
garder la conversion Tiled importée. Vide les calques Routes/Bâtiments/Détails
et remplit tout le calque Sol avec `tile_grass`. Confirmation via `window.confirm()`
avant d'agir (action destructrice, pas d'undo). Implémenté dans
`MapEditor.resetToGrassOnly()` + `mapLoader.clearSpriteGrid()` (nouvelle
fonction utilitaire qui détruit tous les sprites d'un spriteGrid). Toujours en
local uniquement, rien poussé — build revalidé (14 modules, aucune erreur).

### Prochaine étape

Inchangée : faire tester l'éditeur (y compris ce nouveau bouton) en local avant
tout commit/push.

---

## 2026-09-23 — Facilités de pose : annuler/rétablir, ligne droite, orientation

### Fait

Trois demandes de l'utilisateur pour faciliter la pose de tuiles :

- **Annuler/rétablir** : `Ctrl+Z` / `Ctrl+Y` (ou `Ctrl+Maj+Z`). Un glissé complet
  (pointerdown → pointerup) = une seule étape d'annulation, pas case par case —
  sinon annuler un tracé de 10 cases aurait demandé 10 `Ctrl+Z`. Implémenté par
  un historique de "coups" (`undoStack`/`redoStack` dans `MapEditor`), chaque
  coup étant la liste des cellules modifiées pendant le glissé (valeur avant/
  après), pas un instantané de toute la carte.
- **Ligne droite au glissé** : `Maj` (Shift) maintenu pendant un glissé verrouille
  la pose sur un seul axe de la grille (colonne ou ligne — celui dominant depuis
  le point de départ du glissé), pour tracer droit sans déborder sur l'axe
  perpendiculaire. Point de départ du glissé mémorisé dans `strokeAnchor`.
- **Orientation de la tuile** : touche `R` (ou bouton "🔄 Pivoter") fait cycler
  4 états sur la tuile sélectionnée avant de la poser. **Important, expliqué à
  l'utilisateur avant de coder** : ce n'est **pas une vraie rotation à 90°** — nos
  images de tuiles (64×32, losange isométrique) se déformeraient si on les
  tournait. C'est un cycle de **miroirs** (normal / horizontal / vertical /
  horizontal+vertical), via `sprite.setFlipX()`/`setFlipY()`. Suffisant pour
  orienter un tronçon de route dans l'autre diagonale (un miroir inverse le sens
  d'une diagonale), mais ne couvre pas tous les cas d'une vraie rotation à 4
  angles — à garder en tête si un rendu ne "tombe pas juste" après un miroir.

### Changement de format de données (impact important)

Pour stocker l'orientation, **le format de cellule a changé** : chaque case de
la grille est passée d'une simple chaîne (clé de texture) à un objet `{ key,
flipX, flipY }` (voir `makeCell()`/`cellsEqual()` dans `mapLoader.js`). Impacté :
`mapData.convertTiledToGrid()`, `mapLoader.placeTileAt()`/`buildFromGrid()`,
toute la logique de `MapEditor`. **La clé de `localStorage` a été changée** de
`net-empire-map-v1` à `net-empire-map-v2` pour qu'une éventuelle sauvegarde de
la session précédente (ancien format, incompatible) soit simplement ignorée au
lieu de planter silencieusement — elle repart proprement de la conversion Tiled.
Si une future évolution du format de cellule est nécessaire, reproduire ce
réflexe (changer la clé plutôt que tenter une migration silencieuse).

### Bloqué

Toujours aucune vérification visuelle (pas d'accès navigateur). Ces trois
facilités touchent des interactions fines (glissé, clavier, aperçu visuel de
l'orientation sur la vignette) jamais testées à l'usage — priorité de test pour
l'utilisateur. Toujours en local uniquement, rien poussé.

### Prochaine étape

Faire tester par l'utilisateur : `Ctrl+Z` annule bien un tracé entier d'un coup,
`Maj`+glisser trace droit sans déborder, `R`/bouton "Pivoter" change bien
l'aperçu de la vignette sélectionnée et le rendu posé sur la carte. Une fois
validé : commit + push (toujours en attente de l'accord explicite de
l'utilisateur, qui a demandé d'éviter les push inutiles pour économiser des
tokens).

---

## 2026-09-23 — Sélection + cadre contextuel (supprimer/pivoter/déplacer)

### Fait

Demande utilisateur : un cadre contextuel sur la tuile qu'on pose/sélectionne,
avec ✖ (supprimer) en haut à gauche, ⟲ (pivoter) en haut à droite, et pouvoir
glisser-déposer la tuile sélectionnée pour la déplacer — y compris sur une
tuile déjà posée qu'on sélectionne après coup.

- **Distinction clic / glissé** (nouveau, cœur du changement) : un geste de
  pointeur est classé en observant le déplacement depuis `pointerdown`
  (`pointer.getDistance()`, seuil 6px) :
  - **Glissé** démarrant ailleurs que sur la sélection courante → peint en
    continu avec le pinceau actuel (comportement historique inchangé, y
    compris le verrouillage Maj = ligne droite).
  - **Glissé** démarrant exactement sur la case sélectionnée → déplace la
    tuile (le sprite suit le pointeur librement pendant le glissé, se recase
    sur la grille au relâchement).
  - **Clic simple** (pas de glissé) sur une case déjà occupée → la sélectionne
    (cadre contextuel) SANS l'écraser avec le pinceau actuel.
  - **Clic simple** sur une case vide → pose la tuile actuelle puis la
    sélectionne aussitôt, pour ajustement immédiat.
  - **Exception outil Gomme** : un clic sur une case occupée l'efface
    directement (comme avant), ne la sélectionne pas — l'affordance "cliquer
    pour sélectionner" n'a de sens que pour un pinceau réel.
  - Décision non demandée explicitement mais nécessaire pour éviter toute
    perte de données accidentelle : cliquer sur une case déjà occupée ne
    l'écrase jamais silencieusement, il faut sélectionner puis Supprimer (✖)
    explicitement, ou repeindre par un glissé (comportement de "pinceau qui
    remplace en zone", inchangé).
- **`SelectionFrame.js`** (nouveau fichier) : cadre contextuel en **DOM**
  (comme le panneau d'édition), pas en objets Phaser dans le canvas — choix
  délibéré pour garantir qu'un clic sur ✖/⟲ ne soit jamais aussi interprété
  comme un clic sur la carte en dessous (deux systèmes d'input séparés, pas de
  risque de conflit de propagation entre le DOM et l'InputPlugin de Phaser,
  qui aurait été plus fragile à garantir sans pouvoir tester visuellement).
  Le cadre lui-même a `pointer-events: none` pour laisser passer le
  glisser-déposer vers le canvas ; seuls les 2 boutons captent les clics.
  Repositionné à chaque frame (`MapScene.update()`) par conversion monde→écran
  manuelle (`(worldX - camera.scrollX) * camera.zoom`), nécessaire même sans
  glissé en cours puisque le zoom molette reste actif pendant l'édition.
- **`MapEditor.js`** : `selectedCell`, `rotateSelected()`, `deleteSelected()`,
  `getSelectedWorldPosition()`, `_previewMove()`/`_commitMove()` (déplacement
  avec undo dédié : 2 changements dans une seule étape d'annulation — case
  d'origine vidée + case de destination remplie, écrase la destination si elle
  était déjà occupée). Raccourcis clavier ajoutés : **Suppr/Retour arrière**
  supprime la sélection, **Échap** désélectionne, **R** pivote soit la
  sélection courante si elle existe, soit le pinceau de la palette sinon.
  Changer de calque actif désélectionne (évite de garder un cadre affiché sur
  une tuile d'un calque qu'on ne regarde plus).
- **`mapLoader.js`** : extraction de `nextOrientation()` (le cycle à 4 états
  normal/miroir X/miroir Y/les deux), maintenant partagé entre le pinceau de
  la palette et la rotation d'une tuile déjà posée — évitait de dupliquer la
  même logique à deux endroits.

### Bloqué

**Zone à risque la plus importante de toute la session** — la distinction
clic/glissé, le déplacement avec recasage sur grille, et le cadre contextuel
qui suit la caméra sont tous des comportements interactifs fins, jamais
testés à l'usage (toujours pas d'accès navigateur). Points precis à valider en
priorité par l'utilisateur :
- Un clic net (sans bouger la souris) sur une tuile déjà posée la sélectionne
  bien sans la remplacer.
- Glisser en partant EXACTEMENT de la tuile sélectionnée la déplace ; glisser
  en partant d'ailleurs peint normalement.
- Le cadre suit bien la tuile sélectionnée quand on zoome à la molette.
- ✖ supprime, ⟲ pivote, et les deux s'enregistrent dans l'historique
  d'annulation (`Ctrl+Z` après un clic sur ✖ doit faire réapparaître la tuile).

### Prochaine étape

Faire tester en priorité absolue le scénario décrit par l'utilisateur : poser
un tronçon de route, le sélectionner, le faire pivoter (⟲) ou le déplacer par
glisser-déposer, vérifier que ✖ le supprime proprement. Toujours en local
uniquement (port 5175), rien poussé sur GitHub/Vercel.

---

## 2026-09-23 — Import de carte (JSON), pour compléter l'export

### Fait

Demande utilisateur : pouvoir réimporter un JSON exporté, pour tester des
modifications risquées sans craindre de perdre la carte (exporter d'abord,
essayer, réimporter si besoin).

- **`mapData.parseGridFile(text)`** : valide et normalise le contenu d'un
  fichier avant de l'utiliser — ne fait PAS confiance au JSON tel quel. Vérifie
  `width`/`height` (entiers positifs), présence des 4 calques
  (Sol/Routes/Bâtiments/Détails) à la bonne hauteur/largeur, et que chaque
  cellule est soit `null` soit un objet avec une clé `key` en chaîne. Lève une
  `Error` avec un message précis (quel calque, quelle ligne/colonne) en cas de
  souci, plutôt que de planter plus loin dans le rendu avec une erreur obscure.
  Normalise aussi `flipX`/`flipY` en booléens au passage (au cas où un fichier
  modifié à la main les omettrait).
- **Bouton "📂 Importer une carte (JSON)"** dans le panneau (à côté d'Exporter)
  — ouvre un sélecteur de fichier, lit le contenu via `FileReader`, et en cas
  d'erreur affiche le message via `window.alert()` (cohérent avec l'usage
  existant de `confirm()` pour "Tout effacer").
- Import réussi = sauvegarde en `localStorage` puis `scene.restart()` — même
  mécanisme que "Revenir à la carte importée de Tiled", pour repartir sur des
  bases propres (recalcul des bornes de caméra, nouvelle grille de sprites)
  sans avoir à gérer un changement de dimensions de grille en direct dans une
  scène déjà en cours.
- Build revalidé (15 modules, aucune erreur). Toujours en local uniquement,
  rien poussé.

### Bloqué

Pas de vérification visuelle — à tester : exporter un JSON, le réimporter,
confirmer que la carte réapparaît identique. Aussi tester le cas d'erreur (un
fichier invalide affiche bien un message clair au lieu de planter).

### Prochaine étape

Une fois l'utilisateur satisfait de l'ensemble de l'éditeur (sélection,
annuler/rétablir, ligne droite, orientation, import/export), lui demander s'il
veut passer au commit + push pour déployer sur Vercel — toujours en attente de
son feu vert explicite.

---

## 2026-09-23 — Correction du décalage du cadre + réorganisation façon Figma

### Fait

**Bug corrigé** (signalé via capture d'écran `heylastcap.png`) : le cadre
contextuel apparaissait décalé par rapport à la tuile réellement sélectionnée.
Cause identifiée : `MapScene._updateSelectionFrame()` convertissait
monde→écran avec `(worldX - scrollX) * zoom`, en oubliant que le zoom d'une
caméra Phaser **pivote autour de son centre actuel** (`scrollX + width/2`), pas
autour de l'origine du monde. Formule corrigée pour reproduire ce pivot
central — le décalage ne devrait plus apparaître qu'à zoom=1 par coïncidence
(l'ancienne formule était juste à zoom=1, ce qui explique qu'on ne l'ait
repéré qu'après avoir zoomé/dézoomé).

**Réorganisation de l'UI d'édition**, discutée et validée point par point avec
l'utilisateur avant implémentation :
- Le bloc de raccourcis clavier (`ne-hint`) est sorti du panneau latéral et
  déplacé en **haut à gauche** de l'écran (élément DOM indépendant), pour ne
  plus chevaucher le bouton "Mode édition"/panneau en haut à droite.
- Le panneau latéral droit est réorganisé en **sections repliables** façon
  Figma (`_createSection()`, chevron cliquable) :
  - **"Vue"** (repliée par défaut) : uniquement la checklist de visibilité par
    calque — séparée du choix du calque actif.
  - **"Modifier espace"** (dépliée par défaut) : les 4 calques en radio, pour
    choisir le calque actif à éditer.
  - Gomme, indicateur d'orientation, bouton Pivoter, et tous les boutons
    d'action (Exporter/Importer/Tout effacer/Revenir à Tiled) **restent dans
    le panneau latéral**, hors des sections repliables — décision explicite de
    l'utilisateur, pas déplacés vers la palette flottante.
- **Palette flottante** (nouvel élément DOM, bas centre de l'écran, **sans
  fond** — seules les cartes individuelles ont un fond) : affiche uniquement
  les assets du **calque actuellement actif** (`mapLoader.LAYER_PALETTE`,
  remplace l'ancien `PALETTE_GROUPS` qui montrait tout, tout le temps).
  Re-remplie à chaque changement de calque actif. Décision utilisateur
  explicite : filtrer plutôt que tout montrer, pour éviter les erreurs de
  calque (ex. poser un arbre sur "Routes").
- Chaque carte de la palette flottante montre son icône **et** son nom (pas
  juste une info-bulle au survol comme avant), plus proche d'une barre
  d'options Figma que de simples vignettes.
- Rotation **inchangée** (touche `R` + bouton "Pivoter" dans le panneau latéral
  + bouton ⟲ du cadre contextuel sur une tuile posée) — décision explicite de
  l'utilisateur de ne pas la déplacer dans la palette.
- Build revalidé (15 modules, aucune erreur). Toujours en local uniquement,
  rien poussé.

### Bloqué

Aucune vérification visuelle directe par l'agent pour cette réorganisation —
seule la capture d'écran fournie par l'utilisateur pour le bug de décalage a pu
être inspectée. À confirmer par l'utilisateur : le cadre suit maintenant
correctement la tuile sélectionnée à tous les niveaux de zoom, le bloc de
raccourcis ne chevauche plus rien en haut à gauche, les sections "Vue"/
"Modifier espace" se replient/déplient correctement, et la palette flottante
change bien de contenu selon le calque actif sélectionné.

### Prochaine étape

Faire tester cette réorganisation complète par l'utilisateur en local (port
5175). Une fois l'éditeur jugé satisfaisant dans l'ensemble, demander le feu
vert pour commit + push vers GitHub/Vercel.

---

## 2026-09-23 — Outil "Déplacer" par défaut (la caméra était bloquée en édition)

### Fait

Bug UX signalé par l'utilisateur : dès que le mode édition était activé, le
pan de la caméra (glisser + pincement) était **toujours** désactivé, peu
importe l'outil — sans façon de simplement naviguer sur la carte sans risquer
de peindre/effacer par erreur. Pire : comme il n'y avait pas de "vrai" outil
neutre par défaut, `brushKey = null` (censé représenter la Gomme) était actif
implicitement dès l'activation, alors qu'il faut au contraire toujours
sélectionner un outil explicitement.

- **Trois outils désormais mutuellement exclusifs** dans `MapEditor` :
  `this.tool = 'move' | 'erase' | 'paint'`. `_syncCameraEnabled()` centralise
  la règle : la caméra retrouve pan + pincement dès que l'édition est
  inactive, **ou** que l'outil actif est 'move' — le zoom molette, lui, n'a
  jamais été désactivé (indépendant de ce système).
- **`setActive(true)` repart toujours sur l'outil Déplacement** (jamais la
  Gomme par défaut) — corrige exactement le bug signalé.
- **Touche `V`** : repasse en outil Déplacement à tout moment (ajoutée aux
  raccourcis, convention reprise d'outils comme Figma). Ajoutée au bloc
  d'indications clavier.
- **Carte "Déplacer"** (icône main ✋) ajoutée en première position,
  **permanente**, dans la palette flottante du bas — pas filtrée par calque
  contrairement aux autres cartes, puisque c'est un outil de navigation, pas
  un asset à poser.
- **Gomme** : n'est plus jamais active par défaut, doit être cliquée
  explicitement dans le panneau latéral (comme demandé). Son bouton appelle
  désormais `onEraseTool()` plutôt que `onBrushChange(null)` — l'ancienne
  confusion "brushKey null = gomme" est éliminée, `tool` et `brushKey` sont
  maintenant des concepts bien séparés.
- **Surlignage centralisé** : `EditorPanel.setActiveTool(tool, brushKey)`,
  appelé en retour via `MapEditor.onToolChange`, est désormais la **seule**
  source de vérité pour savoir quelle carte/bouton est visuellement
  sélectionné(e) — que le changement d'outil vienne d'un clic (carte
  Déplacer, Gomme, carte de palette) ou d'un raccourci clavier (`V`). Avant
  ce refactor, chaque gestionnaire de clic gérait sa propre classe
  `selected`, ce qui aurait désynchronisé l'affichage dès qu'on aurait changé
  d'outil au clavier.
- Build revalidé (15 modules, aucune erreur). Toujours en local uniquement,
  rien poussé.

### Bloqué

Pas de vérification visuelle directe. À tester en priorité : la caméra se
déplace/zoome/pince bien normalement à l'activation du mode édition (sans
avoir à cliquer sur quoi que ce soit d'abord), la Gomme n'agit que si on l'a
cliquée, `V` ramène bien en Déplacement à tout moment, et la carte "Déplacer"
reste visible et fonctionnelle peu importe le calque actif sélectionné dans
"Modifier espace".

### Prochaine étape

Faire tester ce correctif par l'utilisateur. Une fois l'éditeur dans son
ensemble jugé satisfaisant, demander le feu vert pour commit + push vers
GitHub/Vercel — plusieurs sessions locales non poussées s'accumulent
maintenant (sélection/cadre contextuel, import/export, réorganisation Figma,
outil Déplacement), à regrouper en un ou plusieurs commits une fois validé.

---

## 2026-09-23 — Correction de 3 assets sans transparence (QG, Cinéma, École)

### Fait

- **Renommage** : la carte "Déplacer" de la palette flottante s'appelle
  maintenant "Se déplacer" (demande utilisateur).
- **Diagnostic** d'un bug signalé par l'utilisateur ("certains assets ont un
  fond, pas transparent") : vérifié au niveau du fichier (`file`) que
  exactement 3 assets sur toute la collection sont en **PNG RGB sans canal
  alpha** — `base-QG.png` (QG), `cinema.png` (Cinéma), `ecole.png` (École).
  Un PNG RGB ne peut techniquement pas être transparent, quel que soit son
  contenu. Confirmé visuellement (`Read` sur le fichier) : ces 3 images
  contiennent un **damier gris/blanc peint en dur dans les pixels**, pas une
  vraie transparence — artefact courant des générateurs d'images IA qui
  représentent visuellement "ceci doit être transparent" sans encoder de
  canal alpha réel. Les 6 autres bâtiments et tous les autres assets
  (tuiles/props/véhicules/personnages/UI) sont bien en RGBA, non affectés.
- **Correction automatisée** plutôt que de renvoyer le problème à
  l'utilisateur : script Node.js (`pngjs`, installé dans le scratchpad, pas
  dans les dépendances du projet) qui détoure le damier par **propagation
  depuis les bords de l'image** (flood-fill 4-connexe) — un pixel devient
  transparent seulement s'il est atteignable depuis un bord via une chaîne de
  pixels dont la couleur est proche d'une des couleurs du damier
  (échantillonnées sur tout le pourtour de l'image, pas juste les coins,
  tolérance de couleur 35). Choisi plutôt qu'un simple remplacement de couleur
  global, plus sûr : un détail gris/blanc **entouré** par le reste de
  l'illustration (ex. la climatisation sur le toit du QG) n'est jamais touché
  car non connecté au bord.
- **Validation rigoureuse avant d'appliquer** : le rendu d'un PNG transparent
  dans un visualiseur d'image ressemble lui-même à un damier (convention
  universelle), donc impossible de juger le résultat à l'œil sur fond
  neutre — vérifié à la place (a) les valeurs brutes du canal alpha
  (0 en bordure, 255 sur le bâtiment) et (b) un rendu de contrôle en
  compositant l'image sur un fond magenta uni, qui prouve sans ambiguïté la
  transparence réelle. Un premier essai avec une tolérance plus stricte (18,
  coins seulement) laissait des îlots de damier isolés sur École (carrés
  légèrement différents de teinte, non connectés au flood-fill) — corrigé en
  élargissant l'échantillonnage à toute la bordure et en montant la tolérance.
- Les 3 fichiers corrigés remplacent les originaux dans
  `public/assets/buildings/` (confirmés RGBA via `file` après coup). Build
  revalidé (15 modules, aucune erreur), assets re-vérifiés servis correctement
  par le serveur de dev local.

### Question posée par l'utilisateur (réponse donnée, pas encore actée)

L'utilisateur a demandé si une fonctionnalité d'**ajout d'assets personnalisés**
(popup, choix de catégorie, import direct) serait utile. Réponse donnée :
probablement oui à terme, mais recommandé de ne pas l'ajouter tout de suite —
voir la réponse complète dans la conversation. Pas implémenté, en attente de
décision de l'utilisateur.

### Bloqué

Pas de vérification en jeu réel (juste en dehors de Phaser, via composition
manuelle) — à confirmer par l'utilisateur que QG/Cinéma/École s'affichent bien
sans fond dans l'éditeur maintenant.

### Prochaine étape

Faire confirmer par l'utilisateur que les 3 bâtiments s'affichent correctement
sans damier dans le jeu. Statuer sur l'ajout éventuel d'un import d'assets
personnalisés. Toujours en attente du feu vert pour commit + push (plusieurs
sessions locales accumulées, à regrouper).

---

## 2026-09-23 — Orientation du pinceau mémorisée par type d'asset

### Fait

Remarque utilisateur : pivoter un asset (route en miroir horizontal par
exemple) devrait laisser supposer que les prochains posés vont dans le même
sens — hors, `setBrush()` remettait systématiquement l'orientation à zéro à
chaque nouvelle sélection dans la palette, obligeant à repivoter à chaque
fois. Proposé et validé avec l'utilisateur : mémoriser l'orientation **par
type d'asset précis** (une `Map` clé de texture → `{flipX, flipY}` dans
`MapEditor`) plutôt qu'une seule valeur globale — reprendre "route droite" en
miroir horizontal après avoir posé un bâtiment (non affecté) redonne le
miroir horizontal, sans report accidentel d'une orientation d'un type d'asset
complètement différent.

- `MapEditor.setBrush()` : relit `brushOrientations.get(textureKey)` (par
  défaut `{flipX:false, flipY:false}` si jamais vu) au lieu de toujours
  réinitialiser.
- `MapEditor.cycleOrientation()` : sauvegarde la nouvelle orientation dans
  `brushOrientations` pour la clé actuelle.
- **Bug d'ordre d'événements corrigé au passage** dans `EditorPanel` : comme
  `onOrientationChange` est émis par `setBrush()` AVANT `onToolChange`, le
  correctif visuel (transform CSS de la vignette) arrivait sur l'ANCIENNE
  carte encore sélectionnée à ce moment-là, pas la nouvelle — l'affichage de
  l'icône (miroir ou pas) et le texte "Orientation : ..." auraient pu se
  désynchroniser. Corrigé en mémorisant `_currentFlipX/Y` dans `EditorPanel` et
  en les ré-appliquant explicitement à la bonne carte dans
  `_applyToolHighlight()`, plutôt que de dépendre de l'ordre d'arrivée des
  deux callbacks.
- Cette mémoire d'orientation est volontairement **en mémoire seulement**
  (pas sauvegardée avec la carte) — c'est une préférence d'édition pour la
  session en cours, pas une donnée de la carte elle-même.
- Build revalidé (15 modules, aucune erreur). Toujours en local uniquement.

### Bloqué

Pas de vérification visuelle — à tester : pivoter "route droite", passer à un
bâtiment (aucune orientation ne doit apparaître dessus), revenir sur "route
droite" (doit retrouver le miroir), et confirmer que l'icône de la vignette et
le texte "Orientation : ..." restent synchronisés dans tous les cas.

### Prochaine étape

Inchangée : faire tester l'ensemble de l'éditeur, puis feu vert pour commit +
push.

---

## 2026-09-23 — Petites retouches UI : Gomme visible/rouge, texte raccourcis

### Fait

- **Gomme** : n'était nommée que par une info-bulle au survol (`title`), pas
  un texte visible — remplacée par une carte identique aux cartes de la
  palette (icône + nom "Gomme" toujours visible), coloriée en **rouge**
  (`#A23B2A`, palette verrouillée) plutôt que le brun neutre précédent.
  Réutilise `_createToolCard()` (déjà utilisé pour "Se déplacer") plutôt que
  l'ancien style `.ne-swatch`, maintenant supprimé (plus aucune référence).
- **Texte des raccourcis** : "V déplacer" → "V se déplacer", cohérent avec le
  nom de la carte.
- Build revalidé (15 modules, aucune erreur).

### Prochaine étape

Inchangée : faire tester l'ensemble de l'éditeur, puis feu vert pour commit +
push. Statuer sur l'ajout éventuel d'un import d'assets personnalisés (popup +
catégorie) — pas encore construit, voir réponse donnée à l'utilisateur dans la
conversation.

---

## 2026-09-23 — Déploiement : tout l'éditeur en jeu poussé sur GitHub/Vercel

### Fait

Feu vert utilisateur reçu ("Déploie sur github et vercel") après plusieurs
sessions locales accumulées sans push (sur demande explicite précédente de
l'utilisateur, pour économiser des tokens). Un seul commit regroupant :
format de carte propre à Net Empire (`mapData.js`), éditeur en jeu complet
(`editor/MapEditor.js`, `editor/EditorPanel.js`, `editor/SelectionFrame.js`),
outil Déplacement par défaut (`CameraController.enabled`), et la correction
des 3 assets de bâtiments sans transparence (QG/Cinéma/École). Poussé sur
`main`, build Vercel confirmé Ready (16s), URL de production revérifiée
(page + un asset + `net-empire.tmj` répondent 200).

**Non inclus dans ce commit** (travail encore en cours au moment du feu vert) :
le déplacement de la carte Gomme vers la palette flottante, et le début du
système d'assets personnalisés (`customAssets.js` créé et déjà branché dans
`mapLoader.js`, mais le popup d'ajout et le câblage `EditorPanel`/`MapScene`
pas encore faits) — ces deux chantiers continuent en local, seront poussés
dans un commit séparé une fois terminés.

### Prochaine étape

Terminer : déplacer la carte Gomme dans la palette flottante (à l'opposé de
"Se déplacer"), puis le popup d'ajout d'assets personnalisés (fichier + nom +
catégorie). Tester en local, puis redemander le feu vert avant de repousser.

---

## 2026-09-23 — Gomme déplacée + import d'assets personnalisés terminé

### Fait

- **Carte "Gomme"** déplacée du panneau latéral vers la palette flottante,
  positionnée en dernier (à l'opposé de "Se déplacer", tout à gauche) — les
  deux sont désormais des cartes permanentes de la palette, jamais filtrées
  par calque, ajoutées une fois dans `_buildFloatingPalette()` et réinsérées
  aux deux extrémités à chaque `_renderFloatingPalette()`.
- **Import d'assets personnalisés terminé** (popup demandé par l'utilisateur) :
  - `src/customAssets.js` (nouveau) : registre localStorage
    (`net-empire-custom-assets-v1`) des assets ajoutés — `{ key, label,
    category, dataUrl }`. Pas de serveur pour stocker un vrai fichier (site
    statique), donc l'image est encodée en base64 directement dans le
    navigateur. Limite volontaire de 1,5 Mo par image pour rester raisonnable
    vis-à-vis du quota localStorage (quelques Mo selon navigateur).
  - `src/editor/AddAssetModal.js` (nouveau) : popup DOM — fichier image,
    aperçu en direct, nom (préremplit depuis le nom de fichier), catégorie
    (calque de destination, un des 4 existants). Valide le type MIME et la
    taille avant d'accepter le fichier.
  - `mapLoader.js` : `preload()` charge aussi les assets personnalisés déjà
    enregistrés ; `defaultDisplaySize()` leur donne une taille selon leur
    catégorie (même convention que les assets intégrés) ; nouvelle fonction
    `getPaletteForLayer(layerName)` qui fusionne assets intégrés + personnalisés
    d'un calque avec leur chemin d'image déjà résolu (fichier ou data URL) —
    l'éditeur n'a pas besoin de connaître la différence.
  - `MapScene._addCustomAsset()` : enregistre l'asset, charge sa texture dans
    Phaser **à la volée** (`scene.load.image()` + `.start()`, le jeu tourne
    déjà, on n'est plus dans `preload()`), puis rafraîchit la palette flottante
    une fois chargée — apparaît immédiatement, pas besoin de recharger la page.
  - **Portabilité de l'export/import** : un asset personnalisé n'existe que
    dans le navigateur qui l'a ajouté — sans rien faire, exporter la carte
    puis la réimporter ailleurs afficherait une texture manquante. Corrigé :
    `mapData.exportGridAsFile()` embarque désormais aussi
    `customAssets.loadCustomAssets()` dans le fichier exporté ;
    `parseGridFile()` retourne maintenant `{ grid, customAssets }` (changement
    de signature, `MapScene._importMapFromFile()` mis à jour en conséquence) ;
    les assets embarqués sont fusionnés dans le registre local
    (`customAssets.mergeCustomAssets()`, sans dupliquer une clé déjà connue)
    avant de recharger la scène.
- Build revalidé (17 modules, aucune erreur). Toujours en local uniquement.

### Bloqué

Pas de vérification visuelle. À tester en priorité : le popup s'ouvre/se
ferme bien, l'aperçu d'image s'affiche, l'asset ajouté apparaît immédiatement
dans la palette flottante du bon calque sans recharger la page, et
exporter/réimporter une carte avec un asset personnalisé le restaure bien
(pas de texture manquante).

### Prochaine étape

Faire tester par l'utilisateur l'ensemble des nouveautés (Gomme repositionnée,
ajout d'asset personnalisé, portabilité export/import). Une fois validé,
redemander le feu vert pour un nouveau commit + push.

---

## 2026-09-24 — Main Menu CLEAN CEO (POC) + renommage + chargement différé

### Contexte

L'utilisateur a fourni un dossier `Downloads/for_claude_main_menu/` : maquette
du menu (`page_main_menu (1).png`), planches de composants
(`assets_game.png`, `clean-ceo-asset-sections.png`), fond sans UI
(`image_fond.png`, 564×317), logo transparent (283×283), musique
(`gamesound.mp3`, ~24 s), design system texte (`game_design_system.txt`) et
guide de handoff (PDF). Analyse validée avec l'utilisateur avant tout code
(GO explicite). Décisions actées : **XP** (pas ISP), projet renommé
**CLEAN CEO** partout (y compris GitHub et Vercel), POC du menu uniquement.

### Fait

- **Main Menu en DOM/CSS** (`src/menu/`), pas en Phaser, pour qu'il
  s'affiche immédiatement : fond de ville, logo, HUD de départ fixe
  (500 FCFA / 0 XP / Bonne), 4 boutons (Nouvelle partie = action principale,
  Reprendre = désactivé tant qu'aucune sauvegarde de partie n'existe,
  Comment jouer, Options), 3 boutons-icônes (Langue = inactif, « bientôt » ;
  Son = coupe/relance ; Paramètres = même modale qu'Options).
- États des boutons selon le design system : hover (fond vert, +2 px, 150 ms),
  pressed (−3 px, ombre réduite, 100 ms, action déclenchée après le feedback),
  focus clavier (contour or), disabled (brun désaturé + petite secousse et son
  grave au clic). Flèches haut/bas pour naviguer au clavier, Échap ferme les
  modales. `prefers-reduced-motion` respecté.
- **Design tokens** (`tokens.css`) issus de la palette verrouillée.
- **Icônes SVG pixel** dessinées sur grille 16×16 (`icons.js`) — les planches
  fournies sont des maquettes, pas des assets découpés.
- **Son** (`SoundManager.js`) : musique en boucle, autoplay tenté puis
  démarrage au premier geste si le navigateur bloque ; effets de survol/clic
  synthétisés en Web Audio ; mute + volume mémorisés. La musique fond en
  sortie au lancement d'une partie.
- **Typo** : Pixelify Sans essayée puis rejetée par l'utilisateur
  (illisible) → **Oxanium**. Fond passé de `pixelated` à lissé (trop
  pixelisé selon l'utilisateur). Pied de page « CLEAN CEO » supprimé à sa
  demande.
- **Chargement différé** (`gameLoader.js`) : `src/main.js` n'importe plus
  Phaser ; le jeu est un fichier séparé (`src/game.js`, ~1,5 Mo) chargé via
  `import()`. Une fois le menu affiché, le code du jeu puis tous les assets de
  la carte sont pré-téléchargés en arrière-plan ; « Nouvelle partie » affiche un
  écran de chargement qui reprend la progression en cours, puis la carte.
- **Bâtiments réduits** : le test en production a montré >2 min de
  téléchargement de la carte à cause des 12,8 Mo de PNG de bâtiments (1536 px,
  affichés en 72 px). Copies à 288 px générées dans
  `public/assets/buildings-web/` (**637 Ko au total**), `ASSET_PATHS` pointe
  dessus. **Les originaux de `public/assets/buildings/` sont conservés
  intacts** (future version HD) ; l'écrasement direct avait été refusé par le
  garde-fou de la session, d'où le dossier séparé.
- **Renommage** : `package.json`, titre, README, CLAUDE.md ; repo GitHub
  `clean-empire` → **`clean-ceo`** (l'ancienne URL redirige) ; projet Vercel
  renommé `clean-ceo`, domaine **https://clean-ceo.vercel.app** ajouté,
  `clean-empire.vercel.app` conservé et toujours fonctionnel.
- **Vérifié** avec Chrome headless + puppeteer (hors projet, dans le
  scratchpad) : captures 1920×1080, 1366×768, 390×844 ; survol, modales,
  bouton son (mute mémorisé), écran de chargement, ouverture de la carte ;
  aucune erreur console.

### Bloqué / à valider par l'utilisateur

- Le **son** n'a pas pu être écouté (session sans audio) : musique, blips de
  survol/clic, fondu au lancement.
- Fond et logo en basse résolution : version HD à fournir.
- Icônes SVG jugées insuffisantes par l'utilisateur : un·e illustrateur·rice
  va les refaire (voir spécifications données dans la conversation).
- Clés localStorage de la carte gardées en `net-empire-*` (volontaire).

### Prochaine étape

Remplacer fond/logo HD et icônes quand ils arrivent (`public/assets/menu/`,
`src/menu/icons.js`). Puis reprendre le gameplay : corriger d'abord l'ordre
d'affichage des sprites (pas de tri de profondeur), puis première boucle de
collecte.

---

## 2026-09-24 — Carte plus regardable : plus de fond noir, ordre d'affichage, ancrage

### Fait

- **Repère « CENTRE DE DISTRIBUTION » supprimé définitivement** : il venait
  du calque d'objets « Repères » du `.tmj` et était dessiné hors grille par
  `placeLandmarks()` (non éditable). Fonction retirée de `mapLoader.js`.
- **Plus de fond noir** (`src/mapDecor.js`, nouveau, purement visuel, hors
  sauvegarde) :
  - sol d'herbe infini : motif 64×32 sans raccord construit depuis la tuile
    d'herbe, calé sur la grille, répété via un seul TileSprite, assombri
    (`OUTSIDE_TINT`) pour signifier « hors zone » ;
  - liseré sombre discret autour de la zone jouable ;
  - bande de 12 cases d'arbres autour de la zone, clairsemée au bord et dense
    au loin (aléatoire à graine fixe : toujours le même décor) ;
  - nuages pixel générés en code (5 variantes, palette crème/beige), placés
    hors du rectangle de la carte, qui ondulent lentement sur place (ne
    traversent jamais la zone jouable ; immobiles si « réduire les
    animations »). À remplacer par de vrais PNG dessinés quand ils existent.
- **Caméra** : bornes élargies au décor (`CAMERA_MARGIN`), et zoom minimum
  recalculé selon la taille de fenêtre pour que la vue tienne toujours dans
  les bornes (sinon Phaser collait la carte dans le coin haut-gauche au
  dézoom maximal).
- **Ordre d'affichage corrigé** (bug relevé au deep dive) : plus de
  `Container` ; chaque sprite a une profondeur (`depthFor()` / `DEPTH` dans
  `mapLoader.js`) — sol et routes toujours dessous, éléments debout triés par
  `col + row`. Peindre du sol à côté d'un bâtiment ne le recouvre plus.
- **Éléments debout ancrés au sol** : origine à 90 % de la hauteur (marge
  transparente mesurée sur les assets), proportions réelles respectées (les
  bâtiments 3:2 n'étaient plus écrasés en carré), bâtiments en 84 px de
  large. `anchorDy` stocké sur le sprite pour que le cadre de sélection de
  l'éditeur reste centré sur la case.
- **Bug corrigé au passage** : ouvrier, tricycle et camion (sprite-sheets
  croppées) étaient affichés 3 à 4× trop petits — `setDisplaySize()` se
  basait sur la planche entière ; remplacé par une échelle calculée sur la
  zone croppée.
- **Herbe moins « carrelage »** : légères variations de teinte déterministes
  par case (`grassTintAt()`).
- Calque masqué (case « Vue ») : une tuile posée dessus reste masquée.
- Vérifié en headless (puppeteer) : zoom par défaut, dézoom max centré,
  zoom max, peinture dans l'éditeur ; aucune erreur console.

### Prochaine étape

Vrais nuages dessinés (PNG transparents, 3–5 variantes, 256–512 px, palette
crème `#F1E9D2` / ombre `#8C7860`) → remplacer `makeCloudTexture()` par un
chargement d'images. Puis première boucle de gameplay (collecte).

---

## 2026-09-24 — Nuages dessinés

### Fait

- L'utilisateur a fourni `Downloads/Cloud 1/2/3.png` (PNG transparents, ~2000 px
  de large). Recadrés sur leur contenu et réduits à 512 px de large en
  « plus proche voisin » (pixels nets) → `public/assets/decor/cloud_1..3.png`
  (47–72 Ko chacun). Originaux laissés dans `Downloads/`.
- `DECOR_ASSET_PATHS` (`mapLoader.js`) : chargés par Phaser et inclus dans le
  pré-téléchargement du menu (`GAME_ASSET_URLS`). Les nuages générés en code
  sont supprimés ; `mapDecor.js` place les vrais nuages (même logique :
  hors de la zone jouable, ondulation lente), filtre NEAREST.

---

## 2026-09-24 — Mer de nuages autour de la ville

### Fait

Demande utilisateur (capture annotée `Downloads/last_cap.png`) : remplir
COMPLÈTEMENT l'espace au-delà de la forêt avec des nuages, pour donner
l'impression d'une ville-île au-dessus des nuages.

- `mapDecor.js`, `createCloudSea()` :
  - fond plein couleur nuage au-delà de la lisière (rectangle du monde moins
    le losange de l'île, en 4 polygones) → aucun trou possible ;
  - 110 nuages serrés le long de la lisière (petite ondulation, bord
    irrégulier qui mord sur la forêt) + renfort aux 4 pointes du losange ;
  - 460 nuages répartis sur toute la mer pour le relief (ondulation lente).
- Nuages éclaircis de 35 % vers le crème au chargement (canvas, fichiers
  intacts) ; fond de la mer = couleur moyenne des nuages éclaircie de 45 %
  (réglages `CLOUD_LIGHTEN`, `SEA_BASE_LIGHTEN`).
- Bande d'arbres réduite à 10 cases (au-delà, cachée par la mer).
- Bug évité : la profondeur des nuages vaut `CLOUDS + y` (y négatif en haut)
  → le fond est placé à `CLOUDS - 50000` pour rester sous tous les nuages.
- ~60 images/s mesurées en headless avec ~600 nuages ; aucune erreur.

---

## 2026-09-24 — Dézoom limité + allègement du décor + nouveau fond de menu

### Fait

- **Dézoom maximal** calé sur la capture de référence de l'utilisateur
  (`Downloads/default_zoom.png`) : la vue montre au plus ~86 % de la largeur
  et ~96 % de la hauteur de la carte (`MAX_VIEW_FRACTION` dans
  `MapScene.js`), recalculé selon la taille de l'écran. Bornes de la caméra
  réduites à la carte + 220 px (`CAMERA_MARGIN`) : on ne voit jamais que la
  forêt et le début de la mer de nuages.
- **Décor allégé** (le PC de l'utilisateur ramait) : nuages de relief 460 →
  120 et placés uniquement dans la zone visible, sol hors zone 7000 → 1500 px,
  bande d'arbres 10 → 9 cases. Toujours 60 images/s en headless.
- **Fond du menu** remplacé par `Downloads/quality_background_image.png`
  (plus net) → `public/assets/menu/main_menu_background_v2.png` (l'ancien
  fichier est conservé). **Attention : toujours 564×317 px**, comme
  l'ancien — pour un vrai gain, il faut une version ≥ 1920×1080.

---

## 2026-09-24 — Fond de menu HD + préparation du fond animé

### Fait

- **Fond du menu en vraie HD** : `Downloads/large_background_image.png`
  (1920×1080, 5 Mo en PNG) converti en WebP qualité 86 →
  `public/assets/menu/main_menu_background_hd.webp` (**645 Ko**). Utilisé
  dans `menu.css` et préchargé dans `index.html`. Les anciens fonds basse
  résolution restent dans le dépôt, inutilisés.
- **ffmpeg installé** (`winget install Gyan.FFmpeg`, accord de
  l'utilisateur ; binaire dans
  `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_…\ffmpeg-9.0.2-full_build\bin\`,
  pas encore dans le PATH des shells déjà ouverts).
- **Analyse du fond animé** `Downloads/Static_background_localized_anim…mp4`
  (1280×720, 24 i/s, 10 s, 8,3 Mo, contient une piste audio inutile) :
  même composition que le fond fixe, camion-poubelle qui roule. Problèmes :
  la boucle ne se raccorde pas (le camion saute d'environ 150 px à la
  reprise, et repart en marche arrière) ; léger « frémissement IA » sur
  toute l'image. Test de compression : H.264 CRF 27 sans audio → **1,6 Mo**
  (VP9 : 1,8 Mo). **Pas intégré** : l'utilisateur va fournir une version où
  le camion sort du cadre, pour une boucle invisible.

### Prochaine étape

Quand la nouvelle vidéo arrive : compresser (H.264, sans audio,
`+faststart`), l'afficher derrière le menu en fondu une fois prête (l'image
HD reste affichée tout de suite), la mettre en pause au lancement d'une
partie, et garder l'image fixe si « réduire les animations » ou « économie
de données » est activé.

---

## 2026-09-24 — Essai du fond animé (vidéo actuelle)

### Fait

- À la demande de l'utilisateur (« essaye déjà avec celle qui est là »), la
  vidéo `Static_background_localized_anim…mp4` est intégrée telle quelle :
  compressée en H.264 CRF 27, sans audio, `+faststart` →
  `public/assets/menu/main_menu_background.mp4` (**1,6 Mo**, 1280×720).
- `src/menu/animatedBackground.js` (nouveau) : vidéo muette en boucle posée
  sur l'image fixe HD. Téléchargement lancé seulement après le chargement de
  la page, affichage uniquement une fois prête (`canplaythrough`). Retirée si
  la lecture échoue ; absente si « réduire les animations » ou « économie de
  données » est activé.
- **Boucle** : pour masquer le saut du camion à la reprise, fondu de 0,45 s
  vers l'image fixe avant la fin et depuis l'image fixe au début (une seule
  vidéo décodée). Mesuré : l'opacité descend à ~0,2 au passage de boucle.
- Vidéo mise en pause dès « Nouvelle partie » (plus aucun décodage pendant
  le chargement ni en jeu). 60 images/s sur le menu en headless.

### À valider par l'utilisateur

Le rendu du fondu de boucle à l'œil ; le contraste entre la vidéo
(1280×720, un peu plus douce) et l'image fixe HD. À remplacer par une vidéo
dont le camion sort du cadre dès qu'elle existe (même nom de fichier suffit).

---

## 2026-09-24 — Fond animé retiré (en attente d'une meilleure vidéo)

L'utilisateur trouve l'essai concluant mais demande de le retirer pour
l'instant : le menu revient à l'image fixe HD seule. `animatedBackground.js`
et `main_menu_background.mp4` restent dans le projet, non utilisés. Pour le
rebrancher : dans `MainMenu._render()`, ajouter
`this.animatedBg = createAnimatedBackground(this.el.querySelector('.menu-bg'))`
et `this.animatedBg.pause()` au début de `showLoading()`. Une nouvelle vidéo
(camion qui sort du cadre, boucle invisible) a été demandée à l'utilisateur.

---

## 2026-09-24 — Nouvelle carte par défaut, chargée à chaque lancement

### Fait

- Carte fournie par l'utilisateur (`Downloads/new_default_map.json`, 40×30,
  export de l'éditeur : 164 routes, 43 bâtiments, 128 détails, aucun asset
  personnalisé) → `public/maps/default-map.json` (92 Ko, JSON compacté).
- Demande : « chaque fois qu'on charge, c'est cette disposition ». Donc :
  - `MapScene` charge **toujours** cette carte (validée par
    `parseGridFile()`) ; le `.tmj` Tiled n'est plus chargé ;
  - **plus de sauvegarde de la carte dans le navigateur** (fonctions
    `loadSavedGrid`/`saveGrid`/`clearSavedGrid` supprimées) : une ancienne
    sauvegarde reprenait sinon le dessus. Vérifié : une sauvegarde
    « tout herbe » laissée dans le navigateur est bien ignorée, sur deux
    rechargements successifs ;
  - les éditions et imports JSON tiennent le temps de la session (registre
    Phaser) ; bouton renommé « ↺ Revenir à la carte par défaut ».
- Pour changer la carte par défaut à l'avenir : « Exporter la carte » dans
  l'éditeur, puis remplacer `public/maps/default-map.json`.

---

## 2026-09-24 — Niveau 1 jouable de bout en bout (roadmap étapes 0 à 6)

### Contexte

Roadmap validée avec l'utilisateur (documents `Downloads/niveau1/` : script
du tutoriel v2 + guide technique). Décisions : départ à **500 FCFA** (pas 0,
sinon le recrutement est impossible avec 3 restos), recollecte après **30 s**,
tricycle 5 000 FCFA visible mais trop cher, camion verrouillé (niveau 2),
Karim : une seule image pour toutes les expressions, sons synthétisés en
attendant les vrais, « Reprendre partie » actif, éditeur caché derrière
`?edit`, écran « Niveau 1 terminé — à suivre » à la place du niveau 2.

### Fait

- **Étape 0** : nouvelle vidéo de fond (`new_lastest_background_video.mp4`,
  boucle propre) → `main_menu_background.mp4` (1,6 Mo), rebranchée sans fondu
  de raccord. Éditeur uniquement avec `?edit` dans l'URL.
- **Fondations** (`src/game/`) : `economy.js` (tous les chiffres + formules :
  coût du n-ième ouvrier 2 000 × 1,5^(n−2), durée selon engins, seuils d'XP),
  `GameState.js` (seule source de vérité, horloge murale), `events.js` (bus
  avec écouteur `*`), `save.js` (localStorage `clean-ceo-save-v1`, sans
  Phaser → utilisable par le menu).
- **Boucle de collecte** : `ContractBuildings.js` — 3 restaurants de la carte
  par défaut (15,13 / 15,7 / 21,18, repli automatique sur les restaurants
  trouvés si la carte change), zones cliquables en coordonnées locales à la
  texture (règle CLAUDE.md), clic distingué du glissé caméra, marqueur au
  sol pulsant, loader circulaire avec secondes restantes, gains flottants.
  `ui/BuildingMenu.js` : menu contextuel ancré au bâtiment (Collecter +
  états : en cours / recollecte dans X s / aucun ouvrier libre).
- **HUD** (`ui/Hud.js`) : icône boutique fournie (extraite du SVG, qui
  contenait en fait un PNG 1024 px → 160 px), argent, XP + barre, ouvriers
  « libres/total », impulsion à chaque changement.
- **Boutique** (`ui/ShopPanel.js`) : recrutement, tricycle, camion verrouillé,
  raison affichée si indisponible, sprites des véhicules en icône.
- **Dialogue** : `ui/DialogueBox.js` (portrait de Karim fourni, machine à
  écrire, NEXT toujours visible, clic/Entrée/Espace, Karim discret en bas à
  droite pendant que le joueur agit) + `DialogueManager.js` (`say()` /
  `waitUntil(condition d'état)` — conditions d'état plutôt qu'événements,
  pour ne rien rater si le joueur agit avant de fermer la bulle).
  `ui/NameInput.js` (séquence 0), `ui/LevelComplete.js`.
- **Tutoriel** : `level1/script.js` (répliques mot pour mot du script, en
  données) + `level1/Level1Tutorial.js` (enchaînement, 7 étapes =
  points de reprise), `GameController.js` (relie tout à MapScene, caméra
  sur la maison de Karim pendant les retrouvailles puis vue de la ville).
- **Menu** : « Reprendre partie » actif s'il existe une sauvegarde ;
  « Nouvelle partie » repart de zéro.
- **Accès de test** `?debug` (expose l'état et la position écran des
  bâtiments, pour les tests automatisés uniquement).
- **Vérifié en headless (puppeteer, clics réels)** : niveau complet joué en
  ~75 s — 500 → 1 000 → 1 500 FCFA, branche « pas encore assez », 3ᵉ
  collecte (2 000), recrutement (0 FCFA, 2/2), clôture, écran de fin ;
  reprise après rechargement (prénom, argent, XP, étape restaurés) ;
  `?edit` = éditeur seul, sans `?edit` = jeu seul. Aucune erreur console.
- Bug corrigé pendant les tests : un `display: grid` écrasait l'attribut
  `hidden` (bulle et Karim affichés ensemble) → règle `.game-ui [hidden]`.

### Bloqué / à valider par l'utilisateur

- **Sons** : tous synthétisés (placeholders), jamais écoutés par l'agent.
- **Ressenti** : rythme de la machine à écrire, durée des pulsations, taille
  du menu bâtiment, lisibilité du HUD.
- Les 12 expressions de Karim utilisent la même image (`data-expression`
  déjà renseigné sur la boîte pour brancher les portraits plus tard).

### Prochaine étape

Session de test par l'utilisateur sur le site en ligne, retours, puis
polish (vrais sons, portraits) et conception du niveau 2 « À son compte ».

---

## 2026-09-24 — Refonte UI/UX niveau 1 + système d'unités de collecte

### Contexte

Retours de test de l'utilisateur : `Downloads/clean-ceo-prompt-refonte-niveau1.md`
(6 points priorisés). Décisions prises avec l'utilisateur : engins « tout
compris » (tricycle 5 000 / camion 50 000, conducteur inclus, chaque unité
part indépendamment) ; carburant 50 / 150 FCFA déduit du gain ; réparation
500 FCFA / 20 s (tricycle), 1 000 FCFA / 30 s (camion), jauge « État » sur
10 utilisations ; tous les bâtiments ont un nom et une fiche (verrouillée
s'il n'y a pas de contrat : gain, XP, durée) ; saisie du prénom inchangée
mais fermable (✕), prénom par défaut **« Ange »**.

### Fait

1. **Dialogue** : boîte toujours centrée, deux formats par groupe de
   répliques (`SCRIPT` dans `level1/script.js`) — `full` (grande, écran
   assombri, zoom caméra vers la cible puis dézoom) pour les moments clés et
   premières explications ; `light` (compacte, sans zoom) pour les
   répliques courtes. Karim à droite, joueur à gauche (initiale du prénom en
   attendant `joueur_<expression>.png`). Portraits par expression chargés
   automatiquement (`karim_<expression>.png`, repli sur l'image actuelle).
   La cible caméra est cadrée dans le tiers haut pour ne pas être cachée.
2. **Bâtiments** : tous cliquables (`buildingRegistry.js` : 43 bâtiments
   nommés), clic au pixel près (`pixelPerfect`) ; fiches « contrat »,
   « pas encore de contrat » (verrouillée) ou « info » (déchetterie, QG) ;
   indicateur permanent au-dessus des bâtiments SOUS CONTRAT seulement
   (« ! » prêt / anneau + secondes en collecte / secondes avant recollecte) ;
   doigt pixel (placeholder) + spotlight pendant le guidage (`ui/Guide.js`).
3. **Unités** (`GameState.units`) : ouvrier à pied ou engin, statut
   disponible / en collecte / en panne / en réparation ; choix EXPLICITE dans
   la fiche (durée et gain net par unité ; présélection s'il n'y en a
   qu'une) ; usure, panne, réparation ; carburant déduit et affiché dans le
   gain flottant.
4. **HUD** : pastille par engin (jauge « État » + statut en texte), clic =
   boutique ; boutique avec section « Tes engins » (jauge + Réparer).
5. **Mobile portrait** : pop-up « Tourne ton téléphone » (animation,
   Continuer, fermeture automatique en paysage).
6. **Prénom** : croix ✕, vide accepté → « Ange ».
- Sauvegarde passée en `clean-ceo-save-v2` (anciennes parties ignorées).
- **Bug corrigé** : Phaser recevait aussi les clics faits sur l'UI DOM
  au-dessus du canvas → cliquer « Collecter » re-cliquait le bâtiment
  dessous et reconstruisait la fiche (collecte impossible). Les clics de
  bâtiment ne comptent plus que s'ils visent le canvas.
- Vérifié en headless : niveau complet (82 s), reprise, achat tricycle,
  collecte (+450 = 500 − 50), panne à 10 utilisations, réparation (−500,
  20 s, état remis à neuf), fiche verrouillée d'un hôpital, pop-up mobile.
  Aucune erreur console.

### À valider par l'utilisateur

Ressenti des zooms caméra et du spotlight, lisibilité des bulles centrées,
vitesse du doigt ; sons toujours synthétisés.

### Hors scope (backlog niveau 2)

Boucle de mécontentement (retards, seuils, pénalités).

---

## 2026-09-25 — Carte finale + retour de la saisie du prénom d'origine

### Fait

- **Prénom** : retour à la version d'origine (demande utilisateur) — plus de
  croix ✕, placeholder « Ton prénom », prénom obligatoire (message « Écris ton
  prénom pour commencer. »). Le repli « Ange » reste dans GameController mais
  n'est plus atteignable.
- **Carte finale** (`Downloads/last_map_for_today_i_think.json`, annoncée comme
  la dernière mise à jour) → `public/maps/default-map.json` : 88 bâtiments
  (dont le 1er QG en 11,22 et 4 déchetteries), 722 détails, 252 cases d'eau.
  Les 3 contrats du tutoriel et la maison de Karim sont aux mêmes cases.
- **Assets personnalisés sortis du JSON** : ils n'existaient qu'en base64 dans
  le fichier (2,8 Mo) et n'étaient chargés que depuis le localStorage de
  l'éditeur → invisibles chez les joueurs. Les 4 réellement utilisés sont
  maintenant de vrais fichiers réduits dans `public/assets/map-custom/`, avec
  des clés fixes (`prop_maison`, `tile_berge`, `prop_sable`, `prop_sable_2`)
  dans `ASSET_PATHS`/`LAYER_PALETTE` (donc pré-chargés par le menu). Rendu
  identique à l'éditeur (mêmes tailles). Carte : 2,8 Mo → 120 Ko.
- **Noms** : `buildingRegistry.js` complété, les 88 bâtiments ont un nom
  unique.
- Vérifié en headless : carte complète affichée, aucune erreur/404, saisie du
  prénom, démarrage du tutoriel. Rendu logiciel ~13 % plus lent qu'avant
  (6,5 vs 7,5 i/s en SwiftShader) — à confirmer sur un vrai téléphone.

### À valider par l'utilisateur

- Coin haut-droit (col. 25–38, lignes 0–11) sans tuile de sol : couvert par du
  sable posé en « détail », les trous laissent voir le sol décoratif.
- 5 bâtiments posés sur l'eau (1,12 · 3,12 · 4,13 · 5,22 · 5,27), gardés tels
  quels.
- Le QG n'a pas encore de rôle de jeu (point de départ des unités à venir).

### Boîtes de dialogue refaites (feu vert utilisateur, même jour)

Références `Downloads/diagBox1-3.png` (Stardew, Civ, Kyra). Correction d'un
malentendu : « Karim à droite » = son PORTRAIT à droite, le texte se lit
toujours de gauche à droite (il était aligné à droite pour Karim).
- Boîte large en bas de l'écran, texte à gauche, ▼ clignotant quand la
  réplique est affichée (remplace le bouton NEXT ; clic / Entrée / Espace).
- Bustes façon Penny posés sur le haut de la boîte : joueur à gauche, Karim à
  droite. Mode `full` : les deux, celui qui écoute assombri ; mode `light` :
  seul celui qui parle, plus petit (choix utilisateur).
- Nom en étiquette sur le bord haut, du côté de celui qui parle.
- Placeholders : Karim = `karim.png` actuel ; joueur = silhouette + initiale.
  Portraits attendus : bustes 4:5 (ex. 512×640), fond transparent, à déclarer
  dans `AVAILABLE_PORTRAITS` (`DialogueBox.js`) ; `joueur_neutre` sert pour
  le joueur quand il n'a pas encore parlé.
- Vérifié en headless à 1280×720 et 844×390 (règle `max-height: 500px`).
  Aucune erreur console. Niveau pas rejoué en entier cette session.

### Prochaine étape

Retours de l'utilisateur sur la boîte ; livraison des portraits.

---

## 2026-09-25 — Phrases d'ambiance sur l'écran de chargement

- `src/menu/loadingHints.js` : 24 phrases (« Mise en place des ouvriers… »,
  « Import des engins… »…), purement décoratives. Une à la fois, ordre
  aléatoire sans répétition, changement toutes les 1,1 à 1,9 s avec fondu,
  jusqu'à la fin du chargement (arrêt dans `MainMenu.destroy()` ; masquées
  si le chargement échoue). Ajouter/modifier les phrases dans ce fichier.
- Vérifié en headless avec réseau ralenti : les phrases défilent, aucune
  erreur. Sur une connexion rapide, le chargement peut être trop court pour
  en voir plus d'une (le jeu est déjà pré-chargé pendant le menu).

---

## 2026-09-25 — Bouton « Menu » en jeu

- `src/game/ui/GameMenu.js` : bouton (roue crantée) en haut à droite, au-dessus
  du dialogue. Panneau : Son (Activé / Coupé), Volume, Reprendre, Retour à
  l'accueil. Réglages dans les mêmes clés que le menu principal
  (`clean-ceo-muted`, `clean-ceo-volume`), appliqués tout de suite aux effets.
- Retour à l'accueil = sauvegarde + rechargement : le menu principal propose
  « Continuer ». Si une collecte est en cours (non sauvegardée), confirmation
  dans le panneau (« Quitter quand même »). Échap ou clic à côté ferment.
- Entrée / Espace dans le menu ne font plus avancer le dialogue.
- Vérifié en headless : ouverture, coupure du son, volume, Échap,
  confirmation, retour au menu avec « Continuer ». Aucune erreur.
- ⚠️ Le disque C: était plein (0 Mo libre) pendant les tests : 14 profils
  Chrome temporaires laissés par mes tests headless (329 Mo) supprimés.

---

## 2026-09-25 — Portraits de Karim + corrections du dictatiel (niveau 1)

### Fait

- **Portraits** : 12 expressions de Karim (`Downloads/karim_image`) réduites
  à 512 px (10 Mo → 763 Ko) dans `public/assets/characters/`, noms alignés sur
  le script (`patience` → `karim_patient`, accents retirés). `fierte` et
  `patient` recadrés pour que la tête ait la même taille que sur les autres
  (bras en partie coupés en bas). Liste dans `src/game/portraits.js` (source
  unique, aussi pré-chargée par le menu). Cadre des bustes passé en carré.
  Le petit Karim du coin utilise `karim_accueil`.
- **Corrections** (`Downloads/dictatiel-correct.md`) :
  1-2. Nouvelle méthode `DialogueManager.prompt(group, cond)` : réplique de
       CONSIGNE tenue (sans ▼, sans assombrissement, le clic ne l'avance pas),
       fermée automatiquement quand l'action est faite. Utilisée pour
       Collecter, Recruter et aussi (validé) « Clique dessus » (1er resto) et
       « Vas-y, clique dessus » (boutique).
  3-4. `guideCollections()` : doigt + auréole disparaissent dès le lancement
       d'une collecte (aussi pour le 2ᵉ resto, même défaut).
  5.   Recrutement : `ShopPanel.setTutorialRecruit(true)` — « Recruter » a
       l'air actif, l'échec ne fait que le son « refus » (pas de secousse ni
       de message), puis Karim dit « Pas encore assez ? … » (texte d'origine
       gardé, choix utilisateur).
- La machine à écrire s'arrête quand la boîte est cachée (plus de blips
  fantômes).
- Vérifié en headless : niveau 1 complet (63 s) jusqu'à l'écran de fin, les
  12 portraits affichés, chaque correction contrôlée (texte suivant affiché
  sans appui, doigt null après Collecter, bouton non grisé + pas de secousse).
  Aucune erreur ni 404. **Pas déployé** : test en local d'abord (demande
  utilisateur).

### Prochaine étape

Test par l'utilisateur en local, puis push (déploiement Vercel).

### Correctif (retour utilisateur, même jour) : caméra vers le bâtiment pointé

Après « Pas encore assez », le doigt pointait le 3ᵉ resto HORS ÉCRAN si le
joueur avait zoomé / déplacé la vue (rien ne bougeait la caméra). Désormais
`target()` (Level1Tutorial) appelle `ctx.showBuilding(id)` →
`GameController._showBuilding()` : si le bâtiment n'est pas bien visible (bords,
ou sous la boîte de dialogue), la caméra le rejoint en 650 ms, zoom du joueur
conservé. Vaut pour toutes les étapes qui pointent un bâtiment. Vérifié en
headless : caméra zoomée ×2,2 sur le 2ᵉ resto → 3ᵉ resto à y = 936 px (hors
écran 720) avant, recentré (640, 270) après. `?debug` expose aussi `camera`.

### Vitrine de la boutique pendant la réplique sur les engins (même jour)

Consigne 6 (« Autre chose dans la boutique : les engins… ») : la boutique
s'ouvre en VITRINE (`ShopPanel.setShowcase`) — lecture seule, Tricycle et
Camion entourés de l'anneau pulsé, le reste estompé, pas de doigt. Un clic sur
la boutique (ou sur la boîte / Entrée) fait avancer Karim ; boutique refermée
à la fin de la réplique. Groupe passé en format `light` (choix utilisateur :
sinon l'assombrissement et le buste du joueur cachent la boutique). Vérifié en
headless : clic sur le bouton du tricycle → rien acheté (0 → 0 FCFA), la
réplique suivante s'affiche, boutique fermée ; niveau complet, aucune erreur.

### Portraits du joueur (même jour)

`joueur_curieux` et `joueur_sceptique` (Downloads, 2048 px) → 512 px (~70 Ko
chacun), recadrés pour que la tête ait l'échelle de Karim (ils étaient en
buste entier, bras croisés). `curieux` sert aussi de portrait neutre quand
Karim parle avant que le joueur ne se soit exprimé (`PLAYER_NEUTRAL` dans
`portraits.js`) ; la silhouette + initiale reste en repli. Vérifié : niveau
complet, les 2 portraits affichés, aucune erreur.

---

## 2026-09-25 — Boutique à onglets, améliorations, quêtes, temporalités, sélecteur d'unités

### Contexte

`Downloads/prompt-boutique-quetes-timers.md` + correctif « sélection des
ressources » envoyé ensuite. Décisions utilisateur : onglet Contrats
ABANDONNÉ ; montée de niveau par l'XP activée ; onglets Améliorations et
Premium verrouillés pendant le tutoriel ; quêtes suivies en coulisses puis
présentées par Karim (texte libre, portrait existant) ; premium = « Arrive
bientôt », prix en XOF ; tout livrer et pousser après tests (utilisateur
absent).

### Fait

1. **Temporalités** : jauge horizontale au pied de chaque bâtiment sous
   contrat = déchets accumulés (pleine → « ! » au-dessus) ; anneau + secondes
   au-dessus = collecte EN COURS. Le compte à rebours de recollecte a disparu.
   Fiche : « Déchets en accumulation : 63 % ».
2. **Modèle** (`economy.js`, `GameState.js`) : niveau = f(XP totale) après le
   tutoriel (100 XP → niv. 2, 300 → 3, 600 → 4…) ; 7 améliorations
   (`ECONOMY.upgrades`, effets centralisés dans `modifiers()`, lus par
   `collectionDuration` / `collectionReward` / `maxUses` / réparation) ;
   compteurs `stats` ; sauvegarde **v3** (champs ajoutés, même clé — une v2
   est reprise avec des valeurs par défaut).
3. **Boutique plein écran à onglets** (`ShopPanel.js` réécrit, même API) :
   Personnel & équipement / Améliorations / Premium (3 packs mixtes, prix en
   XOF, bouton → « Arrive bientôt », placeholders « visuel à venir »). Le
   tutoriel (essai de recrutement, vitrine des engins) marche dans la
   nouvelle boutique ; en vitrine, seuls les engins sont affichés (sinon la
   boîte de dialogue cachait le camion sur téléphone).
4. **Quêtes** (`quests.js` : 36 quêtes, niv. 1 = 3 d'intro ; `ui/QuestPanel.js`) :
   jauge par quête, bouton « Réclamer » (jamais automatique), quête retirée
   une fois réclamée ; bouton carnet (icône `book`, placeholder) dans le HUD à
   côté de la boutique, badge rouge = quêtes à réclamer. Caché pendant le
   tutoriel, puis présenté par Karim après « Continuer à jouer » (répliques
   `quetes` / `quetesOuvrir` dans `script.js`). Annonces (`ui/Toast.js`) :
   montée de niveau (ce qui est débloqué) et objectifs remplis (regroupés).
   « Premiers bénéfices » ramenée à 1 500 FCFA pour que les 3 quêtes d'intro
   soient prêtes à la fin du tutoriel.
5. **Sélecteur d'unités** (`BuildingMenu.js`) : un seul TYPE possédé →
   bouton « Collecter » direct (ligne « Ouvriers disponibles : 2 · 15 s ·
   +500 FCFA ») ; ≥ 2 types → une pastille par type en ligne (badge =
   disponibles, durée, gain net), clic = collecte lancée avec ce type (engin :
   le mieux entretenu). Hauteur de fiche identique avec 100 ouvriers. Plus de
   re-rendu de boutons chaque seconde (un clic pouvait être perdu).

### Tests (headless, tous verts, aucune erreur ni 404)

Tutoriel complet desktop ET téléphone paysage (844×390) : 5 corrections du
dictatiel, caméra vers le 3ᵉ resto, vitrine, écran de fin, présentation du
carnet, 3 quêtes réclamées (+800 FCFA, +5 XP). Reprise en plein tutoriel
(sauvegarde v2). Jeu libre : jauges, améliorations (15 → 12 s, 500 → 550),
niveau 2 par une vraie collecte + annonces, boutique 3 onglets desktop et
mobile, premium sans débit, sélecteur (1 type / 2 types / 100 ouvriers).
Menu (Continuer désactivé sans sauvegarde), éditeur `?edit`.

### Hors scope / à valider

- Onglet Contrats abandonné : les autres restaurants ne sont pas signables.
- Bennes de quartier (saturation) : affichée « Bientôt » (mécanique du niveau 2).
- Icônes placeholders : carnet (`book`), visuels des packs premium.
- Montants des améliorations, packs et quêtes : à équilibrer en jouant.

### Option A : finir le niveau 1 fait passer au niveau 2 (même jour)

Incohérence relevée par l'utilisateur (`Downloads/capture_niveau_1_termine.png`) :
écran « Niveau 1 terminé » mais HUD « 12 XP · Niv. 1 », jauge à 12 %. Deux
règles indépendantes (fin du niveau = objectif du tutoriel ; « Niv. » = XP,
100 XP) et un tutoriel qui ne rapporte que 12 XP. Correctif validé (option A) :
- `completeLevel()` : bonus de fin de niveau qui complète l'XP jusqu'à 100 →
  niveau 2 (écran de fin : « dont bonus de fin de niveau +88 XP », « Tu passes
  au niveau 2 », liste des déblocages ; pas d'annonce en doublon).
- Parties déjà finies sous 100 XP : remises à 100 XP au chargement.
- Carnet : les quêtes du niveau 2 n'apparaissent qu'une fois les 3 quêtes
  d'intro réclamées (« À son compte » est alors remplie tout de suite).
- Vérifié : tutoriel complet, reprise d'une partie à 12 XP (→ Niv. 2), niveau 3
  à 300 XP avec annonce, boutique, sélecteur, jauges. Aucune erreur.
