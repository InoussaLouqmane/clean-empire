// Phrases d'ambiance de l'écran de chargement (demande utilisateur du
// 2026-09-25) : pur habillage, elles ne décrivent PAS ce qui se charge
// vraiment. Une à la fois, tirée au hasard, changée toutes les 1 à 2 s.

export const LOADING_HINTS = [
  'Mise en place des ouvriers…',
  'Import des engins…',
  'Négociation des premiers contrats…',
  'Gonflage des pneus du tricycle…',
  'Distribution des gants et des gilets…',
  'Comptage des poubelles du quartier…',
  'Traçage des tournées de collecte…',
  'Réveil de Karim…',
  'Plein de carburant du camion…',
  'Nettoyage des bennes…',
  'Repérage des poubelles qui débordent…',
  'Impression des cartes de visite…',
  'Recherche de clients sérieux…',
  'Calcul des bénéfices à venir…',
  'Rangement du QG…',
  'Ouverture de la déchetterie…',
  'Arrosage des palmiers…',
  'Allumage des lampadaires…',
  'Préparation du café de l’équipe…',
  'Vérification des freins du tricycle…',
  'Rédaction des factures…',
  'Poignées de main avec les restaurateurs…',
  'Chasse aux sachets plastiques…',
  'Tri des bouteilles et des cartons…',
];

const MIN_MS = 1100;
const MAX_MS = 1900;
const FADE_MS = 220;

/**
 * Fait défiler LOADING_HINTS dans `el` jusqu'à l'appel de la fonction
 * renvoyée (arrêt). Ordre aléatoire sans répétition avant d'avoir tout vu.
 */
export function startLoadingHints(el) {
  let bag = [];
  let last = null;
  let timer = 0;
  let stopped = false;

  const draw = () => {
    if (bag.length === 0) {
      bag = [...LOADING_HINTS].sort(() => Math.random() - 0.5);
      if (bag[0] === last) bag.push(bag.shift()); // pas deux fois de suite
    }
    return (last = bag.shift());
  };

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const next = () => {
    if (stopped) return;
    el.classList.add('is-out');
    timer = setTimeout(
      () => {
        if (stopped) return;
        el.textContent = draw();
        el.classList.remove('is-out');
        timer = setTimeout(next, MIN_MS + Math.random() * (MAX_MS - MIN_MS));
      },
      reduceMotion ? 0 : FADE_MS
    );
  };

  el.textContent = draw();
  timer = setTimeout(next, MIN_MS + Math.random() * (MAX_MS - MIN_MS));

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
