/**
 * Modale réutilisable : profil combat d’un boss + tableau des modificateurs de dégâts par type d’exercice.
 */
import { uiCtx } from './renderContext.js';
import { COUNTER_TYPE, TYPE_LABEL, TYPE_ICON, TYPE_CSS, RARITY_COLORS } from '../data/constants.js';
import { ELEMENTS, elementTag } from '../data/elements.js';
import {
  MATCHUP_ADVANTAGE_MULT,
  MATCHUP_WEAK_MULT,
  disadvantagedExerciseTypeVsBoss,
} from '../core/progression.js';

const SPECIALTY_CYCLE = ['agility', 'force', 'endurance'];
const ELEMENT_CYCLE = ['fire', 'wind', 'lightning', 'water'];
const CYCLE_NODE_POSITIONS = {
  3: [
    ['50%', '8%'],
    ['82%', '78%'],
    ['18%', '78%'],
  ],
  4: [
    ['50%', '7%'],
    ['88%', '50%'],
    ['50%', '93%'],
    ['12%', '50%'],
  ],
};
const CYCLE_ARROW_POSITIONS = {
  3: [
    ['68%', '38%', '120deg'],
    ['50%', '76%', '240deg'],
    ['32%', '38%', '0deg'],
  ],
  4: [
    ['71%', '29%', '135deg'],
    ['71%', '71%', '225deg'],
    ['29%', '71%', '315deg'],
    ['29%', '29%', '45deg'],
  ],
};

function specialtyTag(type, extraClass = '') {
  return `<span class="type-tag ${TYPE_CSS[type]} ${extraClass} cycle-trigger specialty-cycle-trigger" data-cycle-kind="specialty" title="Voir le cadran des spécialités">${TYPE_ICON[type]} ${TYPE_LABEL[type]}</span>`;
}

/** @param {object} boss */
export function buildEnemyStatsModalBodyHtml(boss) {
  const bossType = boss.type && boss.type in COUNTER_TYPE ? boss.type : 'force';
  const weakTo = COUNTER_TYPE[bossType];
  const resisted = disadvantagedExerciseTypeVsBoss(bossType);

  const elementRow =
    boss.element && ELEMENTS[boss.element]
      ? `<tr><th scope="row">Élément</th><td class="enemy-stat-element-cell"><div class="enemy-stat-element-badge">${elementTag(boss.element, { interactive: true })}</div><span class="enemy-stat-muted">(magie / sorts, pas le type d’exercice)</span></td></tr>`
      : '';

  const hpMax = Math.max(1, Number(boss.hp_max) || 1);
  let hpCur = Number(boss.hp);
  if (!Number.isFinite(hpCur)) hpCur = hpMax;
  hpCur = Math.max(0, Math.min(hpMax, hpCur));
  const hpPct = Math.round((hpCur / hpMax) * 100);

  const typeTag = specialtyTag(bossType, 'enemy-stat-fiche-type-tag');
  const weakTag = specialtyTag(weakTo, 'enemy-stat-fiche-type-tag');
  const resistedTag = specialtyTag(resisted, 'enemy-stat-fiche-type-tag');

  return `<div class="enemy-stats-section enemy-stats-section--fiche">
  <table class="enemy-stats-table enemy-stats-table--fiche">
    <tbody>
      <tr><th scope="row">Spécialité</th><td>${typeTag}</td></tr>
      <tr><th scope="row">Fort contre</th><td>${resistedTag} <span class="enemy-stat-muted">dégâts reçus à ${Math.round(MATCHUP_WEAK_MULT * 100)} %</span></td></tr>
      <tr><th scope="row">Faible contre</th><td>${weakTag} <span class="enemy-stat-boost">+${Math.round((MATCHUP_ADVANTAGE_MULT - 1) * 100)} % dégâts</span></td></tr>
      ${elementRow}
      <tr><th scope="row">PV</th><td class="enemy-stat-hp-cell"><div class="enemy-stat-hp-label"><strong>${hpCur}</strong> / ${hpMax}</div><div class="bar enemy-stat-hp-bar"><div class="bar-fill hp" style="width:${hpPct}%"></div></div></td></tr>
      <tr><th scope="row">Attaque</th><td><strong>${boss.attack ?? '—'}</strong> <span class="enemy-stat-muted">riposte</span></td></tr>
      <tr><th scope="row">Défense</th><td><strong>${boss.defense ?? '—'}</strong> <span class="enemy-stat-muted">réduit tes dégâts</span></td></tr>
    </tbody>
  </table>
</div>`;
}

function elementCounter(element) {
  return {
    fire: 'wind',
    wind: 'lightning',
    lightning: 'water',
    water: 'fire',
  }[element];
}

function cycleNodeHtml(item, index, activeKey, renderItem, count) {
  const [x, y] = CYCLE_NODE_POSITIONS[count][index];
  const isActive = item.key === activeKey;
  return `<div class="cycle-node${isActive ? ' is-active' : ''}" style="--node-x:${x};--node-y:${y};--node-color:${item.color};">
    <div class="cycle-node-icon">${item.icon}</div>
    <div class="cycle-node-label">${renderItem(item)}</div>
  </div>`;
}

function buildCycleDialHtml(items, activeKey, renderItem) {
  const arrows = CYCLE_ARROW_POSITIONS[items.length]
    .map(([x, y, rot]) => `<span class="cycle-arrow" style="--arrow-x:${x};--arrow-y:${y};--arrow-rot:${rot};" aria-hidden="true"></span>`)
    .join('');
  return `<div class="cycle-dial cycle-dial--${items.length}">
    <div class="cycle-ring"></div>
    ${arrows}
    <div class="cycle-center">Efficace</div>
    ${items.map((item, index) => cycleNodeHtml(item, index, activeKey, renderItem, items.length)).join('')}
  </div>`;
}

function buildSpecialtyCycleBodyHtml(boss) {
  const bossType = boss.type && boss.type in COUNTER_TYPE ? boss.type : 'force';
  const weakTo = COUNTER_TYPE[bossType];
  const resisted = disadvantagedExerciseTypeVsBoss(bossType);
  const items = SPECIALTY_CYCLE.map((key) => ({
    key,
    icon: TYPE_ICON[key],
    label: TYPE_LABEL[key],
    color:
      key === 'force'
        ? 'var(--type-force)'
        : key === 'agility'
          ? 'var(--type-agility)'
          : 'var(--type-endurance)',
  }));
  return `<div class="enemy-stats-section">
    <h3 class="enemy-stats-section-title">Cadran des spécialités</h3>
    <p class="enemy-stats-legend">Chaque spécialité est efficace contre la suivante dans le sens du cadran.</p>
    ${buildCycleDialHtml(items, bossType, (item) => item.label)}
    <div class="cycle-rule-card">
      <div class="cycle-rule-main">${specialtyTag(weakTo)} inflige <strong>+${Math.round((MATCHUP_ADVANTAGE_MULT - 1) * 100)} %</strong> à ${specialtyTag(bossType)}</div>
      <div class="cycle-rule-sub">${specialtyTag(bossType)} réduit les dégâts de ${specialtyTag(resisted)} à <strong>${Math.round(MATCHUP_WEAK_MULT * 100)} %</strong>.</div>
    </div>
  </div>`;
}

function buildElementCycleBodyHtml(boss) {
  const bossElement = boss.element && ELEMENTS[boss.element] ? boss.element : 'wind';
  const items = ELEMENT_CYCLE.map((key) => ({
    key,
    icon: ELEMENTS[key].icon,
    label: ELEMENTS[key].name,
    color: ELEMENTS[key].color,
  }));
  if (bossElement === 'holy' || bossElement === 'dark') {
    const opposite = bossElement === 'holy' ? 'dark' : 'holy';
    return `<div class="enemy-stats-section">
      <h3 class="enemy-stats-section-title">Cadran des éléments</h3>
      <p class="enemy-stats-legend">Les éléments modifient les sorts et les armes élémentaires, pas les exercices.</p>
      ${buildCycleDialHtml(items, '', (item) => item.label)}
      <div class="cycle-rule-card">
        <div class="cycle-rule-main">${elementTag(opposite, { interactive: true })} inflige <strong>+30 %</strong> à ${elementTag(bossElement, { interactive: true })}</div>
        <div class="cycle-rule-sub">Sacré et Sombre se contrent mutuellement : chacun est efficace contre l’autre.</div>
      </div>
    </div>`;
  }
  const attackerVsBoss = ELEMENT_CYCLE.find((key) => elementCounter(key) === bossElement);
  const bossBeats = elementCounter(bossElement);
  const attackerLabel = attackerVsBoss ? elementTag(attackerVsBoss, { interactive: true }) : '—';
  const bossLabel = elementTag(bossElement, { interactive: true });
  const bossBeatsLabel = bossBeats ? elementTag(bossBeats, { interactive: true }) : '—';
  return `<div class="enemy-stats-section">
    <h3 class="enemy-stats-section-title">Cadran des éléments</h3>
    <p class="enemy-stats-legend">Les éléments modifient les sorts et les armes élémentaires, pas les exercices.</p>
    ${buildCycleDialHtml(items, bossElement, (item) => item.label)}
    <div class="cycle-rule-card">
      <div class="cycle-rule-main">${attackerLabel} inflige <strong>+25 %</strong> à ${bossLabel}</div>
      <div class="cycle-rule-sub">${bossLabel} résiste mieux contre ${bossBeatsLabel} : dégâts à <strong>75 %</strong>.</div>
      <div class="cycle-rule-sub">Sacré et Sombre se contrent mutuellement : <strong>×1.3</strong>.</div>
    </div>
  </div>`;
}

/**
 * Ouvre la modale pour un boss donné (ou le boss courant dans l’état).
 * @param {object} [boss]
 * @param {'stats'|'specialty'|'element'} [view]
 */
export function openEnemyStatsModal(boss, view = 'stats') {
  const b = boss ?? uiCtx.getState()?.boss?.current;
  if (!b) {
    uiCtx.showToast?.('⚠ Aucun adversaire à afficher');
    return;
  }
  const $ = uiCtx.$;
  const color = RARITY_COLORS[b.rarity] || RARITY_COLORS.common;
  $('enemyStatsTitle').textContent =
    view === 'specialty' ? 'Spécialité' : view === 'element' ? 'Élément' : b.name;
  $('enemyStatsTitle').style.color = color;
  $('enemyStatsSubtitle').textContent =
    view === 'specialty'
      ? `${b.name} · ${TYPE_LABEL[b.type] || 'Spécialité'}`
      : view === 'element'
        ? `${b.name} · ${ELEMENTS[b.element]?.name || 'Aucun élément'}`
        : `${uiCtx.rarityLabel(b.rarity)} · Niveau ${b.level}`;
  $('enemyStatsBody').innerHTML =
    view === 'specialty'
      ? buildSpecialtyCycleBodyHtml(b)
      : view === 'element'
        ? buildElementCycleBodyHtml(b)
        : buildEnemyStatsModalBodyHtml(b);
  uiCtx.openModal('enemyStatsModal');
}
