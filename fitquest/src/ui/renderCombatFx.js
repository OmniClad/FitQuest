import { uiCtx } from './renderContext.js';

export function showFloatingDmg(text, type, anchorId) {
  const $ = uiCtx.$;
  const anchor = anchorId ? $(anchorId) : $('bossPortraitInBanner');
  if (!anchor) return;
  const banner = $('combatBanner');
  if (!banner) return;
  const rect = anchor.getBoundingClientRect();
  const bRect = banner.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = `floating-dmg ${type}`;
  div.textContent = text;
  div.style.left = `${rect.left - bRect.left + rect.width / 2}px`;
  div.style.top = `${rect.top - bRect.top + rect.height / 2 - 20}px`;
  banner.appendChild(div);
  setTimeout(() => div.remove(), 1300);
}

export function flashBossPortrait(isCrit = false) {
  const $ = uiCtx.$;
  const portrait = $('bossPortraitInBanner');
  if (!portrait) return;
  portrait.classList.remove('hit', 'crit');
  void portrait.offsetWidth;
  portrait.classList.add(isCrit ? 'crit' : 'hit');
  if (uiCtx.bossSpriteCtl && typeof uiCtx.bossSpriteCtl.play === 'function') {
    uiCtx.bossSpriteCtl.play('hit');
  }
}

export function shakeScreen() {
  document.body.classList.remove('shaking');
  void document.body.offsetWidth;
  document.body.classList.add('shaking');
  setTimeout(() => document.body.classList.remove('shaking'), 400);
}
