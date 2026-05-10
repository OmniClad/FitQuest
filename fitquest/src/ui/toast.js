import { $ } from './dom.js';

export function showToast(message, duration = 2500) {
  const t = $('toast');
  if (!t) return;
  t.innerHTML = message;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), duration);
}
