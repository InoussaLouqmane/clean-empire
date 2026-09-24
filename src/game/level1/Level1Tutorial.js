import { SCRIPT } from './script.js';

// Étapes du tutoriel, dans l'ordre. Chacune est un « point de reprise » :
// « Reprendre partie » relance l'étape où le joueur s'était arrêté (les
// conditions déjà remplies — collectes faites, ouvrier recruté… — passent
// instantanément).
const STAGES = ['intro', 'consigne1', 'consigne3', 'consigne4', 'consigne5', 'consigne6', 'cloture'];

/**
 * Enchaînement du niveau 1 (script clean-ceo-script-tutoriel.md + refonte
 * UI/UX), branché sur la vraie logique de jeu. `ctx` fournit : state,
 * dialogue (DialogueManager), buildings (CityBuildings), buildingMenu, shop,
 * hud, guide (doigt + spotlight), pulse(el), revealCity(), onLevelComplete().
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
  ctx.guide.clear();
  ctx.dialogue.hide({ withKarim: false });
  state.completeLevel();
  ctx.onLevelComplete();
}

const [R1, R2, R3] = ['resto_1', 'resto_2', 'resto_3'];
const ALL = [R1, R2, R3];

const collectedDistinct = (state) => ALL.filter((id) => state.collectedCount(id) > 0).length;
const notYetCollected = (state) => ALL.filter((id) => state.collectedCount(id) === 0 && !state.isCollecting(id));

/** Surligne + pointe du doigt un bâtiment (ou le premier d'une liste). */
function target(ctx, ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  ctx.buildings.setHighlight(list);
  if (list.length) ctx.guide.point({ building: list[0] });
  else ctx.guide.clear();
}

/** Pointe un élément d'UI (doigt + pulsation) ; renvoie l'arrêt. */
function pointUi(ctx, el) {
  ctx.guide.point({ el });
  const stop = ctx.pulse(el);
  return () => {
    stop();
    ctx.guide.clear();
  };
}

function untarget(ctx) {
  ctx.buildings.setHighlight([]);
  ctx.guide.clear();
}

const STEPS = {
  // Séquence 1 — Retrouvailles : zoom sur la maison de Karim, HUD masqué,
  // restaurants grisés ; puis la caméra recule sur la ville.
  async intro(ctx) {
    const { dialogue, buildings, hud } = ctx;
    hud.setVisible(false);
    buildings.setGreyed(true);
    await dialogue.say(SCRIPT.intro, { restoreCamera: false });
    dialogue.hide();
    buildings.setGreyed(false);
    hud.setVisible(true);
    buildings.setHighlight(ALL, { pulse: false });
    await ctx.revealCity();
    buildings.setHighlight([]);
  },

  // Consigne 1 → 2 → feedback 1 : première collecte, guidée pas à pas.
  async consigne1(ctx) {
    const { state, dialogue, buildingMenu } = ctx;
    prepareGame(ctx);
    if (state.collectedCount(R1) > 0) return;

    if (!state.isCollecting(R1)) {
      ctx.buildings.setHighlight(R1);
      await dialogue.say(SCRIPT.consigne1);
      target(ctx, R1);
      await dialogue.waitUntil(() => buildingMenu.openId === R1 || state.isCollecting(R1));

      // Consigne 2 : le menu du bâtiment reste ouvert derrière la bulle.
      if (!state.isCollecting(R1)) {
        ctx.guide.clear();
        await dialogue.say(SCRIPT.consigne2);
        const stop = pointUi(ctx, buildingMenu.collectBtn);
        await dialogue.waitUntil(() => state.isCollecting(R1) || state.collectedCount(R1) > 0);
        stop();
      }
      untarget(ctx);
    }

    // Feedback 1 : l'attente (une unité occupée ne peut pas être ailleurs).
    if (state.isCollecting(R1)) await dialogue.say(SCRIPT.feedback1);
    await dialogue.waitUntil(() => state.collectedCount(R1) > 0);
  },

  // Consigne 3 : deuxième restaurant, sans aide pas à pas.
  async consigne3(ctx) {
    const { state, dialogue } = ctx;
    prepareGame(ctx);
    if (collectedDistinct(state) >= 2) return;
    await dialogue.say(SCRIPT.consigne3);
    target(ctx, state.collectedCount(R2) > 0 ? notYetCollected(state) : R2);
    await dialogue.waitUntil(() => collectedDistinct(state) >= 2);
    untarget(ctx);
  },

  // Consigne 4 : découvrir la boutique.
  async consigne4(ctx) {
    const { dialogue, hud, shop } = ctx;
    prepareGame(ctx);
    await dialogue.say(SCRIPT.consigne4);
    const stop = pointUi(ctx, hud.shopBtn);
    await dialogue.waitUntil(() => shop.isOpen);
    stop();
  },

  // Consigne 5 (+ branche « pas encore assez ») puis feedback 2.
  async consigne5(ctx) {
    const { state, dialogue, shop, buildingMenu } = ctx;
    prepareGame(ctx);
    if (state.walkerCount < 2) {
      shop.open();
      await dialogue.say(SCRIPT.consigne5);

      if (state.money < state.nextWalkerCost) {
        await dialogue.say(SCRIPT.consigne5PasAssez);
        shop.close();
        target(ctx, notYetCollected(state).length ? notYetCollected(state) : ALL);
        await dialogue.waitUntil(() => state.money >= state.nextWalkerCost || state.walkerCount >= 2);
        untarget(ctx);
        if (state.walkerCount < 2) {
          // Karim relance la consigne 5 dès que l'argent suffit.
          buildingMenu.close();
          shop.open();
          await dialogue.say(SCRIPT.consigne5Relance);
        }
      }

      if (state.walkerCount < 2) {
        if (!shop.isOpen) shop.open();
        const stop = pointUi(ctx, shop.recruitButton);
        await dialogue.waitUntil(() => state.walkerCount >= 2);
        stop();
      }
    }
    shop.close();
    await dialogue.say(SCRIPT.feedback2);
  },

  // Consigne 6 : découvrir les engins (sans achat forcé).
  async consigne6(ctx) {
    prepareGame(ctx);
    await ctx.dialogue.say(SCRIPT.consigne6);
  },

  // Clôture : 3 établissements collectés + un investissement.
  async cloture(ctx) {
    const { state, dialogue } = ctx;
    prepareGame(ctx);
    const ready = () => collectedDistinct(state) === ALL.length && state.hasInvested;
    if (!ready()) {
      target(ctx, notYetCollected(state));
      await dialogue.waitUntil(() => {
        // le doigt suit le prochain resto à collecter
        const left = notYetCollected(state);
        if (left.length && ctx.guide.target?.building !== left[0]) target(ctx, left);
        return ready();
      });
      untarget(ctx);
    }
    await dialogue.say(SCRIPT.cloture, { restoreCamera: false });
  },
};

/** À la reprise d'une partie en cours de route : HUD visible, ville active. */
function prepareGame({ buildings, hud }) {
  buildings.setGreyed(false);
  hud.setVisible(true);
}
