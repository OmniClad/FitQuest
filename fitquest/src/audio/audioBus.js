import { gameEvents } from './gameEvents.js';

const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
function assetUrl(path) {
  const p = path.replace(/^\//, '');
  return `${BASE}${p}`.replace(/([^:])\/{2,}/g, '$1/');
}

let unlocked = false;
let ctx = null;
let appAudioSuspended = false;

const DEFAULT_SFX_GAIN = 0.35;
const DEFAULT_BGM_GAIN = 0.22;
const masterGainRef = { value: 1 };
const sfxGainRef = { value: DEFAULT_SFX_GAIN };
const bgmGainRef = { value: DEFAULT_BGM_GAIN };

const audioCache = new Map();
const bgmEl = typeof Audio !== 'undefined' ? new Audio() : null;
if (bgmEl) {
  bgmEl.loop = true;
  bgmEl.preload = 'auto';
}

const SCENE_BGM = {
  dashboard: 'audio/bgm_ambient_loop.mp3',
  inventory: 'audio/bgm_ambient_loop.mp3',
  admin: 'audio/bgm_ambient_loop.mp3',
  'pre-session': 'audio/bgm_tension_loop.mp3',
  session: 'audio/bgm_combat_loop.mp3',
  quests: 'audio/bgm_ambient_loop.mp3',
};

function ensureCtx() {
  if (!ctx && typeof AudioContext !== 'undefined') {
    ctx = new AudioContext();
  }
  return ctx;
}

function beep(freq, durMs, type = 'sine', vol = 0.08) {
  const c = ensureCtx();
  if (!c || c.state !== 'running') return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + durMs / 1000);
}

export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function playFileOrBeep(url, volume, beepFn) {
  if (appAudioSuspended) return;
  unlockAudio();
  if (!url || typeof Audio === 'undefined') {
    beepFn();
    return;
  }
  const full = assetUrl(url);
  let a = audioCache.get(full);
  if (!a) {
    a = new Audio(full);
    a.preload = 'auto';
    audioCache.set(full, a);
  }
  const fail = () => beepFn();
  a.addEventListener('error', fail, { once: true });
  a.volume = Math.min(1, volume * sfxGainRef.value);
  a.currentTime = 0;
  a.play().catch(fail);
}

export function createAudioBus() {
  const unsubscribers = [];
  let currentSceneKey = null;

  unsubscribers.push(
    gameEvents.on('ui_click', () => {
      playFileOrBeep('audio/sfx_ui_click.mp3', 0.9, () => beep(880, 45, 'triangle', 0.06));
    }),
  );

  unsubscribers.push(
    gameEvents.on('combat_hit', ({ crit } = {}) => {
      playFileOrBeep(crit ? 'audio/sfx_hit_crit.mp3' : 'audio/sfx_hit.mp3', crit ? 1 : 0.85, () =>
        beep(crit ? 1200 : 520, crit ? 70 : 55, 'square', crit ? 0.1 : 0.07),
      );
    }),
  );

  unsubscribers.push(
    gameEvents.on('boss_attack', () => {
      playFileOrBeep('audio/sfx_boss_slash.mp3', 0.9, () => beep(120, 120, 'sawtooth', 0.09));
    }),
  );

  unsubscribers.push(
    gameEvents.on('spell_cast', () => {
      playFileOrBeep('audio/sfx_spell.mp3', 0.95, () => beep(660, 80, 'sine', 0.07));
    }),
  );

  unsubscribers.push(
    gameEvents.on('potion', () => {
      playFileOrBeep('audio/sfx_potion.mp3', 0.9, () => beep(440, 100, 'sine', 0.06));
    }),
  );

  unsubscribers.push(
    gameEvents.on('victory', () => {
      playFileOrBeep('audio/sfx_victory.mp3', 1, () => beep(784, 120, 'triangle', 0.08));
    }),
  );

  unsubscribers.push(
    gameEvents.on('defeat', () => {
      playFileOrBeep('audio/sfx_defeat.mp3', 1, () => beep(110, 200, 'sawtooth', 0.07));
    }),
  );

  function playSceneBgm(sceneKey) {
    currentSceneKey = sceneKey;
    if (appAudioSuspended) return;
    unlockAudio();
    const path = SCENE_BGM[sceneKey];
    if (!bgmEl || !path) return;
    const full = assetUrl(path);
    if (bgmEl.dataset.src === full && !bgmEl.paused) return;
    bgmEl.dataset.src = full;
    bgmEl.src = full;
    bgmEl.volume = bgmGainRef.value;
    bgmEl.play().catch(() => {});
  }

  function pauseAll() {
    appAudioSuspended = true;
    if (bgmEl) bgmEl.pause();
    audioCache.forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
    if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
  }

  function resumeAppAudio() {
    appAudioSuspended = false;
    if (!unlocked) return;
    const c = ensureCtx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    if (currentSceneKey) playSceneBgm(currentSceneKey);
  }

  function dispose() {
    unsubscribers.forEach((u) => u());
    pauseAll();
  }

  return {
    unlockAudio,
    playSceneBgm,
    pauseAll,
    resumeAppAudio,
    setSfxVolume(v) {
      sfxGainRef.value = v;
    },
    setBgmVolume(v) {
      bgmGainRef.value = v;
      if (bgmEl) bgmEl.volume = v;
    },
    setMasterVolume(v) {
      const next = Number(v);
      const master = Math.min(1, Math.max(0, Number.isFinite(next) ? next : 1));
      masterGainRef.value = master;
      sfxGainRef.value = DEFAULT_SFX_GAIN * master;
      bgmGainRef.value = DEFAULT_BGM_GAIN * master;
      if (bgmEl) bgmEl.volume = bgmGainRef.value;
    },
    getMasterVolume() {
      return masterGainRef.value;
    },
    dispose,
  };
}
