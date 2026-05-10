/** Bus léger type / souscription pour audio, sprites et futures extensions. */

const listeners = new Map();

export const gameEvents = {
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event)?.delete(fn);
  },

  emit(event, payload) {
    listeners.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.warn('[gameEvents]', event, e);
      }
    });
  },

  off(event, fn) {
    listeners.get(event)?.delete(fn);
  },
};
