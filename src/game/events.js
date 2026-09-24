// Bus d'événements global du jeu : découple la logique (collectes, boutique…)
// du tutoriel et de l'UI. Le jeu émet, le dialogue et le HUD écoutent.
//
// Événements émis :
//   state_changed        (state)            — argent, XP, ouvriers… ont changé
//   building_clicked     ({ id })           — clic sur un bâtiment sous contrat
//   building_menu_closed ({ id })
//   collection_started   ({ id, durationS })
//   collection_finished  ({ id, reward })
//   shop_opened / shop_closed
//   worker_hired         ({ total, cost })
//   vehicle_bought       ({ id, cost })

class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  on(event, fn) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(fn);
    return () => this.off(event, fn);
  }

  once(event, fn) {
    const off = this.on(event, (payload) => {
      off();
      fn(payload);
    });
    return off;
  }

  off(event, fn) {
    this.handlers.get(event)?.delete(fn);
  }

  emit(event, payload) {
    for (const fn of [...(this.handlers.get(event) ?? [])]) fn(payload);
    // '*' : reçoit tous les événements (le tutoriel s'en sert pour revérifier
    // ses conditions d'attente à chaque changement)
    for (const fn of [...(this.handlers.get('*') ?? [])]) fn(event, payload);
  }

  clear() {
    this.handlers.clear();
  }
}

export const bus = new EventBus();
