import {
  RARITY_COLORS,
  FALLBACK_BOSS,
  TYPE_ICON,
  TYPE_LABEL,
  TYPE_CSS,
  COUNTER_TYPE,
} from '../data/constants.js';
import { ELEMENTS, elementTag } from '../data/elements.js';
import { getDifficultyTier, isGoodMatchup, getDifficultyScore, estimateSessionMinutes } from '../core/progression.js';
import { gameEvents } from '../audio/gameEvents.js';
import { mountBossSprite, getBossSpriteKey } from '../sprites/spritePlayer.js';
import { uiCtx } from './renderContext.js';

export function renderPreSessionView() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  let boss = state.boss.current;
  if (!boss) {
    const pick = uiCtx.pickBossForLevel(state.player.level);
    boss = { ...pick, hp: pick.hp_max };
    state.boss.current = boss;
    uiCtx.saveState();
  }
  const tier = getDifficultyTier(boss.level);
  const proposed = uiCtx.generateProposedExercises(boss);
  const counterT = COUNTER_TYPE[boss.type];
  const color = RARITY_COLORS[boss.rarity] || RARITY_COLORS.common;
  const fallback = FALLBACK_BOSS[boss.id] || FALLBACK_BOSS.default;
  const iconHtml = `<img src="${uiCtx.iconUrl(boss.icon, color)}" alt="" class="boss-fallback-img" onerror="this.outerHTML='<span class=&quot;boss-emoji&quot;>${fallback}</span>'">`;
  const diffScore = getDifficultyScore(boss, tier);
  const estMin = estimateSessionMinutes(proposed, tier);
  const summaryHtml = `<div class="presession-summary"><div class="presession-summary-row"><span>Difficulté</span><strong>${diffScore}/10</strong></div><div class="presession-summary-row"><span>Durée estimée</span><strong>~${estMin} min</strong></div><div class="presession-projection">Tu affrontes un adversaire niveau <strong>${boss.level}</strong> · séance ~<strong>${estMin}</strong> min · intensité <strong>${diffScore}/10</strong>.</div></div>`;
  const exHtml = proposed
    .map((ex) => {
      const isGood = isGoodMatchup(ex.type, boss.type);
      const recordBonus = state.player.records_bonus[ex.id] || 0;
      const unitLabel = ex.unit === 'seconds' ? 'sec' : 'reps';
      const suggestedVol = ex.unit === 'seconds' ? tier.seconds : tier.reps;
      return `<div class="exercise-card ${isGood ? 'good-matchup' : ''}"><div class="exercise-icon">${TYPE_ICON[ex.type]}</div><div class="exercise-info"><div class="exercise-name">${ex.name} <span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span> ${isGood ? '<span class="matchup-good">🟢 +50%</span>' : ''}</div><div class="exercise-meta">${ex.baseDamage}${recordBonus ? '+' + recordBonus : ''} dégâts · ${tier.sets}×${suggestedVol} ${unitLabel} suggéré${ex.hasWeight ? ' · 🏋' : ''}</div></div></div>`;
    })
    .join('');
  $('preSessionContent').innerHTML = `${summaryHtml}<div class="combat-banner"><div class="combat-boss-row"><div class="combat-boss-portrait-mid rarity-${boss.rarity}" id="bossPortraitPre">${iconHtml}</div><div class="combat-boss-info"><div class="name" style="color:${color}">${boss.name}</div><div class="meta">Niveau ${boss.level} · ${uiCtx.rarityLabel(boss.rarity)} · <span class="type-tag ${TYPE_CSS[boss.type]}">${TYPE_ICON[boss.type]} ${TYPE_LABEL[boss.type]}</span></div><div class="bar"><div class="bar-fill hp" style="width:${(boss.hp / boss.hp_max) * 100}%"></div></div><div style="font-size:10px;color:var(--text-dim);margin-top:4px;">❤️ ${boss.hp} / ${boss.hp_max} · ⚔ ${boss.attack} · 🛡 ${boss.defense}</div></div></div><div style="font-size:12px;color:var(--text-dim);font-style:italic;text-align:center;padding-top:10px;border-top:1px dashed var(--border);">« ${boss.desc} »</div></div><div style="background:rgba(34,197,94,0.1);border:1px solid var(--success);border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;color:var(--text-dim);text-align:center;">💡 Ce boss craint les exercices de type <strong style="color:var(--success);">${TYPE_ICON[counterT]} ${TYPE_LABEL[counterT]}</strong> (+50% dégâts)</div><div class="section-label"><span>Programme proposé · ${tier.numEx} exercices</span></div>${exHtml}`;
  $('btnLaunchSession').dataset.proposed = JSON.stringify(proposed.map((e) => e.id));
  $('btnLaunchSession').dataset.bossId = boss.id;
  const preHost = $('bossPortraitPre');
  if (preHost) {
    if (uiCtx.bossSpritePreCtl?.destroy) uiCtx.bossSpritePreCtl.destroy();
    mountBossSprite(preHost, getBossSpriteKey(boss), 'idle').then((ctl) => {
      uiCtx.bossSpritePreCtl = ctl;
    });
  }
}

export function renderSessionView() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  if (!state.session_current) {
    uiCtx.showView('dashboard');
    return;
  }
  if (state.session_current.isRecovery) {
    if (uiCtx.bossSpriteCtl?.destroy) uiCtx.bossSpriteCtl.destroy();
    uiCtx.bossSpriteCtl = null;
    return renderRecoverySession();
  }
  if (!state.boss.current) {
    uiCtx.showView('dashboard');
    return;
  }
  if (uiCtx.bossSpriteCtl?.destroy) uiCtx.bossSpriteCtl.destroy();
  uiCtx.bossSpriteCtl = null;
  const b = state.boss.current;
  const color = RARITY_COLORS[b.rarity] || RARITY_COLORS.common;
  const fallback = FALLBACK_BOSS[b.id] || FALLBACK_BOSS.default;
  const hpPct = (b.hp / b.hp_max) * 100;
  const playerHpPct = (state.player.stats.hp_current / state.player.stats.constitution) * 100;
  const skillUsed = !!(state.boss.current && state.boss.current.heroSkillUsed);
  const tokenUsed = !!(state.session_current.skillArmed || state.session_current.spellUsedThisTurn);
  const mpMax = state.player.stats.mana || 100,
    mp = state.player.stats.mp_current || 0;
  const mpPct = (mp / mpMax) * 100;
  const equippedSpells = (state.player.equippedSpells || []).map((id) => (id ? uiCtx.getSpellById(id) : null));
  const spellsUsedOnce = state.boss.current.spellsUsedThisFight || {};
  const spellButtons = equippedSpells
    .map((s, i) => {
      if (!s)
        return `<button class="action-btn" disabled style="opacity:0.3;"><div class="ico">·</div>Vide<div class="sub">Slot ${i + 1}</div></button>`;
      const noMana = mp < s.manaCost;
      const usedOnce = s.oncePerCombat && spellsUsedOnce[s.id];
      const disabled = tokenUsed || noMana || usedOnce;
      const elIcon = ELEMENTS[s.element] ? ELEMENTS[s.element].icon : '🪄';
      const subLine = usedOnce ? '1×/combat utilisé' : noMana ? `Manque ${s.manaCost - mp} MP` : `${s.manaCost} MP`;
      return `<button class="action-btn spell" data-spell-idx="${i}" ${disabled ? 'disabled' : ''} style="border-color:${ELEMENTS[s.element] ? ELEMENTS[s.element].color : 'var(--gold)'};"><div class="ico">${elIcon}</div>${s.name}<div class="sub">${subLine}</div></button>`;
    })
    .join('');
  $('combatBanner').innerHTML = `<div class="combat-boss-row"><div class="combat-boss-portrait-mid rarity-${b.rarity}" id="bossPortraitInBanner"><img src="${uiCtx.iconUrl(b.icon, color)}" alt="" class="boss-fallback-img" onerror="this.outerHTML='<span class=&quot;boss-emoji&quot;>${fallback}</span>'"></div><div class="combat-boss-info"><div class="name" style="color:${color}">${b.name}</div><div class="meta">Niveau ${b.level} · <span class="type-tag ${TYPE_CSS[b.type]}">${TYPE_ICON[b.type]} ${TYPE_LABEL[b.type]}</span> ${b.element ? elementTag(b.element) : ''}</div><div class="bar"><div class="bar-fill hp" id="bossHpBar" style="width:${hpPct}%"></div></div><div style="font-size:10px;color:var(--text-dim);margin-top:4px;" id="bossHpText">❤️ ${b.hp} / ${b.hp_max}</div></div></div><div class="combat-player-row"><div class="label"><span>❤️ ${state.player.name || 'Champion'}</span><span id="playerHpText">${state.player.stats.hp_current} / ${state.player.stats.constitution}</span></div><div class="bar"><div class="bar-fill hp" id="playerHpBar" style="width:${playerHpPct}%"></div></div><div class="label" style="margin-top:6px;"><span>💧 Mana</span><span id="playerMpText">${mp} / ${mpMax}</span></div><div class="bar"><div class="bar-fill mp" id="playerMpBar" style="width:${mpPct}%"></div></div><div class="combat-actions-inline" style="grid-template-columns:1fr 1fr;margin-top:10px;"><button class="action-btn skill ${tokenUsed || skillUsed ? '' : 'active'}" id="actSkill" ${skillUsed || tokenUsed ? 'disabled' : ''}><div class="ico">⚡</div>Frappe Héroïque<div class="sub">${skillUsed ? 'Déjà utilisée' : tokenUsed ? 'Tour pris' : '×2 sur le prochain coup'}</div></button><button class="action-btn potion" id="actPotion" ${state.player.potions <= 0 ? 'disabled' : ''}><div class="ico">🧪</div>Potion<div class="sub">+50 PV (${state.player.potions} restantes)</div></button></div><div class="combat-actions-inline" style="grid-template-columns:repeat(3,1fr);margin-top:6px;">${spellButtons}</div></div>`;
  const remaining = state.session_current.exercises.filter((e) => !e.completed).length;
  const total = state.session_current.exercises.length;
  $('exerciseCount').textContent = `${total - remaining} / ${total} fait${total - remaining > 1 ? 's' : ''}`;
  const list = $('sessionExerciseList');
  list.innerHTML = state.session_current.exercises
    .map((ex) => {
      const recordBonus = state.player.records_bonus[ex.id] || 0;
      const isGood = isGoodMatchup(ex.type, b.type);
      const matchupBadge = isGood ? '<span class="matchup-good">🟢 +50%</span>' : '';
      const unitLabel = ex.unit === 'seconds' ? 'sec' : 'reps';
      return `<div class="exercise-card ${ex.completed ? 'completed' : ''} ${isGood && !ex.completed ? 'good-matchup' : ''}" data-id="${ex.id}"><div class="exercise-icon">${ex.completed ? '✓' : TYPE_ICON[ex.type]}</div><div class="exercise-info"><div class="exercise-name">${ex.name} <span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span> ${matchupBadge}</div><div class="exercise-meta">${ex.completed ? `${ex.sets}×${ex.reps} ${unitLabel}${ex.hasWeight ? ' @ ' + ex.weight + 'kg' : ''} · ${ex.damageDealt} dégâts${ex.recordBeaten ? ' · 🏆' : ''}` : `${ex.baseDamage}${recordBonus ? '+' + recordBonus : ''} dégâts · ${unitLabel}${ex.hasWeight ? ' · 🏋' : ''}`}</div></div><div class="exercise-arrow">${ex.completed ? '' : '›'}</div></div>`;
    })
    .join('');
  list.querySelectorAll('.exercise-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const ex = state.session_current.exercises.find((e) => e.id === id);
      if (!ex || ex.completed) return;
      openExerciseModal(id);
    });
  });
  $('actSkill').addEventListener('click', () => {
    if (state.boss.current && state.boss.current.heroSkillUsed) return;
    if (state.session_current.skillArmed || state.session_current.spellUsedThisTurn) {
      uiCtx.showToast('⚠ Action déjà utilisée ce tour');
      return;
    }
    uiCtx.showToast('⚡ Frappe Héroïque chargée ! Le prochain exercice infligera ×2 dégâts.', 3000);
    state.session_current.skillArmed = true;
    uiCtx.saveState();
    renderSessionView();
  });
  document.querySelectorAll('[data-spell-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.spellIdx);
      uiCtx.castSpell(idx);
    });
  });
  $('actPotion').addEventListener('click', () => {
    if (state.player.potions <= 0) {
      uiCtx.showToast('⚠ Plus de potions');
      return;
    }
    state.player.potions--;
    const before = state.player.stats.hp_current;
    state.player.stats.hp_current = Math.min(state.player.stats.constitution, before + 50);
    const heal = state.player.stats.hp_current - before;
    gameEvents.emit('potion');
    uiCtx.showFloatingDmg(`+${heal}`, 'heal', 'playerHpBar');
    uiCtx.showToast(`🧪 Potion bue : +${heal} PV`);
    uiCtx.saveState();
    renderSessionView();
  });
  document.querySelectorAll('#combatBanner [data-spell-idx]').forEach((btn) => {
    btn.addEventListener('click', () => uiCtx.castSpell(parseInt(btn.dataset.spellIdx)));
  });
  const bannerHost = $('bossPortraitInBanner');
  if (bannerHost) {
    mountBossSprite(bannerHost, getBossSpriteKey(b), 'idle').then((ctl) => {
      uiCtx.bossSpriteCtl = ctl;
    });
  }
}

export function openExerciseModal(exerciseId) {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  uiCtx.setCurrentExerciseId(exerciseId);
  const ex = uiCtx.allExercises().find((e) => e.id === exerciseId);
  const b = state.boss.current;
  $('exModalName').textContent = ex.name;
  $('exModalIcon').textContent = TYPE_ICON[ex.type];
  $('exModalDesc').textContent = ex.desc;
  const isGood = isGoodMatchup(ex.type, b.type);
  $('exModalMatchup').innerHTML = `<span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span>${isGood ? ' <span class="matchup-good">🟢 Bon matchup +50%</span>' : ''}`;
  $('exSets').value = state.session_current.suggestedSets || 3;
  if (ex.unit === 'seconds') {
    $('exRepsLabel').textContent = 'Secondes';
    $('exReps').value = state.session_current.suggestedSec || 30;
  } else {
    $('exRepsLabel').textContent = 'Répétitions';
    $('exReps').value = state.session_current.suggestedReps || 10;
  }
  $('exWeight').value = state.player.records[exerciseId] || 0;
  $('exWeightContainer').style.display = ex.hasWeight ? '' : 'none';
  updateDamagePreview();
  uiCtx.openModal('exerciseModal');
}

export function updateDamagePreview() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const currentExerciseId = uiCtx.getCurrentExerciseId();
  if (!currentExerciseId) return;
  const ex = uiCtx.allExercises().find((e) => e.id === currentExerciseId);
  const sets = parseInt($('exSets').value) || 0;
  const repsOrSec = parseInt($('exReps').value) || 0;
  const weight = parseFloat($('exWeight').value) || 0;
  const skillArmed = state.session_current && state.session_current.skillArmed;
  const dmg = uiCtx.computeExerciseDamage(currentExerciseId, sets, repsOrSec, weight, { skill: skillArmed });
  $('damagePreviewValue').textContent = dmg;
  const isGood = isGoodMatchup(ex.type, state.boss.current.type);
  let note = '';
  if (isGood) note = '🟢 Bon matchup actif (+50%)';
  if (skillArmed) note += (note ? '<br>' : '') + '⚡ Frappe Héroïque armée (×2)';
  $('matchupNote').innerHTML = note;
}

export function renderRecoverySession() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  $('combatBanner').innerHTML = `<div style="text-align:center;padding:14px;background:linear-gradient(135deg,rgba(34,197,94,0.15) 0%,var(--bg-mid) 100%);border:2px solid var(--success);border-radius:12px;"><div style="font-family:'Cinzel',serif;font-weight:700;font-size:16px;color:var(--success);margin-bottom:6px;">⚕ Convalescence</div><div style="font-size:12px;color:var(--text-dim);">Termine ces ${state.session_current.exercises.length} exercices pour reprendre la quête à <strong style="color:var(--gold-bright);">50% PV</strong>.</div></div>`;
  const remaining = state.session_current.exercises.filter((e) => !e.completed).length;
  const total = state.session_current.exercises.length;
  $('exerciseCount').textContent = `${total - remaining} / ${total} fait${total - remaining > 1 ? 's' : ''}`;
  const list = $('sessionExerciseList');
  list.innerHTML = state.session_current.exercises
    .map((ex) => {
      const unitLabel = ex.unit === 'seconds' ? 'sec' : 'reps';
      return `<div class="exercise-card ${ex.completed ? 'completed' : ''}" data-id="${ex.id}"><div class="exercise-icon">${ex.completed ? '✓' : TYPE_ICON[ex.type]}</div><div class="exercise-info"><div class="exercise-name">${ex.name} <span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span></div><div class="exercise-meta">${ex.completed ? `${ex.sets}×${ex.reps} ${unitLabel}` : `Récupération douce · ${unitLabel}`}</div></div><div class="exercise-arrow">${ex.completed ? '' : '›'}</div></div>`;
    })
    .join('');
  list.querySelectorAll('.exercise-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const ex = state.session_current.exercises.find((e) => e.id === id);
      if (!ex || ex.completed) return;
      openExerciseModalRecovery(id);
    });
  });
}

export function openExerciseModalRecovery(exerciseId) {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  uiCtx.setCurrentExerciseId(exerciseId);
  const ex = uiCtx.allExercises().find((e) => e.id === exerciseId);
  $('exModalName').textContent = ex.name;
  $('exModalIcon').textContent = TYPE_ICON[ex.type];
  $('exModalDesc').textContent = ex.desc;
  $('exModalMatchup').innerHTML = `<span class="type-tag ${TYPE_CSS[ex.type]}">${TYPE_LABEL[ex.type]}</span> <span style="color:var(--success);font-size:11px;font-weight:700;">⚕ Convalescence</span>`;
  $('exSets').value = 2;
  if (ex.unit === 'seconds') {
    $('exRepsLabel').textContent = 'Secondes';
    $('exReps').value = 20;
  } else {
    $('exRepsLabel').textContent = 'Répétitions';
    $('exReps').value = 8;
  }
  $('exWeight').value = 0;
  $('exWeightContainer').style.display = ex.hasWeight ? '' : 'none';
  $('damagePreviewValue').textContent = '—';
  $('matchupNote').innerHTML = '<span style="color:var(--success);">Aucun dégât (récupération)</span>';
  uiCtx.openModal('exerciseModal');
}
