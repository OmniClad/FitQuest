/**
 * Sprite feuille + atlas JSON (grille type Mugen). Jusqu’à 64 frames par ligne (plafond sécurité).
 * Fallback : animation CSS sur la boîte si pas d’asset.
 */

const atlasCache = new Map();

/** Échelle d’affichage pour que la frame tienne dans le portrait (mesure le host). */
function readSpriteInsetPx(host) {
  const raw = getComputedStyle(host).getPropertyValue('--boss-sprite-inset').trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 4;
}

function computeDisplayScale(host, frameW, frameH) {
  const w = host.clientWidth;
  const h = host.clientHeight;
  if (!w || !h || !frameW || !frameH) return 1;
  const inset = readSpriteInsetPx(host);
  const fitW = Math.max(8, w - inset * 2);
  const fitH = Math.max(8, h - inset * 2);
  return Math.min(fitW / frameW, fitH / frameH, 1);
}

function rowCountFromAtlas(atlas) {
  const anims = atlas.animations || {};
  const maxRow = Math.max(0, ...Object.values(anims).map((a) => a?.row ?? 0));
  return maxRow + 1;
}

/** Dimensions d’une cellule : `frameWidth` / `frameHeight` ou dérivées de `sheetWidth` × `sheetHeight`. */
function resolveAtlasCellSize(atlas) {
  const cols = atlas.cols || 4;
  const sheetRows = rowCountFromAtlas(atlas);
  const sw = atlas.sheetWidth;
  const sh = atlas.sheetHeight;
  if (Number.isFinite(sw) && Number.isFinite(sh) && sw > 0 && sh > 0) {
    return { cols, sheetRows, frameWidth: sw / cols, frameHeight: sh / sheetRows };
  }
  const fw = atlas.frameWidth;
  const fh = atlas.frameHeight;
  if (Number.isFinite(fw) && Number.isFinite(fh) && fw > 0 && fh > 0) {
    return { cols, sheetRows, frameWidth: fw, frameHeight: fh };
  }
  return null;
}

export async function loadAtlas(basePath) {
  if (atlasCache.has(basePath)) return atlasCache.get(basePath);
  try {
    const res = await fetch(`${basePath}/atlas.json`);
    if (!res.ok) throw new Error('atlas');
    const json = await res.json();
    atlasCache.set(basePath, json);
    return json;
  } catch {
    atlasCache.set(basePath, null);
    return null;
  }
}

/**
 * @param {HTMLElement} host — ex. .combat-boss-portrait-mid
 * @param {string} spriteKey — dossier sous /sprites/
 * @param {string} initialAnim
 */
export async function mountBossSprite(host, spriteKey = 'default', initialAnim = 'idle') {
  if (!host) return { play: () => {}, destroy: () => {}, listAnimations: () => [] };
  const prefix = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
  const base = `${prefix}sprites/${spriteKey}`.replace(/([^:])\/{2,}/g, '$1/');
  const atlas = await loadAtlas(base);
  host.querySelectorAll('.sprite-atlas-layer').forEach((n) => n.remove());

  const layer = document.createElement('div');
  layer.className = 'sprite-atlas-layer';
  const grid = atlas && resolveAtlasCellSize(atlas);
  if (!grid) {
    layer.classList.add('sprite-fallback-bob');
    host.prepend(layer);
    return makeFallbackController(layer, host);
  }

  host.querySelectorAll('.boss-fallback-img').forEach((img) => {
    img.style.opacity = '0';
    img.style.pointerEvents = 'none';
  });

  const sheetUrl = `${base}/${atlas.sheet || 'sheet.webp'}`;
  const spriteLayer = document.createElement('div');
  spriteLayer.className = 'sprite-atlas-layer';
  spriteLayer.style.backgroundImage = `url(${sheetUrl})`;
  spriteLayer.style.backgroundRepeat = 'no-repeat';
  spriteLayer.style.transition = 'none';
  host.prepend(spriteLayer);

  /** Pas entiers (px écran) : évite la dérive si on arrondit col×largeur d’un coup. */
  let stepX = 1;
  let stepY = 1;
  const { cols, sheetRows, frameWidth, frameHeight } = grid;
  let current = initialAnim;
  let frame = 0;
  let last = performance.now();

  function setLayerFrame(frameIndex, animName) {
    const spec = atlas.animations[animName];
    if (!spec) return;
    const row = spec.row ?? 0;
    const col = frameIndex % cols;
    const x = -col * stepX;
    const y = -row * stepY;
    spriteLayer.style.backgroundPosition = `${x}px ${y}px`;
  }

  function syncDisplayScale() {
    const scale = computeDisplayScale(host, frameWidth, frameHeight);
    stepX = Math.max(1, Math.round(frameWidth * scale));
    stepY = Math.max(1, Math.round(frameHeight * scale));
    spriteLayer.style.transition = 'none';
    spriteLayer.style.width = `${stepX}px`;
    spriteLayer.style.height = `${stepY}px`;
    spriteLayer.style.backgroundSize = `${cols * stepX}px ${sheetRows * stepY}px`;
    setLayerFrame(frame, current);
  }

  syncDisplayScale();
  requestAnimationFrame(syncDisplayScale);
  let resizeObs = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObs = new ResizeObserver(() => syncDisplayScale());
    resizeObs.observe(host);
  }

  let playing = true;
  let rafId = 0;
  let chainReturnTimer = null;

  function clearChainReturnTimer() {
    if (chainReturnTimer != null) {
      clearTimeout(chainReturnTimer);
      chainReturnTimer = null;
    }
  }

  function draw() {
    const spec = atlas.animations[current];
    if (!spec) return;
    const maxF = Math.min(Math.max(1, spec.frames || 1), 64);
    const fps = spec.fps || 8;
    const now = performance.now();
    if (now - last >= 1000 / fps) {
      last = now;
      let newF = frame + 1;
      if (newF >= maxF) {
        const nextLoop = spec.chainAfterLoop;
        if (spec.loop && typeof nextLoop === 'string' && atlas.animations[nextLoop]) {
          clearChainReturnTimer();
          current = nextLoop;
          frame = 0;
          setLayerFrame(0, current);
          return;
        }
        newF = spec.loop ? 0 : maxF - 1;
      }
      if (newF !== frame) {
        setLayerFrame(newF, current);
        frame = newF;
        const s2 = atlas.animations[current];
        const maxS2 = Math.min(Math.max(1, s2?.frames || 1), 64);
        const ret =
          s2 && !s2.loop && typeof s2.chainReturn === 'string' ? s2.chainReturn : null;
        if (ret && atlas.animations[ret] && frame === maxS2 - 1) {
          clearChainReturnTimer();
          const frameDur = 1000 / Math.max(1, s2.fps || 8);
          chainReturnTimer = window.setTimeout(() => {
            chainReturnTimer = null;
            if (!playing || !atlas.animations[ret]) return;
            current = ret;
            frame = 0;
            setLayerFrame(0, current);
            last = performance.now();
          }, frameDur);
        }
        return;
      }
    }
  }

  function loop() {
    if (!playing) return;
    draw();
    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);

  return {
    listAnimations() {
      return Object.keys(atlas.animations || {});
    },
    /** @returns {boolean} false si l’anim n’existe pas dans l’atlas */
    play(name) {
      if (!atlas.animations[name]) return false;
      clearChainReturnTimer();
      current = name;
      frame = 0;
      last = performance.now();
      spriteLayer.style.transition = 'none';
      setLayerFrame(0, current);
      return true;
    },
    destroy() {
      playing = false;
      clearChainReturnTimer();
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeObs) resizeObs.disconnect();
      spriteLayer.remove();
    },
  };
}

function makeFallbackController(layer, host) {
  return {
    listAnimations() {
      return [];
    },
    play(name) {
      layer.classList.remove('sprite-anim-hit', 'sprite-anim-attack');
      if (name === 'hit') {
        layer.classList.add('sprite-anim-hit');
        setTimeout(() => layer.classList.remove('sprite-anim-hit'), 350);
        return true;
      }
      if (name === 'attack') {
        layer.classList.add('sprite-anim-attack');
        setTimeout(() => layer.classList.remove('sprite-anim-attack'), 650);
        return true;
      }
      return name === 'idle' || name === 'fury' || name === 'fury_after';
    },
    destroy() {
      layer.remove();
    },
  };
}

/** ID sprite depuis boss (catalogue peut ajouter spriteId). */
export function getBossSpriteKey(boss) {
  if (!boss) return 'default';
  return boss.spriteId || boss.id || 'default';
}
