import { uiCtx } from './renderContext.js';
import { listQuestsUi } from '../core/questEngine.js';

export function renderQuestsView() {
  const state = uiCtx.getState();
  const $ = uiCtx.$;
  const list = listQuestsUi(state);
  const rows = list
    .map((q) => {
      const pct = q.done ? 100 : Math.min(100, Math.round((q.current / q.target) * 100));
      const status = q.done ? '✓ Terminée' : `${q.current} / ${q.target}`;
      return `<div class="quest-card ${q.done ? 'quest-done' : ''}"><div class="quest-title">${q.title}</div><div class="quest-desc">${q.desc}</div><div class="quest-meta"><span>${status}</span><span class="quest-reward">💰 +${q.rewardGold}</span></div><div class="quest-bar"><div class="quest-bar-fill" style="width:${pct}%"></div></div></div>`;
    })
    .join('');
  $('questsContent').innerHTML = `<div class="section-label"><span>Journal du héros</span></div><div class="quest-list">${rows}</div><p style="font-size:11px;color:var(--text-dim);text-align:center;margin-top:14px;">Les récompenses d’or sont créditées à la complétion.</p>`;
}
