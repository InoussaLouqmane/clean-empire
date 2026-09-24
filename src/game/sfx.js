// Effets sonores du jeu, synthétisés en Web Audio (placeholders : l'utilisateur
// remplacera par de vrais sons plus tard). Respecte le réglage « son coupé »
// du menu (même clé localStorage que menu/SoundManager.js).

const MUTE_KEY = 'clean-ceo-muted';
const VOLUME_KEY = 'clean-ceo-volume';

let ctx = null;

function settings() {
  try {
    return {
      muted: localStorage.getItem(MUTE_KEY) === 'true',
      volume: Number(localStorage.getItem(VOLUME_KEY) ?? '0.6') || 0.6,
    };
  } catch {
    return { muted: false, volume: 0.6 };
  }
}

function audio() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Suite de notes carrées courtes : [[fréquence Hz, durée ms], …]. */
function notes(seq, gain = 0.06, type = 'square') {
  const { muted, volume } = settings();
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  let t = ac.currentTime;
  for (const [hz, ms] of seq) {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(hz, t);
    amp.gain.setValueAtTime(gain * volume, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(amp).connect(ac.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.02);
    t += ms / 1000;
  }
}

export const sfx = {
  click: () => notes([[520, 60]], 0.05),
  open: () => notes([[440, 50], [660, 60]], 0.04),
  close: () => notes([[520, 50], [360, 60]], 0.04),
  denied: () => notes([[180, 140]], 0.07),
  collectStart: () => notes([[330, 70], [440, 90]], 0.05),
  coin: () => notes([[988, 70], [1319, 140]], 0.05),
  hire: () => notes([[523, 90], [659, 90], [784, 160]], 0.05),
  buy: () => notes([[392, 80], [523, 80], [784, 180]], 0.05),
  dialogue: () => notes([[700, 25]], 0.015),
  levelUp: () => notes([[523, 110], [659, 110], [784, 110], [1047, 260]], 0.06),
};
