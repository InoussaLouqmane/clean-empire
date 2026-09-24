import { icon } from '../../menu/icons.js';

// Petits éléments d'UI partagés pour les unités de collecte (HUD, fiche
// bâtiment, boutique). Statut toujours donné en TEXTE + couleur, jamais par la
// couleur seule (design system §38).

export const VEHICLE_SPRITES = {
  tricycle: 'assets/vehicles/tricycle_move_3frames_32x32.png',
  camion: 'assets/vehicles/camion_move_3frames_32x32.png',
};

export const STATUS_LABELS = {
  available: 'Disponible',
  busy: 'En collecte',
  broken: 'En panne',
  repairing: 'En réparation',
};

/** Icône d'un type d'unité : ouvrier (SVG pixel) ou sprite du véhicule. */
export function unitIcon(type) {
  if (type === 'walker') return `<span class="unit-icon">${icon('worker')}</span>`;
  return `<span class="unit-icon unit-icon--sprite" style="background-image:url(${VEHICLE_SPRITES[type]})"></span>`;
}

/** Jauge « État » d'un engin (0..1), en segments pixel. */
export function conditionGauge(condition, segments = 10) {
  const lit = Math.round(condition * segments);
  const level = condition > 0.5 ? 'good' : condition > 0.2 ? 'low' : 'critical';
  return `<span class="condition-gauge is-${level}" role="meter" aria-label="État" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(condition * 100)}">${Array.from({ length: segments }, (_, i) => `<i class="${i < lit ? 'is-lit' : ''}"></i>`).join('')}</span>`;
}
