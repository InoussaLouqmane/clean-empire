import { icon } from '../../menu/icons.js';

const SHOW_MS = 3600;

/**
 * Bandeau d'annonce en haut au centre (montée de niveau, quête terminée…),
 * qui disparaît tout seul. Les annonces s'empilent si plusieurs arrivent.
 */
export function showToast(root, { title, text = '', iconName = 'star', kind = '' }) {
  let stack = root.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    root.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast${kind ? ` toast--${kind}` : ''}`;
  el.innerHTML = `${icon(iconName)}<span><b></b><small></small></span>`;
  el.querySelector('b').textContent = title;
  el.querySelector('small').textContent = text;
  el.querySelector('small').hidden = !text;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 300);
  }, SHOW_MS);
}
