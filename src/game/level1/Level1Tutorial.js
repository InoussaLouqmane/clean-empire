import { LINES } from './script.js';

// Étapes du tutoriel, dans l'ordre. Chacune est un « point de reprise » :
// « Reprendre partie » relance l'étape où le joueur s'était arrêté (les
// conditions déjà remplies — collectes faites, ouvrier recruté… — passent
// instantanément).
const STAGES = ['intro', 'consigne1', 'consigne3', 'consigne4', 'consigne5', 'consigne6', 'cloture'];

/**
 * Enchaînement du niveau 1 (script clean-ceo-script-tutoriel.md), branché sur
 * la vraie logique de jeu. `ctx` fournit : state, dialogue (DialogueManager),
 * contracts (ContractBuildings), buildingMenu, shop, hud, pulse(el),
 * camera.{focusKarimHouse, revealCity}, onLevelComplete().
 */
export async function runLevel1(ctx) {
  const { state } = ctx;
  if (state.tutorial.done) return;

  const from = Math.max(0, STAGES.indexOf(state.tutorial.checkpoint));
  for (const stage of STAGES.slice(from)) {
    if (ctx.dialogue.cancelled) return;
    state.setTutorialCheckpoint(stage);
    await STEPS[stage](ctx);
  }
  ctx.dialogue.hide({ withKarim: false });
  state.completeLevel();
  ctx.onLevelComplete();
}

const [R1, R2, R3] = ['resto_1', 'resto_2', 'resto_3'];
const ALL = [R1, R2, R3];

const collectedDistinct = (state) => ALL.filter((id) => state.collectedCount(id) > 0).length;
const notYetCollected = (state) => ALL.filter((id) => state.collectedCount(id) === 0 && !state.isCollecting(id));

const STEPS = {
  // Séquence 1 — Retrouvailles : devant la maison de Karim, HUD masqué,
  // restaurants grisés.
  async intro({ state, dialogue, contracts, hud, camera }) {
    hud.setVisible(false);
    contracts.setGreyed(true);
    camera.focusKarimHouse();
    await dialogue.say(LINES.intro);
    dialogue.hide();
    contracts.setGreyed(false);
    hud.setVisible(true);
    contracts.setHighlight(ALL, { pulse: false });
    await camera.revealCity();
    contracts.setHighlight([]);
    state.save();
  },

  // Consigne 1 → 2 → feedback 1 : première collecte, guidée pas à pas.
  async consigne1({ state, dialogue, contracts, buildingMenu, hud, pulse }) {
    prepareGame({ contracts, hud });
    if (state.collectedCount(R1) > 0) return;

    if (!state.isCollecting(R1)) {
      contracts.setHighlight(R1);
      await dialogue.say(LINES.consigne1);
      await dialogue.waitUntil(() => buildingMenu.openId === R1 || state.isCollecting(R1));

      // Consigne 2 : le menu du bâtiment reste ouvert derrière la bulle.
      if (!state.isCollecting(R1)) {
        await dialogue.say(LINES.consigne2);
        const stop = pulse(buildingMenu.collectBtn);
        await dialogue.waitUntil(() => state.isCollecting(R1) || state.collectedCount(R1) > 0);
        stop();
      }
      contracts.setHighlight([]);
    }

    // Feedback 1 : l'attente.
    if (state.isCollecting(R1)) await dialogue.say(LINES.feedback1);
    await dialogue.waitUntil(() => state.collectedCount(R1) > 0);
  },

  // Consigne 3 : deuxième restaurant, sans aide pas à pas.
  async consigne3({ state, dialogue, contracts, hud }) {
    prepareGame({ contracts, hud });
    if (collectedDistinct(state) >= 2) return;
    contracts.setHighlight(state.collectedCount(R2) > 0 ? notYetCollected(state) : R2);
    await dialogue.say(LINES.consigne3);
    await dialogue.waitUntil(() => collectedDistinct(state) >= 2);
    contracts.setHighlight([]);
  },

  // Consigne 4 : découvrir la boutique.
  async consigne4({ dialogue, contracts, hud, shop, pulse }) {
    prepareGame({ contracts, hud });
    await dialogue.say(LINES.consigne4);
    const stop = pulse(hud.shopBtn);
    await dialogue.waitUntil(() => shop.isOpen);
    stop();
  },

  // Consigne 5 (+ branche « pas encore assez ») puis feedback 2.
  async consigne5({ state, dialogue, contracts, hud, shop, buildingMenu, pulse }) {
    prepareGame({ contracts, hud });
    if (state.workersTotal < 2) {
      shop.open();
      await dialogue.say(LINES.consigne5);

      if (state.money < state.nextWorkerCost) {
        await dialogue.say(LINES.consigne5PasAssez);
        shop.close();
        contracts.setHighlight(notYetCollected(state).length ? notYetCollected(state) : ALL);
        await dialogue.waitUntil(() => state.money >= state.nextWorkerCost || state.workersTotal >= 2);
        contracts.setHighlight([]);
        if (state.workersTotal < 2) {
          // Karim relance la consigne 5 dès que l'argent suffit.
          buildingMenu.close();
          shop.open();
          await dialogue.say(LINES.consigne5);
        }
      }

      if (state.workersTotal < 2) {
        if (!shop.isOpen) shop.open();
        const stop = pulse(shop.recruitButton);
        await dialogue.waitUntil(() => state.workersTotal >= 2);
        stop();
      }
    }
    shop.close();
    await dialogue.say(LINES.feedback2);
  },

  // Consigne 6 : découvrir les engins (sans achat forcé).
  async consigne6({ dialogue, contracts, hud }) {
    prepareGame({ contracts, hud });
    await dialogue.say(LINES.consigne6);
  },

  // Clôture : 3 établissements collectés + un investissement.
  async cloture({ state, dialogue, contracts, hud }) {
    prepareGame({ contracts, hud });
    const ready = () => collectedDistinct(state) === ALL.length && state.hasInvested;
    if (!ready()) {
      contracts.setHighlight(notYetCollected(state));
      await dialogue.waitUntil(ready);
      contracts.setHighlight([]);
    }
    await dialogue.say(LINES.cloture);
  },
};

/** À la reprise d'une partie en cours de route : HUD visible, restaurants actifs. */
function prepareGame({ contracts, hud }) {
  contracts.setGreyed(false);
  hud.setVisible(true);
}
