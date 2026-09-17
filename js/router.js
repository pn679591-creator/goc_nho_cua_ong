// Router dựa trên hash (#/...) để tải lại trang bất kỳ không bao giờ 404
// trên GitHub Pages. Mỗi route trỏ tới một module trang export mount()/destroy().
import { createLifecycleScope } from './core/lifecycle.js';

const routes = [];
let currentPage = null;
let currentScope = null;
let outlet = null;
let notFoundLoader = null;

export function registerRoute(pattern, loader) {
  const paramNames = [];
  const regex = new RegExp(
    '^' + pattern.replace(/:[^/]+/g, (m) => { paramNames.push(m.slice(1)); return '([^/]+)'; }) + '$',
  );
  routes.push({ pattern, regex, paramNames, loader });
}

export function setNotFound(loader) {
  notFoundLoader = loader;
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, queryStr] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryStr || ''));
  return { path: path || '/', query };
}

function matchRoute(path) {
  for (const route of routes) {
    const m = route.regex.exec(path);
    if (m) {
      const params = {};
      route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
      return { route, params };
    }
  }
  return null;
}

async function renderCurrentRoute() {
  const { path, query } = parseHash();
  const matched = matchRoute(path);

  if (currentPage?.destroy) {
    try { currentPage.destroy(); } catch (err) { console.error('[router] lỗi khi huỷ trang trước', err); }
  }
  if (currentScope) currentScope.destroy();
  currentPage = null;

  outlet.setAttribute('aria-busy', 'true');

  let pageModule;
  let params = {};
  if (matched) {
    params = matched.params;
    pageModule = await matched.route.loader();
  } else if (notFoundLoader) {
    pageModule = await notFoundLoader();
  } else {
    outlet.replaceChildren();
    outlet.removeAttribute('aria-busy');
    return;
  }

  currentScope = createLifecycleScope(path);
  outlet.replaceChildren();
  currentPage = pageModule.default || pageModule;
  await currentPage.mount(outlet, { params, query, scope: currentScope, path });
  outlet.removeAttribute('aria-busy');
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

export function navigate(path) {
  if (window.location.hash.replace(/^#/, '') === path) {
    renderCurrentRoute();
  } else {
    window.location.hash = path;
  }
}

export function startRouter(outletEl) {
  outlet = outletEl;
  window.addEventListener('hashchange', renderCurrentRoute);
  if (!window.location.hash) window.location.hash = '#/';
  renderCurrentRoute();
}

export function getCurrentPath() {
  return parseHash().path;
}
