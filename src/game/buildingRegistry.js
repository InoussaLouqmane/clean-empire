import { ECONOMY } from './economy.js';

// Registre de TOUS les bâtiments de la carte (refonte niveau 1 : tous sont
// cliquables). Chacun a un nom ; les 3 contrats du tutoriel gardent leur id
// (resto_1…3), les autres reçoivent un id stable `b_<col>_<row>`.
//
// Noms attribués dans l'ordre de lecture de la carte (ligne par ligne) :
// changer la carte change donc l'attribution, mais jamais de façon
// aléatoire d'un chargement à l'autre.

const NAMES = {
  building_restaurant: ['Chez Mama Afi', 'Le Palmier Gourmand', 'Maquis du Rond-Point', 'La Bonne Fourchette'],
  building_cousin: [
    'Résidence Akwaba',
    'Immeuble Les Cocotiers',
    'Résidence du Port',
    'Immeuble Soleil',
    'Résidence Les Flamboyants',
    'Immeuble Zongo',
    'Résidence La Lagune',
    'Immeuble Étoile',
    'Résidence Tokpa',
    'Immeuble Les Manguiers',
    'Résidence Océane',
    'Immeuble Saint-Michel',
    'Résidence Harmonie',
    'Immeuble Le Carrefour',
    'Résidence Les Baobabs',
    'Immeuble Horizon',
    'Résidence Cadjèhoun',
    'Immeuble Les Rôniers',
    'Résidence Fidjrossè',
    'Immeuble Le Phare',
    'Résidence Les Hibiscus',
    'Immeuble Gbégamey',
    'Résidence Belle Vue',
    'Immeuble Les Filaos',
    'Résidence Haie Vive',
    'Immeuble Le Cordon',
    'Résidence Les Acacias',
    'Immeuble Jéricho',
    'Résidence Sainte-Rita',
    'Immeuble Les Colibris',
    'Résidence Agla',
    'Immeuble Le Belvédère',
    'Résidence Les Bougainvilliers',
    'Immeuble Vodjè',
    'Résidence Le Wharf',
    'Immeuble Les Tisserins',
    'Résidence Ganhi',
    'Immeuble Le Rivage',
    'Résidence Les Orchidées',
    'Immeuble Houéyiho',
    'Résidence La Plage',
    'Immeuble Les Pélicans',
    'Résidence Kouhounou',
    'Immeuble Le Lagon',
    'Résidence Les Palmiers Royaux',
  ],
  building_ecole: ['École Les Petits Génies', 'Collège du Littoral', 'École Primaire Akpakpa', 'Lycée de la Lagune', 'École Les Colibris', 'Collège Sainte-Cécile'],
  building_marche: ['Marché du Quartier', 'Marché aux Fruits', 'Marché Central', 'Petit Marché du Port', 'Marché de Nuit', 'Marché aux Poissons', 'Marché des Artisans'],
  building_hotel: [
    'Hôtel du Lac',
    'Hôtel Palmier Bleu',
    'Hôtel La Marina',
    'Hôtel des Voyageurs',
    'Hôtel Soleil Levant',
    'Hôtel Le Relais',
    'Hôtel Bel Air',
    'Hôtel Les Cocotiers',
    'Hôtel de la Plage',
  ],
  building_cinema: ['Ciné Étoile', 'Ciné Lumière', 'Ciné Le Rex', 'Ciné Palace', 'Ciné Océan', 'Ciné Canal', 'Ciné Plein Air'],
  building_hopital: ["Hôpital de la Mère et de l'Enfant", 'Clinique Saint-Luc'],
  building_depot: ['Déchetterie municipale', 'Centre de tri du Port', 'Déchetterie de la Berge', 'Centre de tri Nord'],
  building_qg: ['QG CLEAN CEO'],
};

// Bâtiments qui ne sont pas des clients : message d'information au clic.
const SPECIAL = {
  building_depot: {
    type: 'Déchetterie',
    info: "C'est ici que tes ouvriers déposent les déchets collectés.",
  },
  building_qg: { type: 'Quartier général', info: "Ton QG. C'est d'ici que tout part." },
};

/**
 * @param {object} grid  carte au format Net Empire (mapData.js)
 * @param {Array<{id,name,col,row}>} contracts  contrats du niveau
 * @returns {Array<{id,key,col,row,name,client,special,contract}>}
 */
export function listCityBuildings(grid, contracts) {
  const byCell = new Map(contracts.map((c) => [`${c.col},${c.row}`, c]));
  const used = {};
  const list = [];

  grid.layers.buildings.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (!cell) return;
      const key = cell.key;
      const contract = byCell.get(`${c},${r}`);
      let name = contract?.name;
      if (!name) {
        const i = (used[key] = (used[key] ?? -1) + 1);
        const type = ECONOMY.clients[key]?.type ?? SPECIAL[key]?.type ?? 'Bâtiment';
        name = NAMES[key]?.[i] ?? `${type} n°${i + 1}`;
      }
      list.push({
        id: contract?.id ?? `b_${c}_${r}`,
        key,
        col: c,
        row: r,
        name,
        client: ECONOMY.clients[key] ?? null,
        special: SPECIAL[key] ?? null,
        contract: Boolean(contract),
      });
    })
  );
  return list;
}
