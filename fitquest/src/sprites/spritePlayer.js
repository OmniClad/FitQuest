/**
 * Sprite feuille + atlas JSON (grille type Mugen). Max 12 frames recommandé.
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
  if (!host) return { play: () => {}, destroy: () => {} };
  const prefix = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
  const base = `${prefix}sprites/${spriteKey}`.replace(/([^:])\/{2,}/g, '$1/');
  const atlas = await loadAtlas(base);
  host.querySelectorAll('.sprite-atlas-layer').forEach((n) => n.remove());

  const layer = document.createElement('div');
  layer.className = 'sprite-atlas-layer';
  if (!atlas || !atlas.frameWidth) {
    layer.classList.add('sprite-fallback-bob');
    host.prepend(layer);
    return makeFallbackController(layer, host);
  }

  host.querySelectorAll('.boss-fallback-img').forEach((img) => {
    img.style.opacity = '0';
    img.style.pointerEvents = 'none';
  });

  const sheetUrl = `${base}/${atlas.sheet || 'sheet.webp'}`;
  layer.style.backgroundImage = `url(${sheetUrl})`;
  layer.style.backgroundRepeat = 'no-repeat';
  host.prepend(layer);

  let displayScale = 1;
  const cols = atlas.cols || 4;
  const sheetRows = rowCountFromAtlas(atlas);

  function syncDisplayScale() {
    displayScale = computeDisplayScale(host, atlas.frameWidth, atlas.frameHeight);
    layer.style.width = `${atlas.frameWidth * displayScale}px`;
    layer.style.height = `${atlas.frameHeight * displayScale}px`;
    layer.style.backgroundSize = `${atlas.frameWidth * cols * displayScale}px ${atlas.frameHeight * sheetRows * displayScale}px`;
  }

  syncDisplayScale();
  requestAnimationFrame(syncDisplayScale);
  let resizeObs = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObs = new ResizeObserver(() => syncDisplayScale());
    resizeObs.observe(host);
  }

  let current = initialAnim;
  let frame = 0;
  let last = performance.now();
  let playing = true;
  let rafId = 0;

  function draw() {
    const spec = atlas.animations[current];
    if (!spec) return;
    const row = spec.row ?? 0;
    const maxF = Math.min(spec.frames || 1, 12);
    const fps = spec.fps || 8;
    const now = performance.now();
    if (now - last >= 1000 / fps) {
      last = now;
      frame += 1;
      if (frame >= maxF) {
        if (spec.loop) frame = 0;
        else frame = maxF - 1;
      }
    }
    const col = frame % cols;
    const x = -col * atlas.frameWidth * displayScale;
    const y = -row * atlas.frameHeight * displayScale;
    layer.style.backgroundPosition = `${x}px ${y}px`;
  }

  function loop() {
    if (!playing) return;
    draw();
    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);

  return {
    play(name) {
      if (!atlas.animations[name]) return;
      current = name;
      frame = 0;
      last = performance.now();
    },
    destroy() {
      playing = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeObs) resizeObs.disconnect();
      layer.remove();
    },
  };
}

function makeFallbackController(layer, host) {
  return {
    play(name) {
      layer.classList.remove('sprite-anim-hit', 'sprite-anim-attack');
      if (name === 'hit') {
        layer.classList.add('sprite-anim-hit');
        setTimeout(() => layer.classList.remove('sprite-anim-hit'), 350);
      }
      if (name === 'attack') {
        layer.classList.add('sprite-anim-attack');
        setTimeout(() => layer.classList.remove('sprite-anim-attack'), 650);
      }
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
