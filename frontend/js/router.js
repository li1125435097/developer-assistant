import { findRouteByPath, normalizePath } from './config/routes.js';
import { renderMenu, closeMobileSidebar } from './menu.js';

let currentPage = null;
let currentRoute = null;
const pageCache = new Map();

function updateTopbar(route) {
  $('#pageTitle').text(route.title);
  $('#pageSubtitle').text(route.subtitle);
}

async function loadPageModule(route) {
  if (pageCache.has(route.id)) {
    return pageCache.get(route.id);
  }

  const mod = await import(route.module);
  const page = mod.default;
  pageCache.set(route.id, page);
  return page;
}

async function navigate(path, pushState = true) {
  const normalized = normalizePath(path);
  const route = findRouteByPath(normalized);

  if (!route.menu.enabled) {
    return;
  }

  if (currentRoute && currentRoute.id === route.id) {
    renderMenu(route.path);
    return;
  }

  if (currentPage && typeof currentPage.destroy === 'function') {
    currentPage.destroy();
  }

  currentRoute = route;
  currentPage = await loadPageModule(route);

  updateTopbar(route);
  $('#topbarActions').html(
    typeof currentPage.renderTopbarActions === 'function'
      ? currentPage.renderTopbarActions()
      : ''
  );
  $('#pageContent').html(currentPage.renderContent());
  $('#pageModals').html(
    typeof currentPage.renderModals === 'function'
      ? currentPage.renderModals()
      : ''
  );

  if (typeof currentPage.init === 'function') {
    currentPage.init();
  }

  renderMenu(route.path);

  if (pushState) {
    const url = route.path === '/' ? '/' : route.path;
    history.pushState({ routeId: route.id }, '', url);
  }

  document.title = route.title + ' - 开发者脚本助手';
  closeMobileSidebar();
}

function handlePopState() {
  navigate(location.pathname, false);
}

function handleMenuClick(e) {
  const $link = $(e.currentTarget);
  const path = $link.data('route-path');
  if (!path) return;

  e.preventDefault();
  navigate(path);
}

export function initRouter() {
  $(document).on('click', '[data-route-path]', handleMenuClick);
  window.addEventListener('popstate', handlePopState);

  navigate(location.pathname, false);
}
