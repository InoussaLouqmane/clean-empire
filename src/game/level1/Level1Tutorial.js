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
  if (list.length) {
    ctx.guide.point({ building: list[0] });
    ctx.showBuilding?.(list[0]); // la caméra le rejoint s'il n'est pas visible
  } else ctx.guide.clear();
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

const anyCollecting = (state) => ALL.some((id) => state.isCollecting(id));

/**
 * Guide vers les restos pas encore collectés jusqu'à `done()` (un seul
 * ouvrier). Le doigt et l'auréole disparaissent DÈS qu'une collecte est
 * lancée (corrections 3-4 du 2026-09-25 : ils restaient pendant les 15 s),
 * et reviennent si la collecte finie ne suffit pas.
 */
async function guideCollections(ctx, done) {
  const { state, dialogue } = ctx;
  while (!done() && !dialogue.cancelled) {
    const left = notYetCollected(state);
    target(ctx, left.length ? left : ALL);
    await dialogue.waitUntil(() => done() || anyCollecting(state));
    untarget(ctx);
    await dialogue.waitUntil(() => done() || !anyCollecting(state));
  }
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
      // Consignes 1-2 : la bulle reste affichée et se ferme d'elle-même dès
      // que le joueur a fait l'action (pas de clic en plus sur la boîte).
      target(ctx, R1);
      await dialogue.prompt(SCRIPT.consigne1, () => buildingMenu.openId === R1 || state.isCollecting(R1));

      // Consigne 2 : le menu du bâtiment reste ouvert au-dessus de la bulle.
      if (!state.isCollecting(R1)) {
        ctx.guide.clear();
        const stop = pointUi(ctx, buildingMenu.collectBtn);
        await dialogue.prompt(SCRIPT.consigne2, () => state.isCollecting(R1) || state.collectedCount(R1) > 0);
        stop();
      }
      untarget(ctx); // doigt + auréole disparaissent dès le clic sur Collecter
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
    await guideCollections(ctx, () => collectedDistinct(state) >= 2);
  },

  // Consigne 4 : découvrir la boutique.
  async consigne4(ctx) {
    const { dialogue, hud, shop } = ctx;
    prepareGame(ctx);
    const stop = pointUi(ctx, hud.shopBtn);
    await dialogue.prompt(SCRIPT.consigne4, () => shop.isOpen);
    stop();
  },

  // Consigne 5 (+ branche « pas encore assez ») puis feedback 2.
  // Correction 5 du 2026-09-25 : le joueur ESSAIE d'abord de recruter (le
  // bouton a l'air actif, l'échec est muet à l'écran) ; Karim ne dit « Pas
  // encore assez » qu'après cette tentative.
  async consigne5(ctx) {
    const { state, dialogue, shop, buildingMenu } = ctx;
    prepareGame(ctx);
    const hired = () => state.walkerCount >= 2;
    if (!hired()) {
      shop.open();
      shop.setTutorialRecruit(true);
      const tries = shop.recruitDenied;
      let stop = pointUi(ctx, shop.recruitButton);
      await dialogue.prompt(SCRIPT.consigne5, () => hired() || shop.recruitDenied > tries);
      stop();
      shop.setTutorialRecruit(false);

      if (!hired()) {
        await dialogue.say(SCRIPT.consigne5PasAssez);
        shop.close();
        await guideCollections(ctx, () => state.money >= state.nextWalkerCost || hired());
        if (!hired()) {
          // Karim relance la consigne 5 dès que l'argent suffit.
          buildingMenu.close();
          shop.open();
          stop = pointUi(ctx, shop.recruitButton);
          await dialogue.prompt(SCRIPT.consigne5Relance, hired);
          stop();
        }
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
