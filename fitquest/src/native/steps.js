/**
 * Pas pour voyager entre zones — web : mock via syncStepBalance.
 * Natif : dans la WebView Capacitor, `window.Capacitor` est injecté ; brancher HealthKit / Health Connect via plugin plus tard.
 */

export async function refreshStepsFromDevice() {
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    const platform = window.Capacitor.getPlatform?.() || 'native';
    return { platform, deltaSteps: 0 };
  }
  return { platform: 'web', deltaSteps: 0 };
}

/**
 * @param {object} state
 * @param {{ mockBonus?: number }} [opts]
 */
export async function syncStepBalance(state, opts = {}) {
  const { deltaSteps } = await refreshStepsFromDevice();
  let add = deltaSteps;
  if (add <= 0 && opts.mockBonus !== 0) {
    add = typeof opts.mockBonus === 'number' ? opts.mockBonus : 800;
  }
  state.player.stepBalance = (state.player.stepBalance || 0) + add;
  return add;
}
