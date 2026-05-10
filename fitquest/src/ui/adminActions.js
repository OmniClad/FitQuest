/**
 * Mutations légères du panneau admin (désactivation d’entrées, suppression custom).
 * @param {object} deps
 * @param {() => object | null} deps.getState
 * @param {() => void} deps.saveState
 */
export function createAdminActions(deps) {
  const { getState, saveState } = deps;

  function toggleDisabled(id) {
    const state = getState();
    if (!state?.player?.custom) return;
    const arr = state.player.custom.disabledIds;
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(id);
    saveState();
  }

  function deleteCustom(type, id) {
    const state = getState();
    if (!state?.player?.custom) return;
    const arr = state.player.custom[type];
    if (!arr) return;
    const idx = arr.findIndex((x) => x.id === id);
    if (idx >= 0) {
      arr.splice(idx, 1);
      saveState();
    }
  }

  return { toggleDisabled, deleteCustom };
}
