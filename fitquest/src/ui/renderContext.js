/**
 * Références injectées depuis app.js via bindUi() avant boot().
 * Obligatoire : getState ()
 */
export const uiCtx = {};

export function bindUi(partial) {
  Object.assign(uiCtx, partial);
}
