import { h } from './ui.js';

let container = null;

function ensureContainer() {
  if (container) return container;
  container = document.getElementById('toast-root');
  if (!container) {
    container = h('div', { id: 'toast-root', class: 'toast-root', 'aria-live': 'polite' });
    document.body.append(container);
  }
  return container;
}

export function showToast(message, { type = 'info', duration = 3200 } = {}) {
  const root = ensureContainer();
  const el = h('div', { class: `toast toast--${type}` }, message);
  root.append(el);
  requestAnimationFrame(() => el.classList.add('toast--show'));
  const remove = () => {
    el.classList.remove('toast--show');
    setTimeout(() => el.remove(), 220);
  };
  setTimeout(remove, duration);
  el.addEventListener('click', remove);
  return remove;
}
