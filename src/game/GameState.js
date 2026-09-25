import { ECONOMY, VEHICLE_TYPES, nextWalkerCost, collectionDuration, collectionReward, levelInfo, modifiers } from './economy.js';
import { QUESTS, questValue } from './quests.js';
import { bus } from './events.js';
import { writeSave } from './save.js';

/**
 * État d'une partie : argent, XP, UNITÉS de collecte, bâtiments sous contrat,
 * progression du tutoriel. Seule source de vérité — l'UI lit ici et réagit à
 * `state_changed` ; toute modification passe par les méthodes ci-dessous
 * (qui émettent les événements du bus et sauvegardent).
 *
 * Unité de collecte (refonte niveau 1, 2026-09-24) :
 *   { id, type: 'walker' | 'tricycle' | 'camion', uses, repairUntil }
 * Statut dérivé : 'busy' (en collecte), 'repairing', 'broken' (usure ≥ max),
 * sinon 'available'. Les engins s'usent à chaque collecte ; à pied, jamais.
 *
 * Temps : horloge murale (Date.now()), pour que les timers restent justes
 * même si l'onglet passe en arrière-plan.
 */
export class GameState {
  constructor(data = {}, contracts = []) {
    this.contracts = new Map(contracts.map((c) => [c.id, c]));
    this.playerName = data.playerName ?? '';
    this.money = data.money ?? ECONOMY.start.money;
    this.xp = data.xp ?? ECONOMY.start.xp;
    this.units =
      data.units ??
      Array.from({ length: ECONOMY.start.walkers }, (_, i) => ({ id: `u${i + 1}`, type: 'walker', uses: 0, repairUntil: 0 }));
    this._nextUnitId = data.nextUnitId ?? this.units.length + 1;
    // id bâtiment -> { collected, cooldownUntil }
    this.buildings = data.buildings ?? {};
    // id bâtiment -> { unitId, endsAt, durationS } — collectes en cours (non
    // sauvegardées : une collecte interrompue par une fermeture de page est perdue)
    this.collecting = {};
    this.tutorial = { checkpoint: null, done: false, ...data.tutorial };
    this.levelComplete = data.levelComplete ?? false;
    // v3 (2026-09-25) : améliorations, compteurs (quêtes), quêtes. Une
    // sauvegarde v2 est reprise telle quelle avec ces valeurs par défaut.
    this.upgrades = data.upgrades ?? [];
    const pastCollections = Object.values(this.buildings).reduce((n, b) => n + (b.collected ?? 0), 0);
    this.stats = { collections: pastCollections, moneyEarned: 0, repairs: 0, vehicleCollections: 0, ...data.stats };
    this.quests = { completed: [], claimed: [], ...data.quests };
    this.questsIntroDone = data.questsIntroDone ?? false;
    // Contrats (onglet rétabli le 2026-09-25) : signés hors tutoriel, demandes
    // en attente, niveaux déjà servis en demandes, présentation par Karim.
    this.signedContracts = data.signedContracts ?? [];
    this.contractOffers = data.contractOffers ?? [];
    this.offersUpToLevel = data.offersUpToLevel ?? 1;
    this.contractsIntroDone = data.contractsIntroDone ?? false;
    this.catalog = new Map(); // tous les bâtiments de la carte (setCatalog)
    // Partie finie AVANT le bonus de fin de niveau (option A) : remise à
    // niveau, sinon elle resterait affichée « Niv. 1 » après « Niveau 1 terminé ».
    if (this.tutorial.done && this.xp < this._levelTwoXp) this.xp = this._levelTwoXp;
    this.levelBonusXp = 0; // bonus de fin de niveau 1 (affiché sur l'écran de fin)
    this._lastLevel = this.level;
    // Une réparation en cours au moment de la sauvegarde continue à la reprise
    // (horloge murale) : tick() la termine à l'heure prévue.
  }

  // ------------------------------------------------------------- lecture

  /** Niveau : 1 tant que le tutoriel n'est pas fini, puis selon l'XP totale. */
  get level() {
    return this.tutorial.done ? levelInfo(this.xp).level : 1;
  }

  /** Bornes d'XP du niveau actuel : { floor, next } (jauge du HUD). */
  get levelBounds() {
    return this.tutorial.done ? levelInfo(this.xp) : { level: 1, floor: 0, next: ECONOMY.progression.xpPerLevel };
  }

  get xpForNextLevel() {
    return this.levelBounds.next;
  }

  /** XP totale du niveau 2 (seuil atteint par le bonus de fin de niveau 1). */
  get _levelTwoXp() {
    return ECONOMY.progression.xpPerLevel;
  }

  /** Effets des améliorations possédées (voir economy.js). */
  get mods() {
    return modifiers(this.upgrades);
  }

  /** Utilisations avant panne d'un type d'engin (améliorations comprises). */
  maxUses(type) {
    const max = ECONOMY.units[type].maxUses;
    return max ? max + this.mods.maxUsesBonus : 0;
  }

  get walkerCount() {
    return this.units.filter((u) => u.type === 'walker').length;
  }

  get nextWalkerCost() {
    return nextWalkerCost(this.walkerCount);
  }

  get hasInvested() {
    return this.units.length > ECONOMY.start.walkers;
  }

  unitStatus(unit, now = Date.now()) {
    if (Object.values(this.collecting).some((c) => c.unitId === unit.id)) return 'busy';
    if (unit.repairUntil && now < unit.repairUntil) return 'repairing';
    const max = this.maxUses(unit.type);
    if (max && unit.uses >= max) return 'broken';
    return 'available';
  }

  availableUnits(now = Date.now()) {
    return this.units.filter((u) => this.unitStatus(u, now) === 'available');
  }

  /** État d'un engin, 0..1 (1 = neuf). Toujours 1 pour un ouvrier à pied. */
  unitCondition(unit) {
    const max = this.maxUses(unit.type);
    return max ? Math.max(0, 1 - unit.uses / max) : 1;
  }

  /** Secondes restantes de réparation (0 si aucune). */
  repairLeftS(unit, now = Date.now()) {
    return unit.repairUntil ? Math.max(0, Math.ceil((unit.repairUntil - now) / 1000)) : 0;
  }

  unitLabel(unit) {
    const sameType = this.units.filter((u) => u.type === unit.type);
    const base = ECONOMY.units[unit.type].label;
    return sameType.length > 1 ? `${base} ${sameType.indexOf(unit) + 1}` : base;
  }

  client(id) {
    return this.contracts.get(id)?.client ?? null;
  }

  collectedCount(id) {
    return this.buildings[id]?.collected ?? 0;
  }

  isCollecting(id) {
    return Boolean(this.collecting[id]);
  }

  /** Secondes restantes avant de pouvoir recollecter `id` (0 = disponible). */
  cooldownLeftS(id, now = Date.now()) {
    const until = this.buildings[id]?.cooldownUntil ?? 0;
    return Math.max(0, Math.ceil((until - now) / 1000));
  }

  /**
   * Accumulation des déchets 0..1 depuis la dernière collecte (1 = prêt à
   * collecter). Jamais collecté : plein. Sert la jauge au pied du bâtiment,
   * distincte de l'anneau de collecte EN COURS (prompt du 2026-09-25).
   */
  accumulation(id, now = Date.now()) {
    const b = this.buildings[id];
    if (!b?.cooldownUntil || now >= b.cooldownUntil) return 1;
    const total = (b.cooldownS ?? ECONOMY.collection.cooldownS) * 1000;
    return Math.min(1, Math.max(0, 1 - (b.cooldownUntil - now) / total));
  }

  /** Progression 0..1 d'une collecte en cours. */
  collectionProgress(id, now = Date.now()) {
    const c = this.collecting[id];
    if (!c) return 0;
    return Math.min(1, Math.max(0, 1 - (c.endsAt - now) / (c.durationS * 1000)));
  }

  /** Raison pour laquelle `id` ne peut pas être collecté, ou null. */
  collectBlocker(id, now = Date.now()) {
    if (!this.contracts.has(id)) return 'Pas de contrat';
    if (this.isCollecting(id)) return 'Collecte en cours';
    const cd = this.cooldownLeftS(id, now);
    if (cd > 0) return `Déchets en accumulation : ${Math.floor(this.accumulation(id, now) * 100)} %`;
    if (this.availableUnits(now).length === 0) return 'Aucune unité disponible';
    return null;
  }

  collectionDurationFor(id, unitType) {
    return collectionDuration(this.client(id), unitType, this.mods);
  }

  netRewardFor(id, unitType) {
    return collectionReward(this.client(id), unitType, this.mods).money;
  }

  // ---------------------------------------------------------- écriture

  setPlayerName(name) {
    this.playerName = name;
    this._changed();
  }

  startCollection(id, unitId, now = Date.now()) {
    if (this.collectBlocker(id, now)) return false;
    const unit = this.units.find((u) => u.id === unitId);
    if (!unit || this.unitStatus(unit, now) !== 'available') return false;
    const durationS = this.collectionDurationFor(id, unit.type);
    this.collecting[id] = { unitId, endsAt: now + durationS * 1000, durationS };
    bus.emit('collection_started', { id, unitId, durationS });
    this._changed();
    return true;
  }

  /** À appeler à chaque frame : termine collectes et réparations échues. */
  tick(now = Date.now()) {
    for (const [id, c] of Object.entries(this.collecting)) {
      if (now < c.endsAt) continue;
      delete this.collecting[id];
      const unit = this.units.find((u) => u.id === c.unitId);
      const mods = this.mods;
      const reward = collectionReward(this.client(id), unit?.type ?? 'walker', mods);
      this.money += reward.money;
      this.xp += reward.xp;
      this.stats.collections += 1;
      this.stats.moneyEarned += reward.money;
      if (unit && unit.type !== 'walker') this.stats.vehicleCollections += 1;
      if (unit && this.maxUses(unit.type)) {
        unit.uses += 1;
        if (unit.uses >= this.maxUses(unit.type)) bus.emit('unit_broken', { unitId: unit.id });
      }
      const b = (this.buildings[id] ??= { collected: 0, cooldownUntil: 0 });
      b.collected += 1;
      b.cooldownS = mods.cooldownS;
      b.cooldownUntil = now + b.cooldownS * 1000;
      bus.emit('collection_finished', { id, reward });
      this._changed();
    }
    for (const u of this.units) {
      if (u.repairUntil && now >= u.repairUntil) {
        this._finishRepair(u);
        bus.emit('unit_repaired', { unitId: u.id });
        this._changed();
      }
    }
  }

  _finishRepair(unit) {
    unit.repairUntil = 0;
    unit.uses = 0;
  }

  hireWorker() {
    const cost = this.nextWalkerCost;
    if (this.money < cost) return false;
    this.money -= cost;
    this._addUnit('walker');
    bus.emit('worker_hired', { total: this.walkerCount, cost });
    this._changed();
    return true;
  }

  vehicleBlocker(type) {
    const v = ECONOMY.units[type];
    if (!v || !VEHICLE_TYPES.includes(type)) return 'Inconnu';
    if (v.unlockLevel > this.level) return `Débloqué au niveau ${v.unlockLevel}`;
    if (this.money < v.cost) return "Pas assez d'argent";
    return null;
  }

  buyVehicle(type) {
    if (this.vehicleBlocker(type)) return false;
    this.money -= ECONOMY.units[type].cost;
    const unit = this._addUnit(type);
    bus.emit('vehicle_bought', { type, unitId: unit.id });
    this._changed();
    return true;
  }

  repairBlocker(unitId, now = Date.now()) {
    const unit = this.units.find((u) => u.id === unitId);
    if (!unit) return 'Inconnu';
    if (this.unitStatus(unit, now) !== 'broken') return 'Pas en panne';
    if (this.money < ECONOMY.units[unit.type].repairCost) return "Pas assez d'argent";
    return null;
  }

  repairUnit(unitId, now = Date.now()) {
    if (this.repairBlocker(unitId, now)) return false;
    const unit = this.units.find((u) => u.id === unitId);
    const spec = ECONOMY.units[unit.type];
    this.money -= spec.repairCost;
    unit.repairUntil = now + Math.round(spec.repairS * this.mods.repairTimeMult) * 1000;
    this.stats.repairs += 1;
    bus.emit('unit_repair_started', { unitId });
    this._changed();
    return true;
  }

  // ------------------------------------------------------ améliorations

  /** Raison pour laquelle l'amélioration `id` ne peut pas être achetée, ou null. */
  upgradeBlocker(id) {
    const u = ECONOMY.upgrades[id];
    if (!u) return 'Inconnue';
    if (this.upgrades.includes(id)) return 'Déjà achetée';
    if (u.comingSoon) return 'Bientôt disponible';
    if (!this.tutorial.done) return 'Après le tutoriel';
    if (u.unlockLevel > this.level) return `Débloquée au niveau ${u.unlockLevel}`;
    if (this.money < u.cost) return "Pas assez d'argent";
    return null;
  }

  buyUpgrade(id) {
    if (this.upgradeBlocker(id)) return false;
    this.money -= ECONOMY.upgrades[id].cost;
    this.upgrades.push(id);
    bus.emit('upgrade_bought', { id });
    this._changed();
    return true;
  }

  // ------------------------------------------------------------- quêtes

  /** Quêtes visibles (niveau atteint) et pas encore réclamées. */
  activeQuests() {
    return QUESTS.filter((q) => this._questVisible(q) && !this.quests.claimed.includes(q.id));
  }

  /** Les 3 quêtes d'introduction (niveau 1) sont-elles toutes réclamées ? */
  get introQuestsClaimed() {
    return QUESTS.filter((q) => q.level === 1).every((q) => this.quests.claimed.includes(q.id));
  }

  /**
   * Visible = niveau atteint ; au-delà du niveau 1, seulement une fois les 3
   * quêtes d'introduction réclamées (le carnet n'est pas surchargé quand
   * Karim le présente).
   */
  _questVisible(q) {
    return q.level <= this.level && (q.level === 1 || this.introQuestsClaimed);
  }

  isQuestCompleted(id) {
    return this.quests.completed.includes(id);
  }

  /** Progression affichée d'une quête : { value, target } (plafonnée). */
  questProgress(quest) {
    const value = this.isQuestCompleted(quest.id) ? quest.target : Math.min(quest.target, questValue(this, quest));
    return { value, target: quest.target };
  }

  /** Nombre de quêtes complétées mais pas encore réclamées (badge du HUD). */
  get claimableQuestCount() {
    return this.activeQuests().filter((q) => this.isQuestCompleted(q.id)).length;
  }

  /** Quêtes des niveaux suivants (aperçu « à débloquer »). */
  get lockedQuestCount() {
    return QUESTS.filter((q) => !this._questVisible(q)).length;
  }

  claimQuest(id) {
    const quest = QUESTS.find((q) => q.id === id);
    if (!quest || !this.isQuestCompleted(id) || this.quests.claimed.includes(id)) return false;
    this.money += quest.reward.money;
    this.xp += quest.reward.xp;
    this.quests.claimed.push(id);
    bus.emit('quest_claimed', { id, reward: quest.reward });
    this._changed();
    return true;
  }

  /** Marque comme complétées les quêtes visibles dont l'objectif est atteint. */
  _checkQuests() {
    for (const quest of QUESTS) {
      if (!this._questVisible(quest) || this.isQuestCompleted(quest.id)) continue;
      if (questValue(this, quest) >= quest.target) {
        this.quests.completed.push(quest.id);
        bus.emit('quest_completed', { id: quest.id });
      }
    }
  }

  setQuestsIntroDone() {
    this.questsIntroDone = true;
    this._changed();
  }

  // ----------------------------------------------------------- contrats

  /**
   * Catalogue des bâtiments de la ville (buildingRegistry) et point de
   * référence (le QG) pour choisir les demandes les plus proches. Restaure
   * aussi les contrats signés d'une partie sauvegardée.
   */
  setCatalog(buildings) {
    this.catalog = new Map(buildings.map((b) => [b.id, b]));
    const qg = buildings.find((b) => b.key === 'building_qg');
    this._origin = qg ? { col: qg.col, row: qg.row } : { col: 20, row: 15 };
    for (const id of this.signedContracts) this._makeContract(id);
    for (const id of this.contractOffers) {
      const b = this.catalog.get(id);
      if (b) b.offer = true;
    }
  }

  /**
   * Génère les demandes de contrat des niveaux atteints qui n'en ont pas
   * encore eu. Renvoie les ids des nouvelles demandes.
   */
  refreshOffers() {
    const created = [];
    for (let lvl = this.offersUpToLevel + 1; lvl <= this.level; lvl++) {
      const n = ECONOMY.contracts.offersPerLevel[lvl] ?? 6;
      const d = (b) => Math.hypot(b.col - this._origin.col, b.row - this._origin.row);
      const candidates = [...this.catalog.values()]
        .filter((b) => b.client && !b.contract && !b.offer && b.client.unlockLevel <= lvl)
        .sort((a, b) => d(a) - d(b))
        .slice(0, n);
      for (const b of candidates) {
        b.offer = true;
        this.contractOffers.push(b.id);
        created.push(b.id);
      }
      this.offersUpToLevel = lvl;
    }
    if (created.length) {
      bus.emit('contract_offers', { ids: created });
      this._changed();
    } else this.save();
    return created;
  }

  isOffered(id) {
    return this.contractOffers.includes(id);
  }

  /** Signe la demande `id` : gratuit, +1 000 FCFA / +10 XP, devient client. */
  signContract(id) {
    if (!this.isOffered(id)) return false;
    const { money, xp } = ECONOMY.contracts.newContract;
    this.contractOffers = this.contractOffers.filter((o) => o !== id);
    this.signedContracts.push(id);
    this._makeContract(id);
    this.money += money;
    this.xp += xp;
    bus.emit('contract_signed', { id, reward: { money, xp } });
    this._changed();
    return true;
  }

  _makeContract(id) {
    const b = this.catalog.get(id);
    if (!b?.client) return;
    b.contract = true;
    b.offer = false;
    this.contracts.set(id, { id, name: b.name, col: b.col, row: b.row, client: b.client });
  }

  setContractsIntroDone() {
    this.contractsIntroDone = true;
    this._changed();
  }

  _addUnit(type) {
    const unit = { id: `u${this._nextUnitId++}`, type, uses: 0, repairUntil: 0 };
    this.units.push(unit);
    return unit;
  }

  setTutorialCheckpoint(label) {
    this.tutorial.checkpoint = label;
    this.save();
  }

  completeLevel() {
    this.tutorial.done = true;
    this.levelComplete = true;
    // Bonus de fin de niveau : l'XP est complétée jusqu'au niveau 2.
    this.levelBonusXp = Math.max(0, this._levelTwoXp - this.xp);
    this.xp += this.levelBonusXp;
    this._levelUpFromLevelEnd = true; // l'écran de fin annonce déjà le niveau 2
    this._changed();
  }

  // ----------------------------------------------------------- interne

  _changed() {
    this._checkQuests();
    const level = this.level;
    if (level > this._lastLevel) {
      this._lastLevel = level;
      this._checkQuests(); // les quêtes du nouveau niveau peuvent déjà être remplies
      bus.emit('level_up', { level, fromLevelEnd: Boolean(this._levelUpFromLevelEnd) });
    }
    this._levelUpFromLevelEnd = false;
    this.save();
    bus.emit('state_changed', this);
  }

  save() {
    writeSave({
      version: 3,
      playerName: this.playerName,
      money: this.money,
      xp: this.xp,
      units: this.units,
      nextUnitId: this._nextUnitId,
      buildings: this.buildings,
      tutorial: this.tutorial,
      levelComplete: this.levelComplete,
      upgrades: this.upgrades,
      stats: this.stats,
      quests: this.quests,
      questsIntroDone: this.questsIntroDone,
      signedContracts: this.signedContracts,
      contractOffers: this.contractOffers,
      offersUpToLevel: this.offersUpToLevel,
      contractsIntroDone: this.contractsIntroDone,
    });
  }
}
