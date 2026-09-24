// Script du niveau 1 « L'affaire du cousin », repris mot pour mot de
// Downloads/niveau1/clean-ceo-script-tutoriel.md (v2). Les données (qui parle,
// expression, texte) sont séparées de l'enchaînement (level1/Level1Tutorial.js).
//
// speaker : 'karim' ou 'player' (affiché avec le prénom saisi).
// {PRENOM} est interpolé partout.

export const LINES = {
  // Séquence 1 — Retrouvailles
  intro: [
    { speaker: 'karim', expression: 'accueil', text: 'Eh, {PRENOM} ! Ça fait un bail.' },
    { speaker: 'karim', expression: 'accueil', text: "T'as un peu maigri là-dedans, mais t'as l'air en forme." },
    {
      speaker: 'karim',
      expression: 'sincère',
      text: "Pas de bol, ce qui t'est arrivé. Mais t'inquiète, je vais pas te laisser tomber.",
    },
    {
      speaker: 'karim',
      expression: 'mystérieux',
      text: "J'ai trouvé un truc pour toi. Un business qui pourrait bien t'intéresser.",
    },
    { speaker: 'player', expression: 'curieux', text: 'Ah oui ? Ça peut être quoi ?' },
    {
      speaker: 'karim',
      expression: 'enthousiasme',
      text: "La gestion des déchets. Ris pas, c'est une vraie mine d'or, ce truc-là.",
    },
    {
      speaker: 'player',
      expression: 'sceptique',
      text: "OK... De toute façon j'ai pas trop le choix. C'est déjà mieux que rien, je suppose.",
    },
    { speaker: 'karim', expression: 'sourire', text: "C'est l'esprit." },
    {
      speaker: 'karim',
      expression: 'réaliste',
      text: "Vu que tu sors de prison, ta réputation en ville est pas terrible. Mais j'ai négocié trois contrats pour toi, pour démarrer.",
    },
  ],

  consigne1: [
    {
      speaker: 'karim',
      expression: 'encouragement',
      text: "Ce restaurant t'attend. Clique dessus pour voir ce qu'il te faut faire.",
    },
  ],
  consigne2: [{ speaker: 'karim', expression: 'encouragement', text: "Clique sur Collecter. J'envoie ton ouvrier." }],
  feedback1: [
    {
      speaker: 'karim',
      expression: 'patient',
      text: 'Et voilà. Maintenant on attend. Un ouvrier occupé peut pas être ailleurs en même temps.',
    },
  ],
  consigne3: [
    {
      speaker: 'karim',
      expression: 'satisfaction',
      text: "Nickel. Le deuxième resto t'attend aussi. À toi de jouer, tu sais faire maintenant.",
    },
  ],
  consigne4: [
    {
      speaker: 'karim',
      expression: 'enthousiasme',
      text: "T'as vu l'icône en haut à gauche ? C'est ta boutique. Tout ce que tu gagnes, tu peux le réinvestir là-dedans.",
    },
    { speaker: 'karim', expression: 'encouragement', text: 'Vas-y, clique dessus, viens jeter un œil.' },
  ],
  consigne5: [
    {
      speaker: 'karim',
      expression: 'malin',
      text: "Un seul ouvrier, ça va vite devenir un problème. T'as de quoi en recruter un deuxième, non ?",
    },
  ],
  consigne5PasAssez: [
    {
      speaker: 'karim',
      expression: 'rassurant',
      text: 'Pas encore assez ? Fais une collecte de plus sur le troisième resto, et reviens me voir.',
    },
  ],
  feedback2: [
    {
      speaker: 'karim',
      expression: 'fierté',
      text: 'Et voilà, deux ouvriers. Tu peux lancer deux collectes en même temps maintenant.',
    },
  ],
  consigne6: [
    {
      speaker: 'karim',
      expression: 'enthousiasme',
      text: "Autre chose dans la boutique : les engins. Ça réduit le temps de chaque collecte. Utile quand t'auras plus de contrats à gérer.",
    },
  ],
  cloture: [
    { speaker: 'karim', expression: 'fierté', text: 'Tu gères déjà mieux que moi à tes débuts.' },
    {
      speaker: 'karim',
      expression: 'sincère',
      text: "Je te laisse mes clés. La suite, c'est toi qui l'écris, {PRENOM}.",
    },
  ],
};

// Les 3 contrats du niveau 1 : restaurants de la carte par défaut
// (public/maps/default-map.json), dans l'ordre du tutoriel. Si la carte change
// et qu'un restaurant n'est plus à ces coordonnées, Level1Tutorial retombe sur
// les restaurants trouvés sur la carte.
export const CONTRACTS = [
  { id: 'resto_1', name: 'Restaurant du Quartier', col: 15, row: 13 },
  { id: 'resto_2', name: 'Maquis Chez Tanti', col: 15, row: 7 },
  { id: 'resto_3', name: 'Resto Le Carrefour', col: 21, row: 18 },
];

// Maison de Karim (immeuble de quartier voisin du premier restaurant) : la
// caméra s'y centre pendant les retrouvailles.
export const KARIM_HOUSE = { col: 16, row: 16 };

// Mise en scène de chaque groupe de répliques (refonte niveau 1) :
// - 'full'  : grande boîte + écran assombri + zoom caméra vers `focus`, pour
//             les moments clés et la PREMIÈRE explication d'une mécanique ;
// - 'light' : boîte compacte, sans assombrissement ni zoom, pour les
//             répliques courtes et répétitives (garder le rythme).
// `focus` : id de bâtiment, 'karim_house' ou 'city'.
export const SCRIPT = {
  intro: { mode: 'full', focus: 'karim_house', lines: LINES.intro },
  consigne1: { mode: 'full', focus: 'resto_1', lines: LINES.consigne1 },
  consigne2: { mode: 'light', lines: LINES.consigne2 },
  feedback1: { mode: 'full', focus: 'resto_1', lines: LINES.feedback1 },
  consigne3: { mode: 'light', lines: LINES.consigne3 },
  consigne4: { mode: 'full', lines: LINES.consigne4 },
  consigne5: { mode: 'full', lines: LINES.consigne5 },
  consigne5Relance: { mode: 'light', lines: LINES.consigne5 },
  consigne5PasAssez: { mode: 'light', lines: LINES.consigne5PasAssez },
  feedback2: { mode: 'light', lines: LINES.feedback2 },
  consigne6: { mode: 'full', lines: LINES.consigne6 },
  cloture: { mode: 'full', focus: 'city', lines: LINES.cloture },
};
