import { ECONOMY, nextWorkerCost, collectionDuration } from './economy.js';
import { bus } from './events.js';
import { writeSave } from './save.js';

/**
 * État d'une partie : argent, XP, ouvriers, engins, bâtiments sous contrat,
 * progression du tutoriel. Seule source de vérité — l'UI lit ici et réagit à
 * `state_changed` ; toute modification passe par les méthodes ci-dessous
 * (qui émettent les événements du bus et sauvegardent).
 *
 * Temps : horloge murale (Date.now()), pour que les timers restent justes
 * même si l'onglet passe en arrière-plan.
 */
export class GameState {
  constructor(data = {}) {
    this.playerName = data.playerName ?? '';
    this.money = data.money ?? ECONOMY.start.money;
    this.xp = data.xp ?? ECONOMY.start.xp;
    this.workersTotal = data.workersTotal ?? ECONOMY.start.workers;
    this.vehicles = { tricycle: false, camion: false, ...data.vehicles };
    // id -> { collected: nombre de collectes terminées, cooldownUntil }
    this.buildings = data.buildings ?? {};
    // id -> { endsAt, durationS } — collectes en cours (non sauvegardées :
    // une collecte interrompue par une fermeture de page est simplement perdue)
    this.collecting = {};
    this.tutorial = { checkpoint: null, done: false, ...data.tutorial };
    this.levelComplete = data.levelComplete ?? false;
  }

  // ------------------------------------------------------------- lecture

  get workersBusy() {
    return Object.keys(this.collecting).length;
  }

  get workersFree() {
    return this.workersTotal - this.workersBusy;
  }

  get level() {
    return 1;
  }

  get xpForNextLevel() {
    return ECONOMY.progression.xpPerLevel * this.level;
  }

  get nextWorkerCost() {
    return nextWorkerCost(this.workersTotal);
  }

  get collectionDurationS() {
    return collectionDuration(this.vehicles);
  }

  get hasInvested() {
    return this.workersTotal > ECONOMY.start.workers || Object.values(this.vehicles).some(Boolean);
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

  /** Progression 0..1 d'une collecte en cours. */
  collectionProgress(id, now = Date.now()) {
    const c = this.collecting[id];
    if (!c) return 0;
    const total = c.durationS * 1000;
    return Math.min(1, Math.max(0, 1 - (c.endsAt - now) / total));
  }

  /** Raison pour laquelle `id` ne peut pas être collecté, ou null. */
  collectBlocker(id, now = Date.now()) {
    if (this.isCollecting(id)) return 'Collecte en cours';
    const cd = this.cooldownLeftS(id, now);
    if (cd > 0) return `Disponible dans ${cd} s`;
    if (this.workersFree <= 0) return 'Aucun ouvrier libre';
    return null;
  }

  // ---------------------------------------------------------- écriture

  setPlayerName(name) {
    this.playerName = name;
    this._changed();
  }

  startCollection(id, now = Date.now()) {
    if (this.collectBlocker(id, now)) return false;
    const durationS = this.collectionDurationS;
    this.collecting[id] = { endsAt: now + durationS * 1000, durationS };
    bus.emit('collection_started', { id, durationS });
    this._changed();
    return true;
  }

  /** À appeler à chaque frame : termine les collectes arrivées à échéance. */
  tick(now = Date.now()) {
    for (const [id, c] of Object.entries(this.collecting)) {
      if (now < c.endsAt) continue;
      delete this.collecting[id];
      const reward = { ...ECONOMY.collection.reward };
      this.money += reward.money;
      this.xp += reward.xp;
      const b = (this.buildings[id] ??= { collected: 0, cooldownUntil: 0 });
      b.collected += 1;
      b.cooldownUntil = now + ECONOMY.collection.cooldownS * 1000;
      bus.emit('collection_finished', { id, reward });
      this._changed();
    }
  }

  hireWorker() {
    const cost = this.nextWorkerCost;
    if (this.money < cost) return false;
    this.money -= cost;
    this.workersTotal += 1;
    bus.emit('worker_hired', { total: this.workersTotal, cost });
    this._changed();
    return true;
  }

  vehicleBlocker(id) {
    const v = ECONOMY.vehicles[id];
    if (!v) return 'Inconnu';
    if (this.vehicles[id]) return 'Déjà acheté';
    if (v.unlockLevel > this.level) return `Débloqué au niveau ${v.unlockLevel}`;
    if (this.money < v.cost) return "Pas assez d'argent";
    return null;
  }

  buyVehicle(id) {
    if (this.vehicleBlocker(id)) return false;
    const { cost } = ECONOMY.vehicles[id];
    this.money -= cost;
    this.vehicles[id] = true;
    bus.emit('vehicle_bought', { id, cost });
    this._changed();
    return true;
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
      version: 1,
      playerName: this.playerName,
      money: this.money,
      xp: this.xp,
      workersTotal: this.workersTotal,
      vehicles: this.vehicles,
      buildings: this.buildings,
      tutorial: this.tutorial,
      levelComplete: this.levelComplete,
    });
  }
}
