import { ECONOMY, VEHICLE_TYPES, nextWalkerCost, collectionDuration, netReward } from './economy.js';
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
    // Une réparation en cours au moment de la sauvegarde continue à la reprise
    // (horloge murale) : tick() la termine à l'heure prévue.
  }

  // ------------------------------------------------------------- lecture

  get level() {
    return 1;
  }

  get xpForNextLevel() {
    return ECONOMY.progression.xpPerLevel * this.level;
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
    const max = ECONOMY.units[unit.type].maxUses;
    if (max && unit.uses >= max) return 'broken';
    return 'available';
  }

  availableUnits(now = Date.now()) {
    return this.units.filter((u) => this.unitStatus(u, now) === 'available');
  }

  /** État d'un engin, 0..1 (1 = neuf). Toujours 1 pour un ouvrier à pied. */
  unitCondition(unit) {
    const max = ECONOMY.units[unit.type].maxUses;
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
    return collectionDuration(this.client(id), unitType);
  }

  netRewardFor(id, unitType) {
    return netReward(this.client(id), unitType);
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
      const client = this.client(id);
      const fuel = ECONOMY.units[unit?.type]?.fuel ?? 0;
      const reward = { money: client.money - fuel, xp: client.xp, fuel };
      this.money += reward.money;
      this.xp += reward.xp;
      if (unit && ECONOMY.units[unit.type].maxUses) {
        unit.uses += 1;
        if (unit.uses >= ECONOMY.units[unit.type].maxUses) bus.emit('unit_broken', { unitId: unit.id });
      }
      const b = (this.buildings[id] ??= { collected: 0, cooldownUntil: 0 });
      b.collected += 1;
      b.cooldownS = ECONOMY.collection.cooldownS;
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
    unit.repairUntil = now + spec.repairS * 1000;
    bus.emit('unit_repair_started', { unitId });
    this._changed();
    return true;
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
    this._changed();
  }

  // ----------------------------------------------------------- interne

  _changed() {
    this.save();
    bus.emit('state_changed', this);
  }

  save() {
    writeSave({
      version: 2,
      playerName: this.playerName,
      money: this.money,
      xp: this.xp,
      units: this.units,
      nextUnitId: this._nextUnitId,
      buildings: this.buildings,
      tutorial: this.tutorial,
      levelComplete: this.levelComplete,
    });
  }
}
