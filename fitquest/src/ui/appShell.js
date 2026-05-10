import { createTransitionLayer } from '../scenes/transitionLayer.js';

/**
 * Modales plein écran + navigation entre les vues principales (avec transitions).
 * @param {object} deps
 * @param {(id: string) => HTMLElement | null} deps.$
 * @param {() => void} deps.renderAll — dashboard
 * @param {() => void} deps.renderPreSessionView
 * @param {() => void} deps.renderSessionView
 * @param {() => void} deps.renderInventoryView
 * @param {() => void} deps.renderQuestsView
 * @param {() => void} deps.getRenderAdmin
 * @param {(scene: string) => void} [deps.onSceneChange] — ex. BGM
 */
export function createAppShell(deps) {
  const {
    $,
    renderAll,
    renderPreSessionView,
    renderSessionView,
    renderInventoryView,
    renderQuestsView,
    getRenderAdmin,
    onSceneChange,
  } = deps;

  const transitions = createTransitionLayer($);

  function openModal(id) {
    $(id).classList.add('active');
  }

  function closeModal(id) {
    $(id).classList.remove('active');
  }

  function transitionFor(from, to) {
    if (to === 'session' || (from === 'pre-session' && to === 'session')) return 'battle';
    if (to === 'pre-session' && from === 'dashboard') return 'battle';
    return 'fade';
  }

  let lastScene = 'dashboard';

  function applyView(name) {
    $('app').style.display = 'none';
    $('viewPreSession').classList.remove('active');
    $('viewSession').classList.remove('active');
    $('viewInventory').classList.remove('active');
    $('viewAdmin').classList.remove('active');
    $('viewQuests').classList.remove('active');
    $('actionBar').style.display = 'none';
    if (name === 'dashboard') {
      $('app').style.display = 'block';
      $('actionBar').style.display = 'block';
      renderAll();
    } else if (name === 'pre-session') {
      $('viewPreSession').classList.add('active');
      renderPreSessionView();
    } else if (name === 'session') {
      $('viewSession').classList.add('active');
      renderSessionView();
    } else if (name === 'inventory') {
      $('viewInventory').classList.add('active');
      renderInventoryView();
    } else if (name === 'admin') {
      $('viewAdmin').classList.add('active');
      getRenderAdmin()();
    } else if (name === 'quests') {
      $('viewQuests').classList.add('active');
      renderQuestsView();
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (onSceneChange) onSceneChange(name);
    lastScene = name;
  }

  /**
   * @param {string} name
   * @param {{ transition?: 'fade'|'battle'|'none', from?: string }} [opts]
   */
  function showView(name, opts = {}) {
    const from = opts.from ?? lastScene;
    const style = opts.transition ?? transitionFor(from, name);
    transitions.run(() => applyView(name), style);
  }

  return { openModal, closeModal, showView, applyView, transitionFor };
}
